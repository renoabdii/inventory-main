const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');

// Get semua supplier
const getAll = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { supplierId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Hitung jumlah PO per supplier
    const suppliersWithCount = await Promise.all(
      suppliers.map(async (sup) => {
        const poCount = await PurchaseOrder.countDocuments({ supplier: sup._id });
        return { ...sup.toObject(), totalPO: poCount };
      })
    );

    // Stats
    const allSuppliers = await Supplier.find();
    const stats = {
      total: allSuppliers.length,
      active: allSuppliers.filter((s) => s.status === 'ACTIVE').length,
      inactive: allSuppliers.filter((s) => s.status === 'INACTIVE').length,
    };

    res.json({
      success: true,
      data: suppliersWithCount,
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
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan' });
    }

    const poCount = await PurchaseOrder.countDocuments({ supplier: supplier._id });

    res.json({ success: true, data: { ...supplier.toObject(), totalPO: poCount } });
  } catch (error) {
    next(error);
  }
};

// Tambah supplier baru
const create = async (req, res, next) => {
  try {
    const { supplierId, name, phone, address } = req.body;
    const supplier = await Supplier.create({ supplierId, name, phone, address });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'ID Supplier sudah ada' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Update supplier
const update = async (req, res, next) => {
  try {
    const { name, phone, address, status } = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, phone, address, status },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

// Hapus supplier
const remove = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan' });
    }

    // Cek apakah masih ada PO yang terkait
    const poCount = await PurchaseOrder.countDocuments({ supplier: supplier._id });
    if (poCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Tidak bisa menghapus supplier. Masih ada ${poCount} purchase order terkait.`,
      });
    }

    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Supplier berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
