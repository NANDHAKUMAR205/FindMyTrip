const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

module.exports = async (req, _res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return next();
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = await User.findById(payload.userId).select('-passwordHash');
  } catch {
    req.user = undefined;
  }
  next();
};
