const QRCode = require('qrcode');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const CashierShift = require('../models/CashierShift');

const getOwnerUserId = (req) => {
  if (req.user.role === 'admin') return req.user.id;
  if (req.user.role === 'kasir') return req.user.adminId;
  return null;
};

const getStockState = (stock, minStock) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock * 0.25) return 'CRITICAL';
  if (stock <= minStock) return 'LOW';
  return 'NORMAL';
};

const getXenditConfig = () => {
  const apiKey = process.env.XENDIT_SECRET_KEY || process.env.XENDIT_API_KEY;
  if (!apiKey) {
    throw new Error('XENDIT_SECRET_KEY belum diisi di .env backend');
  }

  return {
    apiKey,
    callbackToken: process.env.XENDIT_CALLBACK_TOKEN || '',
    baseUrl: 'https://api.xendit.co',
  };
};

const xenditFetch = async (path, options = {}) => {
  const { apiKey, baseUrl } = getXenditConfig();
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const validationDetails = Array.isArray(data?.errors)
      ? data.errors
          .map((item) => `${item.path || 'field'}: ${item.message || 'tidak valid'}`)
          .join('; ')
      : '';
    const message = [data?.message || data?.error_code || 'Request Xendit gagal', validationDetails]
      .filter(Boolean)
      .join(' Detail: ');
    throw new Error(message);
  }

  return data;
};

const generateOrderId = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `QRIS-${date}-${random}`;
};

const normalizeXenditStatus = (status) => {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE' || value === 'PENDING') return 'pending';
  if (value === 'SUCCEEDED' || value === 'COMPLETED' || value === 'PAID') return 'settlement';
  if (value === 'EXPIRED') return 'expire';
  if (value === 'FAILED') return 'failed';
  return 'pending';
};

const buildPaymentItems = async (items, userId) => {
  const paymentItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, userId });
    if (!product) {
      const error = new Error(`Produk tidak ditemukan: ${item.productId}`);
      error.statusCode = 400;
      throw error;
    }

    if (product.stock < item.qty) {
      const error = new Error(`Stok ${product.name} tidak cukup. Tersedia: ${product.stock}`);
      error.statusCode = 400;
      throw error;
    }

    const subtotal = product.price * item.qty;
    paymentItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      qty: item.qty,
      price: product.price,
      subtotal,
    });
    totalAmount += subtotal;
  }

  return { paymentItems, totalAmount };
};

const finalizePayment = async (payment) => {
  if (payment.transaction) {
    return Transaction.findById(payment.transaction);
  }

  const existingTransaction = await Transaction.findOne({
    userId: payment.userId,
    invoiceNumber: payment.orderId,
  });

  if (existingTransaction) {
    payment.transaction = existingTransaction._id;
    payment.paidAt = payment.paidAt || new Date();
    await payment.save();
    return existingTransaction;
  }

  for (const item of payment.items) {
    const product = await Product.findOne({ _id: item.product, userId: payment.userId });
    if (!product || product.stock < item.qty) {
      payment.status = 'failed';
      payment.failureReason = `Stok ${item.productName} tidak cukup saat pembayaran diterima`;
      await payment.save();
      throw new Error(payment.failureReason);
    }
  }

  const transaction = await Transaction.create({
    userId: payment.userId,
    invoiceNumber: payment.orderId,
    items: payment.items,
    totalAmount: payment.totalAmount,
    paymentAmount: payment.totalAmount,
    changeAmount: 0,
    paymentMethod: 'qris',
    cashier: payment.cashier,
    shift: payment.shift || null,
  });

  for (const item of payment.items) {
    const product = await Product.findOne({ _id: item.product, userId: payment.userId });
    const stockBefore = product.stock;
    const previousState = getStockState(product.stock, product.minStock);

    product.stock -= item.qty;
    await product.save();

    await StockMovement.create({
      userId: payment.userId,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'OUT',
      qty: item.qty,
      stockBefore,
      stockAfter: product.stock,
      previousState,
      newState: getStockState(product.stock, product.minStock),
      reference: transaction.invoiceNumber,
      referenceModel: 'Transaction',
      referenceId: transaction._id,
      note: `Penjualan QRIS Xendit - ${transaction.invoiceNumber}`,
      createdBy: payment.cashier,
    });
  }

  payment.transaction = transaction._id;
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  return transaction;
};

const applyXenditStatus = async (payload) => {
  const referenceId = payload.external_id || payload.reference_id || payload.order_id;
  const payment = await Payment.findOne({ orderId: referenceId });
  if (!payment) return null;

  payment.status = normalizeXenditStatus(payload.status);
  payment.providerTransactionId = payload.id || payment.providerTransactionId;
  payment.rawResponse = payload;

  if (payment.status === 'settlement') {
    payment.paidAt = payload.paid_at ? new Date(payload.paid_at) : new Date();
    await payment.save();
    await finalizePayment(payment);
  } else {
    await payment.save();
  }

  return payment;
};

const createQris = async (req, res, next) => {
  try {
    if (req.user.role !== 'kasir') {
      return res.status(403).json({ success: false, message: 'QRIS POS hanya untuk kasir' });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi' });
    }

    const userId = getOwnerUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Akun kasir belum terhubung ke admin' });
    }

    const { paymentItems, totalAmount } = await buildPaymentItems(items, userId);
    const activeShift = await CashierShift.findOne({ cashier: req.user._id, status: 'open' });
    if (!activeShift) {
      return res.status(400).json({ success: false, message: 'Shift kasir belum dibuka' });
    }

    const orderId = generateOrderId();
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    const xenditResponse = await xenditFetch('/qr_codes', {
      method: 'POST',
      body: JSON.stringify({
        external_id: orderId,
        type: 'DYNAMIC',
        amount: totalAmount,
        callback_url: process.env.XENDIT_CALLBACK_URL || `${process.env.APP_PUBLIC_URL || ''}/api/payments/xendit-callback`,
      }),
    });

    const qrString = xenditResponse.qr_string;
    if (!qrString) {
      return res.status(502).json({ success: false, message: 'Xendit tidak mengembalikan QR string' });
    }

    const qrCodeUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });

    const payment = await Payment.create({
      orderId,
      userId,
      cashier: req.user._id,
      shift: activeShift._id,
      items: paymentItems,
      totalAmount,
      provider: 'xendit',
      providerTransactionId: xenditResponse.id,
      qrCodeUrl,
      qrString,
      status: normalizeXenditStatus(xenditResponse.status),
      rawResponse: xenditResponse,
      expiredAt,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: payment.orderId,
        qrCodeUrl: payment.qrCodeUrl,
        status: payment.status,
        totalAmount: payment.totalAmount,
        expiredAt: payment.expiredAt,
        simulationEnabled: process.env.NODE_ENV !== 'production',
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId }).populate('transaction');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment tidak ditemukan' });
    }

    if (!payment.transaction && payment.status === 'pending') {
      try {
        const statusResponse = await xenditFetch(`/qr_codes/${payment.providerTransactionId}`, { method: 'GET' });
        await applyXenditStatus(statusResponse);
      } catch (error) {
        // Callback tetap sumber utama; polling tidak menggagalkan UI.
      }
    }

    const refreshed = await Payment.findById(payment._id).populate('transaction');

    res.json({
      success: true,
      data: {
        orderId: refreshed.orderId,
        status: refreshed.status,
        totalAmount: refreshed.totalAmount,
        qrCodeUrl: refreshed.qrCodeUrl,
        transaction: refreshed.transaction,
        failureReason: refreshed.failureReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

const notification = async (req, res, next) => {
  try {
    const { callbackToken } = getXenditConfig();
    const incomingToken = req.headers['x-callback-token'];

    if (callbackToken && incomingToken !== callbackToken) {
      return res.status(403).json({ success: false, message: 'Callback token Xendit tidak valid' });
    }

    await applyXenditStatus(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const simulatePaid = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Simulasi pembayaran tidak tersedia di production' });
    }

    const userId = getOwnerUserId(req);
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment tidak ditemukan' });
    }

    const paidAt = new Date();
    const callbackPayload = {
      id: payment.providerTransactionId || `qr_callback_sim_${payment.orderId}`,
      external_id: payment.orderId,
      status: 'SUCCEEDED',
      paid_at: paidAt.toISOString(),
      simulated: true,
      source: 'local_sandbox_callback',
    };

    const callbackUrl = process.env.XENDIT_CALLBACK_URL;

    if (callbackUrl) {
      const { callbackToken } = getXenditConfig();
      const callbackResponse = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(callbackToken ? { 'x-callback-token': callbackToken } : {}),
        },
        body: JSON.stringify(callbackPayload),
      });

      if (!callbackResponse.ok) {
        const text = await callbackResponse.text();
        return res.status(502).json({
          success: false,
          message: `Simulasi callback gagal: ${text || callbackResponse.statusText}`,
        });
      }
    } else {
      await applyXenditStatus(callbackPayload);
    }

    const refreshed = await Payment.findById(payment._id).populate('transaction');

    res.json({
      success: true,
      data: {
        orderId: refreshed.orderId,
        status: refreshed.status,
        totalAmount: refreshed.totalAmount,
        qrCodeUrl: refreshed.qrCodeUrl,
        transaction: refreshed.transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createQris, getStatus, notification, simulatePaid };
