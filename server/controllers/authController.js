const svc      = require('../services/authService');
const tokenSvc = require('../services/tokenService');
const emailSvc = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

const GENERIC_RESET_MSG = 'If an account exists for that email, a reset link has been sent.';

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return fail(res, 'Email and password are required');

  const user = await svc.findUserByEmail(email);
  if (!user || !(await svc.verifyPassword(password, user.password))) {
    return fail(res, 'Invalid credentials', 401);
  }
  const token = svc.signToken(user, Boolean(rememberMe));
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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // Always return the same generic response — never leak whether email exists
  if (!email) return res.json({ message: GENERIC_RESET_MSG });

  const user = await svc.findUserByEmail(email);
  if (!user) return res.json({ message: GENERIC_RESET_MSG });

  const { rawToken, hashed, expires } = tokenSvc.generateResetToken();
  await svc.setResetToken(user.id, hashed, expires);

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
  try {
    await emailSvc.sendResetEmail(user.email, user.name, resetUrl);
  } catch (emailErr) {
    console.error('Reset email failed:', emailErr.message);
    await svc.clearResetToken(user.id);
    return fail(res, 'Failed to send reset email. Please try again later.', 500);
  }

  res.json({ message: GENERIC_RESET_MSG });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || String(password).trim().length < 6) {
    return fail(res, 'Password must be at least 6 characters', 400);
  }

  const hashed = tokenSvc.hashToken(token);
  const user   = await svc.findUserByResetToken(hashed);

  if (!user) return fail(res, 'Reset link is invalid or has expired. Please request a new one.', 400);

  await svc.updatePassword(user.id, password);
  await svc.clearResetToken(user.id);

  res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
});

module.exports = { login, register, getMe, getUsers, updateUser, deleteUser, forgotPassword, resetPassword };
