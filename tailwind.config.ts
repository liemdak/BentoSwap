import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────
        red: {
          primary: "#C8102E",
          dim:     "#8B0A1F",
          bg:      "rgba(200,16,46,0.08)",
        },
        cream: {
          DEFAULT: "#E8DFC0",
          dim:     "#B5A882",
          white:   "#F5F0E8",
          brown:   "#D4C9A8",
          dark:    "#C8B99A",
        },

        // ── Dark card surfaces (float on light bg) ─────────
        ink: {
          DEFAULT:  "#16120E",
          surface:  "#1F1A14",
          surface2: "#2A2318",
          border:   "#3A3020",
          border2:  "#4A3E2A",
        },

        // ── Page-level text (on light warm background) ─────
        page: {
          DEFAULT: "#16120E",
          muted:   "#6B5D4F",
        },

        // ── Status ─────────────────────────────────────────
        muted:   "#8A7E6A",
        success: "#2D9B6F",
      },
      fontFamily: {
        display:  ["var(--font-bowlby)", "sans-serif"],
        body:     ["var(--font-inter)",  "sans-serif"],
        mono:     ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card:  "10px",
        card2: "12px",
      },
      boxShadow: {
        card:  "0 4px 24px rgba(22,18,14,0.18), 0 1px 4px rgba(22,18,14,0.10)",
        "card-hover": "0 8px 32px rgba(22,18,14,0.22), 0 2px 8px rgba(22,18,14,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
