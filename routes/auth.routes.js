const express = require('express');
const { validate } = require('../middleware/validate');
const { authRequired } = require('../middleware/auth');
const { authLimiter } = require('../middleware/apiLimiter');
const { signupSchema, loginSchema, updateProfileSchema, firebaseLoginSchema } = require('../validators/auth.schemas');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/admin/login', authLimiter, validate(loginSchema), authController.adminLogin);
router.post('/firebase-login', authLimiter, validate(firebaseLoginSchema), authController.firebaseLogin);

router.get('/me', authRequired, authController.me);
router.put('/me', authRequired, validate(updateProfileSchema), authController.updateMe);

module.exports = router;
