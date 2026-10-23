import React, { useState, useEffect } from 'react';
import { KeyRound, X, CheckCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function ChangePinModal({
  isOpen,
  onClose,
  currentUser
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanCurrent = currentPin.trim();
    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanCurrent) {
      setError('Por favor ingresa tu PIN actual.');
      return;
    }

    if (!cleanNew || cleanNew.length < 4) {
      setError('El nuevo PIN debe tener al menos 4 dígitos o caracteres.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('El nuevo PIN y la confirmación no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changeUserPin(currentUser.id, cleanCurrent, cleanNew, currentUser.username);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#11152E] border border-slate-200 dark:border-indigo-500/20 w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-600 p-0.5 mx-auto mb-2.5 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-950/50">
            <div className="w-full h-full bg-indigo-50 dark:bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h3 className="text-lg font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white">
            Cambiar mi PIN
          </h3>
          <p className="text-xs text-slate-500 dark:text-indigo-200/70 mt-1">
            Perfil de <span className="font-bold text-slate-700 dark:text-indigo-100 font-mono">@{currentUser.username}</span>
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              ¡PIN actualizado con éxito!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Usa tu nuevo PIN la próxima vez que inicies sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                PIN Actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Tu PIN actual"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0B0E20] border border-slate-200 dark:border-indigo-500/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nuevo PIN (Mínimo 4 dígitos)
              </label>
              <div className="relative">
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Ej. 1234"
                  required
                  className="w-full bg-slate-50 dark:bg-[#0B0E20] border border-slate-200 dark:border-indigo-500/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Confirmar Nuevo PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repite tu nuevo PIN"
                required
                className="w-full bg-slate-50 dark:bg-[#0B0E20] border border-slate-200 dark:border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-indigo-500/20 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-sport uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white text-xs font-black font-sport uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Actualizar PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
