import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Strategy } from '@/lib/models.js';

export async function GET() {
  try {
    await connectDB();
    const strategies = await Strategy.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ strategies });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      name, symbol, optionType, strike, expiry, 
      entryCondition, indicators, stopLoss, target, quantity,
      trailingSL, startTime, endTime, orderType, maxTradePerDay
    } = body;

    await connectDB();
    const newStrategy = new Strategy({
      name, symbol, optionType, strike, expiry, 
      entryCondition, indicators: indicators || [],
      stopLoss: stopLoss || null, 
      target: target || null, 
      quantity,
      trailingSL, startTime, endTime, orderType, maxTradePerDay
    });
    await newStrategy.save();

    return NextResponse.json({ strategy: newStrategy });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, status } = await req.json();

    if (!['ACTIVE', 'STOPPED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedStrategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({ strategy: updatedStrategy });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await connectDB();
    const deletedStrategy = await Strategy.findByIdAndDelete(id);

    if (!deletedStrategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Strategy deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
