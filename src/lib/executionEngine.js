import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { createTradeRecord } from './tradeManager.js';
import { placeDhanOrder } from './brokerClient.js';

export async function executeTrade({ strategy, signal, currentPrice }) {
  const signalId = uuidv4();
  logger.info(`Starting DUMMY execution for signal ${signalId}`, { strategyId: strategy._id || strategy.id, signal });

  try {
    // Determine order side
    const side = (signal === 'BUY') ? 'BUY' : 'SELL';
    
    // --- BYPASS REAL BROKER (PAPER TRADING MODE) ---
    logger.info(`✨ PAPER TRADE SIGNAL MATCHED: ${strategy.symbol} at ₹${currentPrice}`, { side });

    // Calculate Price Levels for SL/TP if they are provided as points
    let targetPrice = strategy.target || null;
    let slPrice = strategy.stopLoss || null;

    // Small-value check to distinguish absolute price vs relative points
    if (targetPrice && targetPrice < currentPrice * 0.2) {
      targetPrice = side === 'BUY' ? currentPrice + targetPrice : currentPrice - targetPrice;
    }
    if (slPrice && slPrice < currentPrice * 0.2) {
      slPrice = side === 'BUY' ? currentPrice - slPrice : currentPrice + slPrice;
    }

    // Trade execution: Create record as 'OPEN' and 'isDummy: true'
    await createTradeRecord({
      strategyId: strategy._id || strategy.id,
      symbol: strategy.symbol,
      side,
      strike: strategy.strike || 'N/A',
      optionType: strategy.optionType || 'EQ',
      entryPrice: currentPrice,
      qty: strategy.quantity,
      target: targetPrice,
      stopLoss: slPrice,
      status: 'OPEN',
      isDummy: true // Flag as paper trade
    });

    logger.info(`✅ Paper Trade Record Created: ${strategy.symbol} | Entry: ₹${currentPrice}`);

  } catch (err) {
    logger.error('Execution Engine Error', { err: err.message, strategyId: strategy._id || strategy.id });
  }
}

