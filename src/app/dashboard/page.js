'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Activity, DollarSign, Target, PlayCircle,
  Cpu, Zap, ShieldCheck, Terminal, ArrowUpRight,
  RefreshCwIcon, TrendingUp, TrendingDown,
  RefreshCwIconIcon
} from 'lucide-react';

function StatCard({ title, value, subText, icon: Icon, variant = 'slate' }) {
  const themes = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  return (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 transition-all group overflow-hidden relative">
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${themes[variant]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-xl font-black text-[#0A1128] tracking-tighter mt-0.5">{value}</p>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">{subText}</p>
        </div>
      </div>
      <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">
        <Icon size={80} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeStrategies: 0,
    totalPnl: 0,
    openTrades: 0,
    closedTrades: 0,
    winRate: 0,
    tradesToday: 0
  });

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        axios.get('/api/engine/start').catch(e => console.error('Engine start failed', e));

        const [stratRes, tradeRes] = await Promise.all([
          axios.get('/api/strategy'),
          axios.get('/api/trades')
        ]);

        const strategies = stratRes.data.strategies || [];
        const activeStrats = strategies.filter(s => s.status === 'ACTIVE').length;

        const allTrades = tradeRes.data.trades || [];
        const openTradesList = allTrades.filter(t => t.status === 'OPEN');
        const closedTradesList = allTrades.filter(t => t.status === 'CLOSED');

        const totalPnl = allTrades.reduce((acc, t) => acc + parseFloat(t.pnl || '0'), 0);

        // Calculate daily stats
        const today = new Date().toDateString();
        const tradesToday = allTrades.filter(t => new Date(t.createdAt).toDateString() === today).length;

        // Win rate calc
        const profitTrades = closedTradesList.filter(t => parseFloat(t.pnl) > 0).length;
        const winRate = closedTradesList.length > 0 ? (profitTrades / closedTradesList.length) * 100 : 0;

        setStats({
          activeStrategies: activeStrats,
          totalPnl,
          openTrades: openTradesList.length,
          closedTrades: closedTradesList.length,
          winRate,
          tradesToday
        });

        setTrades(allTrades.slice(0, 8)); // Last 8 trades
      } catch (err) {
        console.error('Error loading dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    const interval = setInterval(loadDashboard, 15000); // Poll dashboard data every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-2 lg:px-4">
      {/* Dynamic Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter flex items-center gap-4">
            Trading Station
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest font-black shadow-sm">Enterprise Terminal</span>
          </h1>
          <div className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Real-time bridge connection active
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global P&L Balance</span>
            <p className={`text-2xl font-black font-mono tracking-tighter ${stats.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              ₹{stats.totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-[1px] h-10 bg-slate-100 mx-2" />
          <button onClick={() => window.location.reload()} className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <RefreshCwIcon className="w-5 h-5 text-[#0A1128]" />
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="P&L Performance" value={`₹${stats.totalPnl.toFixed(0)}`} subText="Total Combined" icon={DollarSign} variant={stats.totalPnl >= 0 ? 'success' : 'danger'} />
        <StatCard title="Execution Rate" value={`${stats.winRate.toFixed(1)}%`} subText="Accuracy Score" icon={Target} variant="indigo" />
        <StatCard title="Active Systems" value={stats.activeStrategies} subText="Live Engines" icon={Cpu} variant="slate" />
        <StatCard title="Open Risk" value={stats.openTrades} subText="Live Instances" icon={Activity} variant="indigo" />
        <StatCard title="Daily Load" value={stats.tradesToday} subText="Total Cycles" icon={Zap} variant="warning" />
        <StatCard title="Health Status" value="Optimal" subText="Mainframe" icon={ShieldCheck} variant="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8">
        {/* Left: Ticker Sidebar */}
        <div className="xl:col-span-3 space-y-6">
          <MarketWatch />

        </div>

        {/* Center: Execution Log */}
        <div className="xl:col-span-9 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-[#0A1128] tracking-tight flex items-center gap-3 underline decoration-indigo-500/20 underline-offset-8">
              System Execution Hub
            </h2>
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> API Gateway: OK</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Latency: 4ms</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100/80 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-100/20">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Time</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Node</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrument</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Batch Size</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">P&L Result</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Flow State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trades.map((trade) => (
                  <tr key={trade._id} className="hover:bg-indigo-50/20 transition-all group">
                    <td className="px-8 py-5 text-slate-500 text-[11px] font-mono font-bold">
                      {new Date(trade.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#0A1128] tracking-tight">{trade.strategy_name || 'MANUAL_OVERRIDE'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Engine-ID: {trade._id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[9px] font-black tracking-tighter">{trade.symbol}</div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">CASH</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center text-slate-900 font-black text-[11px] font-mono">{trade.qty} Units</td>
                    <td className={`px-8 py-5 text-right font-black text-xs font-mono ${parseFloat(trade.pnl) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {parseFloat(trade.pnl) > 0 ? '+' : ''}₹{parseFloat(trade.pnl || '0').toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-[0.1em] uppercase border flex items-center gap-2 ${trade.status === 'OPEN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {trade.status === 'OPEN' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                          {trade.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trades.length === 0 && !loading && (
              <div className="px-8 py-24 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-slate-200" />
                </div>
                <h4 className="text-[#0A1128] font-black text-lg mb-1 tracking-tight">System Idle</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No live executions detected in current session.</p>
              </div>
            )}
            {loading && (
              <div className="px-8 py-24 text-center animate-pulse">
                <div className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Buffer...</div>
              </div>
            )}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Memory Segment: Page 01 (Last 100 Trades)</span>
              <Link href="/trades" className="text-[10px] font-black text-indigo-600 hover:text-[#0A1128] uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                View Full Hub Execution
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketWatch() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    let ws = null;
    let pingInterval = null;

    async function initMarketWatch() {
      try {
        const res = await axios.get('/api/strategy');
        const activeStrats = res.data.strategies || [];
        const allSymbols = [...new Set(activeStrats.map(s => s.symbol))];

        if (allSymbols.length === 0) {
          setStocks([]);
          return;
        }

        setStocks(allSymbols.map(sym => ({ symbol: sym, ltp: '--' })));

        const query = new URLSearchParams({
          symbols: allSymbols.join(','),
          tickType: 'watchlist',
          requestFor: 'EQ',
          EIO: '4',
          transport: 'websocket'
        });

        const url = `wss://live-quotes.niftytrader.in/socket.io/?${query.toString()}`;
        ws = new WebSocket(url);

        ws.onopen = () => {
          ws.send('40');
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send('2');
          }, 25000);
        };

        ws.onmessage = (event) => {
          const data = event.data;
          if (data.startsWith('42')) {
            try {
              const content = JSON.parse(data.substring(2));
              if (Array.isArray(content) && (content[0] === 'watchlistTickData' || content[0] === 'tick')) {
                const ticks = Array.isArray(content[1]) ? content[1] : [content[1]];
                setStocks(prev => prev.map(s => {
                  const t = ticks.find(tick => (tick.symbol_name === s.symbol) || (tick.symbol === s.symbol));
                  return t ? { ...s, ltp: t.last_trade_price || t.ltp || s.ltp } : s;
                }));
              }
            } catch (err) { }
          }
        };

        ws.onclose = () => clearInterval(pingInterval);
      } catch (err) {
        console.error('MarketWatch Error:', err);
      }
    }

    initMarketWatch();
    return () => {
      if (ws) ws.close();
      if (pingInterval) clearInterval(pingInterval);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-black text-[#0A1128] uppercase tracking-[0.2em] flex items-center gap-2">
          <TrendingUp size={14} className="text-indigo-500" />
          Live Asset Stream
        </h2>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="divide-y divide-slate-50 max-h-[460px] overflow-y-auto custom-scrollbar">
        {stocks.length > 0 ? stocks.map(stock => (
          <div key={stock.symbol} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
            <div className="flex flex-col">
              <span className="text-xs font-black text-[#0A1128] tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic">{stock.symbol}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asset Protocol // Cash</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-[#0A1128] font-mono tracking-tighter">
                {stock.ltp !== '--' ? `₹${parseFloat(stock.ltp).toFixed(2)}` : '--'}
              </div>
              <div className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.1em] mt-0.5">LTP FEED</div>
            </div>
          </div>
        )) : (
          <div className="px-8 py-20 text-center opacity-40">
            <div className="flex flex-col items-center gap-3">
              <Activity size={32} className="text-slate-300" />
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting Data Stream...</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50/50 border-t border-slate-50 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <Zap size={10} className="text-indigo-400" />
          <span className="text-[8px] font-black text-slate-400 tracking-[0.2em] uppercase leading-none mt-0.5">NiftyTrader Enterprise Stream Active</span>
        </div>
      </div>
    </div>
  );
}

