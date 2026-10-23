import React, { useState } from 'react';
import { UserPlus, KeyRound, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function JoinModal({ isOpen, onClose, defaultInviteCode, onUserRegistered }) {
  const [isLogin, setIsLogin] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(defaultInviteCode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(username, password);
        if (res.error) {
          setError(res.error);
        } else {
          onUserRegistered(res.user);
          onClose();
        }
      } else {
        const generatedUser = username.toLowerCase().trim() || displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stadium-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-stadium-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 p-0.5 mx-auto mb-3 shadow-lg shadow-indigo-950/50">
            <div className="w-full h-full bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-indigo-300" />
            </div>
          </div>
          <h3 className="text-lg font-black font-sport uppercase tracking-wider text-white">
            {isLogin ? 'Entrar a la Quiniela' : 'Darse de Alta en el Grupo'}
          </h3>
          <p className="text-xs text-indigo-200/80 mt-1 font-medium">
            {isLogin
              ? 'Accede con tu nombre de usuario y PIN'
              : 'Ingresa tu nombre o apodo familiar para comenzar'}
          </p>
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                ¿Cómo te conocen en la familia? (Tu Nombre o Apodo) *
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
                className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              PIN o Contraseña sencilla *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Código de Quiniela
              </label>
              <input
                type="text"
                value={inviteCode || defaultInviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-[#090C1A] border border-indigo-500/25 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-mono font-bold uppercase outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-sm transition active:scale-95 shadow-xl shadow-indigo-950/70 disabled:opacity-50 ring-1 ring-indigo-400/40"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar a mis Quinielas' : 'Darse de Alta y Comenzar')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-indigo-300 hover:text-white underline font-medium"
          >
            {isLogin ? '¿Primera vez aquí? Regístrate gratis' : '¿Ya te registraste? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
