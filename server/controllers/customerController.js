const svc = require('../services/customerService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  res.json(await svc.findAll(req.query.search));
});

const getOne = asyncHandler(async (req, res) => {
  const customer = await svc.findById(req.params.id);
  if (!customer) return fail(res, 'Customer not found', 404);
  res.json(customer);
});

const create = asyncHandler(async (req, res) => {
  const { full_name, phone, address } = req.body;
  if (!full_name || !phone || !address) {
    return fail(res, 'Full name, phone and address are required');
  }
  res.status(201).json(await svc.create(req.body));
});

const update = asyncHandler(async (req, res) => {
  const { full_name, phone, address } = req.body;
  if (!full_name || !phone || !address) {
    return fail(res, 'Full name, phone and address are required');
  }
  const existing = await svc.findById(req.params.id);
  if (!existing) return fail(res, 'Customer not found', 404);

  res.json(await svc.update(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  if (await svc.hasLoans(req.params.id)) {
    return fail(res, 'Cannot delete customer with existing loans');
  }
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return fail(res, 'Customer not found', 404);
  res.json({ message: 'Customer deleted' });
});

module.exports = { getAll, getOne, create, update, remove };
