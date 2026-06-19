const mongoose = require('mongoose');

const cashierShiftSchema = new mongoose.Schema(
  {
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
    openedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    openingCash: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    closingCash: {
      type: Number,
      min: 0,
      default: 0,
    },
    expectedCash: {
      type: Number,
      min: 0,
      default: 0,
    },
    cashDifference: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      min: 0,
      default: 0,
    },
    cashSales: {
      type: Number,
      min: 0,
      default: 0,
    },
    nonCashSales: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalItems: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cashierShiftSchema.index(
  { cashier: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);
cashierShiftSchema.index({ userId: 1, openedAt: -1 });
cashierShiftSchema.index({ userId: 1, status: 1, openedAt: -1 });
cashierShiftSchema.index({ cashier: 1, openedAt: -1 });

module.exports = mongoose.model('CashierShift', cashierShiftSchema, 'cashier_shifts');
