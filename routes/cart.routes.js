const express = require('express');
const { validate } = require('../middleware/validate');
const { authRequired } = require('../middleware/auth');
const {
  addCartSchema,
  updateCartItemSchema,
  deleteCartItemSchema,
  mergeCartSchema,
} = require('../validators/cart.schemas');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', cartController.getCart);
router.post('/add', validate(addCartSchema), cartController.addItem);
router.put('/item', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/item', validate(deleteCartItemSchema), cartController.removeItem);
router.post('/merge', validate(mergeCartSchema), cartController.merge);

module.exports = router;
