const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama barang wajib diisi'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU wajib diisi'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: [true, 'Kategori wajib diisi'],
      trim: true,
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

module.exports = mongoose.model('Product', productSchema, 'product');
