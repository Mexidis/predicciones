from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Sport, League, Team, Tournament, MatchWeek, Match, Pool, PoolMembership, Prediction, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['display_name', 'avatar_color', 'phone']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'profile']

    def get_display_name(self, obj):
        if hasattr(obj, 'profile') and obj.profile.display_name:
            return obj.profile.display_name
        return obj.first_name or obj.username

class LeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = ['id', 'code', 'name', 'logo_url']

class TournamentSerializer(serializers.ModelSerializer):
    league = LeagueSerializer(read_only=True)

    class Meta:
        model = Tournament
        fields = ['id', 'name', 'league', 'year', 'is_active']

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'short_name', 'logo_url', 'espn_id']

class MatchWeekSerializer(serializers.ModelSerializer):
    matches_count = serializers.IntegerField(default=0, read_only=True)
    final_matches_count = serializers.IntegerField(default=0, read_only=True)
    live_matches_count = serializers.IntegerField(default=0, read_only=True)
    scheduled_matches_count = serializers.IntegerField(default=0, read_only=True)
    league_code = serializers.SerializerMethodField()
    week_state = serializers.SerializerMethodField()

    class Meta:
        model = MatchWeek
        fields = [
            'id', 'tournament', 'league_code', 'week_number', 'name',
            'start_date', 'end_date', 'is_closed', 'matches_count',
            'final_matches_count', 'live_matches_count', 'scheduled_matches_count',
            'week_state'
        ]

    def get_league_code(self, obj):
        try:
            if obj.tournament and obj.tournament.league:
                return obj.tournament.league.code
        except Exception:
            pass
        return None

    def get_week_state(self, obj):
        total = getattr(obj, 'matches_count', None)
        if total is None:
            total = obj.matches.count()
        if total == 0:
            return 'EMPTY'
        final_cnt = getattr(obj, 'final_matches_count', 0) or 0
        live_cnt = getattr(obj, 'live_matches_count', 0) or 0
        sched_cnt = getattr(obj, 'scheduled_matches_count', 0) or 0
        if final_cnt >= total:
            return 'COMPLETED'
        if live_cnt > 0 or (final_cnt > 0 and sched_cnt > 0):
            return 'LIVE'
        return 'UPCOMING'

class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'espn_id', 'week', 'home_team', 'away_team', 'date_time',
            'status', 'home_score', 'away_score', 'winner',
            'home_form', 'away_form', 'is_locked'
        ]

class PoolMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PoolMembership
        fields = ['id', 'user', 'role', 'joined_at']

class PoolSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Pool
        fields = ['id', 'name', 'invite_code', 'tournament', 'creator', 'created_at', 'members_count']

    def get_members_count(self, obj):
        annotated = getattr(obj, 'members_count', None)
        if annotated is not None:
            return annotated
        return obj.memberships.count()

class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = ['id', 'pool', 'user', 'match', 'pick', 'is_correct', 'submitted_at']
