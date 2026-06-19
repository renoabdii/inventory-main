const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true },
});

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    items: [transactionItemSchema],
    totalAmount: { type: Number, required: true },
    paymentAmount: { type: Number, required: true },
    changeAmount: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'qris'],
      default: 'cash',
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashierShift',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total items
transactionSchema.virtual('totalItems').get(function () {
  return this.items.reduce((acc, item) => acc + item.qty, 0);
});

// Compound index: invoiceNumber unique per userId
transactionSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, paymentMethod: 1, createdAt: -1 });
transactionSchema.index({ cashier: 1, createdAt: -1 });
transactionSchema.index({ shift: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema, 'transactions');
