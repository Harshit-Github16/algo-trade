import { NextResponse } from 'next/server';
import { parseStrategyAlgorithm } from '@/lib/strategyParser.js';

export async function POST(req) {
  try {
    const { algorithm } = await req.json();

    if (!algorithm) {
      return NextResponse.json({ error: 'No algorithm text provided' }, { status: 400 });
    }

    const config = parseStrategyAlgorithm(algorithm);

    return NextResponse.json({ 
      success: true, 
      config 
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
