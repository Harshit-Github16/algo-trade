/**
 * Price History Collector
 * Collects 1-minute candles from live tick data and stores in Redis
 * Used by indicator engine for RSI, EMA, MACD etc calculations
 */
import redis from './redis.js';
import { logger } from './logger.js';

const HISTORY_KEY = (symbol) => `price_history:${symbol}`;
const MAX_CANDLES = 200; // Keep last 200 candles (enough for 200-period indicators)

/**
 * Add a price tick — called from marketData.js on every tick
 * Stores as 1-minute OHLC candles
 */
export async function addPriceTick(symbol, price) {
  try {
    const now = Date.now();
    const minuteKey = Math.floor(now / 60000); // Group by minute
    const key = HISTORY_KEY(symbol);

    // Get current candle for this minute
    const currentCandle = await redis.hget(key, `candle:${minuteKey}`);

    if (currentCandle) {
      const candle = JSON.parse(currentCandle);
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.ticks++;
      await redis.hset(key, `candle:${minuteKey}`, JSON.stringify(candle));
    } else {
      // New minute candle
      const candle = {
        time: minuteKey,
        open: price,
        high: price,
        low: price,
        close: price,
        ticks: 1
      };
      await redis.hset(key, `candle:${minuteKey}`, JSON.stringify(candle));

      // Cleanup old candles (keep only last MAX_CANDLES)
      const allKeys = await redis.hkeys(key);
      const candleKeys = allKeys.filter(k => k.startsWith('candle:')).sort();
      if (candleKeys.length > MAX_CANDLES) {
        const toDelete = candleKeys.slice(0, candleKeys.length - MAX_CANDLES);
        if (toDelete.length > 0) await redis.hdel(key, ...toDelete);
      }
    }
  } catch (err) {
    // Silent fail — don't block tick processing
  }
}

/**
 * Get price history as an array of closing prices (oldest first)
 * @param {string} symbol
 * @param {number} count - Number of candles to return
 * @returns {number[]} Array of closing prices
 */
export async function getPriceHistory(symbol, count = 100) {
  try {
    const key = HISTORY_KEY(symbol);
    const allData = await redis.hgetall(key);
    if (!allData) return [];

    const candles = Object.entries(allData)
      .filter(([k]) => k.startsWith('candle:'))
      .map(([k, v]) => {
        const candle = JSON.parse(v);
        candle.minuteKey = parseInt(k.split(':')[1]);
        return candle;
      })
      .sort((a, b) => a.minuteKey - b.minuteKey)
      .slice(-count);

    return candles.map(c => c.close);
  } catch (err) {
    return [];
  }
}

/**
 * Get full OHLC candle history
 */
export async function getCandleHistory(symbol, count = 100) {
  try {
    const key = HISTORY_KEY(symbol);
    const allData = await redis.hgetall(key);
    if (!allData) return [];

    return Object.entries(allData)
      .filter(([k]) => k.startsWith('candle:'))
      .map(([k, v]) => {
        const candle = JSON.parse(v);
        candle.minuteKey = parseInt(k.split(':')[1]);
        return candle;
      })
      .sort((a, b) => a.minuteKey - b.minuteKey)
      .slice(-count);
  } catch (err) {
    return [];
  }
}
