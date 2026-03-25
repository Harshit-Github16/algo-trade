'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Activity, Building2, Play, TrendingUp, 
  Settings, Zap, ShieldCheck, PieChart, BarChart3, Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Terminal', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market Watch', href: '/stocks', icon: TrendingUp },
  { name: 'Algo Architect', href: '/strategies', icon: Play },
  { name: 'Execution Hub', href: '/trades', icon: Activity },
  { name: 'Brokerage', href: '/brokers', icon: Building2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 z-50">
      {/* Branding */}
      <div className="flex items-center px-6 h-16 border-b border-slate-50">
        <div className="w-8 h-8 bg-[#0A1128] rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-100">
           <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <span className="text-lg font-black text-[#0A1128] tracking-tighter leading-none block italic">ALGOPRO</span>
          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 block">Trading Systems</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Market Status Card */}
        <div className="mx-4 mt-6 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
           <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">NSE STATUS</span>
              <div className="flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-widest">LIVE</span>
              </div>
           </div>
           <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center text-slate-900 font-mono text-xs font-bold">
                 <Clock className="w-3 h-3 mr-1.5 text-indigo-500" />
                 {time}
              </div>
              <div className="text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">09:15 - 15:30</div>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-5 mb-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Platform Core</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-xs font-bold rounded-xl transition-all relative group ${
                  isActive 
                    ? 'bg-[#0A1128] text-white shadow-xl shadow-indigo-100' 
                    : 'text-slate-500 hover:text-[#0A1128] hover:bg-slate-50/80'
                }`}
              >
                {isActive && <div className="absolute left-[-12px] w-2 h-6 bg-[#0A1128] rounded-r-full" />}
                <item.icon className={`w-4 h-4 mr-3.5 transition-all ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                <span className="tracking-tight">{item.name}</span>
                {item.name === 'Execution Hub' && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500 animate-ping group-hover:animate-none" />
                )}
              </Link>
            )
          })}

          <p className="px-5 mb-2 mt-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Insights</p>
          <Link
            href="/reports"
            className={`flex items-center px-4 py-3 text-xs font-bold rounded-xl transition-all relative group ${
              pathname === '/reports' 
                ? 'bg-[#0A1128] text-white shadow-xl shadow-indigo-100' 
                : 'text-slate-500 hover:text-[#0A1128] hover:bg-slate-50/80'
            }`}
          >
             <BarChart3 className={`w-4 h-4 mr-3.5 transition-all ${pathname === '/reports' ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
             <span>Report Center</span>
          </Link>
          <Link
            href="/portfolio"
            className={`flex items-center px-4 py-3 text-xs font-bold rounded-xl transition-all relative group ${
              pathname === '/portfolio' 
                ? 'bg-[#0A1128] text-white shadow-xl shadow-indigo-100' 
                : 'text-slate-500 hover:text-[#0A1128] hover:bg-slate-50/80'
            }`}
          >
             <PieChart className={`w-4 h-4 mr-3.5 transition-all ${pathname === '/portfolio' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
             <span>Portfolio Hub</span>
          </Link>
        </nav>

        {/* User / Settings at bottom */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
           <button className="flex items-center w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all group shadow-sm">
              <Zap className="w-4 h-4 mr-2.5 text-yellow-500 fill-yellow-500 group-hover:scale-110 transition-transform" />
              Quick Strategy
           </button>
        </div>
      </div>
    </div>
  );
}
