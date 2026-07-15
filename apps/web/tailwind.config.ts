import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens mapped to Tailwind (mirrors tokens.css)
        bg:     'var(--bg)',
        panel:  'var(--panel)',
        ink:    'var(--ink)',
        muted:  'var(--muted)',
        line:   'var(--line)',
        // Ebene 1 — Off-Market (grün/teal)
        l1:      'var(--l1)',
        'l1-soft': 'var(--l1-soft)',
        'l1-line': 'var(--l1-line)',
        // Ebene 2 — On-Market (indigo/blau)
        l2:      'var(--l2)',
        'l2-soft': 'var(--l2-soft)',
        'l2-line': 'var(--l2-line)',
        // Status
        go:    'var(--go)',
        amber: 'var(--amber)',
        red:   'var(--red)',
        grey:  'var(--grey)',
        green: 'var(--green)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
