import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db.js';
import { Log } from '@/lib/models.js';

export async function GET() {
  try {
    await connectDB();
    const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
