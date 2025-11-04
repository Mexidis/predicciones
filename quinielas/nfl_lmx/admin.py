from django.contrib import admin
from .models import Team, PoolWeek, Match, Prediction, League, Season, UserProfile, Sport, Results, Week

admin.site.register(Team)
admin.site.register(PoolWeek)
admin.site.register(Match)
admin.site.register(Prediction)
admin.site.register(League)
admin.site.register(Season)
admin.site.register(UserProfile)
admin.site.register(Sport)
admin.site.register(Results)
admin.site.register(Week)