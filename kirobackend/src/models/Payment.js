const mongoose = require('mongoose');

const paymentItemSchema = new mongoose.Schema({
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

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    items: [paymentItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['qris'],
      default: 'qris',
    },
    provider: {
      type: String,
      enum: ['xendit'],
      default: 'xendit',
    },
    providerTransactionId: {
      type: String,
      trim: true,
      default: '',
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    qrString: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'settlement', 'capture', 'expire', 'deny', 'cancel', 'failed'],
      default: 'pending',
      index: true,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Payment', paymentSchema, 'payments');
