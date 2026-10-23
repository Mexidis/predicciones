import React from 'react';

// Icono vectorial deportivo de Balón de Fútbol Americano (NFL)
export function NflBallIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)" />
      <path d="M7.76 7.76l8.48 8.48" />
      <path d="M10.5 10.5l-1.5 1.5" />
      <path d="M12 12l-1.5 1.5" />
      <path d="M13.5 13.5l-1.5 1.5" />
      <path d="M15 15l-1.5 1.5" />
    </svg>
  );
}

// Icono vectorial deportivo de Balón de Fútbol Soccer (Liga MX)
export function SoccerBallIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7l3 2.5v3.5L12 15.5l-3-2.5V9.5z" />
      <path d="M12 7V2" />
      <path d="M15 9.5l4.5-2" />
      <path d="M15 13l4 3" />
      <path d="M12 15.5V22" />
      <path d="M9 13l-4 3" />
      <path d="M9 9.5L4.5 7.5" />
    </svg>
  );
}

// Medalla Olímpica Vectorial de Alta Definición
export function MedalIcon({ color = 'gold', className = "w-5 h-5" }) {
  const fillClass = color === 'gold' 
    ? 'text-yellow-400 fill-yellow-400' 
    : color === 'silver' 
    ? 'text-slate-300 fill-slate-300' 
    : 'text-[#CD7F32] fill-[#CD7F32]';

  return (
    <svg className={`${className} ${fillClass}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-2 5-1-1-3 1 1-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15l2 5 1-1 3 1-1-5" />
      <circle cx="12" cy="9" r="6" />
      <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  );
}
