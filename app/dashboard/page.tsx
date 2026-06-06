'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeInfo,
  Cpu,
  Droplet,
  RefreshCw,
  Search,
  ShieldCheck,
  Thermometer,
  Zap,
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
  Maintenance_Count?: number;
  Predicted_HI?: number;
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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedTransformer, setSelectedTransformer] = useState<TransformerMeta | null>(null);

  const fetchStaticData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const promises = Array.from({ length: 25 }, (_, i) => {
        const id = `T${i + 1}`;
        const tableName = `transformer_${i + 1}`;
        return supabase.from(tableName).select('*').then(({ data, error }: { data: any, error: any }) => {
          if (error) {
            // If the table doesn't exist, we don't treat it as a critical failure
            if (error.message && error.message.includes('schema cache')) {
              return { id, data: null, missing: true };
            }
            throw new Error(`Failed to load ${id}: ${error.message}`);
          }
          return { id, data };
        });
      });

      const results = await Promise.allSettled(promises);
      const loadedTransformers: TransformerMeta[] = [];
      const allHistory: TelemetryPoint[] = [];
      let failedCount = 0;

      results.forEach((result, idx) => {
        const trfId = toTransformerId(idx + 1);

        if (result.status === 'fulfilled') {
          if (result.value.missing) {
             // Silently ignore missing tables
             return;
          }
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
                Short_Circuits: safeNumber(r.Short_Circuits ?? r.short_circuits, safeNumber(latest.Short_Circuits ?? latest.short_circuits)),
              }));

              allHistory.push(...mappedReadings);

              const ambient = safeNumber(latest.Ambient_Temperature_C ?? latest.ambient_temperature_c, 0);
              const ageYr = safeNumber(latest.Age_yr ?? latest.age_yr, 0);

              const weightageOverall = clamp(100 - hi01 * 100 + ageYr * 1.5 + ambient * 0.1, 0, 100);
              const rulYears = clamp((hi01 * 0.2 + (1 - ageYr) * 0.02) * 10, 0.1, 20);
              const rulDays = rulYears * 365;

              loadedTransformers.push({
                id: trfId,
                name: trfId,
                status,
                healthIndex: hi01 * 100,
                ambientTemperatureC: ambient,
                ageYr,
                capacity: safeNumber(latest.capacity ?? latest.Capacity, 0),
                location: latest.location || latest.Location || 'Database Value Missing',
                type: latest.type || latest.Type || 'Database Value Missing',
                lastMaintenance: String(latest.Timestamp || latest.timestamp || latest.Time || latest.time),
                readings: mappedReadings,
                weightageOverall,
                rulDays,
                rulYears,
              });
            }
          } else {
             // Database query succeeded but no data returned
             console.warn(`No data found in ${trfId}`);
          }
        } else {
          failedCount++;
          console.error(`Failed to fetch ${toTransformerId(idx + 1)}:`, result.reason);
        }
      });

      allHistory.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
      setTransformers(loadedTransformers);
      setHistory(allHistory);
      setLastUpdated(new Date().toLocaleTimeString());

      if (failedCount === 25) {
        setError('All transformer datasets failed to load. Please verify the JSON files in the public directory.');
      } else if (failedCount > 0) {
        toast.error(`${failedCount} transformer files could not be loaded.`);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while loading data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaticData();
    const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('transformer_updates') : null;
    if (bc) {
      bc.onmessage = (event) => {
        if (event.data === 'refresh') fetchStaticData();
      };
    }

    const handleRefresh = () => fetchStaticData();
    window.addEventListener('refresh-dashboard', handleRefresh);

    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
      if (bc) bc.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executive = useMemo(() => {
    const counts = {
      healthy: transformers.filter((t) => t.status === 'GOOD').length,
      moderate: transformers.filter((t) => t.status === 'MONITOR').length,
      atRisk: transformers.filter((t) => t.status === 'WARNING').length,
      critical: transformers.filter((t) => t.status === 'CRITICAL').length,
    };
    const avgHI = transformers.length ? transformers.reduce((acc, t) => acc + t.healthIndex, 0) / transformers.length : 0;
    const totalOutages = Math.round(transformers.reduce((acc, t) => {
      const latest = t.readings[t.readings.length - 1];
      return acc + (latest?.Outages_hours_per_year || 0);
    }, 0));
    const totalMaintenance = Math.round(transformers.reduce((acc, t) => {
      const latest = t.readings[t.readings.length - 1];
      return acc + (latest?.Maintenance_Count ?? latest?.maintenance_count ?? 0);
    }, 0));

    return { ...counts, avgHI, totalOutages, totalMaintenance };
  }, [transformers]);

  const statusOrder: TransformerStatus[] = ['GOOD', 'MONITOR', 'WARNING', 'CRITICAL'];

  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'ALL' | TransformerStatus>('ALL');
  const [tableSortBy, setTableSortBy] = useState<'id' | 'hi' | 'status' | 'rulDays' | 'ageYr' | 'weightage'>('hi');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 25;

  const healthRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const filtered = transformers.filter((t) => {
      const statusOk = tableStatusFilter === 'ALL' ? true : t.status === tableStatusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
      );
    });

    const getStatusRank = (s: TransformerStatus) => statusOrder.indexOf(s);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (tableSortBy === 'id') cmp = a.id.localeCompare(b.id);
      else if (tableSortBy === 'hi') cmp = a.healthIndex - b.healthIndex;
      else if (tableSortBy === 'status') cmp = getStatusRank(a.status) - getStatusRank(b.status);
      else if (tableSortBy === 'rulDays') cmp = a.rulDays - b.rulDays;
      else if (tableSortBy === 'ageYr') cmp = a.ageYr - b.ageYr;
      else if (tableSortBy === 'weightage') cmp = a.weightageOverall - b.weightageOverall;
      return tableSortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [tableSearch, tableStatusFilter, tableSortBy, tableSortOrder, transformers]);

  const healthPageRows = useMemo(() => {
    const total = healthRows.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    const page = clamp(tablePage, 1, totalPages);
    const slice = healthRows.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    return { slice, totalPages };
  }, [healthRows, tablePage]);

  const miniTrend = useMemo(() => {
    const byTrf: Record<string, TelemetryPoint[]> = {};
    for (const p of history) {
      byTrf[p.Transformer] = byTrf[p.Transformer] || [];
      byTrf[p.Transformer].push(p);
    }
    Object.keys(byTrf).forEach((k) => byTrf[k].sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime()));
    return byTrf;
  }, [history]);

  const rulRows = useMemo(() => {
    return transformers
      .map((t) => {
        const pts = miniTrend[t.id] || [];
        const series = pts.slice(-14).map((p) => ({ x: new Date(p.Time).getTime(), y: safeNumber(p.HI, 0) * 100 }));
        return { t, series };
      })
      .sort((a, b) => b.t.rulDays - a.t.rulDays);
  }, [transformers, miniTrend]);

  const Sparkline = ({ data, color }: { data: { x: number; y: number }[]; color: string }) => {
    const w = 110;
    const h = 28;
    const ys = data.map((d) => d.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const norm = (y: number) => (maxY === minY ? 0.5 : (y - minY) / (maxY - minY));
    const pts = (data.length ? data : [{ x: 0, y: 0 }, { x: 1, y: 0 }])
      .map((d, i) => {
        const x = (i / Math.max(1, data.length - 1)) * w;
        const y = (1 - norm(d.y)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const lastY = data[data.length - 1]?.y ?? 0;

    return (
      <svg width={w} height={h} className="block" aria-hidden>
        <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
        <circle cx={w} cy={(1 - norm(lastY)) * h} r="2.2" fill={color} />
      </svg>
    );
  };

  const getAlerts = useMemo(() => {
    const latestByTrf: Record<string, TelemetryPoint> = {};
    for (const p of history) {
      if (!latestByTrf[p.Transformer]) latestByTrf[p.Transformer] = p;
      else if (new Date(p.Time).getTime() > new Date(latestByTrf[p.Transformer].Time).getTime()) latestByTrf[p.Transformer] = p;
    }

    const items: { id: string; description: string; timestamp: string; severity: 'CRITICAL' | 'WARNING' | 'INFO' }[] = [];
    for (const t of transformers) {
      const p = latestByTrf[t.id];
      const hi = t.healthIndex;
      const sev = t.status === 'CRITICAL' ? 'CRITICAL' : t.status === 'WARNING' ? 'WARNING' : 'INFO';
      const ts = p?.Time ? new Date(p.Time).toISOString() : new Date().toISOString();
      const description =
        sev === 'CRITICAL' ? `HI critical drop detected (HI=${hi.toFixed(1)}%).` : sev === 'WARNING' ? `Elevated risk signals observed (HI=${hi.toFixed(1)}%).` : `Telemetry update stable (HI=${hi.toFixed(1)}%).`;
      items.push({ id: t.id, description, timestamp: ts, severity: sev });
    }
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 30);
  }, [history, transformers]);

  const recommendations = useMemo(() => {
    const priorityColor = (p: 'High' | 'Medium' | 'Low') =>
      p === 'High' ? 'text-red-400 border-red-500/30 bg-red-500/10' : p === 'Medium' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-green-400 border-green-500/30 bg-green-500/10';

    const rows = transformers.map((t) => {
      if (t.status === 'CRITICAL') {
        return { id: t.id, recommendation: 'Immediate inspection & load shedding plan.', priority: 'High' as const, action: 'Schedule urgent on-site test + thermal imaging' };
      }
      if (t.status === 'WARNING') {
        return { id: t.id, recommendation: 'Increased monitoring and targeted maintenance.', priority: 'Medium' as const, action: 'Plan maintenance window + oil sampling' };
      }
      return { id: t.id, recommendation: 'Routine maintenance and continuous monitoring.', priority: 'Low' as const, action: 'Continue condition-based monitoring' };
    });

    return rows
      .sort((a, b) => (a.priority === b.priority ? a.id.localeCompare(b.id) : a.priority === 'High' ? -1 : a.priority === 'Medium' ? -1 : 1))
      .map((r) => ({ ...r, priorityColor: priorityColor(r.priority) }));
  }, [transformers]);

  return (
    <div className="p-6 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-primary neon-glow">
            <Cpu size={28} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl xl:text-2xl font-black tracking-tight text-white uppercase font-sans">Transformer Lifecycle AI Dashboard</h1>
            <p className="text-xs xl:text-sm font-semibold tracking-wider text-cyan-400 uppercase mt-0.5">Industrial Monitoring · Health & RUL Analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 bg-[#121633] border border-blue-500/10 rounded-lg px-3 py-2 shadow-inner">
            <span className="text-muted-foreground">Sync Time:</span>
            <span className="text-white font-bold">{lastUpdated || 'Never'}</span>
          </div>
          <button onClick={fetchStaticData} className="flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-bold transition-all active:scale-95">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Sync Datasets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Healthy</span>
          <h3 className="text-2xl xl:text-3xl font-black text-green-400 mt-1">{isLoading ? '—' : executive.healthy}</h3>
        </div>
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Moderate</span>
          <h3 className="text-2xl xl:text-3xl font-black text-yellow-400 mt-1">{isLoading ? '—' : executive.moderate}</h3>
        </div>
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">At Risk</span>
          <h3 className="text-2xl xl:text-3xl font-black text-orange-400 mt-1">{isLoading ? '—' : executive.atRisk}</h3>
        </div>
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Critical</span>
          <h3 className="text-2xl xl:text-3xl font-black text-red-400 mt-1">{isLoading ? '—' : executive.critical}</h3>
        </div>
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Avg Health Index</span>
          <h3 className="text-2xl xl:text-3xl font-black text-cyan-300 mt-1">{isLoading ? '—' : executive.avgHI.toFixed(2)}%</h3>
        </div>
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/50 shadow-md">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Maintenance</span>
          <h3 className="text-2xl xl:text-3xl font-black text-[#fbbf24] mt-1">{isLoading ? '—' : executive.totalMaintenance}</h3>
        </div>
      </div>

      {/* Panel 1 */}
      <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 shadow-md">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Transformer Health Summary</h2>
            <p className="text-xs text-muted-foreground mt-1">Search, sort, paginate · status badges · weightage progress</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTablePage(1);
                  setTableSearch(e.target.value);
                }}
                placeholder="Search TRF, type, location..."
                className="w-[320px] max-w-[70vw] bg-[#0a0e27] border border-blue-500/15 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-muted-foreground focus:outline-none focus:border-cyan-500/30 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              {([
                { key: 'ALL', label: 'All' },
                { key: 'CRITICAL', label: 'Critical' },
                { key: 'WARNING', label: 'Warning' },
                { key: 'GOOD', label: 'Healthy' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setTablePage(1);
                    setTableStatusFilter(opt.key === 'ALL' ? 'ALL' : (opt.key as TransformerStatus));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition-all active:scale-95 ${
                    opt.key === 'ALL' ? (tableStatusFilter === 'ALL' ? 'bg-blue-500/15 border-cyan-400/30 text-cyan-200' : 'bg-[#121633]/20 border-blue-500/10 text-muted-foreground hover:text-white') :
                    (tableStatusFilter === opt.key ? 'bg-blue-500/15 border-cyan-400/30 text-cyan-200' : 'bg-[#121633]/20 border-blue-500/10 text-muted-foreground hover:text-white')
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-blue-500/10 text-muted-foreground font-bold uppercase">
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('id'); setTableSortOrder(tableSortBy === 'id' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Transformer ID <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('hi'); setTableSortOrder(tableSortBy === 'hi' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Health Index (HI) <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('status'); setTableSortOrder(tableSortBy === 'status' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Health Status <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('rulDays'); setTableSortOrder(tableSortBy === 'rulDays' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  RUL (Days) <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('ageYr'); setTableSortOrder(tableSortBy === 'ageYr' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Age (Years) <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-3 px-2 cursor-pointer" onClick={() => { setTableSortBy('weightage'); setTableSortOrder(tableSortBy === 'weightage' && tableSortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Overall Weightage <ArrowUpDown size={12} className="inline ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5 text-white/90">
              {healthPageRows.slice.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-blue-500/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedTransformer(t)}
                >
                  <td className="py-3 px-2 font-bold">{t.id}</td>
                  <td className="py-3 px-2 font-extrabold">{t.healthIndex.toFixed(1)}%</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${STATUS_META[t.status].text} ${STATUS_META[t.status].bg} ${STATUS_META[t.status].border}`}>{STATUS_META[t.status].label}</span>
                  </td>
                  <td className="py-3 px-2 font-semibold">{Math.round(t.rulDays)}</td>
                  <td className="py-3 px-2 font-semibold">{t.ageYr.toFixed(2)}</td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                        <span>{t.weightageOverall.toFixed(0)}%</span>
                        <span>{t.weightageOverall >= 70 ? 'High' : t.weightageOverall >= 45 ? 'Medium' : 'Low'}</span>
                      </div>
                      <div className="h-2 bg-[#0a0e27] border border-blue-500/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${clamp(t.weightageOverall, 0, 100)}%`,
                            background:
                              t.status === 'CRITICAL'
                                ? '#ef4444'
                                : t.status === 'WARNING'
                                  ? '#f97316'
                                  : t.status === 'MONITOR'
                                    ? '#eab308'
                                    : '#10b981',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && healthPageRows.slice.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground font-bold">No matching transformers</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            disabled={tablePage <= 1}
            onClick={() => setTablePage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg disabled:opacity-30 transition-all"
          >
            Previous
          </button>
          <span className="text-muted-foreground font-semibold text-xs">
            Page {tablePage} of {healthPageRows.totalPages}
          </span>
          <button
            disabled={tablePage >= healthPageRows.totalPages}
            onClick={() => setTablePage((p) => Math.min(healthPageRows.totalPages, p + 1))}
            className="px-3.5 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg disabled:opacity-30 transition-all"
          >
            Next
          </button>
        </div>
      </div>

      {/* RUL + Alerts + Recommendations (kept minimal but functional) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 shadow-md xl:col-span-2">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Remaining Useful Life (RUL) Prediction</h3>
          <p className="text-xs text-muted-foreground mt-1">RUL table · trend sparkline</p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-blue-500/10 text-muted-foreground font-bold uppercase">
                  <th className="py-3 px-2">Transformer ID</th>
                  <th className="py-3 px-2">RUL (Days)</th>
                  <th className="py-3 px-2">RUL (Years)</th>
                  <th className="py-3 px-2">Prediction Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/5 text-white/90">
                {rulRows.map(({ t, series }) => (
                  <tr key={t.id} className="hover:bg-blue-500/5 transition-colors cursor-pointer" onClick={() => setSelectedTransformer(t)}>
                    <td className="py-3 px-2 font-bold">{t.id}</td>
                    <td className="py-3 px-2 font-semibold">{Math.round(t.rulDays)}</td>
                    <td className="py-3 px-2 font-semibold">{t.rulYears.toFixed(2)}</td>
                    <td className="py-3 px-2">
                      <Sparkline
                        data={series.map((s) => ({ x: s.x, y: s.y }))}
                        color={t.status === 'CRITICAL' ? '#ef4444' : t.status === 'WARNING' ? '#f97316' : t.status === 'MONITOR' ? '#eab308' : '#10b981'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 shadow-md">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Alerts & Notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time updates</p>
          <div className="mt-4 h-[520px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {getAlerts.map((a) => {
                const sevMeta =
                  a.severity === 'CRITICAL'
                    ? { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' }
                    : a.severity === 'WARNING'
                      ? { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
                      : { color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
                const icon = a.severity === 'CRITICAL' ? <AlertTriangle size={16} /> : a.severity === 'WARNING' ? <ShieldCheck size={16} /> : <BadgeInfo size={16} />;

                return (
                  <motion.div
                    key={`${a.id}-${a.timestamp}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-blue-500/10 bg-[#121633]/50 hover:border-cyan-400/30 transition-all"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-md border ${sevMeta.border} ${sevMeta.bg}`} style={{ color: sevMeta.color }}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-white text-[11px]">{a.id}</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${sevMeta.border} ${sevMeta.bg} text-white`} style={{ color: sevMeta.color }}>
                          {a.severity === 'CRITICAL' ? 'Critical' : a.severity === 'WARNING' ? 'Warning' : 'Info'}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-1">{a.description}</div>
                      <div className="text-[10px] text-muted-foreground mt-2 font-semibold">{new Date(a.timestamp).toLocaleString()}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 shadow-md">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Lifecycle Management Recommendations</h3>
        <p className="text-xs text-muted-foreground mt-1">Enterprise asset management dashboard style</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-blue-500/10 text-muted-foreground font-bold uppercase">
                <th className="py-3 px-2">Transformer ID</th>
                <th className="py-3 px-2">Recommendation</th>
                <th className="py-3 px-2">Priority</th>
                <th className="py-3 px-2">Suggested Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5 text-white/90">
              {recommendations.map((r) => (
                <tr key={r.id} className="hover:bg-blue-500/5 transition-colors cursor-pointer" onClick={() => setSelectedTransformer(transformers.find((t) => t.id === r.id) || null)}>
                  <td className="py-3 px-2 font-bold">{r.id}</td>
                  <td className="py-3 px-2 text-muted-foreground">{r.recommendation}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${r.priorityColor}`}>{r.priority}</span>
                  </td>
                  <td className="py-3 px-2 text-white font-semibold">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedTransformer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glassmorphism rounded-xl border border-blue-500/20 bg-[#0f1429] p-6 max-w-2xl w-full relative shadow-2xl space-y-6"
            >
              <button
                onClick={() => setSelectedTransformer(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/20 border border-blue-500/10 text-white cursor-pointer transition-all"
              >
                ✕
              </button>

              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-primary neon-glow">
                      <Cpu size={24} className="text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl font-black text-white">{selectedTransformer.id} Details</h2>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${STATUS_META[selectedTransformer.status].text} ${STATUS_META[selectedTransformer.status].bg} ${STATUS_META[selectedTransformer.status].border}`}
                        >
                          {STATUS_META[selectedTransformer.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {selectedTransformer.location} &bull; {selectedTransformer.type}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                    <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Health Index</p>
                      <p className="text-xl font-black text-cyan-300 mt-1">{selectedTransformer.healthIndex.toFixed(1)}%</p>
                    </div>
                    <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">RUL (Years)</p>
                      <p className="text-xl font-black text-green-400 mt-1">{selectedTransformer.rulYears.toFixed(1)}</p>
                    </div>
                    <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Age</p>
                      <p className="text-xl font-black text-white mt-1">{selectedTransformer.ageYr.toFixed(2)} Years</p>
                    </div>
                    <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Overall Weightage</p>
                      <p className="text-xl font-black text-white mt-1">{selectedTransformer.weightageOverall.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Telemetry Diagnostic Matrix</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-[#121633]/30 p-2.5 rounded border border-blue-500/5">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Thermometer size={14} className="text-orange-400" /> Ambient Temp:
                          </span>
                          <span className="text-white font-bold">{selectedTransformer.ambientTemperatureC.toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#121633]/30 p-2.5 rounded border border-blue-500/5">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Zap size={14} className="text-cyan-400" /> Winding Current:
                          </span>
                          <span className="text-white font-bold">
                            {selectedTransformer.readings?.[selectedTransformer.readings.length - 1]?.Current_A?.toFixed(1) || 'N/A'} A
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-[#121633]/30 p-2.5 rounded border border-blue-500/5">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Droplet size={14} className="text-blue-400" /> Winding Voltage:
                          </span>
                          <span className="text-white font-bold">
                            {selectedTransformer.readings?.[selectedTransformer.readings.length - 1]?.Voltage_kV?.toFixed(3) || 'N/A'} kV
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#121633]/30 p-2.5 rounded border border-blue-500/5">
                          <span className="text-muted-foreground flex items-center gap-1">Outages:</span>
                          <span className="text-white font-bold">
                            {selectedTransformer.readings?.[selectedTransformer.readings.length - 1]?.Outages_hours_per_year?.toFixed(1) || 'N/A'} hr/yr
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-blue-500/10 pt-4 text-xs font-bold">
                    <button
                      onClick={() => setSelectedTransformer(null)}
                      className="px-4 py-2 bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/10 text-white rounded-lg transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-6 border border-red-500/20 bg-red-500/10 rounded-xl flex items-center gap-3 text-red-300">
          <AlertTriangle className="flex-shrink-0" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

