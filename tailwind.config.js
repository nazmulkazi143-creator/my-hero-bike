const c = (v) => `rgb(var(--${v}) / <alpha-value>)`
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { bg: c('bg'), card: c('card'), card2: c('card2'), line: c('line'), fg: c('fg'), muted: c('muted'), inc: c('inc'), exp: c('exp'), acc: c('acc') },
      fontFamily: { sans: ['Inter', 'system-ui', '"Noto Sans Bengali"', '"Hind Siliguri"', 'Kalpurush', 'Roboto', 'sans-serif'] },
      keyframes: {
        up: { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { from: { transform: 'scale(.96)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      animation: { up: 'up .28s cubic-bezier(.2,.8,.2,1)', fade: 'fade .2s ease-out', pop: 'pop .2s ease-out' },
    },
  },
  plugins: [],
}
