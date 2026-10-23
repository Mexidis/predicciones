import requests
from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from ..models import Sport, League, Team, Tournament, MatchWeek, Match, Prediction

ESPN_NFL_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
ESPN_LMX_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard"

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

    tourn_lmx, _ = Tournament.objects.get_or_create(
        league=league_lmx,
        name="Apertura 2026",
        defaults={"year": 2026, "is_active": True}
    )

    tourn_nfl, _ = Tournament.objects.get_or_create(
        league=league_nfl,
        name="Temporada NFL 2026",
        defaults={"year": 2026, "is_active": True}
    )

    return league_lmx, league_nfl, tourn_lmx, tourn_nfl

def format_form_string(form_str):
    """Convierte 'WLDWW' o 'VDEDV' en formato amigable 'V-D-E-V-V'"""
    if not form_str:
        return ""
    mapping = {'W': 'V', 'D': 'E', 'L': 'D', 'V': 'V', 'E': 'E'}
    letters = [mapping.get(ch.upper(), ch.upper()) for ch in form_str[-5:]]
    return "-".join(letters)

def sync_espn_nfl(week_number=None):
    """Sincroniza partidos de NFL desde ESPN."""
    league_lmx, league_nfl, tourn_lmx, tourn_nfl = get_or_create_structure()
    params = {}
    if week_number:
        params['week'] = week_number

    try:
        resp = requests.get(ESPN_NFL_URL, params=params, timeout=10)
        if resp.status_code != 200:
            return {"error": f"ESPN returned status {resp.status_code}"}
        data = resp.json()
    except Exception as e:
        return {"error": str(e)}

    espn_week_num = data.get('week', {}).get('number', week_number or 1)
    week_obj, _ = MatchWeek.objects.get_or_create(
        tournament=tourn_nfl,
        week_number=espn_week_num,
        defaults={"name": f"Semana {espn_week_num}"}
    )

    events = data.get('events', [])
    updated_matches = 0

    for event in events:
        espn_id = event.get('id')
        kickoff_raw = event.get('date')
        kickoff = parse_datetime(kickoff_raw) if kickoff_raw else timezone.now()
        
        status_type = event.get('status', {}).get('type', {}).get('name', 'STATUS_SCHEDULED')
        
        if 'FINAL' in status_type:
            status = 'FINAL'
        elif 'IN_PROGRESS' in status_type:
            status = 'IN_PROGRESS'
        elif 'POSTPONED' in status_type:
            status = 'POSTPONED'
        else:
            status = 'SCHEDULED'

        competition = event.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])
        if len(competitors) < 2:
            continue

        home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
        away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

        # Obtener o crear equipos
        home_team, _ = Team.objects.get_or_create(
            league=league_nfl,
            name=home_comp['team']['displayName'],
            defaults={
                "short_name": home_comp['team'].get('shortDisplayName', home_comp['team']['name']),
                "logo_url": home_comp['team'].get('logo', ''),
                "espn_id": home_comp['team'].get('id')
            }
        )
        away_team, _ = Team.objects.get_or_create(
            league=league_nfl,
            name=away_comp['team']['displayName'],
            defaults={
                "short_name": away_comp['team'].get('shortDisplayName', away_comp['team']['name']),
                "logo_url": away_comp['team'].get('logo', ''),
                "espn_id": away_comp['team'].get('id')
            }
        )

        # Forma o record (ej. "5-2")
        home_record = home_comp.get('records', [{}])[0].get('summary', '')
        away_record = away_comp.get('records', [{}])[0].get('summary', '')

        match, _ = Match.objects.get_or_create(
            week=week_obj,
            home_team=home_team,
            away_team=away_team,
            defaults={
                "date_time": kickoff,
                "espn_id": espn_id,
                "home_form": home_record,
                "away_form": away_record,
            }
        )
        match.date_time = kickoff
        match.espn_id = espn_id
        if home_record:
            match.home_form = home_record
        if away_record:
            match.away_form = away_record

        home_score = home_comp.get('score')
        away_score = away_comp.get('score')

        if status == 'FINAL' and home_score is not None and away_score is not None:
            match.update_result(int(home_score), int(away_score), status='FINAL')
        else:
            match.status = status
            if home_score is not None and away_score is not None:
                match.home_score = int(home_score)
                match.away_score = int(away_score)
            match.save()

        updated_matches += 1

    return {"status": "ok", "week": espn_week_num, "matches_updated": updated_matches}

def sync_espn_lmx(date_str=None):
    """Sincroniza partidos de Liga MX desde ESPN."""
    league_lmx, league_nfl, tourn_lmx, tourn_nfl = get_or_create_structure()
    params = {}
    if date_str:
        params['dates'] = date_str

    try:
        resp = requests.get(ESPN_LMX_URL, params=params, timeout=10)
        if resp.status_code != 200:
            return {"error": f"ESPN returned status {resp.status_code}"}
        data = resp.json()
    except Exception as e:
        return {"error": str(e)}

    # Buscar o crear la jornada actual
    events = data.get('events', [])
    if not events:
        return {"status": "ok", "message": "No events found"}

    # Determinar jornada o usar la que viene
    week_num = 13
    week_obj, _ = MatchWeek.objects.get_or_create(
        tournament=tourn_lmx,
        week_number=week_num,
        defaults={"name": f"Jornada {week_num}"}
    )

    updated_matches = 0
    for event in events:
        espn_id = event.get('id')
        kickoff_raw = event.get('date')
        kickoff = parse_datetime(kickoff_raw) if kickoff_raw else timezone.now()
        
        status_type = event.get('status', {}).get('type', {}).get('name', 'STATUS_SCHEDULED')
        if 'FINAL' in status_type:
            status = 'FINAL'
        elif 'IN_PROGRESS' in status_type:
            status = 'IN_PROGRESS'
        else:
            status = 'SCHEDULED'

        competition = event.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])
        if len(competitors) < 2:
            continue

        home_comp = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
        away_comp = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

        home_form = format_form_string(home_comp.get('form', ''))
        away_form = format_form_string(away_comp.get('form', ''))

        home_team, _ = Team.objects.get_or_create(
            league=league_lmx,
            name=home_comp['team']['displayName'],
            defaults={
                "short_name": home_comp['team'].get('shortDisplayName', home_comp['team']['name']),
                "logo_url": home_comp['team'].get('logo', ''),
                "espn_id": home_comp['team'].get('id')
            }
        )
        away_team, _ = Team.objects.get_or_create(
            league=league_lmx,
            name=away_comp['team']['displayName'],
            defaults={
                "short_name": away_comp['team'].get('shortDisplayName', away_comp['team']['name']),
                "logo_url": away_comp['team'].get('logo', ''),
                "espn_id": away_comp['team'].get('id')
            }
        )

        match, _ = Match.objects.get_or_create(
            week=week_obj,
            home_team=home_team,
            away_team=away_team,
            defaults={
                "date_time": kickoff,
                "espn_id": espn_id,
                "home_form": home_form,
                "away_form": away_form
            }
        )
        match.date_time = kickoff
        match.espn_id = espn_id
        if home_form:
            match.home_form = home_form
        if away_form:
            match.away_form = away_form

        home_score = home_comp.get('score')
        away_score = away_comp.get('score')

        if status == 'FINAL' and home_score is not None and away_score is not None:
            match.update_result(int(home_score), int(away_score), status='FINAL')
        else:
            match.status = status
            if home_score is not None and away_score is not None:
                match.home_score = int(home_score)
                match.away_score = int(away_score)
            match.save()

        updated_matches += 1

    return {"status": "ok", "week": week_num, "matches_updated": updated_matches}
