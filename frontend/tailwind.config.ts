/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // primary cyan
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        vault: {
          teal:    '#06d6a0',
          coral:   '#ff6b6b',
          violet:  '#a855f7',
          amber:   '#fbbf24',
          DEFAULT: '#06d6a0',
        },
        accent: {
          blue:  '#38bdf8',
          pink:  '#f472b6',
          coral: '#ff6b6b',
        },
        surface: {
          DEFAULT: '#06080f',
          raised:  '#0c1019',
          card:    'rgba(255, 255, 255, 0.025)',
          border:  'rgba(255, 255, 255, 0.07)',
          hover:   'rgba(255, 255, 255, 0.05)',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out',
        'slide-up':     'slideUp 0.5s ease-out',
        'slide-in':     'slideIn 0.35s ease-out',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'float':        'float 25s infinite ease-in-out alternate',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'mesh-drift':   'meshDrift 30s ease-in-out infinite alternate',
        'border-spin':  'borderSpin 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        float: {
          '0%':   { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(40px, 60px) scale(1.15)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
        meshDrift: {
          '0%':   { transform: 'translate(0%, 0%) rotate(0deg)' },
          '100%': { transform: 'translate(5%, 3%) rotate(3deg)' },
        },
        borderSpin: {
          '0%':   { '--angle': '0deg' },
          '100%': { '--angle': '360deg' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        'glass-gradient':   'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
        'vault-gradient':   'linear-gradient(135deg, #06d6a0 0%, #0891b2 50%, #a855f7 100%)',
        'hero-gradient':    'linear-gradient(135deg, rgba(6,214,160,0.15) 0%, rgba(168,85,247,0.08) 50%, rgba(255,107,107,0.05) 100%)',
        'dot-grid':         'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      boxShadow: {
        'vault':    '0 0 40px rgba(6,214,160,0.15)',
        'vault-lg': '0 8px 32px rgba(6,214,160,0.12), 0 0 0 1px rgba(6,214,160,0.1)',
        'card':     '0 4px 24px rgba(0,0,0,0.25)',
        'glow-teal': '0 0 20px rgba(6,214,160,0.35)',
      },
    },
  },
  plugins: [],
}
