import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  optionType: { type: String, default: 'EQ' },
  strike: { type: String, default: 'N/A' },
  expiry: { type: String, default: 'N/A' },
  entryCondition: { 
    type: { type: String }, // 'price_cross' | 'indicator' | 'price_and_indicator'
    level: { type: Number },
    direction: { type: String }
  },
  // Technical Indicator Conditions
  indicators: [{
    indicator: { type: String }, // 'RSI' | 'EMA' | 'SMA' | 'MACD' | 'BBANDS'
    period: { type: Number, default: 14 },
    compare: { type: String }, // 'above' | 'below' | 'cross_above' | 'cross_below'
    value: { type: Number },   // threshold (e.g., RSI 30, EMA period)
    action: { type: String, default: 'BUY' } // 'BUY' | 'SELL'
  }],
  stopLoss: { type: Number },
  target: { type: Number },
  trailingSL: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  startTime: { type: String, default: '09:15' },
  endTime: { type: String, default: '15:15' },
  orderType: { type: String, default: 'MARKET' },
  maxTradePerDay: { type: Number, default: 1 },
  status: { type: String, default: 'STOPPED' },
  createdAt: { type: Date, default: Date.now }
});

const tradeSchema = new mongoose.Schema({
  strategyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Strategy' },
  strategy_name: { type: String, default: '' },
  symbol: { type: String, required: true },
  side: { type: String, default: 'BUY' },
  strike: { type: String, default: 'N/A' },
  optionType: { type: String, default: 'EQ' },
  entryPrice: { type: Number, default: 0 },
  exitPrice: { type: Number },
  qty: { type: Number, required: true },
  pnl: { type: Number, default: 0 },
  target: { type: Number },
  stopLoss: { type: Number },
  brokerOrderId: { type: String, default: '' },
  brokerExitOrderId: { type: String, default: '' },
  status: { type: String, default: 'OPEN' }, // 'OPEN', 'CLOSED', 'CANCELLED'
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  tags: { type: [String], default: [] }
});

const logSchema = new mongoose.Schema({
  level: { type: String },
  message: { type: String },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

const brokerSchema = new mongoose.Schema({
  brokerName: { type: String, required: true },
  clientId: { type: String },
  apiKey: { type: String },
  apiSecret: { type: String },
  accessToken: { type: String },
  status: { type: String, default: 'DISCONNECTED' },
  createdAt: { type: Date, default: Date.now }
});

export const Strategy = mongoose.models.Strategy || mongoose.model('Strategy', strategySchema);
export const Trade = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);
export const Log = mongoose.models.Log || mongoose.model('Log', logSchema);
export const Broker = mongoose.models.Broker || mongoose.model('Broker', brokerSchema);
