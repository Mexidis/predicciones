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
  const [viewMode, setViewMode] = useState('app'); // 'app' | 'admin_portal'
  const [currentLeague, setCurrentLeague] = useState('NFL'); // 'NFL' | 'LMX'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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
      // Si no hay usuario seleccionado, elegir el primero (excepto admin)
      if (!currentUser) {
        const firstParticipant = data.find(u => u.username !== 'admin') || null;
        if (firstParticipant) setCurrentUser(firstParticipant);
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

  // 4. Cargar Semanas del Torneo
  useEffect(() => {
    async function loadWeeks() {
      if (!selectedPool?.tournament?.id) return;
      const data = await api.getWeeks(selectedPool.tournament.id);
      if (data && data.length > 0) {
        setWeeks(data);
        // Seleccionar la jornada actual/abierta por defecto (o la más reciente)
        const currentW = data.find(w => !w.is_closed) || data[data.length - 1];
        setSelectedWeek(currentW);
      }
    }
    loadWeeks();
  }, [selectedPool]);

  // 5. Cargar Partidos y Tabla de Posiciones
  const loadWeekData = async () => {
    if (!selectedWeek?.id || !selectedPool?.id) return;
    setIsLoading(true);

    try {
      // Cargar Partidos
      const matchesData = await api.getMatches(selectedWeek.id, currentUser?.id, selectedPool.id);
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

      // Cargar Posiciones
      const standingsData = await api.getPoolStandings(selectedPool.id, selectedWeek.id);
      if (standingsData) {
        setStandings(standingsData.standings || []);
        setMatchesBreakdown(standingsData.matches_breakdown || []);
      }
    } catch (err) {
      console.error("Error al cargar datos", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeekData();
  }, [selectedWeek, selectedPool, currentUser]);

  // Guardar Pick con feedback táctil inmediato
  const handleSavePick = async (matchId, pickValue) => {
    if (!currentUser) {
      setIsJoinModalOpen(true);
      showToast('Ingresa tu nombre para guardar tus picks');
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
        // Actualizar tabla en segundo plano
        loadWeekData();
      }
    } catch {
      showToast('⚠️ No se pudo guardar');
    }
  };

  const handleLeagueChange = (leagueCode) => {
    setCurrentLeague(leagueCode);
    const pool = pools.find(p => p.tournament?.league?.code === leagueCode);
    if (pool) setSelectedPool(pool);
  };

  const handleUserRegistered = (newUser) => {
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(`¡Bienvenido al grupo, ${newUser.display_name}!`);
    loadWeekData();
  };

  // Si está en el portal de administración protegido
  if (viewMode === 'admin_portal') {
    return (
      <AdminPortal
        onBackToApp={() => {
          setViewMode('app');
          loadWeekData();
          loadUsersList();
        }}
        currentLeague={currentLeague}
        pools={pools}
        weeks={weeks}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stadium-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#121630] text-white text-xs font-bold font-sport uppercase tracking-wider px-5 py-2.5 rounded-full shadow-2xl border border-indigo-500/30 animate-in fade-in duration-150">
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header
        currentLeague={currentLeague}
        onSelectLeague={handleLeagueChange}
        selectedPool={selectedPool}
        currentUser={currentUser}
        users={users}
        onSwitchUser={setCurrentUser}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onOpenAdminPortal={() => setViewMode('admin_portal')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Week Selector Bar */}
        {weeks.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold font-sport uppercase tracking-wider pl-1 pr-2 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Jornada:</span>
            </div>
            {weeks.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWeek(w)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all flex-shrink-0 active:scale-95 ${
                  selectedWeek?.id === w.id
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/70 ring-1 ring-indigo-400/60'
                    : 'bg-[#0E132A] hover:bg-[#161C3D] text-slate-300 border border-indigo-500/15'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab Switcher (Mobile First segmented buttons) */}
        <div className="grid grid-cols-3 p-1 bg-[#0D1024] rounded-2xl border border-indigo-500/20 shadow-xl">
          <button
            onClick={() => setActiveTab('picks')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'picks'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60 ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-indigo-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Pronosticar</span>
          </button>

          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'standings'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60 ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-indigo-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Posiciones</span>
          </button>

          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
              activeTab === 'breakdown'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60 ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-indigo-200'
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

      {/* Join / Quick Register Modal */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        defaultInviteCode={urlInviteCode || selectedPool?.invite_code}
        onUserRegistered={handleUserRegistered}
      />
    </div>
  );
}
