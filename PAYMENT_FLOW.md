# Razorpay Payment Flow

## Environment variables

Add these to your `.env`:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `MONGO_URI`
- `PORT` (optional)
- `CLIENT_URL` (optional)

## Backend APIs

### 1) Create checkout order

- `POST /api/checkout/create-order`
- Body:

```json
{
  "items": [
    { "productId": "mongo_product_id", "quantity": 2 }
  ],
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9999999999",
    "address": "Delhi"
  }
}
```

Response returns:
- internal `orderId` and `orderNumber`
- `razorpayOrderId`
- `key` (publishable key id)
- `amount` in paise and `currency`

### 2) Verify payment

- `POST /api/checkout/verify`
- Body:

```json
{
  "orderId": "internal_order_id",
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_from_checkout_handler",
  "meta": {}
}
```

Backend verifies HMAC signature using `RAZORPAY_KEY_SECRET` and then fetches payment details from Razorpay API.

### 3) Mark failed payment

- `POST /api/checkout/mark-failed`
- Body:

```json
{
  "orderId": "internal_order_id",
  "razorpayOrderId": "order_xxx",
  "reason": "Payment cancelled by user",
  "meta": {}
}
```

### 4) Retry payment attempt

- `POST /api/checkout/:orderId/retry`

Creates a fresh Razorpay order for the same internal order when not paid yet.

### 5) Get payment status

- `GET /api/checkout/:orderId/status`

Use this for post-checkout polling or on refresh/reload.

## Standard flow to use in frontend

1. Call `create-order`.
2. Open Razorpay Checkout using response `key`, `amount`, `currency`, `razorpayOrderId`.
3. On successful callback from Razorpay, send IDs/signature to `verify`.
4. If checkout fails/cancelled, call `mark-failed`.
5. If user retries, call `retry`, then open Razorpay again.
6. Always call `status` before final success UI rendering.

## Notes

- Amount is stored in INR (rupees) in DB and converted to paise only for Razorpay API.
- Internal order status is idempotent: repeated successful verify calls for paid order return success without duplicating payment state.
- Product prices are sourced from DB; ensure all products have a valid numeric `price`.
