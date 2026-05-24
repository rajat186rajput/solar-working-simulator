import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        solar: "#F6C90E",
        "solar-dim": "#7A6407",
        battery: "#22C55E",
        "battery-discharge": "#F97316",
        grid: "#3B82F6",
        "grid-export": "#A855F7",
        load: "#F8FAFC",
        danger: "#EF4444",
        warning: "#FB923C",
        "soc-warn": "#EAB308",
        "surface-dark": "#0F172A",
        "surface-card": "#1E293B",
        "surface-elevated": "#273549",
        "surface-stroke": "#334155",
        "text-primary": "#F1F5F9",
        "text-secondary": "#94A3B8",
        "text-muted": "#475569",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        solar: "0 0 16px rgba(246,201,14,0.25)",
        battery: "0 0 16px rgba(34,197,94,0.25)",
        "grid-glow": "0 0 16px rgba(59,130,246,0.25)",
        danger: "0 0 16px rgba(239,68,68,0.25)",
      },
      keyframes: {
        flowParticle: {
          "from": { offsetDistance: "0%" },
          "to": { offsetDistance: "100%" },
        },
        surgeSpike: {
          "0%": { transform: "scaleY(1)" },
          "20%": { transform: "scaleY(1.8)" },
          "100%": { transform: "scaleY(1)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "flow-particle": "flowParticle var(--particle-duration, 1200ms) linear infinite",
        "surge-spike": "surgeSpike 1.5s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
