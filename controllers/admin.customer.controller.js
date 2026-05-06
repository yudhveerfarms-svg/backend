const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.schemas');
const customerAdminService = require('../services/customer.admin.service');

const list = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const data = await customerAdminService.listAdminCustomers({ q, page, limit });
  return sendSuccess(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await customerAdminService.getAdminCustomer(req.params.customerId);
  return sendSuccess(res, data);
});

const create = asyncHandler(async (req, res) => {
  const parsed = createCustomerSchema.parse(req.body);
  const data = await customerAdminService.createAdminCustomer(parsed);
  return sendCreated(res, data, 'Customer created successfully');
});

const update = asyncHandler(async (req, res) => {
  const parsed = updateCustomerSchema.parse(req.body);
  const data = await customerAdminService.updateAdminCustomer(req.params.customerId, parsed);
  return sendSuccess(res, data, { message: 'Customer updated successfully' });
});

const remove = asyncHandler(async (req, res) => {
  await customerAdminService.deleteAdminCustomer(req.params.customerId);
  return sendSuccess(res, {}, { message: 'Customer deleted successfully' });
});

module.exports = { list, getOne, create, update, remove };
