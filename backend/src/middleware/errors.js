module.exports = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}]`, err);
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message || 'Server error' });
};
