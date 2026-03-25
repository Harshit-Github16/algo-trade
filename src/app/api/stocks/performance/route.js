import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://webapi.niftytrader.in/webapi/Symbol/symbol-historical-data?symbol=${symbol.toLowerCase()}`, {
      timeout: 10000
    });
    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
  }
}
