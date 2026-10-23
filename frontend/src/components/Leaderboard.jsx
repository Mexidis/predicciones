import React, { useState } from 'react';
import { Trophy, Calendar, TrendingUp, Users } from 'lucide-react';
import { MedalIcon } from './SportsIcons';

export default function Leaderboard({
  standings,
  currentWeekName,
  currentUser
}) {
  const [viewType, setViewType] = useState('weekly'); // 'weekly' | 'general'

  const isWeekly = viewType === 'weekly';
  const scoreKey = isWeekly ? 'weekly_hits' : 'total_hits';
  const totalKey = isWeekly ? 'weekly_total' : 'total_picks';
  const rankKey = isWeekly ? 'weekly_rank' : 'general_rank';

  // Ordenar lista según la vista
  const sortedStandings = [...standings].sort((a, b) => {
    if (b[scoreKey] !== a[scoreKey]) {
      return b[scoreKey] - a[scoreKey];
    }
    return a.display_name.localeCompare(b.display_name);
  });

  // Solo para vista general: medallas de oro, plata y bronce
  const goldMedalists = !isWeekly ? sortedStandings.filter(s => s.general_medal === 'gold') : [];
  const silverMedalists = !isWeekly ? sortedStandings.filter(s => s.general_medal === 'silver') : [];
  const bronzeMedalists = !isWeekly ? sortedStandings.filter(s => s.general_medal === 'bronze') : [];

  return (
    <div className="space-y-4 pb-24">
      {/* Switcher: Esta Semana vs Tabla Acumulada General */}
      <div className="flex p-1 bg-stadium-900 rounded-2xl border border-white/5 shadow-inner">
        <button
          onClick={() => setViewType('weekly')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            isWeekly
              ? 'bg-stadium-800 text-turf-400 shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{currentWeekName || 'Esta Jornada'}</span>
        </button>

        <button
          onClick={() => setViewType('general')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            !isWeekly
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tabla General Acumulada</span>
        </button>
      </div>

      {/* PODIO OLÍMPICO (SOLO PARA LA TABLA GENERAL ACUMULADA) */}
      {!isWeekly && (
        <div className="grid grid-cols-3 gap-2.5 pt-2 animate-in fade-in duration-200">
          {/* 2º Lugar - Plata */}
          <div className="flex flex-col items-center justify-end">
            {silverMedalists[0] ? (
              <div className="w-full bg-gradient-to-b from-slate-300/15 to-stadium-900/60 border border-slate-300/40 rounded-2xl p-3 text-center shadow-lg relative pt-5">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shadow-md border border-slate-300">
                  <MedalIcon color="silver" className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-sport uppercase font-bold text-slate-300 tracking-wider">2º Lugar</p>
                <h4 className="text-xs font-extrabold text-white truncate mt-0.5">
                  {silverMedalists[0].display_name}
                </h4>
                <p className="text-base font-black font-mono text-slate-200 mt-1">
                  {silverMedalists[0][scoreKey]} <span className="text-[10px] font-normal text-slate-400">pts</span>
                </p>
                {silverMedalists.length > 1 && (
                  <span className="text-[9px] text-slate-400 block mt-0.5">+{silverMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-24 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-slate-600 text-xs">--</div>
            )}
          </div>

          {/* 1er Lugar - Oro */}
          <div className="flex flex-col items-center justify-end -mt-2">
            {goldMedalists[0] ? (
              <div className="w-full bg-gradient-to-b from-yellow-400/25 via-yellow-500/10 to-stadium-900/80 border-2 border-yellow-400 rounded-2xl p-3 text-center shadow-xl glow-gold relative pt-6 ring-2 ring-yellow-400/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-stadium-950 flex items-center justify-center shadow-lg border-2 border-yellow-400">
                  <MedalIcon color="gold" className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-sport uppercase font-black text-yellow-300 tracking-wider">1º Lugar</p>
                <h4 className="text-sm font-extrabold text-yellow-100 truncate mt-0.5">
                  {goldMedalists[0].display_name}
                </h4>
                <p className="text-xl font-black font-mono text-yellow-300 mt-0.5">
                  {goldMedalists[0][scoreKey]} <span className="text-[11px] font-semibold text-yellow-400/80">pts</span>
                </p>
                {goldMedalists.length > 1 && (
                  <span className="text-[9px] text-yellow-300/80 block mt-0.5">+{goldMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-28 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-slate-600 text-xs">--</div>
            )}
          </div>

          {/* 3er Lugar - Bronce */}
          <div className="flex flex-col items-center justify-end">
            {bronzeMedalists[0] ? (
              <div className="w-full bg-gradient-to-b from-[#8C5E3C]/25 to-stadium-900/60 border border-[#CD7F32]/50 rounded-2xl p-3 text-center shadow-lg relative pt-5">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shadow-md border border-[#CD7F32]">
                  <MedalIcon color="bronze" className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-sport uppercase font-bold text-[#CD7F32] tracking-wider">3º Lugar</p>
                <h4 className="text-xs font-extrabold text-white truncate mt-0.5">
                  {bronzeMedalists[0].display_name}
                </h4>
                <p className="text-base font-black font-mono text-[#CD7F32] mt-1">
                  {bronzeMedalists[0][scoreKey]} <span className="text-[10px] font-normal text-slate-400">pts</span>
                </p>
                {bronzeMedalists.length > 1 && (
                  <span className="text-[9px] text-[#CD7F32]/80 block mt-0.5">+{bronzeMedalists.length - 1} empatado(s)</span>
                )}
              </div>
            ) : (
              <div className="w-full h-24 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-slate-600 text-xs">--</div>
            )}
          </div>
        </div>
      )}

      {/* TABLA DE POSICIONES */}
      <div className="bg-stadium-900 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-stadium-950/80 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${isWeekly ? 'text-turf-400' : 'text-indigo-400'}`} />
            <h3 className="text-xs font-black font-sport uppercase tracking-wider text-slate-200">
              {isWeekly ? `Posiciones ${currentWeekName || 'de la Semana'}` : 'Clasificación General'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-medium">1 acierto = 1 pt</span>
        </div>

        {sortedStandings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-400">Aún no hay participantes en esta quiniela.</p>
            <p className="text-[11px]">Comparte el enlace de invitación de WhatsApp para comenzar.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sortedStandings.map((user) => {
              const rank = user[rankKey];
              const medal = !isWeekly ? user.general_medal : null;
              const hits = user[scoreKey];
              const total = user[totalKey];
              const isMe = user.user_id === currentUser?.id;
              const pct = total > 0 ? Math.round((hits / total) * 100) : 0;

              // En semanal: tabla sobria y profesional deportiva (sin medallas)
              // En general: colores dorados/plata/bronce para los 3 primeros lugares
              let medalBadge = null;
              let rowThemeClass = 'bg-transparent hover:bg-white/[0.02] text-slate-300';

              if (!isWeekly && medal === 'gold') {
                medalBadge = <MedalIcon color="gold" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-transparent border-l-4 border-l-yellow-400 text-yellow-100 font-semibold';
              } else if (!isWeekly && medal === 'silver') {
                medalBadge = <MedalIcon color="silver" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-gradient-to-r from-slate-300/15 via-slate-300/5 to-transparent border-l-4 border-l-slate-300 text-slate-100 font-semibold';
              } else if (!isWeekly && medal === 'bronze') {
                medalBadge = <MedalIcon color="bronze" className="w-5 h-5 drop-shadow" />;
                rowThemeClass = 'bg-gradient-to-r from-[#8C5E3C]/15 via-[#8C5E3C]/5 to-transparent border-l-4 border-l-[#CD7F32] text-[#E8C39E] font-semibold';
              } else {
                rowThemeClass = 'border-l-4 border-l-transparent text-slate-300 hover:bg-white/[0.02]';
              }

              return (
                <div
                  key={user.user_id}
                  className={`flex items-center justify-between px-4 py-3.5 transition-colors ${rowThemeClass} ${
                    isMe ? 'ring-1 ring-inset ring-turf-400/40 bg-turf-500/5' : ''
                  }`}
                >
                  {/* Columna Izquierda: Posición + Avatar + Nombre */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 flex items-center justify-center font-black font-sport text-base">
                      {medalBadge ? (
                        medalBadge
                      ) : (
                        <span className="text-slate-500 text-xs font-mono font-bold">#{rank}</span>
                      )}
                    </div>

                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
                    >
                      {user.display_name[0].toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-[180px]">
                          {user.display_name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-turf-500/20 text-turf-400 font-extrabold px-1.5 py-0.5 rounded border border-turf-500/30">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {hits}/{total} aciertos ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Columna Derecha: Puntos */}
                  <div className="text-right">
                    <div className="text-base font-black font-mono tracking-tight">
                      {hits} <span className="text-xs font-normal text-slate-400">pts</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-sport uppercase">
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
