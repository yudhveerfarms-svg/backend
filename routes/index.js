const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
// router.use('/users', require('./user.routes')); // Temporarily disabled
router.use('/cart', require('./cart.routes'));
router.use('/checkout', require('./checkout.routes'));
router.use('/invoice', require('./invoice.routes'));
router.use('/orders', require('./order.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/', require('./public.routes'));

module.exports = router;
