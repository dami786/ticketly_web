import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F0F0F",
        surface: "#1F1F1F",
        border: "#374151",
        accent: "#9333EA",
        muted: "#6B7280",
        mutedLight: "#9CA3AF",
        danger: "#EF4444",
        success: "#10B981"
      }
    }
  },
  plugins: []
};

export default config;


