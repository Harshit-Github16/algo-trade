import axios from 'axios';
import { Broker } from './models.js';
import { logger } from './logger.js';

// In-memory cache for Dhan security master
let dhanMasterCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch and cache Dhan scrip master (NSE Equity only)
 * CSV Columns: SEM_EXM_EXCH_ID, SEM_SEGMENT, SEM_SMST_SECURITY_ID, SEM_INSTRUMENT_NAME, 
 *              SEM_EXPIRY_CODE, SEM_TRADING_SYMBOL, ...
 * We need: NSE,E,{securityId},EQUITY,0,{tradingSymbol},...
 */
async function getDhanMaster() {
  const now = Date.now();
  if (dhanMasterCache && (now - cacheTimestamp < CACHE_TTL)) {
    return dhanMasterCache;
  }

  try {
    logger.info('⬇️ Downloading Dhan Scrip Master...');
    const res = await axios.get('https://images.dhan.co/api-data/api-scrip-master.csv', {
      timeout: 30000,
      responseType: 'text'
    });

    const lines = res.data.split('\n');
    const master = new Map();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      // Filter: NSE, Segment E (Equity), Instrument EQUITY
      if (cols[0] === 'NSE' && cols[1] === 'E' && cols[3] === 'EQUITY') {
        const secId = cols[2];          // SEM_SMST_SECURITY_ID
        const symbol = cols[5];          // SEM_TRADING_SYMBOL
        if (secId && symbol) {
          master.set(symbol.toUpperCase().trim(), secId.trim());
        }
      }
    }

    dhanMasterCache = master;
    cacheTimestamp = now;
    logger.info(`✅ Dhan Master loaded: ${master.size} NSE Equity symbols`);
    return master;
  } catch (err) {
    logger.error('Failed to load Dhan Scrip Master', { err: err.message });
    return dhanMasterCache || new Map(); // Return stale cache if available
  }
}

/**
 * Place a real Equity (Cash/NSE) order via Dhan API v2
 */
export async function placeDhanOrder({ symbol, qty, side, type = 'MARKET', price = 0 }) {
  try {
    // 1. Find connected Dhan broker
    const broker = await Broker.findOne({ brokerName: 'Dhan', status: 'CONNECTED' });
    if (!broker) {
      throw new Error('No connected Dhan broker found. Please connect from Brokers page.');
    }
    if (!broker.accessToken) {
      throw new Error('Dhan Access Token is missing. Please reconnect Dhan broker.');
    }
    if (!broker.clientId) {
      throw new Error('Dhan Client ID is missing. Please add Client ID in Brokers page.');
    }

    // 2. Get Security ID from Dhan's own scrip master
    const master = await getDhanMaster();
    const securityId = master.get(symbol.toUpperCase().trim());
    if (!securityId) {
      throw new Error(`Security ID not found for "${symbol}" in Dhan NSE Equity master. Check symbol name.`);
    }

    // 3. Build Dhan V2 Equity Order Payload
    const payload = {
      dhanClientId: broker.clientId,
      correlationId: `ALGO_EQ_${Date.now()}`,
      transactionType: side === 'BUY' ? 'BUY' : 'SELL',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: type === 'LIMIT' ? 'LIMIT' : 'MARKET',
      validity: 'DAY',
      securityId: securityId,
      quantity: parseInt(qty),
      price: type === 'LIMIT' ? parseFloat(price) : 0,
      triggerPrice: 0,
      disclosedQuantity: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN',
      boProfitValue: 0,
      boStopLossValue: 0
    };

    logger.info(`📤 Placing Dhan Order: ${side} ${qty}x ${symbol} (secId: ${securityId})`, { payload });

    // 4. Send to Dhan API
    const response = await axios.post('https://api.dhan.co/v2/orders', payload, {
      headers: {
        'access-token': broker.accessToken,
        'client-id': broker.clientId,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    const data = response.data;
    logger.info('📥 Dhan API Response', { data });

    if (data && (data.status === 'SUCCESS' || data.orderId)) {
      return { status: 'SUCCESS', orderId: data.orderId || data.data?.orderId || 'CONFIRMED' };
    } else {
      return { status: 'FAILURE', reason: data?.remarks || data?.message || 'Order rejected by Dhan' };
    }

  } catch (err) {
    const reason = err.response?.data?.remarks || err.response?.data?.message || err.message;
    logger.error('❌ Dhan Order Failed', { reason, symbol, side });
    return { status: 'FAILURE', reason };
  }
}

/**
 * Check order status from Dhan API
 */
export async function getDhanOrderStatus(orderId) {
  if (!orderId || orderId === 'CONFIRMED') return null;
  
  try {
    const broker = await Broker.findOne({ brokerName: 'Dhan', status: 'CONNECTED' });
    if (!broker || !broker.accessToken) return null;

    const res = await axios.get(`https://api.dhan.co/v2/orders/${orderId}`, {
      headers: {
        'access-token': broker.accessToken,
        'client-id': broker.clientId,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    // Returns orderStatus like 'TRADED', 'CANCELLED', 'REJECTED', 'PENDING'
    return res.data?.orderStatus || res.data?.data?.orderStatus || null;
  } catch (err) {
    logger.warn(`Failed to check Dhan order status for ${orderId}: ${err.message}`);
    return null;
  }
}

/**
 * Get current positions from Dhan API
 */
export async function getDhanPositions() {
  try {
    const broker = await Broker.findOne({ brokerName: 'Dhan', status: 'CONNECTED' });
    if (!broker || !broker.accessToken) return [];

    const res = await axios.get('https://api.dhan.co/v2/positions', {
      headers: {
        'access-token': broker.accessToken,
        'client-id': broker.clientId,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return res.data || res.data?.data || [];
  } catch (err) {
    logger.error('Failed to fetch Dhan positions', { err: err.message });
    return [];
  }
}
