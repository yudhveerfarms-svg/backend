const admin = require('firebase-admin');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { signToken } = require('./token.service');

// Check if Firebase credentials are available
const hasFirebaseCredentials = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_CLIENT_EMAIL && 
  process.env.FIREBASE_PRIVATE_KEY;

// Initialize Firebase Admin SDK only if credentials are available
let auth = null;
if (hasFirebaseCredentials && !admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    auth = admin.auth();
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
  }
} else if (!hasFirebaseCredentials) {
  console.warn('⚠️ Firebase credentials not found. Google login will be disabled.');
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role || 'user',
  };
}

async function verifyFirebaseToken(idToken) {
  if (!auth) {
    throw new AppError('Firebase authentication is not configured. Please set up Firebase credentials.', 503);
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new AppError('Invalid Firebase token', 401);
  }
}

async function firebaseLogin(idToken) {
  if (!auth) {
    throw new AppError('Firebase authentication is not configured. Please set up Firebase credentials.', 503);
  }

  const decodedToken = await verifyFirebaseToken(idToken);
  const { email, name, picture } = decodedToken;

  if (!email) {
    throw new AppError('Email is required from Google account', 400);
  }

  // Check if user exists
  let user = await User.findOne({ email });

  if (!user) {
    // Create new user if doesn't exist (auto signup)
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      phone: '',
      address: '',
      role: 'user',
      googleId: decodedToken.uid,
      avatar: picture,
    });
  } else {
    // Update existing user's Google info if needed
    if (!user.googleId) {
      user.googleId = decodedToken.uid;
    }
    if (!user.avatar && picture) {
      user.avatar = picture;
    }
    if (!user.name && name) {
      user.name = name;
    }
    await user.save();
  }

  return {
    token: signToken(user._id),
    user: sanitizeUser(user),
  };
}

module.exports = {
  sanitizeUser,
  verifyFirebaseToken,
  firebaseLogin,
};
