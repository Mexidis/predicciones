import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from nfl_lmx.models import (
    Sport, League, Team, Tournament, MatchWeek, Match, Pool, PoolMembership, Prediction, UserProfile
)
from nfl_lmx.services.espn_sync import get_or_create_structure

class Command(BaseCommand):
    help = 'Puebla la base de datos con los torneos, partidos y participantes de la familia'

    def handle(self, *args, **options):
        self.stdout.write("Creando estructura base...")
        league_lmx, league_nfl, tourn_lmx, tourn_nfl = get_or_create_structure()

        # 1. Crear integrantes de la familia
        members_data = [
            {"username": "chule", "name": "Chule", "color": "#3B82F6", "is_admin": True},
            {"username": "patrick", "name": "Patrick", "color": "#10B981", "is_admin": False},
            {"username": "checo", "name": "Checo", "color": "#F59E0B", "is_admin": False},
            {"username": "vanes", "name": "Vanes", "color": "#EC4899", "is_admin": False},
            {"username": "fabio", "name": "Fabio", "color": "#8B5CF6", "is_admin": False},
            {"username": "kike", "name": "Kike", "color": "#06B6D4", "is_admin": False},
            {"username": "titi", "name": "Titi", "color": "#F97316", "is_admin": False},
            {"username": "nene", "name": "Nene", "color": "#6366F1", "is_admin": False},
            {"username": "marco", "name": "Marco", "color": "#14B8A6", "is_admin": False},
            {"username": "papa", "name": "Papá", "color": "#EF4444", "is_admin": False},
        ]

        users = {}
        for m in members_data:
            user, created = User.objects.get_or_create(
                username=m["username"],
                defaults={"first_name": m["name"], "email": f"{m['username']}@familia.com"}
            )
            if created or not user.has_usable_password():
                user.set_password("1234")
                user.save()
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={"display_name": m["name"], "avatar_color": m["color"]}
            )
            users[m["username"]] = user

        # 2. Crear las dos Pools (NFL y Liga MX)
        pool_nfl, _ = Pool.objects.get_or_create(
            invite_code="NFL-FAMILIA",
            defaults={
                "name": "Pre NFL Familiar 🏈",
                "tournament": tourn_nfl,
                "creator": users["chule"]
            }
        )

        pool_lmx, _ = Pool.objects.get_or_create(
            invite_code="LMX-FAMILIA",
            defaults={
                "name": "Quiniela Liga MX Familiar ⚽",
                "tournament": tourn_lmx,
                "creator": users["chule"]
            }
        )

        # Unir a todos a ambos pools
        for u in users.values():
            PoolMembership.objects.get_or_create(
                pool=pool_nfl,
                user=u,
                defaults={"role": "ADMIN" if u.username == "chule" else "MEMBER"}
            )
            PoolMembership.objects.get_or_create(
                pool=pool_lmx,
                user=u,
                defaults={"role": "ADMIN" if u.username == "chule" else "MEMBER"}
            )

        # 3. Partidos de LIGA MX (Jornada 13 - idéntica a la imagen del chat)
        week_lmx, _ = MatchWeek.objects.get_or_create(
            tournament=tourn_lmx,
            week_number=13,
            defaults={"name": "Jornada 13", "is_closed": False}
        )

        lmx_teams_data = [
            ("Chivas", "CHI", "https://a.espncdn.com/i/teamlogos/soccer/500/217.png", "V-V-D-E-V"),
            ("Necaxa", "NEC", "https://a.espncdn.com/i/teamlogos/soccer/500/229.png", "D-E-D-D-E"),
            ("San Luis", "ASL", "https://a.espncdn.com/i/teamlogos/soccer/500/17709.png", "V-D-V-V-D"),
            ("Querétaro", "QRO", "https://a.espncdn.com/i/teamlogos/soccer/500/228.png", "D-D-E-D-V"),
            ("FC Juárez", "JUA", "https://a.espncdn.com/i/teamlogos/soccer/500/17851.png", "V-D-V-D-D"),
            ("Atlante", "ATL", "https://a.espncdn.com/i/teamlogos/soccer/500/215.png", "E-V-D-E-V"),
            ("Tigres", "TIG", "https://a.espncdn.com/i/teamlogos/soccer/500/232.png", "V-V-E-V-D"),
            ("León", "LEO", "https://a.espncdn.com/i/teamlogos/soccer/500/224.png", "E-E-V-D-E"),
            ("Puebla", "PUE", "https://a.espncdn.com/i/teamlogos/soccer/500/227.png", "D-D-D-D-V"),
            ("Monterrey", "MTY", "https://a.espncdn.com/i/teamlogos/soccer/500/225.png", "V-E-V-V-E"),
            ("Atlas", "ATS", "https://a.espncdn.com/i/teamlogos/soccer/500/216.png", "E-D-D-V-D"),
            ("América", "AME", "https://a.espncdn.com/i/teamlogos/soccer/500/214.png", "V-V-E-V-V"),
            ("Toluca", "TOL", "https://a.espncdn.com/i/teamlogos/soccer/500/233.png", "V-V-V-E-V"),
            ("Tijuana", "TIJ", "https://a.espncdn.com/i/teamlogos/soccer/500/7724.png", "D-V-E-V-D"),
            ("Pachuca", "PAC", "https://a.espncdn.com/i/teamlogos/soccer/500/226.png", "D-E-D-V-D"),
            ("Cruz Azul", "CAZ", "https://a.espncdn.com/i/teamlogos/soccer/500/218.png", "V-V-V-V-V"),
            ("Santos", "SAN", "https://a.espncdn.com/i/teamlogos/soccer/500/230.png", "D-D-D-E-D"),
            ("Pumas", "PUM", "https://a.espncdn.com/i/teamlogos/soccer/500/223.png", "V-E-V-D-E"),
        ]

        lmx_teams = {}
        for name, short, logo, form in lmx_teams_data:
            t, _ = Team.objects.get_or_create(
                league=league_lmx,
                name=name,
                defaults={"short_name": short, "logo_url": logo}
            )
            lmx_teams[name] = (t, form)

        # Partidos Jornada 13 (Martes y Miércoles)
        lmx_matches_data = [
            ("Chivas", "Necaxa", "2026-10-20 18:07:00", 3, 2, "HOME"),
            ("San Luis", "Querétaro", "2026-10-20 19:00:00", 4, 0, "HOME"),
            ("FC Juárez", "Atlante", "2026-10-20 19:00:00", 2, 1, "HOME"),
            ("Tigres", "León", "2026-10-20 21:06:00", 1, 1, "DRAW"),
            ("Puebla", "Monterrey", "2026-10-21 19:00:00", 1, 2, "AWAY"),
            ("Atlas", "América", "2026-10-21 19:00:00", 1, 5, "AWAY"),
            ("Toluca", "Tijuana", "2026-10-21 19:00:00", 4, 0, "HOME"),
            ("Pachuca", "Cruz Azul", "2026-10-21 21:00:00", 2, 4, "AWAY"),
            ("Santos", "Pumas", "2026-10-21 21:06:00", 1, 1, "DRAW"),
        ]

        lmx_matches = []
        for h_name, a_name, dt_str, h_sc, a_sc, win in lmx_matches_data:
            h_team, h_form = lmx_teams[h_name]
            a_team, a_form = lmx_teams[a_name]
            dt = datetime.datetime.fromisoformat(dt_str)
            dt = timezone.make_aware(dt) if timezone.is_naive(dt) else dt
            
            match, _ = Match.objects.get_or_create(
                week=week_lmx,
                home_team=h_team,
                away_team=a_team,
                defaults={
                    "date_time": dt,
                    "status": "FINAL",
                    "home_score": h_sc,
                    "away_score": a_sc,
                    "winner": win,
                    "home_form": h_form,
                    "away_form": a_form
                }
            )
            match.update_result(h_sc, a_sc, status="FINAL")
            lmx_matches.append(match)

        # 4. Asignar los puntos exactos que se leyeron en el chat de WhatsApp:
        # "Resultados J13 liga MX: Patrick...5, Fabio, Checo y yo...4, Kike y Titi...3, Nene v Marco...2"
        lmx_scores_target = {
            "patrick": 5,
            "fabio": 4,
            "checo": 4,
            "vanes": 4,
            "chule": 4,
            "kike": 3,
            "titi": 3,
            "nene": 2,
            "marco": 2,
            "papa": 3,
        }

        for username, target_hits in lmx_scores_target.items():
            user = users[username]
            for idx, match in enumerate(lmx_matches):
                # Si idx < target_hits, le damos acierto; si no, pick equivocado
                if idx < target_hits:
                    user_pick = match.winner
                else:
                    # Pick distinto al ganador
                    user_pick = "AWAY" if match.winner == "HOME" else "HOME"

                pred, _ = Prediction.objects.get_or_create(
                    pool=pool_lmx,
                    user=user,
                    match=match,
                    defaults={"pick": user_pick, "is_correct": (user_pick == match.winner)}
                )
                pred.pick = user_pick
                pred.is_correct = (user_pick == match.winner)
                pred.save()

        # 5. Partidos de NFL (Semana 7 - igual que en la imagen de Kalshi)
        week_nfl, _ = MatchWeek.objects.get_or_create(
            tournament=tourn_nfl,
            week_number=7,
            defaults={"name": "Semana 7", "is_closed": False}
        )

        nfl_teams_data = [
            ("Patriots", "NE", "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png", "2-4"),
            ("Bears", "CHI", "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png", "4-2"),
            ("Steelers", "PIT", "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png", "5-2"),
            ("Saints", "NO", "https://a.espncdn.com/i/teamlogos/nfl/500/no.png", "2-5"),
            ("49ers", "SF", "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png", "4-3"),
            ("Falcons", "ATL", "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png", "4-3"),
            ("Bengals", "CIN", "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png", "3-4"),
            ("Ravens", "BAL", "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png", "5-2"),
            ("Buccaneers", "TB", "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png", "4-3"),
            ("Panthers", "CAR", "https://a.espncdn.com/i/teamlogos/nfl/500/car.png", "1-6"),
            ("Giants", "NYG", "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png", "2-5"),
            ("Seahawks", "SEA", "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png", "4-3"),
            ("Colts", "IND", "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png", "4-3"),
            ("Vikings", "MIN", "https://a.espncdn.com/i/teamlogos/nfl/500/min.png", "5-1"),
            ("Dolphins", "MIA", "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png", "2-4"),
            ("Jets", "NYJ", "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png", "2-5"),
            ("Browns", "CLE", "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png", "1-6"),
            ("Titans", "TEN", "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png", "1-5"),
            ("Broncos", "DEN", "https://a.espncdn.com/i/teamlogos/nfl/500/den.png", "4-3"),
            ("Cardinals", "ARI", "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png", "3-4"),
            ("Packers", "GB", "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png", "5-2"),
            ("Lions", "DET", "https://a.espncdn.com/i/teamlogos/nfl/500/det.png", "5-1"),
            ("Rams", "LAR", "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png", "2-4"),
            ("Raiders", "LV", "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png", "2-5"),
            ("Chiefs", "KC", "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", "6-0"),
            ("Cowboys", "DAL", "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png", "3-3"),
            ("Eagles", "PHI", "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", "4-2"),
        ]

        nfl_teams = {}
        for name, short, logo, form in nfl_teams_data:
            t, _ = Team.objects.get_or_create(
                league=league_nfl,
                name=name,
                defaults={"short_name": short, "logo_url": logo}
            )
            nfl_teams[name] = (t, form)

        nfl_matches_data = [
            ("Bears", "Patriots", "2026-10-22 18:15:00", 30, 24, "HOME"),
            ("Saints", "Steelers", "2026-10-25 07:30:00", 17, 27, "AWAY"),
            ("Falcons", "49ers", "2026-10-25 11:00:00", 20, 28, "AWAY"),
            ("Ravens", "Bengals", "2026-10-25 11:00:00", 35, 31, "HOME"),
            ("Panthers", "Buccaneers", "2026-10-25 11:00:00", 13, 24, "AWAY"),
            ("Seahawks", "Giants", "2026-10-25 11:00:00", 23, 17, "HOME"),
            ("Vikings", "Colts", "2026-10-25 11:00:00", 31, 21, "HOME"),
            ("Jets", "Dolphins", "2026-10-25 11:00:00", 20, 14, "HOME"),
            ("Titans", "Browns", "2026-10-25 11:00:00", 10, 16, "AWAY"),
            ("Cardinals", "Broncos", "2026-10-25 14:05:00", 18, 33, "AWAY"),
            ("Lions", "Packers", "2026-10-25 14:25:00", 28, 24, "HOME"),
            ("Raiders", "Rams", "2026-10-25 14:25:00", 15, 20, "AWAY"),
            ("Chiefs", "49ers", "2026-10-25 18:20:00", 28, 18, "HOME"),
            ("Eagles", "Cowboys", "2026-10-26 18:15:00", 24, 21, "HOME"),
        ]

        nfl_matches = []
        for h_name, a_name, dt_str, h_sc, a_sc, win in nfl_matches_data:
            h_team, h_form = nfl_teams[h_name]
            a_team, a_form = nfl_teams[a_name]
            dt = datetime.datetime.fromisoformat(dt_str)
            dt = timezone.make_aware(dt) if timezone.is_naive(dt) else dt

            match, _ = Match.objects.get_or_create(
                week=week_nfl,
                home_team=h_team,
                away_team=a_team,
                defaults={
                    "date_time": dt,
                    "status": "FINAL",
                    "home_score": h_sc,
                    "away_score": a_sc,
                    "winner": win,
                    "home_form": h_form,
                    "away_form": a_form
                }
            )
            match.update_result(h_sc, a_sc, status="FINAL")
            nfl_matches.append(match)

        # Picks NFL de Chule (los verdes marcados en la imagen!)
        chule_picks = ["HOME", "AWAY", "AWAY", "AWAY", "AWAY", "HOME", "HOME", "HOME", "AWAY", "AWAY", "HOME", "HOME", "HOME", "HOME"]
        for idx, match in enumerate(nfl_matches):
            p = chule_picks[idx]
            Prediction.objects.update_or_create(
                pool=pool_nfl,
                user=users["chule"],
                match=match,
                defaults={"pick": p, "is_correct": (p == match.winner)}
            )

        # Generar picks para otros integrantes en NFL con variaciones
        for username in ["patrick", "checo", "vanes", "fabio", "kike", "titi", "papa"]:
            u = users[username]
            for idx, match in enumerate(nfl_matches):
                # Generamos una variación realista
                pick = match.winner if (idx + len(username)) % 3 != 0 else ("AWAY" if match.winner == "HOME" else "HOME")
                Prediction.objects.update_or_create(
                    pool=pool_nfl,
                    user=u,
                    match=match,
                    defaults={"pick": pick, "is_correct": (pick == match.winner)}
                )

        self.stdout.write(self.style.SUCCESS("¡Datos iniciales de la familia cargados con éxito!"))
