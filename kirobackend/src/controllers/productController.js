const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');

const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

const createProductStockMovement = async ({
  product,
  userId,
  stockBefore,
  stockAfter,
  referenceModel,
  note,
  createdBy,
}) => {
  if (stockBefore === stockAfter) return;

  await StockMovement.create({
    userId,
    product: product._id,
    productName: product.name,
    sku: product.sku,
    type: stockAfter > stockBefore ? 'IN' : 'OUT',
    qty: Math.abs(stockAfter - stockBefore),
    stockBefore,
    stockAfter,
    previousState: getStockState(stockBefore, product.minStock),
    newState: getStockState(stockAfter, product.minStock),
    reference: product.sku,
    referenceModel,
    referenceId: product._id,
    note,
    createdBy,
  });
};

// Helper: Get userId untuk filter (admin = own, kasir = admin's)
const getOwnerUserId = (req) => {
  if (req.user.role === 'admin') {
    return req.user.id;
  } else if (req.user.role === 'kasir') {
    return req.user.adminId;
  }
};

// Get semua produk (dengan filter & search & pagination)
const getAll = async (req, res, next) => {
  try {
    const { search, category, supplierId, page = 1, limit = 10 } = req.query;
    const userId = getOwnerUserId(req);
    const filter = { userId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (supplierId && supplierId !== 'all') {
      filter.supplier = supplierId;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('supplier', 'name supplierId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Hitung statistik (dari semua data, bukan hanya halaman ini)
    const allProducts = await Product.find(filter);
    const stats = {
      total,
      lowStock: allProducts.filter((p) => p.status === 'low').length,
      criticalStock: allProducts.filter((p) => p.status === 'critical').length,
      totalValue: allProducts.reduce((acc, p) => acc + p.price * p.stock, 0),
    };

    res.json({
      success: true,
      data: products,
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

// Ambil seluruh produk untuk export, tetap mengikuti kepemilikan dan filter admin.
const getExportData = async (req, res, next) => {
  try {
    const { search, category, status } = req.query;
    const userId = getOwnerUserId(req);
    const filter = { userId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    let products = await Product.find(filter)
      .populate('supplier', 'name supplierId')
      .sort({ name: 1 });

    if (['normal', 'low', 'critical'].includes(status)) {
      products = products.filter((product) => product.status === status);
    }

    res.json({ success: true, data: products, total: products.length });
  } catch (error) {
    next(error);
  }
};

// Get produk by ID
const getById = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const product = await Product.findOne({ _id: req.params.id, userId }).populate('supplier', 'name supplierId');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Tambah produk baru
const create = async (req, res, next) => {
  try {
    // Hanya admin yang bisa create produk
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa membuat produk' });
    }

    const { name, sku, category, stock, minStock, price, barcode, supplier } = req.body;

    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Barcode sudah dipakai' });
      }
    }

    // Validasi kategori harus ada dan aktif (dan milik user yang sama)
    const categoryExists = await Category.findOne({ name: category, status: 'active', userId: req.user.id });
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Kategori tidak ditemukan atau tidak aktif' });
    }

    if (supplier) {
      const supplierExists = await Supplier.findOne({ _id: supplier, status: 'ACTIVE', userId: req.user.id });
      if (!supplierExists) {
        return res.status(400).json({ success: false, message: 'Supplier tidak ditemukan atau tidak aktif' });
      }
    }

    const product = await Product.create({ name, sku, category, stock, minStock, price, barcode, supplier: supplier || null, userId: req.user.id });
    await createProductStockMovement({
      product,
      userId: req.user.id,
      stockBefore: 0,
      stockAfter: product.stock,
      referenceModel: 'InitialStock',
      note: 'Stok awal produk',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'SKU sudah dipakai' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Import produk dari hasil parsing Excel/CSV
const importBulk = async (req, res, next) => {
  try {
    // Hanya admin yang bisa import
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa import produk' });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Data import kosong' });
    }

    const activeCategories = await Category.find({ status: 'active', userId: req.user.id });
    const categoryNames = new Set(activeCategories.map((cat) => cat.name));
    const existingSkus = new Set((await Product.find({ userId: req.user.id }, 'sku')).map((p) => p.sku));
    const existingBarcodes = new Set(
      (await Product.find({ userId: req.user.id, barcode: { $exists: true, $ne: '' } }, 'barcode')).map((p) => p.barcode)
    );

    const seenSkus = new Set();
    const seenBarcodes = new Set();
    const errors = [];
    const validItems = [];

    items.forEach((raw, index) => {
      const row = index + 2;
      const name = String(raw.name || '').trim();
      const sku = String(raw.sku || '').trim().toUpperCase();
      const barcode = raw.barcode ? String(raw.barcode).trim() : undefined;
      const category = String(raw.category || '').trim();
      const stock = Number(raw.stock);
      const minStock = Number(raw.minStock);
      const price = Number(raw.price);
      const rowErrors = [];

      if (!name) rowErrors.push('Nama barang wajib diisi');
      if (!sku) rowErrors.push('SKU wajib diisi');
      if (!category) rowErrors.push('Kategori wajib diisi');
      if (!categoryNames.has(category)) rowErrors.push(`Kategori "${category}" tidak aktif/tidak ditemukan`);
      if (!Number.isFinite(stock) || stock < 0) rowErrors.push('Stok harus angka minimal 0');
      if (!Number.isFinite(minStock) || minStock < 0) rowErrors.push('Min stok harus angka minimal 0');
      if (!Number.isFinite(price) || price < 0) rowErrors.push('Harga harus angka minimal 0');
      if (sku && existingSkus.has(sku)) rowErrors.push(`SKU "${sku}" sudah ada`);
      if (sku && seenSkus.has(sku)) rowErrors.push(`SKU "${sku}" duplikat di file`);
      if (barcode && existingBarcodes.has(barcode)) rowErrors.push(`Barcode "${barcode}" sudah ada`);
      if (barcode && seenBarcodes.has(barcode)) rowErrors.push(`Barcode "${barcode}" duplikat di file`);

      if (rowErrors.length > 0) {
        errors.push({ row, sku, name, errors: rowErrors });
        return;
      }

      seenSkus.add(sku);
      if (barcode) seenBarcodes.add(barcode);
      validItems.push({ name, sku, barcode, category, stock, minStock, price, userId: req.user.id });
    });

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data valid untuk diimport',
        data: { created: 0, errors },
      });
    }

    const created = await Product.insertMany(validItems, { ordered: true });

    const initialMovements = created
      .filter((product) => product.stock > 0)
      .map((product) => ({
        userId: req.user.id,
        product: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'IN',
        qty: product.stock,
        stockBefore: 0,
        stockAfter: product.stock,
        previousState: getStockState(0, product.minStock),
        newState: getStockState(product.stock, product.minStock),
        reference: product.sku,
        referenceModel: 'Import',
        referenceId: product._id,
        note: 'Stok awal dari import Excel/CSV',
        createdBy: req.user._id,
      }));

    if (initialMovements.length > 0) {
      await StockMovement.insertMany(initialMovements, { ordered: true });
    }

    res.status(201).json({
      success: true,
      message: `${created.length} produk berhasil diimport`,
      data: {
        created: created.length,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update produk
const update = async (req, res, next) => {
  try {
    // Hanya admin yang bisa update produk
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa mengubah produk' });
    }

    const { name, sku, category, stock, minStock, price, barcode, supplier } = req.body;

    // Validasi kategori harus ada dan aktif (dan milik user yang sama)
    if (category) {
      const categoryExists = await Category.findOne({ name: category, status: 'active', userId: req.user.id });
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'Kategori tidak ditemukan atau tidak aktif' });
      }
    }

    if (barcode) {
      const barcodeExists = await Product.findOne({ barcode, _id: { $ne: req.params.id }, userId: req.user.id });
      if (barcodeExists) {
        return res.status(400).json({ success: false, message: 'Barcode sudah dipakai' });
      }
    }

    if (supplier) {
      const supplierExists = await Supplier.findOne({ _id: supplier, status: 'ACTIVE', userId: req.user.id });
      if (!supplierExists) {
        return res.status(400).json({ success: false, message: 'Supplier tidak ditemukan atau tidak aktif' });
      }
    }

    const existingProduct = await Product.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

    const stockBefore = existingProduct.stock;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, sku, category, stock, minStock, price, barcode, supplier: supplier || null },
      { new: true, runValidators: true }
    ).populate('supplier', 'name supplierId');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

    await createProductStockMovement({
      product,
      userId: req.user.id,
      stockBefore,
      stockAfter: product.stock,
      referenceModel: 'Adjustment',
      note: 'Penyesuaian stok dari Edit Produk',
      createdBy: req.user._id,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'SKU sudah dipakai' });
    }
    next(error);
  }
};

// Hapus produk
const remove = async (req, res, next) => {
  try {
    // Hanya admin yang bisa hapus produk
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa menghapus produk' });
    }

    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

    if (product.stock > 0) {
      return res.status(400).json({
        success: false,
        message: 'Stok produk harus 0 sebelum produk dihapus. Sesuaikan stok terlebih dahulu agar pergerakannya tercatat.',
      });
    }

    await Product.deleteOne({ _id: product._id, userId: req.user.id });

    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

// Get semua kategori (untuk dropdown filter)
const getCategories = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const categories = await Product.distinct('category', { userId });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// Get produk dengan stock rendah/kritis (untuk alert)
const getLowStock = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const products = await Product.find({ userId });
    const lowStockProducts = products.filter(
      (p) => p.status === 'low' || p.status === 'critical'
    );
    res.json({ success: true, data: lowStockProducts });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getExportData,
  getById,
  create,
  importBulk,
  update,
  remove,
  getCategories,
  getLowStock,
};
