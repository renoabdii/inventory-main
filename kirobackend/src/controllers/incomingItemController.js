const IncomingItem = require('../models/IncomingItem');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Helper: hitung status stok berdasarkan stock vs minStock
const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

// Get semua incoming items
const getAll = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { receiptId: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
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

    const allItems = await IncomingItem.find();

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
    const item = await IncomingItem.findById(req.params.id)
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
    const { receiptId, date, supplier, items } = req.body;

    // Validasi items - pastikan semua product ada
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi' });
    }

    const itemsWithName = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
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
      receiptId,
      date: date || new Date(),
      supplier,
      items: itemsWithName,
      status: 'pending',
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

// Update status penerimaan (pending -> in_progress -> completed)
// Saat completed: update stock produk & catat stock movement
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const incomingItem = await IncomingItem.findById(req.params.id);

    if (!incomingItem) {
      return res.status(404).json({ success: false, message: 'Penerimaan tidak ditemukan' });
    }

    // Validasi transisi status
    const validTransitions = {
      pending: ['in_progress', 'completed'],
      in_progress: ['completed'],
      completed: [],
    };

    if (!validTransitions[incomingItem.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa mengubah status dari ${incomingItem.status} ke ${status}`,
      });
    }

    // Jika completed: update stock & catat movement
    if (status === 'completed') {
      for (const item of incomingItem.items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const stockBefore = product.stock;
        const previousState = getStockState(product.stock, product.minStock);

        // Update stock produk
        product.stock += item.qty;
        await product.save();

        const newState = getStockState(product.stock, product.minStock);

        // Catat stock movement
        await StockMovement.create({
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

    incomingItem.status = status;
    await incomingItem.save();

    res.json({ success: true, data: incomingItem });
  } catch (error) {
    next(error);
  }
};

// Hapus penerimaan (hanya jika masih pending)
const remove = async (req, res, next) => {
  try {
    const incomingItem = await IncomingItem.findById(req.params.id);

    if (!incomingItem) {
      return res.status(404).json({ success: false, message: 'Penerimaan tidak ditemukan' });
    }

    if (incomingItem.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus penerimaan yang sudah selesai',
      });
    }

    await IncomingItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Penerimaan berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, updateStatus, remove };
