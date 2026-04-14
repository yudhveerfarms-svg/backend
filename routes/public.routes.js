const express = require('express');
const { validate } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/apiLimiter');
const { contactSchema } = require('../validators/contact.schemas');
const productController = require('../controllers/product.controller');
const contactController = require('../controllers/contact.controller');
const systemController = require('../controllers/system.controller');

const router = express.Router();

router.get('/health', systemController.health);
router.get('/test', systemController.test);
router.get('/products', productController.listProducts);
router.post('/contact', contactLimiter, validate(contactSchema), contactController.submitContact);

module.exports = router;
