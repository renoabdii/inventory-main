const mongoose = require('mongoose');

const forecastCacheSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['idle', 'training', 'completed', 'failed'],
      default: 'idle',
    },
    data: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: Date,
    generatedAt: Date,
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForecastCache', forecastCacheSchema, 'forecast_caches');
