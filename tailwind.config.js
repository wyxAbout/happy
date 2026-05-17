/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        }
      },
      animation: {
        'pop-in': 'popIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'bounce-score': 'bounceScore 0.5s ease-out',
        'shake': 'shake 0.3s ease-in-out',
      }
    },
  },
  plugins: [],
}
