/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tiktok: {
          cyan: '#25F4EE',
          pink: '#FE2C55',
          dark: '#010101',
          card: '#121216',
          border: '#23232c'
        }
      }
    },
  },
  plugins: [],
};
