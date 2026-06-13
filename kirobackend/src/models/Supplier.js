const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    supplierId: {
      type: String,
      required: [true, 'ID Supplier wajib diisi'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Nama supplier wajib diisi'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Nomor telepon wajib diisi'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Alamat wajib diisi'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index: supplierId unique per userId
supplierSchema.index({ userId: 1, supplierId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Supplier', supplierSchema, 'suppliers');
