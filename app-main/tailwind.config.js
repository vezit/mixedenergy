module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}", // Include this if you have a components folder
    ],
    theme: {
      extend: {
        colors: {
          primary: '#1D4ED8',
          secondary: '#9333EA',
        },
      },
    },
    // darkMode: 'class', // Enable dark mode
    plugins: [],
    extend: {
      animation: {
        'spin-slow': 'circle 6s linear infinite', // Adjust timing as needed
      }
    }
  }
  