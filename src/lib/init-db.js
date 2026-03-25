import pool from './db.js';

async function initDB() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Strategies
    await client.query(`
      CREATE TABLE IF NOT EXISTS strategies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        optionType VARCHAR(10) NOT NULL,
        strike VARCHAR(50) NOT NULL,
        expiry VARCHAR(50) NOT NULL,
        entryCondition JSONB NOT NULL,
        stopLoss NUMERIC,
        target NUMERIC,
        quantity INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'STOPPED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Trades
    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        strategyId UUID REFERENCES strategies(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        strike VARCHAR(50) NOT NULL,
        optionType VARCHAR(10) NOT NULL,
        entryPrice NUMERIC,
        exitPrice NUMERIC,
        qty INTEGER NOT NULL,
        pnl NUMERIC,
        status VARCHAR(20) DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      );
    `);

    // Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20),
        message TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Broker Connections
    await client.query(`
      CREATE TABLE IF NOT EXISTS broker_connections (
        id SERIAL PRIMARY KEY,
        brokerName VARCHAR(50) NOT NULL,
        apiKey TEXT,
        apiSecret TEXT,
        accessToken TEXT,
        status VARCHAR(20) DEFAULT 'DISCONNECTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database schema created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating schema:', err);
  } finally {
    client.release();
  }
}

initDB().catch(console.error);
