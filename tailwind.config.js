/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px 3px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 30px 8px rgba(6, 182, 212, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};
