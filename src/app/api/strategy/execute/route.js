import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Strategy, Trade } from '@/lib/models.js';
import { placeDhanOrder } from '@/lib/brokerClient.js';
import { getPrice } from '@/lib/marketData.js';
import { logger } from '@/lib/logger.js';

// POST /api/strategy/execute  { strategyId }
export async function POST(req) {
  try {
    await connectDB();
    const { strategyId } = await req.json();

    if (!strategyId) {
      return NextResponse.json({ error: 'strategyId required' }, { status: 400 });
    }

    const strategy = await Strategy.findById(strategyId);
    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Get live price from Redis (may be null if feed not active)
    let currentPrice = await getPrice(strategy.symbol);

    // If Redis has no price, try NiftyTrader REST fallback
    if (!currentPrice) {
      try {
        const res = await fetch(
          `https://webapi.niftytrader.in/webapi/Symbol/stock-list?symbol=${strategy.symbol}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        const stock = (data?.resultData || []).find(
          s => s.symbol_name === strategy.symbol
        );
        currentPrice = stock?.last_trade_price || stock?.today_close || null;
      } catch (_) {}
    }

    if (!currentPrice) {
      return NextResponse.json(
        { error: `No live price available for ${strategy.symbol}. Market may be closed.` },
        { status: 422 }
      );
    }

    // Decide direction: if strategy says 'up' → BUY, else SELL
    const side = strategy.entryCondition?.direction === 'down' ? 'SELL' : 'BUY';

    logger.info(`🔴 FORCE ORDER: ${side} ${strategy.quantity} x ${strategy.symbol} @ ₹${currentPrice}`);

    // Place real order via Dhan
    const result = await placeDhanOrder({
      symbol: strategy.symbol,
      qty: strategy.quantity,
      side,
      type: 'MARKET',
      price: currentPrice
    });

    if (result.status === 'SUCCESS') {
      // Log trade to DB
      await Trade.create({
        strategyId: strategy._id,
        strategy_name: strategy.name,
        symbol: strategy.symbol,
        side,
        strike: 'N/A',
        optionType: 'EQ',
        entryPrice: parseFloat(currentPrice),
        qty: parseInt(strategy.quantity),
        pnl: 0,
        target: strategy.target ? parseFloat(strategy.target) : null,
        stopLoss: strategy.stopLoss ? parseFloat(strategy.stopLoss) : null,
        brokerOrderId: result.orderId || '',
        status: 'OPEN',
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: `Order placed for ${strategy.symbol}`,
        orderId: result.orderId,
        side,
        price: currentPrice,
        qty: strategy.quantity
      });
    } else {
      return NextResponse.json({ error: result.reason || 'Broker rejected order' }, { status: 502 });
    }

  } catch (err) {
    logger.error('Force Execute Error', { err: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
