const User = require('../models/User');
const { buildOwnedCashierFilter } = require('../utils/accountScope');
const { validatePassword } = require('../utils/passwordPolicy');

const list = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const filter = buildOwnedCashierFilter(req.user._id);

    if (search) {
      filter.username = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(filter);
    const cashiers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: cashiers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
    }

    const cashier = await User.create({
      name: name || username,
      username,
      password,
      role: 'kasir',
      adminId: req.user.id,
      isActive: true,
    });

    const data = cashier.toObject();
    delete data.password;

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, username, password, isActive } = req.body;
    const cashier = await User.findOne(
      buildOwnedCashierFilter(req.user._id, req.params.id)
    );

    if (!cashier) {
      return res.status(404).json({ success: false, message: 'Akun kasir tidak ditemukan' });
    }

    if (username && username !== cashier.username) {
      const existing = await User.findOne({ username, _id: { $ne: cashier._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
      }
      cashier.username = username;
    }

    if (name) {
      cashier.name = name;
    }

    let invalidateTokens = false;
    if (password) {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ success: false, message: passwordCheck.message });
      }
      cashier.password = password;
      invalidateTokens = true;
    }

    if (typeof isActive === 'boolean') {
      if (cashier.isActive && !isActive) invalidateTokens = true;
      cashier.isActive = isActive;
    }

    if (invalidateTokens) cashier.tokenVersion = (cashier.tokenVersion || 0) + 1;

    await cashier.save();

    const data = cashier.toObject();
    delete data.password;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update };
