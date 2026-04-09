const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: '7d',
  });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
  };
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone = '', address = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      phone,
      address,
    });

    return res.status(201).json({
      message: 'Signup successful',
      data: {
        token: signToken(user._id),
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to signup', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json({
      message: 'Login successful',
      data: {
        token: signToken(user._id),
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login', error: error.message });
  }
});

router.get('/me', authRequired, async (req, res) => {
  return res.status(200).json({ data: { user: req.user } });
});

router.put('/me', authRequired, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (typeof name === 'string') req.user.name = name.trim();
    if (typeof phone === 'string') req.user.phone = phone.trim();
    if (typeof address === 'string') req.user.address = address.trim();
    await req.user.save();

    return res.status(200).json({
      message: 'Profile updated',
      data: { user: sanitizeUser(req.user) },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update profile', error: error.message });
  }
});

module.exports = router;
