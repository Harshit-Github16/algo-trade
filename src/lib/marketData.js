import { WebSocket } from 'ws';
import redis from './redis.js';
import { logger } from './logger.js';
import { Strategy } from './models.js';
import { connectDB } from './db.js';
import { addPriceTick } from './priceHistory.js';

// Always reset on startup so dev-mode hot reloads don't carry stale sockets
global._marketState = {
  ws: null,
  pingInterval: null,
  pollInterval: null,
  currentSymbols: []
};

function startWS(symbols) {
  const state = global._marketState;

  // Cleanup previous
  if (state.ws) {
    state.ws.terminate();
    state.ws = null;
  }
  if (state.pingInterval) {
    clearInterval(state.pingInterval);
    state.pingInterval = null;
  }

  const query = new URLSearchParams({
    symbols: symbols.join(','),
    tickType: 'watchlist',
    requestFor: 'EQ',
    EIO: '4',
    transport: 'websocket'
  });

  const url = `wss://live-quotes.niftytrader.in/socket.io/?${query.toString()}`;
  logger.info(`[MarketData] Connecting WS for: ${symbols.join(', ')}`);

  const ws = new WebSocket(url);
  state.ws = ws;

  ws.on('open', () => {
    logger.info('[MarketData] WebSocket Connected ✓');
    ws.send('40'); // Socket.IO namespace connect

    state.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('2'); // Keep-alive ping
    }, 25000);
  });

  ws.on('message', async (raw) => {
    const data = raw.toString();
    if (!data.startsWith('42')) return;

    try {
      const parsed = JSON.parse(data.substring(2));
      if (!Array.isArray(parsed)) return;
      const [event, payload] = parsed;

      if (event === 'watchlistTickData' || event === 'tick') {
        const ticks = Array.isArray(payload) ? payload : [payload];
        for (const tick of ticks) {
          const symbol = tick.symbol_name || tick.symbol;
          const ltp = tick.last_trade_price || tick.ltp;
          if (symbol && ltp) {
            await redis.hset(`market_data:${symbol}`, {
              ltp: ltp.toString(),
              timestamp: Date.now().toString()
            });
            // Store for indicator calculations
            addPriceTick(symbol, parseFloat(ltp));
          }
        }
      }
    } catch (err) {
      // Ignore parse errors
    }
  });

  ws.on('close', (code) => {
    logger.warn(`[MarketData] WS Closed (${code}) — will retry on next poll cycle`);
    state.ws = null;
    if (state.pingInterval) { clearInterval(state.pingInterval); state.pingInterval = null; }
  });

  ws.on('error', (err) => {
    logger.error(`[MarketData] WS Error: ${err.message}`);
  });
}

export async function connectMarketData() {
  await connectDB();

  async function pollAndSync() {
    try {
      const state = global._marketState;
      const strategies = await Strategy.find({ status: 'ACTIVE' });
      const symbols = [...new Set(strategies.map(s => s.symbol))];
      if (symbols.length === 0) symbols.push('NIFTY'); // Heartbeat default

      const changed = JSON.stringify([...symbols].sort()) !== JSON.stringify([...state.currentSymbols].sort());
      const disconnected = !state.ws || state.ws.readyState !== WebSocket.OPEN;

      if (changed || disconnected) {
        state.currentSymbols = symbols;
        logger.info(`[MarketData] Subscribing to: ${symbols.join(', ')}`);
        startWS(symbols);
      }
    } catch (err) {
      logger.error(`[MarketData] Poll error: ${err.message}`);
    }
  }

  // First sync immediately, then every 30s
  await pollAndSync();
  const state = global._marketState;
  if (!state.pollInterval) {
    state.pollInterval = setInterval(pollAndSync, 30000);
  }
}

export async function getPrice(symbol) {
  try {
    const data = await redis.hgetall(`market_data:${symbol}`);
    if (data && data.ltp) return parseFloat(data.ltp);
    return null;
  } catch (err) {
    return null;
  }
}

export async function getOptionData(symbol, strike, optionType) {
  try {
    const data = await redis.hgetall(`market_data:${symbol}_${strike}_${optionType}`);
    return data && data.ltp ? parseFloat(data.ltp) : null;
  } catch (err) {
    return null;
  }
}
