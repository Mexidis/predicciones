const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export const api = {
  // Autenticación y Usuarios
  async getUsers() {
    try {
      const res = await fetch(`${API_BASE}/auth/users/`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("API offline, usando fallback local", e);
    }
    return null;
  },

  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return await res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async changeUserPin(userId, currentPin, newPin, username) {
    const res = await fetch(API_BASE + '/auth/change-pin/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, current_pin: currentPin, new_pin: newPin, username: username })
    });
    return await res.json();
  },

  // Pools
  async getPools(userId) {
    try {
      const url = userId ? `${API_BASE}/pools/?user_id=${userId}` : `${API_BASE}/pools/`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async joinPool(userId, inviteCode) {
    const res = await fetch(`${API_BASE}/pools/join/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, invite_code: inviteCode })
    });
    return await res.json();
  },

  // Partidos y Semanas
  async getWeeks(tournamentId) {
    try {
      const url = tournamentId ? `${API_BASE}/weeks/?tournament_id=${tournamentId}` : `${API_BASE}/weeks/`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getMatches(weekId, userId, poolId) {
    try {
      const url = `${API_BASE}/matches/?week_id=${weekId}&user_id=${userId || ''}&pool_id=${poolId || ''}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Guardar Pick
  async savePrediction(userId, poolId, matchId, pick) {
    const res = await fetch(`${API_BASE}/predictions/save/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, pool_id: poolId, match_id: matchId, pick })
    });
    return await res.json();
  },

  // Posiciones (Standings)
  async getPoolStandings(poolId, weekId) {
    try {
      const url = weekId ? `${API_BASE}/pools/${poolId}/standings/?week_id=${weekId}` : `${API_BASE}/pools/${poolId}/standings/`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Actividad y Monitoreo Admin
  async getPoolActivity(poolId, weekId) {
    try {
      const res = await fetch(`${API_BASE}/pools/${poolId}/activity/?week_id=${weekId || ''}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async sendReminder(poolId, weekId) {
    const res = await fetch(`${API_BASE}/pools/${poolId}/remind/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_id: weekId })
    });
    return await res.json();
  },

  // Sincronizar ESPN
  async syncEspn(leagueCode, weekNumber) {
    const res = await fetch(`${API_BASE}/sync/espn/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league: leagueCode, week: weekNumber })
    });
    return await res.json();
  },

  // Portal de Administración Exclusivo
  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE}/admin-portal/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return await res.json();
  },

  async adminGetParticipants() {
    try {
      const res = await fetch(`${API_BASE}/admin-portal/participants/`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async adminCreateParticipant(name, username, password, poolCodes) {
    const res = await fetch(`${API_BASE}/admin-portal/participants/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, pool_codes: poolCodes })
    });
    return await res.json();
  },

  async adminDeleteParticipant(userId) {
    const res = await fetch(`${API_BASE}/admin-portal/participants/${userId}/`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async adminBulkResults(matches) {
    const res = await fetch(`${API_BASE}/admin-portal/bulk-results/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches })
    });
    return await res.json();
  },

  async adminSaveParticipantPredictions(poolId, userId, picks) {
    const res = await fetch(`${API_BASE}/admin-portal/predictions/bulk-save/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_id: poolId, user_id: userId, picks })
    });
    return await res.json();
  },

  async adminGetPredictionsMatrix(poolId, weekId) {
    try {
      const res = await fetch(`${API_BASE}/admin-portal/predictions/matrix/?pool_id=${poolId}&week_id=${weekId}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { matches: [], participants: [] };
  }
,

  async adminChangePassword(currentPassword, newPassword, username = 'admin') {
    const res = await fetch(`${API_BASE}/admin-portal/change-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, username })
    });
    return await res.json();
  },

  async adminResetParticipantPin(userId, newPin) {
    const res = await fetch(`${API_BASE}/admin-portal/participants/${userId}/reset-pin/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_pin: newPin })
    });
    return await res.json();
  },

  async adminGetPoolPoints(poolId) {
    try {
      const res = await fetch(API_BASE + '/admin-portal/points/?pool_id=' + poolId);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { participants: [] };
  },

  async adminSavePoolPoints(poolId, points) {
    const res = await fetch(API_BASE + '/admin-portal/points/bulk-save/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_id: poolId, points })
    });
    return await res.json();
  }
};
