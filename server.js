import next from 'next';
import { createServer } from 'http';
import { parse } from 'url';
import { connectMarketData } from './src/lib/marketData.js';
import { startStrategyEngine } from './src/lib/strategyEngine.js';
import { startTradeManager } from './src/lib/tradeManager.js';
import { startTradeMonitor } from './src/lib/tradeMonitor.js';
import { logger } from './src/lib/logger.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3005;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    
    // Start background engines
    try {
      logger.info('Starting background engines from custom server...');
      connectMarketData();
      startStrategyEngine();
      startTradeManager();
      startTradeMonitor();
    } catch (engineErr) {
      console.error('Failed to start engines:', engineErr);
    }
  });
});
