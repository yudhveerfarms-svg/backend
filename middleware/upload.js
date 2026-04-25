const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { AppError } = require('../utils/AppError');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = safeName(path.basename(file.originalname || 'image', ext));
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext || '.jpg'}`);
  },
});

function fileFilter(_req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
  if (!ok) return cb(new AppError('Only image uploads are allowed', 400));
  return cb(null, true);
}

const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024), // 5MB
    files: Number(process.env.UPLOAD_MAX_FILES || 8),
  },
}).array('images', Number(process.env.UPLOAD_MAX_FILES || 8));

module.exports = { uploadProductImages };

