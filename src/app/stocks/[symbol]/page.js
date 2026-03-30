'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  ArrowLeft, Activity, Target, ShieldAlert,
  Settings2, Maximize2, RefreshCw, ChevronRight, Info, Zap, Layers, Edit3,
  Search, ZoomIn, ZoomOut, MousePointer2, Clock3
} from 'lucide-react';
import Link from 'next/link';

export default function AdvancedQuantChartPage({ params }) {
  const unwrappedParams = use(params);
  const rawSymbol = unwrappedParams.symbol?.toUpperCase();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get('strategyId');
  const router = useRouter();

  const symbol = useMemo(() => {
    const mapping = { 'SBI': 'SBIN', 'NIFTY': 'NIFTY50', 'BANKNIFTY': 'BANKNIFTY', 'M&M': 'M_M' };
    return mapping[rawSymbol] || rawSymbol;
  }, [rawSymbol]);

  const [strategy, setStrategy] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [viewData, setViewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestPrice, setLatestPrice] = useState(0);
  const [timeframe, setTimeframe] = useState('1m');
  const [zoomLevel, setZoomLevel] = useState(100); // number of candles to show

  useEffect(() => { if (symbol) fetchData(); }, [symbol, timeframe, strategy]);
  useEffect(() => { if (strategyId) fetchStrategy(); }, [strategyId]);

  // Handle Zooming logic
  useEffect(() => {
    if (rawData.length > 0) {
      setViewData(rawData.slice(-zoomLevel));
    }
  }, [rawData, zoomLevel]);

  async function fetchStrategy() {
    try {
      const res = await axios.get(`/api/strategy?id=${strategyId}`);
      if (res.data.strategy) setStrategy(res.data.strategy);
    } catch (err) {}
  }

  async function fetchData() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/stocks/candles?symbol=${symbol}&timeframe=${timeframe}`);
      let candles = res.data.candles || [];

      if (candles.length === 0) {
        const histRes = await axios.get(`/api/stocks/performance?symbol=${symbol}`);
        if (histRes.data?.resultData) {
          candles = histRes.data.resultData.map(d => ({
            time: new Date(d.created_at).getTime(),
            formattedTime: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: parseFloat(d.open), high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close),
            price: parseFloat(d.close)
          }));
        }
      } else {
        candles = candles.map(c => ({
          ...c, time: c.time * 1000,
          formattedTime: new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: c.close
        }));
      }

      const enriched = candles.map((c, i) => {
        const prices = candles.slice(0, i + 1).map(x => x.close);
        const item = { ...c };
        strategy?.indicators?.forEach(ind => {
            if (!ind || !ind.indicator) return;
            const key = `${ind.indicator.toLowerCase()}_${ind.period}`;
            if (ind.indicator === 'EMA') item[key] = calculateEMA(prices, ind.period);
            if (ind.indicator === 'SMA') item[key] = calculateSMA(prices, ind.period);
            if (ind.indicator === 'RSI') item.rsi = calculateRSI(prices, ind.period);
        });
        return item;
      });

      setRawData(enriched);
      if (enriched.length > 0) setLatestPrice(enriched[enriched.length - 1].close);
    } catch (err) {} finally { setLoading(false); }
  }

  const calculateSMA = (p, n) => p.length < n ? null : p.slice(-n).reduce((a, b) => a + b, 0) / n;
  const calculateEMA = (p, n) => {
    if (p.length < n) return null;
    const k = 2 / (n + 1);
    let ema = p.slice(0, n).reduce((a, b) => a + b, 0) / n;
    for (let i = n; i < p.length; i++) ema = p[i] * k + ema * (1 - k);
    return ema;
  };
  const calculateRSI = (p, n = 14) => {
    if (p.length < n + 1) return 50;
    let g = 0, l = 0;
    for (let i = 1; i <= n; i++) {
        const d = p[i] - p[i-1];
        if (d >= 0) g += d; else l -= d;
    }
    let ag = g/n, al = l/n;
    for (let i = n + 1; i < p.length; i++) {
        const d = p[i] - p[i-1];
        if (d >= 0) { ag = (ag*(n-1)+d)/n; al = (al*(n-1))/n; }
        else { ag = (ag*(n-1))/n; al = (al*(n-1)-d)/n; }
    }
    return al === 0 ? 100 : 100 - (100 / (1 + (ag / al)));
  };

  const TooltipUI = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A1128] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
            <Clock3 size={12} /> {payload[0].payload.formattedTime}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between gap-8 items-center">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Price</span>
                <span className="text-sm font-black text-white font-mono">₹{payload[0].value.toFixed(2)}</span>
            </div>
            {payload.map((p, idx) => {
               if (p.dataKey === 'price') return null;
               return (
                <div key={idx} className="flex justify-between gap-8 items-center">
                   <span className="text-[9px] text-slate-400 font-bold uppercase">{p.name || p.dataKey}</span>
                   <span className="text-[11px] font-black text-white font-mono" style={{ color: p.color }}>{p.value?.toFixed(2)}</span>
                </div>
               );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const adjustZoom = (delta) => {
    setZoomLevel(prev => {
        const next = prev + delta;
        return Math.max(20, Math.min(rawData.length, next));
    });
  };

  const hasRSI = strategy?.indicators?.some(i => i.indicator === 'RSI');

  return (
    <div className="space-y-6 pb-20 max-w-[1550px] mx-auto px-4">
      {/* Header Panel */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#0A1128] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-slate-50">
             {rawSymbol.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase leading-tight">{symbol}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
              </div>
            </div>
            <Link href="/strategies" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold text-[9px] uppercase tracking-widest mt-1 transition-all">
              <ArrowLeft size={10} /> Back to Hub
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <button onClick={() => router.push(`/strategies?edit=${strategyId}`)} className="flex items-center gap-2 px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-100/50">
              <Edit3 size={14} /> Adjust Algorithm
           </button>
           <div className="bg-[#0A1128] px-6 py-4 rounded-2xl text-white min-w-[200px] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
              <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1 relative z-10 flex items-center gap-2">
                 Asset LTP
              </p>
              <div className="flex items-baseline gap-2 relative z-10">
                 <span className="text-2xl font-black font-mono tracking-tighter">₹{latestPrice.toFixed(2)}</span>
                 <Zap size={14} className="text-emerald-400" />
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Chart Section */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative">
            
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
               <div className="flex items-center gap-6">
                  <div className="flex p-1 bg-slate-50 rounded-xl">
                    {['1m', '5m', '15m', '1h', '1d'].map(tf => (
                      <button 
                        key={tf} 
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${timeframe === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-6 bg-slate-100" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjustZoom(20)} className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white rounded-lg transition-all"><ZoomOut size={16} /></button>
                    <button onClick={() => adjustZoom(-20)} className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white rounded-lg transition-all"><ZoomIn size={16} /></button>
                  </div>
               </div>

               <div className="flex gap-2">
                  <button onClick={fetchData} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"><RefreshCw size={18} /></button>
                  <button className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Maximize2 size={18} /></button>
               </div>
            </div>

            {/* Price Chart */}
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={viewData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/></linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="formattedTime" hide />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 9, fill: '#64748b', fontWeight: 900, fontFamily: 'monospace'}} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<TooltipUI />} cursor={{ stroke: '#6366f1', strokeWidth: 1 }} />
                  
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={3} fill="url(#chartG)" dot={false} animate={false} />
                  
                  {strategy?.indicators?.map((ind, i) => {
                    if (!ind || !ind.indicator) return null;
                    const key = `${ind.indicator.toLowerCase()}_${ind.period}`;
                    if (ind.indicator === 'EMA' || ind.indicator === 'SMA') {
                        return (
                          <Line 
                            key={i} 
                            name={`${ind.indicator} (${ind.period})`}
                            type="monotone" 
                            dataKey={key} 
                            stroke={ind.indicator === 'EMA' ? '#3b82f6' : '#f43f5e'} 
                            strokeWidth={1.5} 
                            dot={false} 
                            strokeDasharray={ind.indicator === 'EMA' ? "5 5" : "0"} 
                            opacity={0.7} 
                            animate={false}
                          />
                        );
                    }
                    return null;
                  })}

                  {strategy?.target && (
                    <ReferenceLine y={strategy.target} stroke="#10b981" strokeWidth={2} strokeDasharray="8 8" label={{ position: 'right', value: 'TARGET (TP)', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                  )}
                  {strategy?.stopLoss && (
                    <ReferenceLine y={strategy.stopLoss} stroke="#ef4444" strokeWidth={2} strokeDasharray="8 8" label={{ position: 'right', value: 'STOPLOSS (SL)', fill: '#ef4444', fontSize: 9, fontWeight: 900 }} />
                  )}
                  {strategy?.entryCondition?.level && (
                    <ReferenceLine y={strategy.entryCondition.level} stroke="#0A1128" strokeWidth={1} strokeDasharray="2 2" label={{ position: 'left', value: 'ENTRY TRIGGER', fill: '#0A1128', fontSize: 8, fontWeight: 900 }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RSI / Momentum Section */}
          {hasRSI && (
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm h-[200px] group overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14} className="text-amber-500" /> Sentiment & Momentum Matrix</p>
                  <p className="text-[10px] font-black text-amber-600 uppercase font-mono">RSI 14</p>
               </div>
               <div className="h-[100px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={viewData}>
                     <YAxis domain={[0, 100]} hide />
                     <ReferenceLine y={70} stroke="#fcd34d" strokeDasharray="3 3" />
                     <ReferenceLine y={30} stroke="#fcd34d" strokeDasharray="3 3" />
                     <Area type="monotone" dataKey="rsi" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} dot={false} fillOpacity={0.2} />
                   </ComposedChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Space */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Config Card */}
          <div className="bg-[#0A1128] p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-700">
                <Target size={120} />
             </div>
             
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><Settings2 size={16} /></div>
                   <h4 className="text-[12px] font-black uppercase">Configuration</h4>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-emerald-500/10 transition-colors">
                   <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Target (TP)</p>
                   <p className="text-lg font-black text-emerald-400 font-mono tracking-tighter">₹{strategy?.target || '--'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-rose-500/10 transition-colors">
                   <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Stoploss (SL)</p>
                   <p className="text-lg font-black text-rose-400 font-mono tracking-tighter">₹{strategy?.stopLoss || '--'}</p>
                </div>
             </div>

             <div className="bg-white/5 p-5 rounded-[24px] border border-white/5 mb-6 relative z-10">
                <div className="flex justify-between items-center mb-1">
                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{strategy?.entryCondition?.type?.replace('_', ' ')}</p>
                   <MousePointer2 size={10} className="text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-2xl font-black font-mono tracking-tighter text-white">₹{strategy?.entryCondition?.level || '--'}</span>
                   <Zap size={14} className="text-amber-500" />
                </div>
             </div>

             <button onClick={() => router.push(`/strategies?edit=${strategyId}`)} className="w-full py-4 bg-indigo-600 hover:bg-white hover:text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/50 active:scale-95 relative z-10">Update Parameters</button>
          </div>

          {/* Indicators Matrix */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-indigo-400 transition-colors">Active Matrix</h4>
                <Layers size={14} className="text-slate-300" />
             </div>
             <div className="space-y-3">
                {strategy?.indicators?.map((ind, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 group/item hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white text-indigo-500 rounded-lg flex items-center justify-center text-[9px] font-black shadow-sm group-hover/item:scale-110 transition-transform">{ind.indicator?.substring(0, 3)}</div>
                           <div>
                              <span className="block text-xs font-black text-[#0A1128] uppercase">{ind.indicator}</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Period: {ind.period}</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{ind.compare}</span>
                           <span className="text-[10px] font-black text-indigo-600 font-mono tracking-tighter">{ind.value}</span>
                        </div>
                    </div>
                ))}
                {(!strategy?.indicators || strategy.indicators.length === 0) && (
                    <div className="text-center py-6">
                       <Zap size={24} className="mx-auto text-slate-100 mb-2" />
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">No Logic Overlays</p>
                    </div>
                )}
             </div>
          </div>

          <div className="p-4 text-center">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Quant Execution Hub v4.3.2<br/>Connection Stable // 12ms Latency</p>
          </div>

        </div>
      </div>
    </div>
  );
}
