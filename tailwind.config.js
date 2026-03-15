/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: "#effef8",
          100: "#d7fbea",
          200: "#b0f4d8",
          500: "#23c28b",
          600: "#169a6f",
          700: "#137a59",
        },
        slatecare: {
          900: "#0f1d2b",
        },
      },
      boxShadow: {
        glow: "0 16px 40px rgba(35, 194, 139, 0.25)",
      },
    },
  },
  plugins: [],
};
