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
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
export default function DataExplorer() {
  const { data: transformersDataResponse } = useSWR('/api/transformers', fetcher);
  const transformers = transformersDataResponse?.data || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrf, setSelectedTrf] = useState('');

  // Default select first
  if (!selectedTrf && transformers.length > 0) {
    setSelectedTrf(transformers[0].id);
  }

  const { data: detailData, mutate: refreshData, isValidating: isRefreshing } = useSWR(
    selectedTrf ? `/api/transformers/${selectedTrf}` : null,
    fetcher
  );

  const data = detailData?.data || [];

  const handleRefresh = () => {
    refreshData();
  };

  const handleExportCSV = () => {
    // Generate actual CSV content
    const headers = 'Timestamp,Transformer ID,Voltage (kV),Current (A),Temperature (C),Age,Outages,Short Circuits,HI\n';
    const rows = filteredData.map((r: any) => 
      `${r.Timestamp},${selectedTrf},${r.Voltage_kV},${r.Current_A},${r.Ambient_Temperature_C},${r.Age_yr},${r.Outages_hours_per_year},${r.No_of_Short_Circuits},${r.HI}`
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

  const filteredData = data.filter((r: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return r.Timestamp?.toLowerCase().includes(term) ||
           String(r.Voltage_kV).includes(term) ||
           String(r.Current_A).includes(term);
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
              className="bg-[#121633] border border-blue-500/15 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30 shadow-inner cursor-pointer"
            >
              {transformers.map((trf: any) => (
                <option key={trf.id} value={trf.id}>{trf.name} ({trf.id})</option>
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
                <tr className="border-b border-blue-500/15 text-muted-foreground font-bold font-sans">
                  <th className="pb-3 text-left">Timestamp</th>
                  <th className="pb-3 text-left">Transformer ID</th>
                  <th className="pb-3 text-center">Voltage (kV)</th>
                  <th className="pb-3 text-center">Current (A)</th>
                  <th className="pb-3 text-center">Temp (°C)</th>
                  <th className="pb-3 text-center">Age (yr)</th>
                  <th className="pb-3 text-center">Short Circuits</th>
                  <th className="pb-3 text-center">Outages (hr/yr)</th>
                  <th className="pb-3 text-center">HI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/5">
                {filteredData.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-blue-500/5 group">
                    <td className="py-3 text-left font-sans">{new Date(row.Timestamp).toLocaleString()}</td>
                    <td className="py-3 text-left font-bold text-cyan-400">{selectedTrf}</td>
                    <td className="py-3 text-center">{Number(row.Voltage_kV).toFixed(2)}</td>
                    <td className="py-3 text-center text-orange-400 font-bold">{Number(row.Current_A).toFixed(1)}</td>
                    <td className="py-3 text-center">{Number(row.Ambient_Temperature_C).toFixed(1)}</td>
                    <td className="py-3 text-center">{row.Age_yr}</td>
                    <td className="py-3 text-center text-purple-400">{row.No_of_Short_Circuits}</td>
                    <td className="py-3 text-center">{Number(row.Outages_hours_per_year).toFixed(1)}</td>
                    <td className={`py-3 text-center font-bold ${row.HI >= 0.8 ? 'text-green-400' : row.HI >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Number(row.HI).toFixed(4)}
                    </td>
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
