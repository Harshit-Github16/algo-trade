import { connectDB } from './db.js';
import { Trade, Strategy } from './models.js';
import { logger } from './logger.js';
import { getPrice } from './marketData.js';

export async function createTradeRecord(tradeData) {
  try {
    const { strategyId, symbol, strike, optionType, entryPrice, qty, status } = tradeData;

    await connectDB();
    const newTrade = new Trade({
      strategyId, symbol, strike, optionType, entryPrice, qty, status
    });
    await newTrade.save();

    logger.info(`Trade recorded for strategy ${strategyId}`);
  } catch (err) {
    logger.error('Failed to create trade record', { err: err.message });
  }
}

let managerInterval = null;

export function startTradeManager() {
  if (managerInterval) return;
  logger.info('Starting Trade Manager...');
  managerInterval = setInterval(manageOpenTrades, 1000); // Check open trades every second
}

export function stopTradeManager() {
  if (managerInterval) {
    clearInterval(managerInterval);
    managerInterval = null;
    logger.info('Trade Manager stopped.');
  }
}

async function manageOpenTrades() {
  try {
    await connectDB();
    const openTrades = await Trade.find({ status: 'OPEN' }).populate('strategyId');

    for (const trade of openTrades) {
      if (!trade.strategyId) continue;
      const strategy = trade.strategyId;
      
      const currentPrice = await getPrice(trade.symbol);
      if (!currentPrice) continue;

      // Simplistic PNL calc (assumes we are just trading raw underlying for the logic right now,
      // actual option pricing would use getOptionData)
      const pnl = (currentPrice - trade.entryPrice) * trade.qty;

      // Update PNL in DB
      trade.pnl = pnl;
      await trade.save();

      // Check Stop Loss & Target
      const stopLoss = strategy.stopLoss != null ? strategy.stopLoss : -Infinity;
      const target = strategy.target != null ? strategy.target : Infinity;

      // Exit trade if SL or Target hit
      if (pnl <= stopLoss || pnl >= target) {
        logger.info(`Trade exit condition hit for trade ${trade._id}. PNL: ${pnl}`);
        trade.status = 'CLOSED';
        trade.exitPrice = currentPrice;
        trade.closedAt = new Date();
        await trade.save();
      }
    }
  } catch (err) {
    logger.error('Trade Manager Error', { err: err.message });
  }
}
