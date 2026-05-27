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
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'twinkle-slow': 'twinkle 5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px 3px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 30px 8px rgba(6, 182, 212, 0.5)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(139, 92, 246, 0.3)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(139, 92, 246, 0.5)', transform: 'scale(1.02)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
