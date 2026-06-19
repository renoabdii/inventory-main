const IncomingItem = require('../models/IncomingItem');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { incomingItemFSM, productStockFSM, validateTransition, getAvailableEvents } = require('../fsm');

// Helper: hitung status stok menggunakan FSM
const getStockState = (stock, minStock) => {
  return productStockFSM.computeState(stock, minStock);
};

// Get semua incoming items
const getAll = async (req, res, next) => {
  try {
    const { search, status, source, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user.id };

    if (search) {
      filter.$or = [
        { receiptId: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (source && source !== 'all') {
      filter.source = source;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await IncomingItem.countDocuments(filter);
    const incomingItems = await IncomingItem.find(filter)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const allItems = await IncomingItem.find({ userId: req.user.id });

    const todayItems = allItems.filter((i) => new Date(i.date) >= today);
    const weekItems = allItems.filter((i) => new Date(i.date) >= weekAgo);

    const stats = {
      todayQty: todayItems.reduce((acc, i) => acc + i.totalQty, 0),
      weekQty: weekItems.reduce((acc, i) => acc + i.totalQty, 0),
      pending: allItems.filter((i) => i.status === 'pending' || i.status === 'in_progress').length,
    };

    res.json({
      success: true,
      data: incomingItems,
      stats,
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

// Get by ID
const getById = async (req, res, next) => {
  try {
    const item = await IncomingItem.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('items.product', 'name sku stock minStock price')
      .populate('createdBy', 'username');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Penerimaan tidak ditemukan' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Tambah penerimaan baru
const create = async (req, res, next) => {
  try {
    const { receiptId, date, supplier, items, source = 'manual', reference } = req.body;

    // Validasi items - pastikan semua product ada
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi' });
    }

    const itemsWithName = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, userId: req.user.id });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Produk dengan ID ${item.product} tidak ditemukan`,
        });
      }
      itemsWithName.push({
        product: item.product,
        productName: product.name,
        qty: item.qty,
        status: 'pending',
      });
    }

    const incomingItem = await IncomingItem.create({
      userId: req.user.id,
      receiptId,
      date: date || new Date(),
      supplier,
      source,
      reference,
      items: itemsWithName,
      status: 'pending',
      statusHistory: [{
        from: null,
        to: 'pending',
        event: 'create',
        note: source === 'purchase_order' ? `Dibuat dari PO ${reference || '-'}` : 'Penerimaan manual dibuat',
        changedBy: req.user._id,
      }],
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: incomingItem });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'ID Penerimaan sudah ada' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Update status penerimaan menggunakan FSM
// Event: process, complete
const updateStatus = async (req, res, next) => {
  try {
    const { event, note } = req.body;
    const incomingItem = await IncomingItem.findOne({ _id: req.params.id, userId: req.user.id });

    if (!incomingItem) {
      return res.status(404).json({ success: false, message: 'Penerimaan tidak ditemukan' });
    }

    // Validasi transisi menggunakan FSM
    const transition = validateTransition(incomingItemFSM, incomingItem.status, event);
    if (!transition.valid) {
      return res.status(400).json({ success: false, message: transition.message });
    }

    const newStatus = transition.nextState;

    // Jika completed: update stock & catat movement
    if (newStatus === 'completed') {
      for (const item of incomingItem.items) {
        const product = await Product.findOne({ _id: item.product, userId: req.user.id });
        if (!product) continue;

        const stockBefore = product.stock;
        const previousState = getStockState(product.stock, product.minStock);

        // Update stock produk
        product.stock += item.qty;
        await product.save();

        const newState = getStockState(product.stock, product.minStock);

        // Catat stock movement
        await StockMovement.create({
          userId: req.user.id,
          product: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'IN',
          qty: item.qty,
          stockBefore,
          stockAfter: product.stock,
          previousState,
          newState,
          reference: incomingItem.receiptId,
          referenceModel: 'IncomingItem',
          referenceId: incomingItem._id,
          note: `Penerimaan dari ${incomingItem.supplier}`,
          createdBy: req.user._id,
        });

        // Update status item jadi verified
        item.status = 'verified';
      }
    }

    incomingItem.statusHistory.push({
      from: incomingItem.status,
      to: newStatus,
      event,
      note,
      changedBy: req.user._id,
    });
    incomingItem.status = newStatus;
    await incomingItem.save();

    // Return available next events
    const availableEvents = getAvailableEvents(incomingItemFSM, newStatus);

    res.json({ success: true, data: incomingItem, availableEvents });
  } catch (error) {
    next(error);
  }
};

// Hapus penerimaan (hanya jika masih pending)
const remove = async (req, res, next) => {
  try {
    const incomingItem = await IncomingItem.findOne({ _id: req.params.id, userId: req.user.id });

    if (!incomingItem) {
      return res.status(404).json({ success: false, message: 'Penerimaan tidak ditemukan' });
    }

    if (incomingItem.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus penerimaan yang sudah selesai',
      });
    }

    await IncomingItem.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true, message: 'Penerimaan berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, updateStatus, remove };
