/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4f46e5',
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d9fe',
          300: '#a4bffe',
          400: '#799cfc',
          500: '#5475f7',
          600: '#3953ec',
          700: '#2a3ed5',
          800: '#2634ac',
          900: '#243087',
          950: '#151b4f',
        },
        sidebar: {
          bg: '#121429',
          card: '#1b1e38',
          border: '#24284d',
          hover: '#222649',
          active: '#4f46e5',
          text: '#9ba1bd',
          activeText: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
