import { defineConfig } from '@tailwindcss/vite'

export default defineConfig({
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          500: 'var(--color-mint-500)',
        },
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
      },
    },
  },
})
