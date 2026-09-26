const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, preferences: user.preferences });
exports.register = async (req, res, next) => { try {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ success: false, error: 'Name, valid email and password (8+ characters) are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ success: false, error: 'Email is already registered' });
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ success: true, user: publicUser(user), token: jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' }) });
} catch (e) { next(e); } };
exports.login = async (req, res, next) => { try {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ success: false, error: 'Invalid email or password' });
  res.json({ success: true, user: publicUser(user), token: jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' }) });
} catch (e) { next(e); } };
exports.me = async (req, res) => res.json({ success: true, user: publicUser(req.user) });
exports.preferences = async (req, res, next) => { try {
  const allowed = ['currency', 'travelStyle', 'preferredCabin', 'interests'];
  const changes = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body || {}, key)).map((key) => [key, req.body[key]]));
  if (changes.currency && !['USD', 'EUR', 'GBP', 'INR'].includes(changes.currency)) return res.status(400).json({ success: false, error: 'Unsupported currency.' });
  if (changes.travelStyle && !['balanced', 'budget', 'comfort'].includes(changes.travelStyle)) return res.status(400).json({ success: false, error: 'Unsupported travel style.' });
  if (changes.interests && (!Array.isArray(changes.interests) || changes.interests.some((item) => typeof item !== 'string'))) return res.status(400).json({ success: false, error: 'Interests must be a list of text values.' });
  req.user.preferences = { ...req.user.preferences.toObject(), ...changes };
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
} catch (e) { next(e); } };
