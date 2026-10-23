import React, { useState, useEffect } from 'react';
import {
  Shield, KeyRound, Save, Sun, Moon, RefreshCw, UserPlus, Users, Trash2,
  Share2, ArrowLeft, Check, AlertCircle, CheckCircle, Clock,
  FileCheck2, ListOrdered, CheckCircle2, ChevronRight, Trophy, Sparkles, Award
} from 'lucide-react';
import { NflBallIcon, SoccerBallIcon } from './SportsIcons';
import { api } from '../services/api';

export default function AdminPortal({
  onBackToApp,
  currentLeague = 'NFL',
  pools = [],
  theme = 'dark',
  onToggleTheme
}) {
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('quiniela_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Login form state
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('admin');
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tabs: 'user_predictions' | 'quick_points' | 'bulk_results' | 'participants' | 'invites' | 'security'
  const [portalTab, setPortalTab] = useState('user_predictions');

  // Selected tournament and week in admin
  const [selectedPoolId, setSelectedPoolId] = useState(() => {
    const match = pools.find(p => p.tournament?.league?.code === currentLeague) || pools[0];
    return match ? match.id : null;
  });
  const [adminWeeks, setAdminWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [adminMatches, setAdminMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // User predictions capture state
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [participantPicks, setParticipantPicks] = useState({});
  const [isSavingPicks, setIsSavingPicks] = useState(false);
  const [picksSaveMsg, setPicksSaveMsg] = useState(null);

  // Quick points adjustment state
  const [pointsParticipants, setPointsParticipants] = useState([]);
  const [pointsInputs, setPointsInputs] = useState({});
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [isSavingPoints, setIsSavingPoints] = useState(false);
  const [pointsMsg, setPointsMsg] = useState(null);

  // Bulk match scores state
  const [matchScores, setMatchScores] = useState({});
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [bulkSaveMessage, setBulkSaveMessage] = useState(null);

  // Participants management state
  const [participants, setParticipants] = useState([]);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [enrollNfl, setEnrollNfl] = useState(true);
  const [enrollLmx, setEnrollLmx] = useState(true);
  const [participantMessage, setParticipantMessage] = useState(null);
  const [editingPinUserId, setEditingPinUserId] = useState(null);
  const [newParticipantPin, setNewParticipantPin] = useState('');

  // Change password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // ESPN sync state
  const [isSyncingEspn, setIsSyncingEspn] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [espnMessage, setEspnMessage] = useState(null);

  // 1. Initialize selectedPoolId when pools arrive
  useEffect(() => {
    if (pools.length > 0 && !selectedPoolId) {
      const match = pools.find(p => p.tournament?.league?.code === currentLeague) || pools[0];
      if (match) setSelectedPoolId(match.id);
    }
  }, [pools, currentLeague]);

  // Current pool info
  const currentPool = pools.find(p => p.id === selectedPoolId) || pools[0];
  const currentLeagueCode = currentPool?.tournament?.league?.code || (currentPool?.invite_code?.includes('LMX') ? 'LMX' : 'NFL');
  const isSoccer = currentLeagueCode === 'LMX';

  // 2. Fetch weeks for the selected tournament
  useEffect(() => {
    let active = true;
    async function loadTournamentWeeks() {
      if (!currentPool?.tournament?.id) return;
      try {
        const data = await api.getWeeks(currentPool.tournament.id);
        if (!active) return;
        if (data && data.length > 0) {
          setAdminWeeks(data);
          // Prioritize open week with matches, or any week with matches, or last week
          const openWithMatches = data.find(w => !w.is_closed && (w.matches_count > 0 || w.matches_count === undefined));
          const openWeek = data.find(w => !w.is_closed);
          const anyWithMatches = [...data].reverse().find(w => w.matches_count > 0);
          const target = openWithMatches || openWeek || anyWithMatches || data[data.length - 1];
          setSelectedWeekId(target.id);
        } else {
          setAdminWeeks([]);
          setSelectedWeekId(null);
        }
      } catch (err) {
        console.error("Error loading tournament weeks", err);
      }
    }
    if (adminUser) {
      loadTournamentWeeks();
    }
    return () => { active = false; };
  }, [selectedPoolId, adminUser]);

  // 3. Load matches when selectedWeekId changes
  useEffect(() => {
    let active = true;
    async function loadMatches() {
      if (!selectedWeekId) {
        setAdminMatches([]);
        return;
      }
      setIsLoadingMatches(true);
      try {
        const data = await api.getMatches(selectedWeekId);
        if (!active) return;
        if (data) {
          setAdminMatches(data);
          const initial = {};
          data.forEach(m => {
            initial[m.id] = {
              home_score: m.home_score !== null ? m.home_score : '',
              away_score: m.away_score !== null ? m.away_score : '',
              status: m.status || 'SCHEDULED'
            };
          });
          setMatchScores(initial);
        }
      } catch (err) {
        console.error("Error loading week matches", err);
      } finally {
        if (active) setIsLoadingMatches(false);
      }
    }
    if (adminUser && selectedWeekId) {
      loadMatches();
    }
    return () => { active = false; };
  }, [selectedWeekId, adminUser]);

  // 4. Load participants
  const loadParticipants = async () => {
    const data = await api.adminGetParticipants();
    setParticipants(data);
    if (data.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(data[0].id.toString());
    }
  };

  useEffect(() => {
    if (adminUser) {
      loadParticipants();
    }
  }, [adminUser]);

  // 5. Load participant picks for the selected week
  useEffect(() => {
    async function loadPicksForUser() {
      if (!selectedParticipantId || !selectedPoolId || !selectedWeekId) return;
      try {
        const matrix = await api.adminGetPredictionsMatrix(selectedPoolId, selectedWeekId);
        if (matrix && matrix.participants) {
          const found = matrix.participants.find(p => p.user_id.toString() === selectedParticipantId.toString());
          if (found && found.picks) {
            setParticipantPicks(found.picks);
          } else {
            setParticipantPicks({});
          }
        }
      } catch {
        setParticipantPicks({});
      }
    }
    if (adminUser) {
      loadPicksForUser();
    }
  }, [selectedParticipantId, selectedPoolId, selectedWeekId, adminUser]);

  // 6. Load Quick Points when tab is quick_points
  const loadQuickPoints = async () => {
    if (!selectedPoolId) return;
    setIsLoadingPoints(true);
    setPointsMsg(null);
    try {
      const res = await api.adminGetPoolPoints(selectedPoolId);
      if (res && res.participants) {
        setPointsParticipants(res.participants);
        const inputs = {};
        res.participants.forEach(p => {
          inputs[p.user_id] = p.manual_points > 0 ? p.manual_points : p.effective_total;
        });
        setPointsInputs(inputs);
      }
    } catch {
      setPointsMsg({ error: 'Error al consultar puntos' });
    } finally {
      setIsLoadingPoints(false);
    }
  };

  useEffect(() => {
    if (adminUser && portalTab === 'quick_points') {
      loadQuickPoints();
    }
  }, [selectedPoolId, portalTab, adminUser]);

  // Save Quick Points
  const handleSaveQuickPoints = async () => {
    if (!selectedPoolId) return;
    setIsSavingPoints(true);
    setPointsMsg(null);
    try {
      const payload = Object.entries(pointsInputs).map(([userId, val]) => ({
        user_id: parseInt(userId),
        manual_points: parseInt(val) || 0
      }));
      const res = await api.adminSavePoolPoints(selectedPoolId, payload);
      if (res.success) {
        setPointsMsg({ success: res.message || 'Puntos del leaderboard actualizados con éxito.' });
        loadQuickPoints();
      } else {
        setPointsMsg({ error: res.error || 'Error al guardar puntos' });
      }
    } catch {
      setPointsMsg({ error: 'Error de conexión al guardar puntos' });
    } finally {
      setIsSavingPoints(false);
    }
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin(loginUser, loginPass);
      if (res.error) {
        setLoginError(res.error);
      } else {
        const adminData = res.admin_user || res.user || { name: loginUser };
        setAdminUser(adminData);
        localStorage.setItem('quiniela_admin_session', JSON.stringify(adminData));
      }
    } catch {
      setLoginError('Error al contactar el servidor de administración.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('quiniela_admin_session');
  };

  // Pick Setting in Admin
  const handleSetPickForMatch = (matchId, pickVal) => {
    setParticipantPicks(prev => {
      const next = { ...prev };
      if (next[matchId] === pickVal) {
        delete next[matchId];
      } else {
        next[matchId] = pickVal;
      }
      return next;
    });
  };

  const handleSaveParticipantPicks = async () => {
    if (!selectedParticipantId || !selectedPoolId) return;
    setIsSavingPicks(true);
    setPicksSaveMsg(null);
    try {
      const res = await api.adminSaveParticipantPredictions(
        selectedPoolId,
        parseInt(selectedParticipantId),
        participantPicks
      );
      if (res.success) {
        setPicksSaveMsg({ success: res.message || 'Pronósticos guardados con éxito' });
      } else {
        setPicksSaveMsg({ error: res.error || 'Error al guardar los pronósticos' });
      }
    } catch {
      setPicksSaveMsg({ error: 'Error de conexión con el servidor' });
    } finally {
      setIsSavingPicks(false);
    }
  };

  // Bulk Scores Saving
  const handleSaveBulkResults = async () => {
    setIsSavingScores(true);
    setBulkSaveMessage(null);
    try {
      const payload = Object.entries(matchScores).map(([matchId, data]) => ({
        match_id: parseInt(matchId),
        home_score: data.home_score === '' ? null : parseInt(data.home_score),
        away_score: data.away_score === '' ? null : parseInt(data.away_score),
        status: data.status || 'SCHEDULED'
      }));

      const res = await api.adminBulkResults(payload);
      if (res.success) {
        setBulkSaveMessage({ success: res.message });
        if (selectedWeekId) {
          const data = await api.getMatches(selectedWeekId);
          if (data) setAdminMatches(data);
        }
      } else {
        setBulkSaveMessage({ error: res.error || 'Error al guardar marcadores' });
      }
    } catch {
      setBulkSaveMessage({ error: 'Error de red al actualizar marcadores' });
    } finally {
      setIsSavingScores(false);
    }
  };

  // Database Repair
  const handleRepairDatabase = async () => {
    if (!window.confirm("¿Deseas restaurar la base de datos a los torneos oficiales 2026? Esto eliminará partidos viejos y sincronizará los marcadores reales.")) return;
    setIsRepairing(true);
    setEspnMessage(null);
    try {
      const res = await api.repairDatabase();
      if (res.status === 'ok') {
        setEspnMessage({ success: 'Base de datos restaurada y sincronizada al 100% con torneos 2026.' });
        if (selectedWeekId) {
          const data = await api.getMatches(selectedWeekId);
          if (data) setAdminMatches(data);
        }
      } else {
        setEspnMessage({ error: res.error || 'Error al restaurar' });
      }
    } catch {
      setEspnMessage({ error: 'Fallo de red al restaurar' });
    } finally {
      setIsRepairing(false);
    }
  };

  // Sync current week with ESPN
  const handleSyncEspn = async () => {
    setIsSyncingEspn(true);
    setEspnMessage(null);
    try {
      const currentWeek = adminWeeks.find(w => w.id === selectedWeekId);
      const res = await api.syncEspn(currentLeagueCode, currentWeek?.week_number);
      if (res.error) {
        setEspnMessage({ error: res.error });
      } else {
        setEspnMessage({ success: `Se sincronizaron ${res.matches_updated || 0} partidos de ESPN con éxito.` });
        if (selectedWeekId) {
          const data = await api.getMatches(selectedWeekId);
          if (data) setAdminMatches(data);
        }
      }
    } catch {
      setEspnMessage({ error: 'Fallo al contactar el servicio de ESPN' });
    } finally {
      setIsSyncingEspn(false);
    }
  };

  // Participant Management
  const handleCreateParticipant = async (e) => {
    e.preventDefault();
    setParticipantMessage(null);
    if (!newName.trim() || !newUsername.trim() || !newPassword) {
      setParticipantMessage({ error: 'Completa todos los campos.' });
      return;
    }
    const poolCodes = [];
    if (enrollNfl) poolCodes.push('NFL-FAMILIA');
    if (enrollLmx) poolCodes.push('LMX-FAMILIA');

    try {
      const res = await api.adminCreateParticipant(
        newName.trim(),
        newUsername.toLowerCase().trim(),
        newPassword,
        poolCodes
      );
      if (res.error) {
        setParticipantMessage({ error: res.error });
      } else {
        setParticipantMessage({ success: `¡Participante ${res.user.display_name} dado de alta con éxito!` });
        setNewName('');
        setNewUsername('');
        setNewPassword('1234');
        loadParticipants();
      }
    } catch {
      setParticipantMessage({ error: 'Error al registrar participante.' });
    }
  };

  const handleResetPin = async (userId) => {
    if (!newParticipantPin.trim()) return;
    try {
      const res = await api.adminResetParticipantPin(userId, newParticipantPin.trim());
      if (res.success) {
        alert(res.message);
        setEditingPinUserId(null);
        setNewParticipantPin('');
      } else {
        alert(res.error || 'Error al actualizar PIN');
      }
    } catch {
      alert('Error de red');
    }
  };

  const handleDeleteParticipant = async (userId, name) => {
    if (!window.confirm(`¿Estás seguro de dar de baja a ${name}? Se borrarán sus pronósticos.`)) return;
    try {
      await api.adminDeleteParticipant(userId);
      loadParticipants();
    } catch {
      alert('Error al dar de baja');
    }
  };

  // Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg(null);
    if (!currentPass || !newPass) {
      setPassMsg({ error: 'Todos los campos son requeridos.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ error: 'La nueva contraseña y la confirmación no coinciden.' });
      return;
    }
    if (newPass.length < 4) {
      setPassMsg({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.adminChangePassword(currentPass, newPass, adminUser?.username || 'admin');
      if (res.error) {
        setPassMsg({ error: res.error });
      } else {
        setPassMsg({ success: '¡Contraseña de administrador actualizada con éxito!' });
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      }
    } catch {
      setPassMsg({ error: 'Error al cambiar contraseña' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // --- VISTA 1: LOGIN DE ADMINISTRADOR ---
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-stadium-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-full max-w-sm bg-white dark:bg-stadium-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la App</span>
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 p-0.5 mx-auto mb-3 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-950/50">
              <div className="w-full h-full bg-indigo-50 dark:bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
                <Shield className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h2 className="text-xl font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
              Portal de Administración
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-200/80 mt-1 font-medium">
              Acceso exclusivo para gestión de pronósticos y resultados
            </p>
          </div>

          {loginError && (
            <div className="mb-4 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 p-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Usuario Administrador
              </label>
              <input
                type="text"
                required
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-600/30 disabled:opacity-50 ring-1 ring-indigo-400/40"
            >
              {isLoggingIn ? 'Verificando...' : 'Ingresar al Panel de Control'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA 2: PANEL DE ADMINISTRACIÓN COMPLETO ---
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-stadium-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      {/* Admin Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gradient-to-r dark:from-[#0C0F22]/95 dark:via-[#131130]/95 dark:to-[#0F142A]/95 backdrop-blur-md border-b border-slate-200 dark:border-indigo-500/20 shadow-md dark:shadow-xl dark:shadow-indigo-950/40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#121630] dark:hover:bg-[#181D3E] text-xs font-semibold text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-indigo-500/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la App</span>
            </button>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white hidden sm:inline">
                Panel de Administración
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#121630] hover:bg-slate-200 dark:hover:bg-[#1A2045] text-slate-700 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/20 text-xs transition"
                title="Cambiar tema claro/oscuro"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Admin: {adminUser.name}</span>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-rose-300 dark:border-rose-500/20 transition font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* League and Week Filter Bar */}
        <div className="bg-white dark:bg-stadium-900 rounded-3xl p-4 border border-slate-200 dark:border-white/5 shadow-md flex flex-wrap items-center justify-between gap-3">
          {/* Torneo Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-sport uppercase font-bold text-slate-500 dark:text-slate-400">Torneo:</span>
            {pools.map(p => {
              const pIsLmx = p.tournament?.league?.code === 'LMX' || p.invite_code?.includes('LMX');
              const isSelected = selectedPoolId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPoolId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sport uppercase font-bold transition active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-stadium-800 text-slate-700 dark:text-slate-300 dark:hover:bg-stadium-700'
                  }`}
                >
                  {pIsLmx ? <SoccerBallIcon className="w-3.5 h-3.5" /> : <NflBallIcon className="w-3.5 h-3.5" />}
                  <span>{p.tournament?.name || p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Week Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-sport uppercase font-bold text-slate-500 dark:text-slate-400">Jornada:</span>
            <select
              value={selectedWeekId || ''}
              onChange={e => setSelectedWeekId(parseInt(e.target.value))}
              className="bg-slate-100 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white font-sport uppercase font-bold outline-none"
            >
              {adminWeeks.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs inside Admin */}
        <div className="grid grid-cols-2 sm:grid-cols-6 p-1 bg-white dark:bg-stadium-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-md gap-1">
          <button
            onClick={() => setPortalTab('user_predictions')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'user_predictions'
                ? 'bg-indigo-50 dark:bg-stadium-800 text-indigo-700 dark:text-indigo-300 shadow border border-indigo-200 dark:border-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Picks</span>
          </button>

          <button
            onClick={() => setPortalTab('quick_points')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'quick_points'
                ? 'bg-amber-50 dark:bg-stadium-800 text-amber-600 dark:text-amber-400 shadow border border-amber-300 dark:border-amber-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Puntos Rápidos</span>
          </button>

          <button
            onClick={() => setPortalTab('bulk_results')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'bulk_results'
                ? 'bg-emerald-50 dark:bg-stadium-800 text-emerald-700 dark:text-turf-400 shadow border border-emerald-200 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Marcadores</span>
          </button>

          <button
            onClick={() => setPortalTab('participants')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'participants'
                ? 'bg-blue-50 dark:bg-stadium-800 text-blue-700 dark:text-blue-400 shadow border border-blue-200 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Integrantes ({participants.length})</span>
          </button>

          <button
            onClick={() => setPortalTab('invites')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'invites'
                ? 'bg-purple-50 dark:bg-stadium-800 text-purple-700 dark:text-purple-400 shadow border border-purple-200 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Invitaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('security')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'security'
                ? 'bg-indigo-50 dark:bg-stadium-800 text-indigo-700 dark:text-indigo-300 shadow border border-indigo-200 dark:border-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Seguridad</span>
          </button>
        </div>

        {/* --- TAB 1: CARGA DE PRONÓSTICOS DE LOS INTEGRANTES --- */}
        {portalTab === 'user_predictions' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-stadium-900 rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Cargar Pronósticos de los Integrantes ({currentPool?.name})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Selecciona a un integrante del grupo y marca los pronósticos que envió por WhatsApp para esta jornada.
                </p>
              </div>

              {/* Selector de Participante */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <span className="text-xs font-sport uppercase font-bold text-slate-500 dark:text-slate-400">Participante:</span>
                {participants.length === 0 ? (
                  <span className="text-xs text-indigo-600 dark:text-indigo-300">No hay participantes aún. Da de alta a uno en la pestaña Integrantes.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedParticipantId(p.id.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
                          selectedParticipantId === p.id.toString()
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-stadium-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-stadium-800 border border-slate-200 dark:border-white/5'
                        }`}
                      >
                        {p.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Empty state if week has no matches */}
            {adminMatches.length === 0 && (
              <div className="bg-white dark:bg-stadium-900 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-xl text-center space-y-4">
                <Clock className="w-10 h-10 text-indigo-400 mx-auto opacity-60" />
                <h4 className="text-sm font-black font-sport uppercase text-slate-800 dark:text-slate-200">
                  Esta jornada no tiene partidos cargados aún
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Puedes sincronizar automáticamente los partidos y fechas oficiales de esta jornada directamente desde ESPN.
                </p>
                <button
                  onClick={handleSyncEspn}
                  disabled={isSyncingEspn}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black font-sport uppercase tracking-wider shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {isSyncingEspn ? 'Sincronizando de ESPN...' : 'Sincronizar Partidos de esta Jornada con ESPN'}
                </button>
              </div>
            )}

            {/* Cuadrícula de Partidos para marcar picks */}
            {selectedParticipantId && adminMatches.length > 0 && (
              <div className="bg-white dark:bg-stadium-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold font-sport uppercase text-slate-800 dark:text-slate-300">
                    Marcando picks para: {participants.find(p => p.id.toString() === selectedParticipantId)?.display_name} ({adminWeeks.find(w => w.id === selectedWeekId)?.name})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {Object.keys(participantPicks).length} de {adminMatches.length} seleccionados
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {adminMatches.map((m) => {
                    const chosen = participantPicks[m.id];

                    return (
                      <div key={m.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        {/* Equipos con escudos oficiales */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate text-right">
                              {m.home_team.short_name || m.home_team.name}
                            </span>
                            {m.home_team.logo_url ? (
                              <img src={m.home_team.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                            ) : (
                              isSoccer ? <SoccerBallIcon className="w-5 h-5 text-slate-400" /> : <NflBallIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          <span className="text-xs font-black font-sport text-slate-400 dark:text-slate-500">VS</span>

                          <div className="flex items-center gap-2 flex-1">
                            {m.away_team.logo_url ? (
                              <img src={m.away_team.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                            ) : (
                              isSoccer ? <SoccerBallIcon className="w-5 h-5 text-slate-400" /> : <NflBallIcon className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {m.away_team.short_name || m.away_team.name}
                            </span>
                          </div>
                        </div>

                        {/* Botones de Selección Rápida */}
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pick Local */}
                          <button
                            type="button"
                            onClick={() => handleSetPickForMatch(m.id, 'HOME')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
                              chosen === 'HOME'
                                ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                                : 'bg-slate-100 dark:bg-stadium-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-stadium-800 border border-slate-200 dark:border-white/5'
                            }`}
                          >
                            {m.home_team.short_name || 'Local'}
                          </button>

                          {/* Pick Empate (solo Liga MX) */}
                          {isSoccer && (
                            <button
                              type="button"
                              onClick={() => handleSetPickForMatch(m.id, 'DRAW')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
                                chosen === 'DRAW'
                                  ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400'
                                  : 'bg-slate-100 dark:bg-stadium-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-stadium-800 border border-slate-200 dark:border-white/5'
                              }`}
                            >
                              Empate
                            </button>
                          )}

                          {/* Pick Visita */}
                          <button
                            type="button"
                            onClick={() => handleSetPickForMatch(m.id, 'AWAY')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
                              chosen === 'AWAY'
                                ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                                : 'bg-slate-100 dark:bg-stadium-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-stadium-800 border border-slate-200 dark:border-white/5'
                            }`}
                          >
                            {m.away_team.short_name || 'Visita'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer de Guardado */}
                <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-t border-slate-200 dark:border-white/5 space-y-3">
                  {picksSaveMsg && (
                    <div className={`text-xs p-3 rounded-xl border ${
                      picksSaveMsg.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}>
                      {picksSaveMsg.success || picksSaveMsg.error}
                    </div>
                  )}

                  <button
                    disabled={isSavingPicks}
                    onClick={handleSaveParticipantPicks}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingPicks
                        ? 'Guardando Pronósticos...'
                        : `Guardar Pronósticos de ${participants.find(p => p.id.toString() === selectedParticipantId)?.display_name}`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: AJUSTE RÁPIDO DE PUNTOS (LEADERBOARD) --- */}
        {portalTab === 'quick_points' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-stadium-900 rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
                    Ajuste Rápido de Puntos ({currentPool?.name})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pon el Leaderboard al día al instante asignando los puntos acumulados que lleva en realidad cada integrante.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                💡 <strong>¿Cómo funciona?</strong> Si aún no has capturado los partidos de las semanas pasadas, simplemente escribe aquí el puntaje real de cada familiar. El leaderboard y los podios se actualizarán de inmediato. Más adelante podrás capturar los picks pasados con calma.
              </div>
            </div>

            {/* Tabla de Integrantes para Ajuste Directo */}
            <div className="bg-white dark:bg-stadium-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold font-sport uppercase text-slate-800 dark:text-slate-300">
                  Integrantes en {currentPool?.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {pointsParticipants.length} participantes
                </span>
              </div>

              {isLoadingPoints ? (
                <div className="p-8 text-center text-xs text-slate-500">Cargando puntos de la quiniela...</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {pointsParticipants.map((p) => {
                    const currentVal = pointsInputs[p.user_id] ?? (p.manual_points || 0);

                    return (
                      <div key={p.user_id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        {/* Participante Info */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: p.avatar_color || '#6366F1' }}
                          >
                            {(p.display_name || p.username)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">{p.display_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">@{p.username}</p>
                          </div>
                        </div>

                        {/* Puntos en Sistema vs Input */}
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 block font-sport uppercase">Por picks:</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">{p.calculated_hits} pts</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-sport uppercase font-bold">
                              Puntos:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPointsInputs(prev => ({
                                  ...prev,
                                  [p.user_id]: val === '' ? '' : parseInt(val)
                                }));
                              }}
                              className="w-16 h-10 text-center bg-slate-100 dark:bg-stadium-950 border border-slate-300 dark:border-indigo-500/30 rounded-xl text-sm font-mono font-black text-indigo-600 dark:text-indigo-300 focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón de Guardado de Puntos */}
              <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-t border-slate-200 dark:border-white/5 space-y-3">
                {pointsMsg && (
                  <div className={`text-xs p-3 rounded-xl border ${
                    pointsMsg.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}>
                    {pointsMsg.success || pointsMsg.error}
                  </div>
                )}

                <button
                  disabled={isSavingPoints}
                  onClick={handleSaveQuickPoints}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-amber-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPoints ? 'Actualizando Leaderboard...' : 'Guardar y Actualizar Leaderboard'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: MARCADORES FINALES & ESPN --- */}
        {portalTab === 'bulk_results' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Barra de Acciones Globales */}
            <div className="bg-white dark:bg-stadium-900 rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
                    Sincronización Automática con ESPN
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Descarga automáticamente los marcadores finales oficiales en vivo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isSyncingEspn}
                    onClick={handleSyncEspn}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black font-sport uppercase tracking-wider transition active:scale-95 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEspn ? 'animate-spin' : ''}`} />
                    <span>{isSyncingEspn ? 'Sincronizando...' : 'Sincronizar ESPN'}</span>
                  </button>

                  <button
                    disabled={isRepairing}
                    onClick={handleRepairDatabase}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-stadium-800 dark:hover:bg-stadium-700 text-slate-700 dark:text-slate-200 text-xs font-bold font-sport uppercase tracking-wider transition active:scale-95 border border-slate-300 dark:border-white/10"
                    title="Restaurar a temporada oficial 2026 y limpiar partidos obsoletos"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Restaurar 2026</span>
                  </button>
                </div>
              </div>

              {espnMessage && (
                <div className={`text-xs p-3 rounded-2xl border ${
                  espnMessage.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {espnMessage.success || espnMessage.error}
                </div>
              )}
            </div>

            {/* Lista de Partidos de la Semana */}
            <div className="bg-white dark:bg-stadium-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold font-sport uppercase text-slate-800 dark:text-slate-300">
                  {adminWeeks.find(w => w.id === selectedWeekId)?.name || 'Jornada Actual'} ({adminMatches.length} partidos)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Captura manual de marcadores
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {adminMatches.map((m) => {
                  const data = matchScores[m.id] || { home_score: '', away_score: '', status: 'SCHEDULED' };
                  const isDone = data.status === 'FINAL';

                  return (
                    <div key={m.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                      {/* Equipos */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate text-right">
                            {m.home_team.short_name || m.home_team.name}
                          </span>
                          {m.home_team.logo_url && (
                            <img src={m.home_team.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                          )}
                        </div>

                        <span className="text-xs font-black font-sport text-slate-400 dark:text-slate-500">VS</span>

                        <div className="flex items-center gap-2 flex-1">
                          {m.away_team.logo_url && (
                            <img src={m.away_team.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {m.away_team.short_name || m.away_team.name}
                          </span>
                        </div>
                      </div>

                      {/* Inputs de Marcador y Estado */}
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          placeholder="L"
                          value={data.home_score}
                          onChange={e => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], home_score: e.target.value }
                          }))}
                          className="w-12 h-9 text-center bg-slate-100 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl text-sm font-mono font-black text-indigo-600 dark:text-indigo-200 focus:border-indigo-500 outline-none"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          placeholder="V"
                          value={data.away_score}
                          onChange={e => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], away_score: e.target.value }
                          }))}
                          className="w-12 h-9 text-center bg-slate-100 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl text-sm font-mono font-black text-indigo-600 dark:text-indigo-200 focus:border-indigo-500 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], status: isDone ? 'SCHEDULED' : 'FINAL' }
                          }))}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold font-sport uppercase tracking-wider transition ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-stadium-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                          }`}
                        >
                          {isDone ? 'Finalizado' : 'Marcar Final'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón de Guardado Masivo */}
              <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-t border-slate-200 dark:border-white/5 space-y-3">
                {bulkSaveMessage && (
                  <div className={`text-xs p-3 rounded-xl border ${
                    bulkSaveMessage.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}>
                    {bulkSaveMessage.success || bulkSaveMessage.error}
                  </div>
                )}

                <button
                  disabled={isSavingScores}
                  onClick={handleSaveBulkResults}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingScores ? 'Guardando y Recalculando Puntos...' : 'Guardar Todos los Resultados y Recalcular Puntos'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: GESTIÓN DE PARTICIPANTES --- */}
        {portalTab === 'participants' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Formulario de Alta Manual */}
            <div className="bg-white dark:bg-stadium-900 rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-turf-400" />
                <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
                  Dar de Alta a un Integrante Manualmente
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrégalo tú mismo si alguno de tus familiares prefiere que lo des de alta.
              </p>

              {participantMessage && (
                <div className={`text-xs p-3 rounded-xl border ${
                  participantMessage.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {participantMessage.success || participantMessage.error}
                </div>
              )}

              <form onSubmit={handleCreateParticipant} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nombre o Apodo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (!newUsername) {
                          setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Usuario *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      PIN Inicial (4 dígitos) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollNfl}
                      onChange={e => setEnrollNfl(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Inscribir en Quiniela NFL</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollLmx}
                      onChange={e => setEnrollLmx(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    <span>Inscribir en Quiniela Liga MX</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black font-sport uppercase tracking-wider shadow-md hover:from-blue-500 hover:to-indigo-500 transition active:scale-95"
                >
                  Registrar Integrante
                </button>
              </form>
            </div>

            {/* Lista de Participantes Registrados */}
            <div className="bg-white dark:bg-stadium-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-stadium-950/80 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold font-sport uppercase text-slate-800 dark:text-slate-300">
                  Integrantes del Grupo ({participants.length})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gestión de PINs y accesos
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {participants.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: p.profile?.avatar_color || '#6366F1' }}
                      >
                        {(p.display_name || p.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{p.display_name}</span>
                          {p.role === 'ADMIN' && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">@{p.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingPinUserId === p.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
                          <input
                            type="text"
                            placeholder="Nuevo PIN"
                            value={newParticipantPin}
                            onChange={e => setNewParticipantPin(e.target.value)}
                            className="w-24 bg-slate-100 dark:bg-stadium-950 border border-slate-300 dark:border-indigo-500/40 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleResetPin(p.id)}
                            className="px-2 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingPinUserId(null); setNewParticipantPin(''); }}
                            className="px-1.5 py-1 text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingPinUserId(p.id); setNewParticipantPin(''); }}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          title="Cambiar PIN de este participante"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteParticipant(p.id, p.display_name)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Dar de baja participante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: ENLACES DE INVITACIÓN --- */}
        {portalTab === 'invites' && (
          <div className="bg-white dark:bg-stadium-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-xl space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600 dark:text-blue-400" />
                Enlaces de Invitación al Grupo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Comparte estos enlaces en WhatsApp. Cada familiar escribe su propio nombre o apodo al entrar.
              </p>
            </div>

            <div className="space-y-4">
              {/* NFL Link */}
              <div className="bg-slate-50 dark:bg-stadium-950 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 font-sport uppercase">
                    <NflBallIcon className="w-4 h-4 text-blue-500" />
                    <span>Quiniela NFL (Pre NFL Familiar)</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 font-bold">
                    Código: NFL-FAMILIA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=NFL-FAMILIA`}
                    className="flex-1 bg-white dark:bg-stadium-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=NFL-FAMILIA`);
                      alert('Enlace NFL copiado!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-stadium-800 dark:hover:bg-stadium-700 text-xs font-bold text-slate-800 dark:text-white transition font-sport uppercase"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Liga MX Link */}
              <div className="bg-slate-50 dark:bg-stadium-950 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 font-sport uppercase">
                    <SoccerBallIcon className="w-4 h-4 text-emerald-500" />
                    <span>Quiniela Liga MX (Apertura 2026)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-turf-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-bold">
                    Código: LMX-FAMILIA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=LMX-FAMILIA`}
                    className="flex-1 bg-white dark:bg-stadium-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=LMX-FAMILIA`);
                      alert('Enlace Liga MX copiado!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-stadium-800 dark:hover:bg-stadium-700 text-xs font-bold text-slate-800 dark:text-white transition font-sport uppercase"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: SEGURIDAD Y CAMBIO DE CONTRASEÑA --- */}
        {portalTab === 'security' && (
          <div className="max-w-md mx-auto space-y-5 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-stadium-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
                    Cambiar Contraseña de Administrador
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Actualiza tu clave de acceso para proteger el portal.
                  </p>
                </div>
              </div>

              {passMsg && (
                <div className={`text-xs p-3 rounded-2xl border ${
                  passMsg.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {passMsg.success || passMsg.error}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Contraseña Actual *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-stadium-950 border border-slate-300 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-600/30 disabled:opacity-50 ring-1 ring-indigo-400/40 flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isChangingPass ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
