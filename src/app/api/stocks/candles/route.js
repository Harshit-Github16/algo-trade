import { NextResponse } from 'next/server';
import { getCandleHistory } from '@/lib/priceHistory.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe') || '1m';

  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });

  try {
    // 1. If 1D, use Historical (could be proxied but here we return a specific set)
    if (timeframe === '1d') {
        const histRes = await fetch(`https://webapi.niftytrader.in/webapi/Symbol/symbol-historical-data?symbol=${symbol.toLowerCase()}`);
        const histData = await histRes.json();
        const candles = (histData?.resultData || []).map(d => ({
            time: Math.floor(new Date(d.created_at).getTime() / 1000),
            open: parseFloat(d.open), high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close)
        }));
        return NextResponse.json({ success: true, symbol: symbol.toUpperCase(), timeframe, candles });
    }

    // 2. Fetch 1m Base Candles from Redis
    const baseCandles = await getCandleHistory(symbol.toUpperCase(), 500);
    
    // Convert minutes to seconds
    let formatted = baseCandles.map(c => ({
      time: Math.floor(c.time * 60), 
      open: c.open, high: c.high, low: c.low, close: c.close
    }));

    // 3. Simple Intraday Aggregation
    if (timeframe !== '1m') {
        const minutes = parseInt(timeframe);
        const aggregated = [];
        for (let i = 0; i < formatted.length; i += minutes) {
            const chunk = formatted.slice(i, i + minutes);
            if (chunk.length === 0) continue;
            aggregated.push({
                time: chunk[0].time,
                open: chunk[0].open,
                high: Math.max(...chunk.map(c => c.high)),
                low: Math.min(...chunk.map(c => c.low)),
                close: chunk[chunk.length - 1].close
            });
        }
        formatted = aggregated;
    }

    return NextResponse.json({ success: true, symbol: symbol.toUpperCase(), timeframe, candles: formatted });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch multi-tf' }, { status: 500 });
  }
}
