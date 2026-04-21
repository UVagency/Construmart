/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './experience.html',
    './success.html',
    './src/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        // Construmart — marca cliente (primaria para la experiencia)
        cm: {
          navy: '#041E42',
          'navy-800': '#0A2A5A',
          blue: '#2A5DB9',
          'blue-700': '#214A94',
          yellow: '#FFB81C',
          'yellow-bright': '#FFD500',
          gray: '#F0F1F5',
          white: '#FFFFFF'
        },
        // UV Agency — se conserva para co-branding discreto en footer
        uv: {
          orange: '#FE7F2D',
          teal: '#6BD8D7',
          dark: '#2C3E3C',
          cream: '#F5F6E8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
