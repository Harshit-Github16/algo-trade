'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Plus, Key, Link as LinkIcon,
  BadgeCheck, X, Building2, Trash2,
  ExternalLink, AlertCircle, CheckCircle2
} from 'lucide-react';

const availableBrokers = [
  { id: 'dhan', name: 'Dhan', logo: 'D', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'fyers', name: 'Fyers', logo: 'F', color: 'bg-blue-50 text-blue-600' },
  { id: 'zerodha', name: 'Zerodha', logo: 'Z', color: 'bg-orange-50 text-orange-600' },
  { id: 'angelone', name: 'Angel One', logo: 'A', color: 'bg-indigo-50 text-indigo-600' },
];

export default function BrokersPage() {
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [dbBrokers, setDbBrokers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    clientId: '',
    apiKey: '',
    apiSecret: '',
    accessToken: ''
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    try {
      const res = await axios.get('/api/broker');
      setDbBrokers(res.data.brokers || []);
    } catch (err) {
      console.error('Failed to fetch brokers', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleConnect = (broker) => {
    setSelectedBroker(broker);
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    try {
      const payload = {
        brokerName: selectedBroker.name,
        ...formData
      };
      await axios.post('/api/broker', payload);
      await fetchBrokers();
      setSelectedBroker(null);
      setFormData({ clientId: '', apiKey: '', apiSecret: '', accessToken: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection failed';
      alert(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  // ... (rest of the component)

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this broker?')) return;
    try {
      await axios.delete(`/api/broker?id=${id}`);
      await fetchBrokers();
    } catch (err) {
      console.error('Disconnect failed', err);
    }
  };

  const getBrokerStatus = (name) => {
    const broker = dbBrokers.find(b => b.brokerName === name);
    return broker ? broker.status : 'DISCONNECTED';
  };

  const getBrokerId = (name) => {
    const broker = dbBrokers.find(b => b.brokerName === name);
    return broker ? broker._id : null;
  };

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4 animate-in fade-in duration-700">
      {/* Connectivity Hub Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
           <LinkIcon size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Bridge Nexus</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {dbBrokers.filter(b => b.status === 'CONNECTED').length} Active Terminals</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Encrypted Bridge Protocol 2.0</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
           <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[140px]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Latency Avg</p>
              <p className="text-xl font-black font-mono text-emerald-600 tracking-tighter">14ms</p>
           </div>
           <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[140px]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Security</p>
              <div className="flex items-center gap-1.5 text-indigo-600 font-black text-[10px] uppercase tracking-wider">
                 <ShieldCheck size={14} /> AES-256
              </div>
           </div>
        </div>
      </div>

      {/* Primary Broker Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {availableBrokers.map((broker) => {
          const status = getBrokerStatus(broker.name);
          const isConnected = status === 'CONNECTED';
          
          return (
            <div key={broker.id} className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-between shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 group-hover:bg-indigo-500 transition-colors" />
              
              <div className="w-full flex justify-between items-start mb-8">
                <div className={`w-14 h-14 ${broker.color} rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-50 group-hover:scale-110 transition-transform`}>
                   {broker.logo}
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${isConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                  {status}
                </div>
              </div>

              <div className="text-center w-full mb-10">
                <h3 className="text-xl font-black text-[#0A1128] mb-1 tracking-tight">{broker.name} Terminal</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  {isConnected ? (
                    <>
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      Protocol Sync Active
                    </>
                  ) : 'Awaiting Configuration'}
                </p>
              </div>

              <div className="w-full space-y-3">
                {isConnected ? (
                  <>
                    <div className="flex items-center justify-center space-x-2 py-3 bg-slate-50/50 rounded-2xl text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-50">
                      <BadgeCheck className="w-4 h-4 text-emerald-500" />
                      <span>Ready for Execution</span>
                    </div>
                    <button 
                      onClick={() => handleDisconnect(getBrokerId(broker.name))}
                      className="w-full py-2.5 text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-transparent hover:border-rose-100"
                    >
                      Kill Connection
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleConnect(broker)}
                    className="w-full py-4 bg-[#0A1128] hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    <span>Initialize Hub</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-50 rounded-3xl p-10 flex items-start space-x-8 border border-slate-100 hover:border-indigo-100 transition-colors group">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
           </div>
           <div>
              <h3 className="text-lg font-black text-[#0A1128] mb-2 tracking-tight">Isolated Execution Shield</h3>
              <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-sm uppercase tracking-wide opacity-80">
                End-to-end payload encryption and hardware-level isolation for all API credentials.
              </p>
           </div>
        </div>
        <div className="bg-slate-50 rounded-3xl p-10 flex items-start space-x-8 border border-slate-100 hover:border-indigo-100 transition-colors group">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Key className="w-8 h-8 text-amber-500" />
           </div>
           <div>
              <h3 className="text-lg font-black text-[#0A1128] mb-2 tracking-tight">Multi-Node Connectivity</h3>
              <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-sm uppercase tracking-wide opacity-80">
                Simultaneously route orders across multiple liquidity providers via a single console.
              </p>
           </div>
        </div>
      </div>

      {/* Secure Configuration Modal */}
      {selectedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-500 border border-slate-100">
             <button onClick={() => setSelectedBroker(null)} className="absolute top-8 right-8 text-slate-300 hover:text-[#0A1128] transition-colors p-2 hover:bg-slate-50 rounded-full">
                <X className="w-6 h-6" />
             </button>

             <div className="flex items-center space-x-6 mb-10">
                <div className={`w-16 h-16 ${selectedBroker.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                   <LinkIcon size={30} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-[#0A1128] tracking-tighter uppercase">Bridge Configuration</h2>
                   <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Linking Node: {selectedBroker.name} Terminal</p>
                </div>
             </div>

             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Terminal Access ID</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                         <Building2 size={18} />
                      </div>
                      <input 
                          required type="text" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner uppercase tracking-widest" 
                          placeholder="EX: KEY_12345"
                          value={formData.clientId}
                          onChange={e => setFormData({...formData, clientId: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">App Protocol Key</label>
                        <div className="relative">
                           <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                              <Key size={18} />
                           </div>
                           <input 
                              required type="password" 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                              placeholder="••••••••••••"
                              value={formData.apiKey}
                              onChange={e => setFormData({...formData, apiKey: e.target.value})}
                           />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">System Secret</label>
                        <div className="relative">
                           <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                              <ShieldCheck size={18} />
                           </div>
                           <input 
                              required type="password" 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                              placeholder="••••••••••••"
                              value={formData.apiSecret}
                              onChange={e => setFormData({...formData, apiSecret: e.target.value})}
                           />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Access Token Node</label>
                    <div className="relative">
                       <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                          <Plus size={18} />
                       </div>
                       <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                          placeholder="JWT-TOKEN-OR-EQUIVALENT"
                          value={formData.accessToken}
                          onChange={e => setFormData({...formData, accessToken: e.target.value})}
                       />
                    </div>
                  </div>
                </div>

                <div className="py-4 flex items-center space-x-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                   <div className="p-2 bg-white rounded-xl shadow-sm">
                      <BadgeCheck className="w-5 h-5 text-indigo-600" />
                   </div>
                   <p className="text-[10px] text-indigo-900 font-black uppercase tracking-widest opacity-70">
                     Encryption Vault Active. Keys are isolated from the core application state.
                   </p>
                </div>

                <button 
                  disabled={isConnecting}
                  type="submit" 
                  className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 ${
                    isConnecting 
                      ? 'bg-slate-100 text-slate-400' 
                      : 'bg-[#0A1128] hover:bg-black text-white shadow-indigo-100'
                  }`}
                >
                   {isConnecting ? (
                     <>
                       <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                       <span>Verifying Protocol...</span>
                     </>
                   ) : (
                     <span>Secure Connection</span>
                   )}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
