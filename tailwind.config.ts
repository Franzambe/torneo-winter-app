import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        club: { black: "#1F1F1F", slate: "#6E7F95", light: "#E8ECF1", clay: "#B5532F" },
      },
      fontFamily: { sans: ["Inter", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
