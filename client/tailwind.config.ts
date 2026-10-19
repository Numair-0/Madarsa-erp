import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { navy: { DEFAULT: '#0B1F3A', 700: '#14305a' }, gold: { DEFAULT: '#B8923A', 100: '#f6efdc' }, paper: '#FAF9F6' } } }, plugins: [] } satisfies Config;
