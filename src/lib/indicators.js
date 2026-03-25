/**
 * Technical Indicators Library
 * Pure functions for RSI, EMA, SMA, MACD, Bollinger Bands, VWAP, Supertrend
 */

// ─── Simple Moving Average ───
export function SMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// ─── Exponential Moving Average ───
export function EMA(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// ─── RSI (Relative Strength Index) ───
export function RSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  let gains = 0, losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed for remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ─── MACD ───
export function MACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) return null;

  const fastEMA = EMA(prices, fastPeriod);
  const slowEMA = EMA(prices, slowPeriod);
  if (fastEMA === null || slowEMA === null) return null;

  // Build MACD line history
  const macdLine = [];
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);

  let fEma = prices.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  let sEma = prices.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;

  for (let i = slowPeriod; i < prices.length; i++) {
    fEma = prices[i] * kFast + fEma * (1 - kFast);
    sEma = prices[i] * kSlow + sEma * (1 - kSlow);
    macdLine.push(fEma - sEma);
  }

  if (macdLine.length < signalPeriod) return null;

  const signalLine = EMA(macdLine, signalPeriod);
  const currentMACD = macdLine[macdLine.length - 1];
  const histogram = currentMACD - signalLine;

  return {
    macd: currentMACD,
    signal: signalLine,
    histogram
  };
}

// ─── Bollinger Bands ───
export function BollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) return null;

  const sma = SMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const sd = Math.sqrt(variance);

  return {
    upper: sma + stdDev * sd,
    middle: sma,
    lower: sma - stdDev * sd,
    bandwidth: ((sma + stdDev * sd) - (sma - stdDev * sd)) / sma * 100
  };
}

// ─── VWAP (needs volume data) ───
export function VWAP(candles) {
  // candles = [{ close, volume }, ...]
  if (!candles || candles.length === 0) return null;
  let cumVol = 0, cumTP = 0;
  for (const c of candles) {
    const tp = c.close; // simplified: using close as typical price
    cumTP += tp * c.volume;
    cumVol += c.volume;
  }
  return cumVol > 0 ? cumTP / cumVol : null;
}

/**
 * Evaluate an indicator condition
 * @param {number[]} priceHistory - Array of recent closing prices (oldest first)
 * @param {object} condition - { indicator, period, compare, value }
 *   indicator: 'RSI' | 'EMA' | 'SMA' | 'MACD' | 'BBANDS'
 *   period: number
 *   compare: 'above' | 'below' | 'cross_above' | 'cross_below'
 *   value: number (threshold or reference)
 * @returns {string|null} - 'BUY' | 'SELL' | null
 */
export function evaluateIndicator(priceHistory, condition) {
  if (!priceHistory || priceHistory.length < 2) return null;

  const { indicator, period, compare, value } = condition;
  let current = null;

  switch (indicator) {
    case 'RSI': {
      current = RSI(priceHistory, period || 14);
      if (current === null) return null;

      // RSI logic: below 30 = oversold (BUY), above 70 = overbought (SELL)
      if (compare === 'below' && current < (value || 30)) return 'BUY';
      if (compare === 'above' && current > (value || 70)) return 'SELL';
      if (compare === 'cross_below' && current < (value || 30)) return 'BUY';
      if (compare === 'cross_above' && current > (value || 70)) return 'SELL';
      break;
    }

    case 'EMA': {
      current = EMA(priceHistory, period || 20);
      if (current === null) return null;
      const ltp = priceHistory[priceHistory.length - 1];

      if (compare === 'above' && ltp > current) return 'BUY';
      if (compare === 'below' && ltp < current) return 'SELL';
      if (compare === 'cross_above' && ltp > current) return 'BUY';
      if (compare === 'cross_below' && ltp < current) return 'SELL';
      break;
    }

    case 'SMA': {
      current = SMA(priceHistory, period || 20);
      if (current === null) return null;
      const ltp2 = priceHistory[priceHistory.length - 1];

      if (compare === 'above' && ltp2 > current) return 'BUY';
      if (compare === 'below' && ltp2 < current) return 'SELL';
      if (compare === 'cross_above' && ltp2 > current) return 'BUY';
      if (compare === 'cross_below' && ltp2 < current) return 'SELL';
      break;
    }

    case 'MACD': {
      const macdResult = MACD(priceHistory, 12, 26, 9);
      if (!macdResult) return null;

      // MACD crossover: histogram positive = bullish, negative = bearish
      if (compare === 'above' && macdResult.histogram > 0) return 'BUY';
      if (compare === 'below' && macdResult.histogram < 0) return 'SELL';
      if (compare === 'cross_above' && macdResult.histogram > 0) return 'BUY';
      if (compare === 'cross_below' && macdResult.histogram < 0) return 'SELL';
      break;
    }

    case 'BBANDS': {
      const bb = BollingerBands(priceHistory, period || 20, 2);
      if (!bb) return null;
      const ltp3 = priceHistory[priceHistory.length - 1];

      // Price below lower band = oversold (BUY), above upper = overbought (SELL)
      if (compare === 'below' && ltp3 <= bb.lower) return 'BUY';
      if (compare === 'above' && ltp3 >= bb.upper) return 'SELL';
      if (compare === 'cross_below' && ltp3 <= bb.lower) return 'BUY';
      if (compare === 'cross_above' && ltp3 >= bb.upper) return 'SELL';
      break;
    }

    default:
      return null;
  }

  return null;
}
