from django.apps import AppConfig


class NflLmxConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'nfl_lmx'

    def ready(self):
        try:
            from .services.sync_queue import start_background_sync_worker
            start_background_sync_worker()
        except Exception:
            pass
