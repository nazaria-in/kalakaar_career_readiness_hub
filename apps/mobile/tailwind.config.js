/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        nazaria: {
          burgundy: "#892d3b",
          teal: "#00504f",
          cream: "#fcdfab",
          white: "#ffffff",
          "pale-teal": "#b3dfde",
          "pale-gold": "#ffe1ac",
          "pale-pink": "#ffd7d7",
        },
        surface: "#ffffff",
        card: "#f6f9f8",
        "card-alt": "#eaf2f1",
        "card-strong": "#ffffff",
        "text-primary": "#00504f",
        "text-muted": "#4b6a69",
        "text-accent": "#892d3b",
        border: "#d7e6e4",
        "border-strong": "#b3dfde",
        primary: "#892d3b",
        "primary-foreground": "#ffffff",
        secondary: "#dcecea",
        "secondary-foreground": "#00504f",
        destructive: "#d93a3a",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      fontFamily: {
        sans: ["System"],
        heading: ["System"],
      },
    },
  },
  plugins: [],
};