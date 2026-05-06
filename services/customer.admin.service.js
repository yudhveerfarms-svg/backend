const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const bcrypt = require('bcryptjs');

async function listAdminCustomers({ q = '', page = 1, limit = 20 }) {
  const query = { role: 'user' };

  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    User.find(query)
      .select('-password -cartItems')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    customers,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
}

async function getAdminCustomer(customerId) {
  const customer = await User.findById(customerId).select('-password');
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  return customer;
}

async function createAdminCustomer(payload) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw new AppError('Email is already registered', 400);
  }

  let password = payload.password;
  if (!password) {
    // Generate a random password if not provided
    password = Math.random().toString(36).slice(-8);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const customer = await User.create({
    ...payload,
    password: hashedPassword,
  });

  const customerObj = customer.toObject();
  delete customerObj.password;
  return customerObj;
}

async function updateAdminCustomer(customerId, payload) {
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  if (payload.email && payload.email !== customer.email) {
    const existing = await User.findOne({ email: payload.email });
    if (existing) {
      throw new AppError('Email is already in use by another user', 400);
    }
    customer.email = payload.email;
  }

  if (payload.name !== undefined) customer.name = payload.name;
  if (payload.phone !== undefined) customer.phone = payload.phone;
  if (payload.address !== undefined) customer.address = payload.address;
  if (payload.role !== undefined) customer.role = payload.role;

  if (payload.password) {
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(payload.password, salt);
  }

  await customer.save();

  const customerObj = customer.toObject();
  delete customerObj.password;
  return customerObj;
}

async function deleteAdminCustomer(customerId) {
  const customer = await User.findByIdAndDelete(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  return customer;
}

module.exports = {
  listAdminCustomers,
  getAdminCustomer,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer,
};
