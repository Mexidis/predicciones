from django.db import models
from django.contrib.auth.models import User

class Sport(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name

class League(models.Model):
    league_name = models.CharField(max_length=50)
    league_logo = models.ImageField(upload_to='league/')

    sport_type = models.ForeignKey(Sport)

    def __str__(self):
        return self.league_name

class Team(models.Model):
    name = models.CharField(max_length=50)
    liga = models.ForeignKey(League)
    team_logo = models.ImageField(upload_to='teams/')

    def __str__(self):
        return self.name
    
class Season(models.Model):
    season_name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    league = models.ForeignKey(League)

    def __str__(self):
        return self.season_name
        

class Week(models.Model):
    week_number = models.PositiveIntegerField()
    week_date = models.DateField()
    season = models.ForeignKey(Season)

    def __str__(self):
        return self.week_number

    
class Match(models.Model):
    home_team = models.ForeignKey(Team)
    away_team = models.ForeignKey(Team)

    # home_team_logo = models.ImageField(upload_to='match/')
    # away_team_logo = models.ImageField(upload_to='match/')

    match_week = models.ForeignKey(Week)
    date_time = models.DateTimeField()

    def __str__(self):
        return f"{self.date_time}: {self.home_team} - {self.away_team}\n{self.match_week}"

class Results(models.Model):
    match = models.OneToOneField(Match)
    home_score = models.PositiveIntegerField()
    away_score = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.match}: {self.home_score} - {self.away_score}"
    
# Representa la participación total de un usuario en una jornada.    
class PoolWeek(models.Model):
    user = models.ForeignKey(User)
    week = models.ForeignKey(Week)
    total_score = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'{self.week} - {self.user}: score[{self.total_score}]'
    
class Prediction(models.Model):
    pool = models.ForeignKey(PoolWeek)
    match = models.ForeignKey(Match)
    home_prediction = models.PositiveIntegerField()
    away_prediction = models.PositiveIntegerField()
    points_obtained = models.PositiveIntegerField(default=0)

    publisher = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.points_obtained
    
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)

    avatar = models.ImageField(upload_to='profiles/', null=True, blank=True)

    def __str__(self):
        return self.user.username 
    