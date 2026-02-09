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
        // Warm, less-inky palette (system was too dark/cold).
        bg0: "#140F0A", // warm near-black
        bg1: "#1E1510", // panel background
        neon: "#FFCE7A", // amber highlight
        cyan: "#FF8A5B" // coral primary
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};
