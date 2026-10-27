import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import TapToPick from './components/TapToPick';
import Leaderboard from './components/Leaderboard';
import GroupPicksBreakdown from './components/GroupPicksBreakdown';
import AdminPortal from './components/AdminPortal';
import JoinModal from './components/JoinModal';
import { api } from './services/api';
import { Target, Trophy, Eye, Calendar, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('quiniela_theme') || 'dark';
  });

  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || window.location.pathname === '/admin') {
      return 'admin_portal';
    }
    return 'app';
  });

  const [currentLeague, setCurrentLeague] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = (params.get('invite') || '').toUpperCase();
    return invite.includes('LMX') ? 'LMX' : 'NFL';
  });

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('quiniela_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [standings, setStandings] = useState([]);
  const [matchesBreakdown, setMatchesBreakdown] = useState([]);
  const [syncQueueInfo, setSyncQueueInfo] = useState(null);

  const [activeTab, setActiveTab] = useState('picks'); // 'picks' | 'standings' | 'breakdown'
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [urlInviteCode, setUrlInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Secuenciador monotónico para evitar que respuestas en vuelo de otra liga/jornada crucen datos
  const requestSeqRef = useRef(0);

  // Gestión de clase dark / light en la etiqueta html
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('quiniela_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Detectar parámetros de URL (?invite=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setUrlInviteCode(invite.toUpperCase());
      setIsJoinModalOpen(true);
    }
  }, []);

  // 2. Cargar Usuarios en paralelo sin bloquear el flujo principal
  const loadUsersList = useCallback(async () => {
    const data = await api.getUsers();
    if (data && data.length > 0) {
      setUsers(data);
      setCurrentUser(prev => {
        if (!prev) return null;
        const refreshed = data.find(u => u.id === prev.id || u.username === prev.username);
        if (refreshed) {
          localStorage.setItem('quiniela_user_session', JSON.stringify(refreshed));
          return refreshed;
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  // 3. Carga atómica y sin cruce de datos vía /api/bootstrap/
  const loadBootstrapState = useCallback(async ({
    league = currentLeague,
    weekId = '',
    userId = currentUser?.id || '',
    forceRefresh = false,
    silent = false,
  } = {}) => {
    const seq = ++requestSeqRef.current;
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const data = await api.getBootstrap({
        league,
        weekId,
        userId,
        forceRefresh,
      });

      // Descartar respuesta si el usuario ya cambió de liga o jornada mientras estaba en vuelo
      if (seq !== requestSeqRef.current || !data) return;

      if (data.pools) setPools(data.pools);
      if (data.selected_pool) setSelectedPool(data.selected_pool);
      if (data.weeks) setWeeks(data.weeks);
      if (data.selected_week) setSelectedWeek(data.selected_week);
      if (data.sync_queue) setSyncQueueInfo(data.sync_queue);

      const matchesList = data.matches || [];
      setMatches(matchesList);

      const picksMap = {};
      matchesList.forEach(m => {
        if (m.user_pick) {
          picksMap[m.id] = m.user_pick;
        }
      });
      setUserPicks(picksMap);

      setStandings(data.standings || []);
      setMatchesBreakdown(data.matches_breakdown || []);

      // Si el backend en Render acaba de encolar un trabajo en segundo plano hacia ESPN,
      // revalidar silenciosamente en 4.5s para reflejar marcadores recién sincronizados en Supabase
      if (!silent && (data.sync_queue?.pending_jobs || 0) > 0) {
        const activeWeekId = data.selected_week?.id || weekId;
        setTimeout(() => {
          if (seq === requestSeqRef.current) {
            loadBootstrapState({
              league,
              weekId: activeWeekId,
              userId,
              forceRefresh: true,
              silent: true,
            });
          }
        }, 4500);
      }
    } catch (err) {
      if (seq === requestSeqRef.current) {
        console.error("Error al sincronizar vista principal", err);
      }
    } finally {
      if (seq === requestSeqRef.current && !silent) {
        setIsLoading(false);
      }
    }
  }, [currentLeague, currentUser?.id]);

  // Carga inicial al montar la app
  useEffect(() => {
    loadBootstrapState({ league: currentLeague, weekId: '', userId: currentUser?.id || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar Pick con feedback táctil inmediato
  const handleSavePick = async (matchId, pickValue) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      showToast('Inicia sesión con tu PIN para registrar tus pronósticos');
      return;
    }
    if (!selectedPool) return;

    setUserPicks(prev => ({
      ...prev,
      [matchId]: { pick: pickValue }
    }));

    try {
      const res = await api.savePrediction(currentUser.id, selectedPool.id, matchId, pickValue);
      if (res.error) {
        showToast(`⚠️ ${res.error}`);
        setUserPicks(prev => {
          const next = { ...prev };
          delete next[matchId];
          return next;
        });
      } else {
        showToast('✅ Pick guardado');
        if (selectedPool?.id && selectedWeek?.id) {
          const standingsData = await api.getPoolStandings(selectedPool.id, selectedWeek.id);
          if (standingsData) {
            setStandings(standingsData.standings || []);
            setMatchesBreakdown(standingsData.matches_breakdown || []);
          }
        }
      }
    } catch {
      showToast('⚠️ No se pudo guardar');
    }
  };

  // Cambio de liga atómico (limpia estado transitorio para jamás mezclar ligas)
  const handleLeagueChange = (leagueCode) => {
    if (leagueCode === currentLeague) return;
    setCurrentLeague(leagueCode);
    setMatches([]);
    setUserPicks({});
    setMatchesBreakdown([]);
    loadBootstrapState({
      league: leagueCode,
      weekId: '',
      userId: currentUser?.id || '',
    });
  };

  // Cambio de jornada atómico dentro de la misma liga
  const handleSelectWeek = (w) => {
    if (!w || selectedWeek?.id === w.id) return;
    setSelectedWeek(w);
    loadBootstrapState({
      league: currentLeague,
      weekId: w.id,
      userId: currentUser?.id || '',
    });
  };

  const handleUserRegistered = (newUser) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === newUser.id);
      return exists ? prev.map(u => u.id === newUser.id ? newUser : u) : [...prev, newUser];
    });
    setCurrentUser(newUser);
    localStorage.setItem('quiniela_user_session', JSON.stringify(newUser));
    showToast(`¡Hola, ${newUser.display_name}! Sesión iniciada.`);

    loadBootstrapState({
      league: currentLeague,
      weekId: selectedWeek?.id || '',
      userId: newUser.id,
      forceRefresh: true,
    });
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setUserPicks({});
    localStorage.removeItem('quiniela_user_session');
    showToast('Sesión cerrada');
  };

  // Filtrar jornadas relevantes para el selector (con partidos registrados o abiertas de la fase actual)
  const visibleWeeks = weeks.filter(w => (w.matches_count || 0) > 0 && (w.week_number >= (currentLeague === 'LMX' ? 13 : 7)));
  const weeksToRender = visibleWeeks.length > 0 ? visibleWeeks : weeks.filter(w => (w.matches_count || 0) > 0 || !w.is_closed);

  // Detectar si existe una siguiente jornada próxima con partidos registrados para adelantar pronósticos
  const nextUpcomingWeek = weeksToRender.find(
    w => selectedWeek && w.week_number > selectedWeek.week_number && (w.scheduled_matches_count || 0) > 0
  );

  // Si está en el portal de administración protegido
  if (viewMode === 'admin_portal') {
    return (
      <AdminPortal
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setViewMode('app');
          loadUsersList();
          loadBootstrapState({
            league: currentLeague,
            weekId: selectedWeek?.id || '',
            userId: currentUser?.id || '',
            forceRefresh: true,
          });
        }}
        currentLeague={currentLeague}
        pools={pools}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-stadium-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-[#121630] text-white text-xs font-bold font-sport uppercase tracking-wider px-5 py-2.5 rounded-full shadow-2xl border border-indigo-500/30 animate-in fade-in duration-150">
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header
        currentLeague={currentLeague}
        onSelectLeague={handleLeagueChange}
        selectedPool={selectedPool}
        currentUser={currentUser}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onLogout={handleUserLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Week Selector Bar */}
        {weeksToRender.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold font-sport uppercase tracking-wider pl-1 pr-2 flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{currentLeague === 'LMX' ? 'Jornadas:' : 'Semanas:'}</span>
              </div>
              {weeksToRender.map(w => {
                const isSelected = selectedWeek?.id === w.id;
                const state = w.week_state;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWeek(w)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/60'
                        : 'bg-white hover:bg-slate-100 dark:bg-[#0E132A] dark:hover:bg-[#161C3D] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-indigo-500/15'
                    }`}
                  >
                    <span>{w.name}</span>
                    {state === 'LIVE' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Jornada en curso" />
                    )}
                    {state === 'COMPLETED' && (
                      <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-emerald-200' : 'text-emerald-500 dark:text-emerald-400'}`} title="Jornada finalizada" />
                    )}
                    {state === 'UPCOMING' && (
                      <Clock className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-400'}`} title="Próxima jornada abierta para pronosticar" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Banner rápido para adelantar pronósticos de siguientes jornadas */}
            {nextUpcomingWeek && activeTab === 'picks' && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-indigo-50/80 dark:bg-[#101532] border border-indigo-200/70 dark:border-indigo-500/20 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>
                    Partidos de <strong>{nextUpcomingWeek.name}</strong> ({nextUpcomingWeek.matches_count} juegos) ya disponibles por adelantado.
                  </span>
                </div>
                <button
                  onClick={() => handleSelectWeek(nextUpcomingWeek)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-sport uppercase tracking-wider text-[11px] transition flex-shrink-0"
                >
                  <span>Ir a {nextUpcomingWeek.name}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Switcher (Mobile First segmented buttons) */}
        <div className="grid grid-cols-3 p-1 bg-slate-200/80 dark:bg-[#0D1024] rounded-2xl border border-slate-200 dark:border-indigo-500/20 shadow-sm dark:shadow-xl">
          <button
            onClick={() => setActiveTab('picks')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'picks'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-indigo-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Pronosticar</span>
          </button>

          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'standings'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-indigo-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Posiciones</span>
          </button>

          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'breakdown'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-indigo-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Boleta Grupal</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'picks' && (
          <TapToPick
            matches={matches}
            currentLeague={currentLeague}
            userPicks={userPicks}
            onSavePick={handleSavePick}
            isLoading={isLoading}
            currentUser={currentUser}
            onOpenJoinModal={() => setIsJoinModalOpen(true)}
          />
        )}

        {activeTab === 'standings' && (
          <Leaderboard
            standings={standings}
            currentWeekName={selectedWeek?.name}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'breakdown' && (
          <GroupPicksBreakdown
            matchesBreakdown={matchesBreakdown}
            standings={standings}
            currentLeague={currentLeague}
          />
        )}
      </main>

      {/* Join / Quick Login Modal */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        defaultInviteCode={urlInviteCode || selectedPool?.invite_code}
        onUserRegistered={handleUserRegistered}
        users={users}
      />
    </div>
  );
}
