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

    class Meta:
        model = MatchWeek
        fields = ['id', 'week_number', 'name', 'start_date', 'end_date', 'is_closed', 'matches_count']

class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'week', 'home_team', 'away_team', 'date_time',
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
        return obj.memberships.count()

class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = ['id', 'pool', 'user', 'match', 'pick', 'is_correct', 'submitted_at']
