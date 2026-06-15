/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sendistri: {
          dark: '#0B2A1B',
          green: '#0E8A4F',
          gold: '#E2A000',
          red: '#D23A2C',
        },
      },
    },
  },
  plugins: [],
};
