const svc = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password are required');

  const user = await svc.findUserByEmail(email);
  if (!user || !(await svc.verifyPassword(password, user.password))) {
    return fail(res, 'Invalid credentials', 401);
  }
  const token = svc.signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return fail(res, 'Name, email and password are required');
  if (await svc.emailExists(email))  return fail(res, 'Email already registered', 409);

  const user = await svc.createUser({ name, email, password, role });
  res.status(201).json(user);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await svc.findUserById(req.user.id);
  if (!user) return fail(res, 'User not found', 404);
  res.json(user);
});

const getUsers = asyncHandler(async (_req, res) => {
  res.json(await svc.getAllUsers());
});

const updateUser = asyncHandler(async (req, res) => {
  await svc.updateUserById(req.params.id, req.body);
  res.json({ message: 'User updated' });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return fail(res, 'Cannot delete your own account');
  }
  await svc.deleteUserById(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = { login, register, getMe, getUsers, updateUser, deleteUser };
