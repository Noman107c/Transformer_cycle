'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  AlertCircle, RefreshCw, CheckCircle2, AlertTriangle,
  Info, Database, Clock, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

type LogEntry = {
  id: string;
  transformer_id: string;
  status: string;
  health_index: number;
  timestamp: string;
  ambient_temp: number;
  current: number;
  voltage: number;
  severity: 'CRITICAL' | 'WARNING' | 'MONITOR' | 'INFO';
  message: string;
};

type Transformer = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
};

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  WARNING: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  MONITOR: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  INFO: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const SEVERITY_ICON: Record<string, React.ElementType> = {
  CRITICAL: AlertTriangle,
  WARNING: AlertTriangle,
  MONITOR: Info,
  INFO: CheckCircle2,
};

function hiToSeverity(hi: number): 'CRITICAL' | 'WARNING' | 'MONITOR' | 'INFO' {
  if (hi < 0.55) return 'CRITICAL';
  if (hi < 0.70) return 'WARNING';
  if (hi < 0.80) return 'MONITOR';
  return 'INFO';
}

function hiToMessage(id: string, hi: number, status: string): string {
  const pct = (hi * 100).toFixed(1);
  if (hi < 0.55) return `${id}: Critical health degradation detected — HI ${pct}%. Immediate inspection required.`;
  if (hi < 0.70) return `${id}: Elevated risk signals — HI ${pct}%. Detailed inspection recommended.`;
  if (hi < 0.80) return `${id}: Moderate condition, monitoring closely — HI ${pct}%.`;
  return `${id}: Operating normally — HI ${pct}%. All parameters within range.`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const metaRes = await fetch('/api/admin/transformers');
      const metaJson = await metaRes.json();
      if (!metaJson.success) throw new Error('Failed to load transformers');
      const tList: Transformer[] = metaJson.data.filter((t: any) => t.is_active);

      // Fetch latest reading from each transformer to generate log entries
      const results = await Promise.allSettled(
        tList.slice(0, 25).map(async (t) => {
          const numId = t.id.match(/\d+/)?.[0] ?? t.id;
          const res = await fetch(`/api/admin/transformers/${numId}/data`);
          const json = await res.json();
          const readings = json.success ? json.data : [];
          return { t, readings: readings.slice(0, 10) }; // latest 10 readings per transformer
        })
      );

      const allLogs: LogEntry[] = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const { t, readings } = r.value;
          readings.forEach((reading: any, rIdx: number) => {
            const hi = Number(reading.HI) || 0;
            const severity = hiToSeverity(hi);
            allLogs.push({
              id: `${t.id}-${rIdx}`,
              transformer_id: t.id,
              status: t.status,
              health_index: hi,
              timestamp: reading.Timestamp || new Date().toISOString(),
              ambient_temp: Number(reading.Ambient_Temperature_C) || 0,
              current: Number(reading.Current_A) || 0,
              voltage: Number(reading.Voltage_kV) || 0,
              severity,
              message: hiToMessage(t.id, hi, t.status),
            });
          });
        }
      });

      // Sort by timestamp desc
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(allLogs);
      setPage(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.severity === filter);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const counts = {
    ALL: logs.length,
    CRITICAL: logs.filter(l => l.severity === 'CRITICAL').length,
    WARNING: logs.filter(l => l.severity === 'WARNING').length,
    MONITOR: logs.filter(l => l.severity === 'MONITOR').length,
    INFO: logs.filter(l => l.severity === 'INFO').length,
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <AlertCircle className="text-orange-500" size={32} /> System Logs
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time activity log derived from transformer readings in database
            </p>
          </div>
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-500" />
          {(['ALL', 'CRITICAL', 'WARNING', 'MONITOR', 'INFO'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${
                filter === f
                  ? f === 'CRITICAL' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : f === 'WARNING' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                    : f === 'MONITOR' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                    : f === 'INFO' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f} <span className="ml-1 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Log Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs font-bold uppercase bg-gray-900/50">
                  <th className="py-3 px-5">Severity</th>
                  <th className="py-3 px-5">Transformer</th>
                  <th className="py-3 px-5">Message</th>
                  <th className="py-3 px-5">HI</th>
                  <th className="py-3 px-5">Temp (°C)</th>
                  <th className="py-3 px-5">Current (A)</th>
                  <th className="py-3 px-5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-3 px-5">
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-500 font-bold">
                      <Database size={24} className="mx-auto mb-2 opacity-40" />
                      No log entries found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((log) => {
                    const Icon = SEVERITY_ICON[log.severity];
                    return (
                      <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${SEVERITY_STYLE[log.severity]}`}>
                            <Icon size={10} /> {log.severity}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-black text-white font-mono text-xs">{log.transformer_id}</td>
                        <td className="py-3 px-5 text-gray-300 text-xs max-w-xs truncate" title={log.message}>{log.message}</td>
                        <td className="py-3 px-5 font-bold text-xs">
                          <span className={log.health_index < 0.55 ? 'text-red-400' : log.health_index < 0.70 ? 'text-orange-400' : log.health_index < 0.80 ? 'text-yellow-400' : 'text-emerald-400'}>
                            {(log.health_index * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-5 text-gray-400 text-xs">{log.ambient_temp.toFixed(1)}</td>
                        <td className="py-3 px-5 text-gray-400 text-xs">{log.current.toFixed(1)}</td>
                        <td className="py-3 px-5 text-gray-500 text-xs font-mono">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(log.timestamp).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-900/50">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} entries
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold text-gray-300 disabled:opacity-30 transition-all"
                >
                  ‹ Prev
                </button>
                <span className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold">{page}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold text-gray-300 disabled:opacity-30 transition-all"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
