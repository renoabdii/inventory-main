const User = require('../models/User');

const list = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const filter = {
      role: 'kasir',
      $or: [
        { adminId: req.user.id },
        { adminId: { $exists: false } },
        { adminId: null },
      ],
    };

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
    const cashier = await User.findOne({
      _id: req.params.id,
      role: 'kasir',
      $or: [
        { adminId: req.user.id },
        { adminId: { $exists: false } },
        { adminId: null },
      ],
    });

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

    cashier.adminId = req.user.id;

    if (password) {
      cashier.password = password;
    }

    if (typeof isActive === 'boolean') {
      cashier.isActive = isActive;
    }

    await cashier.save();

    const data = cashier.toObject();
    delete data.password;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update };
