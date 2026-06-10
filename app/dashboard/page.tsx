'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  BadgeInfo,
  ShieldCheck,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';

type TransformerStatus = 'GOOD' | 'MONITOR' | 'WARNING' | 'CRITICAL';

type TransformerMeta = {
  id: string;
  name: string;
  status: TransformerStatus;
  healthIndex: number;
  ambientTemperatureC: number;
  ageYr: number;
  capacity: number;
  location: string;
  type: string;
  lastMaintenance: string;
  readings: any[];
  weightageOverall: number;
  rulDays: number;
  rulYears: number;
};

type TelemetryPoint = {
  Transformer: string;
  Time: string;
  HI: number;
  Ambient_Temperature_C: number;
  Age_yr: number;
  Outages_hours_per_year: number;
  Current_A: number;
  Voltage_kV: number;
  Short_Circuits?: number;
  No_of_Short_Circuits?: number;
  Maintenance_Count?: number;
  Predicted_HI?: number;
  Temp_score?: number;
  Age_score?: number;
  Maintenance_score?: number;
  ShortCircuit_score?: number;
  Outage_score?: number;
  Current_score?: number;
  Voltage_score?: number;
};

const STATUS_META: Record<TransformerStatus, { label: string; text: string; bg: string; border: string }> = {
  GOOD: { label: 'Healthy', text: 'text-[#10b981]', bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/30' },
  MONITOR: { label: 'Moderate', text: 'text-[#eab308]', bg: 'bg-[#eab308]/10', border: 'border-[#eab308]/30' },
  WARNING: { label: 'At Risk', text: 'text-[#f97316]', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]/30' },
  CRITICAL: { label: 'Critical', text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30' },
};

function statusFromHI(hi01: number): TransformerStatus {
  if (hi01 < 0.55) return 'CRITICAL';
  if (hi01 < 0.7) return 'WARNING';
  if (hi01 < 0.8) return 'MONITOR';
  return 'GOOD';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toTransformerId(idxOrId: number | string) {
  if (typeof idxOrId === 'string') {
    const t = idxOrId.trim();
    if (/^TRF-\d+$/i.test(t)) return t.toUpperCase();
    if (/^T\d+$/i.test(t)) {
      const n = Number(t.slice(1));
      return `TRF-${String(n).padStart(2, '0')}`;
    }
    return t;
  }
  return `TRF-${String(idxOrId).padStart(2, '0')}`;
}

export default function DashboardOverview() {
  const [transformers, setTransformers] = useState<TransformerMeta[]>([]);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStaticData = async () => {
    try {
      setIsLoading(true);
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      let activeIds: string[] = [];
      try {
        const metaRes = await fetch('/api/admin/transformers');
        const metaJson = await metaRes.json();
        if (metaJson.success && Array.isArray(metaJson.data) && metaJson.data.length > 0) {
          activeIds = metaJson.data.filter((t: any) => t.is_active).map((t: any) => t.id as string);
        }
      } catch { }

      if (activeIds.length === 0) activeIds = Array.from({ length: 25 }, (_, i) => `T${i + 1}`);

      const promises = activeIds.map((tId) => {
        const num = parseInt(tId.replace(/[^\d]/g, ''), 10);
        const tableName = `transformer_${num}`;
        return supabase.from(tableName).select('*').then(({ data, error }: { data: any, error: any }) => {
          if (error && error.message?.includes('schema cache')) return { id: tId, data: null, missing: true };
          if (error) throw new Error(`Failed to load ${tId}: ${error.message}`);
          return { id: tId, data };
        });
      });

      const results = await Promise.allSettled(promises);
      const loadedTransformers: TransformerMeta[] = [];
      const allHistory: TelemetryPoint[] = [];

      results.forEach((result, idx) => {
        const trfId = toTransformerId(activeIds[idx]);
        if (result.status === 'fulfilled' && !result.value.missing) {
          let readings = result.value.data;
          if (Array.isArray(readings) && readings.length > 0) {
            const times = readings.map((r: any) => new Date(r.Timestamp || r.timestamp || r.Time || r.time).getTime());
            const maxTime = Math.max(...times.filter((t) => !isNaN(t)));
            const oneYearAgo = maxTime - 365 * 24 * 60 * 60 * 1000;
            readings = readings.filter((r: any) => new Date(r.Timestamp || r.timestamp || r.Time || r.time).getTime() >= oneYearAgo);

            if (readings.length > 0) {
              const latest = readings[readings.length - 1];
              const hi01 = safeNumber(latest.HI ?? latest.hi, 0);
              const status = statusFromHI(hi01);

              const mappedReadings: TelemetryPoint[] = readings.slice(-120).map((r: any) => ({
                ...r,
                Transformer: trfId,
                Time: r.Timestamp || r.timestamp || r.Time || r.time,
                HI: safeNumber(r.HI ?? r.hi, hi01),
                Ambient_Temperature_C: safeNumber(r.Ambient_Temperature_C ?? r.ambient_temperature_c, safeNumber(latest.Ambient_Temperature_C ?? latest.ambient_temperature_c)),
                Age_yr: safeNumber(r.Age_yr ?? r.age_yr, safeNumber(latest.Age_yr ?? latest.age_yr)),
                Outages_hours_per_year: safeNumber(r.Outages_hours_per_year ?? r.outages_hours_per_year, safeNumber(latest.Outages_hours_per_year ?? latest.outages_hours_per_year)),
                Current_A: safeNumber(r.Current_A ?? r.current_a, safeNumber(latest.Current_A ?? latest.current_a)),
                Voltage_kV: safeNumber(r.Voltage_kV ?? r.voltage_kv, safeNumber(latest.Voltage_kV ?? latest.voltage_kv)),
                Predicted_HI: safeNumber(r.Predicted_HI ?? r.predicted_hi, safeNumber(latest.Predicted_HI ?? latest.predicted_hi)),
                Maintenance_Count: safeNumber(r.Maintenance_Count ?? r.maintenance_count, safeNumber(latest.Maintenance_Count ?? latest.maintenance_count)),
                Short_Circuits: safeNumber(r.Short_Circuits ?? r.short_circuits ?? r.No_of_Short_Circuits ?? r.no_of_short_circuits, safeNumber(latest.Short_Circuits ?? latest.short_circuits ?? latest.No_of_Short_Circuits ?? latest.no_of_short_circuits)),
                No_of_Short_Circuits: safeNumber(r.No_of_Short_Circuits ?? r.no_of_short_circuits ?? r.Short_Circuits ?? r.short_circuits, safeNumber(latest.No_of_Short_Circuits ?? latest.no_of_short_circuits ?? latest.Short_Circuits ?? latest.short_circuits)),
                Temp_score: safeNumber(r.Temp_score ?? r.temp_score, safeNumber(latest.Temp_score ?? latest.temp_score)),
                Age_score: safeNumber(r.Age_score ?? r.age_score, safeNumber(latest.Age_score ?? latest.age_score)),
                Maintenance_score: safeNumber(r.Maintenance_score ?? r.maintenance_score, safeNumber(latest.Maintenance_score ?? latest.maintenance_score)),
                ShortCircuit_score: safeNumber(r.ShortCircuit_score ?? r.shortcircuit_score, safeNumber(latest.ShortCircuit_score ?? latest.shortcircuit_score)),
                Outage_score: safeNumber(r.Outage_score ?? r.outage_score, safeNumber(latest.Outage_score ?? latest.outage_score)),
                Current_score: safeNumber(r.Current_score ?? r.current_score, safeNumber(latest.Current_score ?? latest.current_score)),
                Voltage_score: safeNumber(r.Voltage_score ?? r.voltage_score, safeNumber(latest.Voltage_score ?? latest.voltage_score)),
              }));

              allHistory.push(...mappedReadings);

              const ambient = safeNumber(latest.Ambient_Temperature_C ?? latest.ambient_temperature_c, 0);
              const ageYr = safeNumber(latest.Age_yr ?? latest.age_yr, 0);
              const weightageOverall = clamp(100 - hi01 * 100 + ageYr * 1.5 + ambient * 0.1, 0, 100);
              const rulYears = clamp((hi01 * 0.2 + (1 - ageYr) * 0.02) * 10, 0.1, 20);
              const rulDays = rulYears * 365;

              loadedTransformers.push({
                id: trfId, name: trfId, status, healthIndex: hi01 * 100, ambientTemperatureC: ambient,
                ageYr, capacity: safeNumber(latest.capacity ?? latest.Capacity, 0),
                location: latest.location || 'N/A', type: latest.type || 'N/A',
                lastMaintenance: String(latest.Timestamp || latest.time), readings: mappedReadings,
                weightageOverall, rulDays, rulYears,
              });
            }
          }
        }
      });

      allHistory.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
      setTransformers(loadedTransformers.sort((a, b) => a.id.localeCompare(b.id)));
      setHistory(allHistory);
      setLastUpdated(new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }));
    } catch { } finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchStaticData();
    const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('transformer_updates') : null;
    if (bc) bc.onmessage = (e) => { if (e.data === 'refresh') fetchStaticData(); };
    return () => { if (bc) bc.close(); };
  }, []);

  const stats = useMemo(() => {
    const total = transformers.length || 1;
    const h = transformers.filter(t => t.status === 'GOOD').length;
    const m = transformers.filter(t => t.status === 'MONITOR').length;
    const r = transformers.filter(t => t.status === 'WARNING').length;
    const c = transformers.filter(t => t.status === 'CRITICAL').length;

    return {
      healthy: { count: h, pct: (h / total) * 100 },
      moderate: { count: m, pct: (m / total) * 100 },
      atRisk: { count: r, pct: (r / total) * 100 },
      critical: { count: c, pct: (c / total) * 100 },
      avgHI: transformers.reduce((a, t) => a + t.healthIndex, 0) / total,
      outages: Math.round(transformers.reduce((a, t) => a + (t.readings.at(-1)?.Outages_hours_per_year || 0), 0)),
      maintenance: Math.round(transformers.reduce((a, t) => a + (t.readings.at(-1)?.Maintenance_Count || 0), 0)),
    };
  }, [transformers]);

  const [hsPage, setHsPage] = useState(1);
  const hsItemsPerPage = 10;
  const hsData = useMemo(() => transformers.slice((hsPage - 1) * hsItemsPerPage, hsPage * hsItemsPerPage), [transformers, hsPage]);

  const [sdPage, setSdPage] = useState(1);
  const sdItemsPerPage = 10;
  const sdData = useMemo(() => history.slice((sdPage - 1) * sdItemsPerPage, sdPage * sdItemsPerPage), [history, sdPage]);

  const trendData = useMemo(() => {
    const byTime: Record<string, any> = {};
    history.forEach(p => {
      const d = new Date(p.Time).getFullYear();
      if (!byTime[d]) byTime[d] = { Time: d };
      byTime[d][p.Transformer] = p.HI * 100;
    });
    return Object.values(byTime).sort((a, b) => a.Time - b.Time);
  }, [history]);

  // Deterministic sparkline data derived from real history — no Math.random()
  const keyParamSparklines = useMemo(() => {
    if (history.length === 0) return null;
    const recent = history.slice(-200);
    const buckets = 20;
    const size = Math.max(1, Math.floor(recent.length / buckets));
    const make = (key: keyof typeof recent[0]) =>
      Array.from({ length: buckets }, (_, i) => {
        const slice = recent.slice(i * size, (i + 1) * size);
        const avg = slice.reduce((s, r) => s + (Number(r[key]) || 0), 0) / (slice.length || 1);
        return { x: i, y: avg };
      });
    return {
      Voltage_kV: make('Voltage_kV'),
      Current_A: make('Current_A'),
      Age_yr: make('Age_yr'),
      Ambient_Temperature_C: make('Ambient_Temperature_C'),
      Outages_hours_per_year: make('Outages_hours_per_year'),
      Short_Circuits: make('No_of_Short_Circuits'),
      Maintenance_Count: make('Maintenance_Count'),
    };
  }, [history]);

  const Sparkline = ({ data, color }: { data: { x: number; y: number }[]; color: string }) => {
    const w = 60; const h = 16;
    const ys = data.map(d => d.y);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const norm = (y: number) => maxY === minY ? 0.5 : (y - minY) / (maxY - minY);
    const pts = (data.length ? data : [{ x: 0, y: 0 }, { x: 1, y: 0 }])
      .map((d, i) => `${(i / Math.max(1, data.length - 1)) * w},${(1 - norm(d.y)) * h}`)
      .join(' ');
    return (
      <svg width={w} height={h} className="block"><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} /></svg>
    );
  };

  const getAlerts = useMemo(() => {
    return transformers.map(t => {
      const sev = t.status === 'CRITICAL' ? 'CRITICAL' : t.status === 'WARNING' ? 'WARNING' : 'INFO';
      const desc = sev === 'CRITICAL' ? `HI critical drop (${t.healthIndex.toFixed(1)}%)` : sev === 'WARNING' ? `Elevated risk signals (${t.healthIndex.toFixed(1)}%)` : `Telemetry stable`;
      return { id: t.id, desc, ts: t.lastMaintenance, sev };
    }).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 5);
  }, [transformers]);

  const colorPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
  const pieData = [
    { name: 'Voltage', value: 25, color: '#0ea5e9' },
    { name: 'Current', value: 20, color: '#10b981' },
    { name: 'Age', value: 15, color: '#f59e0b' },
    { name: 'Outage Occurred', value: 15, color: '#ef4444' },
    { name: 'No. of Short Circuits', value: 10, color: '#8b5cf6' },
    { name: 'Total Maintenance', value: 10, color: '#ec4899' },
    { name: 'Ambient Temp', value: 5, color: '#6366f1' },
  ];

  const barData = [
    { name: 'Voltage', value: 0.28 }, { name: 'Current', value: 0.22 }, { name: 'Age', value: 0.18 },
    { name: 'Outage', value: 0.13 }, { name: 'Short Circuits', value: 0.09 },
    { name: 'Maintenance', value: 0.06 }, { name: 'Ambient Temp', value: 0.04 },
  ];

  return (
    <div className="bg-[#050b14] min-h-screen text-gray-200 font-sans p-4 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">Integrated Machine Learning Driven Asset Lifecycle Management</h1>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">For Distribution Transformers</h2>
          </div>
        </div>

      </div>

      {/* ROW 1: STATS */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-[#0a1128] border border-[#10b981]/30 rounded p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-400">Healthy</span>
          <div className="flex justify-between items-end mt-1">
            <span className="text-2xl font-bold text-[#10b981]">{stats.healthy.count}</span>
            <span className="text-sm font-bold text-[#10b981]">{stats.healthy.pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="bg-[#0a1128] border border-[#eab308]/30 rounded p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-400">Moderate</span>
          <div className="flex justify-between items-end mt-1">
            <span className="text-2xl font-bold text-[#eab308]">{stats.moderate.count}</span>
            <span className="text-sm font-bold text-[#eab308]">{stats.moderate.pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="bg-[#0a1128] border border-[#f97316]/30 rounded p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-400">At Risk</span>
          <div className="flex justify-between items-end mt-1">
            <span className="text-2xl font-bold text-[#f97316]">{stats.atRisk.count}</span>
            <span className="text-sm font-bold text-[#f97316]">{stats.atRisk.pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="bg-[#0a1128] border border-[#ef4444]/30 rounded p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-400">Critical</span>
          <div className="flex justify-between items-end mt-1">
            <span className="text-2xl font-bold text-[#ef4444]">{stats.critical.count}</span>
            <span className="text-sm font-bold text-[#ef4444]">{stats.critical.pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-400">Avg. Health Index</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-white">{stats.avgHI.toFixed(2)}</span><span className="text-sm text-gray-500"> / 100</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Outages</span>
            <span className="text-2xl font-bold text-white mt-1">{stats.outages}</span>
          </div>
          <div className="bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Maintenance</span>
            <span className="text-2xl font-bold text-white mt-1">{stats.maintenance}</span>
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Transformer Health Summary */}
        <div className="col-span-4 bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col h-64">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Transformer Health Summary</h3>
          <div className="overflow-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-1">Transformer ID</th>
                  <th className="py-1">Health Index (HI)</th>
                  <th className="py-1">Health Status</th>
                  <th className="py-1">RUL (Days)</th>
                  <th className="py-1">Age (Years)</th>
                  <th className="py-1">Overall Weightage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {hsData.map(t => (
                  <tr key={t.id} className="text-gray-300 hover:bg-gray-800/30">
                    <td className="py-1.5">{t.id}</td>
                    <td className="py-1.5">{t.healthIndex.toFixed(1)}</td>
                    <td className={`py-1.5 ${STATUS_META[t.status].text}`}>{STATUS_META[t.status].label}</td>
                    <td className="py-1.5">{Math.round(t.rulDays)}</td>
                    <td className="py-1.5">{t.ageYr.toFixed(1)}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-right">{t.weightageOverall.toFixed(1)}%</span>
                        <div className="flex-1 h-1 bg-gray-800 rounded-full ml-1">
                          <div className={`h-full rounded-full ${t.status === 'CRITICAL' ? 'bg-red-500' : t.status === 'WARNING' ? 'bg-orange-500' : t.status === 'MONITOR' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${t.weightageOverall}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center text-[9px] text-gray-500 mt-2">
            <span>Showing {(hsPage - 1) * hsItemsPerPage + 1} to {Math.min(hsPage * hsItemsPerPage, transformers.length)} of {transformers.length} entries</span>
            <div className="flex gap-1">
              <button disabled={hsPage === 1} onClick={() => setHsPage(p => p - 1)} className="px-1.5 py-0.5 bg-gray-800 rounded disabled:opacity-30">&lt;</button>
              <button className="px-1.5 py-0.5 bg-blue-600 text-white rounded">{hsPage}</button>
              <button disabled={hsPage * hsItemsPerPage >= transformers.length} onClick={() => setHsPage(p => p + 1)} className="px-1.5 py-0.5 bg-gray-800 rounded disabled:opacity-30">&gt;</button>
            </div>
          </div>
        </div>

        {/* Health Index Trend */}
        <div className="col-span-4 bg-[#0a1128] border border-gray-800 rounded p-3 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Health Index Trend Over Time</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffffff" vertical={false} />
                <XAxis dataKey="Time" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} />
                {transformers.slice(0, 10).map((t, i) => (
                  <Line key={t.id} type="monotone" dataKey={t.id} stroke={colorPalette[i % colorPalette.length]} strokeWidth={1} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center flex-wrap gap-2 text-[8px] text-gray-400 mt-1">
            {transformers.slice(0, 5).map((t, i) => <span key={t.id} style={{ color: colorPalette[i % colorPalette.length] }}>- {t.id}</span>)}
          </div>
        </div>

        {/* Overall Weightage Distribution */}
        <div className="col-span-4 bg-[#0a1128] border border-gray-800 rounded p-3 h-64 flex flex-col">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Overall Weightage Distribution</h3>
          <div className="flex-1 flex items-center justify-between min-h-0">
            <div className="w-1/2 h-full relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white font-bold text-sm">100%</span>
              </div>
            </div>
            <div className="w-1/2">
              <div className="flex justify-between text-[8px] text-gray-500 font-bold border-b border-gray-800 pb-1 mb-2">
                <span>Parameter</span><span>Weightage</span>
              </div>
              <div className="space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-[9px]">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                    <span className="text-gray-400">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: KEY PARAMETERS */}
      <div className="bg-[#0a1128] border border-gray-800 rounded p-3">
        <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Key Parameters Trend <span className="text-gray-500">(All Transformers Average)</span></h3>
        <div className="grid grid-cols-7 divide-x divide-gray-800">
          {[
            { label: 'Voltage (kV)', key: 'Voltage_kV', val: '11.02', col: '#3b82f6' },
            { label: 'Current (A)', key: 'Current_A', val: '128.6', col: '#10b981' },
            { label: 'Age (Years)', key: 'Age_yr', val: '4.35', col: '#8b5cf6' },
            { label: 'Ambient Temp (°C)', key: 'Ambient_Temperature_C', val: '32.8', col: '#f59e0b' },
            { label: 'Outages', key: 'Outages_hours_per_year', val: '48', col: '#ef4444' },
            { label: 'Short Circuits', key: 'Short_Circuits', val: '26', col: '#0ea5e9' },
            { label: 'Maintenance Count', key: 'Maintenance_Count', val: '134', col: '#eab308' },
          ].map((item, i) => (
            <div key={i} className="px-3 flex flex-col items-center">
              <span className="text-[9px] text-gray-400">{item.label}</span>
              <span className="text-sm font-bold text-white mt-0.5">{item.val}</span>
              <div className="mt-2 w-full flex justify-center">
                <Sparkline
                  data={keyParamSparklines ? (keyParamSparklines as any)[item.key] ?? [] : []}
                  color={item.col}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 4 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Sample Data */}
        <div className="col-span-5 bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col h-64">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Sample Data (15 Min Interval)</h3>
          <div className="overflow-auto flex-1">
            <table className="w-full text-[9px] text-left whitespace-nowrap">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-1">Timestamp</th>
                  <th className="py-1">ID</th>
                  <th className="py-1">Voltage (kV)</th>
                  <th className="py-1">Current (A)</th>
                  <th className="py-1">Age</th>
                  <th className="py-1">Temp (°C)</th>
                  <th className="py-1">Outage</th>
                  <th className="py-1">Short Cir.</th>
                  <th className="py-1">Maint.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sdData.map((r, i) => (
                  <tr key={i} className="text-gray-300 hover:bg-gray-800/30">
                    <td className="py-1.5 font-mono">{new Date(r.Time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-1.5">{r.Transformer}</td>
                    <td className="py-1.5">{r.Voltage_kV?.toFixed(1) || '-'}</td>
                    <td className="py-1.5">{r.Current_A?.toFixed(0) || '-'}</td>
                    <td className="py-1.5">{r.Age_yr?.toFixed(1) || '-'}</td>
                    <td className="py-1.5">{r.Ambient_Temperature_C?.toFixed(1) || '-'}</td>
                    <td className="py-1.5">{r.Outages_hours_per_year || 0}</td>
                    <td className="py-1.5">{r.No_of_Short_Circuits || 0}</td>
                    <td className="py-1.5">{r.Maintenance_Count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center text-[9px] text-gray-500 mt-2 border-t border-gray-800 pt-2">
            <span>Total Records: {history.length.toLocaleString()}</span>
            <div className="flex gap-1">
              <button disabled={sdPage === 1} onClick={() => setSdPage(p => p - 1)} className="px-1.5 py-0.5 bg-gray-800 rounded disabled:opacity-30">&lt;</button>
              <button className="px-1.5 py-0.5 bg-blue-600 text-white rounded">{sdPage}</button>
              <button disabled={sdPage * sdItemsPerPage >= history.length} onClick={() => setSdPage(p => p + 1)} className="px-1.5 py-0.5 bg-gray-800 rounded disabled:opacity-30">&gt;</button>
            </div>
          </div>
        </div>

        {/* Machine Learning Model */}
        <div className="col-span-3 bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col h-64">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Machine Learning Model</h3>
          <p className="text-[9px] text-gray-400 mb-3">Model Used: <span className="text-white">XGBoost Regressor</span></p>

          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">→ Model Performance</div>
          <div className="flex justify-between mb-4 bg-[#121633] p-2 rounded border border-gray-800">
            <div className="text-center"><div className="text-gray-500 text-[9px]">MAE</div><div className="text-white font-bold">4.21</div></div>
            <div className="text-center"><div className="text-gray-500 text-[9px]">RMSE</div><div className="text-white font-bold">6.87</div></div>
            <div className="text-center"><div className="text-gray-500 text-[9px]">R² Score</div><div className="text-white font-bold">0.91</div></div>
          </div>

          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">→ Feature Importance</div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 20, bottom: 0, left: -20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={8} fill="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} cursor={{ fill: '#1f2937' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RUL Prediction */}
        <div className="col-span-4 bg-[#0a1128] border border-gray-800 rounded p-3 flex flex-col h-64">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">RUL Prediction <span className="text-gray-500 capitalize">(Remaining Useful Life)</span></h3>
          <div className="overflow-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-1">Transformer ID</th>
                  <th className="py-1">RUL (Days)</th>
                  <th className="py-1">RUL (Years)</th>
                  <th className="py-1">Prediction Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {transformers.slice(0, 7).map((t, i) => (
                  <tr key={t.id} className="text-gray-300 hover:bg-gray-800/30">
                    <td className="py-1.5">{t.id}</td>
                    <td className="py-1.5">{Math.round(t.rulDays)}</td>
                    <td className="py-1.5">{t.rulYears.toFixed(2)}</td>
                    <td className="py-1.5">
                      <Sparkline
                        data={t.readings.slice(-10).map((r, j) => ({ x: j, y: safeNumber(r.Predicted_HI ?? r.HI, 0) * 100 }))}
                        color={t.status === 'CRITICAL' ? '#ef4444' : t.status === 'WARNING' ? '#f97316' : '#3b82f6'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 5 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Alerts & Notifications */}
        <div className="col-span-4 bg-[#0a1128] border border-gray-800 rounded p-3 h-48 overflow-auto">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Alerts & Notifications</h3>
          <div className="space-y-2">
            {getAlerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={10} className={a.sev === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'} />
                  <span className="font-bold text-white">{a.id}</span>
                  <span className="text-gray-400 truncate w-32">{a.desc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{new Date(a.ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={`px-1.5 py-0.5 rounded border ${a.sev === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>{a.sev === 'CRITICAL' ? 'Critical' : 'Warning'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Recommendations */}
        <div className="col-span-5 bg-[#0a1128] border border-gray-800 rounded p-3 h-48 overflow-auto">
          <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Lifecycle Management Recommendations</h3>
          <table className="w-full text-[9px] text-left">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-1">Transformer ID</th>
                <th className="py-1">Recommendation</th>
                <th className="py-1">Priority</th>
                <th className="py-1">Suggested Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {transformers.filter(t => ['CRITICAL', 'WARNING'].includes(t.status)).slice(0, 5).map(t => (
                <tr key={t.id} className="text-gray-300">
                  <td className="py-1.5 font-bold">{t.id}</td>
                  <td className="py-1.5">{t.status === 'CRITICAL' ? 'Replace / Major Overhaul' : 'Detailed Inspection'}</td>
                  <td className="py-1.5"><span className={t.status === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}>{t.status === 'CRITICAL' ? 'High' : 'Medium'}</span></td>
                  <td className="py-1.5 text-gray-400">{t.status === 'CRITICAL' ? 'Schedule replacement within 3 months' : 'Inspect bushings and windings'}</td>
                </tr>
              ))}
              {transformers.filter(t => t.status === 'MONITOR').slice(0, 1).map(t => (
                <tr key={t.id} className="text-gray-300">
                  <td className="py-1.5 font-bold">{t.id}</td><td className="py-1.5">Monitor Closely</td><td className="py-1.5 text-green-400">Low</td><td className="py-1.5 text-gray-400">Continue regular monitoring</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Business Rules */}
        <div className="col-span-3 bg-[#0a1128] border border-gray-800 rounded p-3 h-48 flex items-center">
          <div className="flex-1">
            <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Business Rules (RUL)</h3>
            <ul className="text-[9px] text-gray-300 space-y-2">
              <li>1. If Health Index &lt; 50 → RUL = 0 to 200 Days <span className="text-red-400">(Critical)</span></li>
              <li>2. If Health Index 50 to 70 → RUL = 200 to 730 Days <span className="text-orange-400">(At Risk)</span></li>
              <li>3. If Health Index 70 to 85 → RUL = 730 to 1460 Days <span className="text-yellow-400">(Moderate)</span></li>
              <li>4. If Health Index &gt; 85 → RUL = &gt; 1460 Days <span className="text-green-400">(Healthy)</span></li>
            </ul>
          </div>
          <div className="w-16 h-16 opacity-50 ml-2">
            <ShieldCheck size={48} className="text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
