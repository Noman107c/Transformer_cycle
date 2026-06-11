'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  BellRing, 
  Trash2, 
  Calendar,
  Filter,
  ShieldCheck
} from 'lucide-react';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AlertsPage() {
  const { data: transformersDataResponse } = useSWR('/api/transformers', fetcher);
  const transformers = transformersDataResponse?.data || [];

  const [localResolved, setLocalResolved] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState('Active'); // Active, All, Resolved, Critical, Warning

  // Dynamically generate alerts based on actual telemetry
  const generateAlerts = () => {
    const generated: any[] = [];
    transformers.forEach((trf: any) => {
      // Use avg_hi, avg_temp which are returned by the public API route
      const hi = trf.avg_hi ?? trf.HI;
      const temp = trf.avg_temp ?? trf.Ambient_Temperature_C;
      
      if (hi !== undefined && hi !== null && hi < 0.55) {
        generated.push({ id: `ALT-HI-${trf.id}`, trfId: trf.id, type: 'health', severity: 'critical', message: `Health Index critical (${(hi * 100).toFixed(1)}%)`, time: new Date(trf.Timestamp || Date.now()).toLocaleString() });
      }
      if (trf.Current_A && trf.Current_A > 400) {
        generated.push({ id: `ALT-CUR-${trf.id}`, trfId: trf.id, type: 'overload', severity: 'warning', message: `Current overload (${trf.Current_A} A)`, time: new Date(trf.Timestamp || Date.now()).toLocaleString() });
      }
      if (temp !== undefined && temp !== null && temp > 85) {
        generated.push({ id: `ALT-TMP-${trf.id}`, trfId: trf.id, type: 'temperature', severity: 'critical', message: `Winding temperature exceeds threshold (${temp.toFixed(1)}°C)`, time: new Date(trf.Timestamp || Date.now()).toLocaleString() });
      }
      if (trf.No_of_Short_Circuits && trf.No_of_Short_Circuits > 10) {
        generated.push({ id: `ALT-SC-${trf.id}`, trfId: trf.id, type: 'vibration', severity: 'warning', message: `High short circuit occurrences (${trf.No_of_Short_Circuits}) registered`, time: new Date(trf.Timestamp || Date.now()).toLocaleString() });
      }
    });
    return generated.map(a => ({ ...a, resolved: localResolved.includes(a.id) }));
  };

  const alerts = generateAlerts();

  const handleResolveAlert = (id: string) => {
    setLocalResolved(prev => [...prev, id]);
    alert(`Alert ${id} has been successfully resolved.`);
  };

  const handleDeleteAlert = (id: string) => {
    setLocalResolved(prev => [...prev, id]);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterTab === 'Active') return !alert.resolved;
    if (filterTab === 'Resolved') return alert.resolved;
    if (filterTab === 'Critical') return alert.severity === 'critical';
    if (filterTab === 'Warning') return alert.severity === 'warning';
    return true; // All
  });

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  const getAlertIcon = (severity: string, resolved: boolean) => {
    if (resolved) return <CheckCircle className="text-green-400 shrink-0" size={16} />;
    if (severity === 'critical') return <XCircle className="text-red-500 shrink-0 animate-pulse" size={16} />;
    return <AlertTriangle className="text-orange-400 shrink-0" size={16} />;
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <BellRing className="text-cyan-400" size={28} /> Alerts & Events
          </h1>
          <p className="text-muted-foreground text-sm">Real-time anomaly warnings, priority threshold overrides, and active resolutions</p>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        
        {/* Active Alerts */}
        <div className="glassmorphism p-4 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-md text-center">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Active Alerts</span>
          <p className="text-3xl font-black text-white mt-1">{alerts.filter(a => !a.resolved).length}</p>
        </div>

        {/* Critical Alerts */}
        <div className="glassmorphism p-4 rounded-lg border border-red-500/10 bg-[#271420]/40 shadow-md text-center">
          <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Active Criticals</span>
          <p className="text-3xl font-black text-red-500 mt-1">{alerts.filter(a => !a.resolved && a.severity === 'critical').length}</p>
        </div>

        {/* Warnings */}
        <div className="glassmorphism p-4 rounded-lg border border-orange-500/10 bg-[#241f20]/40 shadow-md text-center">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Active Warnings</span>
          <p className="text-3xl font-black text-orange-400 mt-1">{alerts.filter(a => !a.resolved && a.severity === 'warning').length}</p>
        </div>

        {/* Resolved Alerts */}
        <div className="glassmorphism p-4 rounded-lg border border-green-500/10 bg-[#0f1d24]/40 shadow-md text-center">
          <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Total Resolved</span>
          <p className="text-3xl font-black text-[#10b981] mt-1">{alerts.filter(a => a.resolved).length}</p>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-muted-foreground mr-1" />
        {['Active', 'All', 'Resolved', 'Critical', 'Warning'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              filterTab === tab 
                ? 'bg-blue-600 border-blue-500 text-white neon-glow' 
                : 'bg-[#121633] border-blue-500/5 text-muted-foreground hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts Database List */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-muted-foreground">
            <thead>
              <tr className="border-b border-blue-500/10 text-white font-bold pb-2 uppercase">
                <th className="pb-2">Alert ID</th>
                <th className="pb-2">Asset ID</th>
                <th className="pb-2 text-center">Severity</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Message</th>
                <th className="pb-2">Timestamp</th>
                <th className="pb-2 text-center">Status</th>
                <th className="pb-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5 text-white/95 leading-relaxed">
              <AnimatePresence>
                {filteredAlerts.map((item) => (
                  <motion.tr 
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-blue-500/5 transition-colors"
                  >
                    <td className="py-3 font-bold text-muted-foreground">{item.id}</td>
                    <td className="py-3 font-bold text-cyan-300">{item.trfId}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${getSeverityStyle(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 uppercase font-bold text-muted-foreground text-[10px]">{item.type}</td>
                    <td className="py-3 text-white max-w-xs truncate" title={item.message}>{item.message}</td>
                    <td className="py-3 text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Calendar size={12} className="text-cyan-400" /> {item.time}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-[10px]">
                        {getAlertIcon(item.severity, item.resolved)}
                        <span className={item.resolved ? 'text-green-400' : 'text-orange-400'}>
                          {item.resolved ? 'Resolved' : 'Active'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!item.resolved ? (
                          <button
                            onClick={() => handleResolveAlert(item.id)}
                            className="px-2 py-1 bg-green-500/10 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-[10px] font-extrabold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            <ShieldCheck size={10} /> Resolve
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic font-semibold">
                            Closed
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteAlert(item.id)}
                          className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground font-bold">
              No alerts found for selected filter tab.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
