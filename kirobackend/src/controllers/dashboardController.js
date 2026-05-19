const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const IncomingItem = require('../models/IncomingItem');

// Get dashboard summary
const getSummary = async (req, res, next) => {
  try {
    // === PRODUCT STATS ===
    const products = await Product.find();
    const totalProducts = products.length;
    const criticalStock = products.filter((p) => p.status === 'critical');
    const lowStock = products.filter((p) => p.status === 'low');

    // === STOCK MOVEMENT STATS (minggu ini) ===
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekMovements = await StockMovement.find({
      createdAt: { $gte: weekAgo, $lte: today },
    }).sort({ createdAt: -1 });

    const todayMovements = await StockMovement.find({
      createdAt: { $gte: todayStart, $lte: today },
    });

    const weekStockIn = weekMovements.filter((m) => m.type === 'IN');
    const weekStockOut = weekMovements.filter((m) => m.type === 'OUT');
    const todayStockIn = todayMovements.filter((m) => m.type === 'IN');

    const weekStockInQty = weekStockIn.reduce((acc, m) => acc + m.qty, 0);
    const weekStockOutQty = weekStockOut.reduce((acc, m) => acc + m.qty, 0);
    const todayStockInQty = todayStockIn.reduce((acc, m) => acc + m.qty, 0);

    // === PURCHASE ORDER STATS ===
    const allPO = await PurchaseOrder.find();
    const pendingPO = allPO.filter((po) => po.status === 'PENDING').length;

    // === RECENT ACTIVITIES (5 terbaru) ===
    const recentMovements = await StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivities = recentMovements.map((m) => ({
      id: m._id,
      title: `Stock ${m.type} ${m.productName}`,
      time: getTimeAgo(m.createdAt),
      type: m.type,
      qty: m.qty,
    }));

    // === CRITICAL STOCK LIST ===
    const criticalStockList = criticalStock
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        product: p.name,
        stock: p.stock,
        minStock: p.minStock,
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          criticalCount: criticalStock.length,
          lowCount: lowStock.length,
          todayStockIn: todayStockInQty,
          totalPO: allPO.length,
          pendingPO,
        },
        stockMovement: {
          weekIn: weekStockInQty,
          weekOut: weekStockOutQty,
          weekTotal: weekStockInQty + weekStockOutQty,
        },
        criticalStock: criticalStockList,
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

// Get notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = [];

    // 1. Produk dengan stock critical
    const products = await Product.find();
    const criticalProducts = products.filter((p) => p.status === 'critical');
    criticalProducts.forEach((p) => {
      notifications.push({
        id: `critical-${p._id}`,
        type: 'critical_stock',
        title: `Stock kritis: ${p.name}`,
        message: `Sisa ${p.stock} unit (min: ${p.minStock})`,
        severity: 'danger',
        time: p.updatedAt,
        timeAgo: getTimeAgo(p.updatedAt),
        link: '/dashboard/inventory',
      });
    });

    // 2. Produk dengan stock low
    const lowProducts = products.filter((p) => p.status === 'low');
    lowProducts.forEach((p) => {
      notifications.push({
        id: `low-${p._id}`,
        type: 'low_stock',
        title: `Stock rendah: ${p.name}`,
        message: `Sisa ${p.stock} unit (min: ${p.minStock})`,
        severity: 'warning',
        time: p.updatedAt,
        timeAgo: getTimeAgo(p.updatedAt),
        link: '/dashboard/inventory',
      });
    });

    // 3. Purchase Order pending
    const pendingPO = await PurchaseOrder.find({ status: 'PENDING' })
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    pendingPO.forEach((po) => {
      notifications.push({
        id: `po-${po._id}`,
        type: 'pending_po',
        title: `PO menunggu approval`,
        message: `${po.poNumber} - ${po.supplier?.name || 'Unknown'}`,
        severity: 'info',
        time: po.createdAt,
        timeAgo: getTimeAgo(po.createdAt),
        link: '/dashboard/purchaseorder',
      });
    });

    // 4. Incoming items pending
    const pendingIncoming = await IncomingItem.find({
      status: { $in: ['pending', 'in_progress'] },
    })
      .sort({ createdAt: -1 })
      .limit(5);
    pendingIncoming.forEach((item) => {
      notifications.push({
        id: `incoming-${item._id}`,
        type: 'pending_incoming',
        title: `Penerimaan menunggu verifikasi`,
        message: `${item.receiptId} - ${item.supplier}`,
        severity: 'info',
        time: item.createdAt,
        timeAgo: getTimeAgo(item.createdAt),
        link: '/dashboard/incoming',
      });
    });

    // Sort by time descending (terbaru dulu)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Count by severity
    const count = {
      total: notifications.length,
      danger: notifications.filter((n) => n.severity === 'danger').length,
      warning: notifications.filter((n) => n.severity === 'warning').length,
      info: notifications.filter((n) => n.severity === 'info').length,
    };

    res.json({ success: true, data: notifications.slice(0, 20), count });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getNotifications };
