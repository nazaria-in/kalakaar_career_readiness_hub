// apps/web/tailwind.config.mjs
import preset from "@repo/ui/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default tailwindConfig;