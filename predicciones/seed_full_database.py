import os
import django
from datetime import datetime, date, time
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quinielas.settings')
django.setup()

from django.contrib.auth.models import User
from nfl_lmx.models import (
    Sport, League, Team, Tournament, MatchWeek, Match,
    Pool, PoolMembership, Prediction, UserProfile
)

def seed():
    print("Iniciando sembrado de datos reales...")

    # 1. Deportes
    soccer, _ = Sport.objects.get_or_create(name="Fútbol Soccer")
    football, _ = Sport.objects.get_or_create(name="Fútbol Americano")

    # 2. Ligas
    lmx, _ = League.objects.get_or_create(
        code="LMX",
        defaults={
            "name": "Liga BBVA MX",
            "sport": soccer,
            "logo_url": "https://a.espncdn.com/i/leaguelogos/soccer/500/mex.1.png"
        }
    )
    nfl, _ = League.objects.get_or_create(
        code="NFL",
        defaults={
            "name": "NFL",
            "sport": football,
            "logo_url": "https://a.espncdn.com/i/leaguelogos/nfl/500/scoreboard/nfl.png"
        }
    )

    # 3. Torneos 2026
    tourn_lmx, _ = Tournament.objects.get_or_create(
        league=lmx,
        name="Apertura 2026",
        defaults={"year": 2026, "is_active": True}
    )
    tourn_lmx.is_active = True
    tourn_lmx.save()

    tourn_nfl, _ = Tournament.objects.get_or_create(
        league=nfl,
        name="Temporada NFL 2026",
        defaults={"year": 2026, "is_active": True}
    )
    tourn_nfl.is_active = True
    tourn_nfl.save()

    # Eliminar torneos viejos o duplicados de 2024
    Tournament.objects.filter(year__lt=2026).delete()
    Tournament.objects.filter(name__icontains="2024").delete()

    # 4. Usuarios de la Familia WhatsApp "Pre NFL"
    family_members = [
        {"username": "patrick", "display_name": "Patrick", "color": "#6366F1"},
        {"username": "fabio", "display_name": "Fabio", "color": "#3B82F6"},
        {"username": "checo", "display_name": "Checo", "color": "#10B981"},
        {"username": "vanes", "display_name": "Vanes", "color": "#EC4899"},
        {"username": "kike", "display_name": "Kike", "color": "#8B5CF6"},
        {"username": "titi", "display_name": "Titi", "color": "#F43F5E"},
        {"username": "nene", "display_name": "Nene", "color": "#14B8A6"},
        {"username": "marco", "display_name": "Marco", "color": "#06B6D4"},
        {"username": "chule", "display_name": "Chule", "color": "#84CC16"},
        {"username": "pa", "display_name": "Pa", "color": "#A855F7"},
    ]

    users_map = {}
    for m in family_members:
        u, created = User.objects.get_or_create(username=m["username"])
        if created:
            u.set_password("1234")
            u.save()
        profile, _ = UserProfile.objects.get_or_create(
            user=u,
            defaults={"display_name": m["display_name"], "avatar_color": m["color"]}
        )
        profile.display_name = m["display_name"]
        profile.avatar_color = m["color"]
        profile.save()
        users_map[m["username"]] = u

    # Admin user
    admin_u, _ = User.objects.get_or_create(username="admin")
    admin_u.set_password("admin")
    admin_u.is_staff = True
    admin_u.is_superuser = True
    admin_u.save()
    UserProfile.objects.get_or_create(
        user=admin_u,
        defaults={"display_name": "Administrador", "avatar_color": "#4F46E5"}
    )

    # 5. Pools
    pool_lmx, _ = Pool.objects.get_or_create(
        invite_code="FAM-LMX",
        defaults={
            "name": "Quiniela Familia LMX",
            "tournament": tourn_lmx,
            "creator": users_map["patrick"]
        }
    )
    pool_lmx.tournament = tourn_lmx
    pool_lmx.save()

    pool_nfl, _ = Pool.objects.get_or_create(
        invite_code="FAM-NFL",
        defaults={
            "name": "Quiniela Familia NFL",
            "tournament": tourn_nfl,
            "creator": users_map["patrick"]
        }
    )
    pool_nfl.tournament = tourn_nfl
    pool_nfl.save()

    # Agregar a todos a ambos pools
    for u in users_map.values():
        PoolMembership.objects.get_or_create(pool=pool_lmx, user=u, defaults={"role": "MEMBER"})
        PoolMembership.objects.get_or_create(pool=pool_nfl, user=u, defaults={"role": "MEMBER"})

    # 6. Equipos Liga MX con escudos 100% oficiales y verificados de ESPN
    lmx_teams_data = [
        {"name": "Club América", "short_name": "América", "espn_id": "227", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/227.png"},
        {"name": "CD Guadalajara", "short_name": "Chivas", "espn_id": "219", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/219.png"},
        {"name": "Cruz Azul", "short_name": "Cruz Azul", "espn_id": "218", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/218.png"},
        {"name": "Pumas UNAM", "short_name": "Pumas", "espn_id": "233", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/233.png"},
        {"name": "Tigres UANL", "short_name": "Tigres", "espn_id": "232", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/232.png"},
        {"name": "CF Monterrey", "short_name": "Rayados", "espn_id": "220", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/220.png"},
        {"name": "Deportivo Toluca", "short_name": "Toluca", "espn_id": "223", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/223.png"},
        {"name": "Club León", "short_name": "León", "espn_id": "228", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/228.png"},
        {"name": "CF Pachuca", "short_name": "Pachuca", "espn_id": "234", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/234.png"},
        {"name": "Santos Laguna", "short_name": "Santos", "espn_id": "225", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/225.png"},
        {"name": "Atlas FC", "short_name": "Atlas", "espn_id": "216", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/216.png"},
        {"name": "Club Necaxa", "short_name": "Necaxa", "espn_id": "229", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/229.png"},
        {"name": "Club Puebla", "short_name": "Puebla", "espn_id": "231", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/231.png"},
        {"name": "Querétaro FC", "short_name": "Querétaro", "espn_id": "222", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/222.png"},
        {"name": "Club Tijuana", "short_name": "Tijuana", "espn_id": "10125", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/10125.png"},
        {"name": "Atlético de San Luis", "short_name": "San Luis", "espn_id": "15720", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/15720.png"},
        {"name": "FC Juárez", "short_name": "FC Juárez", "espn_id": "17851", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/17851.png"},
        {"name": "Atlante FC", "short_name": "Atlante", "espn_id": "226", "logo": "https://a.espncdn.com/i/teamlogos/soccer/500/226.png"},
    ]

    lmx_teams = {}
    for td in lmx_teams_data:
        t = Team.objects.filter(league=lmx, short_name__iexact=td["short_name"]).first()
        if not t:
            t = Team.objects.filter(league=lmx, name__icontains=td["short_name"]).first()
        if not t:
            t = Team.objects.create(league=lmx, name=td["name"], short_name=td["short_name"], logo_url=td["logo"], espn_id=td["espn_id"])
        else:
            t.name = td["name"]
            t.short_name = td["short_name"]
            t.logo_url = td["logo"]
            t.espn_id = td["espn_id"]
            t.save()
        lmx_teams[td["short_name"]] = t

    # 7. Equipos NFL
    nfl_teams_data = [
        {"name": "New England Patriots", "short_name": "Patriots", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png", "espn_id": "17"},
        {"name": "Chicago Bears", "short_name": "Bears", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png", "espn_id": "3"},
        {"name": "Pittsburgh Steelers", "short_name": "Steelers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png", "espn_id": "23"},
        {"name": "New Orleans Saints", "short_name": "Saints", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/no.png", "espn_id": "18"},
        {"name": "San Francisco 49ers", "short_name": "49ers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png", "espn_id": "25"},
        {"name": "Atlanta Falcons", "short_name": "Falcons", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png", "espn_id": "1"},
        {"name": "Cincinnati Bengals", "short_name": "Bengals", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png", "espn_id": "4"},
        {"name": "Baltimore Ravens", "short_name": "Ravens", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png", "espn_id": "33"},
        {"name": "Tampa Bay Buccaneers", "short_name": "Buccaneers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png", "espn_id": "27"},
        {"name": "Carolina Panthers", "short_name": "Panthers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/car.png", "espn_id": "29"},
        {"name": "New York Giants", "short_name": "Giants", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png", "espn_id": "19"},
        {"name": "Houston Texans", "short_name": "Texans", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png", "espn_id": "34"},
        {"name": "Indianapolis Colts", "short_name": "Colts", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png", "espn_id": "11"},
        {"name": "Minnesota Vikings", "short_name": "Vikings", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/min.png", "espn_id": "16"},
        {"name": "Miami Dolphins", "short_name": "Dolphins", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png", "espn_id": "15"},
        {"name": "New York Jets", "short_name": "Jets", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png", "espn_id": "20"},
        {"name": "Cleveland Browns", "short_name": "Browns", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png", "espn_id": "5"},
        {"name": "Tennessee Titans", "short_name": "Titans", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png", "espn_id": "10"},
        {"name": "Denver Broncos", "short_name": "Broncos", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/den.png", "espn_id": "7"},
        {"name": "Arizona Cardinals", "short_name": "Cardinals", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png", "espn_id": "22"},
        {"name": "Green Bay Packers", "short_name": "Packers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png", "espn_id": "9"},
        {"name": "Detroit Lions", "short_name": "Lions", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png", "espn_id": "8"},
        {"name": "Los Angeles Rams", "short_name": "Rams", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png", "espn_id": "14"},
        {"name": "Las Vegas Raiders", "short_name": "Raiders", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png", "espn_id": "13"},
        {"name": "Kansas City Chiefs", "short_name": "Chiefs", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", "espn_id": "12"},
        {"name": "Seattle Seahawks", "short_name": "Seahawks", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png", "espn_id": "26"},
        {"name": "Dallas Cowboys", "short_name": "Cowboys", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png", "espn_id": "6"},
        {"name": "Philadelphia Eagles", "short_name": "Eagles", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", "espn_id": "21"},
        {"name": "Buffalo Bills", "short_name": "Bills", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png", "espn_id": "2"},
        {"name": "Jacksonville Jaguars", "short_name": "Jaguars", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png", "espn_id": "30"},
        {"name": "Los Angeles Chargers", "short_name": "Chargers", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png", "espn_id": "24"},
        {"name": "Washington Commanders", "short_name": "Commanders", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png", "espn_id": "28"},
    ]

    nfl_teams = {}
    for td in nfl_teams_data:
        t = Team.objects.filter(league=nfl, short_name__iexact=td["short_name"]).first()
        if not t:
            t = Team.objects.filter(league=nfl, name__icontains=td["short_name"]).first()
        if not t:
            t = Team.objects.create(league=nfl, name=td["name"], short_name=td["short_name"], logo_url=td["logo"], espn_id=td["espn_id"])
        else:
            t.name = td["name"]
            t.short_name = td["short_name"]
            t.logo_url = td["logo"]
            t.espn_id = td["espn_id"]
            t.save()
        nfl_teams[td["short_name"]] = t

    # 8. Liga MX Semanas (Jornadas 1 a 17)
    lmx_weeks = {}
    for j in range(1, 18):
        is_closed = (j <= 13)
        w, _ = MatchWeek.objects.get_or_create(
            tournament=tourn_lmx,
            week_number=j,
            defaults={"name": f"Jornada {j}", "is_closed": is_closed}
        )
        w.is_closed = is_closed
        w.save()
        lmx_weeks[j] = w

    lmx_w13 = lmx_weeks[13]
    lmx_w14 = lmx_weeks[14]

    # Partidos exactos de JORNADA 13 (Martes 20 y Miércoles 21 de Octubre 2026)
    lmx_j13_matches_spec = [
        {"home": "Chivas", "away": "Necaxa", "dt": "2026-10-20 18:07:00", "hs": 1, "as": 0, "status": "FINAL", "winner": "HOME"},
        {"home": "San Luis", "away": "Querétaro", "dt": "2026-10-20 19:00:00", "hs": 2, "as": 1, "status": "FINAL", "winner": "HOME"},
        {"home": "FC Juárez", "away": "Atlante", "dt": "2026-10-20 19:00:00", "hs": 0, "as": 1, "status": "FINAL", "winner": "AWAY"},
        {"home": "Tigres", "away": "León", "dt": "2026-10-20 21:06:00", "hs": 0, "as": 2, "status": "FINAL", "winner": "AWAY"},
        {"home": "Puebla", "away": "Rayados", "dt": "2026-10-21 19:00:00", "hs": 1, "as": 4, "status": "FINAL", "winner": "AWAY"},
        {"home": "Atlas", "away": "América", "dt": "2026-10-21 19:00:00", "hs": 2, "as": 5, "status": "FINAL", "winner": "AWAY"},
        {"home": "Toluca", "away": "Tijuana", "dt": "2026-10-21 19:00:00", "hs": 2, "as": 2, "status": "FINAL", "winner": "DRAW"},
        {"home": "Pachuca", "away": "Cruz Azul", "dt": "2026-10-21 21:00:00", "hs": 1, "as": 2, "status": "FINAL", "winner": "AWAY"},
        {"home": "Santos", "away": "Pumas", "dt": "2026-10-21 21:06:00", "hs": 2, "as": 0, "status": "FINAL", "winner": "HOME"},
    ]

    lmx_w13.matches.all().delete()
    j13_created_matches = []
    for sp in lmx_j13_matches_spec:
        ht = lmx_teams[sp["home"]]
        at = lmx_teams[sp["away"]]
        dt = timezone.make_aware(datetime.strptime(sp["dt"], "%Y-%m-%d %H:%M:%S"))
        m = Match.objects.create(
            week=lmx_w13,
            home_team=ht,
            away_team=at,
            date_time=dt,
            home_score=sp["hs"],
            away_score=sp["as"],
            status=sp["status"],
            winner=sp["winner"]
        )
        j13_created_matches.append(m)

    # Predicciones de Jornada 13 para la familia (Coincidiendo al 100% con los aciertos de WhatsApp!)
    # Patrick: 5 hits -> CHI (HOME), LEO (AWAY), Rayados (AWAY), Cruz Azul (AWAY), Santos (HOME)
    patrick_picks = {
        0: "HOME", # Chivas (Hit)
        1: "DRAW", # Empate (Miss, ganó San Luis)
        2: "HOME", # Juárez (Miss, ganó Atlante)
        3: "AWAY", # León (Hit)
        4: "AWAY", # Rayados (Hit)
        5: "HOME", # Atlas (Miss, ganó América)
        6: "HOME", # Toluca (Miss, fue Empate)
        7: "AWAY", # Cruz Azul (Hit)
        8: "HOME", # Santos (Hit)
    }
    for idx, pick in patrick_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(
            pool=pool_lmx,
            user=users_map["patrick"],
            match=m,
            defaults={"pick": pick, "is_correct": (pick == m.winner)}
        )

    # Fabio: 4 aciertos
    fabio_picks = {0: "HOME", 1: "HOME", 2: "HOME", 3: "AWAY", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "HOME", 8: "AWAY"}
    for idx, pick in fabio_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["fabio"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Checo: 4 aciertos
    checo_picks = {0: "HOME", 1: "HOME", 2: "HOME", 3: "HOME", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in checo_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["checo"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Vanes: 4 aciertos
    vanes_picks = {0: "HOME", 1: "AWAY", 2: "HOME", 3: "AWAY", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in vanes_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["vanes"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Chule: 4 aciertos
    chule_picks = {0: "HOME", 1: "HOME", 2: "HOME", 3: "HOME", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in chule_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["chule"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Kike: 3 aciertos
    kike_picks = {0: "HOME", 1: "AWAY", 2: "HOME", 3: "HOME", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in kike_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["kike"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Titi: 3 aciertos
    titi_picks = {0: "HOME", 1: "AWAY", 2: "HOME", 3: "AWAY", 4: "HOME", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in titi_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["titi"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Pa: 3 aciertos
    pa_picks = {0: "HOME", 1: "HOME", 2: "HOME", 3: "HOME", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "HOME", 8: "AWAY"}
    for idx, pick in pa_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["pa"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Nene: 2 aciertos
    nene_picks = {0: "HOME", 1: "AWAY", 2: "HOME", 3: "HOME", 4: "HOME", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in nene_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["nene"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Marco: 2 aciertos
    marco_picks = {0: "DRAW", 1: "AWAY", 2: "HOME", 3: "HOME", 4: "AWAY", 5: "HOME", 6: "HOME", 7: "AWAY", 8: "AWAY"}
    for idx, pick in marco_picks.items():
        m = j13_created_matches[idx]
        Prediction.objects.update_or_create(pool=pool_lmx, user=users_map["marco"], match=m, defaults={"pick": pick, "is_correct": (pick == m.winner)})

    # Partidos de JORNADA 14 (Viernes 23 a Domingo 25 de Octubre 2026) -> ABIERTOS / SCHEDULED
    lmx_j14_matches_spec = [
        {"home": "Necaxa", "away": "FC Juárez", "dt": "2026-10-23 19:00:00", "hf": "D-D-E-D-D", "af": "V-D-E-D-D"},
        {"home": "Atlante", "away": "San Luis", "dt": "2026-10-23 21:00:00", "hf": "E-V-D-D-V", "af": "V-V-D-E-V"},
        {"home": "León", "away": "Toluca", "dt": "2026-10-24 17:00:00", "hf": "E-V-E-D-V", "af": "D-E-D-E-E"},
        {"home": "Rayados", "away": "Chivas", "dt": "2026-10-24 19:00:00", "hf": "V-D-E-V-V", "af": "E-D-E-E-V"},
        {"home": "Pumas", "away": "Tigres", "dt": "2026-10-24 21:10:00", "hf": "E-D-E-V-D", "af": "D-V-V-E-D"},
        {"home": "Atlas", "away": "Puebla", "dt": "2026-10-25 17:00:00", "hf": "E-V-E-V-D", "af": "E-D-E-E-D"},
        {"home": "Querétaro", "away": "Cruz Azul", "dt": "2026-10-25 19:00:00", "hf": "E-V-V-D-D", "af": "D-E-E-V-V"},
        {"home": "América", "away": "Pachuca", "dt": "2026-10-25 19:05:00", "hf": "E-V-E-V-V", "af": "E-D-E-D-D"},
        {"home": "Tijuana", "away": "Santos", "dt": "2026-10-25 21:10:00", "hf": "E-D-E-E-E", "af": "V-V-V-V-V"},
    ]

    lmx_w14.matches.all().delete()
    for sp in lmx_j14_matches_spec:
        ht = lmx_teams[sp["home"]]
        at = lmx_teams[sp["away"]]
        dt = timezone.make_aware(datetime.strptime(sp["dt"], "%Y-%m-%d %H:%M:%S"))
        Match.objects.create(
            week=lmx_w14,
            home_team=ht,
            away_team=at,
            date_time=dt,
            status="SCHEDULED",
            home_score=None,
            away_score=None,
            winner=None,
            home_form=sp.get("hf", ""),
            away_form=sp.get("af", "")
        )

    # 9. NFL Semanas (Semanas 1 a 18)
    nfl_weeks = {}
    for s in range(1, 19):
        is_closed = (s <= 6)
        w, _ = MatchWeek.objects.get_or_create(
            tournament=tourn_nfl,
            week_number=s,
            defaults={"name": f"Semana {s}", "is_closed": is_closed}
        )
        w.is_closed = is_closed
        w.save()
        nfl_weeks[s] = w

    nfl_w7 = nfl_weeks[7]

    # Partidos exactos de SEMANA 7 NFL (Kalshi / Primero y Diez)
    nfl_w7_spec = [
        # Partido 1: TNF Jueves 22 Octubre (ÚNICO FINALIZADO)
        {"home": "Patriots", "away": "Bears", "dt": "2026-10-22 18:15:00", "hs": 24, "as": 30, "status": "FINAL", "winner": "AWAY"},
        # Partidos 2 a 14: PROGRAMADOS PARA DOMINGO 25 Y LUNES 26
        {"home": "Steelers", "away": "Saints", "dt": "2026-10-25 07:30:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "49ers", "away": "Falcons", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Bengals", "away": "Ravens", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Buccaneers", "away": "Panthers", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Giants", "away": "Texans", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Colts", "away": "Vikings", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Dolphins", "away": "Jets", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Browns", "away": "Titans", "dt": "2026-10-25 11:00:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Broncos", "away": "Cardinals", "dt": "2026-10-25 14:05:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Packers", "away": "Lions", "dt": "2026-10-25 14:25:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        {"home": "Rams", "away": "Raiders", "dt": "2026-10-25 14:25:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        # SNF
        {"home": "Chiefs", "away": "Seahawks", "dt": "2026-10-25 18:20:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
        # MNF
        {"home": "Cowboys", "away": "Eagles", "dt": "2026-10-26 18:15:00", "hs": None, "as": None, "status": "SCHEDULED", "winner": None},
    ]

    nfl_w7.matches.all().delete()
    w7_created_matches = []
    for sp in nfl_w7_spec:
        ht = nfl_teams[sp["home"]]
        at = nfl_teams[sp["away"]]
        dt = timezone.make_aware(datetime.strptime(sp["dt"], "%Y-%m-%d %H:%M:%S"))
        m = Match.objects.create(
            week=nfl_w7,
            home_team=ht,
            away_team=at,
            date_time=dt,
            home_score=sp["hs"],
            away_score=sp["as"],
            status=sp["status"],
            winner=sp["winner"]
        )
        w7_created_matches.append(m)

    # Pick de Patrick en el partido 1 (TNF: Bears): ¡Acierto (+1)!
    tnf_match = w7_created_matches[0]
    Prediction.objects.update_or_create(
        pool=pool_nfl,
        user=users_map["patrick"],
        match=tnf_match,
        defaults={"pick": "AWAY", "is_correct": True}
    )
    Prediction.objects.update_or_create(pool=pool_nfl, user=users_map["chule"], match=tnf_match, defaults={"pick": "HOME", "is_correct": False})
    Prediction.objects.update_or_create(pool=pool_nfl, user=users_map["fabio"], match=tnf_match, defaults={"pick": "AWAY", "is_correct": True})
    Prediction.objects.update_or_create(pool=pool_nfl, user=users_map["checo"], match=tnf_match, defaults={"pick": "AWAY", "is_correct": True})

    print("¡Sembrado completado con éxito!")
    print(f"- LMX: {lmx_w13.name} ({lmx_w13.matches.count()} partidos finalizados) y {lmx_w14.name} ({lmx_w14.matches.count()} partidos programados)")
    print(f"- NFL: {nfl_w7.name} (1 partido finalizado y 13 programados)")

if __name__ == '__main__':
    from nfl_lmx.services.db_repair import repair_and_sync_all
    from nfl_lmx.services.sync_queue import enqueue_sync_job
    # En build/deploy ejecuta el aseguramiento idempotente rápido y encola la sincronización de calendario en 2do plano
    res = repair_and_sync_all(sync_remote=False)
    enqueue_sync_job('SYNC_UPCOMING_CALENDAR', league_code='ALL', cooldown_seconds=0, priority=10, force=True)
    print("Seed & Repair resultado:", res)
