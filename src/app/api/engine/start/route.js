import { NextResponse } from 'next/server';
import { startTradeMonitor } from '@/lib/tradeMonitor.js';
import { logger } from '@/lib/logger.js';

let isStarted = false;

export async function GET() {
  try {
    if (!isStarted) {
      startTradeMonitor();
      isStarted = true;
      logger.info('🚀 ENGINE SERVICE INITIATED: Trade Monitor & SL/TP Manager active.');
    }
    return NextResponse.json({ 
      status: 'Engine Running', 
      timestamp: new Date().toISOString(),
      service: 'TradeMonitor_v2.5'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
