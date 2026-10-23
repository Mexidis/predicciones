/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sport: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        stadium: {
          950: '#06080F',
          900: '#0B0F1C',
          850: '#0E1426',
          800: '#141C33',
          700: '#1E294A',
        },
        turf: {
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        silver: {
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
        },
        bronze: {
          400: '#FB923C',
          500: '#EA580C',
          600: '#C2410C',
        }
      }
    },
  },
  plugins: [],
}
