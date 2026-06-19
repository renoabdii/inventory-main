const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOwnedCashierFilter,
  isCashierOwnedByAdmin,
} = require('../src/utils/accountScope');
const userRoutes = require('../src/routes/user');
const User = require('../src/models/User');
const cashierAccountController = require('../src/controllers/cashierAccountController');

const createMockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('filter daftar kasir selalu dibatasi ke admin yang sedang login', () => {
  assert.deepEqual(buildOwnedCashierFilter('admin-a'), {
    role: 'kasir',
    adminId: 'admin-a',
  });
});

test('filter update mengikat ID kasir dan pemilik admin sekaligus', () => {
  assert.deepEqual(buildOwnedCashierFilter('admin-a', 'cashier-a'), {
    _id: 'cashier-a',
    role: 'kasir',
    adminId: 'admin-a',
  });
});

test('Admin A tidak memiliki kasir Admin B atau kasir tanpa adminId', () => {
  assert.equal(
    isCashierOwnedByAdmin({ role: 'kasir', adminId: 'admin-a' }, 'admin-a'),
    true
  );
  assert.equal(
    isCashierOwnedByAdmin({ role: 'kasir', adminId: 'admin-b' }, 'admin-a'),
    false
  );
  assert.equal(isCashierOwnedByAdmin({ role: 'kasir', adminId: null }, 'admin-a'), false);
});

test('akun admin tidak pernah dianggap sebagai kasir milik admin lain', () => {
  assert.equal(
    isCashierOwnedByAdmin({ role: 'admin', adminId: 'admin-a' }, 'admin-a'),
    false
  );
});

test('route user generik ditutup dan hanya change-password yang tersedia', () => {
  const routePaths = userRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.deepEqual(routePaths, ['/change-password']);
});

test('controller list mengirim filter adminId ke query database', async () => {
  const originalCountDocuments = User.countDocuments;
  const originalFind = User.find;
  let capturedCountFilter;
  let capturedFindFilter;

  User.countDocuments = async (filter) => {
    capturedCountFilter = filter;
    return 0;
  };
  User.find = (filter) => {
    capturedFindFilter = filter;
    const query = {
      select: () => query,
      sort: () => query,
      skip: () => query,
      limit: async () => [],
    };
    return query;
  };

  try {
    const req = { query: {}, user: { _id: 'admin-a' } };
    const res = createMockResponse();
    await cashierAccountController.list(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(capturedCountFilter, { role: 'kasir', adminId: 'admin-a' });
    assert.deepEqual(capturedFindFilter, { role: 'kasir', adminId: 'admin-a' });
    assert.equal(res.statusCode, 200);
  } finally {
    User.countDocuments = originalCountDocuments;
    User.find = originalFind;
  }
});

test('controller update Admin A tidak dapat menemukan kasir Admin B tanpa scope Admin A', async () => {
  const originalFindOne = User.findOne;
  let capturedFilter;

  User.findOne = async (filter) => {
    capturedFilter = filter;
    return null;
  };

  try {
    const req = {
      params: { id: 'cashier-b' },
      body: { isActive: false },
      user: { _id: 'admin-a' },
    };
    const res = createMockResponse();
    await cashierAccountController.update(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(capturedFilter, {
      _id: 'cashier-b',
      role: 'kasir',
      adminId: 'admin-a',
    });
    assert.equal(res.statusCode, 404);
  } finally {
    User.findOne = originalFindOne;
  }
});
