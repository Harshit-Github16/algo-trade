import { NextResponse } from 'next/server';
import redis from '@/lib/redis.js';
import { connectDB } from '@/lib/db.js';
import { Strategy } from '@/lib/models.js';

export async function GET() {
  try {
    await connectDB();
    
    // Get all active strategies
    const strategies = await Strategy.find({ status: 'ACTIVE' });
    
    // Get Redis prices for each strategy symbol
    const results = await Promise.all(
      strategies.map(async (s) => {
        const redisData = await redis.hgetall(`market_data:${s.symbol}`);
        const ltp = redisData?.ltp ? parseFloat(redisData.ltp) : null;
        const timestamp = redisData?.timestamp ? new Date(parseInt(redisData.timestamp)) : null;
        const condition = s.entryCondition;
        const level = condition?.level;
        const direction = condition?.direction;
        
        let wouldTrigger = false;
        if (ltp && level) {
          if (direction === 'up' && ltp >= parseFloat(level)) wouldTrigger = true;
          if (direction === 'down' && ltp <= parseFloat(level)) wouldTrigger = true;
        }
        
        return {
          strategy: s.name,
          symbol: s.symbol,
          targetLevel: level,
          direction,
          redisLTP: ltp,
          lastTickAt: timestamp,
          redisDataAge: timestamp ? `${Math.round((Date.now() - parseInt(redisData.timestamp)) / 1000)}s ago` : 'NO DATA',
          wouldTrigger,
          status: s.status
        };
      })
    );

    // Also get raw redis keys
    const keys = await redis.keys('market_data:*');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      activeStrategies: strategies.length,
      redisKeys: keys,
      evaluation: results
    });
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
