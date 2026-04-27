/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          high: '#ef4444',
          medium: '#f97316',
          low: '#eab308',
          info: '#3b82f6',
        },
        status: {
          active: '#10b981',
          inactive: '#6b7280',
          alert: '#ef4444',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
