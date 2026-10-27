from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Sport(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name

class League(models.Model):
    CODE_CHOICES = [
        ('LMX', 'Liga MX'),
        ('NFL', 'NFL'),
    ]
    code = models.CharField(max_length=10, choices=CODE_CHOICES, unique=True)
    name = models.CharField(max_length=50)
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='leagues')
    logo_url = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name

class Team(models.Model):
    name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=30, blank=True)
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name='teams')
    logo_url = models.CharField(max_length=300, blank=True)
    espn_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['league', 'espn_id']),
            models.Index(fields=['league', 'short_name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.league.code})"

class Tournament(models.Model):
    name = models.CharField(max_length=100)  # Ej. "Apertura 2026", "Temporada 2026"
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name='tournaments')
    year = models.IntegerField(default=2026)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.league.name}"

class MatchWeek(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='weeks')
    week_number = models.PositiveIntegerField()
    name = models.CharField(max_length=50)  # "Jornada 13", "Semana 7"
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ['week_number']
        unique_together = ('tournament', 'week_number')

    def __str__(self):
        return f"{self.tournament.name} - {self.name}"

class Match(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Programado'),
        ('IN_PROGRESS', 'En Juego'),
        ('FINAL', 'Finalizado'),
        ('POSTPONED', 'Pospuesto'),
        ('CANCELED', 'Cancelado'),
    ]
    WINNER_CHOICES = [
        ('HOME', 'Local'),
        ('AWAY', 'Visita'),
        ('DRAW', 'Empate'),
    ]

    week = models.ForeignKey(MatchWeek, on_delete=models.CASCADE, related_name='matches')
    home_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='home_matches')
    away_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='away_matches')
    date_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    espn_id = models.CharField(max_length=50, blank=True, null=True)

    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    winner = models.CharField(max_length=10, choices=WINNER_CHOICES, null=True, blank=True)

    # Últimos resultados (ej. "V-V-D-E-V" para Liga MX o "W-L-W-W-L" para NFL)
    home_form = models.CharField(max_length=25, default='V-D-V-E-V', blank=True)
    away_form = models.CharField(max_length=25, default='D-V-E-D-V', blank=True)

    class Meta:
        ordering = ['date_time']
        indexes = [
            models.Index(fields=['week', 'date_time']),
            models.Index(fields=['status', 'date_time']),
            models.Index(fields=['espn_id']),
        ]

    @property
    def is_locked(self):
        """El partido se bloquea en cuanto inicia el silbatazo/kickoff o si ya no está programado."""
        if self.status in ['POSTPONED', 'CANCELED']:
            return False
        return timezone.now() >= self.date_time or self.status in ['IN_PROGRESS', 'FINAL']

    def update_result(self, home_score, away_score, status='FINAL'):
        self.home_score = home_score
        self.away_score = away_score
        self.status = status
        if home_score > away_score:
            self.winner = 'HOME'
        elif away_score > home_score:
            self.winner = 'AWAY'
        else:
            self.winner = 'DRAW'
        self.save()

        # Recalcular predicciones de este partido en una sola consulta SQL eficiente
        self.predictions.update(
            is_correct=models.Case(
                models.When(pick=self.winner, then=True),
                default=False,
                output_field=models.BooleanField()
            )
        )

    def __str__(self):
        return f"{self.home_team.short_name or self.home_team.name} vs {self.away_team.short_name or self.away_team.name} ({self.week.name})"

class Pool(models.Model):
    name = models.CharField(max_length=100)
    invite_code = models.CharField(max_length=20, unique=True, db_index=True)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='pools')
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_pools')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} [{self.invite_code}] ({self.tournament.league.code})"

class PoolMembership(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrador'),
        ('MEMBER', 'Participante'),
    ]
    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pool_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='MEMBER')
    manual_points = models.IntegerField(default=0, help_text="Ajuste manual de puntos directos para el leaderboard")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('pool', 'user')

    def __str__(self):
        return f"{self.user.username} en {self.pool.name} ({self.role})"

class Prediction(models.Model):
    PICK_CHOICES = [
        ('HOME', 'Local'),
        ('AWAY', 'Visita'),
        ('DRAW', 'Empate'),
    ]

    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='predictions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions')
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='predictions')
    pick = models.CharField(max_length=10, choices=PICK_CHOICES)
    is_correct = models.BooleanField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('pool', 'user', 'match')
        indexes = [
            models.Index(fields=['pool', 'user']),
            models.Index(fields=['pool', 'match']),
            models.Index(fields=['pool', 'is_correct']),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.match}: {self.pick}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=60)
    avatar_color = models.CharField(max_length=20, default='#3B82F6')
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.user.username


class SyncJob(models.Model):
    """
    Cola persistente de trabajos de sincronización en segundo plano (PostgreSQL / SQLite).
    Desacopla por completo las lecturas de usuario de las llamadas externas a ESPN.
    """
    JOB_TYPE_CHOICES = [
        ('SYNC_LIVE_SCORES', 'Sincronizar Marcadores en Vivo'),
        ('SYNC_LEAGUE_WEEK', 'Sincronizar Jornada Específica'),
        ('SYNC_UPCOMING_CALENDAR', 'Pre-cargar y Actualizar Calendario Futuro'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('PROCESSING', 'Procesando'),
        ('COMPLETED', 'Completado'),
        ('FAILED', 'Fallido'),
    ]

    job_type = models.CharField(max_length=40, choices=JOB_TYPE_CHOICES)
    league_code = models.CharField(max_length=10, default='ALL')
    week_number = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    priority = models.IntegerField(default=5)
    dedup_key = models.CharField(max_length=120, db_index=True)
    scheduled_for = models.DateTimeField(default=timezone.now, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    matches_updated = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-priority', 'scheduled_for', 'id']
        indexes = [
            models.Index(fields=['status', '-priority', 'scheduled_for']),
            models.Index(fields=['dedup_key', 'status', 'completed_at']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.job_type} ({self.league_code} W{self.week_number or 'ALL'})"
