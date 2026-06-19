const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nama barang wajib diisi'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU wajib diisi'],
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    category: {
      type: String,
      required: [true, 'Kategori wajib diisi'],
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },
    price: {
      type: Number,
      required: [true, 'Harga wajib diisi'],
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: status berdasarkan stock vs minStock
productSchema.virtual('status').get(function () {
  if (this.stock <= this.minStock * 0.25) return 'critical';
  if (this.stock <= this.minStock) return 'low';
  return 'normal';
});

// Compound index: SKU hanya unique per userId
productSchema.index({ userId: 1, sku: 1 }, { unique: true, sparse: true });
// Index untuk barcode juga per userId
productSchema.index({ userId: 1, barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ userId: 1, category: 1, createdAt: -1 });
productSchema.index({ userId: 1, supplier: 1, createdAt: -1 });
productSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema, 'product');
