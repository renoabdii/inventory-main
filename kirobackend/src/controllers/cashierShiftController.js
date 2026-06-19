const CashierShift = require('../models/CashierShift');
const Transaction = require('../models/Transaction');

const getOwnerUserId = (req) => {
  if (req.user.role === 'admin') return req.user.id;
  if (req.user.role === 'kasir') return req.user.adminId;
  return req.user.id;
};

const buildShiftSummary = async (shiftId) => {
  const transactions = await Transaction.find({ shift: shiftId });

  return transactions.reduce(
    (summary, transaction) => {
      const totalItems = transaction.items.reduce((acc, item) => acc + item.qty, 0);

      summary.totalSales += transaction.totalAmount;
      summary.totalTransactions += 1;
      summary.totalItems += totalItems;

      if (transaction.paymentMethod === 'cash') {
        summary.cashSales += transaction.totalAmount;
      } else {
        summary.nonCashSales += transaction.totalAmount;
      }

      return summary;
    },
    {
      totalSales: 0,
      cashSales: 0,
      nonCashSales: 0,
      totalTransactions: 0,
      totalItems: 0,
    }
  );
};

const getActive = async (req, res, next) => {
  try {
    const shift = await CashierShift.findOne({
      cashier: req.user._id,
      status: 'open',
    }).populate('cashier', 'username');

    if (!shift) {
      return res.json({ success: true, data: null });
    }

    const summary = await buildShiftSummary(shift._id);

    res.json({
      success: true,
      data: {
        ...shift.toObject(),
        ...summary,
        expectedCash: shift.openingCash + summary.cashSales,
      },
    });
  } catch (error) {
    next(error);
  }
};

const openShift = async (req, res, next) => {
  try {
    const openingCash = Number(req.body.openingCash || 0);

    if (openingCash < 0) {
      return res.status(400).json({ success: false, message: 'Modal kas tidak boleh minus' });
    }

    const existingShift = await CashierShift.findOne({
      cashier: req.user._id,
      status: 'open',
    });

    if (existingShift) {
      return res.status(400).json({ success: false, message: 'Masih ada shift yang aktif' });
    }

    const shift = await CashierShift.create({
      userId: getOwnerUserId(req),
      cashier: req.user._id,
      openingCash,
      note: req.body.note || '',
    });

    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

const closeShift = async (req, res, next) => {
  try {
    const closingCash = Number(req.body.closingCash);

    if (Number.isNaN(closingCash) || closingCash < 0) {
      return res.status(400).json({ success: false, message: 'Kas akhir wajib diisi dengan benar' });
    }

    const shift = await CashierShift.findOne({
      cashier: req.user._id,
      status: 'open',
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift aktif tidak ditemukan' });
    }

    const summary = await buildShiftSummary(shift._id);
    const expectedCash = shift.openingCash + summary.cashSales;

    shift.closedAt = new Date();
    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = closingCash - expectedCash;
    shift.totalSales = summary.totalSales;
    shift.cashSales = summary.cashSales;
    shift.nonCashSales = summary.nonCashSales;
    shift.totalTransactions = summary.totalTransactions;
    shift.totalItems = summary.totalItems;
    shift.status = 'closed';
    shift.note = req.body.note || shift.note;

    await shift.save();

    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ownerUserId = getOwnerUserId(req);
    const filter = ownerUserId ? { userId: ownerUserId } : {};

    if (req.user.role === 'kasir') {
      filter.cashier = req.user._id;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await CashierShift.countDocuments(filter);
    const shifts = await CashierShift.find(filter)
      .populate('cashier', 'username')
      .sort({ openedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const shiftsWithSummary = await Promise.all(
      shifts.map(async (shift) => {
        const summary = await buildShiftSummary(shift._id);
        return {
          ...shift.toObject(),
          ...summary,
          expectedCash: shift.openingCash + summary.cashSales,
        };
      })
    );

    res.json({
      success: true,
      data: shiftsWithSummary,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActive, openShift, closeShift, getAll };
