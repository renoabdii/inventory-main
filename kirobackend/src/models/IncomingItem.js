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

const incomingItemSchema = new mongoose.Schema(
  {
    receiptId: {
      type: String,
      required: [true, 'ID Penerimaan wajib diisi'],
      unique: true,
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
    items: [incomingItemDetailSchema],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
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

module.exports = mongoose.model('IncomingItem', incomingItemSchema, 'incoming_items');
