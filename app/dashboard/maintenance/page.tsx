'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  User,
  ShieldCheck,
  Check
} from 'lucide-react';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MaintenancePage() {
  const { data: transformersDataResponse } = useSWR('/api/transformers', fetcher);
  const transformers = transformersDataResponse?.data || [];

  // Generate dynamic logs based on real maintenance count / record count
  const dynamicLogs = transformers.filter((t: any) => (t.Maintenance_Count || t.record_count) > 0).map((t: any, idx: number) => ({
    id: `LOG-${idx + 100}`,
    trfId: t.id,
    type: 'Routine Overhaul',
    technician: 'System DB Record',
    date: new Date(t.Timestamp || Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    notes: `Maintenance cycle completed. Total count: ${t.Maintenance_Count || t.record_count}`,
  }));

  const [schedules, setSchedules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Initialize history when data loads
  useEffect(() => {
    if (dynamicLogs.length > 0 && history.length === 0) {
      setHistory(dynamicLogs.slice(0, 5));
    }
  }, [dynamicLogs]);
  
  // Log form states
  const [newTrfId, setNewTrfId] = useState('TRF-01');
  const [newType, setNewType] = useState('Oil Quality Check');
  const [newDate, setNewDate] = useState('2024-05-24');
  const [newPriority, setNewPriority] = useState('Medium');

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newMnt = {
      id: `MNT-${String(schedules.length + 1).padStart(3, '0')}`,
      trfId: newTrfId,
      type: newType,
      priority: newPriority,
      date: new Date(newDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      status: 'Pending',
    };
    setSchedules([newMnt, ...schedules]);
    alert(`Successfully scheduled upcoming maintenance task ${newMnt.id} for ${newMnt.trfId}`);
  };

  const handleCompleteTask = (id: string) => {
    const task = schedules.find(s => s.id === id);
    if (!task) return;

    setSchedules(prev => prev.filter(s => s.id !== id));
    setHistory(prev => [
      {
        id: `LOG-${String(prev.length + 101).padStart(3, '0')}`,
        trfId: task.trfId,
        type: task.type,
        technician: 'System Operator',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        notes: 'Maintenance completed successfully via manual execution log override.',
      },
      ...prev
    ]);
    alert(`Task ${id} marked as completed and appended to history log!`);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Wrench className="text-cyan-400" size={28} /> Maintenance
          </h1>
          <p className="text-muted-foreground text-sm">Schedule future overhauls, create logs, and browse past diagnostic records</p>
        </div>
      </div>

      {/* Main Grid: Scheduler Form & Upcoming Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Log Maintenance / Scheduler Form */}
        <div className="xl:col-span-4 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col justify-between">
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="text-cyan-400" size={16} /> Schedule Maintenance
            </h2>

            <div className="space-y-3 text-xs font-semibold">
              
              <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Target Asset</label>
                    <select 
                      value={newTrfId}
                      onChange={(e) => setNewTrfId(e.target.value)}
                      className="w-full bg-[#0a0e27] border border-blue-500/15 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30"
                    >
                      {transformers.map((trf: any) => (
                        <option key={trf.id} value={trf.id}>{trf.name || trf.id}</option>
                      ))}
                    </select>
                  </div>

              {/* Maintenance Type */}
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground uppercase text-[10px]">Maintenance Type / Scope</label>
                <input 
                  type="text" 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="bg-[#121633] border border-blue-500/15 rounded-lg px-3 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground uppercase text-[10px]">Target Date</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-[#121633] border border-blue-500/15 rounded-lg px-3 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground uppercase text-[10px]">Severity Priority</label>
                <div className="flex items-center gap-2 pt-1">
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`flex-1 py-1 rounded border text-xs font-bold transition-all cursor-pointer ${
                        newPriority === p 
                          ? 'bg-blue-600 border-blue-500 text-white font-black' 
                          : 'bg-[#121633] border-blue-500/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button 
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase rounded-lg shadow-md neon-glow transition-all active:scale-95 cursor-pointer mt-4"
            >
              Add Schedule
            </button>
          </form>
        </div>

        {/* Upcoming Schedules List */}
        <div className="xl:col-span-8 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="text-cyan-400" size={16} /> Upcoming Maintenance Operations
            </h2>
          </div>
          <div className="overflow-x-auto flex-1 max-h-[320px] scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs font-semibold text-muted-foreground">
              <thead>
                <tr className="border-b border-blue-500/10 text-white font-bold pb-2 uppercase">
                  <th className="pb-2">Task ID</th>
                  <th className="pb-2">Asset ID</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-center">Priority</th>
                  <th className="pb-2 text-center">Due Date</th>
                  <th className="pb-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/5 text-white/95">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-2.5 font-bold text-muted-foreground">{item.id}</td>
                    <td className="py-2.5 font-bold text-cyan-300">{item.trfId}</td>
                    <td className="py-2.5">{item.type}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-muted-foreground">{item.date}</td>
                    <td className="py-2.5 text-center">
                      <button 
                        onClick={() => handleCompleteTask(item.id)}
                        className="p-1 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 rounded text-[#10b981] cursor-pointer transition-all active:scale-95"
                        title="Mark Completed"
                      >
                        <Check size={12} className="stroke-[3]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Historic Logs */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35">
        <div className="mb-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="text-cyan-400" size={16} /> Historic Completed Maintenance Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-muted-foreground">
            <thead>
              <tr className="border-b border-blue-500/10 text-white font-bold pb-2 uppercase">
                <th className="pb-2">Log ID</th>
                <th className="pb-2">Asset ID</th>
                <th className="pb-2">Maintenance Done</th>
                <th className="pb-2">Technician</th>
                <th className="pb-2 text-center">Completed On</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5 text-white/95 leading-relaxed">
              {history.map((log) => (
                <tr key={log.id} className="hover:bg-blue-500/5 transition-colors">
                  <td className="py-3 font-bold text-muted-foreground">{log.id}</td>
                  <td className="py-3 font-bold text-cyan-300">{log.trfId}</td>
                  <td className="py-3 font-bold">{log.type}</td>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5 mt-1">
                    <User size={12} className="text-cyan-400" /> {log.technician}
                  </td>
                  <td className="py-3 text-center font-bold text-muted-foreground">{log.date}</td>
                  <td className="py-3 text-muted-foreground text-[11px] leading-normal">{log.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
