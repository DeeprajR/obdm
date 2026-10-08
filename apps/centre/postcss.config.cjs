/**
 * PostCSS configuration for this staff application.
 *
 * `.cjs` and not `.mjs` on purpose: the application has `"type": "module"`,
 * so a bare `.js` PostCSS config would be treated as ESM and fail to load
 * with a `require` shape. `.cjs` forces CommonJS, which is what the Tailwind
 * PostCSS plugin's loader expects.
 *
 * The only plugin here is `@tailwindcss/postcss`, which is what Tailwind v4
 * uses to process `@import "tailwindcss";` and `@theme { ... }` blocks into
 * CSS custom properties and utility classes at build time (ADR 0015). Only
 * the app's `tailwind.css` entry and any file it `@import`s go through it.
 *
 * The same file in all three staff applications (ADR 0016); a package cannot
 * install a Next PostCSS plugin into its consumers.
 */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
