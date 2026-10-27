/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutres légèrement froids : toutes les pages existantes (gray-*) héritent du nouveau rendu
        gray: {
          50: '#f7f8fa', 100: '#f0f2f5', 200: '#e3e6eb', 300: '#cdd2da', 400: '#9aa2af',
          500: '#6b7482', 600: '#4b5360', 700: '#363c47', 800: '#23272f', 900: '#171a20', 950: '#0e1014',
        },
        // Accent : bleu outremer (remplace le bleu Tailwind par défaut)
        accent: {
          50: '#f0f3ff', 100: '#e1e7ff', 200: '#c4cffd', 300: '#9fb0fa', 400: '#7389f4',
          500: '#4f66ea', 600: '#3b4fd6', 700: '#303fb3', 800: '#2a368f', 900: '#252f70',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04)',
        pop: '0 8px 30px rgb(16 24 40 / 0.12), 0 1px 3px rgb(16 24 40 / 0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'grow-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'grow-x': 'grow-x 0.6s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};