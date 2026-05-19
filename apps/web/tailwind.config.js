/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0b',
          800: '#111114',
          700: '#18181d',
          600: '#1e1e25',
          500: '#26262f',
          400: '#32323d',
          300: '#44444f',
          200: '#6b6b7a',
          100: '#9898a8',
        },
        accent: {
          DEFAULT: '#e8a838',
          light: '#f0bc60',
          dark: '#c88a20',
          muted: '#e8a83820',
        },
        success: {
          DEFAULT: '#22c55e',
          muted: '#22c55e20',
        },
        danger: {
          DEFAULT: '#ef4444',
          muted: '#ef444420',
        },
        info: {
          DEFAULT: '#3b82f6',
          muted: '#3b82f620',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
