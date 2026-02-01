import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors (from DESIGN.md)
        primary: "#DC2626", // Primary Red
        accent: "#DC2626", // Same as primary red
        
        // Background Colors (from DESIGN.md)
        background: "#FFFFFF", // White main background
        surface: "#1F1F1F", // Event card dark background
        
        // Text Colors (from DESIGN.md)
        textPrimary: "#111827", // Gray-900
        textSecondary: "#6B7280", // Gray-600
        
        // Border & Muted (from DESIGN.md)
        border: "#E5E7EB", // Gray-200
        muted: "#6B7280", // Gray-600
        mutedLight: "#9CA3AF", // Gray-500
        
        // Semantic Colors (from DESIGN.md)
        danger: "#EF4444", // Red 500
        error: "#EF4444", // Red 500
        success: "#10B981", // Green 500
        warning: "#F59E0B", // Amber 500
        info: "#3B82F6", // Blue 500
        
        // Gray Scale
        gray50: "#F9FAFB",
        gray100: "#F3F4F6",
        gray200: "#E5E7EB",
        gray300: "#D1D5DB",
        gray400: "#9CA3AF",
        gray500: "#6B7280",
        gray600: "#4B5563",
        gray700: "#374151",
        gray800: "#1F2937",
        gray900: "#111827"
      }
    }
  },
  plugins: []
};

export default config;


