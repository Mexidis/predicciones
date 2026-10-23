from django.urls import path
from . import views

urlpatterns = [
    # Autenticación y registro
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/register/', views.api_register, name='api_register'),
    path('auth/users/', views.api_get_users, name='api_users'),
    path('auth/change-pin/', views.api_change_user_pin, name='api_change_user_pin'),

    # Pools (Quinielas)
    path('pools/', views.api_list_pools, name='api_pools'),
    path('pools/join/', views.api_join_pool, name='api_join_pool'),
    path('pools/<int:pool_id>/standings/', views.api_pool_standings, name='api_pool_standings'),
    path('pools/<int:pool_id>/activity/', views.api_pool_activity, name='api_pool_activity'),
    path('pools/<int:pool_id>/remind/', views.api_send_auto_reminder, name='api_pool_remind'),

    # Torneos, Jornadas y Partidos
    path('tournaments/', views.api_list_tournaments, name='api_tournaments'),
    path('weeks/', views.api_list_weeks, name='api_weeks'),
    path('matches/', views.api_list_matches, name='api_matches'),

    # Pronósticos
    path('predictions/save/', views.api_save_prediction, name='api_save_prediction'),

    # Sincronización
    path('sync/espn/', views.api_sync_espn, name='api_sync_espn'),

    # Panel de Administración Protegido
    path('admin-portal/login/', views.api_admin_login, name='api_admin_login'),
    path('admin-portal/bulk-results/', views.api_admin_bulk_results, name='api_admin_bulk_results'),
    path('admin-portal/participants/', views.api_admin_get_participants, name='api_admin_get_participants'),
    path('admin-portal/participants/create/', views.api_admin_create_participant, name='api_admin_create_participant'),
    path('admin-portal/participants/<int:user_id>/', views.api_admin_delete_participant, name='api_admin_delete_participant'),
    path('admin-portal/predictions/bulk-save/', views.api_admin_save_participant_predictions, name='api_admin_save_predictions'),
    path('admin-portal/predictions/matrix/', views.api_admin_get_week_predictions, name='api_admin_predictions_matrix'),
    path('admin-portal/change-password/', views.api_admin_change_password, name='api_admin_change_password'),
    path('admin-portal/participants/<int:user_id>/reset-pin/', views.api_admin_reset_participant_pin, name='api_admin_reset_participant_pin'),
    path('admin-portal/repair-database/', views.api_admin_repair_database, name='api_admin_repair_database'),
    path('admin-portal/points/', views.api_admin_pool_points, name='api_admin_pool_points'),
    path('admin-portal/points/bulk-save/', views.api_admin_pool_points, name='api_admin_save_pool_points'),
]
