from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import Sport, League, Team, Tournament, MatchWeek, Match, Pool, PoolMembership, Prediction, UserProfile
from .services.espn_sync import find_or_create_match, get_or_create_nfl_team, get_or_create_lmx_team, format_form_string
from .views import calculate_standings_with_medals

class QuinielaCoreTests(TestCase):
    def setUp(self):
        self.sport = Sport.objects.create(name="Fútbol")
        self.league = League.objects.create(code="NFL", name="NFL", sport=self.sport)
        self.tournament = Tournament.objects.create(name="NFL 2026", league=self.league, year=2026)
        self.week = MatchWeek.objects.create(tournament=self.tournament, week_number=1, name="Semana 1")

        self.team_a = Team.objects.create(name="Chicago Bears", short_name="Bears", league=self.league, espn_id="3")
        self.team_b = Team.objects.create(name="Green Bay Packers", short_name="Packers", league=self.league, espn_id="9")

        self.match = Match.objects.create(
            week=self.week,
            home_team=self.team_a,
            away_team=self.team_b,
            date_time=timezone.now() + timedelta(days=2),
            status='SCHEDULED'
        )

        self.user1 = User.objects.create_user(username="chule", password="123")
        self.user2 = User.objects.create_user(username="patrick", password="123")
        UserProfile.objects.create(user=self.user1, display_name="Chule")
        UserProfile.objects.create(user=self.user2, display_name="Patrick")

        self.pool = Pool.objects.create(name="Test Pool", invite_code="TEST1", tournament=self.tournament)
        self.mem1 = PoolMembership.objects.create(pool=self.pool, user=self.user1)
        self.mem2 = PoolMembership.objects.create(pool=self.pool, user=self.user2)

    def test_update_result_bulk_recalculation(self):
        """Verifica que update_result actualiza el ganador y las predicciones en una sola operación."""
        p1 = Prediction.objects.create(pool=self.pool, user=self.user1, match=self.match, pick='HOME')
        p2 = Prediction.objects.create(pool=self.pool, user=self.user2, match=self.match, pick='AWAY')

        self.match.update_result(24, 17, status='FINAL')

        self.assertEqual(self.match.winner, 'HOME')
        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertTrue(p1.is_correct)
        self.assertFalse(p2.is_correct)

    def test_calculate_standings_aggregation(self):
        """Verifica que calculate_standings_with_medals calcula puntos y medallas sin N+1."""
        p1 = Prediction.objects.create(pool=self.pool, user=self.user1, match=self.match, pick='HOME')
        p2 = Prediction.objects.create(pool=self.pool, user=self.user2, match=self.match, pick='AWAY')
        self.match.update_result(21, 14, status='FINAL')

        memberships = self.pool.memberships.select_related('user__profile').all()
        standings = calculate_standings_with_medals(self.pool, memberships, week_id=self.week.id)

        self.assertEqual(len(standings), 2)
        top = standings[0]
        self.assertEqual(top['username'], 'chule')
        self.assertEqual(top['weekly_hits'], 1)
        self.assertEqual(top['general_medal'], 'gold')

    def test_find_or_create_match_inverted_orientation(self):
        """Verifica que cuando un partido viene con local/visita invertido de ESPN se detecta sin duplicar."""
        kickoff = timezone.now() + timedelta(days=1)
        # Intentar buscar el partido pero pasando team_b como local y team_a como visita
        matched, is_existing = find_or_create_match(self.week, self.team_b, self.team_a, "9999", kickoff)

        self.assertTrue(is_existing)
        self.assertEqual(matched.id, self.match.id)
        self.assertEqual(matched.espn_id, "9999")
        self.assertEqual(Match.objects.filter(week=self.week).count(), 1)

    def test_match_lockout_property(self):
        """Verifica que un partido en el pasado o FINAL esté bloqueado para pronosticar."""
        future_match = Match.objects.create(
            week=self.week,
            home_team=self.team_a,
            away_team=self.team_b,
            date_time=timezone.now() + timedelta(hours=2),
            status='SCHEDULED'
        )
        self.assertFalse(future_match.is_locked)

        past_match = Match.objects.create(
            week=self.week,
            home_team=self.team_a,
            away_team=self.team_b,
            date_time=timezone.now() - timedelta(minutes=10),
            status='SCHEDULED'
        )
        self.assertTrue(past_match.is_locked)

    def test_format_form_string_and_mapping(self):
        """Verifica la conversión de strings de victorias/empates/derrotas al formato visual con guiones."""
        self.assertEqual(format_form_string("WLDWW"), "V-D-E-V-V")
        self.assertEqual(format_form_string("VDEVD"), "V-D-E-V-D")
        self.assertEqual(format_form_string(""), "")
