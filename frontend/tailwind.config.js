/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Spotify brand
        'spotify-green': '#1DB954',
        // Semantic design tokens — values come from CSS custom properties
        'app-bg':     'rgb(var(--app-bg)     / <alpha-value>)',
        'app-card':   'rgb(var(--app-card)   / <alpha-value>)',
        'app-input':  'rgb(var(--app-input)  / <alpha-value>)',
        'app-edge':   'rgb(var(--app-edge)   / <alpha-value>)',
        'app-ink':    'rgb(var(--app-ink)    / <alpha-value>)',
        'app-muted':  'rgb(var(--app-muted)  / <alpha-value>)',
        'app-faint':  'rgb(var(--app-faint)  / <alpha-value>)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
