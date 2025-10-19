/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/react/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
          heading: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
          brand: '0 10px 30px -12px rgba(255, 107, 53, 0.35)',
          'brand-soft': '0 18px 40px -22px rgba(255, 107, 53, 0.55)',
          'glow-orange':
            '0 0 0 1px rgba(255, 107, 53, 0.35), 0 15px 35px -15px rgba(255, 107, 53, 0.65)',
          surface: '0 25px 50px -26px rgba(0, 0, 0, 0.75)',
        },
        backgroundImage: {
          'grid-glow':
            'radial-gradient(circle at 1px 1px, rgba(255, 107, 53, 0.18) 1px, transparent 0)',
          'gradient-brand': 'linear-gradient(135deg, #1a1a1d 0%, #0c0c0f 45%, #ff6b35 100%)',
          'gradient-surface':
            'linear-gradient(145deg, rgba(26,26,29,0.92) 0%, rgba(12,12,15,0.92) 40%, rgba(26,26,29,0.96) 100%)',
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          shimmer: 'shimmer 2.4s infinite linear',
        },
        keyframes: {
          shimmer: {
            '0%': { backgroundPosition: '-700px 0' },
            '100%': { backgroundPosition: '700px 0' },
          },
        },
      },
    },
    plugins: [],
  },
};
