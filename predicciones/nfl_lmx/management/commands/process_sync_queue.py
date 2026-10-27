from django.core.management.base import BaseCommand
from nfl_lmx.services.sync_queue import schedule_periodic_sync_checks, drain_sync_queue


class Command(BaseCommand):
    help = 'Procesa los trabajos pendientes en la cola de sincronización deportiva (SyncJob).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-jobs',
            type=int,
            default=20,
            help='Número máximo de trabajos a procesar en esta ejecución.'
        )

    def handle(self, *args, **options):
        max_jobs = options.get('max_jobs', 20)
        schedule_periodic_sync_checks()
        processed = drain_sync_queue(max_jobs=max_jobs)
        self.stdout.write(
            self.style.SUCCESS(f'Se procesaron {len(processed)} trabajos de la cola de sincronización.')
        )
