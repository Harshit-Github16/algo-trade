'use client';

import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Activity, BarChart3, Clock } from 'lucide-react';

export default function Chart({ trades = [] }) {
  const chartContainerRef = useRef();
  const [timeframe, setTimeframe] = useState('15m');
  const [chartType, setChartType] = useState('candles'); // candles or line

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#ffffff' },
        textColor: '#374151',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    });

    let series;
    if (chartType === 'line') {
      series = chart.addSeries(LineSeries, {
        color: '#2563eb',
        lineWidth: 2,
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
      });
    }

    // SIMULATED DATA based on timeframe
    const generateData = () => {
      let data = [];
      let now = Math.floor(Date.now() / 1000);
      let interval;
      switch(timeframe) {
        case '1m': interval = 60; break;
        case '5m': interval = 300; break;
        case '15m': interval = 900; break;
        case '1h': interval = 3600; break;
        case '1d': interval = 86400; break;
        default: interval = 900;
      }
      
      let price = 22000;
      for (let i = 0; i < 200; i++) {
        const time = now - (200 - i) * interval;
        const open = price;
        const close = price + (Math.random() - 0.5) * 40;
        const high = Math.max(open, close) + Math.random() * 20;
        const low = Math.min(open, close) - Math.random() * 20;
        
        if (chartType === 'line') {
          data.push({ time, value: close });
        } else {
          data.push({ time, open, high, low, close });
        }
        price = close;
      }
      return data;
    };
    
    series.setData(generateData());

    // Compute Markers for trades (only for Candles)
    if (chartType === 'candles') {
      const markers = trades.map(t => {
        const time = Math.floor(new Date(t.created_at).getTime() / 1000);
        return {
          time,
          position: t.optiontype === 'CE' ? 'belowBar' : 'aboveBar',
          color: t.optiontype === 'CE' ? '#059669' : '#dc2626',
          shape: t.optiontype === 'CE' ? 'arrowUp' : 'arrowDown',
          text: 'ENTRY',
          size: 2,
        };
      }).sort((a,b) => a.time - b.time);
      
      if (markers.length > 0) series.setMarkers(markers);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [trades, timeframe, chartType]);

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Chart Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-1">
          {['1m', '5m', '15m', '1h', '1d'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === t 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex p-1 bg-gray-100 rounded-xl mr-4">
            <button
              onClick={() => setChartType('candles')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'candles' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
          
          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0">
        <div ref={chartContainerRef} />
      </div>

      {/* Footer Info */}
      <div className="px-6 py-2 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center text-[10px] text-gray-400 font-bold tracking-widest uppercase">
          <Clock className="w-3 h-3 mr-1.5" />
          Live Market Stream
        </div>
        <div className="flex items-center space-x-4">
           <span className="text-[10px] text-emerald-600 font-black">• MARKET OPEN</span>
        </div>
      </div>
    </div>
  );
}
