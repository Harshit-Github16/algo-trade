/**
 * Simple Natural Language Strategy Parser
 * Parses text like: "Buy RELIANCE if RSI below 30 and Price crosses 2500. Target 50, SL 20."
 */
export function parseStrategyAlgorithm(text) {
  const normalized = text.toLowerCase();
  
  // Initialize with current reasonable defaults or extracted ones
  const config = {
    name: `STRAT_${Date.now().toString().slice(-4)}`,
    symbol: "RELIANCE",
    entryConditionType: "price_cross",
    entryConditionLevel: null,
    entryConditionDirection: "up",
    stopLoss: null,
    target: null,
    quantity: 1,
    indicators: []
  };

  // 1. Symbol Detection (Handle case-insensitive and common tickers)
  const commonTickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'SBI', 'NIFTY', 'BANKNIFTY', 'IDFC'];
  
  // Try to find a common ticker first (case-insensitive)
  let foundSymbol = null;
  for (const tick of commonTickers) {
    if (normalized.includes(tick.toLowerCase())) {
      foundSymbol = tick;
      break;
    }
  }

  // Fallback: Extract any word that looks like a ticker (3-12 UPPERCASE letters/numbers)
  // but ignore 'RSI', 'EMA', 'SMA', 'MACD', 'SL', 'TP'
  if (!foundSymbol) {
    const uppercaseWords = text.match(/\b[A-Z]{3,12}\b/g) || [];
    const ignored = ['RSI', 'EMA', 'SMA', 'MACD', 'SL', 'TP', 'BUY', 'SELL', 'QTY'];
    foundSymbol = uppercaseWords.find(w => !ignored.includes(w));
  }

  if (foundSymbol) {
    config.symbol = foundSymbol;
  }


  // 2. Identify Action Side (Buy/Long vs Sell/Short)
  const isSell = normalized.includes('sell') || normalized.includes('short') || normalized.includes('bearish') || normalized.includes('down');
  config.entryConditionDirection = isSell ? 'down' : 'up';

  // 3. Detect Entry Type (Price, Indicator, or Hybrid)
  const hasIndicator = normalized.includes('rsi') || normalized.includes('ema') || normalized.includes('sma') || normalized.includes('macd');
  const hasPrice = normalized.match(/\b\d{3,6}\b/); // looks like a price level

  if (hasIndicator && hasPrice) {
    config.entryConditionType = 'price_and_indicator';
  } else if (hasIndicator) {
    config.entryConditionType = 'indicator';
  } else {
    config.entryConditionType = 'price_cross';
  }

  // 4. Extract Numbers for Level, Target, SL, Qty
  // Pattern for Price Level
  const levelMatch = normalized.match(/(?:level|price|at|crosses|hits|value)\s*(?:above|below|of)?\s*(\d+(\.\d+)?)/i) 
                  || normalized.match(/\b(\d{3,6}(\.\d+)?)\b/); // backup: first large number
  if (levelMatch) config.entryConditionLevel = parseFloat(levelMatch[1]);

  // Pattern for Target
  const targetMatch = normalized.match(/(?:target|tp|profit|take profit)\s*(?:of|is|at|points)?\s*(\d+(\.\d+)?)/i);
  if (targetMatch) config.target = parseFloat(targetMatch[1]);

  // Pattern for Stoploss
  const slMatch = normalized.match(/(?:sl|stoploss|stop loss|risk|below)\s*(?:of|is|at|points)?\s*(\d+(\.\d+)?)/i);
  if (slMatch) config.stopLoss = parseFloat(slMatch[1]);

  // Pattern for Quantity
  const qtyMatch = normalized.match(/(?:qty|quantity|size|units)\s*(?:of|is|at)?\s*(\d+)/i);
  if (qtyMatch) config.quantity = parseInt(qtyMatch[1]);

  // 5. Indicator Specific Parameters
  if (hasIndicator) {
    if (normalized.includes('rsi')) {
      const rsiVal = normalized.match(/rsi\s*(?:below|above|is|at|under|over)?\s*(\d+)/)?.[1] || (isSell ? 70 : 30);
      config.indicators.push({
        indicator: 'RSI',
        period: 14,
        compare: isSell ? 'above' : 'below',
        value: parseInt(rsiVal),
        action: isSell ? 'SELL' : 'BUY'
      });
    }

    if (normalized.includes('ema')) {
      const emaPeriod = normalized.match(/ema\s*(?:of|period)?\s*(\d+)/)?.[1] || 20;
      config.indicators.push({
        indicator: 'EMA',
        period: parseInt(emaPeriod),
        compare: isSell ? 'below' : 'above', // price below EMA = sell
        value: 0,
        action: isSell ? 'SELL' : 'BUY'
      });
    }
  }

  return config;
}

