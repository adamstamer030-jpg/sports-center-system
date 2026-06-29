/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14181C',
          soft: '#3A4248',
          mute: '#7A8389',
        },
        paper: '#F7F6F3',
        surface: '#FFFFFF',
        line: {
          DEFAULT: '#E4E1DA',
          soft: '#EEEBE4',
        },
        // brand = اللون المتغيّر لكل نظام (عيادة/جيم/صيدلية..) — القيمة الافتراضية هنا تيل غامق
        brand: {
          50: '#EAF4F1',
          100: '#CFE6DF',
          200: '#9FCDBF',
          300: '#6FB39E',
          400: '#3F9A7E',
          500: '#0F6B5C',
          600: '#0C594D',
          700: '#0A473E',
          800: '#07352F',
          900: '#052420',
          DEFAULT: '#0F6B5C',
        },
        amber: {
          500: '#C8862D',
          100: '#F6E6CE',
        },
        danger: {
          500: '#C1473D',
          100: '#F5DAD7',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'Tahoma', 'sans-serif'],
        display: ['"Noto Kufi Arabic"', '"IBM Plex Sans Arabic"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,24,28,0.04), 0 4px 16px -4px rgba(20,24,28,0.06)',
        pop: '0 10px 30px -8px rgba(20,24,28,0.18)',
      },
    },
  },
  plugins: [],
};
