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

    logger.info(`✨ PAPER FORCE ORDER: ${side} ${strategy.quantity} x ${strategy.symbol} @ ₹${currentPrice}`);

    // --- CREATE PAPER TRADE RECORD ---
    const newTrade = await Trade.create({
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
      brokerOrderId: `PAPER_${Date.now()}`,
      status: 'OPEN',
      isDummy: true, // Mark as paper trade
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `Paper order recorded for ${strategy.symbol}`,
      orderId: newTrade.brokerOrderId,
      side,
      price: currentPrice,
      qty: strategy.quantity
    });

  } catch (err) {
    logger.error('Force Execute Error', { err: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
