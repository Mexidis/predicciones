import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TapToPick from './components/TapToPick';
import Leaderboard from './components/Leaderboard';
import GroupPicksBreakdown from './components/GroupPicksBreakdown';
import AdminPortal from './components/AdminPortal';
import JoinModal from './components/JoinModal';
import { api } from './services/api';
import { Target, Trophy, Eye, Calendar, Sparkles } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('quiniela_theme') || 'dark';
  });

  const [viewMode, setViewMode] = useState('app'); // 'app' | 'admin_portal'
  const [currentLeague, setCurrentLeague] = useState('NFL'); // 'NFL' | 'LMX'
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

  const [activeTab, setActiveTab] = useState('picks'); // 'picks' | 'standings' | 'breakdown'
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [urlInviteCode, setUrlInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  // 1. Detectar parámetros de URL (?invite=CODE o ?admin=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const adminParam = params.get('admin');

    if (invite) {
      setUrlInviteCode(invite.toUpperCase());
      setIsJoinModalOpen(true);
      if (invite.toUpperCase().includes('LMX')) {
        setCurrentLeague('LMX');
      } else {
        setCurrentLeague('NFL');
      }
    }

    if (adminParam === 'true' || window.location.pathname === '/admin') {
      setViewMode('admin_portal');
    }
  }, []);

  // 2. Cargar Usuarios
  const loadUsersList = async () => {
    const data = await api.getUsers();
    if (data && data.length > 0) {
      setUsers(data);
      // Si ya hay un usuario guardado en sesión local, actualizar sus datos
      if (currentUser) {
        const refreshed = data.find(u => u.id === currentUser.id || u.username === currentUser.username);
        if (refreshed) {
          setCurrentUser(refreshed);
          localStorage.setItem('quiniela_user_session', JSON.stringify(refreshed));
        }
      }
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  // 3. Cargar Pools según liga
  useEffect(() => {
    async function loadPools() {
      const data = await api.getPools();
      if (data && data.length > 0) {
        setPools(data);
        const matchPool = data.find(p => p.tournament?.league?.code === currentLeague) || data[0];
        setSelectedPool(matchPool);
      }
    }
    loadPools();
  }, [currentLeague]);

  // 4. Cargar Semanas del Torneo con selección inteligente de jornada activa
  useEffect(() => {
    let active = true;
    async function loadWeeks() {
      if (!selectedPool?.tournament?.id) return;
      if (selectedPool.tournament?.league?.code !== currentLeague) return;

      const data = await api.getWeeks(selectedPool.tournament.id);
      if (!active) return;

      if (data && data.length > 0) {
        setWeeks(data);
        // Selección inteligente: priorizar jornada abierta que contenga partidos o la más reciente con partidos
        const openWithMatches = data.find(w => !w.is_closed && (w.matches_count === undefined || w.matches_count > 0));
        const anyWithMatches = [...data].reverse().find(w => w.matches_count > 0);
        const activeWeek = openWithMatches || anyWithMatches || data.find(w => !w.is_closed) || data[data.length - 1];
        setSelectedWeek(activeWeek);
      }
    }
    loadWeeks();
    return () => { active = false; };
  }, [selectedPool, currentLeague]);

  // 5. Cargar Partidos y Tabla de Posiciones
  useEffect(() => {
    let active = true;
    const loadWeekData = async () => {
      if (!selectedWeek?.id || !selectedPool?.id) return;
      if (selectedPool.tournament?.league?.code !== currentLeague) return;
      if (selectedWeek.tournament && selectedWeek.tournament !== selectedPool.tournament.id) return;

      setIsLoading(true);

      try {
        const [matchesData, standingsData] = await Promise.all([
          api.getMatches(selectedWeek.id, currentUser?.id, selectedPool.id),
          api.getPoolStandings(selectedPool.id, selectedWeek.id)
        ]);

        if (!active) return;

        if (matchesData) {
          setMatches(matchesData);
          const picksMap = {};
          matchesData.forEach(m => {
            if (m.user_pick) {
              picksMap[m.id] = m.user_pick;
            }
          });
          setUserPicks(picksMap);
        }

        if (standingsData) {
          setStandings(standingsData.standings || []);
          setMatchesBreakdown(standingsData.matches_breakdown || []);
        }
      } catch (err) {
        if (active) console.error("Error al cargar datos", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadWeekData();
    return () => { active = false; };
  }, [selectedWeek, selectedPool, currentUser, currentLeague]);

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

  const handleLeagueChange = (leagueCode) => {
    if (leagueCode === currentLeague) return;
    setCurrentLeague(leagueCode);
    setMatches([]);
    setWeeks([]);
    setSelectedWeek(null);
    setStandings([]);
    setMatchesBreakdown([]);
    setUserPicks({});
    setIsLoading(true);

    const pool = pools.find(p => p.tournament?.league?.code === leagueCode);
    if (pool) {
      setSelectedPool(pool);
      api.getPoolStandings(pool.id).then(data => {
        if (data?.standings) {
          setStandings(data.standings);
        }
      }).catch(() => {});
    }
  };

  const handleSelectWeek = (w) => {
    if (selectedWeek?.id === w.id) return;
    setMatches([]);
    setIsLoading(true);
    setSelectedWeek(w);
  };

  const handleUserRegistered = (newUser) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === newUser.id);
      return exists ? prev.map(u => u.id === newUser.id ? newUser : u) : [...prev, newUser];
    });
    setCurrentUser(newUser);
    localStorage.setItem('quiniela_user_session', JSON.stringify(newUser));
    showToast(`¡Hola, ${newUser.display_name}! Sesión iniciada.`);
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('quiniela_user_session');
    showToast('Sesión cerrada');
  };

  // Si está en el portal de administración protegido
  if (viewMode === 'admin_portal') {
    return (
      <AdminPortal
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setViewMode('app');
          loadUsersList();
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
        {weeks.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold font-sport uppercase tracking-wider pl-1 pr-2 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Jornada:</span>
            </div>
            {weeks.map(w => (
              <button
                key={w.id}
                onClick={() => handleSelectWeek(w)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all flex-shrink-0 active:scale-95 ${
                  selectedWeek?.id === w.id
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/60'
                    : 'bg-white hover:bg-slate-100 dark:bg-[#0E132A] dark:hover:bg-[#161C3D] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-indigo-500/15'
                }`}
              >
                {w.name}
              </button>
            ))}
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
