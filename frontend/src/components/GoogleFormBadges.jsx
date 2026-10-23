import React from 'react';
import { Check, X, Minus } from 'lucide-react';

/**
 * Renderiza los últimos 5 resultados en el formato visual exacto de Google:
 * - Ganado: Círculo verde con palomita blanca (✓)
 * - Perdido: Círculo rojo con tache blanco (✕)
 * - Empate: Círculo gris con línea blanca (-)
 * Si es récord numérico de NFL (ej. "5-2"), muestra el récord.
 */
export default function GoogleFormBadges({ formString }) {
  if (!formString) return null;

  // Si es récord estilo NFL (ej. "5-2", "12-4")
  if (
    formString.includes('-') &&
    !formString.includes('V') &&
    !formString.includes('D') &&
    !formString.includes('E') &&
    !formString.includes('W') &&
    !formString.includes('L')
  ) {
    return (
      <span className="text-[10px] font-mono font-bold text-slate-300 bg-stadium-950 px-2 py-0.5 rounded-md border border-white/10 shadow-inner">
        Récord: {formString}
      </span>
    );
  }

  // Desglosar la cadena de forma (ej. "V-D-E-V-V" o "WLDWW")
  let items = [];
  if (formString.includes('-')) {
    items = formString.split('-').filter(Boolean);
  } else {
    items = formString.split('').slice(-5);
  }

  return (
    <div className="flex items-center gap-1" title="Últimos 5 resultados">
      {items.map((ch, idx) => {
        const val = ch.toUpperCase();
        // Ganado (V o W)
        if (val === 'V' || val === 'W') {
          return (
            <div
              key={idx}
              className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm flex-shrink-0"
              title="Victoria"
            >
              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          );
        }
        // Perdido (D o L)
        if (val === 'D' || val === 'L') {
          return (
            <div
              key={idx}
              className="w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-sm flex-shrink-0"
              title="Derrota"
            >
              <X className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          );
        }
        // Empate (E)
        return (
          <div
            key={idx}
            className="w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center text-white shadow-sm flex-shrink-0"
            title="Empate"
          >
            <Minus className="w-2.5 h-2.5 stroke-[3.5]" />
          </div>
        );
      })}
    </div>
  );
}
