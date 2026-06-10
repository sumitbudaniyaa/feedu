const preset = require('@feedo/config/tailwind');
const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Scan the shared UI package so its class names are not purged.
    path.join(path.dirname(require.resolve('@feedo/ui/package.json')), 'src/**/*.{ts,tsx}'),
  ],
};
