const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://yudhveerfarms.com',
  'http://yudhveerfarms.com',
  'https://www.yudhveerfarms.com',
  'http://www.yudhveerfarms.com',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: Origin not allowed - ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

module.exports = { corsOptions, allowedOrigins };
