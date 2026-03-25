'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, TrendingUp, TrendingDown, X, Pencil, Check, RefreshCwIcon, ShieldCheck, Zap, ArrowUpRight, Square } from 'lucide-react';

export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [closingId, setClosingId] = useState(null);

  // Single edit object to handle both id and input values
  const [editItem, setEditItem] = useState(null); // { id, tp, sl }

  const wsRef = useRef(null);

  // --- Close Trade ---
  async function closeTrade(trade) {
    if (!window.confirm(`Close trade for ${trade.symbol}?\nReverse ${trade.side === 'BUY' ? 'SELL' : 'BUY'} order at market price.`)) return;
    setClosingId(trade._id);
    try {
      const res = await axios.post('/api/trade/close', { tradeId: trade._id });
      fetchTrades();
      alert(`✅ Trade Closed!`);
    } catch (err) {
      alert(`❌ Close Failed:\n${err.response?.data?.error || err.message}`);
    } finally {
      setClosingId(null);
    }
  }

  // --- Edit TP/SL ---
  function startEdit(trade) {
    setEditItem({
      id: trade._id,
      tp: trade.target || '',
      sl: trade.stopLoss || ''
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    try {
      await axios.patch('/api/trade/update', {
        tradeId: editItem.id,
        target: editItem.tp ? parseFloat(editItem.tp) : null,
        stopLoss: editItem.sl ? parseFloat(editItem.sl) : null
      });
      setEditItem(null);
      await fetchTrades();
    } catch (err) {
      alert(`❌ Update Failed:\n${err.response?.data?.error || err.message}`);
    }
  }

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect WebSocket for open trade symbols
  useEffect(() => {
    const openSymbols = [...new Set(trades.filter(t => t.status === 'OPEN').map(t => t.symbol))];
    if (openSymbols.length === 0) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      return;
    }
    connectWS(openSymbols);
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [trades.map(t => t._id + t.status).join(',')]);

  function connectWS(symbols) {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const query = new URLSearchParams({
      symbols: symbols.join(','),
      tickType: 'watchlist', requestFor: 'EQ',
      EIO: '4', transport: 'websocket'
    });
    const ws = new WebSocket(`wss://live-quotes.niftytrader.in/socket.io/?${query.toString()}`);
    wsRef.current = ws;
    ws.onopen = () => ws.send('40');
    const pingId = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('2'); }, 25000);
    ws.onmessage = (event) => {
      const data = event.data;
      if (!data.startsWith('42')) return;
      try {
        const parsed = JSON.parse(data.substring(2));
        if (!Array.isArray(parsed)) return;
        const [eventName, payload] = parsed;
        if (eventName === 'watchlistTickData' || eventName === 'tick') {
          const ticks = Array.isArray(payload) ? payload : [payload];
          setLivePrices(prev => {
            const next = { ...prev };
            for (const tick of ticks) {
              const sym = tick.symbol_name || tick.symbol;
              const ltp = tick.last_trade_price || tick.ltp;
              if (sym && ltp) next[sym] = parseFloat(ltp);
            }
            return next;
          });
        }
      } catch (_) { }
    };
    ws.onclose = () => clearInterval(pingId);
    ws.onerror = () => clearInterval(pingId);
  }

  async function fetchTrades() {
    try {
      const res = await axios.get('/api/trades');
      setTrades(res.data.trades || []);
    } catch (err) {
      console.error('Failed to fetch trades', err);
    }
  }

  function calcPNL(trade) {
    if (trade.status === 'CLOSED') return parseFloat(trade.pnl || 0);
    const ltp = livePrices[trade.symbol];
    if (!ltp) return 0;
    const entry = parseFloat(trade.entryPrice || 0);
    const qty = trade.qty || 1;
    const side = trade.side || 'BUY';
    return side === 'BUY' ? (ltp - entry) * qty : (entry - ltp) * qty;
  }

  const totalPNL = trades.reduce((sum, t) => sum + calcPNL(t), 0);
  const openCount = trades.filter(t => t.status === 'OPEN').length;

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4">
      {/* Header Summary Hub */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Activity size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Execution Hub</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Monitoring {openCount} Live Nodes</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Pool Size: {trades.length}</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 items-end">
          <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Net Realized / Unrealized P&L</p>
            <div className="flex items-center gap-3">
              <p className={`text-2xl font-black font-mono tracking-tighter ${totalPNL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ₹{totalPNL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <div className={`p-1 rounded-md ${totalPNL >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {totalPNL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            </div>
          </div>
          <button onClick={fetchTrades} className="p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-[#0A1128]">
            <RefreshCwIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Execution Table container */}
      <div className="bg-white border border-slate-100 shadow-2xl shadow-indigo-100/20 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy Logic</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrument</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Side</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Entry</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Live LTP</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Bounds</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net P&L</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trades.map((trade) => {
                const pnl = calcPNL(trade);
                const isProfit = pnl >= 0;
                const ltp = livePrices[trade.symbol];
                const entry = parseFloat(trade.entryPrice || 0);
                const isEditing = editItem?.id === trade._id;

                return (
                  <tr key={trade._id} className="hover:bg-indigo-50/20 transition-all group">
                    <td className="px-6 py-5 text-slate-500 text-[11px] font-mono font-bold">
                      {trade.createdAt ? new Date(trade.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#0A1128] tracking-tight">{trade.strategy_name || 'MANUAL_BRIDGE'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Instance: {trade._id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2">
                        <span className="text-white bg-[#0A1128] px-2 py-0.5 rounded text-[10px] font-black tracking-tighter">{trade.symbol}</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-widest uppercase italic shadow-sm">EQ</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border tracking-widest shadow-sm ${(trade.side || 'BUY') === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {trade.side || 'BUY'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-900 font-black text-[11px] font-mono">{trade.qty}</td>
                    <td className="px-6 py-5 font-mono text-slate-600 font-bold text-[11px]">
                      ₹{entry.toFixed(2)}
                    </td>
                    <td className="px-6 py-5 font-mono text-[11px]">
                      {trade.status === 'OPEN' && ltp ? (
                        <div className="flex flex-col">
                          <span className={`font-black animate-pulse ${ltp >= entry ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ₹{ltp.toFixed(2)}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Real-time Feed</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-black">---</span>
                      )}
                    </td>
                    {/* TP / SL Column */}
                    <td className="px-6 py-5">
                      {trade.status === 'OPEN' && isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1.5">
                            <input type="number" step="0.01" placeholder="Target"
                              className="w-24 px-2 py-1.5 text-[10px] font-black border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 bg-white shadow-inner"
                              value={editItem.tp} onChange={e => setEditItem({ ...editItem, tp: e.target.value })} />
                            <input type="number" step="0.01" placeholder="Stoploss"
                              className="w-24 px-2 py-1.5 text-[10px] font-black border border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white shadow-inner"
                              value={editItem.sl} onChange={e => setEditItem({ ...editItem, sl: e.target.value })} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button onClick={saveEdit}
                              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-[#0A1128] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditItem(null)}
                              className="p-2 bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col text-[10px] font-black min-w-[70px]">
                            <span className="text-emerald-500/80 border-l-2 border-emerald-500/20 pl-2 leading-none py-0.5">TARGET: ₹{trade.target || '--'}</span>
                            <span className="text-rose-500/80 border-l-2 border-rose-500/20 pl-2 leading-none py-0.5 mt-2">STOPL: ₹{trade.stopLoss || '--'}</span>
                          </div>
                          {trade.status === 'OPEN' && (
                            <button onClick={() => startEdit(trade)}
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white hover:border-slate-100 border border-transparent rounded-xl transition-all shadow-sm">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-5 text-right font-black text-xs font-mono tracking-tighter ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">{isProfit ? '+' : ''}₹{parseFloat(pnl).toFixed(2)}</span>
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full mt-1 ${isProfit ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                          {isProfit ? 'PROFITABLE' : 'LIQUIDITY_GAP'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {trade.status === 'OPEN' ? (
                          <button
                            onClick={() => closeTrade(trade)}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0A1128] transition-all active:scale-95 shadow-lg shadow-rose-100"
                            disabled={closingId === trade._id}
                          >
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>{closingId === trade._id ? 'Exiting...' : 'Force Exit'}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Lifecycle Closed
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="px-8 py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-slate-100" />
              </div>
              <h3 className="text-[#0A1128] font-black text-xl mb-2 tracking-tight">No Active Trades Data</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Connect to a logic engine to stream execution records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
