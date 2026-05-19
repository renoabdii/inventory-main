const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Helper: hitung status stok
const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

// Helper: generate invoice number
const generateInvoice = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${date}-${random}`;
};

// Create transaction (POS)
const create = async (req, res, next) => {
  try {
    const { items, paymentAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi' });
    }

    if (!paymentAmount) {
      return res.status(400).json({ success: false, message: 'Jumlah pembayaran wajib diisi' });
    }

    // Validate & build items
    const transactionItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Produk tidak ditemukan: ${item.productId}` });
      }
      if (product.stock < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Stok ${product.name} tidak cukup. Tersedia: ${product.stock}`,
        });
      }

      const subtotal = product.price * item.qty;
      transactionItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        qty: item.qty,
        price: product.price,
        subtotal,
      });
      totalAmount += subtotal;
    }

    if (paymentAmount < totalAmount) {
      return res.status(400).json({ success: false, message: 'Pembayaran kurang dari total belanja' });
    }

    const changeAmount = paymentAmount - totalAmount;

    // Create transaction
    const transaction = await Transaction.create({
      invoiceNumber: generateInvoice(),
      items: transactionItems,
      totalAmount,
      paymentAmount,
      changeAmount,
      paymentMethod: paymentMethod || 'cash',
      cashier: req.user._id,
    });

    // Update stock & create stock movements
    for (const item of transactionItems) {
      const product = await Product.findById(item.product);
      const stockBefore = product.stock;
      const previousState = getStockState(product.stock, product.minStock);

      product.stock -= item.qty;
      await product.save();

      const newState = getStockState(product.stock, product.minStock);

      await StockMovement.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'OUT',
        qty: item.qty,
        stockBefore,
        stockAfter: product.stock,
        previousState,
        newState,
        reference: transaction.invoiceNumber,
        referenceModel: 'Manual',
        note: `Penjualan kasir - ${transaction.invoiceNumber}`,
        createdBy: req.user._id,
      });
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Invoice number conflict, coba lagi' });
    }
    next(error);
  }
};

// Get all transactions (with pagination)
const getAll = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Kasir hanya lihat transaksi sendiri, admin lihat semua
    if (req.user.role === 'kasir') {
      filter.cashier = req.user._id;
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('cashier', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// Get transaction by ID
const getById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('cashier', 'username')
      .populate('items.product', 'name sku price');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// Get cashier dashboard stats
const getCashierStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = { cashier: req.user._id };

    // Today's transactions
    const todayTransactions = await Transaction.find({
      ...filter,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const todayTotal = todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const todayItems = todayTransactions.reduce((acc, t) => acc + t.totalItems, 0);

    // All time for this cashier
    const allTransactions = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        todayTransactions: todayTransactions.length,
        todayTotal,
        todayItems,
        allTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, getCashierStats };
