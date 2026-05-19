const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

// Helper: hitung status stok
const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

// Get semua stock movement
const getAll = async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await StockMovement.countDocuments(filter);
    const movements = await StockMovement.find(filter)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Stats (dari semua data)
    const allMovements = await StockMovement.find();
    const stats = {
      total: allMovements.length,
      stockIn: allMovements.filter((m) => m.type === 'IN').length,
      stockOut: allMovements.filter((m) => m.type === 'OUT').length,
      statusChanges: allMovements.filter((m) => m.previousState !== m.newState).length,
    };

    res.json({
      success: true,
      data: movements,
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
    const movement = await StockMovement.findById(req.params.id)
      .populate('product', 'name sku stock minStock price category')
      .populate('createdBy', 'username');

    if (!movement) {
      return res.status(404).json({ success: false, message: 'Data pergerakan tidak ditemukan' });
    }

    res.json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
};

// Tambah stock movement manual (barang keluar)
const createOut = async (req, res, next) => {
  try {
    const { productId, qty, note } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Stok tidak cukup. Stok tersedia: ${product.stock}`,
      });
    }

    const stockBefore = product.stock;
    const previousState = getStockState(product.stock, product.minStock);

    // Kurangi stock
    product.stock -= qty;
    await product.save();

    const newState = getStockState(product.stock, product.minStock);

    // Catat movement
    const movement = await StockMovement.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'OUT',
      qty,
      stockBefore,
      stockAfter: product.stock,
      previousState,
      newState,
      referenceModel: 'Manual',
      note: note || 'Barang keluar manual',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Tambah stock movement manual (barang masuk tanpa penerimaan)
const createIn = async (req, res, next) => {
  try {
    const { productId, qty, note } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    const stockBefore = product.stock;
    const previousState = getStockState(product.stock, product.minStock);

    // Tambah stock
    product.stock += qty;
    await product.save();

    const newState = getStockState(product.stock, product.minStock);

    // Catat movement
    const movement = await StockMovement.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'IN',
      qty,
      stockBefore,
      stockAfter: product.stock,
      previousState,
      newState,
      referenceModel: 'Manual',
      note: note || 'Barang masuk manual',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getById, createOut, createIn };
