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

const initialAlerts = [
  { id: 'ALT-101', trfId: 'TRF-09', type: 'temperature', severity: 'critical', message: 'Winding temperature exceeds threshold (92.6°C)', time: '12-May-2024 10:15 AM', resolved: false },
  { id: 'ALT-102', trfId: 'TRF-10', type: 'insulation', severity: 'critical', message: 'Remaining Useful Life (RUL) less than 200 days', time: '12-May-2024 09:50 AM', resolved: false },
  { id: 'ALT-103', trfId: 'TRF-06', type: 'vibration', severity: 'warning', message: 'High short circuit occurrences (26) registered', time: '12-May-2024 08:30 AM', resolved: false },
  { id: 'ALT-104', trfId: 'TRF-03', type: 'furan', severity: 'warning', message: 'Health Index declining, furan levels high (27.5 ppm)', time: '12-May-2024 07:45 AM', resolved: false },
  { id: 'ALT-105', trfId: 'TRF-08', type: 'oilLevel', severity: 'medium', message: 'Oil level dropped below optimal limit (61.3%)', time: '11-May-2024 02:20 PM', resolved: false },
  { id: 'ALT-106', trfId: 'TRF-01', type: 'maintenance', severity: 'low', message: 'Scheduled maintenance calibration overdue', time: '10-May-2024 09:00 AM', resolved: true, resolvedAt: '10-May-2024 11:30 AM' },
  { id: 'ALT-107', trfId: 'TRF-05', type: 'temperature', severity: 'medium', message: 'Winding temp spiking during heavy load hours', time: '09-May-2024 04:15 PM', resolved: true, resolvedAt: '09-May-2024 06:00 PM' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filterTab, setFilterTab] = useState('Active'); // Active, All, Resolved, Critical, Warning

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === id) {
        return {
          ...alert,
          resolved: true,
          resolvedAt: new Date().toLocaleString(),
        };
      }
      return alert;
    }));
    alert(`Alert ${id} has been successfully resolved and logged.`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    alert(`Alert ${id} deleted from logs.`);
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
