const { User } = require('../models/User');
const { issueToken } = require('../middleware/auth');

async function register(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash });
  const token = issueToken(user.id);
  return res.status(201).json({ token, user: user.toJSON() });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = issueToken(user.id);
  return res.json({ token, user: user.toJSON() });
}

async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: user.toJSON() });
}

module.exports = { register, login, me };
