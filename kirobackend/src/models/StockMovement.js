const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Produk wajib diisi'],
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: [true, 'Tipe pergerakan wajib diisi'],
    },
    qty: {
      type: Number,
      required: [true, 'Jumlah wajib diisi'],
      min: 1,
    },
    stockBefore: {
      type: Number,
      required: true,
    },
    stockAfter: {
      type: Number,
      required: true,
    },
    previousState: {
      type: String,
      enum: ['NORMAL', 'LOW', 'CRITICAL', 'OUT_OF_STOCK'],
      required: true,
    },
    newState: {
      type: String,
      enum: ['NORMAL', 'LOW', 'CRITICAL', 'OUT_OF_STOCK'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    referenceModel: {
      type: String,
      enum: ['IncomingItem', 'Manual'],
      default: 'Manual',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema, 'stock_movements');
