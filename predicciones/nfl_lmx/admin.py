from django.contrib import admin
from .models import Sport, League, Team, Tournament, MatchWeek, Match, Pool, PoolMembership, Prediction, UserProfile, SyncJob

@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(League)
class LeagueAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'sport')

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'league')
    list_filter = ('league',)
    search_fields = ('name', 'short_name')

@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'league', 'year', 'is_active')
    list_filter = ('league', 'is_active')

@admin.register(MatchWeek)
class MatchWeekAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament', 'week_number', 'start_date', 'end_date', 'is_closed')
    list_filter = ('tournament',)

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'week', 'date_time', 'status', 'home_score', 'away_score', 'winner')
    list_filter = ('week__tournament', 'status', 'winner')
    actions = ['recalculate_results']

    def recalculate_results(self, request, queryset):
        for match in queryset:
            if match.home_score is not None and match.away_score is not None:
                match.update_result(match.home_score, match.away_score, match.status)
        self.message_user(request, "Resultados y pronósticos actualizados.")
    recalculate_results.short_description = "Recalcular puntos de pronósticos para partidos seleccionados"

@admin.register(Pool)
class PoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'invite_code', 'tournament', 'creator', 'created_at')
    list_filter = ('tournament',)
    search_fields = ('name', 'invite_code')

@admin.register(PoolMembership)
class PoolMembershipAdmin(admin.ModelAdmin):
    list_display = ('pool', 'user', 'role', 'joined_at')
    list_filter = ('pool', 'role')

@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ('user', 'pool', 'match', 'pick', 'is_correct', 'submitted_at')
    list_filter = ('pool', 'is_correct', 'pick')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'phone')

@admin.register(SyncJob)
class SyncJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'job_type', 'league_code', 'week_number', 'status', 'priority', 'matches_updated', 'scheduled_for', 'completed_at')
    list_filter = ('status', 'job_type', 'league_code')
    ordering = ('-id',)
