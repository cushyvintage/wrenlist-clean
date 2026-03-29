import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#059669',
        secondary: '#f59e0b',
      },
    },
  },
  plugins: [],
}

export default config
