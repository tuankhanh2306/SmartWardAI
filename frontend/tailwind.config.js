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
        // Primary Brand: UTH Teal (#00796B)
        "primary": "#00796B",
        "primary-container": "#00695C",
        "primary-dark": "#004D40",
        "on-primary": "#ffffff",
        "on-primary-container": "#F0FDFA",

        // Officer Institutional Navy
        "officer": {
          DEFAULT: "#0F2942",
          "hover": "#1E3A5F",
        },

        // Secondary & Supporting
        "secondary": "#0F766E",
        "secondary-container": "#CCFBF1",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#115E59",
        "tertiary": "#1E293B",
        "tertiary-container": "#334155",

        // Institutional Surfaces & Hairline Borders (Slate Ramp)
        "background": "#F8FAFC",
        "surface": "#F8FAFC",
        "surface-bright": "#FFFFFF",
        "surface-card": "#FFFFFF",
        "surface-muted": "#F1F5F9",
        "surface-dim": "#E2E8F0",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F8FAFC",
        "surface-container": "#F1F5F9",
        "surface-container-high": "#E2E8F0",
        "surface-container-highest": "#CBD5E1",
        "border-hairline": "#E2E8F0",
        "border-strong": "#CBD5E1",

        // Typography Ink Hierarchy
        "ink": "#0F172A",
        "ink-muted": "#475569",
        "ink-subtle": "#64748B",
        "on-surface": "#0F172A",
        "on-surface-variant": "#475569",
        "outline": "#64748B",
        "outline-variant": "#E2E8F0",

        // Error & SLA Semantic Status Tokens (WCAG 2.1 AA >= 4.5:1 text contrast)
        "error": "#B91C1C",
        "error-container": "#FEE2E2",
        "sla": {
          "normal": "#166534",
          "normal-bg": "#F0FDF4",
          "normal-border": "#BBF7D0",
          "normal-icon": "#16A34A",
          "warning": "#854D0E",
          "warning-bg": "#FEFCE8",
          "warning-border": "#FEF08A",
          "warning-icon": "#CA8A04",
          "urgent": "#9A3412",
          "urgent-bg": "#FFF7ED",
          "urgent-border": "#FED7AA",
          "urgent-icon": "#EA580C",
          "overdue": "#991B1B",
          "overdue-bg": "#FEF2F2",
          "overdue-border": "#FECACA",
          "overdue-icon": "#DC2626",
        },

        "uth": {
          "teal": "#00796B",
          "teal-dark": "#004D40",
          "teal-hover": "#00695C",
          "teal-light": "#26A69A",
          "teal-surface": "#E0F2F1",
          "teal-subtle": "#E8F5E9",
          "crimson": "#B91C1C",
          "crimson-dark": "#991B1B",
          "input-bg": "#EEF2F6",
        }
      },
      borderRadius: {
        // Fix missing Tailwind v3 xs token + semantic institutional radii
        "xs": "0.125rem",
        "control": "0.375rem",   // 6px (rounded-md) for buttons/inputs
        "card": "0.5rem",        // 8px (rounded-lg) for cards
        "container": "0.75rem",  // 12px (rounded-xl) for containers
      },
      boxShadow: {
        // Fix missing Tailwind v3 2xs/xs tokens with neutral slate shadows (zero colored glow)
        "2xs": "0 1px 1px 0 rgb(15 23 42 / 0.03)",
        "xs": "0 1px 2px 0 rgb(15 23 42 / 0.05)",
        "card": "0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        admin: ['"Times New Roman"', '"Tinos"', 'Times', '"Liberation Serif"', 'serif'],
      }
    },
  },
  plugins: [],
}
