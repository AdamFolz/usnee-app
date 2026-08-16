/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        usnee: {
          void: 'var(--color-bg-void)',
          bg: 'var(--color-bg-base)',
          surface: 'var(--color-surface-1)',
          surface2: 'var(--color-surface-2)',
          surface3: 'var(--color-surface-3)',
          glass: 'var(--color-surface-glass)',
          glassStrong: 'var(--color-surface-glass-strong)',
          borderSubtle: 'var(--color-border-subtle)',
          border: 'var(--color-border-default)',
          borderStrong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
          text: 'var(--color-text-primary)',
          text2: 'var(--color-text-secondary)',
          text3: 'var(--color-text-tertiary)',
          brand: 'var(--color-brand-primary)',
          brand2: 'var(--color-brand-secondary)',
          accent: 'var(--color-brand-secondary)',
          accent2: 'var(--color-brand-accent)',
          cyan: 'var(--color-cyan)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          info: 'var(--color-info)'
        }
      },

      fontFamily: {
        sans: ['var(--font-ui)'],
        display: ['var(--font-display)']
      },
      fontSize: {
        'display-xl': ['2.5rem', { lineHeight: '2.75rem', fontWeight: '800' }],
        'display-lg': ['2rem', { lineHeight: '2.25rem', fontWeight: '800' }],
        'title-xl': ['1.5rem', { lineHeight: '1.875rem', fontWeight: '700' }],
        'title-lg': ['1.25rem', { lineHeight: '1.625rem', fontWeight: '700' }],
        'title-md': ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'body-md': ['.875rem', { lineHeight: '1.3125rem', fontWeight: '500' }],
        'body-sm': ['.75rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        label: ['.6875rem', { lineHeight: '.875rem', fontWeight: '700', letterSpacing: '.06em' }],
        caption: ['.625rem', { lineHeight: '.875rem', fontWeight: '600' }]
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        card: 'var(--radius-card)',
        hero: 'var(--radius-hero)'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        hero: 'var(--shadow-hero)',
        sos: 'var(--shadow-sos)'
      },
      backdropBlur: {
        glass: 'var(--blur-glass)'
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        normal: 'var(--motion-normal)',
        sheet: 'var(--motion-sheet)'
      },
      transitionTimingFunction: {
        ui: 'var(--easing-ui)'
      },
      keyframes: {
        'sheet-in': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'toast-in': {
          from: { transform: 'translateY(-.75rem)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'sheet-in': 'sheet-in var(--motion-sheet) var(--easing-ui)',
        'toast-in': 'toast-in var(--motion-normal) var(--easing-ui)'
      }
    }
  },
  plugins: []
};
