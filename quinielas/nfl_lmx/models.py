from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Equipo(models.Model):
    nombre = models.CharField(max_length=50)
    liga = models.ForeignKey(Liga)

    def
    
