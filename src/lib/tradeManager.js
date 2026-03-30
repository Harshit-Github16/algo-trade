import { connectDB } from './db.js';
import { Trade, Strategy } from './models.js';
import { logger } from './logger.js';
import { getPrice } from './marketData.js';

export async function createTradeRecord(tradeData) {
  try {
    const { strategyId, symbol, strike, optionType, entryPrice, qty, status, target, stopLoss, side, isDummy } = tradeData;

    await connectDB();
    const newTrade = new Trade({
      strategyId, symbol, strike, optionType, entryPrice, qty, status, target, stopLoss, side, isDummy: isDummy ?? true
    });
    await newTrade.save();

    logger.info(`✨ ${isDummy ? 'Paper' : 'Real'} Trade recorded for strategy ${strategyId}`);
    return newTrade;
  } catch (err) {
    logger.error('Failed to create trade record', { err: err.message });
  }
}

/**
 * Handle closing a trade: DB update + Broker Order
 */
export async function closeTrade(tradeId, exitPrice, reason = 'MANUAL') {
  try {
    await connectDB();
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== 'OPEN') return { success: false, message: 'Trade not found or already closed' };

    const side = trade.side || 'BUY';
    const exitSide = side === 'BUY' ? 'SELL' : 'BUY';
    const qty = trade.qty || 1;

    let brokerStatus = 'SKIPPED (DUMMY)';

    // Step 1: Real Order Exit (ONLY if not dummy)
    if (!trade.isDummy) {
      const { placeDhanOrder } = await import('./brokerClient.js');
      const result = await placeDhanOrder({
        symbol: trade.symbol,
        qty,
        side: exitSide,
        type: 'MARKET',
        price: exitPrice
      });
      brokerStatus = result.status;
    } else {
      logger.info(`✨ PAPER EXIT: Skipping broker for ${trade.symbol}`);
    }

    // 2. Calculate PNL
    const pnl = side === 'BUY'
      ? (exitPrice - trade.entryPrice) * qty
      : (trade.entryPrice - exitPrice) * qty;

    // 3. Update DB
    trade.exitPrice = exitPrice;
    trade.pnl = parseFloat(pnl.toFixed(2));
    trade.status = 'CLOSED';
    trade.closedAt = new Date();
    trade.tags.push(reason);
    await trade.save();

    logger.info(`✅ ${trade.isDummy ? 'PAPER' : 'REAL'} Trade Closed: ${trade.symbol} | Reason: ${reason} | PNL: ₹${pnl.toFixed(2)} | Broker: ${brokerStatus}`);
    return { success: true, pnl, brokerStatus };
  } catch (err) {
    logger.error('Error closing trade', { err: err.message });
    return { success: false, error: err.message };
  }
}

let managerInterval = null;

export function startTradeManager() {
  if (managerInterval) return;
  logger.info('Starting Trade Manager (PNL Sync)...');
  managerInterval = setInterval(manageOpenTrades, 3000);
}

export function stopTradeManager() {
  if (managerInterval) {
    clearInterval(managerInterval);
    managerInterval = null;
    logger.info('Trade Manager stopped.');
  }
}

/**
 * Periodically update PNL for display in dashboard.
 * Exit logic moved to tradeMonitor.js to avoid conflicts.
 */
async function manageOpenTrades() {
  try {
    await connectDB();
    const openTrades = await Trade.find({ status: 'OPEN' });

    for (const trade of openTrades) {
      const currentPrice = await getPrice(trade.symbol);
      if (!currentPrice) continue;

      const pnl = trade.side === 'BUY'
        ? (currentPrice - trade.entryPrice) * trade.qty
        : (trade.entryPrice - currentPrice) * trade.qty;

      trade.pnl = parseFloat(pnl.toFixed(2));
      await trade.save();
    }
  } catch (err) {
    logger.error('Trade Manager Sync Error', { err: err.message });
  }
}

