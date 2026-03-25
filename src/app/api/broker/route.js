import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Broker } from '@/lib/models.js';
import axios from 'axios';

export async function GET() {
  try {
    await connectDB();
    const brokers = await Broker.find().lean();
    return NextResponse.json({ brokers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { brokerName, clientId, apiKey, apiSecret, accessToken } = await req.json();
    
    // Validate Dhan Credentials if it's Dhan
    if (brokerName === 'Dhan') {
      try {
        await axios.get('https://api.dhan.co/v2/profile', {
          headers: {
            'access-token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        // Success: continue to save
      } catch (err) {
        return NextResponse.json({ 
          error: 'Dhan Authentication Failed. Please check your Access Token.' 
        }, { status: 401 });
      }
    }

    await connectDB();
    
    // Check if broker already exists, if so update it, else create new
    const updatedBroker = await Broker.findOneAndUpdate(
      { brokerName },
      { clientId, apiKey, apiSecret, accessToken, status: 'CONNECTED' },
      { upsert: true, new: true }
    );

    return NextResponse.json({ broker: updatedBroker });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await connectDB();
    await Broker.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Broker disconnected' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
