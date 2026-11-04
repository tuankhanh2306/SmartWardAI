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
        "primary": "#00236f",
        "primary-container": "#1e3a8a",
        "on-primary": "#ffffff",
        "on-primary-container": "#90a8ff",
        "secondary": "#00687a",
        "secondary-container": "#57dffe",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#006172",
        "tertiary": "#00246b",
        "tertiary-container": "#00389a",
        "surface": "#faf8ff",
        "surface-bright": "#faf8ff",
        "surface-dim": "#d2d9f4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7ff",
        "surface-container-highest": "#dae2fd",
        "on-surface": "#131b2e",
        "on-surface-variant": "#444651",
        "outline": "#757682",
        "outline-variant": "#c5c5d3",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "background": "#faf8ff"
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
