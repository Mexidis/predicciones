import React from 'react';
import { Lock, CheckCircle2, XCircle, Clock, ShieldCheck, Flame, Check, X, Minus, Trophy } from 'lucide-react';
import GoogleFormBadges from './GoogleFormBadges';

export default function TapToPick({
  matches,
  currentLeague,
  userPicks,
  onSavePick,
  isLoading,
  currentUser,
  onOpenJoinModal
}) {
  const isSoccer = currentLeague === 'LMX';
  const totalMatches = matches.length;
  const pickedCount = Object.keys(userPicks).length;
  const progressPercent = totalMatches > 0 ? Math.round((pickedCount / totalMatches) * 100) : 0;

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Banner if no user is selected */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-[#121635]/95 via-[#18163E]/95 to-[#0F1C36]/95 p-4 sm:p-5 rounded-3xl border border-indigo-500/30 shadow-xl shadow-indigo-950/40 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-sport uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-indigo-400" />
              ¿Listo para meter tus pronósticos?
            </h4>
            <p className="text-[11px] text-indigo-200/80 mt-0.5 font-medium">
              Regístrate o selecciona tu nombre para guardar tus aciertos en la tabla.
            </p>
          </div>
          <button
            onClick={onOpenJoinModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-xs shadow-lg shadow-indigo-950/70 transition active:scale-95 flex-shrink-0 ring-1 ring-indigo-400/40"
          >
            Unirse / Entrar
          </button>
        </div>
      )}

      {/* Progress Card */}
      <div className="bg-[#0D1024] rounded-3xl p-4 sm:p-5 border border-indigo-500/20 shadow-xl">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-black font-sport uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-turf-400" />
            Progreso de tus Pronósticos
          </span>
          <span className="font-mono font-bold text-indigo-300 text-sm">
            {pickedCount} <span className="text-slate-500 text-xs font-normal">/ {totalMatches}</span>
          </span>
        </div>
        <div className="w-full bg-[#080A18] h-2.5 rounded-full overflow-hidden border border-indigo-500/20">
          <div
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">
          Toca el equipo que ganará. Cuando el partido finalice, el ganador se pintará en verde.
        </p>
      </div>

      {/* Match Cards List */}
      <div className="space-y-3.5">
        {matches.map((m) => {
          const currentPick = userPicks[m.id]?.pick;
          const isCorrect = userPicks[m.id]?.is_correct;
          const isFinal = m.status === 'FINAL';
          const isLocked = m.is_locked;
          const winner = m.winner; // 'HOME' | 'AWAY' | 'DRAW'

          return (
            <div
              key={m.id}
              className={`relative bg-stadium-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-xl ${
                isFinal
                  ? isCorrect
                    ? 'border-turf-500/50 bg-emerald-950/20'
                    : isCorrect === false
                    ? 'border-rose-500/40 bg-rose-950/15'
                    : 'border-white/10'
                  : currentPick
                  ? 'border-turf-500/40 ring-1 ring-turf-500/30'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* Header: Date + Status Badge */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-stadium-950/90 border-b border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatDate(m.date_time)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocked && !isFinal && (
                    <span className="flex items-center gap-1 text-[10px] font-bold font-sport uppercase tracking-wider text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      <Lock className="w-2.5 h-2.5" />
                      En juego
                    </span>
                  )}
                  {isFinal && (
                    <span className="text-[11px] font-mono font-bold text-slate-200 bg-stadium-800 px-2.5 py-0.5 rounded-full border border-white/10">
                      Final: {m.home_score} - {m.away_score}
                    </span>
                  )}
                  {isFinal && isCorrect !== undefined && (
                    <span className={`flex items-center gap-1 text-[11px] font-bold font-sport uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isCorrect
                        ? 'bg-turf-500/20 text-turf-400 border border-turf-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isCorrect ? '+1 Acierto' : 'Fallado'}
                    </span>
                  )}
                </div>
              </div>

              {/* Match Content & Tap-to-Pick Buttons */}
              <div className="p-3.5 sm:p-4">
                <div className={`grid ${isSoccer ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-3`}>
                  {/* Local Team Button */}
                  <button
                    disabled={isLocked || isLoading}
                    onClick={() => onSavePick(m.id, 'HOME')}
                    className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all duration-200 active:scale-[0.98] ${
                      // Si el partido finalizó y Local fue el ganador: ¡Pintar de color verde!
                      isFinal && winner === 'HOME'
                        ? 'bg-gradient-to-b from-turf-600/30 to-turf-700/20 border-turf-400 text-turf-200 ring-2 ring-turf-400/50 shadow-lg shadow-emerald-950/60'
                        : currentPick === 'HOME'
                        ? isFinal && !isCorrect
                          ? 'bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/40'
                          : 'bg-gradient-to-b from-turf-600/20 to-turf-700/10 border-turf-400 ring-2 ring-turf-400/40 shadow-lg'
                        : isFinal
                        ? 'bg-stadium-950/40 border-white/5 opacity-60'
                        : 'bg-stadium-950/50 hover:bg-stadium-800/80 border-white/5 hover:border-white/10'
                    } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-1.5 p-1 rounded-2xl bg-stadium-900 border border-white/5 shadow-inner">
                      <img
                        src={m.home_team.logo_url}
                        alt=""
                        className="w-9 h-9 object-contain drop-shadow"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-black font-sport uppercase tracking-wide text-white line-clamp-1 mb-0.5">
                      {m.home_team.short_name || m.home_team.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sport uppercase tracking-wider mb-1.5">Local</span>
                    
                    {/* Indicador de forma Google */}
                    <GoogleFormBadges formString={m.home_form} />

                    {/* Estados finales y de picks */}
                    {isFinal && winner === 'HOME' && (
                      <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-turf-300 bg-turf-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-turf-400/50">
                        <Check className="w-3 h-3 stroke-[3]" /> Ganador
                      </span>
                    )}

                    {!isFinal && currentPick === 'HOME' && (
                      <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-turf-400 bg-turf-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-turf-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Tu Pick
                      </span>
                    )}

                    {isFinal && currentPick === 'HOME' && winner !== 'HOME' && (
                      <span className="mt-2 text-[10px] font-bold font-sport uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                        <X className="w-3 h-3 stroke-[3]" /> Tu Pick
                      </span>
                    )}
                  </button>

                  {/* Draw Button (Only for Liga MX) */}
                  {isSoccer && (
                    <button
                      disabled={isLocked || isLoading}
                      onClick={() => onSavePick(m.id, 'DRAW')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 active:scale-[0.98] ${
                        isFinal && winner === 'DRAW'
                          ? 'bg-gradient-to-b from-turf-600/30 to-turf-700/20 border-turf-400 text-turf-200 ring-2 ring-turf-400/50 shadow-lg shadow-emerald-950/60'
                          : currentPick === 'DRAW'
                          ? isFinal && !isCorrect
                            ? 'bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/40'
                            : 'bg-gradient-to-b from-indigo-600/30 to-violet-700/20 border-indigo-400 text-indigo-100 ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-950/60'
                          : isFinal
                          ? 'bg-stadium-950/40 border-white/5 opacity-60'
                          : 'bg-stadium-950/50 hover:bg-stadium-800/80 border-white/5 hover:border-white/10'
                      } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-[#0F132A] border border-indigo-500/20 flex items-center justify-center text-xs font-black font-sport text-indigo-300 mb-2 shadow-inner">
                        VS
                      </div>
                      <span className="text-xs sm:text-sm font-black font-sport uppercase tracking-wide text-white">Empate</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">(X)</span>

                      {isFinal && winner === 'DRAW' && (
                        <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-turf-300 bg-turf-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-turf-400/50">
                          <Check className="w-3 h-3 stroke-[3]" /> Empate Oficial
                        </span>
                      )}

                      {!isFinal && currentPick === 'DRAW' && (
                        <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-indigo-300 bg-indigo-500/25 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-500/40 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-indigo-300" /> Tu Pick
                        </span>
                      )}

                      {isFinal && currentPick === 'DRAW' && winner !== 'DRAW' && (
                        <span className="mt-2 text-[10px] font-bold font-sport uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                          <X className="w-3 h-3 stroke-[3]" /> Tu Pick
                        </span>
                      )}
                    </button>
                  )}

                  {/* Away Team Button */}
                  <button
                    disabled={isLocked || isLoading}
                    onClick={() => onSavePick(m.id, 'AWAY')}
                    className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all duration-200 active:scale-[0.98] ${
                      isFinal && winner === 'AWAY'
                        ? 'bg-gradient-to-b from-turf-600/30 to-turf-700/20 border-turf-400 text-turf-200 ring-2 ring-turf-400/50 shadow-lg shadow-emerald-950/60'
                        : currentPick === 'AWAY'
                        ? isFinal && !isCorrect
                          ? 'bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500/40'
                          : 'bg-gradient-to-b from-turf-600/20 to-turf-700/10 border-turf-400 ring-2 ring-turf-400/40 shadow-lg'
                        : isFinal
                        ? 'bg-stadium-950/40 border-white/5 opacity-60'
                        : 'bg-stadium-950/50 hover:bg-stadium-800/80 border-white/5 hover:border-white/10'
                    } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-1.5 p-1 rounded-2xl bg-stadium-900 border border-white/5 shadow-inner">
                      <img
                        src={m.away_team.logo_url}
                        alt=""
                        className="w-9 h-9 object-contain drop-shadow"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-black font-sport uppercase tracking-wide text-white line-clamp-1 mb-0.5">
                      {m.away_team.short_name || m.away_team.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sport uppercase tracking-wider mb-1.5">Visita</span>

                    {/* Indicador de forma Google */}
                    <GoogleFormBadges formString={m.away_form} />

                    {/* Estados finales y de picks */}
                    {isFinal && winner === 'AWAY' && (
                      <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-turf-300 bg-turf-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-turf-400/50">
                        <Check className="w-3 h-3 stroke-[3]" /> Ganador
                      </span>
                    )}

                    {!isFinal && currentPick === 'AWAY' && (
                      <span className="mt-2 text-[10px] font-black font-sport uppercase tracking-wider text-turf-400 bg-turf-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-turf-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Tu Pick
                      </span>
                    )}

                    {isFinal && currentPick === 'AWAY' && winner !== 'AWAY' && (
                      <span className="mt-2 text-[10px] font-bold font-sport uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                        <X className="w-3 h-3 stroke-[3]" /> Tu Pick
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
