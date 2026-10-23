import React, { useState } from 'react';
import { Shield, Bell, RefreshCw, Users, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function AdminPanel({
  poolId,
  selectedPool,
  currentWeek,
  currentLeague,
  activityData,
  onRefreshActivity,
  onClose
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);

  const members = activityData?.members_activity || [];
  const pendingMembers = members.filter(m => !m.is_complete);
  const completeMembers = members.filter(m => m.is_complete);

  // Sincronizar con ESPN
  const handleSyncEspn = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncEspn(currentLeague, currentWeek?.week_number);
      setSyncResult(res);
      if (onRefreshActivity) onRefreshActivity();
    } catch (e) {
      setSyncResult({ error: 'Error de conexión con ESPN' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Notificar automáticamente a rezagados
  const handleAutoNotify = async () => {
    setIsNotifying(true);
    setNotificationStatus(null);
    try {
      const res = await api.sendReminder(poolId, currentWeek?.id);
      setNotificationStatus(res);
    } catch (e) {
      setNotificationStatus({ error: 'No se pudo enviar el recordatorio automático' });
    } finally {
      setIsNotifying(false);
    }
  };

  // Generar texto para WhatsApp
  const handleCopyWhatsAppReport = () => {
    const pendingNames = pendingMembers.map(m => `• ${m.display_name} (faltan ${m.missing_picks})`).join('\n');
    const msg = `📢 *RECORDATORIO QUINIELA FAMILIAR*\n\n¡Ojo! Los partidos están por comenzar. Quienes aún tienen pronósticos pendientes:\n\n${pendingNames || '¡Nadie! Todos tienen sus picks completos 🎉'}\n\nIngresen a meter sus pronósticos antes de que empiece el silbatazo ⏰.`;
    navigator.clipboard.writeText(msg);
    alert('¡Reporte copiado! Puedes pegarlo en el grupo de WhatsApp.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Panel de Administración</h3>
              <p className="text-xs text-slate-400">{selectedPool?.name} • {currentWeek?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Pronósticos Listos</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400">{completeMembers.length}</span>
                <span className="text-xs text-slate-400">/ {members.length} integrantes</span>
              </div>
            </div>

            <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Rezagados / Incompletos</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-400">{pendingMembers.length}</span>
                <span className="text-xs text-slate-400">pendientes</span>
              </div>
            </div>
          </div>

          {/* Sincronización Automática con ESPN */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <h4 className="text-xs font-bold text-slate-200">Sincronización Automática ESPN</h4>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/20">
                {currentLeague}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Consulta en tiempo real la API oficial de ESPN para actualizar marcadores finales, partidos en juego y recalcular los aciertos automáticamente.
            </p>
            <button
              disabled={isSyncing}
              onClick={handleSyncEspn}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando con ESPN...' : 'Sincronizar Resultados Ahora'}
            </button>

            {syncResult && (
              <div className="mt-2 text-[11px] p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
                {syncResult.error ? (
                  <span className="text-rose-400">⚠️ {syncResult.error}</span>
                ) : (
                  <span className="text-emerald-400">
                    ✅ Sincronizados {syncResult.matches_updated || 0} partidos de la jornada {syncResult.week || ''}.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notificación Automática a Rezagados */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/70 space-y-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-200">Notificador Automático de Rezagados</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Envía una alerta directa a cada integrante que no ha completado sus pronósticos antes del bloqueo de la jornada.
            </p>

            <div className="flex gap-2">
              <button
                disabled={isNotifying || pendingMembers.length === 0}
                onClick={handleAutoNotify}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 disabled:opacity-40"
              >
                <Bell className="w-3.5 h-3.5" />
                {isNotifying ? 'Enviando...' : `Notificar a los ${pendingMembers.length} pendientes`}
              </button>

              <button
                onClick={handleCopyWhatsAppReport}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                title="Copiar lista para WhatsApp"
              >
                Copiar p/ WhatsApp
              </button>
            </div>

            {notificationStatus && (
              <div className="text-[11px] p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400">
                ✅ {notificationStatus.message}
              </div>
            )}
          </div>

          {/* Lista de Participantes y Estatus */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estatus por Participante
            </h4>

            <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: m.avatar_color || '#3B82F6' }}
                    >
                      {m.display_name[0].toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-200">{m.display_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {m.submitted_picks} / {m.total_matches}
                    </span>
                    {m.is_complete ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Listo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" /> Faltan {m.missing_picks}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
