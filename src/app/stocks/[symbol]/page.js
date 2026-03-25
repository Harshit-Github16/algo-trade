'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Clock, Activity, BarChart3, 
  Calendar, Layers, MoveUpRight, MoveDownRight 
} from 'lucide-react';
import Link from 'next/link';

export default function StockPerformancePage({ params }) {
  const unwrappedParams = use(params);
  const symbol = unwrappedParams.symbol?.toUpperCase();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchHistoricalData();
    }
  }, [symbol]);

  async function fetchHistoricalData() {
    setLoading(true);
    try {
      // Use local proxy to avoid CORS
      const res = await axios.get(`/api/stocks/performance?symbol=${symbol.toLowerCase()}`);
      if (res.data?.resultData) {
        const sortedData = res.data.resultData
          .map(d => ({
            ...d,
            date: new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            price: parseFloat(d.close),
          }))
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        setData(sortedData);
      } else {
        setError('No historical data found for this symbol.');
      }
    } catch (err) {
      console.error('Failed to fetch historical data', err);
      setError('Failed to fetch data from server. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const latest = data[data.length - 1];
  const first = data[0];
  const change = latest && first ? latest.price - first.price : 0;
  const changePerc = latest && first ? (change / first.price) * 100 : 0;
  const isPositive = change >= 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Performance Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Activity size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <Link href="/stocks" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A1128] text-white rounded-xl font-bold hover:gap-3 transition-all">
          <ArrowLeft size={18} /> Back to Stocks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <BarChart3 size={200} />
        </div>
        
        <div className="relative z-10">
          <Link href="/stocks" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest mb-6 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Assets
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0A1128] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
               {symbol.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#0A1128] tracking-tight flex items-center gap-3">
                {symbol}
                <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest font-black">NSE</span>
              </h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Performance Overview (Last 30 Days)</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <div className={`p-4 rounded-3xl border ${isPositive ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} min-w-[140px]`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Price</p>
            <p className="text-2xl font-black text-slate-900 font-mono">₹{latest?.price.toFixed(2)}</p>
          </div>
          <div className={`p-4 rounded-3xl border ${isPositive ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600' : 'bg-rose-50/50 border-rose-100 text-rose-500'} min-w-[140px]`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Return</p>
            <div className="flex items-center gap-1">
              {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              <p className="text-2xl font-black font-mono">{isPositive ? '+' : ''}{changePerc.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:border-indigo-100 transition-all">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={18} /></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">High (30d)</p><p className="text-sm font-black text-slate-900">₹{Math.max(...data.map(d => d.high)).toFixed(2)}</p></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:border-indigo-100 transition-all">
            <div className="w-10 h-10 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Activity size={18} /></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Low (30d)</p><p className="text-sm font-black text-slate-900">₹{Math.min(...data.map(d => d.low)).toFixed(2)}</p></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:border-indigo-100 transition-all">
            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Layers size={18} /></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Volume</p><p className="text-sm font-black text-slate-900">{(data.reduce((a,b) => a+b.volume, 0)/data.length/100000).toFixed(2)} L</p></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:border-indigo-100 transition-all">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Calendar size={18} /></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duration</p><p className="text-sm font-black text-slate-900">30 Trading Days</p></div>
         </div>
      </div>

      {/* Chart Holder */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Historical Price Action</h3>
           </div>
           <div className="flex gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-3 py-1.5 bg-slate-50 rounded-lg">
                 <div className="w-2 h-2 rounded-full bg-indigo-500" />
                 Closing Price
              </div>
           </div>
        </div>

        <div className="h-[450px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10B981' : '#6366F1'} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={isPositive ? '#10B981' : '#6366F1'} stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 600}} 
                axisLine={false} 
                tickLine={false} 
                dy={10}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 600}} 
                axisLine={false} 
                tickLine={false} 
                dx={-10}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                  padding: '12px 16px',
                  backgroundColor: '#0A1128',
                  color: 'white'
                }}
                itemStyle={{ color: '#818CF8', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                labelStyle={{ color: '#94A3B8', fontWeight: 700, marginBottom: '4px', fontSize: '12px' }}
                cursor={{ stroke: '#6366F1', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? '#10B981' : '#6366F1'} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Volatility Analysis</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                 The asset {symbol} has shown a volatility of {((Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low))) / latest?.price * 100).toFixed(2)}% 
                 over the last 30 trading days. The price range fluctuated between ₹{Math.min(...data.map(d => d.low)).toFixed(2)} 
                 and ₹{Math.max(...data.map(d => d.high)).toFixed(2)}.
              </p>
           </div>
           <div className="flex justify-end gap-3">
              <button className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Export Data CSV</button>
              <button className="px-6 py-3 bg-[#0A1128] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-indigo-100 transition-all">Create Strategy For {symbol}</button>
           </div>
        </div>
      </div>
    </div>
  );
}
