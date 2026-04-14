const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB id');

module.exports = { objectId };
