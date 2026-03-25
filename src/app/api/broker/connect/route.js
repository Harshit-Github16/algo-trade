import { NextResponse } from 'next/server';
import { connectBroker, getBrokerStatus } from '@/lib/broker.js';

export async function GET() {
  try {
    const status = await getBrokerStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { brokerName, apiKey, apiSecret, accessToken } = body;

    const success = await connectBroker({ brokerName, apiKey, apiSecret, accessToken });

    if (success) {
      return NextResponse.json({ success: true, message: 'Broker connected' });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to connect to broker' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
