/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--sf-primary-rgb, 14 165 233) / <alpha-value>)',
        secondary: 'rgb(var(--sf-secondary-rgb, 34 197 94) / <alpha-value>)',
        accent: 'rgb(var(--sf-accent-rgb, 245 158 11) / <alpha-value>)',
        surface: 'rgb(var(--sf-surface-rgb, 255 255 255) / <alpha-value>)',
        background: 'rgb(var(--sf-bg-rgb, 248 250 252) / <alpha-value>)',
        text: 'rgb(var(--sf-text-rgb, 15 23 42) / <alpha-value>)',
        muted: 'rgb(var(--sf-muted-rgb, 71 85 105) / <alpha-value>)',
        border: 'rgb(var(--sf-border-rgb, 226 232 240) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--sf-radius-sm, 8px)',
        md: 'var(--sf-radius-md, 12px)',
        lg: 'var(--sf-radius-lg, 16px)',
        xl: 'var(--sf-radius-xl, 22px)',
        full: 'var(--sf-radius-full, 9999px)',
      },
      boxShadow: {
        card: 'var(--sf-shadow-card, 0 12px 30px rgba(15,23,42,0.12))',
        overlay: 'var(--sf-shadow-overlay, 0 24px 68px rgba(15,23,42,0.25))',
      },
      fontFamily: {
        sans: 'var(--sf-font-family, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif)',
      },
    },
  },
  plugins: [],
};
