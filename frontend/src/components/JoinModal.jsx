import React, { useState, useEffect } from 'react';
import { UserPlus, KeyRound, X, CheckCircle, ShieldCheck, LogIn, Lock } from 'lucide-react';
import { api } from '../services/api';

export default function JoinModal({
  isOpen,
  onClose,
  defaultInviteCode,
  onUserRegistered
}) {
  const [isLogin, setIsLogin] = useState(true); // Por defecto Iniciar Sesión con PIN para los integrantes actuales
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(defaultInviteCode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword('');
      setDisplayName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Por favor escribe tu nombre o apodo.');
      setLoading(false);
      return;
    }

    if (!password || password.length < 4) {
      setError('El PIN debe tener al menos 4 números o caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // En login, permite entrar escribiendo su nombre o apodo
        const res = await api.login(cleanName, password);
        if (res.error) {
          setError(res.error || 'Nombre o PIN incorrecto.');
        } else {
          onUserRegistered(res.user);
          onClose();
        }
      } else {
        // En registro, genera usuario limpio a partir de su nombre
        const generatedUser = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const res = await api.register({
          username: generatedUser,
          display_name: cleanName,
          password: password,
          invite_code: (inviteCode || defaultInviteCode || '').trim()
        });

        if (res.error) {
          // Si el integrante ya existe en la base de datos, intentar iniciar sesión automáticamente con su PIN
          if (res.error.toLowerCase().includes('ya existe') || res.error.toLowerCase().includes('already exists')) {
            const loginAttempt = await api.login(cleanName, password);
            if (!loginAttempt.error && loginAttempt.user) {
              onUserRegistered(loginAttempt.user);
              onClose();
              return;
            }
          }
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
            {isLogin ? 'Iniciar Sesión' : 'Darse de Alta en el Grupo'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-indigo-200/80 mt-1 font-medium">
            {isLogin
              ? 'Ingresa tu nombre y PIN para acceder a tus pronósticos'
              : 'Regístrate desde cero con tu nombre y elige tu PIN personal'}
          </p>
        </div>

        {/* Selector de Pestaña Login / Registro */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#090C1A] rounded-2xl border border-slate-200 dark:border-indigo-500/20 mb-4">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              isLogin
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold font-sport uppercase tracking-wider transition ${
              !isLogin
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Darse de Alta
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 p-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nombre o Apodo */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isLogin ? 'Tu Nombre o Apodo *' : '¿Cómo te conocen en la familia? (Nombre o Apodo) *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ej: Patrick, Titi, Checo, Vanes..."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* PIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {isLogin ? 'Tu PIN de Seguridad *' : 'Elige tu PIN personal (4 dígitos) *'}
              </label>
              {!isLogin && (
                <span className="text-[10px] text-slate-400 dark:text-indigo-300/70">
                  (Para proteger tus picks)
                </span>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="4 dígitos o más"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#090C1A] border border-slate-300 dark:border-indigo-500/25 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-mono tracking-widest"
            />
          </div>

          {/* Código de Quiniela (solo en alta nueva) */}
          {!isLogin && (
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-lg shadow-indigo-600/30 disabled:opacity-50 ring-1 ring-indigo-400/40 mt-1"
          >
            {loading ? 'Verificando...' : (isLogin ? 'Entrar a mis Quinielas' : 'Darme de Alta y Comenzar')}
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
              ? '¿Primera vez aquí? Date de alta con tu nombre y PIN'
              : '¿Ya te diste de alta? Inicia sesión con tu PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
