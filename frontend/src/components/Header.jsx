import React, { useState } from 'react';
import {
  Trophy, Share2, Shield, Users, Check, ChevronDown, UserCircle,
  LogIn, LogOut, Sparkles, Sun, Moon, KeyRound
} from 'lucide-react';
import { NflBallIcon, SoccerBallIcon } from './SportsIcons';
import ChangePinModal from './ChangePinModal';

export default function Header({
  currentLeague,
  onSelectLeague,
  selectedPool,
  currentUser,
  onOpenJoinModal,
  onLogout,
  theme = 'dark',
  onToggleTheme
}) {
  const [copied, setCopied] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  const inviteCode = selectedPool?.invite_code || (currentLeague === 'NFL' ? 'NFL-FAMILIA' : 'LMX-FAMILIA');
  const poolName = selectedPool?.name || (currentLeague === 'NFL' ? 'Pre NFL' : 'Liga MX');

  const handleShareWhatsApp = () => {
    const text = `🏆 ¡Únete a nuestra quiniela familiar "${poolName}"!\nEntra aquí e ingresa con el código: *${inviteCode}*\n👉 ${window.location.origin}/?invite=${inviteCode}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-gradient-to-r dark:from-[#0C0F22]/95 dark:via-[#131130]/95 dark:to-[#0F142A]/95 backdrop-blur-md border-b border-slate-200 dark:border-indigo-500/20 shadow-md dark:shadow-xl dark:shadow-indigo-950/40 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Top Row: App Branding + Controls */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Glowing Logo Box */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 p-0.5 shadow-md shadow-indigo-500/20 ring-1 ring-black/5 dark:ring-white/10">
              <div className="w-full h-full bg-indigo-50 dark:bg-[#0B0E20] rounded-[14px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black font-sport uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                Quinielas Deportivas
              </h1>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-300/80 font-medium">Familia & Amigos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#121630] dark:hover:bg-[#1A2045] text-slate-700 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-indigo-500/30 transition shadow-sm"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180 duration-200" />
              )}
            </button>

            {/* WhatsApp Invite Button */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400/50 text-xs font-bold font-sport uppercase tracking-wider transition active:scale-95 shadow-sm"
              title="Compartir enlace de invitación por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Invitar WhatsApp</span>
            </button>

            {/* User Profile or Join Pill */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#121630] dark:hover:bg-[#181D3E] border border-slate-300 dark:border-indigo-500/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: currentUser?.profile?.avatar_color || '#6366F1' }}
                  >
                    {(currentUser?.display_name || currentUser?.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="max-w-[85px] truncate text-slate-900 dark:text-slate-100 font-bold">{currentUser?.display_name}</span>
                  <ChevronDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0F132A] rounded-2xl shadow-2xl border border-slate-200 dark:border-indigo-500/30 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-indigo-500/15">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-md flex-shrink-0"
                        style={{ backgroundColor: currentUser?.profile?.avatar_color || '#6366F1' }}
                      >
                        {(currentUser?.display_name || currentUser?.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-900 dark:text-white font-black truncate">{currentUser?.display_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-indigo-300/80 font-mono">@{currentUser?.username}</p>
                      </div>
                    </div>

                    <div className="py-2.5 px-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#131735] rounded-xl my-2 border border-slate-100 dark:border-indigo-500/15">
                      <p className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                        Sesión activa en tu perfil
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Solo tú puedes registrar o modificar tus pronósticos en este dispositivo.
                      </p>
                    </div>

                    <div className="pt-1 space-y-1.5">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowChangePinModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-indigo-500/20 transition font-sport uppercase tracking-wider active:scale-95"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Cambiar mi PIN</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition font-sport uppercase tracking-wider active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenJoinModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-xs shadow-md shadow-indigo-600/30 transition active:scale-95 ring-1 ring-indigo-400/40"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar con PIN</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: League Switcher Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#0D1024] rounded-2xl border border-slate-200 dark:border-indigo-500/20 shadow-inner">
            <button
              onClick={() => onSelectLeague('NFL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all active:scale-95 ${
                currentLeague === 'NFL'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <NflBallIcon className="w-3.5 h-3.5" />
              <span>NFL</span>
            </button>

            <button
              onClick={() => onSelectLeague('LMX')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all active:scale-95 ${
                currentLeague === 'LMX'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SoccerBallIcon className="w-3.5 h-3.5" />
              <span>Liga BBVA MX</span>
            </button>
          </div>

          {/* Invite Code Quick Pill */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0E132A] dark:hover:bg-[#161C3D] text-slate-700 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/20 text-xs font-mono font-bold transition group"
            title="Copiar código de quiniela"
          >
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans uppercase font-bold">Código:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black">{inviteCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <span className="text-[9px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-sans">Copiar</span>
            )}
          </button>
        </div>
      </div>

      {showChangePinModal && (
        <ChangePinModal
          isOpen={showChangePinModal}
          onClose={() => setShowChangePinModal(false)}
          currentUser={currentUser}
        />
      )}
    </header>
  );
}
