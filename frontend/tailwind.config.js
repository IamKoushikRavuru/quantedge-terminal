/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Deep dark terminal canvas
                terminal: {
                    950: '#060a0f',
                    900: '#0b0f14',
                    850: '#0e1117',
                    800: '#131920',
                    750: '#171e27',
                    700: '#1c2430',
                    600: '#243040',
                    500: '#2d3d52',
                    400: '#4a5f75',
                    300: '#6b7f95',
                    200: '#8fa0b3',
                    100: '#b8c8d8',
                    50: '#dde6ef',
                },
                // Neon accent palette
                neon: {
                    blue: '#2196f3',
                    cyan: '#00bcd4',
                    green: '#00e676',
                    teal: '#1de9b6',
                    amber: '#ffb300',
                    red: '#ff1744',
                    purple: '#7c4dff',
                },
                // Legacy aliases for backward compat
                institutional: {
                    900: '#0b0f14',
                    800: '#0e1117',
                    700: '#1c2430',
                    600: '#243040',
                    500: '#2d3d52',
                    400: '#6b7f95',
                    300: '#b8c8d8',
                    200: '#dde6ef',
                    100: '#f0f4f8',
                    50: '#f8fafc',
                },
                primary: {
                    600: '#1565c0',
                    500: '#2196f3',
                    400: '#42a5f5',
                    300: '#90caf9',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            fontSize: {
                'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            boxShadow: {
                'glass': '0 4px 24px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                'glow-blue': '0 0 20px rgba(33,150,243,0.25)',
                'glow-green': '0 0 20px rgba(0,230,118,0.2)',
                'panel': '0 8px 32px rgba(0,0,0,0.6)',
            },
            backgroundImage: {
                'gradient-dark': 'linear-gradient(180deg, #0e1117 0%, #0b0f14 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(28,36,48,0.9) 0%, rgba(11,15,20,0.95) 100%)',
                'gradient-neon': 'linear-gradient(90deg, #2196f3 0%, #00bcd4 100%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.25s ease-out',
                'pulse-dot': 'pulseDot 2s ease-in-out infinite',
                'tick': 'tick 0.15s ease-out',
            },
            keyframes: {
                fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
                tick: { from: { transform: 'scale(1.04)' }, to: { transform: 'scale(1)' } },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
