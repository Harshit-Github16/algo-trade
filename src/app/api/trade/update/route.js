import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Trade } from '@/lib/models.js';
import { logger } from '@/lib/logger.js';

// PATCH /api/trade/update  { tradeId, target, stopLoss }
export async function PATCH(req) {
  try {
    await connectDB();
    const { tradeId, target, stopLoss } = await req.json();

    if (!tradeId) {
      return NextResponse.json({ error: 'tradeId required' }, { status: 400 });
    }

    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    if (trade.status !== 'OPEN') {
      return NextResponse.json({ error: 'Cannot edit a closed trade' }, { status: 400 });
    }

    if (target !== undefined) trade.target = target ? parseFloat(target) : null;
    if (stopLoss !== undefined) trade.stopLoss = stopLoss ? parseFloat(stopLoss) : null;
    await trade.save();

    logger.info(`✏️ Trade Updated: ${trade.symbol} | TP: ${trade.target} | SL: ${trade.stopLoss}`);

    return NextResponse.json({
      success: true,
      target: trade.target,
      stopLoss: trade.stopLoss
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
