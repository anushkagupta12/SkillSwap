/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      
      
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    
      colors: {
        ink: {
          DEFAULT: '#0d1117',
          2: '#21262d',
          3: '#656d76',
          4: '#8d96a0',
        },
        canvas: {
          DEFAULT: '#f6f4ef',
          2: '#edeae3',
          3: '#e2ddd5',
        },
        sage: {
          DEFAULT: '#1a7f5a',
          light: '#3fb885',
          pale: '#d1fae5',
          dark: '#0f5c41',
        },
        amber: {
          DEFAULT: '#b45309',
          light: '#f59e0b',
          pale: '#fef3c7',
        },
        violet: {
          DEFAULT: '#5b21b6',
          light: '#7c3aed',
          pale: '#ede9fe',
        },
        rose: {
          DEFAULT: '#be123c',
          light: '#f43f5e',
          pale: '#ffe4e6',
        },
        sky: {
          DEFAULT: '#0369a1',
          light: '#0ea5e9',
          pale: '#e0f2fe',
        },
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-mid': 'float 5s ease-in-out infinite 1s',
        'float-fast': 'float 4s ease-in-out infinite 2s',
        'fade-up': 'fadeUp 0.5s ease both',
        'slide-in': 'slideIn 0.3s ease both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'typing': 'typing 1.2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(var(--tw-rotate))' },
          '50%': { transform: 'translateY(-12px) rotate(var(--tw-rotate))' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(12px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-5px)' },
        },
      },
      borderRadius: { xl: '16px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        card: '0 1px 12px rgba(0,0,0,0.06)',
        lift: '0 6px 28px rgba(0,0,0,0.10)',
        glow: '0 0 0 3px rgba(63,184,133,0.2)',
      },
    },
  },
  plugins: [],
}
