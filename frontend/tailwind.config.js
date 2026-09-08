/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#070d0b',
          900: '#0a120f',
          850: '#0d1714',
          800: '#101d18',
          700: '#16261f',
          600: '#1e3329',
          500: '#2a4537',
        },
        eco: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        sky2: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      fontFamily: {
        num: ['DIN Alternate', 'Bahnschrift', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(16,185,129,0.18)',
        'glow-blue': '0 0 24px rgba(14,165,233,0.18)',
      },
    },
  },
  plugins: [],
}
