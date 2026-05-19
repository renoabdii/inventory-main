const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const IncomingItem = require('../models/IncomingItem');
const StockMovement = require('../models/StockMovement');

// Helper: hitung status stok
const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

// Get semua purchase orders
const getAll = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [{ poNumber: { $regex: search, $options: 'i' } }];

      const suppliers = await Supplier.find({ name: { $regex: search, $options: 'i' } });
      if (suppliers.length > 0) {
        const supplierIds = suppliers.map((s) => s._id);
        filter.$or.push({ supplier: { $in: supplierIds } });
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name supplierId')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Stats
    const allOrders = await PurchaseOrder.find();
    const stats = {
      total: allOrders.length,
      pending: allOrders.filter((o) => o.status === 'PENDING').length,
      shipping: allOrders.filter((o) => o.status === 'SHIPPING').length,
      completed: allOrders.filter((o) => o.status === 'COMPLETED').length,
    };

    res.json({
      success: true,
      data: orders,
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
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name supplierId phone address')
      .populate('items.product', 'name sku stock price')
      .populate('createdBy', 'username');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Buat PO baru
const create = async (req, res, next) => {
  try {
    const { poNumber, supplierId, items, note } = req.body;

    // Validasi supplier
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(400).json({ success: false, message: 'Supplier tidak ditemukan' });
    }
    if (supplier.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Supplier tidak aktif' });
    }

    // Validasi items
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi' });
    }

    const itemsWithDetails = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Produk dengan ID ${item.product} tidak ditemukan`,
        });
      }
      const itemPrice = item.price || product.price;
      itemsWithDetails.push({
        product: item.product,
        productName: product.name,
        qty: item.qty,
        price: itemPrice,
      });
      totalAmount += itemPrice * item.qty;
    }

    const order = await PurchaseOrder.create({
      poNumber,
      supplier: supplierId,
      items: itemsWithDetails,
      totalAmount,
      note,
      createdBy: req.user._id,
    });

    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplier', 'name supplierId');

    res.status(201).json({ success: true, data: populatedOrder });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Nomor PO sudah ada' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Update status PO
// PENDING -> APPROVED -> SHIPPING -> COMPLETED
// Saat COMPLETED: otomatis buat IncomingItem + update stock + catat StockMovement
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan' });
    }

    // Validasi transisi status
    const validTransitions = {
      PENDING: ['APPROVED', 'CANCELLED'],
      APPROVED: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa mengubah status dari ${order.status} ke ${status}`,
      });
    }

    // Jika COMPLETED: buat incoming item + update stock + catat movement
    if (status === 'COMPLETED') {
      // Buat IncomingItem otomatis dari PO
      const incomingItems = order.items.map((item) => ({
        product: item.product,
        productName: item.productName,
        qty: item.qty,
        status: 'verified',
      }));

      const receiptId = `RCV-${order.poNumber}`;

      await IncomingItem.create({
        receiptId,
        date: new Date(),
        supplier: order.supplier.name,
        items: incomingItems,
        status: 'completed',
        createdBy: req.user._id,
      });

      // Update stock produk & catat stock movement
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const stockBefore = product.stock;
        const previousState = getStockState(product.stock, product.minStock);

        product.stock += item.qty;
        await product.save();

        const newState = getStockState(product.stock, product.minStock);

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
          reference: order.poNumber,
          referenceModel: 'IncomingItem',
          referenceId: order._id,
          note: `Purchase Order ${order.poNumber} dari ${order.supplier.name}`,
          createdBy: req.user._id,
        });
      }
    }

    order.status = status;
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Hapus PO (hanya jika PENDING)
const remove = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Hanya PO dengan status PENDING yang bisa dihapus',
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Purchase Order berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, updateStatus, remove };
