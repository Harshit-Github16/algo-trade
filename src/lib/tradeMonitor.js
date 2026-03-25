import { connectDB } from './db.js';
import { Trade } from './models.js';
import { getPrice } from './marketData.js';
import { placeDhanOrder } from './brokerClient.js';
import { logger } from './logger.js';

let monitorInterval = null;
let lastSyncTime = 0;

export function startTradeMonitor() {
  if (monitorInterval) return;
  logger.info('Starting Trade Monitor (SL/TP Auto-Exit & Status Sync)...');
  monitorInterval = setInterval(checkOpenTrades, 2000);
}

export function stopTradeMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('Trade Monitor stopped.');
  }
}

async function checkOpenTrades() {
  try {
    await connectDB();
    const openTrades = await Trade.find({ status: 'OPEN' });
    if (openTrades.length === 0) return;

    // --- 1. Sync Positions from Broker (Every 10 seconds) ---
    const now = Date.now();
    if (now - lastSyncTime > 10000) {
      lastSyncTime = now;
      try {
        const { getDhanPositions } = await import('./brokerClient.js');
        const dhanPositions = await getDhanPositions();
        
        // Map positions by symbol for easy lookup
        const activeSymbols = new Map();
        (dhanPositions || []).forEach(p => {
          if (Math.abs(p.netQty) > 0) {
            activeSymbols.set(p.tradingSymbol, p.netQty);
          }
        });

        for (const trade of openTrades) {
          // If we have an open trade but Dhan says position is 0
          if (!activeSymbols.has(trade.symbol)) {
             logger.info(`🔄 SYNC: Symbol ${trade.symbol} closed externally at broker. Marking CLOSED. `);
             trade.status = 'CLOSED';
             trade.closedAt = new Date();
             trade.tags.push('EXTERNAL_CLOSE');
             await trade.save();
             continue; // Skip further SL/TP check for this trade
          }
        }
      } catch (syncErr) {
        logger.warn('Position sync failed', { err: syncErr.message });
      }
    }

    // --- 2. Check SL/TP Auto-Exit ---
    for (const trade of openTrades) {
      if (trade.status !== 'OPEN') continue; // Might have been closed in sync above
      const ltp = await getPrice(trade.symbol);
      if (!ltp) continue;

      const entry = parseFloat(trade.entryPrice) || 0;
      const target = trade.target ? parseFloat(trade.target) : null;
      const sl = trade.stopLoss ? parseFloat(trade.stopLoss) : null;
      const side = trade.side || 'BUY';
      const qty = trade.qty || 1;

      let exitReason = null;

      if (side === 'BUY') {
        // Long position: exit if price >= target OR price <= SL
        if (target && ltp >= target) exitReason = 'TARGET_HIT';
        if (sl && ltp <= sl) exitReason = 'STOPLOSS_HIT';
      } else {
        // Short position: exit if price <= target OR price >= SL
        if (target && ltp <= target) exitReason = 'TARGET_HIT';
        if (sl && ltp >= sl) exitReason = 'STOPLOSS_HIT';
      }

      if (exitReason) {
        logger.info(`🔔 AUTO-EXIT: ${exitReason} for ${trade.symbol} | LTP: ₹${ltp} | Entry: ₹${entry}`);

        // Place reverse order to close position
        const exitSide = side === 'BUY' ? 'SELL' : 'BUY';
        const result = await placeDhanOrder({
          symbol: trade.symbol,
          qty,
          side: exitSide,
          type: 'MARKET',
          price: ltp
        });

        // Calculate PNL
        const pnl = side === 'BUY'
          ? (ltp - entry) * qty
          : (entry - ltp) * qty;

        // Update trade record
        trade.exitPrice = ltp;
        trade.pnl = parseFloat(pnl.toFixed(2));
        trade.status = 'CLOSED';
        trade.closedAt = new Date();
        await trade.save();

        logger.info(`✅ Trade Closed: ${trade.symbol} | Reason: ${exitReason} | PNL: ₹${pnl.toFixed(2)} | Broker: ${result.status}`);
      }
    }
  } catch (err) {
    logger.error('Trade Monitor Error:', { err: err.message });
  }
}
