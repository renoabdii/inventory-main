const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const getAttemptKey = (req) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${username}`;
};

const loginRateLimit = (req, res, next) => {
  const key = getAttemptKey(req);
  const now = Date.now();

  if (attempts.size > 1000) {
    attempts.forEach((entry, attemptKey) => {
      if (entry.expiresAt <= now) attempts.delete(attemptKey);
    });
  }

  const current = attempts.get(key);

  if (current && current.expiresAt > now && current.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((current.expiresAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    });
  }

  if (current && current.expiresAt <= now) attempts.delete(key);

  res.on('finish', () => {
    if (res.statusCode === 401) {
      const entry = attempts.get(key);
      attempts.set(key, {
        count: (entry?.count || 0) + 1,
        expiresAt: entry?.expiresAt && entry.expiresAt > now ? entry.expiresAt : now + WINDOW_MS,
      });
    } else if (res.statusCode < 400) {
      attempts.delete(key);
    }
  });

  next();
};

const clearLoginAttempts = () => attempts.clear();

module.exports = {
  loginRateLimit,
  getAttemptKey,
  clearLoginAttempts,
  MAX_ATTEMPTS,
};
