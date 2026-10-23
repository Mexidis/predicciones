import React, { useState, useEffect } from 'react';
import { UserPlus, KeyRound, X, CheckCircle, ShieldCheck, LogIn, Lock } from 'lucide-react';
import { api } from '../services/api';

export default function JoinModal({
  isOpen,
  onClose,
  defaultInviteCode,
  onUserRegistered,
  users = []
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(defaultInviteCode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtrar usuarios del grupo (excluir admin)
  const groupUsers = users.filter(u => u.username !== 'admin');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword('');
      // Si hay usuarios dados de alta, por defecto estar en modo Login
      setIsLogin(groupUsers.length > 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectQuickUser = (u) => {
    setUsername(u.username);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        if (!username.trim() || !password) {
          setError('Selecciona tu usuario e ingresa tu PIN.');
          setLoading(false);
          return;
        }

        const res = await api.login(username.trim().toLowerCase(), password);
        if (res.error) {
          setError(res.error || 'PIN o usuario incorrecto.');
        } else {
          onUserRegistered(res.user);
          onClose();
        }
      } else {
        const generatedUser = username.toLowerCase().trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!displayName.trim() || !password) {
          setError('Nombre y PIN son obligatorios.');
          setLoading(false);
          return;
        }

        const res = await api.register({
          username: generatedUser,
          display_name: displayName.trim(),
          password: password,
          invite_code: (inviteCode || defaultInviteCode || '').trim()
        });

        if (res.error) {
          setError(res.error);
        } else {
          onUserRegistered(res.user);
          onClose();
        }
      }
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stadium-900 border border-slate-200 dark:border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-full bg-slate-100 dark:bg-stadium-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 p-0.5 mx-auto mb-2.5 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-950/50">
            <div className="w-full h-full bg-indigo-50 dark:bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
              {isLogin ? (
                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
          </div>
          <h3 className="text-lg font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
            {isLogin ? 'Iniciar Mi Sesión' : 'Darse de Alta en el Grupo'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-indigo-200/80 mt-1 font-medium">
            {isLogin
              ? 'Identifícate con tu PIN para proteger tus pronósticos'
              : 'Regístrate con tu nombre familiar y código de invitación'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 p-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isLogin ? (
            /* --- MODO INICIO DE SESIÓN --- */
            <>
              {/* Selector Rápido de Familiar */}
              {groupUsers.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    ¿Quién eres en la familia?
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 dark:bg-[#090C1A] rounded-2xl border border-slate-200 dark:border-indigo-500/20">
                    {groupUsers.map(u => {
                      const isSelected = username.toLowerCase() === u.username.toLowerCase();
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectQuickUser(u)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md ring-1 ring-indigo-400'
                              : 'bg-white dark:bg-[#121630] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181D3E] border border-slate-200 dark:border-white/5'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                            style={{ backgroundColor: u.profile?.avatar_color || '#6366F1' }}
                          >
                            {(u.display_name || u.username)[0].toUpperCase()}
                          </span>
                          <span>{u.display_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Usuario Seleccionado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: patrick, titi, fabio..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tu PIN de Seguridad *
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-indigo-300/70">
                    (Por defecto: 1234)
                  </span>
                </div>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="PIN de 4 dígitos"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono tracking-widest"
                />
              </div>
            </>
          ) : (
            /* --- MODO REGISTRO / ALTA NUEVA --- */
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ¿Cómo te conocen en la familia? (Nombre o Apodo) *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (!username) {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Elige un PIN sencillo (4 números) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="ej: 1234"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Código de Quiniela
                </label>
                <input
                  type="text"
                  value={inviteCode || defaultInviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono font-bold uppercase outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-lg shadow-indigo-600/30 disabled:opacity-50 ring-1 ring-indigo-400/40 mt-1"
          >
            {loading ? 'Verificando...' : (isLogin ? 'Entrar a mis Quinielas' : 'Darse de Alta y Comenzar')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white underline font-medium"
          >
            {isLogin
              ? '¿No estás en la lista? Darse de alta en el grupo'
              : '¿Ya estás registrado? Inicia sesión con tu PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
