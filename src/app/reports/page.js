'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, TrendingUp, TrendingDown, 
  Calendar, PieChart, Target, Zap, 
  ArrowRight, Download, Filter, Search 
} from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    totalGain: 0,
    maxReturn: 0,
    winRate: 0,
    totalTrades: 0,
    breakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await axios.get('/api/trades');
        const trades = res.data.trades || [];
        
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        const profitTrades = closedTrades.filter(t => parseFloat(t.pnl) > 0);
        
        const totalGain = closedTrades.reduce((acc, t) => acc + parseFloat(t.pnl || 0), 0);
        const winRate = closedTrades.length > 0 ? (profitTrades.length / closedTrades.length) * 100 : 0;
        const maxReturn = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => parseFloat(t.pnl || 0))) : 0;

        // Group by strategy
        const strategyMap = {};
        closedTrades.forEach(t => {
          const name = t.strategy_name || 'MANUAL_HUB';
          if (!strategyMap[name]) strategyMap[name] = { name, pnl: 0, count: 0 };
          strategyMap[name].pnl += parseFloat(t.pnl || 0);
          strategyMap[name].count += 1;
        });

        setReportData({
          totalGain,
          maxReturn,
          winRate,
          totalTrades: closedTrades.length,
          breakdown: Object.values(strategyMap).sort((a,b) => b.pnl - a.pnl)
        });
      } catch (err) {
        console.error('Report fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4 animate-in fade-in duration-700">
      {/* Analytics Header Hub */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
           <BarChart3 size={220} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Report Center</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Data Matrix Synced</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Last 90 Days Performance</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 items-end">
           <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Download size={16} /> Export Analysis
           </button>
           <button className="flex items-center gap-2 px-8 py-4 bg-[#0A1128] text-white hover:bg-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">
              <Filter size={18} />
              <span>Filter Period</span>
           </button>
        </div>
      </div>

      {/* Metric Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <MetricNode label="Absolute Profit" value={`₹${reportData.totalGain.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`} sub={reportData.totalGain >= 0 ? 'Surplus Session' : 'Liquidity Deficit'} icon={TrendingUp} variant={reportData.totalGain >= 0 ? 'emerald' : 'rose'} />
         <MetricNode label="Efficiency Score" value={`${reportData.winRate.toFixed(1)}%`} sub={`${reportData.totalTrades} Closed Trades`} icon={Target} variant="indigo" />
         <MetricNode label="Peak Instance" value={`₹${reportData.maxReturn.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`} sub="Best Strategy Node" icon={Zap} variant="amber" />
         <MetricNode label="Cycle Health" value="OPTIMAL" sub="System Sync Matrix" icon={Activity} variant="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
         {/* Performance Breakdown */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-sm font-black text-[#0A1128] uppercase tracking-[0.2em] flex items-center gap-2">
                  <PieChart size={16} className="text-indigo-500" /> node Performance breakdown
               </h3>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sort: Highest Impact</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
               <div className="p-8 pb-4">
                 <div className="grid grid-cols-12 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4 px-2">
                    <div className="col-span-6">Strategy Node Identifier</div>
                    <div className="col-span-3 text-center">Executions</div>
                    <div className="col-span-3 text-right">Net Impact (₹)</div>
                 </div>
               </div>
               <div className="divide-y divide-slate-50">
                  {reportData.breakdown.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 items-center p-8 hover:bg-slate-50 transition-all group">
                       <div className="col-span-6 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[10px] ${item.pnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                             {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-black text-[#0A1128] tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic">{item.name}</span>
                             <span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-widest">PROTOCOL_V3 // ACTIVE</span>
                          </div>
                       </div>
                       <div className="col-span-3 text-center">
                          <span className="text-[11px] font-black text-slate-900 font-mono tracking-tighter">{item.count}</span>
                       </div>
                       <div className="col-span-3 text-right">
                          <span className={`text-xs font-black font-mono tracking-tighter ${item.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {item.pnl >= 0 ? '+' : ''}₹{item.pnl.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                          </span>
                       </div>
                    </div>
                  ))}

                  {reportData.breakdown.length === 0 && (
                     <div className="py-20 text-center opacity-30">
                        <BarChart3 size={40} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No closed trades analyzed for this period.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Insights Sidebar */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-black text-[#0A1128] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
               <Zap size={16} className="text-amber-500" /> AI Quant insights
            </h3>
            
            <div className="bg-[#0A1128] p-8 rounded-[40px] text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                  <Activity size={100} />
               </div>
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1] animate-pulse" />
                     Alpha Optimization Engine
                  </p>
                  <p className="text-xs font-bold leading-relaxed text-slate-300 mb-8 italic">
                     "Your current win rate of {reportData.winRate.toFixed(1)}% is optimal for current market volatility. Suggest tightening stop-loss nodes on high-alpha strategies to preserve session equity."
                  </p>
                  <button className="w-full py-4 bg-indigo-500 hover:bg-white hover:text-[#0A1128] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-3 active:scale-95">
                     Tweak Matrix Protocols
                     <ArrowRight size={14} />
                  </button>
               </div>
            </div>

            <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
               <p className="text-[9px] font-black text-[#0A1128] uppercase tracking-[0.2em] mb-4">Risk Exposure Node</p>
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black">
                     <span className="text-slate-400 tracking-widest uppercase">System Stress</span>
                     <span className="text-emerald-500 tracking-tighter uppercase">LOW_VAL</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                     <div className="w-[15%] h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-300 uppercase italic tracking-widest">Calculated across 8 active asset nodes.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function MetricNode({ label, value, sub, icon: Icon, variant = 'slate' }) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-50',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50',
    slate: 'bg-slate-50 text-slate-600 border-slate-100 shadow-slate-50'
  };

  return (
    <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-2xl hover:shadow-indigo-50/50 transition-all group overflow-hidden relative">
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${styles[variant]} border`}>
          <Icon size={24} />
       </div>
       <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <p className="text-2xl font-black text-[#0A1128] tracking-tighter mt-1 font-mono uppercase">{value}</p>
          <div className="flex items-center gap-2 mt-2">
             <div className={`w-1 h-1 rounded-full ${variant === 'emerald' ? 'bg-emerald-500' : variant === 'rose' ? 'bg-rose-500' : 'bg-slate-300'}`} />
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">{sub}</p>
          </div>
       </div>
       <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
          <Icon size={120} />
       </div>
    </div>
  );
}

function Activity({ size }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
