const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_SEARCHES = 8;

module.exports = (req, res, next) => {
  const key = String(req.user?._id || req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > MAX_SEARCHES) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, error: 'Search limit reached. Please wait a minute and try again.' });
  }
  if (buckets.size > 5000) {
    for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry);
  }
  next();
};
