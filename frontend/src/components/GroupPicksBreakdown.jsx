import React from 'react';
import { Eye, Lock, Check, X } from 'lucide-react';

export default function GroupPicksBreakdown({
  matchesBreakdown,
  standings,
  currentLeague
}) {
  if (!matchesBreakdown || matchesBreakdown.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs shadow-sm">
        No hay partidos con picks revelados aún.
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Boleta del Grupo en Vivo
          </h3>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Por transparencia y emoción del juego, los pronósticos de los demás se revelan en cuanto inicia cada partido.
        </p>
      </div>

      <div className="space-y-3">
        {matchesBreakdown.map((m) => {
          const isFinal = m.status === 'FINAL';

          return (
            <div key={m.match_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-md">
              {/* Match Header */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-200">
                  {m.home_team} vs {m.away_team}
                </span>

                <div className="flex items-center gap-2">
                  {m.winner && (
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                      Ganador: {m.winner === 'HOME' ? m.home_team : (m.winner === 'AWAY' ? m.away_team : 'Empate')}
                    </span>
                  )}
                  {m.is_locked ? (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> Cerrado
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Abierto para pronosticar
                    </span>
                  )}
                </div>
              </div>

              {/* Members Picks Matrix */}
              <div className="p-3">
                {m.is_locked ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {standings.map(user => {
                      const userPickData = m.picks[user.user_id];
                      if (!userPickData) {
                        return (
                          <div key={user.user_id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 text-xs">
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{user.display_name}</span>
                            <span className="text-slate-400 dark:text-slate-600 text-[10px]">Sin pick</span>
                          </div>
                        );
                      }

                      const pickText = userPickData.pick === 'HOME' ? m.home_team : (userPickData.pick === 'AWAY' ? m.away_team : 'Empate');
                      const isHit = userPickData.is_correct;

                      return (
                        <div
                          key={user.user_id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                            isHit === true
                              ? 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-bold'
                              : isHit === false
                              ? 'bg-rose-100 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
                            >
                              {user.display_name[0].toUpperCase()}
                            </span>
                            <span className="truncate max-w-[70px] text-[11px] font-semibold">{user.display_name}</span>
                          </div>

                          <div className="flex items-center gap-1 font-bold text-[10px]">
                            <span className="truncate max-w-[65px]">{pickText}</span>
                            {isHit === true && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                            {isHit === false && <X className="w-3 h-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    🔒 Los pronósticos de todos se mostrarán cuando comience el partido.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
