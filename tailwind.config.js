/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#032A59',
        secondary: '#1962B2',
      },
      fontFamily: {
        'suez': ['Suez One', 'sans-serif']
      }
    },
  },
  plugins: [],
}
