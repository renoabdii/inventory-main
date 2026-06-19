const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { authenticate } = require('../src/middlewares/auth');
const {
  loginRateLimit,
  getAttemptKey,
  clearLoginAttempts,
} = require('../src/middlewares/loginRateLimit');
const { validatePassword } = require('../src/utils/passwordPolicy');
const { signUserToken } = require('../src/utils/token');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.body = null;
    this.headers = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(payload) {
    this.body = payload;
    return this;
  }

  set(name, value) {
    this.headers[name] = value;
    return this;
  }
}

test('password minimal 8 karakter serta mengandung huruf dan angka', () => {
  assert.equal(validatePassword('abc123').valid, false);
  assert.equal(validatePassword('abcdefgh').valid, false);
  assert.equal(validatePassword('12345678').valid, false);
  assert.equal(validatePassword('aman1234').valid, true);
});

test('kunci rate limit menormalisasi IP dan username', () => {
  assert.equal(
    getAttemptKey({ ip: '127.0.0.1', body: { username: ' Admin ' } }),
    '127.0.0.1:admin'
  );
});

test('login diblokir setelah lima kegagalan pada IP dan username yang sama', () => {
  clearLoginAttempts();
  const req = { ip: '127.0.0.1', body: { username: 'admin' } };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = new MockResponse();
    let nextCalled = false;
    loginRateLimit(req, res, () => {
      nextCalled = true;
      res.statusCode = 401;
      res.emit('finish');
    });
    assert.equal(nextCalled, true);
  }

  const blockedResponse = new MockResponse();
  let blockedNextCalled = false;
  loginRateLimit(req, blockedResponse, () => {
    blockedNextCalled = true;
  });

  assert.equal(blockedNextCalled, false);
  assert.equal(blockedResponse.statusCode, 429);
  assert.ok(blockedResponse.headers['Retry-After']);
  clearLoginAttempts();
});

test('JWT default membawa tokenVersion dan berlaku 12 jam', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiry = process.env.JWT_EXPIRES_IN;
  process.env.JWT_SECRET = 'test-secret-with-enough-length';
  delete process.env.JWT_EXPIRES_IN;

  try {
    const token = signUserToken({
      _id: 'user-1',
      username: 'admin',
      role: 'admin',
      tokenVersion: 3,
    });
    const decoded = jwt.decode(token);
    assert.equal(decoded.tv, 3);
    assert.equal(decoded.exp - decoded.iat, 12 * 60 * 60);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previousExpiry;
  }
});

test('middleware menolak JWT dengan tokenVersion lama', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'test-secret-with-enough-length';
  const token = jwt.sign({ id: 'user-1', tv: 1 }, process.env.JWT_SECRET, { expiresIn: '12h' });

  User.findById = () => ({
    select: async () => ({ _id: 'user-1', isActive: true, tokenVersion: 2 }),
  });

  try {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = new MockResponse();
    let nextCalled = false;
    await authenticate(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  } finally {
    User.findById = originalFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('middleware menolak token legacy yang belum memiliki tokenVersion', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'test-secret-with-enough-length';
  const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET, { expiresIn: '12h' });

  User.findById = () => ({
    select: async () => ({ _id: 'user-1', isActive: true, tokenVersion: 0 }),
  });

  try {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = new MockResponse();
    await authenticate(req, res, () => {
      throw new Error('Token legacy tidak boleh diterima');
    });
    assert.equal(res.statusCode, 401);
  } finally {
    User.findById = originalFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
