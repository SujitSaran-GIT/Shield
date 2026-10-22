/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: { colors: { blue: { 50: '#fdf0d5', 100: '#f8e5c2', 200: '#e7c8b7', 300: '#c99891', 400: '#ba5e65', 500: '#c1121f', 600: '#c1121f', 700: '#780000', 800: '#780000', 900: '#003049' } } },
  },
  plugins: [],
}
