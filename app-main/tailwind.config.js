export const content = [
  "./pages/**/*.{js,ts,jsx,tsx}",
  "./components/**/*.{js,ts,jsx,tsx}", // Include this if you have a components folder
];
export const theme = {
  extend: {
    colors: {
      primary: '#1D4ED8',
      secondary: '#9333EA',
      customYellow: '#F5992F',
      customOrange: '#FF8C00',
    },
    animation: {
      'spin-slow': 'circle 6s linear infinite', // Adjust timing as needed
    },
    aspectRatio: {
      '463/775': '463 / 775', // Custom aspect ratio
    },
    zIndex: {
      '60': '60',
      '70': '70',
      '80': '80',
      '90': '90',
      '100': '100',
    },
  },
};
export const plugins = [
  require('@tailwindcss/aspect-ratio'),
];
export const extend = {
  animation: {
    'spin-slow': 'circle 6s linear infinite', // Adjust timing as needed
  }
};
  