// apps/mobile/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@repo/ui/tailwind.preset.js")],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};