'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Search, 
  Download, 
  Calendar, 
  Cpu, 
  FileJson, 
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

const initialSensorsData = [
  { timestamp: '12-May-2024 10:30', trfId: 'TRF-01', voltage: 11.02, current: 128.6, temp: 42.1, oil: 95.4, insulation: 96.5, furan: 12.3, vibration: 2.1 },
  { timestamp: '12-May-2024 10:15', trfId: 'TRF-01', voltage: 11.10, current: 125.4, temp: 42.0, oil: 95.5, insulation: 96.5, furan: 12.3, vibration: 2.0 },
  { timestamp: '12-May-2024 10:00', trfId: 'TRF-02', voltage: 11.20, current: 142.1, temp: 45.8, oil: 91.0, insulation: 90.0, furan: 15.8, vibration: 2.3 },
  { timestamp: '12-May-2024 09:45', trfId: 'TRF-03', voltage: 10.98, current: 135.2, temp: 58.2, oil: 82.8, insulation: 82.5, furan: 28.1, vibration: 3.1 },
  { timestamp: '12-May-2024 09:30', trfId: 'TRF-04', voltage: 11.05, current: 120.4, temp: 61.9, oil: 79.4, insulation: 78.8, furan: 31.0, vibration: 2.8 },
  { timestamp: '12-May-2024 09:15', trfId: 'TRF-09', voltage: 10.82, current: 158.4, temp: 85.2, oil: 49.2, insulation: 42.5, furan: 72.0, vibration: 4.5 },
  { timestamp: '12-May-2024 09:00', trfId: 'TRF-10', voltage: 10.75, current: 162.1, temp: 88.9, oil: 42.5, insulation: 36.1, furan: 78.4, vibration: 5.2 },
  { timestamp: '12-May-2024 08:45', trfId: 'TRF-01', voltage: 11.08, current: 126.8, temp: 41.8, oil: 95.6, insulation: 96.8, furan: 12.2, vibration: 1.9 },
  { timestamp: '12-May-2024 08:30', trfId: 'TRF-02', voltage: 11.18, current: 140.2, temp: 45.4, oil: 91.2, insulation: 90.2, furan: 15.7, vibration: 2.2 },
  { timestamp: '12-May-2024 08:15', trfId: 'TRF-06', voltage: 10.92, current: 148.6, temp: 72.1, oil: 68.5, insulation: 65.8, furan: 45.5, vibration: 3.8 },
];

export default function DataExplorer() {
  const [data, setData] = useState(initialSensorsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrf, setSelectedTrf] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate rolling state updates on refresh
      setData(prev => prev.map(row => ({
        ...row,
        voltage: parseFloat((row.voltage + (Math.random() - 0.5) * 0.1).toFixed(2)),
        current: parseFloat((row.current + (Math.random() - 0.5) * 4).toFixed(1)),
        temp: parseFloat((row.temp + (Math.random() - 0.5) * 1.5).toFixed(1)),
      })));
      setIsRefreshing(false);
    }, 800);
  };

  const handleExportCSV = () => {
    // Generate actual CSV content
    const headers = 'Timestamp,Transformer ID,Voltage (kV),Current (A),Temperature (C),Oil (%),Insulation (MOhms),Furan (ppm),Vibration (mm/s)\n';
    const rows = filteredData.map(r => 
      `${r.timestamp},${r.trfId},${r.voltage},${r.current},${r.temp},${r.oil},${r.insulation},${r.furan},${r.vibration}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transys_sensor_export_${selectedTrf}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transys_sensor_export_${selectedTrf}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = data.filter(r => {
    const matchesSearch = r.trfId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.timestamp.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrf = selectedTrf === 'All' || r.trfId === selectedTrf;
    return matchesSearch && matchesTrf;
  });

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="text-cyan-400" size={28} /> Data Explorer
          </h1>
          <p className="text-muted-foreground text-sm">Deep-dive search into historical telemetry, raw sensor database logs, and direct export channels</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-[#10b981] hover:from-green-500 hover:to-[#10b981] text-white text-xs font-black uppercase rounded-lg shadow-md hover:shadow-green-500/20 neon-glow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button 
            onClick={handleExportJSON}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase rounded-lg shadow-md hover:shadow-blue-500/20 neon-glow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <FileJson size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#121633] border border-blue-500/10 rounded-xl p-4 shadow-inner">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold w-full md:w-auto">
          {/* Asset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase">Select Asset:</span>
            <select 
              value={selectedTrf}
              onChange={(e) => setSelectedTrf(e.target.value)}
              className="bg-[#0a0e27] border border-blue-500/10 rounded-lg px-3 py-1.5 text-white focus:outline-none cursor-pointer"
            >
              <option value="All">All Transformers</option>
              {Array.from({ length: 25 }, (_, i) => `TRF-${String(i + 1).padStart(2, '0')}`).map((trf) => (
                <option key={trf} value={trf}>{trf}</option>
              ))}
            </select>
          </div>

          {/* Search ID */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
            <input 
              type="text" 
              placeholder="Search timestamp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0a0e27] border border-blue-500/10 rounded-lg pl-8 pr-3 py-1.5 text-white focus:outline-none w-48"
            />
          </div>
        </div>

        <button 
          onClick={handleRefresh}
          className={`px-3 py-1.5 bg-[#0a0e27] hover:bg-blue-500/10 border border-blue-500/10 rounded-lg text-xs font-bold text-muted-foreground hover:text-white flex items-center gap-1.5 transition-all cursor-pointer ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
        >
          <RefreshCw size={12} /> Sync Log Database
        </button>
      </div>

      {/* Main Database Table Grid */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-muted-foreground">
            <thead>
              <tr className="border-b border-blue-500/10 text-white font-bold pb-2 uppercase">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Asset ID</th>
                <th className="pb-2 text-center">Voltage (kV)</th>
                <th className="pb-2 text-center">Current (A)</th>
                <th className="pb-2 text-center">Temperature (°C)</th>
                <th className="pb-2 text-center">Oil Level (%)</th>
                <th className="pb-2 text-center">Insulation (M&Omega;)</th>
                <th className="pb-2 text-center">Furan Content (ppm)</th>
                <th className="pb-2 text-center">Vibration (mm/s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5 text-white/95 leading-relaxed font-mono">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-500/5 transition-colors">
                  <td className="py-3 text-muted-foreground">{row.timestamp}</td>
                  <td className="py-3 font-bold text-cyan-300 font-sans">{row.trfId}</td>
                  <td className="py-3 text-center">{row.voltage.toFixed(2)}</td>
                  <td className="py-3 text-center">{row.current.toFixed(1)}</td>
                  <td className="py-3 text-center text-orange-400 font-bold">{row.temp.toFixed(1)}°C</td>
                  <td className="py-3 text-center">{row.oil.toFixed(1)}%</td>
                  <td className="py-3 text-center">{row.insulation.toFixed(1)}</td>
                  <td className="py-3 text-center">{row.furan.toFixed(1)}</td>
                  <td className="py-3 text-center">{row.vibration.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground font-bold">
              No matching records found.
            </div>
          )}
        </div>

        <div className="border-t border-blue-500/10 pt-3 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
          <span>Showing {filteredData.length} of {data.length} seeded telemetry blocks</span>
          <span>Simulation Database size: 2,92,200 records total</span>
        </div>
      </div>

    </div>
  );
}
