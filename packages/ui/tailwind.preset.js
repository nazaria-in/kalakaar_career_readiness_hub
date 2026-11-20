// packages/ui/tailwind.preset.js
/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: [],
  safelist: [
    // 1. Standard Tailwind palette colors (including violet & 950)
    {
      pattern:
        /^(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ["dark"],
    },
    // 2. Semantic CSS-variable theme colors
    {
      pattern:
        /^(bg|text|border|ring)-(surface|card|card-alt|card-strong|text-primary|text-muted|text-accent|border-strong|primary|secondary|destructive)(-foreground)?$/,
      variants: ["dark"],
    },
    // 3. Common black/white/transparent colors
    {
      pattern: /^(bg|text|border)-(black|white|transparent|current)$/,
      variants: ["dark"],
    },
    // 4. Spacing (padding, margin, gap, inset/space)
    {
      pattern:
        /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)$/,
    },
    // 5. Width & Height (common scale + fractions + full/screen/auto)
    {
      pattern:
        /^(w|h|min-w|min-h|max-w|max-h)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|1\/2|1\/3|2\/3|1\/4|3\/4)$/,
    },
    // 6. Border radius
    {
      pattern:
        /^rounded(-(none|sm|md|lg|xl|2xl|3xl|full)|(t|r|b|l|tl|tr|br|bl)(-(none|sm|md|lg|xl|2xl|3xl|full))?)?$/,
    },
    // 7. Border widths
    {
      pattern: /^border(-(0|2|4|8)|(t|r|b|l|x|y)(-(0|2|4|8))?)?$/,
    },
    // 8. Typography (font size, weight, alignment)
    {
      pattern:
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|left|center|right|justify)$/,
    },
    {
      pattern:
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    },
    // 9. Layout, Flexbox, Position, Overflow & Opacity
    {
      pattern:
        /^(flex|inline-flex|block|inline-block|hidden|relative|absolute|fixed|sticky)$/,
    },
    {
      pattern:
        /^(flex-(row|row-reverse|col|col-reverse|wrap|wrap-reverse|nowrap|1|auto|initial|none)|items-(start|end|center|baseline|stretch)|justify-(start|end|center|between|around|evenly)|self-(auto|start|end|center|stretch|baseline)|shrink(-0)?|grow(-0)?)$/,
    },
    {
      pattern:
        /^overflow-(auto|hidden|clip|visible|scroll)(-(x|y)-(auto|hidden|clip|visible|scroll))?$/,
    },
    {
      pattern:
        /^opacity-(0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        "card-alt": "rgb(var(--color-card-alt) / <alpha-value>)",
        "card-strong": "rgb(var(--color-card-strong) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        "text-accent": "rgb(var(--color-text-accent) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--color-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--color-secondary-foreground) / <alpha-value>)",
        destructive: "rgb(var(--color-destructive) / <alpha-value>)",
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