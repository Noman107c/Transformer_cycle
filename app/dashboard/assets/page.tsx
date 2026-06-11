'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Activity, 
  Thermometer, 
  Droplet, 
  X, 
  Zap, 
  Calendar,
  Cpu,
  Loader2
} from 'lucide-react';

export default function AssetDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTransformer, setSelectedTransformer] = useState<any>(null);
  const [selectedDetails, setSelectedDetails] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [transformersData, setTransformersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transformers?limit=100');
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map((t: any) => {
          const hiPct = (t.healthIndex || 0.8) * 100;
          let displayStatus = 'Healthy';
          if (t.status === 'CRITICAL') displayStatus = 'Critical';
          else if (t.status === 'WARNING') displayStatus = 'At Risk';
          else if (t.status === 'MONITOR') displayStatus = 'Moderate';
          
          return {
            id: t._id, // T1, T2 etc.
            displayId: t.transformerId || `TRF-${t._id.substring(1)}`,
            location: t.location || 'Unknown Substation',
            type: t.type || 'Distribution',
            capacity: t.capacity || 50,
            hi: parseFloat(hiPct.toFixed(1)),
            status: displayStatus,
            temp: t.ambientTemperatureC || 40,
            age: t.ageYr || 3.0,
            lastMaint: t.lastMaintenance ? new Date(t.lastMaintenance).toLocaleDateString() : 'N/A',
          };
        });
        setTransformersData(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCardClick = async (transformer: any) => {
    setSelectedTransformer(transformer);
    setDetailsLoading(true);
    setSelectedDetails([]);
    try {
      const response = await fetch(`/api/admin/transformers/${transformer.id}/data`);
      if (response.ok) {
        const jsonRes = await response.json();
        let data = jsonRes.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const times = data.map((r: any) => new Date(r.Time).getTime());
          const maxTime = Math.max(...times);
          const oneYearAgo = maxTime - 365 * 24 * 60 * 60 * 1000;
          data = data.filter((r: any) => new Date(r.Time).getTime() >= oneYearAgo);
        }
        setSelectedDetails(Array.isArray(data) ? data.slice(-5) : []);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30';
      case 'Moderate': return 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/30';
      case 'At Risk': return 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/30';
      case 'Critical': return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const getHealthBarColor = (score: number) => {
    if (score >= 85) return 'bg-[#10b981]';
    if (score >= 70) return 'bg-[#eab308]';
    if (score >= 55) return 'bg-[#f97316]';
    return 'bg-[#ef4444]';
  };

  const filteredTransformers = transformersData.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="text-cyan-400 animate-pulse" size={28} /> Asset Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Full fleet inventory and comprehensive detail breakdown</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search ID, location, type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#121633] border border-blue-500/10 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-muted-foreground focus:outline-none focus:border-cyan-500/30 w-60 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Healthy', 'Moderate', 'At Risk', 'Critical'].map((tab) => {
          const count = tab === 'All' ? transformersData.length : transformersData.filter(t => t.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer ${
                statusFilter === tab 
                  ? 'bg-blue-600 border-blue-500 text-white neon-glow' 
                  : 'bg-[#121633] border-blue-500/5 text-muted-foreground hover:text-white'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid of Transformer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glassmorphism rounded-xl border border-blue-500/5 p-5 bg-[#151a37]/35 space-y-4 animate-pulse h-[200px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredTransformers.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleCardClick(item)}
                className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 hover:border-cyan-500/30 transition-all duration-300 shadow-md group cursor-pointer hover:shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* ID & Status */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg text-white group-hover:text-cyan-300 transition-colors">{item.id}</span>
                      <span className="text-[9px] font-bold text-muted-foreground bg-[#0a0e27] px-2 py-0.5 rounded border border-blue-500/5">{item.type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={13} className="text-cyan-400" />
                    <span className="font-semibold">{item.location}</span>
                  </div>

                  {/* Health Score Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-semibold">Health Score</span>
                      <span className="text-white font-extrabold">{item.hi}%</span>
                    </div>
                    <div className="h-2 bg-[#0a0e27] rounded-full overflow-hidden border border-blue-500/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getHealthBarColor(item.hi)}`} 
                        style={{ width: `${item.hi}%` }}
                      />
                    </div>
                  </div>

                  {/* Core Parameters Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-semibold border-t border-blue-500/5">
                    <div className="flex items-center gap-2">
                      <Thermometer size={14} className="text-orange-400" />
                      <div>
                        <p className="text-[9px] text-muted-foreground leading-none">Temp</p>
                        <p className="text-white font-bold mt-0.5">{item.temp.toFixed(1)}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-cyan-400" />
                      <div>
                        <p className="text-[9px] text-muted-foreground leading-none">Capacity</p>
                        <p className="text-white font-bold mt-0.5">{item.capacity} kVA</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-blue-500/5 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <div className="flex items-center gap-1">
                    <Calendar size={11} className="text-cyan-400" />
                    <span>Last Maint: {item.lastMaint}</span>
                  </div>
                  <span className="text-cyan-400 group-hover:underline transition-all">View Details &rarr;</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedTransformer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glassmorphism rounded-xl border border-blue-500/20 bg-[#0f1429] p-6 max-w-2xl w-full relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedTransformer(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/25 border border-blue-500/10 text-white cursor-pointer transition-all"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-primary neon-glow">
                  <Activity size={24} className="text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-black text-white">{selectedTransformer.id} ({selectedTransformer.displayId})</h2>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${getStatusColor(selectedTransformer.status)}`}>
                      {selectedTransformer.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">{selectedTransformer.location} &bull; {selectedTransformer.type}</p>
                </div>
              </div>

              {/* Modal Core Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* Health Index */}
                <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Health Index</p>
                  <p className="text-xl font-black text-cyan-300 mt-1">{selectedTransformer.hi}%</p>
                </div>

                {/* Capacity */}
                <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Capacity</p>
                  <p className="text-xl font-black text-white mt-1">{selectedTransformer.capacity} kVA</p>
                </div>

                {/* Age */}
                <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Age</p>
                  <p className="text-xl font-black text-white mt-1">{selectedTransformer.age} Years</p>
                </div>

                {/* RUL Estimate */}
                <div className="bg-[#121633]/60 border border-blue-500/5 rounded-lg p-3 text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">RUL Estimate</p>
                  <p className="text-xl font-black text-green-400 mt-1">{(selectedTransformer.hi * 0.2).toFixed(1)} Yrs</p>
                </div>

              </div>

              {/* Detailed Technical Parameters */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Telemetry Diagnostic History (Last 5 Readings)</h3>
                
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-cyan-400" size={24} />
                    <span className="text-xs text-muted-foreground ml-2">Loading detailed historical file...</span>
                  </div>
                ) : selectedDetails.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No detailed log history found for this transformer.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] font-mono whitespace-nowrap text-white/90">
                      <thead>
                        <tr className="border-b border-blue-500/15 text-muted-foreground font-bold font-sans">
                          <th className="pb-1">Timestamp</th>
                          <th className="pb-1 text-center">Temp (°C)</th>
                          <th className="pb-1 text-center">Current (A)</th>
                          <th className="pb-1 text-center">Voltage (kV)</th>
                          <th className="pb-1 text-center">Outages (hr/yr)</th>
                          <th className="pb-1 text-center">HI Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-500/5">
                        {selectedDetails.map((reading, idx) => (
                          <tr key={idx} className="hover:bg-blue-500/5">
                            <td className="py-2">{reading.Time}</td>
                            <td className="py-2 text-center text-orange-400 font-bold">{Number(reading.Ambient_Temperature_C).toFixed(1)}°C</td>
                            <td className="py-2 text-center">{Number(reading.Current_A).toFixed(1)} A</td>
                            <td className="py-2 text-center">{Number(reading.Voltage_kV).toFixed(3)} kV</td>
                            <td className="py-2 text-center">{Number(reading.Outages_hours_per_year).toFixed(1)}</td>
                            <td className={`py-2 text-center font-bold ${reading.HI >= 0.8 ? 'text-green-400' : reading.HI >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>{Number(reading.HI).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Links */}
              <div className="flex justify-end gap-3 border-t border-blue-500/10 pt-4 text-xs font-bold font-sans">
                <button 
                  onClick={() => setSelectedTransformer(null)}
                  className="px-4 py-2 bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/10 text-white rounded-lg cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
