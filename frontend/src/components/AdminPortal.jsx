import React, { useState, useEffect } from 'react';
import {
  Shield, KeyRound, Save, RefreshCw, UserPlus, Users, Trash2,
  Share2, ArrowLeft, Check, AlertCircle, CheckCircle, Clock,
  FileCheck2, ListOrdered, CheckCircle2, ChevronRight
} from 'lucide-react';
import { NflBallIcon, SoccerBallIcon } from './SportsIcons';
import { api } from '../services/api';

export default function AdminPortal({
  onBackToApp,
  currentLeague,
  pools,
  weeks
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

  // Tabs: 'user_predictions' | 'bulk_results' | 'participants' | 'invites'
  const [portalTab, setPortalTab] = useState('user_predictions');

  // Selected tournament and week in admin
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [adminMatches, setAdminMatches] = useState([]);

  // User predictions capture state
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [participantPicks, setParticipantPicks] = useState({});
  const [isSavingPicks, setIsSavingPicks] = useState(false);
  const [picksSaveMsg, setPicksSaveMsg] = useState(null);

  // Change password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Participant pin edit state
  const [editingPinUserId, setEditingPinUserId] = useState(null);
  const [newParticipantPin, setNewParticipantPin] = useState('');

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

  // ESPN sync state
  const [isSyncingEspn, setIsSyncingEspn] = useState(false);
  const [espnMessage, setEspnMessage] = useState(null);

  // Initialize pool and week
  useEffect(() => {
    if (pools.length > 0 && !selectedPoolId) {
      const match = pools.find(p => p.tournament?.league?.code === currentLeague) || pools[0];
      setSelectedPoolId(match.id);
    }
  }, [pools, currentLeague]);

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const activeW = weeks.find(w => !w.is_closed) || weeks[weeks.length - 1];
      setSelectedWeekId(activeW.id);
    }
  }, [weeks]);

  // Load matches when week changes
  useEffect(() => {
    async function loadMatches() {
      if (!selectedWeekId) return;
      const data = await api.getMatches(selectedWeekId);
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
    }
    if (adminUser) {
      loadMatches();
    }
  }, [selectedWeekId, adminUser]);

  // Load registered participants
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

  // Load existing picks for the selected participant
  useEffect(() => {
    async function loadPicksForUser() {
      if (!selectedParticipantId || !selectedPoolId || !selectedWeekId) return;
      const matrix = await api.adminGetPredictionsMatrix(selectedPoolId, selectedWeekId);
      if (matrix && matrix.participants) {
        const found = matrix.participants.find(p => p.user_id.toString() === selectedParticipantId.toString());
        if (found && found.picks) {
          setParticipantPicks(found.picks);
        } else {
          setParticipantPicks({});
        }
      }
    }
    loadPicksForUser();
  }, [selectedParticipantId, selectedPoolId, selectedWeekId]);

  // Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin(loginUser, loginPass);
      if (res.error) {
        setLoginError(res.error);
      } else {
        setAdminUser(res.admin_user);
        localStorage.setItem('quiniela_admin_session', JSON.stringify(res.admin_user));
      }
    } catch {
      setLoginError('Error de conexión al servidor de administración');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('quiniela_admin_session');
    setAdminUser(null);
  };

  // Guardar pronósticos capturados para un participante
  const handleSaveParticipantPicks = async () => {
    if (!selectedParticipantId || !selectedPoolId) return;
    setIsSavingPicks(true);
    setPicksSaveMsg(null);

    try {
      const res = await api.adminSaveParticipantPredictions(
        selectedPoolId,
        selectedParticipantId,
        participantPicks
      );
      if (res.success) {
        setPicksSaveMsg({ success: res.message });
      } else {
        setPicksSaveMsg({ error: res.error || 'Error al guardar pronósticos' });
      }
    } catch {
      setPicksSaveMsg({ error: 'Error de conexión con el servidor' });
    } finally {
      setIsSavingPicks(false);
    }
  };

  const handleSetPickForMatch = (matchId, pickVal) => {
    setParticipantPicks(prev => ({
      ...prev,
      [matchId]: pickVal
    }));
  };

  // Guardar marcadores masivos
  const handleSaveBulkResults = async () => {
    setIsSavingScores(true);
    setBulkSaveMessage(null);

    const updates = [];
    Object.keys(matchScores).forEach(id => {
      const item = matchScores[id];
      if (item.home_score !== '' && item.away_score !== '') {
        updates.push({
          match_id: parseInt(id),
          home_score: parseInt(item.home_score),
          away_score: parseInt(item.away_score),
          status: item.status || 'FINAL'
        });
      }
    });

    if (updates.length === 0) {
      setBulkSaveMessage({ error: 'Ingresa al menos un marcador completo antes de guardar.' });
      setIsSavingScores(false);
      return;
    }

    try {
      const res = await api.adminBulkResults(updates);
      if (res.success) {
        setBulkSaveMessage({ success: res.message });
        const data = await api.getMatches(selectedWeekId);
        if (data) setAdminMatches(data);
      } else {
        setBulkSaveMessage({ error: res.error || 'Error al guardar marcadores' });
      }
    } catch {
      setBulkSaveMessage({ error: 'Error de red al actualizar marcadores' });
    } finally {
      setIsSavingScores(false);
    }
  };

  // Sincronización automática de resultados vía ESPN
  const handleSyncEspn = async () => {
    setIsSyncingEspn(true);
    setEspnMessage(null);
    try {
      const res = await api.syncEspn(currentLeague);
      if (res.error) {
        setEspnMessage({ error: res.error });
      } else {
        setEspnMessage({ success: `Se sincronizaron ${res.matches_updated || 0} partidos de ESPN con éxito.` });
        const data = await api.getMatches(selectedWeekId);
        if (data) setAdminMatches(data);
      }
    } catch {
      setEspnMessage({ error: 'Fallo al contactar el servicio de ESPN' });
    } finally {
      setIsSyncingEspn(false);
    }
  };

  // Cambiar contraseña de admin
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
      setPassMsg({ error: 'Error al conectar con el servidor.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Restablecer PIN de participante
  const handleResetPin = async (userId) => {
    if (!newParticipantPin.trim()) return;
    try {
      const res = await api.adminResetParticipantPin(userId, newParticipantPin.trim());
      if (res.error) {
        alert(res.error);
      } else {
        alert(res.message);
        setEditingPinUserId(null);
        setNewParticipantPin('');
      }
    } catch {
      alert('Error al actualizar PIN');
    }
  };

  // Crear participante manual
  const handleCreateParticipant = async (e) => {
    e.preventDefault();
    setParticipantMessage(null);

    const poolCodes = [];
    if (enrollNfl) poolCodes.push('NFL-FAMILIA');
    if (enrollLmx) poolCodes.push('LMX-FAMILIA');

    try {
      const res = await api.adminCreateParticipant(newName, newUsername, newPassword, poolCodes);
      if (res.error) {
        setParticipantMessage({ error: res.error });
      } else {
        setParticipantMessage({ success: res.message });
        setNewName('');
        setNewUsername('');
        setNewPassword('1234');
        loadParticipants();
      }
    } catch {
      setParticipantMessage({ error: 'Error al crear participante' });
    }
  };

  // Eliminar participante
  const handleDeleteParticipant = async (userId, name) => {
    if (!window.confirm(`¿Estás seguro de dar de baja a ${name}? Se borrarán sus pronósticos.`)) return;
    try {
      await api.adminDeleteParticipant(userId);
      loadParticipants();
    } catch {
      alert('Error al dar de baja');
    }
  };

  const currentPool = pools.find(p => p.id === selectedPoolId) || pools[0];
  const isSoccer = currentPool?.tournament?.league?.code === 'LMX';

  // --- VISTA 1: LOGIN DE ADMINISTRADOR ---
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-stadium-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-stadium-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la App</span>
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 p-0.5 mx-auto mb-3 shadow-lg shadow-indigo-950/50">
              <div className="w-full h-full bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
                <Shield className="w-7 h-7 text-indigo-400" />
              </div>
            </div>
            <h2 className="text-xl font-black font-sport uppercase tracking-wider text-white">
              Portal de Administración
            </h2>
            <p className="text-xs text-indigo-200/80 mt-1 font-medium">
              Acceso exclusivo para gestión de pronósticos y resultados
            </p>
          </div>

          {loginError && (
            <div className="mb-4 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Usuario Administrador
              </label>
              <input
                type="text"
                required
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-950/70 disabled:opacity-50 ring-1 ring-indigo-400/40"
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
    <div className="min-h-screen bg-stadium-950 text-slate-100 flex flex-col">
      {/* Admin Navbar */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0C0F22]/95 via-[#131130]/95 to-[#0F142A]/95 backdrop-blur-md border-b border-indigo-500/20 shadow-xl shadow-indigo-950/40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121630] hover:bg-[#181D3E] text-xs font-semibold text-slate-200 transition border border-indigo-500/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la App</span>
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h1 className="text-sm font-black font-sport uppercase tracking-wider text-white">
                Panel de Administración
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Admin: {adminUser.name}</span>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg border border-rose-500/20 transition font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* League and Week Filter Bar */}
        <div className="bg-stadium-900 rounded-3xl p-4 border border-white/5 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sport uppercase font-bold text-slate-400">Torneo:</span>
            {pools.map(p => {
              const isLmx = p.tournament?.league?.code === 'LMX';
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPoolId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sport uppercase font-bold transition ${
                    selectedPoolId === p.id
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md'
                      : 'bg-stadium-800 text-slate-300 hover:bg-stadium-700'
                  }`}
                >
                  {isLmx ? <SoccerBallIcon className="w-3.5 h-3.5" /> : <NflBallIcon className="w-3.5 h-3.5" />}
                  <span>{p.tournament?.name || p.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-sport uppercase font-bold text-slate-400">Jornada:</span>
            <select
              value={selectedWeekId || ''}
              onChange={e => setSelectedWeekId(parseInt(e.target.value))}
              className="bg-stadium-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-sport uppercase font-bold outline-none"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs inside Admin */}
        <div className="grid grid-cols-2 sm:grid-cols-5 p-1 bg-stadium-900 rounded-2xl border border-white/5 shadow-md gap-1">
          <button
            onClick={() => setPortalTab('user_predictions')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'user_predictions'
                ? 'bg-stadium-800 text-indigo-300 shadow border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Picks de Integrantes</span>
          </button>

          <button
            onClick={() => setPortalTab('bulk_results')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'bulk_results'
                ? 'bg-stadium-800 text-turf-400 shadow border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Marcadores Finales</span>
          </button>

          <button
            onClick={() => setPortalTab('participants')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'participants'
                ? 'bg-stadium-800 text-blue-400 shadow border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes ({participants.length})</span>
          </button>

          <button
            onClick={() => setPortalTab('invites')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              portalTab === 'invites'
                ? 'bg-stadium-800 text-purple-400 shadow border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Invitaciones</span>
          </button>
                  <button
            type="button"
            onClick={() => setPortalTab('security')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition col-span-2 sm:col-span-1 ${
              portalTab === 'security'
                ? 'bg-stadium-800 text-indigo-300 shadow border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Seguridad & Clave</span>
          </button>
        </div>

        {/* --- TAB 1: CARGA DE PRONÓSTICOS DE LOS INTEGRANTES --- */}
        {portalTab === 'user_predictions' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="bg-stadium-900 rounded-3xl p-5 border border-white/5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-400" />
                    Cargar Pronósticos de los Integrantes (WhatsApp)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecciona a un familiar y marca los pronósticos que envió al grupo de WhatsApp.
                  </p>
                </div>
              </div>

              {/* Selector de Participante */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs font-sport uppercase font-bold text-slate-400">Participante:</span>
                {participants.length === 0 ? (
                  <span className="text-xs text-indigo-300">No hay participantes aún. Da de alta a uno en la pestaña Participantes.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedParticipantId(p.id.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
                          selectedParticipantId === p.id.toString()
                            ? 'bg-turf-600 text-white shadow-md'
                            : 'bg-stadium-950 text-slate-300 hover:bg-stadium-800 border border-white/5'
                        }`}
                      >
                        {p.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cuadrícula de Partidos para marcar picks */}
            {selectedParticipantId && adminMatches.length > 0 && (
              <div className="bg-stadium-900 rounded-3xl border border-white/5 shadow-xl overflow-hidden">
                <div className="p-4 bg-stadium-950/80 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold font-sport uppercase text-slate-300">
                    Marcando picks para: {participants.find(p => p.id.toString() === selectedParticipantId)?.display_name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {Object.keys(participantPicks).length} de {adminMatches.length} seleccionados
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {adminMatches.map((m) => {
                    const chosen = participantPicks[m.id];

                    return (
                      <div key={m.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01]">
                        {/* Equipos */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-xs font-bold text-slate-100 truncate text-right">
                              {m.home_team.short_name || m.home_team.name}
                            </span>
                            <img src={m.home_team.logo_url} alt="" className="w-6 h-6 object-contain" />
                          </div>

                          <span className="text-xs font-black font-sport text-slate-500">VS</span>

                          <div className="flex items-center gap-2 flex-1">
                            <img src={m.away_team.logo_url} alt="" className="w-6 h-6 object-contain" />
                            <span className="text-xs font-bold text-slate-100 truncate">
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
                                ? 'bg-turf-600 text-white shadow-md ring-1 ring-turf-400'
                                : 'bg-stadium-950 text-slate-300 hover:bg-stadium-800 border border-white/5'
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
                                  ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                                  : 'bg-stadium-950 text-slate-300 hover:bg-stadium-800 border border-white/5'
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
                                ? 'bg-turf-600 text-white shadow-md ring-1 ring-turf-400'
                                : 'bg-stadium-950 text-slate-300 hover:bg-stadium-800 border border-white/5'
                            }`}
                          >
                            {m.away_team.short_name || 'Visita'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón de Guardado de Picks del Usuario */}
                <div className="p-4 bg-stadium-950/80 border-t border-white/5 space-y-3">
                  {picksSaveMsg && (
                    <div className={`text-xs p-3 rounded-xl border ${
                      picksSaveMsg.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}>
                      {picksSaveMsg.success || picksSaveMsg.error}
                    </div>
                  )}

                  <button
                    disabled={isSavingPicks}
                    onClick={handleSaveParticipantPicks}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingPicks ? 'Guardando pronósticos...' : 'Guardar Pronósticos de este Integrante'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: CARGA MASIVA DE RESULTADOS OFICIALES --- */}
        {portalTab === 'bulk_results' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-stadium-900 rounded-3xl p-5 border border-white/5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-white flex items-center gap-2">
                    <Save className="w-4 h-4 text-turf-400" />
                    Captura Masiva de Marcadores Finales
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ingresa los marcadores y al presionar "Guardar Todos" se calculan los aciertos de todos automáticamente.
                  </p>
                </div>

                <button
                  disabled={isSyncingEspn}
                  onClick={handleSyncEspn}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-sport uppercase font-bold transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEspn ? 'animate-spin' : ''}`} />
                  <span>{isSyncingEspn ? 'Sincronizando...' : 'Auto-Sincronizar ESPN'}</span>
                </button>
              </div>

              {espnMessage && (
                <div className={`text-xs p-3 rounded-xl border ${
                  espnMessage.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {espnMessage.success || espnMessage.error}
                </div>
              )}
            </div>

            {/* Match Bulk Editor Matrix */}
            <div className="bg-stadium-900 rounded-3xl border border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 bg-stadium-950/80 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold font-sport uppercase text-slate-300">
                  Partidos ({adminMatches.length})
                </span>
                <span className="text-[11px] text-slate-400">Marcador Local vs Visita</span>
              </div>

              <div className="divide-y divide-white/5">
                {adminMatches.map((m) => {
                  const state = matchScores[m.id] || { home_score: '', away_score: '', status: 'SCHEDULED' };
                  const isDone = state.status === 'FINAL';

                  return (
                    <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01]">
                      {/* Equipos */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-xs font-bold text-slate-100 truncate text-right">
                            {m.home_team.short_name || m.home_team.name}
                          </span>
                          <img src={m.home_team.logo_url} alt="" className="w-7 h-7 object-contain drop-shadow" />
                        </div>

                        <span className="text-xs font-black font-sport text-slate-500 px-1">VS</span>

                        <div className="flex items-center gap-2 flex-1">
                          <img src={m.away_team.logo_url} alt="" className="w-7 h-7 object-contain drop-shadow" />
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {m.away_team.short_name || m.away_team.name}
                          </span>
                        </div>
                      </div>

                      {/* Inputs de Marcador y Estatus */}
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="-"
                          value={state.home_score}
                          onChange={(e) => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], home_score: e.target.value }
                          }))}
                          className="w-12 h-9 text-center bg-stadium-950 border border-white/10 rounded-xl text-sm font-mono font-black text-indigo-200 focus:border-indigo-400 outline-none"
                        />

                        <span className="text-slate-500 font-bold">-</span>

                        <input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="-"
                          value={state.away_score}
                          onChange={(e) => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], away_score: e.target.value }
                          }))}
                          className="w-12 h-9 text-center bg-stadium-950 border border-white/10 rounded-xl text-sm font-mono font-black text-indigo-200 focus:border-indigo-400 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => setMatchScores(prev => ({
                            ...prev,
                            [m.id]: { ...prev[m.id], status: isDone ? 'SCHEDULED' : 'FINAL' }
                          }))}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold font-sport uppercase tracking-wider transition ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-stadium-800 text-slate-400 hover:text-white border border-white/5'
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
              <div className="p-4 bg-stadium-950/80 border-t border-white/5 space-y-3">
                {bulkSaveMessage && (
                  <div className={`text-xs p-3 rounded-xl border ${
                    bulkSaveMessage.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}>
                    {bulkSaveMessage.success || bulkSaveMessage.error}
                  </div>
                )}

                <button
                  disabled={isSavingScores}
                  onClick={handleSaveBulkResults}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingScores ? 'Guardando y Recalculando Puntos...' : 'Guardar Todos los Resultados y Recalcular Puntos'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: GESTIÓN DE PARTICIPANTES --- */}
        {portalTab === 'participants' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Formulario de Alta Manual */}
            <div className="bg-stadium-900 rounded-3xl p-5 border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-turf-400" />
                <h3 className="text-sm font-black font-sport uppercase tracking-wider text-white">
                  Dar de Alta a un Participante Manualmente
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Agrégalo tú mismo si alguno de tus familiares prefiere no registrarse por su cuenta.
              </p>

              {participantMessage && (
                <div className={`text-xs p-3 rounded-xl border ${
                  participantMessage.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {participantMessage.success || participantMessage.error}
                </div>
              )}

              <form onSubmit={handleCreateParticipant} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
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
                      className="w-full bg-stadium-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Usuario *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-stadium-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      PIN / Contraseña
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-stadium-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs text-slate-400 font-medium">Inscribir en:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollNfl}
                      onChange={e => setEnrollNfl(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <NflBallIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>NFL</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollLmx}
                      onChange={e => setEnrollLmx(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <SoccerBallIcon className="w-3.5 h-3.5 text-turf-400" />
                    <span>Liga MX</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-turf-600 hover:bg-turf-500 text-white font-bold font-sport uppercase tracking-wider text-xs transition active:scale-95 shadow-md shadow-emerald-950/30"
                >
                  Guardar e Inscribir Participante
                </button>
              </form>
            </div>

            {/* Lista de Participantes Registrados */}
            <div className="bg-stadium-900 rounded-3xl border border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 bg-stadium-950/80 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold font-sport uppercase text-slate-300">
                  Participantes Registrados ({participants.length})
                </span>
                <span className="text-[11px] text-slate-400">Dados de alta o vía invitación</span>
              </div>

              {participants.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aún no hay integrantes registrados.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {participants.map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.01]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stadium-800 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-300">
                          {p.display_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{p.display_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">@{p.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.pools.map((poolName, i) => (
                              <span key={i} className="text-[9px] bg-stadium-950 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                                {poolName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                                            <div className="flex items-center gap-1">
                        {editingPinUserId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="PIN"
                              value={newParticipantPin}
                              onChange={e => setNewParticipantPin(e.target.value)}
                              className="w-16 bg-stadium-950 border border-indigo-500/40 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleResetPin(p.id)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg font-sport"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingPinUserId(null); setNewParticipantPin(''); }}
                              className="px-1.5 py-1 text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setEditingPinUserId(p.id); setNewParticipantPin(''); }}
                            className="p-2 text-slate-400 hover:text-indigo-300 transition rounded-lg hover:bg-indigo-950/30"
                            title="Cambiar PIN o contraseña de este participante"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteParticipant(p.id, p.display_name)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-rose-950/30"
                          title="Dar de baja participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: ENLACES DE INVITACIÓN --- */}
        {portalTab === 'invites' && (
          <div className="bg-stadium-900 rounded-3xl p-6 border border-white/5 shadow-xl space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-black font-sport uppercase tracking-wider text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" />
                Enlaces de Invitación al Grupo
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparte estos enlaces en WhatsApp. Cada familiar escribe su propio nombre o apodo al entrar.
              </p>
            </div>

            <div className="space-y-4">
              {/* NFL Link */}
              <div className="bg-stadium-950 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2 font-sport uppercase">
                    <NflBallIcon className="w-4 h-4 text-blue-400" />
                    <span>Quiniela NFL (Pre NFL Familiar)</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                    Código: NFL-FAMILIA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=NFL-FAMILIA`}
                    className="flex-1 bg-stadium-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=NFL-FAMILIA`);
                      alert('Enlace NFL copiado!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-stadium-800 hover:bg-stadium-700 text-xs font-bold text-white transition font-sport uppercase"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Liga MX Link */}
              <div className="bg-stadium-950 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2 font-sport uppercase">
                    <SoccerBallIcon className="w-4 h-4 text-turf-400" />
                    <span>Quiniela Liga MX (Apertura 2026)</span>
                  </span>
                  <span className="text-[10px] font-mono text-turf-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    Código: LMX-FAMILIA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=LMX-FAMILIA`}
                    className="flex-1 bg-stadium-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=LMX-FAMILIA`);
                      alert('Enlace Liga MX copiado!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-stadium-800 hover:bg-stadium-700 text-xs font-bold text-white transition font-sport uppercase"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* --- TAB 5: SEGURIDAD Y CAMBIO DE CONTRASEÑA --- */}
        {portalTab === 'security' && (
          <div className="max-w-md mx-auto space-y-5 animate-in fade-in duration-150">
            <div className="bg-stadium-900 rounded-3xl p-6 border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-sport uppercase tracking-wider text-white">
                    Cambiar Contraseña de Administrador
                  </h3>
                  <p className="text-xs text-slate-400">
                    Actualiza tu clave de acceso para proteger el portal.
                  </p>
                </div>
              </div>

              {passMsg && (
                <div className={`text-xs p-3 rounded-2xl border ${
                  passMsg.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {passMsg.success || passMsg.error}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Contraseña Actual *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    className="w-full bg-stadium-950 border border-white/10 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full bg-stadium-950 border border-white/10 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full bg-stadium-950 border border-white/10 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-950/70 disabled:opacity-50 ring-1 ring-indigo-400/40 flex items-center justify-center gap-2 mt-2"
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
