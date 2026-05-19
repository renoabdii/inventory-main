const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');

// Get report data
const getReport = async (req, res, next) => {
  try {
    const { period } = req.query; // 'week', 'month', 'all'

    // === Tentukan range waktu ===
    const now = new Date();
    let startDate = new Date(0); // default: semua waktu

    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // === SUMMARY STATS ===
    const products = await Product.find();
    const totalProducts = products.length;
    const criticalCount = products.filter((p) => p.status === 'critical').length;
    const lowCount = products.filter((p) => p.status === 'low').length;
    const totalValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

    const activeSuppliers = await Supplier.countDocuments({ status: 'ACTIVE' });
    const allPO = await PurchaseOrder.find();
    const completedPOPeriod = allPO.filter(
      (po) => po.status === 'COMPLETED' && new Date(po.updatedAt) >= startDate
    ).length;

    // === TOP PRODUCTS (paling banyak keluar) ===
    const movements = await StockMovement.find({
      createdAt: { $gte: startDate },
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
        const product = await Product.findOne({ name: tp.name });
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
    const categories = await Category.find({ status: 'active' });
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
    const recentMovements = await StockMovement.find()
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
        },
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
