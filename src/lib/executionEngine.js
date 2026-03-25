import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { createTradeRecord } from './tradeManager.js';
import { placeDhanOrder } from './brokerClient.js';

export async function executeTrade({ strategy, signal, currentPrice }) {
  const signalId = uuidv4();
  logger.info(`Starting execution for signal ${signalId}`, { strategyId: strategy._id || strategy.id, signal });

  try {
    // Determine order side
    const side = (signal === 'BUY') ? 'BUY' : 'SELL';
    
    // ATTEMPT REAL BROKER EXECUTION
    const result = await placeDhanOrder({
      symbol: strategy.symbol,
      qty: strategy.quantity,
      side,
      type: strategy.orderType || 'MARKET',
      price: currentPrice
    });

    if (result.status === 'SUCCESS') {
      logger.info(`Real Order Placed Successfully: ${result.orderId}`, { symbol: strategy.symbol, side });
      
      // Trade execution successful, save to DB
      await createTradeRecord({
        strategyId: strategy._id || strategy.id,
        symbol: strategy.symbol,
        strike: strategy.strike || 'N/A',
        optionType: strategy.optionType || 'EQ',
        entryPrice: currentPrice,
        qty: strategy.quantity,
        status: 'OPEN'
      });
    } else {
      logger.error(`Broker Execution Failed: ${result.reason}`, { strategyId: strategy._id || strategy.id });
      // We could optionally flip to mock if the user is in test mode, but for now we follow the 'Real' request
    }

  } catch (err) {
    logger.error('Execution Engine Error', { err: err.message, strategyId: strategy._id || strategy.id });
  }
}
