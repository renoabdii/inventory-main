const mongoose = require('mongoose');

const forecastModelSchema = new mongoose.Schema(
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
      enum: ['idle', 'training', 'ready', 'failed', 'insufficient_data'],
      default: 'idle',
    },
    modelPath: {
      type: String,
      trim: true,
    },
    trainedAt: Date,
    dataStartDate: Date,
    dataEndDate: Date,
    epochs: Number,
    sequenceLength: Number,
    horizon: Number,
    maxProducts: Number,
    productCount: Number,
    productsTrained: Number,
    method: String,
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForecastModel', forecastModelSchema, 'forecast_models');
