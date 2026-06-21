const preset = require('@feedo/config/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // Exact accents pulled from the @feedo/ui theme tokens, used inside the dark product
        // mockups + interactive demo so they match the real apps pixel-for-pixel.
        app: {
          green: '#10B981', // customer buttons / kitchen "ready" / success (160 84% 39%)
          violet: '#8B5CF6', // admin accent (258 90% 66%)
          amber: '#FBBF24', // kitchen "preparing" card (amber-400)
          blue: '#3B82F6', // platform accent (217 91% 60%)
          ink: '#090909', // staff app background
          card: '#111111', // staff app card
          cust: '#0D0D0D', // customer app background
          custcard: '#171717', // customer app card
        },
      },
    },
  },
};
