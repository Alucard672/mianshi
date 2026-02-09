/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,vue}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      colors: {
        // Light, rich palette (white main surface + colorful accents).
        bg0: "#FFFFFF", // main surface
        bg1: "#FFF7ED", // warm panel tint
        neon: "#F59E0B", // amber highlight
        cyan: "#2563EB" // blue primary
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};
