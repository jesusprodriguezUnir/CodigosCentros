import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Paleta inspirada en comunidad.madrid (rojo institucional + neutros)
        madrid: {
          50: "#fef2f3",
          100: "#fde3e5",
          200: "#fbcbd0",
          300: "#f7a3ab",
          400: "#f17280",
          500: "#e64558",
          600: "#c8102e", // rojo institucional
          700: "#a30c25",
          800: "#871024",
          900: "#721124",
          950: "#3f060f",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef3",
          200: "#d5dae3",
          300: "#b0bac9",
          400: "#8593aa",
          500: "#647391",
          600: "#4e5b78",
          700: "#404a62",
          800: "#384053",
          900: "#1f2333",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)",
        ring: "0 0 0 4px rgba(200,16,46,.12)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
