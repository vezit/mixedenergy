module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}", // Include this if you have a components folder
    ],
    theme: {
      extend: {},
    },
    plugins: [],
    extend: {
      animation: {
        'spin-slow': 'circle 6s linear infinite', // Adjust timing as needed
      }
    }
  }
  