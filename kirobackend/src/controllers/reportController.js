const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

const getOwnerUserId = (req) => {
  if (req.user.role === 'admin') return req.user.id;
  if (req.user.role === 'kasir') return req.user.adminId;
  return req.user.id;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const parseMonthInput = (value) => {
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
};

const setStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const setEndOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Get report data
const getReport = async (req, res, next) => {
  try {
    const { period, date, month, startDate: customStart, endDate: customEnd } = req.query;
    const userId = getOwnerUserId(req);

    // === Tentukan range waktu ===
    const now = new Date();
    let startDate = new Date(0); // default: semua waktu

    let endDate = now;

    if (period === 'day') {
      const selectedDate = parseDateInput(date) || now;
      startDate = setStartOfDay(selectedDate);
      endDate = setEndOfDay(selectedDate);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = setStartOfDay(parseDateInput(customStart) || customStart);
      endDate = setEndOfDay(parseDateInput(customEnd) || customEnd);
    } else if (period === 'week') {
      startDate = new Date();
      const day = startDate.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      const selectedMonth = parseMonthInput(month) || now;
      startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // === SUMMARY STATS ===
    const products = await Product.find({ userId });
    const totalProducts = products.length;
    const criticalCount = products.filter((p) => p.status === 'critical').length;
    const lowCount = products.filter((p) => p.status === 'low').length;
    const totalValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

    const activeSuppliers = await Supplier.countDocuments({ userId, status: 'ACTIVE' });
    const allPO = await PurchaseOrder.find({ userId });
    const isInPeriod = (date) => new Date(date) >= startDate && new Date(date) <= endDate;
    const completedPOPeriod = allPO.filter((po) => po.status === 'COMPLETED' && isInPeriod(po.updatedAt)).length;

    // === TOP PRODUCTS (paling banyak keluar) ===
    const movements = await StockMovement.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const outMovements = movements.filter((m) => m.type === 'OUT');
    const inMovements = movements.filter((m) => m.type === 'IN');

    // Aggregate qty OUT per product
    const productOutMap = {};
    outMovements.forEach((m) => {
      if (!productOutMap[m.productName]) {
        productOutMap[m.productName] = { name: m.productName, sku: m.sku, totalOut: 0 };
      }
      productOutMap[m.productName].totalOut += m.qty;
    });

    const topProducts = Object.values(productOutMap)
      .sort((a, b) => b.totalOut - a.totalOut)
      .slice(0, 5);

    // Tambahkan kategori ke top products
    const topProductsWithCategory = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await Product.findOne({ userId, name: tp.name });
        return { ...tp, category: product ? product.category : '-' };
      })
    );

    // === STOCK MOVEMENT SUMMARY ===
    const totalStockIn = inMovements.reduce((acc, m) => acc + m.qty, 0);
    const totalStockOut = outMovements.reduce((acc, m) => acc + m.qty, 0);

    // === CRITICAL STOCK LIST ===
    const criticalProducts = products
      .filter((p) => p.status === 'critical' || p.status === 'low')
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        status: p.status,
        category: p.category,
      }));

    // === INVENTORY VALUE PER CATEGORY ===
    const categories = await Category.find({ userId, status: 'active' });
    const categoryValues = await Promise.all(
      categories.map(async (cat) => {
        const catProducts = products.filter((p) => p.category === cat.name);
        const value = catProducts.reduce((acc, p) => acc + p.price * p.stock, 0);
        const count = catProducts.length;
        return { name: cat.name, value, productCount: count };
      })
    );

    // Sort by value descending
    categoryValues.sort((a, b) => b.value - a.value);

    // === RECENT MOVEMENTS ===
    const recentMovements = await StockMovement.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentActivities = recentMovements.map((m) => ({
      id: m._id,
      title: `Stock ${m.type} ${m.productName}`,
      time: getTimeAgo(m.createdAt),
      type: m.type,
      qty: m.qty,
      date: m.createdAt,
    }));

    const paymentSummary = ['cash', 'qris'].map((method) => {
      const methodTransactions = transactions.filter((t) => t.paymentMethod === method);
      return {
        method,
        count: methodTransactions.length,
        total: methodTransactions.reduce((acc, t) => acc + t.totalAmount, 0),
      };
    });

    const sumQty = (items) => items.reduce((total, movement) => total + movement.qty, 0);
    const isLegacyPos = (movement) =>
      movement.type === 'OUT' && (movement.note || '').toLowerCase().includes('penjualan');
    const isLegacyPO = (movement) =>
      movement.referenceModel === 'IncomingItem' &&
      (movement.note || '').toLowerCase().includes('purchase order');

    const posMovements = outMovements.filter(
      (movement) => movement.referenceModel === 'Transaction' || isLegacyPos(movement)
    );
    const adjustmentOutMovements = outMovements.filter(
      (movement) =>
        !posMovements.includes(movement) &&
        ['Adjustment', 'Manual'].includes(movement.referenceModel)
    );
    const otherOutMovements = outMovements.filter(
      (movement) =>
        !posMovements.includes(movement) && !adjustmentOutMovements.includes(movement)
    );

    const poMovements = inMovements.filter(
      (movement) => movement.referenceModel === 'PurchaseOrder' || isLegacyPO(movement)
    );
    const incomingMovements = inMovements.filter(
      (movement) => movement.referenceModel === 'IncomingItem' && !poMovements.includes(movement)
    );
    const initialMovements = inMovements.filter((movement) => movement.referenceModel === 'InitialStock');
    const importMovements = inMovements.filter((movement) => movement.referenceModel === 'Import');
    const adjustmentInMovements = inMovements.filter((movement) =>
      ['Adjustment', 'Manual'].includes(movement.referenceModel)
    );
    const classifiedInMovements = new Set([
      ...poMovements,
      ...incomingMovements,
      ...initialMovements,
      ...importMovements,
      ...adjustmentInMovements,
    ]);
    const otherInMovements = inMovements.filter((movement) => !classifiedInMovements.has(movement));
    const totalSales = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const totalTransactions = transactions.length;

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          criticalCount,
          lowCount,
          totalValue,
          activeSuppliers,
          totalPO: allPO.length,
          completedPOPeriod,
        },
        topProducts: topProductsWithCategory,
        stockMovement: {
          totalIn: totalStockIn,
          totalOut: totalStockOut,
          total: totalStockIn + totalStockOut,
          posStockOut: sumQty(posMovements),
          adjustmentStockOut: sumQty(adjustmentOutMovements),
          otherStockOut: sumQty(otherOutMovements),
          poStockIn: sumQty(poMovements),
          incomingStockIn: sumQty(incomingMovements),
          initialStockIn: sumQty(initialMovements),
          importStockIn: sumQty(importMovements),
          adjustmentStockIn: sumQty(adjustmentInMovements),
          otherStockIn: sumQty(otherInMovements),
        },
        sales: {
          totalSales,
          totalTransactions,
          averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
        },
        paymentSummary,
        criticalStock: criticalProducts,
        categoryValues,
        recentActivities,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper: waktu relatif
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}

module.exports = { getReport };
