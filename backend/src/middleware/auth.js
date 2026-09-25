const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

module.exports = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required' });
    const payload = jwt.verify(token, jwtSecret);
    req.user = await User.findById(payload.userId).select('-passwordHash');
    if (!req.user) return res.status(401).json({ success: false, error: 'User not found' });
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
