const { spawn } = require('child_process');
const path = require('path');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Run LSTM prediction via Python script
const getPrediction = async (req, res, next) => {
  try {
    const pythonScript = path.join(__dirname, '..', 'forecast', 'lstm_predict.py');

    // Coba jalankan Python script
    const python = spawn('python', [pythonScript], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', errorOutput);
        // Fallback ke prediksi sederhana jika Python gagal
        return fallbackPrediction(req, res, next);
      }

      try {
        const result = JSON.parse(output);
        if (result.success) {
          res.json(result);
        } else {
          // Fallback
          return fallbackPrediction(req, res, next);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError.message);
        return fallbackPrediction(req, res, next);
      }
    });

    python.on('error', (err) => {
      console.error('Python spawn error:', err.message);
      // Fallback ke prediksi sederhana
      return fallbackPrediction(req, res, next);
    });
  } catch (error) {
    return fallbackPrediction(req, res, next);
  }
};

// Fallback: prediksi sederhana berdasarkan rata-rata barang keluar
const fallbackPrediction = async (req, res, next) => {
  try {
    const products = await Product.find();

    // Ambil movement 30 hari terakhir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await Promise.all(
      products.map(async (product) => {
        // Hitung rata-rata barang keluar per hari
        const outMovements = await StockMovement.find({
          product: product._id,
          type: 'OUT',
          createdAt: { $gte: thirtyDaysAgo },
        });

        const totalOut = outMovements.reduce((acc, m) => acc + m.qty, 0);

        // Hitung jumlah hari yang ada data
        const daysWithData = new Set(
          outMovements.map((m) => m.createdAt.toISOString().split('T')[0])
        ).size;

        const avgOut = daysWithData > 0 ? totalOut / Math.max(daysWithData, 7) : 0;

        // Prediksi hari sampai habis
        let predictedDays = 999;
        if (avgOut > 0) {
          predictedDays = Math.ceil(product.stock / avgOut);
        }

        // Status
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
      })
    );

    // Sort by days ascending
    results.sort((a, b) => a.predictedDays - b.predictedDays);

    const stats = {
      safe: results.filter((r) => r.status === 'SAFE').length,
      restock: results.filter((r) => r.status === 'RESTOCK').length,
      critical: results.filter((r) => r.status === 'CRITICAL').length,
      method: 'moving_average',
    };

    res.json({ success: true, data: results, stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPrediction };
