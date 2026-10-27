import os
import sys
import threading
import time
from datetime import timedelta
from django.db import close_old_connections, transaction
from django.db.models import Count, Q
from django.utils import timezone
from ..models import Match, MatchWeek, SyncJob
from .espn_sync import sync_espn_lmx, sync_espn_nfl, sync_upcoming_calendar

_wake_event = threading.Event()
_worker_lock = threading.Lock()
_worker_started = False
_local_cooldown_map = {}


def build_dedup_key(job_type, league_code='ALL', week_number=None):
    return f"{job_type}:{(league_code or 'ALL').upper()}:{week_number if week_number is not None else 'ALL'}"


def enqueue_sync_job(job_type, league_code='ALL', week_number=None, cooldown_seconds=180, priority=5, force=False):
    """
    Encola un mensaje de sincronización en la tabla SyncJob sin bloquear el request HTTP.
    Usa memoria local por worker + 1 sola consulta combinada a Supabase/Postgres para minimizar RTT.
    """
    try:
        now_ts = time.time()
        league_norm = (league_code or 'ALL').upper()
        dedup_key = build_dedup_key(job_type, league_norm, week_number)

        # Fast-path en memoria local para evitar round-trips repetidos a Supabase en ráfagas de tráfico
        if not force and cooldown_seconds > 0:
            last_checked_ts = _local_cooldown_map.get(dedup_key, 0)
            if now_ts - last_checked_ts < min(cooldown_seconds, 60):
                return False

        now = timezone.now()
        stale_cutoff = now - timedelta(minutes=5)
        cooldown_cutoff = now - timedelta(seconds=max(0, cooldown_seconds))

        # 1 sola consulta SQL combinada para verificar si ya está en cola o en ventana de enfriamiento
        active_or_recent_q = Q(status='PENDING') | Q(status='PROCESSING', started_at__gte=stale_cutoff)
        if not force and cooldown_seconds > 0:
            active_or_recent_q |= Q(status='COMPLETED', completed_at__gte=cooldown_cutoff)

        if SyncJob.objects.filter(dedup_key=dedup_key).filter(active_or_recent_q).exists():
            _local_cooldown_map[dedup_key] = now_ts
            _wake_event.set()
            return False

        SyncJob.objects.create(
            job_type=job_type,
            league_code=league_norm,
            week_number=int(week_number) if week_number is not None else None,
            status='PENDING',
            priority=priority,
            dedup_key=dedup_key,
            scheduled_for=now,
        )
        _local_cooldown_map[dedup_key] = now_ts
        _wake_event.set()
        return True
    except Exception as e:
        print(f"[SyncQueue] Error al encolar {job_type}: {e}")
        return False


def trigger_nonblocking_week_sync(week_obj, matches_list=None):
    """
    Reemplazo asíncrono no bloqueante para lecturas de jornadas:
    - Si se pasa `matches_list` ya cargada en memoria, realiza 0 consultas SQL adicionales.
    - Si la jornada está vacía, encola su sincronización inmediata de calendario.
    - Si tiene partidos en juego o cuya hora de inicio ya pasó y siguen en SCHEDULED,
      encola actualización de marcadores en vivo con enfriamiento de 3 minutos.
    """
    if not week_obj:
        return False

    league_code = (
        week_obj.tournament.league.code
        if (week_obj.tournament and week_obj.tournament.league)
        else 'LMX'
    )

    now = timezone.now()
    if matches_list is not None:
        if len(matches_list) == 0:
            return enqueue_sync_job(
                job_type='SYNC_LEAGUE_WEEK',
                league_code=league_code,
                week_number=week_obj.week_number,
                cooldown_seconds=300,
                priority=8
            )
        if week_obj.is_closed:
            return False
        has_active_or_due = any(
            m.status == 'IN_PROGRESS' or (m.status == 'SCHEDULED' and m.date_time <= now)
            for m in matches_list
        )
    else:
        matches_qs = week_obj.matches.all()
        if not matches_qs.exists():
            return enqueue_sync_job(
                job_type='SYNC_LEAGUE_WEEK',
                league_code=league_code,
                week_number=week_obj.week_number,
                cooldown_seconds=300,
                priority=8
            )
        if week_obj.is_closed:
            return False
        has_active_or_due = matches_qs.filter(
            Q(status='IN_PROGRESS') | Q(status='SCHEDULED', date_time__lte=now)
        ).exists()

    if has_active_or_due:
        return enqueue_sync_job(
            job_type='SYNC_LIVE_SCORES',
            league_code=league_code,
            week_number=week_obj.week_number,
            cooldown_seconds=180,
            priority=10
        )

    return False


def _execute_job(job):
    """Ejecuta la carga de trabajo asociada a un SyncJob."""
    league = (job.league_code or 'ALL').upper()
    week = job.week_number

    if job.job_type in ('SYNC_LIVE_SCORES', 'SYNC_LEAGUE_WEEK'):
        if week is not None:
            if league == 'NFL':
                return sync_espn_nfl(week_number=week)
            else:
                return sync_espn_lmx(week_number=week, fetch_forms=True)
        else:
            # Buscar todas las semanas abiertas con partidos en curso o vencidos
            now = timezone.now()
            due_weeks = MatchWeek.objects.filter(
                is_closed=False,
                matches__status__in=['IN_PROGRESS', 'SCHEDULED'],
                matches__date_time__lte=now
            ).select_related('tournament__league').distinct()
            total = 0
            for w in due_weeks:
                l_code = w.tournament.league.code if (w.tournament and w.tournament.league) else 'LMX'
                if league in ('ALL', l_code):
                    res = sync_espn_nfl(week_number=w.week_number) if l_code == 'NFL' else sync_espn_lmx(week_number=w.week_number, fetch_forms=True)
                    total += res.get('matches_updated', 0)
            return {'status': 'ok', 'matches_updated': total}

    elif job.job_type == 'SYNC_UPCOMING_CALENDAR':
        return sync_upcoming_calendar(league_code=league, fetch_forms=True)

    return {'status': 'noop', 'matches_updated': 0}


def process_next_sync_job():
    """
    Reclama atómicamente el siguiente trabajo PENDING de mayor prioridad y lo ejecuta.
    Compatible tanto con PostgreSQL (Supabase Pooler) como con SQLite.
    """
    now = timezone.now()
    candidate = (
        SyncJob.objects.filter(status='PENDING', scheduled_for__lte=now)
        .order_by('-priority', 'scheduled_for', 'id')
        .first()
    )
    if not candidate:
        return None

    claimed = SyncJob.objects.filter(id=candidate.id, status='PENDING').update(
        status='PROCESSING',
        started_at=now,
        attempts=candidate.attempts + 1
    )
    if not claimed:
        return None

    job = SyncJob.objects.get(id=candidate.id)
    try:
        result = _execute_job(job)
        if result and result.get('error'):
            job.status = 'FAILED'
            job.error_message = str(result.get('error'))[:500]
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
        else:
            job.status = 'COMPLETED'
            job.matches_updated = int((result or {}).get('matches_updated', 0))
            job.completed_at = timezone.now()
            job.error_message = ''
            job.save(update_fields=['status', 'matches_updated', 'completed_at', 'error_message'])
    except Exception as e:
        job.status = 'FAILED'
        job.error_message = str(e)[:500]
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'completed_at'])

    # Mantener la tabla compacta (conservar últimos 100 registros históricos)
    try:
        old_ids = list(
            SyncJob.objects.filter(status__in=['COMPLETED', 'FAILED'])
            .order_by('-id')
            .values_list('id', flat=True)[100:]
        )
        if old_ids:
            SyncJob.objects.filter(id__in=old_ids).delete()
    except Exception:
        pass

    return job


def drain_sync_queue(max_jobs=10):
    """Procesa hasta `max_jobs` mensajes pendientes en la cola."""
    processed = []
    for _ in range(max_jobs):
        job = process_next_sync_job()
        if not job:
            break
        processed.append(job)
    return processed


def schedule_periodic_sync_checks():
    """
    Evalúa el estado de la base de datos y encola trabajos preventivos si:
    1. Existen semanas futuras sin partidos cargados (Jornadas 14-17 LMX, Semanas 7-18 NFL).
    2. Hay partidos en vivo o que ya iniciaron y aún no tienen marcador FINAL.
    """
    now = timezone.now()

    # 1. Revisar si hay jornadas pasadas o futuras vacías (1-17 LMX, 1-18 NFL)
    empty_weeks = (
        MatchWeek.objects.annotate(m_count=Count('matches'))
        .filter(m_count=0)
        .select_related('tournament__league')
    )
    if empty_weeks.exists():
        enqueue_sync_job(
            job_type='SYNC_UPCOMING_CALENDAR',
            league_code='ALL',
            cooldown_seconds=1800,
            priority=6
        )
    else:
        # Refresco periódico del calendario futuro cada 6 horas por cambios de horario en ESPN
        enqueue_sync_job(
            job_type='SYNC_UPCOMING_CALENDAR',
            league_code='ALL',
            cooldown_seconds=21600,
            priority=2
        )

    # 2. Revisar si hay partidos en juego o por finalizar ahora mismo
    due_weeks = (
        MatchWeek.objects.filter(
            is_closed=False,
            matches__status__in=['IN_PROGRESS', 'SCHEDULED'],
            matches__date_time__lte=now
        )
        .select_related('tournament__league')
        .distinct()
    )
    for w in due_weeks:
        l_code = w.tournament.league.code if (w.tournament and w.tournament.league) else 'LMX'
        enqueue_sync_job(
            job_type='SYNC_LIVE_SCORES',
            league_code=l_code,
            week_number=w.week_number,
            cooldown_seconds=180,
            priority=10
        )


def get_queue_status_summary():
    """Retorna telemetría rápida del estado de la cola de sincronización."""
    try:
        last_completed = (
            SyncJob.objects.filter(status='COMPLETED')
            .order_by('-completed_at')
            .values('job_type', 'league_code', 'week_number', 'completed_at', 'matches_updated')
            .first()
        )
        pending_count = SyncJob.objects.filter(status__in=['PENDING', 'PROCESSING']).count()
        return {
            'pending_jobs': pending_count,
            'last_sync': last_completed,
        }
    except Exception:
        return {'pending_jobs': 0, 'last_sync': None}


def _background_worker_loop():
    """Bucle daemon ligero que consume la cola SyncJob sin bloquear peticiones web."""
    time.sleep(2)
    while True:
        try:
            close_old_connections()
            schedule_periodic_sync_checks()
            drain_sync_queue(max_jobs=6)
        except Exception as e:
            print(f"[SyncQueueWorker] Error en ciclo background: {e}")
        finally:
            close_old_connections()

        _wake_event.wait(timeout=60)
        _wake_event.clear()


def start_background_sync_worker():
    """Inicia el hilo consumidor de la cola una sola vez por proceso."""
    global _worker_started
    ignored_cmds = {'makemigrations', 'migrate', 'collectstatic', 'test', 'shell', 'dbshell'}
    if any(cmd in sys.argv for cmd in ignored_cmds):
        return False

    with _worker_lock:
        if _worker_started:
            return False
        _worker_started = True
        worker_thread = threading.Thread(
            target=_background_worker_loop,
            name="QuinielasSyncQueueWorker",
            daemon=True
        )
        worker_thread.start()
        return True
