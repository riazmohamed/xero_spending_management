/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        xero: {
          blue: "#13B5EA",
          dark: "#0078C1",
          green: "#2EC0A1",
          navy: "#002B49",
          gray: "#495057",
        },
      },
    },
  },
  plugins: [],
};
