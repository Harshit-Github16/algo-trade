import { connectDB } from './db.js';
import { Trade } from './models.js';
import { logger } from './logger.js';

const RISK_RULES = {
  MAX_LOSS_PER_TRADE: -5000,
  MAX_LOSS_PER_DAY: -20000,
  MAX_OPEN_TRADES: 5,
  COOLDOWN_SECONDS: 60
};

export async function validateTrade({ strategy, signal, currentPrice }) {
  try {
    await connectDB();
    // 1. Check max open trades
    const openTradesCount = await Trade.countDocuments({ status: 'OPEN' });

    if (openTradesCount >= RISK_RULES.MAX_OPEN_TRADES) {
      logger.warn(`Risk limits reached: Max ${RISK_RULES.MAX_OPEN_TRADES} open trades allowed.`);
      return false;
    }

    // 2. Cooldown check - look for recent closed trades for this strategy
    const recentTrades = await Trade.find({
      strategyId: strategy._id || strategy.id,
      status: 'CLOSED'
    }).sort({ closedAt: -1 }).limit(1);

    if (recentTrades.length > 0 && recentTrades[0].closedAt) {
      const closedAt = new Date(recentTrades[0].closedAt).getTime();
      const now = Date.now();
      if ((now - closedAt) < RISK_RULES.COOLDOWN_SECONDS * 1000) {
        logger.warn(`Cooldown active: Skipping trade for strategy ${strategy._id || strategy.id}.`);
        return false;
      }
    }

    // 3. Max loss per day check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyTrades = await Trade.aggregate([
      { $match: { closedAt: { $gte: startOfDay } } },
      { $group: { _id: null, totalPnl: { $sum: "$pnl" } } }
    ]);

    const totalDailyPnl = dailyTrades.length > 0 ? dailyTrades[0].totalPnl : 0;
    if (totalDailyPnl <= RISK_RULES.MAX_LOSS_PER_DAY) {
      logger.warn(`Max daily loss of ${RISK_RULES.MAX_LOSS_PER_DAY} reached. PNL: ${totalDailyPnl}.`);
      return false;
    }

    // All rules passed
    logger.info(`Trade validated for strategy ${strategy._id || strategy.id}`);
    return true;

  } catch (err) {
    logger.error(`Risk validation error: ${err.message}`, { strategyId: strategy._id || strategy.id });
    return false;
  }
}
