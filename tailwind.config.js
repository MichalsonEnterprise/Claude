/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fff9e6',
          100: '#fef0b3',
          200: '#fde47a',
          300: '#fcd23d',
          400: '#fbbf16',
          500: '#d4a017',
          600: '#a87c0f',
          700: '#7d5b0a',
          800: '#523c07',
          900: '#291e03',
        },
        crimson: {
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
        },
        orient: {
          900: '#0a0608',
          800: '#120d10',
          700: '#1a1118',
          600: '#241520',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'fog-drift': 'fog-drift 20s linear infinite',
        'particle-rise': 'particle-rise 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6', filter: 'blur(20px)' },
          '50%': { opacity: '1', filter: 'blur(30px)' },
        },
        'fog-drift': {
          '0%': { transform: 'translateX(-100%) translateY(0)' },
          '100%': { transform: 'translateX(100%) translateY(-20px)' },
        },
        'particle-rise': {
          '0%': { transform: 'translateY(100vh) scale(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '0.5' },
          '100%': { transform: 'translateY(-10vh) scale(1)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
