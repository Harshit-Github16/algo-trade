'use client';

import { usePathname } from 'next/navigation';
import { 
  User, Bell, Search, Globe, ChevronDown, 
  Terminal, ShieldCheck, Cpu, Wifi
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === '/') return 'Terminal Overview';
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || 'Dashboard';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center flex-1">
        <div className="flex items-center gap-3">
           <div className="flex flex-col">
              <h1 className="text-sm font-black text-[#0A1128] tracking-tight truncate max-w-[200px]">
                {getTitle()}
              </h1>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mainframe Network</span>
              </div>
           </div>
        </div>

        <div className="hidden xl:flex items-center gap-6 ml-12 border-l border-slate-100 pl-12">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NIFTY 50</span>
               <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black font-mono text-slate-900">24,512.45</span>
                  <span className="text-[9px] font-black text-emerald-500">+1.24%</span>
               </div>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BANK NIFTY</span>
               <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black font-mono text-slate-900">52,480.10</span>
                  <span className="text-[9px] font-black text-rose-500">-0.12%</span>
               </div>
            </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden lg:block">
          <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Command Search..."
            className="pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none w-56 focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
          <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative group">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
          </button>
          
          <div className="flex items-center gap-4 pl-2">
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-[#0A1128]">PRO TERMINAL</span>
                  <ShieldCheck className="w-3 h-3 text-indigo-500 fill-indigo-50" />
               </div>
               <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">System Heat: Optimal</span>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 cursor-pointer hover:bg-indigo-600 hover:text-white transition-all ring-4 ring-slate-50 border border-white">
              <User size={18} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
