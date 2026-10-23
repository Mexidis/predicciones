import React, { useState } from 'react';
import { Trophy, Calendar, TrendingUp, Users } from 'lucide-react';
import { MedalIcon } from './SportsIcons';

export default function Leaderboard({
  standings = [],
  currentWeekName,
  currentUser,
  isLoading = false
}) {
  // Por defecto 'general' para ver el acumulado general del torneo
  const [viewType, setViewType] = useState('general'); // 'general' | 'weekly'

  const isWeekly = viewType === 'weekly';
  const scoreKey = isWeekly ? 'weekly_hits' : 'total_hits';
  const totalKey = isWeekly ? 'weekly_total' : 'total_picks';
  const rankKey = isWeekly ? 'weekly_rank' : 'general_rank';

  // Ordenar lista según la vista
  const sortedStandings = [...standings].sort((a, b) => {
    const scoreA = a[scoreKey] ?? 0;
    const scoreB = b[scoreKey] ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return (a.display_name || '').localeCompare(b.display_name || '');
  });

  // Identificar los 3 niveles de puntuación para el podio olímpico
  const uniqueScores = [...new Set(sortedStandings.map(s => s[scoreKey]))]
    .filter(sc => sc !== undefined && sc !== null && sc > 0)
    .sort((a, b) => b - a);

  const goldScore = uniqueScores[0];
  const silverScore = uniqueScores[1];
  const bronzeScore = uniqueScores[2];

  const goldMedalists = goldScore !== undefined ? sortedStandings.filter(s => s[scoreKey] === goldScore) : [];
  const silverMedalists = silverScore !== undefined ? sortedStandings.filter(s => s[scoreKey] === silverScore) : [];
  const bronzeMedalists = bronzeScore !== undefined ? sortedStandings.filter(s => s[scoreKey] === bronzeScore) : [];

  return (
    <div className="space-y-4 pb-24">
      {/* Switcher: Tabla General Acumulada vs Esta Semana */}
      <div className="flex p-1 bg-slate-200/80 dark:bg-stadium-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
        <button
          onClick={() => setViewType('general')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            !isWeekly
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md ring-1 ring-indigo-400/40'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tabla General Acumulada</span>
        </button>

        <button
          onClick={() => setViewType('weekly')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            isWeekly
              ? 'bg-white dark:bg-stadium-800 text-emerald-700 dark:text-turf-400 shadow-sm border border-slate-200 dark:border-white/10'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{currentWeekName || 'Esta Jornada'}</span>
        </button>
      </div>

      {/* PODIO OLÍMPICO (SOLO PARA LA TABLA GENERAL ACUMULADA) */}
      {!isWeekly && (
        <div className="grid grid-cols-3 gap-2.5 pt-2 animate-in fade-in duration-200">
          {/* 2º Lugar - Plata */}
          <div className="flex flex-col items-center justify-end">
            {silverMedalists[0] ? (
              <div className="w-full bg-slate-100/90 dark:bg-gradient-to-b dark:from-slate-300/15 dark:to-stadium-900/60 border border-slate-300 dark:border-slate-300/40 rounded-2xl p-3 text-center shadow-md dark:shadow-lg relative pt-5">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md border border-slate-300">
                  <MedalIcon color="silver" className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-sport uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider">2º Lugar</p>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                  {silverMedalists[0].display_name}
                </h4>
                <p className="text-base font-black font-mono text-slate-800 dark:text-slate-200 mt-1">
                  {silverMedalists[0][scoreKey]} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">pts</span>
                </p>
                {silverMedalists.length > 1 && (
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">+{silverMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-24 rounded-2xl border border-dashed border-slate-300 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">--</div>
            )}
          </div>

          {/* 1er Lugar - Oro */}
          <div className="flex flex-col items-center justify-end -mt-2">
            {goldMedalists[0] ? (
              <div className="w-full bg-amber-50 dark:bg-gradient-to-b dark:from-yellow-400/25 dark:via-yellow-500/10 dark:to-stadium-900/80 border-2 border-amber-400 dark:border-yellow-400 rounded-2xl p-3 text-center shadow-lg dark:shadow-xl dark:glow-gold relative pt-6 ring-2 ring-amber-400/20 dark:ring-yellow-400/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 dark:bg-stadium-950 flex items-center justify-center shadow-lg border-2 border-white dark:border-yellow-400">
                  <MedalIcon color="gold" className="w-5 h-5 text-white dark:text-yellow-400" />
                </div>
                <p className="text-[10px] font-sport uppercase font-black text-amber-700 dark:text-yellow-300 tracking-wider">1º Lugar</p>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-yellow-100 truncate mt-0.5">
                  {goldMedalists[0].display_name}
                </h4>
                <p className="text-xl font-black font-mono text-amber-600 dark:text-yellow-300 mt-0.5">
                  {goldMedalists[0][scoreKey]} <span className="text-[11px] font-semibold text-amber-700/80 dark:text-yellow-400/80">pts</span>
                </p>
                {goldMedalists.length > 1 && (
                  <span className="text-[9px] text-amber-700/80 dark:text-yellow-300/80 block mt-0.5">+{goldMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-28 rounded-2xl border border-dashed border-slate-300 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">--</div>
            )}
          </div>

          {/* 3er Lugar - Bronce */}
          <div className="flex flex-col items-center justify-end">
            {bronzeMedalists[0] ? (
              <div className="w-full bg-orange-50/80 dark:bg-gradient-to-b dark:from-[#8C5E3C]/25 dark:to-stadium-900/60 border border-orange-300 dark:border-[#CD7F32]/50 rounded-2xl p-3 text-center shadow-md dark:shadow-lg relative pt-5">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md border border-orange-400 dark:border-[#CD7F32]">
                  <MedalIcon color="bronze" className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-sport uppercase font-bold text-orange-700 dark:text-[#CD7F32] tracking-wider">3º Lugar</p>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                  {bronzeMedalists[0].display_name}
                </h4>
                <p className="text-base font-black font-mono text-orange-600 dark:text-[#CD7F32] mt-1">
                  {bronzeMedalists[0][scoreKey]} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">pts</span>
                </p>
                {bronzeMedalists.length > 1 && (
                  <span className="text-[9px] text-orange-600/80 dark:text-[#CD7F32]/80 block mt-0.5">+{bronzeMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-24 rounded-2xl border border-dashed border-slate-300 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">--</div>
            )}
          </div>
        </div>
      )}

      {/* TABLA DE POSICIONES */}
      <div className="bg-white dark:bg-stadium-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-stadium-950/80 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${isWeekly ? 'text-emerald-600 dark:text-turf-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <h3 className="text-xs font-black font-sport uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isWeekly ? `Posiciones ${currentWeekName || 'de la Jornada'}` : 'Clasificación General'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">1 acierto = 1 pt</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500 space-y-3">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Cargando posiciones oficiales...</p>
          </div>
        ) : sortedStandings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-400">Aún no hay participantes en esta quiniela.</p>
            <p className="text-[11px]">Comparte el enlace de invitación de WhatsApp para comenzar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {sortedStandings.map((user, idx) => {
              const rank = user[rankKey] || idx + 1;
              const medal = !isWeekly ? (
                user[scoreKey] === goldScore && goldScore > 0 ? 'gold' :
                user[scoreKey] === silverScore && silverScore > 0 ? 'silver' :
                user[scoreKey] === bronzeScore && bronzeScore > 0 ? 'bronze' : null
              ) : null;

              const hits = user[scoreKey] ?? 0;
              const total = user[totalKey] ?? 0;
              const isMe = user.user_id === currentUser?.id;
              const hasPicks = total > 0 && total >= hits;
              const pct = hasPicks ? Math.round((hits / total) * 100) : null;

              let medalBadge = null;
              let rowThemeClass = 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02] text-slate-800 dark:text-slate-300';

              if (!isWeekly && medal === 'gold') {
                medalBadge = <MedalIcon color="gold" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-amber-50/60 dark:bg-gradient-to-r dark:from-yellow-500/15 dark:via-yellow-500/5 dark:to-transparent border-l-4 border-l-amber-500 dark:border-l-yellow-400 text-amber-900 dark:text-yellow-100 font-semibold';
              } else if (!isWeekly && medal === 'silver') {
                medalBadge = <MedalIcon color="silver" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-slate-100/60 dark:bg-gradient-to-r dark:from-slate-300/15 dark:via-slate-300/5 dark:to-transparent border-l-4 border-l-slate-400 dark:border-l-slate-300 text-slate-900 dark:text-slate-100 font-semibold';
              } else if (!isWeekly && medal === 'bronze') {
                medalBadge = <MedalIcon color="bronze" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-orange-50/60 dark:bg-gradient-to-r dark:from-[#8C5E3C]/15 dark:via-[#8C5E3C]/5 dark:to-transparent border-l-4 border-l-orange-400 dark:border-l-[#CD7F32] text-orange-900 dark:text-[#E8C39E] font-semibold';
              } else {
                rowThemeClass = 'border-l-4 border-l-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.02]';
              }

              return (
                <div
                  key={user.user_id}
                  className={`flex items-center justify-between px-4 py-3.5 transition-colors ${rowThemeClass} ${
                    isMe ? 'ring-1 ring-inset ring-emerald-500/40 dark:ring-turf-400/40 bg-emerald-50/30 dark:bg-turf-500/5' : ''
                  }`}
                >
                  {/* Columna Izquierda: Posición + Avatar + Nombre */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 flex items-center justify-center font-black font-sport text-base">
                      {medalBadge ? (
                        medalBadge
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-mono font-bold">#{rank}</span>
                      )}
                    </div>

                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
                    >
                      {(user.display_name || 'U')[0].toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-[180px]">
                          {user.display_name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-turf-500/20 text-emerald-700 dark:text-turf-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-300 dark:border-turf-500/30">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {hasPicks
                          ? `${hits}/${total} aciertos (${pct}%)`
                          : `${hits} pts acumulados`}
                      </span>
                    </div>
                  </div>

                  {/* Columna Derecha: Puntos */}
                  <div className="text-right">
                    <div className="text-base font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
                      {hits} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sport uppercase">
                      Posición #{rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
