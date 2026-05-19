const Product = require('../models/Product');
const Category = require('../models/Category');

// Get semua produk (dengan filter & search & pagination)
const getAll = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
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

// Get produk by ID
const getById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

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
    const { name, sku, category, stock, minStock, price } = req.body;

    // Validasi kategori harus ada dan aktif
    const categoryExists = await Category.findOne({ name: category, status: 'active' });
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Kategori tidak ditemukan atau tidak aktif' });
    }

    const product = await Product.create({ name, sku, category, stock, minStock, price });
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

// Update produk
const update = async (req, res, next) => {
  try {
    const { name, sku, category, stock, minStock, price } = req.body;

    // Validasi kategori harus ada dan aktif
    if (category) {
      const categoryExists = await Category.findOne({ name: category, status: 'active' });
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'Kategori tidak ditemukan atau tidak aktif' });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, sku, category, stock, minStock, price },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

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
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }

    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

// Get semua kategori (untuk dropdown filter)
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// Get produk dengan stock rendah/kritis (untuk alert)
const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find();
    const lowStockProducts = products.filter(
      (p) => p.status === 'low' || p.status === 'critical'
    );
    res.json({ success: true, data: lowStockProducts });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, getCategories, getLowStock };
