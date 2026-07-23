/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          page: 'var(--bg-page, #0b0f17)',
          sidebar: 'var(--bg-sidebar, #080b11)',
          card: 'var(--bg-card, #131b29)',
        },
        brand: {
          teal: {
            DEFAULT: 'var(--brand-teal, #14b8a6)',
            light: 'var(--brand-light, #99f6e4)',
            dark: 'var(--brand-dark, #042f2e)',
          }
        },
        text: {
          primary: 'var(--text-primary, #f0fdfa)',
          secondary: 'var(--text-secondary, #94a3b8)',
          tertiary: 'var(--text-tertiary, #64748b)',
        },
        border: {
          hairline: 'var(--border-hairline, #1e293b)',
        },
        status: {
          success: '#10B981', // green
          warning: '#F59E0B', // amber
          error: '#EF4444',   // red
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
      },
      borderWidth: {
        'hairline': '0.5px',
      }
    },
  },
  plugins: [],
}
