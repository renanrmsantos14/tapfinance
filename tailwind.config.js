/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#242321",
        muted: "#77736c",
        paper: "#fbfaf7",
        line: "#e7e3db",
        accent: "#8e5c42",
      },
    },
  },
  plugins: [],
};
