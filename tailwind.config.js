/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050507',
          900: '#08080c',
          850: '#0c0c12',
          800: '#111118',
          750: '#16161e',
          700: '#1c1c26',
          600: '#262633',
        },
        lime: {
          DEFAULT: '#53FC18',
          dim: '#3dd412',
          deep: '#1f7a0a',
          glow: '#b8ff8c',
          mist: 'rgba(83,252,24,0.14)',
        },
        ice: '#7dd3fc',
        violet: '#a78bfa',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(83,252,24,0.18)',
        card: '0 20px 60px rgba(0,0,0,0.45)',
        phone: '0 30px 80px rgba(0,0,0,0.65)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      animation: {
        'pulse-slow': 'pulse 3.2s ease-in-out infinite',
        'ken': 'ken 14s ease-in-out infinite alternate',
        'caption': 'captionPop 0.18s ease-out',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        ken: {
          '0%': { transform: 'scale(1.08) translate3d(-1.5%, 0, 0)' },
          '100%': { transform: 'scale(1.18) translate3d(1.5%, -1.5%, 0)' },
        },
        captionPop: {
          '0%': { transform: 'translateY(8px) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
