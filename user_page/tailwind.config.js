/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: 'var(--color-border)', /* gray-200 */
                input: 'var(--color-input)', /* blue-tinted-surface */
                ring: 'var(--color-ring)', /* calm-blue */
                background: 'var(--color-background)', /* near-white */
                foreground: 'var(--color-foreground)', /* dark-gray-700 */
                primary: {
                    DEFAULT: 'var(--color-primary)', /* calm-blue */
                    foreground: 'var(--color-primary-foreground)', /* white */
                },
                secondary: {
                    DEFAULT: 'var(--color-secondary)', /* soft-green */
                    foreground: 'var(--color-secondary-foreground)', /* white */
                },
                destructive: {
                    DEFAULT: 'var(--color-destructive)', /* muted-red */
                    foreground: 'var(--color-destructive-foreground)', /* white */
                },
                muted: {
                    DEFAULT: 'var(--color-muted)', /* blue-tinted-surface */
                    foreground: 'var(--color-muted-foreground)', /* gray-500 */
                },
                accent: {
                    DEFAULT: 'var(--color-accent)', /* warm-orange */
                    foreground: 'var(--color-accent-foreground)', /* white */
                },
                popover: {
                    DEFAULT: 'var(--color-popover)', /* white */
                    foreground: 'var(--color-popover-foreground)', /* dark-gray-700 */
                },
                card: {
                    DEFAULT: 'var(--color-card)', /* white */
                    foreground: 'var(--color-card-foreground)', /* dark-gray-700 */
                },
                success: {
                    DEFAULT: 'var(--color-success)', /* gentle-green */
                    foreground: 'var(--color-success-foreground)', /* white */
                },
                warning: {
                    DEFAULT: 'var(--color-warning)', /* soft-orange */
                    foreground: 'var(--color-warning-foreground)', /* white */
                },
                error: {
                    DEFAULT: 'var(--color-error)', /* muted-red */
                    foreground: 'var(--color-error-foreground)', /* white */
                },
                surface: 'var(--color-surface)', /* blue-tinted-surface */
                'text-primary': 'var(--color-text-primary)', /* dark-gray-700 */
                'text-secondary': 'var(--color-text-secondary)', /* gray-500 */
            },
            fontFamily: {
                'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
                'heading': ['Noto Sans JP', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
                'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
                'caption': ['Noto Sans JP', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
            },
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
                '5xl': ['3rem', { lineHeight: '1' }],
                '6xl': ['3.75rem', { lineHeight: '1' }],
            },
            borderRadius: {
                'lg': '8px',
                'md': '6px',
                'sm': '4px',
            },
            boxShadow: {
                'soft': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                'medium': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
            },
            animation: {
                'breathing': 'breathing 2s ease-in-out infinite',
            },
            keyframes: {
                breathing: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.02)' },
                },
            },
            transitionDuration: {
                '200': '200ms',
                '300': '300ms',
            },
            transitionTimingFunction: {
                'gentle': 'ease-out',
            },
            minHeight: {
                'touch': '44px',
            },
            minWidth: {
                'touch': '44px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('tailwindcss-animate'),
    ],
}