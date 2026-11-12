/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--base-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        panel: 'rgb(var(--panel-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--elevated-rgb) / <alpha-value>)',
        line: {DEFAULT: 'rgb(var(--line-rgb) / <alpha-value>)', strong: 'rgb(var(--line-strong-rgb) / <alpha-value>)'},
        ink: {DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)', secondary: 'rgb(var(--ink-secondary-rgb) / <alpha-value>)', muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)'},
        accent: {DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)', strong: 'rgb(var(--accent-strong-rgb) / <alpha-value>)', muted: 'rgb(var(--accent-muted-rgb) / <alpha-value>)', ink: 'rgb(var(--accent-ink-rgb) / <alpha-value>)'},
        ok: {DEFAULT: 'rgb(var(--ok-rgb) / <alpha-value>)', muted: 'rgb(var(--ok-muted-rgb) / <alpha-value>)'},
        warn: {DEFAULT: 'rgb(var(--warn-rgb) / <alpha-value>)', muted: 'rgb(var(--warn-muted-rgb) / <alpha-value>)'},
        info: {DEFAULT: 'rgb(var(--info-rgb) / <alpha-value>)', muted: 'rgb(var(--info-muted-rgb) / <alpha-value>)'},
        danger: {DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)', muted: 'rgb(var(--danger-muted-rgb) / <alpha-value>)'},
      },
      fontFamily: {
        sans: ['Barlow', 'Noto Sans KR Variable', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxHeight: {
        panel: '35rem',
        'panel-lg': '47.5rem',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: 'none',
        glow: '0 2px 5px rgb(28 70 48 / 0.14)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'ping-slow': { '0%': { transform: 'scale(1)', opacity: '0.7' }, '80%,100%': { transform: 'scale(2.4)', opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'ping-slow': 'ping-slow 1.8s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};
