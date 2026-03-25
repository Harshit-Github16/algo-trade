'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ScrollText, Info, AlertTriangle, XCircle } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await axios.get('/api/logs');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }

  function getLevelIcon(level) {
    switch (level) {
      case 'INFO': return <Info className="w-5 h-5 text-blue-400" />;
      case 'WARN': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  }

  function getLevelBadgeClasses(level) {
    switch (level) {
      case 'INFO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'WARN': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'ERROR': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-160px)] flex flex-col">
        <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-gray-50/30">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
              <div className="mt-1">
                {log.level === 'INFO' && <Info className="w-5 h-5 text-blue-600" />}
                {log.level === 'WARN' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {log.level === 'ERROR' && <XCircle className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-0.5 uppercase font-black tracking-widest rounded-md border ${
                    log.level === 'INFO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    log.level === 'WARN' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {log.level}
                  </span>
                  <span className="font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-900 font-bold leading-relaxed">
                  {log.message}
                </p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 relative group">
                     <pre className="text-[11px] bg-slate-900 p-4 rounded-lg text-slate-300 font-mono overflow-x-auto shadow-inner border-l-4 border-blue-500">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-gray-100 rounded-full">
                 <ScrollText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-semibold">No logs found for this session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
