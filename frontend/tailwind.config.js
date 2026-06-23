/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mapped to CSS variables so light/dark themes work automatically.
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        green: 'var(--green)',
        'green-d': 'var(--green-d)',
        'green-l': 'var(--green-l)',
        'green-ll': 'var(--green-ll)',
        yellow: 'var(--yellow)',
        'yellow-d': 'var(--yellow-d)',
        'yellow-l': 'var(--yellow-l)',
        red: 'var(--red)',
        'red-d': 'var(--red-d)',
        'red-l': 'var(--red-l)',
        blue: 'var(--blue)',
        'blue-l': 'var(--blue-l)',
        sidebar: 'var(--sidebar-bg)',
        'sidebar-2': 'var(--sidebar-2)',
        'sidebar-text': 'var(--sidebar-text)',
        'sidebar-muted': 'var(--sidebar-muted)',
        // Legacy aliases kept so existing markup doesn't break during migration.
        sendistri: {
          dark: '#0B2A1B',
          green: '#0E8A4F',
          gold: '#E2A000',
          red: '#D23A2C',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow)',
        'card-lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
