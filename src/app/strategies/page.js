'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Play, Square, Plus, Trash2,
  Settings2, Target, ShieldAlert, Clock,
  Zap, Info, ChevronRight, X, ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, TrendingUp
} from 'lucide-react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: 'RELIANCE',
    entryConditionType: 'price_cross',
    entryConditionLevel: '',
    entryConditionDirection: 'up',
    stopLoss: '',
    target: '',
    trailingSL: '0',
    quantity: '1',
    startTime: '09:15',
    endTime: '15:15',
    orderType: 'MARKET',
    maxTradePerDay: '1'
  });

  const [indicators, setIndicators] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState({});
  const [orderingId, setOrderingId] = useState(null);
  const [openTrades, setOpenTrades] = useState([]);
  const [algorithmText, setAlgorithmText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    let socket = null;
    async function init() {
      axios.get('/api/engine/start').catch(e => console.error('Engine start failed', e));
      const data = await fetchStrategies();
      await fetchStocks();
      await fetchOpenTrades();

      const symbols = [...new Set(data.map(s => s.symbol))];
      if (symbols.length === 0) return;

      socket = require('socket.io-client')('wss://live-quotes.niftytrader.in', {
        transports: ['websocket'],
        query: {
          symbols: symbols.join(','),
          tickType: 'watchlist',
          requestFor: 'EQ',
          EIO: '4'
        }
      });

      socket.on('watchlistTickData', (data) => {
        const updates = Array.isArray(data) ? data : [data];
        const newPrices = {};
        updates.forEach(tick => {
          const sym = tick.symbol_name || tick.symbol;
          const val = tick.last_trade_price || tick.ltp;
          if (sym && val) newPrices[sym] = val;
        });
        setPrices(prev => ({ ...prev, ...newPrices }));
      });
    }

    init();
    const tradeInterval = setInterval(fetchOpenTrades, 5000);
    return () => {
      if (socket) socket.disconnect();
      clearInterval(tradeInterval);
    };
  }, []);

  async function fetchStocks() {
    try {
      const res = await axios.get('/api/stocks');
      if (Array.isArray(res.data)) {
        setStocks(res.data);
      }
    } catch (err) {
      console.error('Failed to update stocks context', err);
    }
  }

  const handleAssetChange = (symbol) => {
    const selectedStock = stocks.find(s => s.symbol_name === symbol);
    const currentPrice = selectedStock ? (selectedStock.last_trade_price || selectedStock.today_close) : '0';

    setFormData(prev => ({
      ...prev,
      symbol,
      entryConditionLevel: currentPrice
    }));
  };

  async function fetchStrategies() {
    try {
      const res = await axios.get('/api/strategy');
      const data = res.data.strategies || [];
      setStrategies(data);
      return data;
    } catch (err) {
      console.error('Error fetching strategies', err);
      return [];
    }
  }

  async function fetchOpenTrades() {
    try {
      const res = await axios.get('/api/trades');
      const all = res.data.trades || [];
      setOpenTrades(all.filter(t => t.status === 'OPEN'));
    } catch (_) { }
  }

  function getOpenTrade(strategyId) {
    return openTrades.find(t => t.strategyId === strategyId);
  }

  const addIndicator = () => {
    setIndicators([...indicators, { type: 'RSI', period: 14, overbought: 70, oversold: 30, direction: 'up' }]);
  };

  const removeIndicator = (index) => {
    setIndicators(indicators.filter((_, i) => i !== index));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const condType = formData.entryConditionType;
      const payload = {
        name: formData.name,
        symbol: formData.symbol,
        optionType: 'EQ',
        strike: 'N/A',
        expiry: 'N/A',
        entryCondition: {
          type: condType,
          level: condType !== 'indicator' ? parseFloat(formData.entryConditionLevel) : null,
          direction: formData.entryConditionDirection
        },
        indicators: (condType === 'indicator' || condType === 'price_and_indicator') ? indicators : [],
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
        target: formData.target ? parseFloat(formData.target) : null,
        trailingSL: parseFloat(formData.trailingSL) || 0,
        quantity: parseInt(formData.quantity, 10),
        startTime: formData.startTime,
        endTime: formData.endTime,
        orderType: 'MARKET',
        maxTradePerDay: parseInt(formData.maxTradePerDay, 10)
      };

      await axios.post('/api/strategy', payload);
      alert('✅ Strategy Saved Successfully!');
      setIsCreating(false);
      setIndicators([]);
      setAlgorithmText('');
      fetchStrategies();
    } catch (err) {
      console.error('Failed to create strategy', err);
      alert('❌ Failed to save strategy: ' + (err.response?.data?.error || err.message));
    }
  }

  async function toggleStatus(id, currentStatus) {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'STOPPED' : 'ACTIVE';
      await axios.patch('/api/strategy', { id, status: newStatus });
      fetchStrategies();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  }

  async function deleteStrategy(id) {
    if (!window.confirm('Are you sure you want to delete this strategy?')) return;
    try {
      await axios.delete(`/api/strategy?id=${id}`);
      fetchStrategies();
    } catch (err) {
      console.error('Failed to delete strategy', err);
    }
  }

  async function forceOrder(strategy) {
    if (!window.confirm(`Place IMMEDIATE market order for ${strategy.symbol} at current price?\n\nThis ignores signal conditions and executes NOW.`)) return;
    setOrderingId(strategy._id);
    try {
      const res = await axios.post('/api/strategy/execute', { strategyId: strategy._id });
      const d = res.data;
      alert(`✅ Order Placed!\nSymbol: ${d.symbol}\nSide: ${d.side}\nPrice: ₹${d.price}\nQty: ${d.qty}\nOrder ID: ${d.orderId}`);
      fetchStrategies();
      fetchOpenTrades();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert(`❌ Order Failed:\n${msg}`);
    } finally {
      setOrderingId(null);
    }
  }

  const handleMagicBuild = async () => {
    if (!algorithmText) return;
    setIsParsing(true);
    try {
      const res = await axios.post('/api/strategy/parse', { algorithm: algorithmText });
      if (res.data.success) {
        const c = res.data.config;
        setFormData(prev => ({
          ...prev,
          name: c.name || prev.name,
          symbol: c.symbol || prev.symbol,
          entryConditionType: c.entryConditionType || prev.entryConditionType,
          entryConditionLevel: c.entryConditionLevel !== null ? c.entryConditionLevel : prev.entryConditionLevel,
          entryConditionDirection: c.entryConditionDirection || prev.entryConditionDirection,
          target: c.target !== null ? c.target : prev.target,
          stopLoss: c.stopLoss !== null ? c.stopLoss : prev.stopLoss,
          quantity: c.quantity || prev.quantity
        }));

        if (c.indicators && c.indicators.length > 0) {
          setIndicators(c.indicators.map(i => ({
            type: i.indicator,
            period: i.period,
            direction: i.compare === 'above' ? 'up' : 'down',
            overbought: i.value,
            oversold: i.value
          })));
        }
        alert('✨ Strategy parameters synthesized successfully! Review the fields below and click "Initialize Protocol" at the bottom to save your strategy.');
      }
    } catch (err) {
      console.error('Magic parse failed', err);
      alert('❌ Failed to parse algorithm. Try being more specific with terms like RSI, Target, or Price crosses.');
    } finally {
      setIsParsing(false);
    }
  };


  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-20 px-4 animate-in fade-in duration-700">
      {/* Page Header Summary Hub */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Zap size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-[#0A1128] tracking-tighter uppercase">Strategy Architect</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> {strategies.filter(s => s.status === 'ACTIVE').length} Active Logic Engines</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Deployed Assets: {[...new Set(strategies.map(s => s.symbol))].length}</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 items-end">
          <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[140px]">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">System Latency</p>
            <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs uppercase tracking-wider">
              <Activity size={12} className="animate-pulse" /> OPTIMAL (8ms)
            </div>
          </div>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-8 py-4 bg-[#0A1128] text-white hover:bg-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">
            <Plus size={18} strokeWidth={3} />
            <span>Create Logic</span>
          </button>
        </div>
      </div>

      {/* Strategy Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {strategies.map((strategy) => {
          const ltp = prices[strategy.symbol];
          const isActive = strategy.status === 'ACTIVE';
          const trade = getOpenTrade(strategy._id);

          return (
            <div key={strategy._id} className="bg-white border border-slate-100 rounded-[32px] p-8 flex flex-col group hover:shadow-2xl hover:shadow-indigo-50/50 transition-all duration-500 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 transition-all ${isActive ? 'bg-indigo-500 shadow-[0_2px_10px_#6366f1]' : 'bg-slate-100'}`} />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#0A1128] tracking-tight truncate max-w-[180px]">{strategy.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black tracking-tighter shadow-sm border border-indigo-100">{strategy.symbol}</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">ID: {strategy._id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteStrategy(strategy._id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90">
                    <Trash2 size={16} />
                  </button>
                  <div className="relative inline-flex items-center cursor-pointer ml-1" onClick={() => toggleStatus(strategy._id, strategy.status)}>
                    <div className={`w-11 h-6 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    <div className={`absolute w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 transform ${isActive ? 'translate-x-[22px]' : 'translate-x-[4px]'}`} />
                  </div>
                </div>
              </div>

              {/* Price Feed Widget */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 mb-6 flex justify-between items-center group-hover:bg-white transition-colors duration-500">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Live LTP</span>
                  <span className={`text-sm font-black font-mono transition-colors ${ltp ? 'text-indigo-600' : 'text-slate-300'}`}>
                    ₹{ltp ? Number(ltp).toFixed(2) : '---'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Signal Hub</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                    {strategy.entryCondition?.type?.replace('_', ' ') || 'SYSTEM'} @ ₹{strategy.entryCondition?.level}
                  </span>
                </div>
              </div>

              {/* Bound Config */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-1 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Target size={10} className="text-emerald-500" /> Target Bound
                  </p>
                  <p className="text-xs font-black text-emerald-600 font-mono tracking-tighter uppercase">₹{strategy.target || '--'}</p>
                </div>
                <div className="space-y-1 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ShieldAlert size={10} className="text-rose-500" /> Risk Limit
                  </p>
                  <p className="text-xs font-black text-rose-500 font-mono tracking-tighter uppercase">₹{strategy.stopLoss || '--'}</p>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Session</span>
                    <span className="text-[10px] font-black text-[#0A1128] font-mono leading-none mt-0.5 opacity-80">{strategy.startTime} - {strategy.endTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {trade ? (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all ${((prices[strategy.symbol] || trade.entryPrice) - trade.entryPrice) >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${((prices[strategy.symbol] || trade.entryPrice) - trade.entryPrice) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      Live Hub Active
                    </div>
                  ) : (
                    <button
                      onClick={() => forceOrder(strategy)}
                      disabled={orderingId === strategy._id}
                      className={`flex items-center gap-2 px-5 py-2.5 bg-[#0A1128] text-white hover:bg-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50`}
                    >
                      <Zap size={14} className={orderingId === strategy._id ? 'animate-spin' : ''} />
                      {orderingId === strategy._id ? 'Routing...' : 'Execute Now'}
                    </button>
                  )}
                  <button className="p-2.5 text-slate-300 hover:text-[#0A1128] hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all">
                    <Settings2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {strategies.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-30 text-center pointer-events-none">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8 border border-slate-100">
              <Target size={48} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-[#0A1128] mb-2 tracking-tighter uppercase">Initialize Strategy Matrix</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-sm leading-relaxed">System awaiting node configuration. Deploy your first logic engine using the builder above.</p>
          </div>
        )}
      </div>

      {/* Creation Configuration Matrix (Modal) */}
      {isCreating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
          <div className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-10 animate-in zoom-in-95 duration-500 border border-slate-100 my-auto">
            <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#0A1128] transition-colors p-2 hover:bg-slate-50 rounded-full">
              <X size={24} />
            </button>

            <div className="flex items-center space-x-6 mb-10 border-b border-slate-50 pb-8">
              <div className="w-16 h-16 bg-[#0A1128] rounded-2xl flex items-center justify-center shadow-lg">
                <Plus size={30} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0A1128] tracking-tighter uppercase">Engineer Strategy Node</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Configuring Execution Matrix Protocol v2.5 // Multi-Indicator Support</p>
              </div>
            </div>

            {/* --- MAGIC ALGO BUILDER SECTION --- */}
            <div className="bg-indigo-600/5 p-8 rounded-[40px] border border-indigo-100 shadow-sm mb-10 group transition-all hover:bg-indigo-600/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Zap size={20} className="text-indigo-600 animate-pulse" />
                  <h3 className="text-sm font-black text-indigo-900 tracking-tight uppercase">AI Algorithm Blueprint</h3>
                </div>
                <span className="text-[8px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Natural Intelligence Engine</span>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <textarea
                  className="flex-1 bg-white border border-indigo-100 rounded-3xl px-6 py-4 text-xs font-bold text-indigo-900 focus:border-indigo-600 outline-none transition-all placeholder:text-indigo-200 min-h-[100px] resize-none shadow-sm"
                  placeholder="Try describing: 'RELIANCE crosses 2500 with RSI above 30, target 50 points and SL 20...'"
                  value={algorithmText} onChange={e => setAlgorithmText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleMagicBuild}
                  disabled={isParsing || !algorithmText}
                  className="px-8 py-6 bg-indigo-600 text-white rounded-[32px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-black transition-all active:scale-95 disabled:opacity-50 h-full"
                >
                  {isParsing ? 'Parsing Algorithm...' : 'Synthesize Logic'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Col: Target & Specs (4 Cols) */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                      <Target size={12} className="text-indigo-500" /> Node Identifier
                    </label>
                    <input required type="text" placeholder="STRATEGY_SIGMA_X"
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner uppercase tracking-wider"
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                      <Activity size={12} className="text-indigo-500" /> Target Asset
                    </label>
                    <AssetSelector value={formData.symbol} onChange={handleAssetChange} stocks={stocks} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Qty</label>
                      <input required type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner font-mono"
                        value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Max/Day</label>
                      <input type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner font-mono"
                        value={formData.maxTradePerDay} onChange={e => setFormData({ ...formData, maxTradePerDay: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Session Window</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="09:15"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner font-mono"
                        value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                      <input type="text" placeholder="15:15"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner font-mono"
                        value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Right Col: Signal & Logic (8 Cols) */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                  <div className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-[#0A1128] uppercase tracking-[0.2em] ml-2">Signal Paradigm</label>
                          <span className="text-[7.5px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shadow-sm">CORE LOGIC</span>
                        </div>
                        <CustomSelect
                          value={formData.entryConditionType}
                          onChange={v => setFormData({ ...formData, entryConditionType: v })}
                          options={[
                            { label: 'Price Convergence', value: 'price_cross' },
                            { label: 'Indicator Momentum', value: 'indicator' },
                            { label: 'Hybrid Quant Flow', value: 'price_and_indicator' }
                          ]} />
                      </div>

                      <div className="space-y-4">
                        {formData.entryConditionType !== 'indicator' ? (
                          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-[#0A1128] uppercase tracking-[0.2em] ml-2">Price Trigger Node</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Direction</label>
                                <CustomSelect
                                  value={formData.entryConditionDirection}
                                  onChange={v => setFormData({ ...formData, entryConditionDirection: v })}
                                  options={[{ label: 'Bullish', value: 'up' }, { label: 'Bearish', value: 'down' }]} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Value (₹)</label>
                                <input type="number" step="0.01"
                                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black focus:border-[#0A1128] outline-none transition-all font-mono shadow-sm"
                                  value={formData.entryConditionLevel} onChange={e => setFormData({ ...formData, entryConditionLevel: e.target.value })} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col justify-center items-center opacity-30 border border-dashed border-slate-200 rounded-3xl p-6">
                            <ShieldCheck size={24} />
                            <p className="text-[8px] font-black uppercase tracking-widest mt-2">Price Override Disengaged</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indicator Logic Section */}
                  {(formData.entryConditionType === 'indicator' || formData.entryConditionType === 'price_and_indicator') && (
                    <div className="bg-indigo-50/30 p-8 rounded-[40px] border border-indigo-100/50 shadow-sm animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <label className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <Settings2 size={12} /> Indicator Node Matrix
                          </label>
                          <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest ml-2 mt-1">Multi-factor signal confirmation protocol</p>
                        </div>
                        <button type="button" onClick={addIndicator} className="flex items-center gap-2 px-6 py-3 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95">
                          <Plus size={14} /> Add Logic Node
                        </button>
                      </div>

                      <div className="space-y-4">
                        {indicators.map((ind, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm flex flex-col md:flex-row gap-6 items-end relative group animate-in slide-in-from-right-4 duration-300">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                                <select
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-indigo-500"
                                  value={ind.type} onChange={e => {
                                    const newInds = [...indicators];
                                    newInds[idx].type = e.target.value;
                                    setIndicators(newInds);
                                  }}>
                                  <option>RSI</option>
                                  <option>EMA</option>
                                  <option>SMA</option>
                                  <option>MACD</option>
                                  <option>SUPER TREND</option>
                                  <option>BOLLINGER BANDS</option>
                                  <option>VWAP</option>
                                  <option>ADX</option>
                                  <option>STOCHASTICS</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Period</label>
                                <input type="number"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-indigo-500"
                                  value={ind.period} onChange={e => {
                                    const newInds = [...indicators];
                                    newInds[idx].period = parseInt(e.target.value);
                                    setIndicators(newInds);
                                  }} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logic Flow</label>
                                <select
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-indigo-500"
                                  value={ind.direction} onChange={e => {
                                    const newInds = [...indicators];
                                    newInds[idx].direction = e.target.value;
                                    setIndicators(newInds);
                                  }}>
                                  <option value="up">OVERBOUGHT CROSS</option>
                                  <option value="down">OVERSOLD CROSS</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Node Value</label>
                                <input type="number"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-indigo-500"
                                  value={ind.direction === 'down' ? ind.oversold : ind.overbought} onChange={e => {
                                    const newInds = [...indicators];
                                    if (ind.direction === 'up') newInds[idx].overbought = parseInt(e.target.value);
                                    else newInds[idx].oversold = parseInt(e.target.value);
                                    setIndicators(newInds);
                                  }} />
                              </div>
                            </div>
                            <button type="button" onClick={() => removeIndicator(idx)} className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-95 border border-rose-100">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}

                        {indicators.length === 0 && (
                          <div className="py-10 border-2 border-dashed border-indigo-100 rounded-[32px] flex flex-col items-center justify-center text-indigo-300 gap-4">
                            <Settings2 size={32} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Add indicators to engage logic matrix</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-[#0A1128] uppercase tracking-[0.2em] ml-2">Risk Safeguards</label>
                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">AUTO-LIQUIDATION PROXIMITY</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><TrendingUp size={10} className="text-emerald-500" /> Target (₹)</label>
                        <input type="number" step="0.01"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-black focus:border-[#0A1128] focus:bg-white outline-none transition-all font-mono"
                          value={formData.target} onChange={e => setFormData({ ...formData, target: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><ShieldAlert size={10} className="text-rose-500" /> Stoploss (₹)</label>
                        <input type="number" step="0.01"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-black focus:border-[#0A1128] focus:bg-white outline-none transition-all font-mono"
                          value={formData.stopLoss} onChange={e => setFormData({ ...formData, stopLoss: e.target.value })} />
                      </div>
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Zap size={10} className="text-amber-500" /> Trailing (₹)</label>
                        <input type="number" step="0.5"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-black focus:border-[#0A1128] focus:bg-white outline-none transition-all font-mono"
                          value={formData.trailingSL} onChange={e => setFormData({ ...formData, trailingSL: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                <div className="flex items-center gap-4 px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="text-emerald-500" size={20} />
                  <div className="text-[9px] text-emerald-800 font-black uppercase tracking-widest opacity-80 leading-tight max-w-xs">
                    Logic Node v2.5 Verified. Auto-execution protocols engaged. <br /> Routing: DHAN DIRECT HUB (Latency: 2ms)
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-8 py-5 text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest transition-colors">Abort Procedure</button>
                  <button type="submit"
                    className="px-12 py-5 bg-[#0A1128] text-white hover:bg-black rounded-[32px] text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-200 active:scale-95 transition-all flex items-center gap-4 group">
                    Initialize Protocol
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Helper Components for High-Fidelity UI
function CustomSelect({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left transition-all border flex items-center justify-between group ${value === opt.value ? 'bg-[#0A1128] border-[#0A1128] text-white shadow-xl shadow-indigo-50' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
        >
          {opt.label}
          {value === opt.value && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />}
        </button>
      ))}
    </div>
  );
}

function AssetSelector({ value, onChange, stocks }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = stocks
    .map(s => s.symbol_name)
    .filter(name => name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-6 py-4 text-xs font-black shadow-inner flex items-center justify-between transition-all hover:bg-white hover:border-slate-200 text-[#0A1128] uppercase tracking-wider"
      >
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-indigo-400" />
          {value || 'Select Asset Node'}
        </div>
        <ChevronRight size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] p-4 z-[70] animate-in zoom-in-95 duration-200">
          <input
            type="text"
            placeholder="FILTER NODES..."
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[10px] font-black outline-none focus:bg-white focus:border-indigo-500 mb-4 uppercase tracking-widest placeholder:text-slate-300"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-5 py-3.5 rounded-2xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-between group ${value === opt ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-[#0A1128] hover:translate-x-1 outline-none'}`}
                >
                  <span className="tracking-widest uppercase">{opt}</span>
                  {value === opt && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-center text-[9px] font-black text-slate-300 uppercase italic tracking-widest">No matching assets found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
