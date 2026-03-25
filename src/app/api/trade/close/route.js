import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Trade } from '@/lib/models.js';
import { placeDhanOrder } from '@/lib/brokerClient.js';
import { getPrice } from '@/lib/marketData.js';
import { logger } from '@/lib/logger.js';

// POST /api/trade/close  { tradeId }
export async function POST(req) {
  try {
    await connectDB();
    const { tradeId } = await req.json();

    if (!tradeId) {
      return NextResponse.json({ error: 'tradeId required' }, { status: 400 });
    }

    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    if (trade.status !== 'OPEN') {
      return NextResponse.json({ error: 'Trade already closed' }, { status: 400 });
    }

    // Get live price
    let ltp = await getPrice(trade.symbol);
    if (!ltp) {
      try {
        const res = await fetch(
          `https://webapi.niftytrader.in/webapi/Symbol/stock-list?symbol=${trade.symbol}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        const stock = (data?.resultData || []).find(s => s.symbol_name === trade.symbol);
        ltp = stock?.today_close || null;
      } catch (_) {}
    }

    if (!ltp) {
      return NextResponse.json({ error: 'No live price available. Market may be closed.' }, { status: 422 });
    }

    const exitPrice = parseFloat(ltp);
    const entryPrice = parseFloat(trade.entryPrice) || 0;
    const side = trade.side || 'BUY';
    const exitSide = side === 'BUY' ? 'SELL' : 'BUY';
    const qty = trade.qty || 1;

    // Calculate PNL
    const pnl = side === 'BUY'
      ? (exitPrice - entryPrice) * qty
      : (entryPrice - exitPrice) * qty;

    logger.info(`🔴 MANUAL CLOSE: ${exitSide} ${qty}x ${trade.symbol} @ ₹${exitPrice} | PNL: ₹${pnl.toFixed(2)}`);

    // Place reverse order
    const result = await placeDhanOrder({
      symbol: trade.symbol,
      qty,
      side: exitSide,
      type: 'MARKET',
      price: exitPrice
    });

    // Update trade record
    trade.exitPrice = exitPrice;
    trade.pnl = parseFloat(pnl.toFixed(2));
    trade.status = 'CLOSED';
    trade.closedAt = new Date();
    await trade.save();

    return NextResponse.json({
      success: true,
      message: `Trade closed for ${trade.symbol}`,
      exitPrice,
      pnl: parseFloat(pnl.toFixed(2)),
      brokerStatus: result.status,
      orderId: result.orderId || null
    });

  } catch (err) {
    logger.error('Close Trade Error', { err: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
