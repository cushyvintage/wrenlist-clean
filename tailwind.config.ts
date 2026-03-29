import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/styles/**/*.{ts,tsx,css}',
  ],
  theme: {
    extend: {
      colors: {
        // Wrenlist palette
        cream: {
          DEFAULT: '#F5F0E8',
          md: '#EDE8DE',
          dk: '#E0D9CC',
        },
        sage: {
          DEFAULT: '#3D5C3A',
          lt: '#5A7A57',
          dk: '#2C4428',
          dim: '#8A9E88',
          pale: '#D4E2D2',
        },
        ink: {
          DEFAULT: '#1E2E1C',
          md: '#4A5E48',
          lt: '#6B7D6A',
        },
        amber: {
          DEFAULT: '#BA7517',
          lt: '#EDD9A3',
          dk: '#7A5010',
        },
        sidebar: '#1E2E1C',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Jost', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-xl': ['56px', { lineHeight: '1.04', fontWeight: '400' }],
        'display-lg': ['42px', { lineHeight: '1.08', fontWeight: '400' }],
        'display-md': ['32px', { lineHeight: '1.1', fontWeight: '400' }],
        'display-sm': ['24px', { lineHeight: '1.2', fontWeight: '400' }],
        'eyebrow': ['10px', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.14em' }],
        'label': ['11px', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.09em' }],
      },
      borderRadius: {
        DEFAULT: '3px',
        md: '6px',
        lg: '10px',
      },
      borderColor: {
        DEFAULT: 'rgba(61, 92, 58, 0.14)',
        md: 'rgba(61, 92, 58, 0.22)',
        strong: 'rgba(61, 92, 58, 0.4)',
      },
    },
  },
  plugins: [],
}

export default config
