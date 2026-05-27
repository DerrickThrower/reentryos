import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0a',
          card: '#111111',
          border: '#1a1a1a',
        },
        brand: {
          critical: '#ef4444',
          warning: '#f59e0b',
          stable: '#22c55e',
          info: '#3b82f6',
        },
        text: {
          primary: '#ffffff',
          muted: '#6b7280',
          dim: '#4b5563',
        },
        agent: {
          orchestrator: '#7c3aed',
          search: '#1d4ed8',
          benefits: '#b45309',
          housing: '#15803d',
          risk: '#b91c1c',
          plan: '#0f766e',
          calendar: '#4338ca',
          sms: '#047857',
          documentation: '#374151',
        },
      },
      fontFamily: {
        mono: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 200ms ease forwards',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
