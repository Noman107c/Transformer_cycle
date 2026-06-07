'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  BarChart3, RefreshCw, TrendingUp, TrendingDown, Activity,
  Zap, Thermometer, Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

type Transformer = {
  id: string;
  name: string;
  status: string;
  is_active: boolean;
};

type Reading = {
  Timestamp: string;
  HI: number;
  Predicted_HI: number;
  Ambient_Temperature_C: number;
  Current_A: number;
  Voltage_kV: number;
  Age_yr: number;
  Outages_hours_per_year: number;
  Maintenance_Count: number;
  No_of_Short_Circuits: number;
};

const STATUS_COLORS: Record<string, string> = {
  GOOD: '#10b981', MONITOR: '#eab308', WARNING: '#f97316', CRITICAL: '#ef4444',
};
const PIE_COLORS = ['#10b981', '#eab308', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [allReadings, setAllReadings] = useState<{ id: string; readings: Reading[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const metaRes = await fetch('/api/admin/transformers');
      const metaJson = await metaRes.json();
      if (!metaJson.success) throw new Error('Failed to load transformers');
      const tList: Transformer[] = metaJson.data.filter((t: any) => t.is_active);
      setTransformers(tList);

      // Fetch latest 50 readings per transformer (top 8 for performance)
      const results = await Promise.allSettled(
        tList.slice(0, 8).map(async (t) => {
          const numId = t.id.match(/\d+/)?.[0] ?? t.id;
          const res = await fetch(`/api/admin/transformers/${numId}/data`);
          const json = await res.json();
          return { id: t.id, readings: json.success ? (json.data as Reading[]).slice(0, 50) : [] };
        })
      );

      const loaded = results
        .filter((r): r is PromiseFulfilledResult<{ id: string; readings: Reading[] }> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.readings.length > 0);

      setAllReadings(loaded);
      if (loaded.length > 0) setSelectedId(loaded[0].id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selected = allReadings.find(r => r.id === selectedId);

  // Aggregate stats
  const statusCounts = ['GOOD', 'MONITOR', 'WARNING', 'CRITICAL'].map(s => ({
    name: s, value: transformers.filter(t => t.status === s).length,
  }));

  const avgHI = allReadings.length
    ? allReadings.reduce((sum, r) => {
        const latest = r.readings[0];
        return sum + (latest ? Number(latest.HI) || 0 : 0);
      }, 0) / allReadings.length
    : 0;

  const criticalCount = transformers.filter(t => t.status === 'CRITICAL').length;

  // Selected transformer trend (latest 20 readings reversed for chronological order)
  const trendData = selected
    ? [...selected.readings].slice(0, 20).reverse().map((r, i) => ({
        idx: i + 1,
        HI: parseFloat((Number(r.HI) * 100).toFixed(2)),
        Predicted: parseFloat((Number(r.Predicted_HI) * 100).toFixed(2)),
        Temp: parseFloat((Number(r.Ambient_Temperature_C)).toFixed(1)),
        Current: parseFloat((Number(r.Current_A)).toFixed(1)),
        Voltage: parseFloat((Number(r.Voltage_kV)).toFixed(2)),
      }))
    : [];

  // Per-transformer latest HI bar data
  const hiBarData = allReadings.map(r => ({
    id: r.id,
    HI: parseFloat((Number(r.readings[0]?.HI ?? 0) * 100).toFixed(1)),
    status: transformers.find(t => t.id === r.id)?.status ?? 'GOOD',
  }));

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <BarChart3 className="text-purple-500" size={32} /> Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time health & performance analytics from database</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Transformers', value: transformers.length, icon: Activity, color: 'text-blue-400', border: 'border-blue-500/20' },
            { label: 'Avg Health Index', value: loading ? '—' : `${(avgHI * 100).toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Critical Units', value: criticalCount, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
            { label: 'Active Units', value: transformers.filter(t => t.is_active).length, icon: CheckCircle2, color: 'text-cyan-400', border: 'border-cyan-500/20' },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`bg-gray-900 border ${k.border} rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase">{k.label}</span>
                  <Icon size={18} className={k.color} />
                </div>
                <p className={`text-3xl font-black ${k.color}`}>{loading ? '—' : k.value}</p>
              </div>
            );
          })}
        </div>

        {/* Row 2: HI Bar Chart + Pie */}
        <div className="grid grid-cols-12 gap-4">
          {/* Health Index per Transformer */}
          <div className="col-span-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" /> Health Index by Transformer (Latest Reading)
            </h2>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">
                <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hiBarData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="id" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px' }}
                    formatter={(v: any) => [`${v}%`, 'Health Index']}
                  />
                  <Bar dataKey="HI" radius={[4, 4, 0, 0]} barSize={22}>
                    {hiBarData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Distribution Pie */}
          <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Status Distribution</h2>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">
                <RefreshCw size={20} className="animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie 
                    data={statusCounts} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value" 
                    nameKey="name"
                    stroke="none"
                  >
                    {statusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px', fontSize: '12px' }} 
                    itemStyle={{ color: '#e5e7eb' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#d1d5db', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Detailed Trend: Selected Transformer */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" /> Detailed Trend — Last 20 Readings
            </h2>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              {allReadings.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
            </select>
          </div>

          {loading || !trendData.length ? (
            <div className="h-52 flex items-center justify-center text-gray-500">
              {loading ? <><RefreshCw size={20} className="animate-spin mr-2" /> Loading...</> : 'No data available'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* HI vs Predicted */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Health Index vs Predicted HI</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="idx" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} label={{ value: 'Reading #', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 9 }} />
                    <YAxis stroke="#4b5563" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="HI" stroke="#10b981" strokeWidth={2} dot={false} name="Actual HI" />
                    <Line type="monotone" dataKey="Predicted" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Predicted HI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Current & Voltage */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Current (A) & Voltage (kV)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="idx" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Current" stroke="#f59e0b" strokeWidth={2} dot={false} name="Current (A)" />
                    <Line type="monotone" dataKey="Voltage" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Voltage (kV)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Temperature */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Ambient Temperature (°C)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="idx" stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Temp" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Latest Reading Table */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Latest Readings Summary</p>
                <div className="space-y-2">
                  {selected && selected.readings[0] && [
                    { label: 'Health Index', value: `${(Number(selected.readings[0].HI) * 100).toFixed(2)}%`, icon: TrendingUp, color: 'text-emerald-400' },
                    { label: 'Predicted HI', value: `${(Number(selected.readings[0].Predicted_HI) * 100).toFixed(2)}%`, icon: TrendingDown, color: 'text-purple-400' },
                    { label: 'Current (A)', value: `${Number(selected.readings[0].Current_A).toFixed(1)} A`, icon: Zap, color: 'text-yellow-400' },
                    { label: 'Voltage (kV)', value: `${Number(selected.readings[0].Voltage_kV).toFixed(2)} kV`, icon: Activity, color: 'text-blue-400' },
                    { label: 'Amb. Temp', value: `${Number(selected.readings[0].Ambient_Temperature_C).toFixed(1)} °C`, icon: Thermometer, color: 'text-red-400' },
                    { label: 'Age (yr)', value: `${Number(selected.readings[0].Age_yr).toFixed(2)} yr`, icon: Clock, color: 'text-gray-400' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                        <span className="flex items-center gap-2 text-xs text-gray-400">
                          <Icon size={12} className={item.color} /> {item.label}
                        </span>
                        <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
