/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          light: '#bfdbfe', // blue-200
          dark: '#1d4ed8', // blue-700
        },
        secondary: {
          DEFAULT: '#eff6ff', // blue-50 (not in grep, but often paired with blue-100/200)
          light: '#dbeafe', // blue-100
        },
        accent: {
          DEFAULT: '#4f46e5', // indigo-600
          dark: '#4338ca', // indigo-700
        },
        success: {
          DEFAULT: '#047857', // green-700
          light: '#dcfce7', // green-100
        },
        danger: {
          DEFAULT: '#b91c1c', // red-700
          light: '#fee2e2', // red-100
        },
        neutral: {
          50: '#f9fafb',   // gray-50
          100: '#f3f4f6',  // gray-100
          200: '#e5e7eb',  // gray-200
          300: '#d1d5db',
          400: '#9ca3af',  // gray-400
          500: '#6b7280',
          600: '#4b5563',  // gray-600
          700: '#374151',  // gray-700
          800: '#1f2937',  // gray-800
          900: '#111827',  // gray-900
        },
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },
  },
  plugins: [],
};
