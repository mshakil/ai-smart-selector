/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  // No preflight — we're injecting into Shadow DOM and don't want a CSS reset.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Catppuccin Mocha palette as design tokens.
        surface: '#1e1e2e',
        crust:   '#181825',
        overlay: '#1d2038',
        border:  '#313244',
        muted:   '#6c7086',
        subtle:  '#45475a',
        text:    '#cdd6f4',
        subtext: '#a6adc8',
        green:   '#a6e3a1',
        yellow:  '#f9e2af',
        red:     '#f38ba8',
        blue:    '#89b4fa',
        sky:     '#89dceb',
      },
    },
  },
  plugins: [],
};
