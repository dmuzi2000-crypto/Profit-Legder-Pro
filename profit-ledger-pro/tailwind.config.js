/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['DM Serif Display', 'serif'],
      },
      colors: {
        bg: {
          1: '#0a0c10',
          2: '#111318',
          3: '#181b22',
          4: '#1e2129',
        },
        border: { 1: '#2a2e38', 2: '#353a47' },
        green: { DEFAULT: '#22d687', dark: '#0fa05a' },
        red: { DEFAULT: '#f04f4f' },
        blue: { DEFAULT: '#5b8fff' },
        amber: { DEFAULT: '#f5a623' },
        purple: { DEFAULT: '#a78bfa' },
      }
    }
  },
  plugins: []
}
