/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#121212",
        surfaceHover: "#1E1E1E",
        primary: "#F59E0B", // Tom alaranjado/amarelado para combinar com "Sun"Maker
      }
    },
  },
  plugins: [],
}