const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const admin = require('../config/firebase');

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
    authProvider: user.authProvider,
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
      authProvider: 'email',
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

    if (!user.password) {
      return res.status(401).json({
        message: 'This account uses Google login. Please use "Continue with Google".',
      });
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

router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    if (!admin) {
      return res.status(500).json({ message: 'Firebase Admin SDK is not properly configured on server.' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      return res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }

    const { uid, email, name, picture } = decodedToken;
    const userEmail = String(email).toLowerCase().trim();
    const userName = name || 'Yudhveer Customer';

    let user = await User.findOne({ email: userEmail });

    if (!user) {
      user = await User.create({
        name: userName,
        email: userEmail,
        googleId: uid,
        authProvider: 'google',
      });
    } else {
      if (!user.googleId) user.googleId = uid;
      if (!user.name) user.name = userName;
      await user.save();
    }

    return res.status(200).json({
      message: 'Login successful',
      data: {
        token: signToken(user._id),
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to complete Google login', error: error.message });
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
