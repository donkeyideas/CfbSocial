import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        crimson: 'var(--crimson)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        dark: 'var(--dark)',
        'school-primary': 'var(--school-primary)',
        'school-secondary': 'var(--school-secondary)',
        'school-dark': 'var(--school-dark)',
        admin: {
          bg: 'var(--admin-bg)',
          surface: 'var(--admin-surface)',
          'surface-raised': 'var(--admin-surface-raised)',
          border: 'var(--admin-border)',
          accent: 'var(--admin-accent)',
          'accent-light': 'var(--admin-accent-light)',
          text: 'var(--admin-text)',
          'text-secondary': 'var(--admin-text-secondary)',
          'text-muted': 'var(--admin-text-muted)',
          success: 'var(--admin-success)',
          warning: 'var(--admin-warning)',
          error: 'var(--admin-error)',
          info: 'var(--admin-info)',
          gold: 'var(--admin-gold)',
          tan: 'var(--admin-tan)',
        },
      },
      fontFamily: {
        serif: ['var(--serif)'],
        sans: ['var(--sans)'],
        mono: ['var(--mono)'],
      },
      backgroundImage: {
        'paper-texture': "url('/textures/paper-grain.png')",
      },
    },
  },
  plugins: [],
};

export default config;
