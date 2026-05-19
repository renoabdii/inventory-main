const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const productRoutes = require('./product');
const categoryRoutes = require('./category');
const incomingItemRoutes = require('./incomingItem');
const stockMovementRoutes = require('./stockMovement');
const supplierRoutes = require('./supplier');
const purchaseOrderRoutes = require('./purchaseOrder');
const dashboardRoutes = require('./dashboard');
const reportRoutes = require('./report');
const forecastRoutes = require('./forecast');

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Product routes
router.use('/products', productRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Incoming items routes
router.use('/incoming-items', incomingItemRoutes);

// Stock movement routes
router.use('/stock-movements', stockMovementRoutes);

// Supplier routes
router.use('/suppliers', supplierRoutes);

// Purchase order routes
router.use('/purchase-orders', purchaseOrderRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Forecast routes
router.use('/forecast', forecastRoutes);

module.exports = router;
