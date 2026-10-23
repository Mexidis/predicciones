import React, { useState } from 'react';
import { Trophy, Share2, Shield, Users, Check, ChevronDown, UserCircle, LogIn, KeyRound, Sparkles, Sun, Moon } from 'lucide-react';
import { NflBallIcon, SoccerBallIcon } from './SportsIcons';

export default function Header({
  currentLeague,
  onSelectLeague,
  selectedPool,
  currentUser,
  users,
  onSwitchUser,
  onOpenJoinModal,
  onOpenAdminPortal,
  theme = 'dark',
  onToggleTheme
}) {
  const [copied, setCopied] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
                  <span className="max-w-[80px] truncate text-slate-900 dark:text-slate-100">{currentUser?.display_name}</span>
                  <ChevronDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0F132A] rounded-2xl shadow-2xl border border-slate-200 dark:border-indigo-500/30 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-indigo-500/15">
                      <p className="text-[10px] font-bold font-sport uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Sesión Actual</p>
                      <p className="text-xs text-slate-900 dark:text-white font-bold truncate">{currentUser?.display_name}</p>
                    </div>

                    <div className="max-h-56 overflow-y-auto py-1">
                      {users.filter(u => u.username !== 'admin').map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/60 ${
                            u.id === currentUser?.id ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                              style={{ backgroundColor: u.profile?.avatar_color || '#6366F1' }}
                            >
                              {(u.display_name || u.username)[0].toUpperCase()}
                            </span>
                            <span>{u.display_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-indigo-500/15 pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenJoinModal();
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-bold"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Registrar otro participante
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenJoinModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-black font-sport uppercase tracking-wider text-xs shadow-md shadow-indigo-950/40 transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar / Unirse</span>
              </button>
            )}

            {/* Direct Admin Portal Shortcut */}
            <button
              onClick={onOpenAdminPortal}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#121630] dark:hover:bg-[#1A2045] text-slate-700 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-indigo-500/30 transition shadow-sm"
              title="Acceso al Portal de Administrador"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Row: League Switcher (NFL vs Liga MX) + Invite Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-indigo-500/15">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0A0D1F] rounded-2xl border border-slate-200 dark:border-indigo-500/20 shadow-inner">
            <button
              onClick={() => onSelectLeague('NFL')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
                currentLeague === 'NFL'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/70 ring-1 ring-indigo-400/50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-indigo-200'
              }`}
            >
              <NflBallIcon className="w-4 h-4 text-blue-200" />
              <span>NFL</span>
            </button>

            <button
              onClick={() => onSelectLeague('LMX')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black font-sport uppercase tracking-wider transition-all ${
                currentLeague === 'LMX'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-950/70 ring-1 ring-turf-400/50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-emerald-200'
              }`}
            >
              <SoccerBallIcon className="w-4 h-4 text-emerald-200" />
              <span>Liga BBVA MX</span>
            </button>
          </div>

          {/* Quick Invite Code Pill */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#10142C]/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-indigo-500/25 shadow-sm">
              <span className="text-slate-500 dark:text-indigo-300/80 text-[10px] font-sport uppercase font-bold tracking-wider">Código:</span>
              <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-xs">{inviteCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-white transition active:scale-95 ml-1 text-[11px] font-bold underline"
              >
                {copied ? <span className="text-emerald-600 dark:text-emerald-400 font-black">¡Copiado!</span> : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
