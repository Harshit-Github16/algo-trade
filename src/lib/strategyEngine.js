import { connectDB } from './db.js';
import { Strategy, Trade } from './models.js';
import { getPrice } from './marketData.js';
import { validateTrade } from './riskEngine.js';
import { executeTrade } from './executionEngine.js';
import { logger } from './logger.js';
import { evaluateIndicator } from './indicators.js';
import { getPriceHistory } from './priceHistory.js';
import { closeTrade } from './tradeManager.js';

let engineInterval = null;

export async function startStrategyEngine() {
  if (engineInterval) return;
  logger.info('Starting Strategy Engine (Price + Indicators)...');
  engineInterval = setInterval(evaluateStrategies, 1000); // run every second
}

export function stopStrategyEngine() {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
    logger.info('Strategy Engine stopped.');
  }
}

async function evaluateStrategies() {
  try {
    await connectDB();
    const strategies = await Strategy.find({ status: 'ACTIVE' });

    for (const strategy of strategies) {
      const currentPrice = await getPrice(strategy.symbol);
      if (!currentPrice) continue;

      const condition = typeof strategy.entryCondition === 'string' 
        ? JSON.parse(strategy.entryCondition) 
        : strategy.entryCondition;

      // --- CHECK FOR OPEN TRADE EXIT ---
      const openTrade = await Trade.findOne({ strategyId: strategy._id, status: 'OPEN' });
      
      let indicatorSignal = null;
      if (strategy.indicators?.length > 0) {
        indicatorSignal = await evaluateAllIndicators(strategy);
      }

      if (openTrade) {
        // Indicator based Auto-Exit: Close if opposite signal or explicit exit indicator
        if (indicatorSignal && indicatorSignal !== openTrade.side) {
           logger.info(`🚨 INDICATOR EXIT: ${indicatorSignal} for ${strategy.symbol} (Side: ${openTrade.side})`);
           await closeTrade(openTrade._id, currentPrice, 'INDICATOR_EXIT');
        }
        continue; // Already in trade, skip entry logic
      }

      // --- CHECK FOR ENTRY SIGNAL ---
      let signal = null;

      // ─── 1. Price Cross Logic ───
      if (condition && condition.level && (condition.type === 'price_cross' || condition.type === 'breakout' || condition.type === 'price_and_indicator')) {
        const level = parseFloat(condition.level);
        if (condition.direction === 'up' && currentPrice >= level) {
          signal = 'BUY';
        } else if (condition.direction === 'down' && currentPrice <= level) {
          signal = 'SELL';
        }

        // If type is price_and_indicator, price must match AND indicator must confirm
        if (condition.type === 'price_and_indicator' && signal) {
          if (!indicatorSignal) {
            logger.info(`📊 [Indicator] Price matched but indicator not confirmed for ${strategy.symbol}`);
            signal = null; // Cancel
          }
        }
      }

      // ─── 2. Pure Indicator Logic ───
      if (!signal && condition?.type === 'indicator') {
        signal = indicatorSignal;
      }

      // ─── 3. Execute entry if signal found ───
      if (signal) {
        logger.info(`🚨 SIGNAL MATCHED: ${signal} for ${strategy.symbol} at ₹${currentPrice}`);

        const tradeData = { strategy, signal, currentPrice };
        const isValid = await validateTrade(tradeData);
        if (isValid) {
          await executeTrade(tradeData);
        } else {
          logger.warn(`Trade validation failed for ${strategy.symbol}`);
        }
      }
    }
  } catch (err) {
    logger.error('Strategy engine error:', { err: err.message });
  }
}


/**
 * Evaluate all indicator conditions for a strategy
 * ALL indicators must agree for a signal to fire
 */
async function evaluateAllIndicators(strategy) {
  if (!strategy.indicators || strategy.indicators.length === 0) return null;

  const priceHistory = await getPriceHistory(strategy.symbol, 200);
  if (priceHistory.length < 15) {
    // Not enough data yet for indicator calculation
    return null;
  }

  let finalSignal = null;

  for (const ind of strategy.indicators) {
    const result = evaluateIndicator(priceHistory, ind);
    
    logger.info(`📊 [${ind.indicator}] ${strategy.symbol}: period=${ind.period}, compare=${ind.compare}, value=${ind.value} → ${result || 'NO SIGNAL'}`);

    if (!result) return null; // ALL indicators must fire

    if (finalSignal === null) {
      finalSignal = result;
    } else if (finalSignal !== result) {
      return null; // Conflicting signals — no trade
    }
  }

  return finalSignal;
}
