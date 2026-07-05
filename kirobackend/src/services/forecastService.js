const { spawn } = require('child_process');
const path = require('path');
const ForecastCache = require('../models/ForecastCache');
const ForecastModel = require('../models/ForecastModel');

const FORECAST_TIMEOUT_MS = Number(process.env.FORECAST_TIMEOUT_MS || 300000);
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const activeJobs = new Map();

const resolveForecastJobStatus = (cacheStatus, isActive) => {
  if (isActive) return 'training';
  return cacheStatus === 'training' ? 'failed' : (cacheStatus || 'idle');
};

const runPythonForecast = (userId) => new Promise((resolve, reject) => {
  const pythonScript = path.join(__dirname, '..', 'forecast', 'lstm_predict.py');
  const python = spawn(PYTHON_BIN, [pythonScript, String(userId)], {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env },
  });

  let output = '';
  let errorOutput = '';
  let settled = false;

  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    callback(value);
  };

  const timeout = setTimeout(() => {
    python.kill('SIGTERM');
    finish(reject, new Error(`Forecast Python timeout after ${FORECAST_TIMEOUT_MS}ms`));
  }, FORECAST_TIMEOUT_MS);

  python.stdout.on('data', (data) => {
    output += data.toString();
  });

  python.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  python.on('error', (error) => {
    finish(reject, new Error(`Python spawn error (${PYTHON_BIN}): ${error.message}`));
  });

  python.on('close', (code) => {
    if (code !== 0) {
      return finish(reject, new Error(errorOutput.trim() || `Python exited with code ${code}`));
    }

    try {
      const result = JSON.parse(output);
      if (!result.success) {
        return finish(reject, new Error(result.message || 'Forecast Python gagal'));
      }
      return finish(resolve, result);
    } catch (error) {
      return finish(reject, new Error(`Forecast output tidak valid: ${error.message}`));
    }
  });
});

const startForecastTraining = async (userId) => {
  const jobKey = String(userId);
  if (activeJobs.has(jobKey)) return false;

  // Pasang lock sebelum operasi async agar dua klik bersamaan tidak membuat dua proses Python.
  activeJobs.set(jobKey, Promise.resolve());

  try {
    await ForecastCache.findOneAndUpdate(
      { userId },
      {
        $set: {
          status: 'training',
          startedAt: new Date(),
          error: null,
        },
        $setOnInsert: { data: [], stats: null },
      },
      { upsert: true, new: true }
    );

    await ForecastModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          status: 'training',
          error: null,
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    activeJobs.delete(jobKey);
    throw error;
  }

  const job = runPythonForecast(userId)
    .then(async (result) => {
      const modelMetadata = result.stats?.model || null;

      if (modelMetadata) {
        await ForecastModel.findOneAndUpdate(
          { userId },
          {
            status: modelMetadata.status || 'idle',
            modelPath: modelMetadata.modelPath || '',
            trainedAt: modelMetadata.trainedAt ? new Date(modelMetadata.trainedAt) : null,
            dataStartDate: modelMetadata.dataStartDate ? new Date(modelMetadata.dataStartDate) : null,
            dataEndDate: modelMetadata.dataEndDate ? new Date(modelMetadata.dataEndDate) : null,
            epochs: modelMetadata.epochs,
            sequenceLength: modelMetadata.sequenceLength,
            horizon: modelMetadata.horizon,
            maxProducts: modelMetadata.maxProducts,
            productCount: modelMetadata.productCount,
            productsTrained: modelMetadata.productsTrained,
            method: result.stats?.method || null,
            error: modelMetadata.error || null,
          },
          { upsert: true, new: true }
        );
      }

      if (result.stats?.lstmStatus === 'failed') {
        const cache = await ForecastCache.findOne({ userId }).select('data').lean();
        const update = {
          status: 'failed',
          error: result.stats.lstmError || 'Training LSTM gagal',
        };

        // Jika belum ada cache lama, simpan fallback agar halaman tetap berguna.
        if (!cache?.data?.length) {
          update.data = result.data;
          update.stats = result.stats;
          update.generatedAt = new Date();
        }

        await ForecastCache.findOneAndUpdate({ userId }, update);
        console.error(`Forecast LSTM failed for user ${userId}:`, update.error);
        return;
      }

      await ForecastCache.findOneAndUpdate(
        { userId },
        {
          status: 'completed',
          data: result.data,
          stats: result.stats,
          generatedAt: new Date(),
          error: null,
        }
      );
      console.log(`Forecast background completed for user ${userId}`);
    })
    .catch(async (error) => {
      console.error(`Forecast background failed for user ${userId}:`, error.message);
      await ForecastCache.findOneAndUpdate(
        { userId },
        { status: 'failed', error: error.message }
      );
      await ForecastModel.findOneAndUpdate(
        { userId },
        { status: 'failed', error: error.message },
        { upsert: true, new: true }
      );
    })
    .finally(() => {
      activeJobs.delete(jobKey);
    });

  activeJobs.set(jobKey, job);
  return true;
};

const isForecastTraining = (userId) => activeJobs.has(String(userId));

const waitForForecastTraining = async (userId) => {
  const job = activeJobs.get(String(userId));
  if (job) await job;
};

module.exports = {
  startForecastTraining,
  isForecastTraining,
  waitForForecastTraining,
  resolveForecastJobStatus,
};
