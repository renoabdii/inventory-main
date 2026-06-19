const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
  price: {
    type: Number,
    required: [true, 'Harga wajib diisi'],
    min: 0,
  },
});

const purchaseOrderStatusHistorySchema = new mongoose.Schema(
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

const purchaseOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    poNumber: {
      type: String,
      required: [true, 'Nomor PO wajib diisi'],
      trim: true,
      uppercase: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier wajib diisi'],
    },
    items: [purchaseOrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'SHIPPING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    note: {
      type: String,
      trim: true,
    },
    statusHistory: [purchaseOrderStatusHistorySchema],
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

// Virtual: total items
purchaseOrderSchema.virtual('totalItems').get(function () {
  return this.items.length;
});

// Compound index: poNumber unique per userId
purchaseOrderSchema.index({ userId: 1, poNumber: 1 }, { unique: true, sparse: true });
purchaseOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });
purchaseOrderSchema.index({ userId: 1, supplier: 1, createdAt: -1 });
purchaseOrderSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema, 'purchase_orders');
