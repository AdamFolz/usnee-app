/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        usnee: {
          bg: '#0a0a0a',
          surface: '#141414',
          surface2: '#1e1e1e',
          border: '#2a2a2a',
          text: '#e5e5e5',
          text2: '#a0a0a0',
          accent: '#e63946',
          accent2: '#fb8500',
          success: '#2a9d8f',
          warning: '#e9c46a',
          danger: '#e63946',
          info: '#457b9d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
}
