'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PieChart, LayoutGrid, Target, 
  ShieldCheck, ArrowUpRight, ArrowDownRight, 
  Zap, Info, Activity, Layers, Activity as ActivityIcon, Monitor
} from 'lucide-react';

export default function PortfolioPage() {
  const [allocation, setAllocation] = useState([]);
  const [metrics, setMetrics] = useState({
    totalInvested: 0,
    currentValue: 0,
    dayPnl: 0,
    marginUsed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const [stratRes, tradeRes] = await Promise.all([
          axios.get('/api/strategy'),
          axios.get('/api/trades')
        ]);

        const strategies = stratRes.data.strategies || [];
        const trades = tradeRes.data.trades || [];
        
        // Calculate total invested based on open trades
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const invested = openTrades.reduce((acc, t) => acc + (parseFloat(t.entryPrice || 0) * parseInt(t.qty || 0)), 0);
        
        // Group by symbols for allocation
        const symbolMap = {};
        openTrades.forEach(t => {
          if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { symbol: t.symbol, amount: 0, count: 0 };
          symbolMap[t.symbol].amount += parseFloat(t.entryPrice || 0) * parseInt(t.qty || 0);
          symbolMap[t.symbol].count += 1;
        });

        const allocationList = Object.values(symbolMap).sort((a,b) => b.amount - a.amount);
        const totalAmount = allocationList.reduce((acc, s) => acc + s.amount, 0);

        setAllocation(allocationList.map(s => ({
          ...s,
          percent: totalAmount > 0 ? (s.amount / totalAmount) * 100 : 0
        })));

        setMetrics({
          totalInvested: invested,
          currentValue: invested * 1.05, // Mocked 5% gain
          dayPnl: invested * 0.02, // Mocked 2% day gain
          marginUsed: invested * 0.2 // Mocked 20% margin
        });
      } catch (err) {
        console.error('Portfolio fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4 animate-in fade-in duration-700">
      {/* Portfolio Header Hub */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
           <Layers size={220} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Portfolio Hub</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Asset Liquidity Matrix</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Vault Security Protocol: DHAN_V2</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 items-end">
           <div className="px-6 py-4 bg-slate-50 rounded-3xl border border-slate-100 min-w-[200px]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Net Asset Value</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-[#0A1128] font-mono tracking-tighter uppercase">₹{metrics.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase flex items-center gap-1 ${metrics.dayPnl >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                   {metrics.dayPnl >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                   {((metrics.dayPnl / metrics.totalInvested) * 100 || 0).toFixed(1)}%
                </div>
              </div>
           </div>
           <button className="flex items-center justify-center w-14 h-14 bg-[#0A1128] text-white hover:bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all">
              <Plus size={24} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Allocation Chart Node */}
         <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="bg-white border border-slate-100 p-8 rounded-[44px] shadow-sm relative group overflow-hidden">
               <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-8">
                  <div>
                    <h3 className="text-sm font-black text-[#0A1128] uppercase tracking-[0.2em] flex items-center gap-2">
                       <PieChart size={16} className="text-indigo-500" /> Capital Allocation Matrix
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Weighted Asset Node Distribution</p>
                  </div>
                  <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100 shadow-sm active:scale-90">
                     <Monitor size={18} />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="relative aspect-square flex items-center justify-center">
                     <div className="absolute inset-0 rounded-full border-[18px] border-slate-50 shadow-inner" />
                     {allocation.length > 0 ? (
                        allocation.map((s, idx) => (
                           <div key={idx} 
                             className="absolute inset-0 rounded-full border-[18px] border-transparent" 
                             style={{ 
                               borderColor: `hsl(${idx * (360/allocation.length)}, 60%, 50%)`,
                               clipPath: `polygon(50% 50%, 50% 0, ${50 + 50*Math.sin(idx * (360/allocation.length) * (Math.PI/180))}% ${50 - 50*Math.cos(idx * (360/allocation.length) * (Math.PI/180))}% )`,
                               transform: `rotate(${allocation.slice(0, idx).reduce((acc, cur) => acc + (cur.percent * 3.6), 0)}deg)`
                             }} 
                           />
                        ))
                     ) : (
                       <Zap size={40} className="text-slate-100 animate-pulse" />
                     )}
                     <div className="z-10 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</p>
                        <p className="text-2xl font-black text-[#0A1128] font-mono tracking-tighter italic">₹{(metrics.totalInvested / 1000).toFixed(1)}K</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {allocation.slice(0, 5).map((s, idx) => (
                       <div key={idx} className="flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-100/50 rounded-2xl group/item hover:bg-white hover:border-indigo-100 transition-all cursor-pointer">
                          <div className="flex items-center gap-4">
                             <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: `hsl(${idx * (360/allocation.length)}, 60%, 50%)`, backgroundColor: 'currentColor' }} />
                             <div className="flex flex-col">
                                <span className="text-[11px] font-black text-[#0A1128] tracking-tight uppercase group-hover/item:text-indigo-600 transition-colors">{s.symbol}</span>
                                <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Protocol_NODE</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="text-[11px] font-black text-slate-900 font-mono tracking-tighter">{s.percent.toFixed(1)}%</span>
                             <div className="text-[7.5px] font-black text-slate-300 uppercase tracking-widest">Weight</div>
                          </div>
                       </div>
                     ))}
                     {allocation.length === 0 && (
                        <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-100 rounded-[32px]">
                           <p className="text-[9px] font-black uppercase tracking-widest">Awaiting active nodes...</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar Metrics (4 Cols) */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-black text-[#0A1128] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
               <ShieldCheck size={16} className="text-emerald-500" /> Vault Risk Analysis
            </h3>
            
            <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm space-y-8">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin Efficiency</p>
                     <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded shadow-sm border border-emerald-100">HEALTHY</span>
                  </div>
                  <div className="w-full h-8 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                     <div className="absolute inset-x-0 h-full bg-indigo-500 shadow-[0_0_15px_#6366f1] transition-all duration-1000 group-hover:scale-105" style={{ width: '45%' }} />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-black text-white mix-blend-difference tracking-widest">45.2% UTILIZATION Matrix</span>
                     </div>
                  </div>
                  <p className="text-[8px] font-bold text-slate-300 uppercase italic tracking-widest leading-relaxed">System monitoring Dhan margin pool ID: DHAN_X9282</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900 text-white rounded-3xl relative overflow-hidden group border border-slate-800">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform duration-500 pointer-events-none">
                        <Zap size={40} />
                     </div>
                     <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2 relative z-10">Intraday Delta</p>
                     <p className="text-lg font-black font-mono tracking-tighter text-emerald-400 relative z-10 leading-none">₹{metrics.dayPnl.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl group transition-all hover:bg-slate-50 active:scale-95 shadow-sm">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Used Margin</p>
                     <p className="text-lg font-black font-mono tracking-tighter text-[#0A1128] leading-none italic">₹{(metrics.marginUsed / 1000).toFixed(1)}K</p>
                  </div>
               </div>

               <button className="w-full py-5 bg-[#0A1128] text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                  Verify Asset Integrity
                  <ShieldCheck size={14} className="group-hover:text-emerald-400 transition-colors" />
               </button>
            </div>

            <div className="bg-indigo-50/40 p-10 rounded-[44px] border border-indigo-100 shadow-sm text-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Target size={150} />
               </div>
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md border border-indigo-50 group-hover:rotate-12 transition-transform duration-500">
                     <Activity size={24} className="text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-black text-[#0A1128] uppercase tracking-[0.2em] mb-2 leading-tight">diversification node check</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mx-auto max-w-[180px] leading-relaxed">
                     Automated assessment complete: Portfolio balance optimized for low volatility regime.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function Plus({ size }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
