const User = require('../models/User');
const Product = require('../models/Product');
const {
  startForecastTraining,
  waitForForecastTraining,
} = require('../services/forecastService');

const isEnabled = () => String(process.env.FORECAST_AUTO_TRAIN_ENABLED || '').toLowerCase() === 'true';

const parseDailyTime = (value) => {
  const fallback = { hour: 0, minute: 30 };
  if (!value) return fallback;

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;

  return { hour, minute };
};

const getNextRunDelayMs = (now = new Date(), timeValue = process.env.FORECAST_AUTO_TRAIN_TIME) => {
  const { hour, minute } = parseDailyTime(timeValue);
  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.getTime() - now.getTime();
};

const findAdminsWithProducts = async () => {
  const ownerIds = await Product.distinct('userId');
  if (!ownerIds.length) return [];

  return User.find({
    _id: { $in: ownerIds },
    role: 'admin',
    isActive: true,
  }).select('_id username').lean();
};

const runForecastScheduleOnce = async () => {
  const admins = await findAdminsWithProducts();

  if (!admins.length) {
    console.log('[ForecastScheduler] Tidak ada admin aktif yang punya produk.');
    return;
  }

  console.log(`[ForecastScheduler] Auto forecast dimulai untuk ${admins.length} admin.`);

  for (const admin of admins) {
    try {
      const started = await startForecastTraining(admin._id);
      if (started) {
        console.log(`[ForecastScheduler] Training dimulai untuk admin ${admin.username}.`);
      } else {
        console.log(`[ForecastScheduler] Training admin ${admin.username} sudah berjalan, menunggu selesai.`);
      }

      await waitForForecastTraining(admin._id);
    } catch (error) {
      console.error(`[ForecastScheduler] Gagal memproses admin ${admin.username}:`, error.message);
    }
  }

  console.log('[ForecastScheduler] Auto forecast selesai.');
};

const initForecastScheduler = () => {
  if (!isEnabled()) {
    console.log('[ForecastScheduler] Nonaktif. Set FORECAST_AUTO_TRAIN_ENABLED=true untuk mengaktifkan.');
    return null;
  }

  const scheduleNext = () => {
    const delayMs = getNextRunDelayMs();
    const minutes = Math.round(delayMs / 60000);
    console.log(`[ForecastScheduler] Aktif. Run berikutnya sekitar ${minutes} menit lagi.`);

    const timer = setTimeout(async () => {
      try {
        await runForecastScheduleOnce();
      } catch (error) {
        console.error('[ForecastScheduler] Auto forecast gagal:', error.message);
      } finally {
        scheduleNext();
      }
    }, delayMs);

    if (typeof timer.unref === 'function') timer.unref();
    return timer;
  };

  return scheduleNext();
};

module.exports = {
  initForecastScheduler,
  runForecastScheduleOnce,
  getNextRunDelayMs,
};
