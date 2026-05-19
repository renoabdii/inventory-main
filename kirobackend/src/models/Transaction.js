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
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    items: [transactionItemSchema],
    totalAmount: { type: Number, required: true },
    paymentAmount: { type: Number, required: true },
    changeAmount: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'debit', 'qris'],
      default: 'cash',
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

module.exports = mongoose.model('Transaction', transactionSchema, 'transactions');
