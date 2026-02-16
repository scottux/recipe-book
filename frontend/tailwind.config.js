/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cookbook: {
          cream: '#F9F6F2',
          paper: '#FDF8F3',
          aged: '#E8DED0',
          brown: '#b7ab9a82',
          darkbrown: '#1A252F',
          accent: '#B8845A',
          text: '#2D2420',
        }
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'serif'],
        'body': ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        'body-print': ['"Lora"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(139, 90, 60, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(139, 90, 60, 0.06)',
        'cookbook': '0 8px 16px -4px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
      }
    },
  },
  plugins: [],
}
