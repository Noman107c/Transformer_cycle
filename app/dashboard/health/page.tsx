'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  Radio, 
  Thermometer, 
  Droplet, 
  Gauge, 
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const HI_FAILURE = 0.55;
const HI_WARNING = 0.70;
const HI_MONITOR = 0.80;

const getStatusColor = (hi: number) => {
  if (hi < HI_FAILURE) {
    return { label: 'CRITICAL', color: 'text-red-400 border-red-500/20 bg-red-500/5', led: 'bg-red-500' };
  }
  if (hi < HI_WARNING) {
    return { label: 'WARNING', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', led: 'bg-yellow-500' };
  }
  if (hi < HI_MONITOR) {
    return { label: 'MONITOR', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', led: 'bg-orange-500' };
  }
  return { label: 'GOOD', color: 'text-green-400 border-green-500/20 bg-green-500/5', led: 'bg-green-500' };
};

export default function HealthPage() {
  const { data: transformersData, isLoading: isLoadingTransformers } = useSWR('/api/transformers?limit=100', fetcher);
  const transformers = transformersData?.data || [];
  
  const [selectedTrfId, setSelectedTrfId] = useState('');

  // Auto-select first transformer if not set
  useEffect(() => {
    if (!selectedTrfId && transformers.length > 0) {
      setSelectedTrfId(transformers[0]._id);
    }
  }, [transformers, selectedTrfId]);

  const selectedTransformer = transformers.find((t: any) => t._id === selectedTrfId) || {};
  
  const hi = selectedTransformer.healthIndex || 0;
  const temp = selectedTransformer.ambientTemperatureC || 0;
  
  // These were mocked, falling back to 0 or estimates if not in DB
  const oil = 95.4; 
  const insulation = 96.5;
  const furan = 12.3;

  const { label, color, led } = getStatusColor(hi);

  const makeGaugeData = (val: number, colorStr: string) => [
    { name: 'val', value: val, fill: colorStr }
  ];

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="text-cyan-400 animate-pulse" size={28} /> Health Monitoring
          </h1>
          <p className="text-muted-foreground text-sm">Real-time parameters monitoring, radial diagnostic gauges</p>
        </div>

        {/* Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-muted-foreground uppercase">Select Asset:</span>
          {isLoadingTransformers ? (
             <span className="text-white text-xs">Loading...</span>
          ) : (
            <select 
              value={selectedTrfId}
              onChange={(e) => setSelectedTrfId(e.target.value)}
              className="bg-[#121633] border border-blue-500/15 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30 shadow-inner cursor-pointer"
            >
              {transformers.map((trf: any) => (
                <option key={trf._id} value={trf._id}>{trf.transformerId} ({trf.name})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Asset Overview Ribbon */}
      <div className="glassmorphism p-5 rounded-lg border border-blue-500/10 bg-[#151a37]/35 flex flex-wrap items-center justify-between gap-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-primary neon-glow">
            <Cpu size={24} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase">{selectedTransformer.transformerId || 'N/A'} Status Monitor</h2>
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mt-0.5">Asset ID Reference</p>
          </div>
        </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Health Index Score</p>
              <p className="text-2xl font-black text-white">{(hi * 100).toFixed(1)}%</p>
            </div>

          <div className={`px-4 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold ${color}`}>
            <span className={`w-2 h-2 rounded-full ${led} animate-pulse`} />
            {label}
          </div>
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Winding Temp Gauge */}
        <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col items-center justify-between relative overflow-hidden">
          <Thermometer className="absolute top-4 right-4 text-orange-400/20" size={32} />
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 self-start">Winding Temp</h3>
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={makeGaugeData(temp, '#f97316')} startAngle={180} endAngle={0}>
                <PolarAngleAxis type="number" domain={[0, 120]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-2xl font-black text-white">{temp}°C</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">Limit: 90°C</span>
            </div>
          </div>
        </div>

        {/* Oil Level Gauge */}
        <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col items-center justify-between relative overflow-hidden">
          <Droplet className="absolute top-4 right-4 text-cyan-400/20" size={32} />
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 self-start">Oil Insulation</h3>
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={makeGaugeData(oil, '#06b6d4')} startAngle={180} endAngle={0}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-2xl font-black text-white">{oil}%</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">Limit: &gt;60%</span>
            </div>
          </div>
        </div>

        {/* Insulation Resistance */}
        <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col items-center justify-between relative overflow-hidden">
          <Gauge className="absolute top-4 right-4 text-green-400/20" size={32} />
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 self-start">Insulation Resistance</h3>
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={makeGaugeData(insulation, '#10b981')} startAngle={180} endAngle={0}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-2xl font-black text-white">{insulation} M&Omega;</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">Limit: &gt;50 M&Omega;</span>
            </div>
          </div>
        </div>

        {/* Furan Content */}
        <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col items-center justify-between relative overflow-hidden">
          <AlertTriangle className="absolute top-4 right-4 text-purple-400/20" size={32} />
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 self-start">Furan Gas Content</h3>
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={makeGaugeData(furan, '#a855f7')} startAngle={180} endAngle={0}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-2xl font-black text-white">{furan} ppm</span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">Limit: &lt;50 ppm</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
