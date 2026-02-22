import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: {
                    base: '#080b0f',
                    elevated: '#0d1117',
                    card: '#111820',
                    hover: '#161e28',
                },
                accent: {
                    green: '#00d4a0',
                    red: '#ff4d6d',
                    amber: '#f5a623',
                    blue: '#4d9fff',
                    purple: '#b388ff',
                },
                border: {
                    dim: 'rgba(255,255,255,0.06)',
                    bright: 'rgba(255,255,255,0.12)',
                },
                text: {
                    primary: '#e8edf2',
                    secondary: '#7a8899',
                    muted: '#3d4f62',
                },
            },
            fontFamily: {
                sans: ['DM Sans', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
                display: ['Bebas Neue', 'sans-serif'],
            },
            boxShadow: {
                glass: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                panel: '0 8px 32px rgba(0,0,0,0.6)',
            },
        },
    },
    plugins: [],
};

export default config;
