import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        soft: "var(--soft)",
        line: "var(--line)",
        primary: { DEFAULT: "var(--primary)", deep: "var(--primary-deep)", tint: "var(--primary-tint)" },
        accent: "var(--accent)",
        danger: { DEFAULT: "var(--danger)", tint: "var(--danger-tint)" },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,44,41,.05), 0 8px 24px -12px rgba(16,44,41,.12)",
      },
    },
  },
  plugins: [],
};
export default config;
