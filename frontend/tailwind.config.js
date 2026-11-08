/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0F2942",
        "primary-container": "#1E3A5F",
        "on-primary": "#ffffff",
        "on-primary-container": "#E2E8F0",
        "secondary": "#0F766E",
        "secondary-container": "#CCFBF1",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#115E59",
        "tertiary": "#1E293B",
        "tertiary-container": "#334155",
        "surface": "#F8FAFC",
        "surface-bright": "#FFFFFF",
        "surface-dim": "#E2E8F0",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F8FAFC",
        "surface-container": "#F1F5F9",
        "surface-container-high": "#E2E8F0",
        "surface-container-highest": "#CBD5E1",
        "on-surface": "#0F172A",
        "on-surface-variant": "#475569",
        "outline": "#64748B",
        "outline-variant": "#CBD5E1",
        "error": "#B91C1C",
        "error-container": "#FEE2E2",
        "background": "#F8FAFC"
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
