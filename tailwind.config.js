/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Esto activa la lógica de modo oscuro manual
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#6366f1', // Indigo 500
          DEFAULT: '#4f46e5', // Indigo 600
          dark: '#4338ca', // Indigo 700
        },
        dark: {
          bg: '#0f172a',    // Fondo principal oscuro
          card: '#1e293b',  // Fondo de tarjetas oscuro
          text: '#f8fafc'   // Texto claro
        }
      }
    },
  },
  plugins: [],
}