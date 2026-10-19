const API_URL = process.env.API_URL || 'http://localhost:4000';
/** Same-origin proxy: the browser only talks to Next; httpOnly cookie never needs CORS. */
export default { reactStrictMode: true, async rewrites() { return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]; } };
