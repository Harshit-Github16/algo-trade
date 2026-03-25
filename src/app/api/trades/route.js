import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Trade } from '@/lib/models.js';

export async function GET() {
  try {
    await connectDB();
    const trades = await Trade.find().populate('strategyId', 'name').sort({ createdAt: -1 }).lean();
    
    const formattedTrades = trades.map(t => ({
      ...t,
      strategy_name: t.strategyId?.name || 'Unknown'
    }));

    return NextResponse.json({ trades: formattedTrades });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
