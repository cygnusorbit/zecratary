/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        darkBg: '#0B101D',
        darkCard: '#111726',
        brandOrange: '#E05638',
        brandGreen: '#10B981',
      }
    }
  },
  plugins: [],
}