/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        display: ['Syne', '"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        // Enforcing zinc palette explicitly if needed, but tailwind standard is fine.
        // We can extend generic names to map to zinc for semantic usage.
        background: '#09090b', // zinc-950
        surface: '#18181b', // zinc-900
        border: '#27272a', // zinc-800
      }
    },
  },
  plugins: [],
}
