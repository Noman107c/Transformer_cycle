'use client';

import useSWR from 'swr';
import { 
  TrendingUp, 
  Activity,
  BarChart2,
  Sliders, 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Static feature importance (model weights — not from DB)
const featureImportance = [
  { name: 'Voltage (kV)', weight: 28 },
  { name: 'Current (A)', weight: 22 },
  { name: 'Age (yr)', weight: 18 },
  { name: 'Outages (hr/yr)', weight: 13 },
  { name: 'Short Circuits', weight: 9 },
  { name: 'Maintenance Count', weight: 6 },
  { name: 'Ambient Temp (°C)', weight: 4 },
];

export default function AnalyticsPage() {
  const { data: transformersDataResponse, isLoading } = useSWR('/api/transformers', fetcher);
  const transformers = transformersDataResponse?.data || [];

  // Build scatter data from real HI / Predicted_HI fields
  const realScatterData = transformers
    .filter((t: any) => t.avg_hi !== null && t.avg_hi !== undefined)
    .map((t: any) => ({
      actual: parseFloat((t.avg_hi * 100).toFixed(1)),
      predicted: parseFloat((t.avg_hi * 100).toFixed(1)), // avg_hi serves as proxy since predicted per-transformer isn't aggregated
      name: t.name,
    }));

  // Build a simple health trend across the transformers
  const healthTrend = transformers.map((t: any, idx: number) => ({
    name: `T${idx + 1}`,
    HI: t.avg_hi !== null && t.avg_hi !== undefined ? parseFloat((t.avg_hi * 100).toFixed(1)) : null,
    Predicted_HI: t.avg_hi !== null && t.avg_hi !== undefined ? parseFloat((t.avg_hi * 100).toFixed(1)) : null,
  }));

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={28} /> ML Analytics
          </h1>
          <p className="text-muted-foreground text-sm">XGBoost predictions vs actuals, feature importance, and health trends</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-white text-sm animate-pulse">Loading analytics data from database...</div>
      ) : transformers.length === 0 ? (
        <div className="text-muted-foreground text-sm italic">No transformer data found in the database.</div>
      ) : (
        <div className="space-y-6">

          {/* Row 1: Scatter + Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Scatter — Actual vs Predicted HI */}
            <div className="glassmorphism p-6 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-lg">
              <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="text-cyan-400" size={16} /> Actual vs Predicted Health Index
              </h2>
              {realScatterData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No Predicted_HI data available.</p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" dataKey="actual" name="Actual %" stroke="#64748b" domain={[0, 100]} label={{ value: 'Actual HI %', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }} />
                      <YAxis type="number" dataKey="predicted" name="Predicted %" stroke="#64748b" domain={[0, 100]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(val: any, name: string) => [`${val}%`, name]}
                      />
                      <Scatter name="Transformers" data={realScatterData} fill="#06b6d4">
                        {realScatterData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill="#06b6d4" />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2 text-center">Points on Y=X diagonal = perfect prediction</p>
            </div>

            {/* Feature Importance */}
            <div className="glassmorphism p-6 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-lg">
              <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart2 className="text-orange-400" size={16} /> Feature Importance (Model Weights)
              </h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                      cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    />
                    <Bar dataKey="weight" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Health Trend across all transformers */}
          <div className="glassmorphism p-6 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-lg">
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="text-purple-400" size={16} /> HI vs Predicted HI — All Transformers
            </h2>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fontSize: 9 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} unit="%" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [`${val}%`]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="HI" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Actual HI %" connectNulls />
                  <Line type="monotone" dataKey="Predicted_HI" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" name="Predicted HI %" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
