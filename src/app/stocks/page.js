'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Search, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, RefreshCwIcon, LineChart as LineChartIcon } from 'lucide-react';

export default function StocksPage() {
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // 1 minute refresh
    return () => clearInterval(interval);
  }, []);

  async function fetchStocks() {
    setLoading(true);
    try {
      const res = await axios.get('/api/stocks');
      if (Array.isArray(res.data)) {
        setStocks(res.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock list', err);
      setLoading(false);
    }
  }

  const filteredStocks = stocks.filter(s =>
    s.symbol_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4">
      {/* Search & Statistics Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Search size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Market Radar</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Scanning {stocks.length} Global Assets</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Pool: EQ / NSE CASH</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 items-end">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="PRO-FILTER SYMBOL..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-indigo-500 w-80 transition-all shadow-inner placeholder:text-slate-300"
            />
          </div>
          <button
            onClick={() => { setLoading(true); fetchStocks(); }}
            className={`p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-[#0A1128] ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCwIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Institutional Table */}
      <div className="bg-white border border-slate-100 shadow-2xl shadow-indigo-100/20 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Intraday Delta</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Day Bounds (H/L)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume (Lac)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trend Sigma</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Deep Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStocks.map((stock) => {
                const isBullish = stock.change_percent >= 0;
                return (
                  <tr key={stock.symbol_name} className="hover:bg-indigo-50/20 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[#0A1128] tracking-tight">{stock.symbol_name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">CASH_MARKET</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-[13px] font-black text-[#0A1128]">
                      ₹{parseFloat(stock.last_trade_price || stock.today_close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <div className={`text-xs font-black flex items-center gap-1.5 ${isBullish ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isBullish ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isBullish ? '+' : ''}{stock.change_percent}%
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">₹{parseFloat(stock.change_value).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end text-[10px] font-black min-w-[100px]">
                        <span className="text-emerald-500/80 border-r-2 border-emerald-500/20 pr-2 leading-none py-0.5">HI: ₹{stock.today_high}</span>
                        <span className="text-rose-500/80 border-r-2 border-rose-500/20 pr-2 leading-none py-0.5 mt-2">LO: ₹{stock.today_low}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-xs font-black text-slate-600 font-mono">{(stock.today_volume / 100000).toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex justify-center">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.1em] uppercase border flex items-center gap-2 ${isBullish ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-50'}`}>
                          {isBullish && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {!isBullish && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                          {isBullish ? 'BULL-FLOW' : 'BEAR-PRESSURE'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end">
                        <Link
                          href={`/stocks/${stock.symbol_name.toLowerCase()}`}
                          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#0A1128] text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md group border border-[#0A1128]"
                        >
                          <LineChartIcon size={14} className="group-hover:rotate-12 transition-transform" />
                          Performance
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && (
            <div className="px-8 py-32 text-center animate-pulse">
              <div className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs">Calibrating Signal Scanners...</div>
            </div>
          )}
          {filteredStocks.length === 0 && !loading && (
            <div className="px-8 py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-100" />
              </div>
              <h3 className="text-[#0A1128] font-black text-xl mb-2 tracking-tight">No Tickers Found</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Adjust your filters to scan more market segments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
