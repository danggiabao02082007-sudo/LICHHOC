/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lua: { 50:'#FFFBEB', 100:'#FEF3C7', 200:'#FDE68A', 300:'#FCD34D', 400:'#FBBF24', 500:'#F59E0B', 600:'#D97706', 700:'#B45309' },
        ruong: { 50:'#ECFDF5', 100:'#D1FAE5', 300:'#6EE7B7', 400:'#34D399', 500:'#10B981', 600:'#059669', 700:'#047857', 800:'#065F46' },
        ink: '#1F2A1E'
      },
      fontFamily: { sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 10px 30px -10px rgba(6,95,70,.35)' }
    }
  },
  plugins: []
};
