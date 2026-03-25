import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await axios.get('https://webapi.niftytrader.in/webapi/Symbol/stock-list');
    
    // Handle specific NiftyTrader structure: { result: 1, resultData: [...] }
    let stocks = [];
    if (res.data) {
      if (Array.isArray(res.data.resultData)) {
        stocks = res.data.resultData;
      } else if (res.data.result && Array.isArray(res.data.result.stocks)) {
        stocks = res.data.result.stocks;
      } else if (Array.isArray(res.data)) {
        stocks = res.data;
      }
    }

    return NextResponse.json(stocks);
  } catch (err) {
    console.error('API Proxy Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
