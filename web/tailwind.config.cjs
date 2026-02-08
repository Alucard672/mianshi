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
        bg0: "#070A12",
        bg1: "#0B1020",
        neon: "#7CFFB2",
        cyan: "#64D2FF"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

