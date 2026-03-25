import { connectDB } from './db.js';
import { Broker } from './models.js';
import { logger } from './logger.js';

export async function connectBroker({ brokerName, apiKey, apiSecret, accessToken }) {
  try {
    await connectDB();
    // Using simple create, if a broker exists, we could use updateOne with upsert, but following logic from postgres:
    // It used to be insert without conflict if there was no PK logic or with it if applied
    // Actually, let's just create a new one to keep track, or update based on brokerName
    await Broker.findOneAndUpdate(
      { brokerName },
      { apiKey, apiSecret, accessToken, status: 'CONNECTED' },
      { upsert: true, new: true }
    );

    logger.info(`Broker ${brokerName} connected successfully.`);
    return true;
  } catch (err) {
    logger.error('Broker connection failed', { err: err.message, brokerName });
    return false;
  }
}

export async function getBrokerStatus() {
  try {
    await connectDB();
    const broker = await Broker.findOne().sort({ _id: -1 });
    return broker ? broker : { status: 'DISCONNECTED' };
  } catch (err) {
    return { status: 'DISCONNECTED' };
  }
}
