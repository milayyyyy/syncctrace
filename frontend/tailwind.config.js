/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-gradient-sidebar',
    'bg-gradient-brand',
    'bg-gradient-primary',
    'bg-gradient-ai',
    'bg-gradient-success',
    'bg-gradient-header',
    'shadow-card',
    'shadow-card-hover',
    'shadow-stat',
    'shadow-modal',
    'shadow-sidebar',
    'shadow-inner-sm',
    'animate-fade-in',
    'animate-slide-up',
    'animate-pulse-slow',
    'animate-shimmer',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light: '#3B82F6',
          dark: '#162d6e',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: '#0D9488',
        ai: '#7C3AED',
        success: '#10B981',
        warning: '#D97706',
        critical: '#DC2626',
        sidebar: '#0d1224',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'stat': '0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
        'modal': '0 20px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.15)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-sidebar': 'linear-gradient(180deg, #0f2044 0%, #162d5a 100%)',
        'gradient-brand': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-primary': 'linear-gradient(135deg, #1E3A8A 0%, #1d4ed8 100%)',
        'gradient-ai': 'linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-header': 'linear-gradient(to right, #ffffff, #f8fafc)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

