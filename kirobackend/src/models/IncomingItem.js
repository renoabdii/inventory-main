const mongoose = require('mongoose');

const incomingItemDetailSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Produk wajib diisi'],
  },
  productName: {
    type: String,
    required: true,
  },
  qty: {
    type: Number,
    required: [true, 'Jumlah wajib diisi'],
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'verified'],
    default: 'pending',
  },
});

const incomingStatusHistorySchema = new mongoose.Schema(
  {
    from: String,
    to: String,
    event: String,
    note: {
      type: String,
      trim: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const incomingItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiptId: {
      type: String,
      required: [true, 'ID Penerimaan wajib diisi'],
      trim: true,
      uppercase: true,
    },
    date: {
      type: Date,
      required: [true, 'Tanggal wajib diisi'],
      default: Date.now,
    },
    supplier: {
      type: String,
      required: [true, 'Supplier wajib diisi'],
      trim: true,
    },
    source: {
      type: String,
      enum: ['manual', 'purchase_order'],
      default: 'manual',
    },
    reference: {
      type: String,
      trim: true,
    },
    items: [incomingItemDetailSchema],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    statusHistory: [incomingStatusHistorySchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total jumlah jenis item
incomingItemSchema.virtual('totalItems').get(function () {
  return this.items.length;
});

// Virtual: total qty semua item
incomingItemSchema.virtual('totalQty').get(function () {
  return this.items.reduce((acc, item) => acc + item.qty, 0);
});

// Compound index: receiptId unique per userId
incomingItemSchema.index({ userId: 1, receiptId: 1 }, { unique: true, sparse: true });
incomingItemSchema.index({ userId: 1, status: 1, createdAt: -1 });
incomingItemSchema.index({ userId: 1, source: 1, createdAt: -1 });
incomingItemSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('IncomingItem', incomingItemSchema, 'incoming_items');
