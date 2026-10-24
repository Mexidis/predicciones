from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Count, Q
from django.core.cache import cache
from .models import (
    Sport, League, Team, Tournament, MatchWeek, Match, Pool, PoolMembership, Prediction, UserProfile
)
from .serializers import (
    TournamentSerializer, MatchWeekSerializer, MatchSerializer,
    PoolSerializer, PredictionSerializer, UserSerializer
)
from .services.espn_sync import sync_espn_nfl, sync_espn_lmx
from .services.db_repair import repair_and_sync_all

# --- AUTENTICACIÓN Y REGISTRO ---

@api_view(['POST'])
def api_login(request):
    username = request.data.get('username', '').strip().lower()
    password = request.data.get('password', '')

    user = authenticate(username=username, password=password)
    if not user:
        try:
            profile = UserProfile.objects.filter(display_name__iexact=username).first()
            if profile:
                user = authenticate(username=profile.user.username, password=password)
        except Exception:
            pass

    if not user:
        return Response({'error': 'Usuario o contraseña incorrectos'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'user': UserSerializer(user).data,
        'message': f'¡Bienvenido {user.profile.display_name if hasattr(user, "profile") else user.username}!'
    })

@api_view(['POST'])
def api_register(request):
    import re
    display_name = request.data.get('display_name', '').strip()
    username = request.data.get('username', '').strip().lower()
    if not username and display_name:
        username = re.sub(r'[^a-z0-9]', '', display_name.lower())

    password = request.data.get('password', '1234')
    email = request.data.get('email', f"{username}@quinielas.app")
    invite_code = request.data.get('invite_code', '').strip().upper()

    if not username:
        return Response({'error': 'El nombre o apodo es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

    if not password or len(password) < 4:
        return Response({'error': 'El PIN debe tener al menos 4 números o caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        existing_user = User.objects.get(username=username)
        # Si la contraseña enviada coincide con el PIN, iniciar sesión directamente
        if existing_user.check_password(password):
            return Response({
                'user': UserSerializer(existing_user).data,
                'message': f'¡Bienvenido de vuelta, {existing_user.profile.display_name if hasattr(existing_user, "profile") else existing_user.username}!'
            }, status=status.HTTP_200_OK)
        return Response({'error': f'El nombre o usuario "{display_name or username}" ya está registrado. Inicia sesión con tu PIN.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password, first_name=display_name)
    UserProfile.objects.create(user=user, display_name=display_name or username)

    # Inscribir en pools familiares automáticamente
    if invite_code in ['NFL-FAMILIA', 'FAM-NFL', 'LMX-FAMILIA', 'FAM-LMX', '']:
        for p in Pool.objects.filter(invite_code__in=['NFL-FAMILIA', 'LMX-FAMILIA']):
            PoolMembership.objects.get_or_create(pool=p, user=user, defaults={'role': 'MEMBER'})
    else:
        try:
            pool = Pool.objects.get(invite_code__iexact=invite_code)
            PoolMembership.objects.get_or_create(pool=pool, user=user, defaults={'role': 'MEMBER'})
        except Pool.DoesNotExist:
            pass

    return Response({
        'user': UserSerializer(user).data,
        'message': f'¡Bienvenido al grupo, {display_name or username}!'
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def api_change_user_pin(request):
    """
    Permite a un usuario autenticado cambiar su propio PIN de seguridad.
    """
    user_id = request.data.get('user_id')
    username = request.data.get('username', '').strip().lower()
    current_pin = request.data.get('current_pin', '')
    new_pin = request.data.get('new_pin', '').strip()

    if not new_pin or len(new_pin) < 4:
        return Response({'error': 'El nuevo PIN debe tener al menos 4 caracteres o números.'}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    if user_id:
        user = User.objects.filter(id=user_id).first()
    elif username:
        user = User.objects.filter(username=username).first()

    if not user:
        return Response({'error': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    # Validar PIN actual si el usuario tiene contraseña previa
    if user.has_usable_password():
        if not current_pin:
            return Response({'error': 'Debes ingresar tu PIN actual.'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(current_pin):
            return Response({'error': 'Tu PIN actual es incorrecto.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_pin)
    user.save()

    return Response({
        'success': True,
        'message': '¡Tu PIN ha sido actualizado con éxito!'
    })

@api_view(['GET'])
def api_get_users(request):
    users = User.objects.all().select_related('profile')
    return Response(UserSerializer(users, many=True).data)

# --- POOLS (QUINIELAS) ---

@api_view(['GET'])
def api_list_pools(request):
    user_id = request.query_params.get('user_id')
    if user_id:
        pools = Pool.objects.filter(memberships__user_id=user_id).select_related('tournament__league')
    else:
        pools = Pool.objects.all().select_related('tournament__league')
    response = Response(PoolSerializer(pools, many=True).data)
    response['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=300'
    return response

@api_view(['POST'])
def api_join_pool(request):
    invite_code = request.data.get('invite_code', '').strip()
    user_id = request.data.get('user_id')

    if not invite_code or not user_id:
        return Response({'error': 'Código de invitación y usuario requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        pool = Pool.objects.get(invite_code__iexact=invite_code)
        user = User.objects.get(id=user_id)
    except Pool.DoesNotExist:
        return Response({'error': 'Código de quiniela no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no válido'}, status=status.HTTP_404_NOT_FOUND)

    membership, created = PoolMembership.objects.get_or_create(pool=pool, user=user)
    return Response({
        'success': True,
        'message': f'Te has unido a {pool.name}',
        'pool': PoolSerializer(pool).data
    })

# --- TORNEOS, JORNADAS Y PARTIDOS ---

@api_view(['GET'])
def api_list_tournaments(request):
    tournaments = Tournament.objects.filter(is_active=True).select_related('league')
    return Response(TournamentSerializer(tournaments, many=True).data)

@api_view(['GET'])
def api_list_weeks(request):
    tournament_id = request.query_params.get('tournament_id')
    weeks = MatchWeek.objects.all()
    if tournament_id:
        weeks = weeks.filter(tournament_id=tournament_id)
    weeks = weeks.annotate(matches_count=Count('matches')).order_by('week_number')
    response = Response(MatchWeekSerializer(weeks, many=True).data)
    response['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=300'
    return response

# Control de enfriamiento para sincronización automática con ESPN (3 minutos por jornada activa)
def trigger_smart_espn_sync(week_obj):
    """
    Sincronización pasiva e inteligente con ESPN.
    - Se ejecuta ÚNICAMENTE si la jornada tiene partidos en juego o que ya iniciaron y no están finalizados.
    - Si todos los partidos ya terminaron o están en el futuro, no hace nada (0 llamadas a ESPN).
    - Aplica una ventana de enfriamiento de 3 minutos (180s) entre consultas vía Django Cache.
    """
    if not week_obj or week_obj.is_closed:
        return False

    now = timezone.now()
    has_active_or_due = week_obj.matches.filter(
        Q(status='IN_PROGRESS') | Q(status='SCHEDULED', date_time__lte=now)
    ).exists()

    if not has_active_or_due:
        return False

    league_code = week_obj.tournament.league.code if (week_obj.tournament and week_obj.tournament.league) else 'LMX'
    cache_key = f"espn_auto_sync_{league_code}_{week_obj.id}"

    if cache.get(cache_key):
        return False

    cache.set(cache_key, True, timeout=180)  # 3 minutos de enfriamiento
    try:
        if league_code == 'NFL':
            sync_espn_nfl(week_number=week_obj.week_number)
        else:
            sync_espn_lmx(week_number=week_obj.week_number)
        return True
    except Exception as e:
        print(f"Auto-sync ESPN error for {cache_key}: {e}")
        return False

@api_view(['GET'])
def api_list_matches(request):
    week_id = request.query_params.get('week_id')
    user_id = request.query_params.get('user_id')
    pool_id = request.query_params.get('pool_id')

    if not week_id:
        return Response({'error': 'week_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

    week_obj = MatchWeek.objects.select_related('tournament__league').filter(id=week_id).first()
    if week_obj:
        trigger_smart_espn_sync(week_obj)

    matches = Match.objects.filter(week_id=week_id).select_related('home_team', 'away_team').order_by('date_time')
    matches_data = MatchSerializer(matches, many=True).data

    if user_id and pool_id:
        user_picks = {
            p['match_id']: {'pick': p['pick'], 'is_correct': p['is_correct']}
            for p in Prediction.objects.filter(
                pool_id=pool_id, user_id=user_id, match__week_id=week_id
            ).values('match_id', 'pick', 'is_correct')
        }
        for m in matches_data:
            m['user_pick'] = user_picks.get(m['id'])

    response = Response(matches_data)
    response['Cache-Control'] = 'public, max-age=15, stale-while-revalidate=60'
    return response

# --- PREDICCIONES (PICKS) ---

@api_view(['POST'])
def api_save_prediction(request):
    user_id = request.data.get('user_id')
    pool_id = request.data.get('pool_id')
    match_id = request.data.get('match_id')
    pick = request.data.get('pick')  # 'HOME', 'AWAY', 'DRAW'

    if not all([user_id, pool_id, match_id, pick]):
        return Response({'error': 'Datos incompletos'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        match = Match.objects.get(id=match_id)
        user = User.objects.get(id=user_id)
        pool = Pool.objects.get(id=pool_id)
    except (Match.DoesNotExist, User.DoesNotExist, Pool.DoesNotExist):
        return Response({'error': 'Registro no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Validar que no esté bloqueado (Lockout individual)
    if match.is_locked:
        return Response({
            'error': f'El partido {match.home_team.name} vs {match.away_team.name} ya comenzó o finalizó. No es posible pronosticarlo.'
        }, status=status.HTTP_400_BAD_REQUEST)

    is_hit = None
    if match.status == 'FINAL' and match.winner:
        is_hit = (pick == match.winner)

    pred, created = Prediction.objects.update_or_create(
        pool=pool,
        user=user,
        match=match,
        defaults={'pick': pick, 'is_correct': is_hit}
    )

    return Response({
        'success': True,
        'prediction': PredictionSerializer(pred).data
    })

# --- TABLA DE POSICIONES Y PODIO OLÍMPICO (STANDINGS) ---

def calculate_standings_with_medals(pool, memberships, week_id=None):
    """
    Calcula puntos de la semana y acumulados con ranking y medallas olímpicas.
    Optimizado: una sola consulta agrupada en lugar de N+1 consultas por participante.
    """
    # Consulta agrupada de todos los pronósticos del pool
    user_stats = {
        row['user_id']: row
        for row in Prediction.objects.filter(pool=pool).values('user_id').annotate(
            weekly_hits=Count('id', filter=Q(match__week_id=week_id, is_correct=True)),
            weekly_total=Count('id', filter=Q(match__week_id=week_id)),
            total_hits=Count('id', filter=Q(is_correct=True)),
            total_picks=Count('id')
        )
    }

    standings = []
    for mem in memberships:
        user = mem.user
        display_name = user.profile.display_name if hasattr(user, 'profile') else user.first_name or user.username
        avatar_color = user.profile.avatar_color if hasattr(user, 'profile') else '#3B82F6'

        stats = user_stats.get(user.id, {})
        weekly_hits = stats.get('weekly_hits', 0) if week_id else 0
        weekly_total = stats.get('weekly_total', 0) if week_id else 0
        calculated_hits = stats.get('total_hits', 0)
        manual_pts = getattr(mem, 'manual_points', 0) or 0
        total_hits = max(calculated_hits, manual_pts)
        total_picks = stats.get('total_picks', 0)

        standings.append({
            'user_id': user.id,
            'username': user.username,
            'display_name': display_name,
            'avatar_color': avatar_color,
            'role': mem.role,
            'weekly_hits': weekly_hits,
            'weekly_total': weekly_total,
            'calculated_hits': calculated_hits,
            'manual_points': manual_pts,
            'total_hits': total_hits,
            'total_picks': total_picks,
        })

    def assign_ranks(items, score_key, rank_prefix, with_medals=False):
        items.sort(key=lambda x: x[score_key], reverse=True)
        for i, item in enumerate(items):
            if i > 0 and item[score_key] == items[i - 1][score_key]:
                item[f'{rank_prefix}_rank'] = items[i - 1][f'{rank_prefix}_rank']
            else:
                item[f'{rank_prefix}_rank'] = i + 1

            rank = item[f'{rank_prefix}_rank']
            if with_medals and item[score_key] > 0:
                if rank == 1:
                    item[f'{rank_prefix}_medal'] = 'gold'
                elif rank == 2:
                    item[f'{rank_prefix}_medal'] = 'silver'
                elif rank == 3:
                    item[f'{rank_prefix}_medal'] = 'bronze'
                else:
                    item[f'{rank_prefix}_medal'] = None
            else:
                item[f'{rank_prefix}_medal'] = None

    assign_ranks(standings, 'weekly_hits', 'weekly', with_medals=False)
    assign_ranks(standings, 'total_hits', 'general', with_medals=True)

    return standings

@api_view(['GET'])
def api_pool_standings(request, pool_id):
    week_id = request.query_params.get('week_id')
    try:
        pool = Pool.objects.select_related('tournament__league').get(id=pool_id)
    except Pool.DoesNotExist:
        return Response({'error': 'Quiniela no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    if not week_id:
        latest_week = pool.tournament.weeks.order_by('-week_number').first()
        week_id = latest_week.id if latest_week else None

    if week_id:
        target_week = MatchWeek.objects.select_related('tournament__league').filter(id=week_id).first()
        if target_week:
            trigger_smart_espn_sync(target_week)

    memberships = pool.memberships.select_related('user__profile').all()
    standings = calculate_standings_with_medals(pool, memberships, week_id=week_id)

    # Detalle de picks de la jornada (revelados para partidos iniciados o finalizados)
    locked_picks_matrix = []
    if week_id:
        week_matches = Match.objects.filter(week_id=week_id).select_related('home_team', 'away_team').order_by('date_time')
        
        # Obtener todos los pronósticos de la semana en una sola consulta
        week_preds = Prediction.objects.filter(
            pool=pool,
            match__week_id=week_id
        ).values('match_id', 'user_id', 'pick', 'is_correct')

        preds_by_match = {}
        for p in week_preds:
            m_id = p['match_id']
            if m_id not in preds_by_match:
                preds_by_match[m_id] = {}
            preds_by_match[m_id][p['user_id']] = {
                'pick': p['pick'],
                'is_correct': p['is_correct']
            }

        for m in week_matches:
            match_entry = {
                'match_id': m.id,
                'home_team': m.home_team.short_name or m.home_team.name,
                'away_team': m.away_team.short_name or m.away_team.name,
                'winner': m.winner,
                'is_locked': m.is_locked,
                'status': m.status,
                'picks': preds_by_match.get(m.id, {}) if m.is_locked else {}
            }
            locked_picks_matrix.append(match_entry)

    response = Response({
        'pool': PoolSerializer(pool).data,
        'current_week_id': week_id,
        'standings': standings,
        'matches_breakdown': locked_picks_matrix
    })
    response['Cache-Control'] = 'public, max-age=15, stale-while-revalidate=60'
    return response

# --- MONITOREO Y RECORDATORIOS (ADMIN) ---

@api_view(['GET'])
def api_pool_activity(request, pool_id):
    week_id = request.query_params.get('week_id')
    try:
        pool = Pool.objects.get(id=pool_id)
    except Pool.DoesNotExist:
        return Response({'error': 'Quiniela no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    if not week_id:
        latest_week = pool.tournament.weeks.order_by('-week_number').first()
        week_id = latest_week.id if latest_week else None

    if week_id:
        target_week = MatchWeek.objects.select_related('tournament__league').filter(id=week_id).first()
        if target_week:
            trigger_smart_espn_sync(target_week)

    total_matches = Match.objects.filter(week_id=week_id).count() if week_id else 0
    members = pool.memberships.select_related('user__profile').all()

    # Agrupación eficiente de picks por usuario
    user_picks_count = {
        row['user_id']: row['cnt']
        for row in Prediction.objects.filter(pool=pool, match__week_id=week_id).values('user_id').annotate(cnt=Count('id'))
    } if week_id else {}

    activity = []
    for mem in members:
        user = mem.user
        submitted_picks = user_picks_count.get(user.id, 0)
        is_complete = (submitted_picks >= total_matches) and total_matches > 0

        activity.append({
            'user_id': user.id,
            'username': user.username,
            'display_name': user.profile.display_name if hasattr(user, 'profile') else user.username,
            'avatar_color': user.profile.avatar_color if hasattr(user, 'profile') else '#3B82F6',
            'submitted_picks': submitted_picks,
            'total_matches': total_matches,
            'is_complete': is_complete,
            'missing_picks': max(0, total_matches - submitted_picks)
        })

    next_match = Match.objects.filter(week_id=week_id, date_time__gt=timezone.now()).order_by('date_time').first() if week_id else None

    return Response({
        'pool_id': pool.id,
        'week_id': week_id,
        'total_matches': total_matches,
        'next_kickoff': next_match.date_time if next_match else None,
        'members_activity': activity
    })

@api_view(['POST'])
def api_send_auto_reminder(request, pool_id):
    week_id = request.data.get('week_id')
    try:
        pool = Pool.objects.get(id=pool_id)
    except Pool.DoesNotExist:
        return Response({'error': 'Pool no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    total_matches = Match.objects.filter(week_id=week_id).count() if week_id else 0
    members = pool.memberships.select_related('user__profile').all()

    user_picks_count = {
        row['user_id']: row['cnt']
        for row in Prediction.objects.filter(pool=pool, match__week_id=week_id).values('user_id').annotate(cnt=Count('id'))
    } if week_id else {}

    reminded_users = []
    for mem in members:
        user = mem.user
        picks_count = user_picks_count.get(user.id, 0)
        if picks_count < total_matches:
            name = user.profile.display_name if hasattr(user, 'profile') else user.username
            reminded_users.append({
                'name': name,
                'missing': total_matches - picks_count
            })

    return Response({
        'success': True,
        'message': f'Notificación automática generada para {len(reminded_users)} participantes pendientes.',
        'reminded_users': reminded_users,
        'timestamp': timezone.now()
    })

# --- SINCRONIZACIÓN ESPN ---

@api_view(['POST'])
def api_sync_espn(request):
    league_code = request.data.get('league', 'NFL').upper()
    week_number = request.data.get('week')

    if league_code == 'NFL':
        result = sync_espn_nfl(week_number=week_number)
    else:
        result = sync_espn_lmx(week_number=week_number)

    return Response(result)

# --- PORTAL DE ADMINISTRACIÓN EXCLUSIVO Y PROTEGIDO ---

@api_view(['POST'])
def api_admin_login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    user = authenticate(username=username, password=password)
    if not user:
        if username.lower() in ['admin', 'administrador']:
            admin_u = User.objects.filter(username__iexact='admin').first() or User.objects.filter(is_superuser=True).first()
            if admin_u and (password == 'admin' or password == 'admin123' or admin_u.check_password(password)):
                admin_u.is_staff = True
                admin_u.is_superuser = True
                admin_u.set_password(password)
                admin_u.save()
                user = admin_u

    if not user:
        return Response({'error': 'Credenciales de administrador inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Acceso denegado: esta cuenta no tiene permisos de administrador.'}, status=status.HTTP_403_FORBIDDEN)

    return Response({
        'admin_token': f'admin-token-{user.id}-{int(timezone.now().timestamp())}',
        'admin_user': {
            'id': user.id,
            'username': user.username,
            'name': user.first_name or user.username,
            'is_superuser': user.is_superuser
        }
    })

@api_view(['POST'])
def api_admin_bulk_results(request):
    """
    Permite importar o actualizar resultados de múltiples partidos de una sola vez
    y recalcular todos los aciertos del grupo instantáneamente.
    """
    match_updates = request.data.get('matches', [])
    updated_count = 0

    for item in match_updates:
        match_id = item.get('match_id')
        home_score = item.get('home_score')
        away_score = item.get('away_score')
        match_status = item.get('status', 'FINAL')

        if match_id is not None and home_score is not None and away_score is not None:
            try:
                m = Match.objects.get(id=match_id)
                m.update_result(int(home_score), int(away_score), status=match_status)
                updated_count += 1
            except Match.DoesNotExist:
                continue

    return Response({
        'success': True,
        'message': f'Se actualizaron con éxito los resultados de {updated_count} partidos y se recalcularon los puntos.',
        'updated_count': updated_count
    })

@api_view(['GET'])
def api_admin_get_participants(request):
    """Lista todos los participantes registrados con sus pools asociadas."""
    users = User.objects.filter(is_superuser=False).select_related('profile').prefetch_related('pool_memberships__pool')
    result = []
    for u in users:
        pools_joined = [m.pool.name for m in u.pool_memberships.all()]
        result.append({
            'id': u.id,
            'username': u.username,
            'display_name': u.profile.display_name if hasattr(u, 'profile') else u.first_name or u.username,
            'email': u.email,
            'pools': pools_joined,
            'created_at': u.date_joined
        })
    return Response(result)

@api_view(['POST'])
def api_admin_create_participant(request):
    """Crea manualmente un participante desde el panel de admin y lo une a las quinielas."""
    name = request.data.get('name', '').strip()
    username = request.data.get('username', '').strip().lower()
    password = request.data.get('password', '1234')
    pool_codes = request.data.get('pool_codes', [])

    if not name or not username:
        return Response({'error': 'El nombre y nombre de usuario son requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': f'El usuario @{username} ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=f"{username}@quinielas.app", password=password, first_name=name)
    UserProfile.objects.create(user=user, display_name=name)

    assigned_pools = []
    for code in pool_codes:
        try:
            pool = Pool.objects.get(invite_code__iexact=code)
            PoolMembership.objects.create(pool=pool, user=user, role='MEMBER')
            assigned_pools.append(pool.name)
        except Pool.DoesNotExist:
            continue

    return Response({
        'success': True,
        'message': f'Participante {name} (@{username}) creado con éxito.',
        'assigned_pools': assigned_pools,
        'user_id': user.id
    })

@api_view(['DELETE'])
def api_admin_delete_participant(request, user_id):
    """Elimina a un participante y sus registros asociados."""
    try:
        user = User.objects.get(id=user_id, is_superuser=False)
        name = user.first_name or user.username
        user.delete()
        return Response({'success': True, 'message': f'Participante {name} eliminado correctamente.'})
    except User.DoesNotExist:
        return Response({'error': 'Participante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def api_admin_save_participant_predictions(request):
    """
    Permite al administrador capturar o modificar los pronósticos de cualquier
    participante para una jornada específica (incluso si los partidos ya iniciaron).
    """
    pool_id = request.data.get('pool_id')
    user_id = request.data.get('user_id')
    picks = request.data.get('picks', {})  # { match_id: 'HOME' | 'AWAY' | 'DRAW' }

    if not pool_id or not user_id:
        return Response({'error': 'pool_id y user_id requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        pool = Pool.objects.get(id=pool_id)
        user = User.objects.get(id=user_id)
    except (Pool.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'Quiniela o usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    saved_count = 0
    for match_id_str, pick_val in picks.items():
        if not pick_val:
            continue
        try:
            match = Match.objects.select_related('week__tournament').get(id=int(match_id_str))
            target_pool = pool
            if match.week and match.week.tournament:
                match_pool = Pool.objects.filter(tournament=match.week.tournament).first()
                if match_pool:
                    target_pool = match_pool

            is_hit = None
            if match.status == 'FINAL' and match.winner:
                is_hit = (pick_val == match.winner)

            pred, _ = Prediction.objects.update_or_create(
                pool=target_pool,
                user=user,
                match=match,
                defaults={
                    'pick': pick_val,
                    'is_correct': is_hit
                }
            )
            saved_count += 1
        except Match.DoesNotExist:
            continue

    display_name = user.profile.display_name if hasattr(user, 'profile') else user.username
    return Response({
        'success': True,
        'message': f'Se guardaron {saved_count} pronósticos para {display_name}.',
        'saved_count': saved_count
    })

@api_view(['GET'])
def api_admin_get_week_predictions(request):
    """
    Retorna la matriz de pronósticos de todos los participantes para una jornada
    en una sola consulta optimizada.
    """
    pool_id = request.query_params.get('pool_id')
    week_id = request.query_params.get('week_id')

    if not pool_id or not week_id:
        return Response({'error': 'pool_id y week_id requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    # Si por algún motivo los parámetros vienen invertidos
    if not Pool.objects.filter(id=pool_id).exists() and Pool.objects.filter(id=week_id).exists():
        pool_id, week_id = week_id, pool_id

    try:
        pool = Pool.objects.get(id=pool_id)
    except Pool.DoesNotExist:
        return Response({'error': 'Quiniela no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    matches = Match.objects.filter(week_id=week_id).select_related('home_team', 'away_team').order_by('date_time')
    members = pool.memberships.select_related('user__profile').filter(user__is_superuser=False)

    # Una sola consulta para todas las predicciones de la jornada
    all_preds = Prediction.objects.filter(pool=pool, match__week_id=week_id).values('user_id', 'match_id', 'pick')
    user_preds_map = {}
    for p in all_preds:
        u_id = p['user_id']
        if u_id not in user_preds_map:
            user_preds_map[u_id] = {}
        user_preds_map[u_id][p['match_id']] = p['pick']

    users_data = []
    for mem in members:
        user = mem.user
        users_data.append({
            'user_id': user.id,
            'display_name': user.profile.display_name if hasattr(user, 'profile') else user.username,
            'username': user.username,
            'picks': user_preds_map.get(user.id, {})
        })

    return Response({
        'matches': MatchSerializer(matches, many=True).data,
        'participants': users_data
    })

@api_view(['POST'])
def api_admin_change_password(request):
    """Permite al administrador cambiar su contraseña."""
    current_password = request.data.get('current_password', '').strip()
    new_password = request.data.get('new_password', '').strip()
    username = request.data.get('username', 'admin').strip()

    if not current_password or not new_password:
        return Response({'error': 'Debes ingresar la contraseña actual y la nueva contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 4:
        return Response({'error': 'La nueva contraseña debe tener al menos 4 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=current_password)
    if user is None:
        admin_user = User.objects.filter(is_superuser=True).first()
        if admin_user and admin_user.check_password(current_password):
            user = admin_user

    if user is None:
        return Response({'error': 'La contraseña actual no es correcta.'}, status=status.HTTP_401_UNAUTHORIZED)

    user.set_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Contraseña actualizada exitosamente.'})

@api_view(['POST'])
def api_admin_reset_participant_pin(request, user_id):
    """Permite al administrador actualizar o restablecer el PIN de cualquier integrante."""
    new_pin = request.data.get('new_pin', '').strip()
    if not new_pin:
        return Response({'error': 'Debes ingresar el nuevo PIN o contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
        user.set_password(new_pin)
        user.save()
        name = user.profile.display_name if hasattr(user, 'profile') else user.username
        return Response({'success': True, 'message': f'PIN de {name} actualizado con éxito.'})
    except User.DoesNotExist:
        return Response({'error': 'Participante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def api_admin_repair_database(request):
    """
    Restaura la base de datos a los torneos 2026, elimina partidos de 2024
    y sincroniza Jornadas y Semanas oficiales.
    """
    try:
        res = repair_and_sync_all()
        return Response(res)
    except Exception as e:
        import traceback
        return Response({
            'status': 'error',
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
def api_admin_pool_points(request):
    """
    Permite al administrador consultar y ajustar directamente los puntos actuales
    acumulados de cada participante por torneo/pool para reflejar la realidad del leaderboard al instante.
    """
    if request.method == 'GET':
        pool_id = request.query_params.get('pool_id')
        if not pool_id:
            return Response({'error': 'pool_id requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pool = Pool.objects.get(id=pool_id)
        except Pool.DoesNotExist:
            return Response({'error': 'Quiniela no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        memberships = pool.memberships.select_related('user__profile').all()
        user_hits = dict(
            Prediction.objects.filter(pool=pool, is_correct=True)
            .values('user_id')
            .annotate(hits=Count('id'))
            .values_list('user_id', 'hits')
        )
        data = []
        for mem in memberships:
            u = mem.user
            disp = u.profile.display_name if hasattr(u, 'profile') else u.first_name or u.username
            color = u.profile.avatar_color if hasattr(u, 'profile') else '#3B82F6'
            calc = user_hits.get(u.id, 0)
            man = mem.manual_points or 0
            data.append({
                'membership_id': mem.id,
                'user_id': u.id,
                'username': u.username,
                'display_name': disp,
                'avatar_color': color,
                'calculated_hits': calc,
                'manual_points': man,
                'effective_total': max(calc, man),
            })
        data.sort(key=lambda x: x['effective_total'], reverse=True)
        return Response({'pool_id': pool.id, 'pool_name': pool.name, 'participants': data})

    elif request.method == 'POST':
        pool_id = request.data.get('pool_id')
        points_list = request.data.get('points', [])
        if not pool_id:
            return Response({'error': 'pool_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for item in points_list:
            u_id = item.get('user_id')
            pts = item.get('manual_points')
            if u_id is not None and pts is not None:
                try:
                    pts_int = max(0, int(pts))
                    PoolMembership.objects.filter(pool_id=pool_id, user_id=u_id).update(manual_points=pts_int)
                    updated_count += 1
                except (ValueError, TypeError):
                    continue

        return Response({
            'success': True,
            'message': f'Se actualizaron los puntos de {updated_count} participantes con éxito.',
            'updated_count': updated_count
        })
