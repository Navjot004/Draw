/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#07050e',
          light: '#0e0a1a',
          card: '#120d24',
          surface: '#181230',
        },
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        electric: {
          blue: '#00f0ff',
          violet: '#b026ff',
          pink: '#ff007f',
          gold: '#ffd700',
        },
        pop: {
          pink: '#ff007f',
          magenta: '#ff1493',
          yellow: '#ffe600',
          cyan: '#00f0ff',
          purple: '#8b5cf6',
          dark: '#0a061a',
          slot: '#120b29',
          card: '#190e38'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Outfit', 'Cabinet Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 25px rgba(139, 92, 246, 0.45), 0 0 50px rgba(6, 182, 212, 0.25)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.6), 0 0 80px rgba(6, 182, 212, 0.4)',
        'glow-gold': '0 0 50px rgba(255, 215, 0, 0.6), 0 0 100px rgba(255, 170, 0, 0.3)',
        'glow-pink': '0 0 35px rgba(255, 0, 127, 0.55), 0 0 70px rgba(255, 0, 127, 0.3)',
        'glow-cyan': '0 0 35px rgba(0, 240, 255, 0.55), 0 0 70px rgba(0, 240, 255, 0.3)',
        'pop-btn': '0 6px 0 #581c87, 0 10px 20px rgba(0,0,0,0.5)',
        'pop-pink-btn': '0 6px 0 #9d174d, 0 10px 25px rgba(255, 0, 127, 0.4)',
        'pop-yellow-btn': '0 6px 0 #854d0e, 0 10px 25px rgba(255, 230, 0, 0.4)',
        'pop-cyan-btn': '0 6px 0 #0e7490, 0 10px 25px rgba(0, 240, 255, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
        'marquee-blink': 'marqueeBlink 0.6s steps(2, start) infinite',
        'pop-bounce': 'popBounce 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.8), 0 0 60px rgba(6, 182, 212, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marqueeBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        popBounce: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-6px) scale(1.02)' },
        }
      }
    },
  },
  plugins: [],
}
