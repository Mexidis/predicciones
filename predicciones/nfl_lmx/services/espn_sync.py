import time
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db.models import Q
from ..models import Sport, League, Team, Tournament, MatchWeek, Match, Prediction

ESPN_NFL_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
ESPN_LMX_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard"

# Caché en memoria con TTL (2 horas) para rachas de equipos Liga MX
_lmx_team_form_cache = {}
_LMX_FORM_TTL_SECONDS = 7200

# Mapeo oficial de fechas por Jornada para Liga MX Apertura 2026
LMX_JORNADAS_DATES = {
    1: ['20260716', '20260717', '20260718'],
    2: ['20260721', '20260724', '20260725', '20260726'],
    3: ['20260731', '20260801', '20260802'],
    4: ['20260815', '20260816', '20260817'],
    5: ['20260821', '20260822', '20260823'],
    6: ['20260828', '20260829', '20260830'],
    7: ['20260904', '20260905', '20260906'],
    8: ['20260910', '20260911', '20260912', '20260913', '20260914', '20260915'],
    9: ['20260918', '20260919', '20260920'],
    10: ['20260925', '20260926', '20260927'],
    11: ['20261009', '20261010', '20261011'],
    12: ['20261016', '20261017', '20261018'],
    13: ['20261020', '20261021'],
    14: ['20261023', '20261024', '20261025'],
    15: ['20261030', '20261031', '20261101'],
    16: ['20261106', '20261107', '20261108'],
    17: ['20261120', '20261121', '20261122'],
}

def _get_cached_lmx_form(espn_id):
    str_id = str(espn_id or '').strip()
    if not str_id:
        return None
    entry = _lmx_team_form_cache.get(str_id)
    if entry and (time.time() - entry[0] < _LMX_FORM_TTL_SECONDS):
        return entry[1]
    return None

def prefetch_lmx_forms(team_ids):
    """Descarga de forma concurrente la racha oficial de los equipos para evitar timeouts."""
    needed = [
        str(t).strip()
        for t in team_ids
        if str(t).strip() and _get_cached_lmx_form(t) is None
    ]
    if needed:
        with ThreadPoolExecutor(max_workers=6) as executor:
            list(executor.map(fetch_lmx_team_form, needed))

def get_or_create_structure():
    """Crea los deportes, ligas y torneos base si no existen."""
    sport_soccer, _ = Sport.objects.get_or_create(name="Fútbol Soccer")
    sport_football, _ = Sport.objects.get_or_create(name="Fútbol Americano")

    league_lmx, _ = League.objects.get_or_create(
        code="LMX",
        defaults={
            "name": "Liga BBVA MX",
            "sport": sport_soccer,
            "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/mex.1.png"
        }
    )

    league_nfl, _ = League.objects.get_or_create(
        code="NFL",
        defaults={
            "name": "NFL",
            "sport": sport_football,
            "logo_url": "https://a.espncdn.com/i/leaguelogos/nfl/500/scoreboard/nfl.png"
        }
    )

    current_year = timezone.now().year
    tourn_lmx = Tournament.objects.filter(league=league_lmx, is_active=True).order_by('-year').first()
    if not tourn_lmx:
        tourn_lmx = Tournament.objects.create(
            league=league_lmx,
            name=f"Apertura {current_year}",
            year=current_year,
            is_active=True
        )

    tourn_nfl = Tournament.objects.filter(league=league_nfl, is_active=True).order_by('-year').first()
    if not tourn_nfl:
        tourn_nfl = Tournament.objects.create(
            league=league_nfl,
            name=f"Temporada NFL {current_year}",
            year=current_year,
            is_active=True
        )

    return league_lmx, league_nfl, tourn_lmx, tourn_nfl

def format_form_string(form_str):
    """Convierte 'WLDWW' (inglés ESPN) o 'VDEDV' (español) en formato 'V-D-E-V-V'"""
    if not form_str:
        return ""
    cleaned = form_str.replace("-", "").upper()
    if 'W' in cleaned or 'L' in cleaned:
        # ESPN API en inglés: W=Win (Victoria), D=Draw (Empate), L=Loss (Derrota)
        mapping = {'W': 'V', 'D': 'E', 'L': 'D'}
    else:
        # Formato en español: V=Victoria, E=Empate, D=Derrota
        mapping = {'V': 'V', 'E': 'E', 'D': 'D'}
    letters = [mapping.get(ch, ch) for ch in cleaned[-5:] if ch in 'WDLEV']
    return "-".join(letters)

def fetch_lmx_team_form(espn_id):
    """
    Obtiene la racha real de los últimos 5 partidos de Liga MX de un equipo
    consultando su calendario de torneo oficial en ESPN, idéntico a las tablas de Google.
    """
    if not espn_id:
        return ""
    str_id = str(espn_id).strip()
    cached = _get_cached_lmx_form(str_id)
    if cached is not None:
        return cached

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/teams/{str_id}/schedule"
        resp = requests.get(url, timeout=6)
        if resp.status_code != 200:
            return ""
        events = resp.json().get('events', [])
        final_events = []
        for e in events:
            comp = e.get('competitions', [{}])[0]
            st_obj = comp.get('status', {}).get('type', {})
            if st_obj.get('completed', False) or 'FULL_TIME' in st_obj.get('name', '') or 'FINAL' in st_obj.get('name', ''):
                final_events.append((e.get('date', ''), comp))

        final_events.sort(key=lambda x: x[0])
        last5 = final_events[-5:]
        form_chars = []
        for dt, comp in last5:
            comps = comp.get('competitors', [])
            this_team = next((c for c in comps if str(c.get('id')) == str_id), None)
            other_team = next((c for c in comps if str(c.get('id')) != str_id), None)
            if this_team and other_team:
                try:
                    t_sc = float(this_team.get('score', {}).get('value', 0))
                    o_sc = float(other_team.get('score', {}).get('value', 0))
                    if t_sc > o_sc:
                        form_chars.append('V')
                    elif t_sc < o_sc:
                        form_chars.append('D')
                    else:
                        form_chars.append('E')
                except (ValueError, TypeError):
                    continue

        form_str = '-'.join(form_chars)
        if form_str:
            _lmx_team_form_cache[str_id] = (time.time(), form_str)
        return form_str
    except Exception:
        return ""

def get_or_create_nfl_team(league_nfl, comp_team):
    """Obtiene o crea un equipo de NFL evitando duplicados."""
    espn_id = str(comp_team.get('id', '')).strip()
    display_name = (comp_team.get('displayName') or '').strip()
    short_name = (comp_team.get('shortDisplayName') or comp_team.get('name') or '').strip()
    abbrev = (comp_team.get('abbreviation') or '').strip()
    logo = comp_team.get('logo') or (f"https://a.espncdn.com/i/teamlogos/nfl/500/{espn_id}.png" if espn_id else "")

    team = None
    if espn_id:
        team = Team.objects.filter(league=league_nfl, espn_id=espn_id).first()

    if not team and display_name:
        team = Team.objects.filter(league=league_nfl, name__iexact=display_name).first()

    if not team and short_name:
        team = Team.objects.filter(league=league_nfl, short_name__iexact=short_name).first()

    if not team and short_name:
        team = Team.objects.filter(league=league_nfl, name__iexact=short_name).first()

    if team:
        updated = False
        if espn_id and not team.espn_id:
            team.espn_id = espn_id
            updated = True
        if short_name and not team.short_name:
            team.short_name = short_name or abbrev
            updated = True
        if logo and not team.logo_url:
            team.logo_url = logo
            updated = True
        if updated:
            team.save()
        return team

    return Team.objects.create(
        league=league_nfl,
        name=display_name or short_name,
        short_name=short_name or abbrev,
        logo_url=logo,
        espn_id=espn_id or None
    )

def get_or_create_lmx_team(league_lmx, comp_team):
    """Obtiene o crea un equipo de Liga MX emparejando por espn_id o nombres oficiales."""
    espn_id = str(comp_team.get('id', '')).strip()
    display_name = (comp_team.get('displayName') or '').strip()
    short_name = (comp_team.get('shortDisplayName') or comp_team.get('name') or '').strip()
    logo = comp_team.get('logo') or (f"https://a.espncdn.com/i/teamlogos/soccer/500/{espn_id}.png" if espn_id else "")

    team = None
    if espn_id:
        team = Team.objects.filter(league=league_lmx, espn_id=espn_id).first()

    if not team and display_name:
        team = Team.objects.filter(league=league_lmx, name__iexact=display_name).first()

    if not team and short_name:
        team = Team.objects.filter(league=league_lmx, short_name__iexact=short_name).first()

    if not team and short_name:
        team = Team.objects.filter(league=league_lmx, name__icontains=short_name).first()

    if not team and display_name:
        team = Team.objects.filter(league=league_lmx, name__icontains=display_name).first()

    if team:
        updated = False
        if espn_id and not team.espn_id:
            team.espn_id = espn_id
            updated = True
        if short_name and not team.short_name:
            team.short_name = short_name
            updated = True
        if logo and not team.logo_url:
            team.logo_url = logo
            updated = True
        if updated:
            team.save()
        return team

    return Team.objects.create(
        league=league_lmx,
        name=display_name or short_name,
        short_name=short_name or display_name,
        logo_url=logo,
        espn_id=espn_id or None
    )

def resolve_espn_match_status(event):
    """
    Interpreta el estado del partido desde ESPN de forma universal para Soccer y NFL.
    Soporta:
      - FINAL: STATUS_FINAL, STATUS_FULL_TIME, FT, AFTER_ET, AFTER_PENALTIES, state: 'post', completed: True
      - IN_PROGRESS: STATUS_IN_PROGRESS, STATUS_FIRST_HALF, STATUS_SECOND_HALF, STATUS_HALFTIME, state: 'in'
      - POSTPONED: STATUS_POSTPONED, STATUS_SUSPENDED, STATUS_DELAYED, state: 'postponed'
      - CANCELED: STATUS_CANCELED, STATUS_ABANDONED, state: 'canceled'
      - SCHEDULED: STATUS_SCHEDULED, state: 'pre'
    """
    status_info = event.get('status', {})
    status_type = status_info.get('type', {})
    status_name = str(status_type.get('name', 'STATUS_SCHEDULED')).upper()
    status_state = str(status_type.get('state', 'pre')).lower()
    is_completed = bool(status_type.get('completed', False))

    if is_completed or status_state == 'post' or any(k in status_name for k in ['FINAL', 'FULL_TIME', 'STATUS_FT', 'AFTER_ET', 'AFTER_PENALTIES']):
        return 'FINAL'
    elif status_state == 'in' or any(k in status_name for k in ['PROGRESS', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME', 'EXTRA_TIME', 'OVERTIME']):
        return 'IN_PROGRESS'
    elif any(k in status_name for k in ['POSTPONED', 'SUSPENDED', 'DELAYED']) or status_state == 'postponed':
        return 'POSTPONED'
    elif any(k in status_name for k in ['CANCELED', 'ABANDONED']) or status_state == 'canceled':
        return 'CANCELED'
    return 'SCHEDULED'

def find_or_create_match(week_obj, home_team, away_team, espn_id, kickoff):
    """
    Busca un partido en la semana evitando duplicados causados por inversión de local/visita
    o falta previa de espn_id.
    """
    match = None
    if espn_id:
        match = Match.objects.filter(week=week_obj, espn_id=espn_id).first()

    if not match:
        match = Match.objects.filter(
            week=week_obj
        ).filter(
            (Q(home_team=home_team, away_team=away_team) | Q(home_team=away_team, away_team=home_team))
        ).first()

    if not match:
        match = Match.objects.create(
            week=week_obj,
            home_team=home_team,
            away_team=away_team,
            date_time=kickoff,
            espn_id=espn_id or None
        )
        return match, False

    if match.home_team_id == away_team.id and match.away_team_id == home_team.id:
        for pred in match.predictions.all():
            if pred.pick == 'HOME':
                pred.pick = 'AWAY'
            elif pred.pick == 'AWAY':
                pred.pick = 'HOME'
            pred.save(update_fields=['pick'])
        match.home_team = home_team
        match.away_team = away_team

    if espn_id and not match.espn_id:
        match.espn_id = espn_id

    match.date_time = kickoff
    return match, True

def _refresh_week_metadata(week_obj, min_expected_matches=8):
    """
    Actualiza start_date y end_date de una jornada en función de sus partidos reales.
    Preserva is_closed intacto para no alterar el cálculo acumulado (manual_points + active_hits).
    """
    if not week_obj:
        return
    matches = list(week_obj.matches.all())
    if not matches:
        return

    dates = [timezone.localtime(m.date_time).date() for m in matches if m.date_time]
    start_d = min(dates) if dates else week_obj.start_date
    end_d = max(dates) if dates else week_obj.end_date

    changed = False
    if start_d and week_obj.start_date != start_d:
        week_obj.start_date = start_d
        changed = True
    if end_d and week_obj.end_date != end_d:
        week_obj.end_date = end_d
        changed = True
    if changed:
        week_obj.save(update_fields=['start_date', 'end_date'])


def sync_espn_nfl(week_number=None, year=None):
    """
    Sincroniza partidos de NFL desde ESPN Scoreboard usando el año y jornada solicitados.
    Garantiza idempotencia por espn_id y protege marcadores ya finalizados.
    """
    league_lmx, league_nfl, tourn_lmx, tourn_nfl = get_or_create_structure()
    season_year = year or tourn_nfl.year or timezone.now().year
    if season_year < 2026:
        season_year = 2026
        tourn_nfl.year = 2026
        tourn_nfl.save()

    params = {
        'seasontype': 2,
        'dates': str(season_year)
    }
    if week_number:
        params['week'] = int(week_number)

    try:
        resp = requests.get(ESPN_NFL_URL, params=params, timeout=10)
        if resp.status_code != 200:
            return {"error": f"ESPN returned status {resp.status_code}"}
        data = resp.json()
    except Exception as e:
        return {"error": str(e)}

    espn_week_num = data.get('week', {}).get('number', int(week_number) if week_number else 1)
    if week_number and int(espn_week_num) != int(week_number):
        return {"error": f"ESPN returned week {espn_week_num} instead of requested week {week_number}", "matches_updated": 0}

    week_obj, _ = MatchWeek.objects.get_or_create(
        tournament=tourn_nfl,
        week_number=espn_week_num,
        defaults={"name": f"Semana {espn_week_num}"}
    )

    events = data.get('events', [])
    updated_matches = 0

    for event in events:
        espn_id = str(event.get('id', '')).strip()
        kickoff_raw = event.get('date')
        kickoff = parse_datetime(kickoff_raw) if kickoff_raw else timezone.now()

        status = resolve_espn_match_status(event)

        competition = event.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])
        if len(competitors) < 2:
            continue

        home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
        away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

        home_team = get_or_create_nfl_team(league_nfl, home_comp.get('team', {}))
        away_team = get_or_create_nfl_team(league_nfl, away_comp.get('team', {}))

        home_record = home_comp.get('records', [{}])[0].get('summary', '') if home_comp.get('records') else ''
        away_record = away_comp.get('records', [{}])[0].get('summary', '') if away_comp.get('records') else ''

        match, _ = find_or_create_match(week_obj, home_team, away_team, espn_id, kickoff)

        if home_record:
            match.home_form = home_record
        if away_record:
            match.away_form = away_record

        if status in ['FINAL', 'IN_PROGRESS']:
            h_score_raw = home_comp.get('score')
            a_score_raw = away_comp.get('score')
            try:
                h_score = int(h_score_raw) if h_score_raw is not None else None
                a_score = int(a_score_raw) if a_score_raw is not None else None
            except (ValueError, TypeError):
                h_score, a_score = None, None

            if status == 'FINAL' and h_score is not None and a_score is not None:
                if match.status != 'FINAL' or match.home_score != h_score or match.away_score != a_score or not match.winner:
                    match.update_result(h_score, a_score, status='FINAL')
                else:
                    match.save(update_fields=['date_time', 'espn_id', 'home_form', 'away_form'])
            else:
                match.status = status
                match.home_score = h_score
                match.away_score = a_score
                match.save()
        elif status in ['POSTPONED', 'CANCELED']:
            match.status = status
            match.save(update_fields=['status', 'date_time', 'espn_id'])
        else:
            # Si ya fue finalizado previamente (ej. captura manual), no borrar el marcador
            if match.status != 'FINAL':
                match.status = status
                match.home_score = None
                match.away_score = None
                match.winner = None
            match.save()

        updated_matches += 1

    _refresh_week_metadata(week_obj, min_expected_matches=12)
    return {"status": "ok", "week": espn_week_num, "matches_updated": updated_matches}

def _fetch_lmx_events_for_date(date_param):
    try:
        resp = requests.get(ESPN_LMX_URL, params={'dates': date_param}, timeout=7)
        if resp.status_code == 200:
            return resp.json().get('events', [])
    except Exception:
        pass
    return []

def sync_espn_lmx(week_number=None, date_str=None, fetch_forms=True):
    """
    Sincroniza partidos de Liga MX desde ESPN de forma concurrente y segura.
    Soporta cualquier jornada (1 a 17) usando el calendario oficial de fechas.
    Jamás contamina una jornada con partidos de otra fecha.
    """
    league_lmx, league_nfl, tourn_lmx, tourn_nfl = get_or_create_structure()

    week_num_int = None
    if week_number:
        try:
            week_num_int = int(week_number)
        except (ValueError, TypeError):
            week_num_int = None

    if not week_num_int and not date_str:
        open_week = MatchWeek.objects.filter(tournament=tourn_lmx, is_closed=False).order_by('week_number').first()
        week_num_int = open_week.week_number if open_week else 14

    week_obj = None
    if week_num_int:
        week_obj, _ = MatchWeek.objects.get_or_create(
            tournament=tourn_lmx,
            week_number=week_num_int,
            defaults={"name": f"Jornada {week_num_int}"}
        )

    dates_to_query = []
    if date_str:
        dates_to_query = [date_str.replace("-", "")]
    elif week_num_int and week_num_int in LMX_JORNADAS_DATES:
        dates_to_query = LMX_JORNADAS_DATES[week_num_int]
    elif week_obj and week_obj.matches.exists():
        dates_to_query = sorted({timezone.localtime(m.date_time).strftime('%Y%m%d') for m in week_obj.matches.all()})
    else:
        return {"status": "ok", "message": "Sin fechas mapeadas para la jornada solicitada", "matches_updated": 0}

    all_events = []
    seen_event_ids = set()
    with ThreadPoolExecutor(max_workers=min(4, max(1, len(dates_to_query)))) as executor:
        for events_batch in executor.map(_fetch_lmx_events_for_date, dates_to_query):
            for ev in events_batch:
                ev_id = str(ev.get('id', '')).strip()
                if ev_id and ev_id not in seen_event_ids:
                    seen_event_ids.add(ev_id)
                    all_events.append(ev)

    if not all_events:
        return {"status": "ok", "message": "No se encontraron partidos en las fechas consultadas", "matches_updated": 0}

    # Pre-descargar concurrentemente las rachas de los equipos involucrados si se solicita
    if fetch_forms:
        team_ids_to_prefetch = set()
        for ev in all_events:
            for c in ev.get('competitions', [{}])[0].get('competitors', []):
                tid = c.get('team', {}).get('id')
                if tid:
                    team_ids_to_prefetch.add(str(tid))
        if team_ids_to_prefetch:
            prefetch_lmx_forms(team_ids_to_prefetch)

    updated_matches = 0
    for event in all_events:
        espn_id = str(event.get('id', '')).strip()
        kickoff_raw = event.get('date')
        kickoff = parse_datetime(kickoff_raw) if kickoff_raw else timezone.now()

        status = resolve_espn_match_status(event)

        competition = event.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])
        if len(competitors) < 2:
            continue

        home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
        away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

        home_team = get_or_create_lmx_team(league_lmx, home_comp.get('team', {}))
        away_team = get_or_create_lmx_team(league_lmx, away_comp.get('team', {}))

        if fetch_forms:
            home_form = fetch_lmx_team_form(home_team.espn_id) or format_form_string(home_comp.get('form', ''))
            away_form = fetch_lmx_team_form(away_team.espn_id) or format_form_string(away_comp.get('form', ''))
        else:
            home_form = _get_cached_lmx_form(home_team.espn_id) or format_form_string(home_comp.get('form', ''))
            away_form = _get_cached_lmx_form(away_team.espn_id) or format_form_string(away_comp.get('form', ''))

        match, _ = find_or_create_match(week_obj, home_team, away_team, espn_id, kickoff)

        if home_form:
            match.home_form = home_form
        if away_form:
            match.away_form = away_form

        if status in ['FINAL', 'IN_PROGRESS']:
            h_score_raw = home_comp.get('score')
            a_score_raw = away_comp.get('score')
            try:
                h_score = int(h_score_raw) if h_score_raw is not None else None
                a_score = int(a_score_raw) if a_score_raw is not None else None
            except (ValueError, TypeError):
                h_score, a_score = None, None

            if status == 'FINAL' and h_score is not None and a_score is not None:
                if match.status != 'FINAL' or match.home_score != h_score or match.away_score != a_score or not match.winner:
                    match.update_result(h_score, a_score, status='FINAL')
                else:
                    match.save(update_fields=['date_time', 'espn_id', 'home_form', 'away_form'])
            else:
                match.status = status
                match.home_score = h_score
                match.away_score = a_score
                match.save()
        elif status in ['POSTPONED', 'CANCELED']:
            match.status = status
            match.save(update_fields=['status', 'date_time', 'espn_id'])
        else:
            if match.status != 'FINAL':
                match.status = status
                match.home_score = None
                match.away_score = None
                match.winner = None
            match.save()

        updated_matches += 1

    if week_num_int and week_num_int in LMX_JORNADAS_DATES:
        valid_dates = set(LMX_JORNADAS_DATES[week_num_int])
        for m in list(week_obj.matches.all()):
            m_local_date = timezone.localtime(m.date_time).strftime('%Y%m%d')
            if m_local_date not in valid_dates and not m.predictions.exists():
                m.delete()

    _refresh_week_metadata(week_obj, min_expected_matches=8)
    return {"status": "ok", "week": week_obj.week_number, "matches_updated": updated_matches}


def sync_upcoming_calendar(league_code='ALL', fetch_forms=False):
    """
    Sincroniza todas las jornadas del torneo (tanto pasadas que estén incompletas
    como la jornada activa y todas las siguientes jornadas futuras) para que el historial
    completo (1-17 LMX, 1-18 NFL) y el calendario futuro estén siempre disponibles.
    """
    from django.db.models import Count, Q
    _, _, tourn_lmx, tourn_nfl = get_or_create_structure()
    total_updated = 0
    details = {}

    if league_code in ('ALL', 'LMX'):
        lmx_updated = 0
        lmx_stats = {
            w.week_number: (w.m_total, w.m_final)
            for w in MatchWeek.objects.filter(tournament=tourn_lmx).annotate(
                m_total=Count('matches'),
                m_final=Count('matches', filter=Q(matches__status='FINAL'))
            )
        }
        for j in range(1, 18):
            m_total, m_final = lmx_stats.get(j, (0, 0))
            # Si es una jornada pasada (<= 13) y ya tiene sus 9 partidos finalizados, no re-consultar a ESPN
            if j <= 13 and m_total >= 9 and m_final >= 9:
                continue
            res = sync_espn_lmx(week_number=j, fetch_forms=(fetch_forms and j in (14, 15)))
            lmx_updated += res.get('matches_updated', 0)
        details['LMX'] = lmx_updated
        total_updated += lmx_updated

    if league_code in ('ALL', 'NFL'):
        nfl_updated = 0
        nfl_stats = {
            w.week_number: (w.m_total, w.m_final)
            for w in MatchWeek.objects.filter(tournament=tourn_nfl).annotate(
                m_total=Count('matches'),
                m_final=Count('matches', filter=Q(matches__status='FINAL'))
            )
        }
        for s in range(1, 19):
            m_total, m_final = nfl_stats.get(s, (0, 0))
            # Si es una semana pasada (<= 6) y ya tiene sus partidos finalizados, no re-consultar a ESPN
            if s <= 6 and m_total >= 12 and m_final >= m_total:
                continue
            res = sync_espn_nfl(week_number=s)
            nfl_updated += res.get('matches_updated', 0)
        details['NFL'] = nfl_updated
        total_updated += nfl_updated

    return {"status": "ok", "matches_updated": total_updated, "details": details}
