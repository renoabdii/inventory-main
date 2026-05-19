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

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'Nomor PO wajib diisi'],
      unique: true,
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

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema, 'purchase_orders');
