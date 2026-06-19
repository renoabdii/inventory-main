const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const ForecastCache = require('../models/ForecastCache');
const {
  startForecastTraining,
  isForecastTraining,
  resolveForecastJobStatus,
} = require('../services/forecastService');

const getOwnerUserId = (req) => {
  if (req.user.role === 'kasir') return req.user.adminId;
  return req.user.id;
};

const buildMovingAverageForecast = async (userId) => {
  const products = await Product.find({ userId }).lean();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const productIds = products.map((product) => product._id);
  const outMovements = productIds.length
    ? await StockMovement.find({
        userId,
        product: { $in: productIds },
        type: 'OUT',
        createdAt: { $gte: thirtyDaysAgo },
      }).select('product qty createdAt').lean()
    : [];

  const movementsByProduct = new Map();
  outMovements.forEach((movement) => {
    const productId = String(movement.product);
    if (!movementsByProduct.has(productId)) movementsByProduct.set(productId, []);
    movementsByProduct.get(productId).push(movement);
  });

  const results = products.map((product) => {
    const productMovements = movementsByProduct.get(String(product._id)) || [];
    const totalOut = productMovements.reduce((total, movement) => total + movement.qty, 0);
    const daysWithData = new Set(
      productMovements.map((movement) => movement.createdAt.toISOString().split('T')[0])
    ).size;
    const avgOut = daysWithData > 0 ? totalOut / Math.max(daysWithData, 7) : 0;
    const predictedDays = avgOut > 0 ? Math.ceil(product.stock / avgOut) : 999;

    let status = 'SAFE';
    if (predictedDays <= 3) status = 'CRITICAL';
    else if (predictedDays <= 7) status = 'RESTOCK';

    return {
      productId: product._id.toString(),
      product: product.name,
      sku: product.sku,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      avgOut: Math.round(avgOut * 100) / 100,
      predictedDays,
      predictedDaily: [],
      method: 'moving_average',
      status,
    };
  });

  results.sort((a, b) => a.predictedDays - b.predictedDays);

  return {
    data: results,
    stats: {
      safe: results.filter((item) => item.status === 'SAFE').length,
      restock: results.filter((item) => item.status === 'RESTOCK').length,
      critical: results.filter((item) => item.status === 'CRITICAL').length,
      method: 'moving_average',
    },
  };
};

const getPrediction = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const cache = await ForecastCache.findOne({ userId }).lean();
    const isTraining = isForecastTraining(userId);
    const cacheStatus = resolveForecastJobStatus(cache?.status, isTraining);

    if (cache?.data?.length && cache.stats) {
      return res.json({
        success: true,
        data: cache.data,
        stats: cache.stats,
        status: cacheStatus,
        generatedAt: cache.generatedAt,
        error: cache.error || null,
      });
    }

    const fallback = await buildMovingAverageForecast(userId);
    return res.json({
      success: true,
      ...fallback,
      status: cacheStatus,
      generatedAt: null,
      error: cache?.error || null,
    });
  } catch (error) {
    next(error);
  }
};

const getPredictionStatus = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const cache = await ForecastCache.findOne({ userId })
      .select('status stats generatedAt error')
      .lean();

    return res.json({
      success: true,
      status: resolveForecastJobStatus(cache?.status, isForecastTraining(userId)),
      method: cache?.stats?.method || null,
      lstmStatus: cache?.stats?.lstmStatus || null,
      generatedAt: cache?.generatedAt || null,
      error: cache?.error || null,
    });
  } catch (error) {
    next(error);
  }
};

const generatePrediction = async (req, res, next) => {
  try {
    const userId = getOwnerUserId(req);
    const started = await startForecastTraining(userId);

    return res.status(started ? 202 : 200).json({
      success: true,
      status: 'training',
      message: started
        ? 'Training LSTM dimulai di background'
        : 'Training LSTM masih berjalan',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPrediction, getPredictionStatus, generatePrediction };
