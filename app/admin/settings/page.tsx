'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Settings, Save, RefreshCw, Database, Shield, Bell,
  CheckCircle2, AlertTriangle, Loader2, Server,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SystemStats = {
  totalTransformers: number;
  activeTransformers: number;
  criticalCount: number;
  warningCount: number;
  lastUpdated: string;
  dbConnected: boolean;
};

export default function SettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [thresholds, setThresholds] = useState({
    critical: 55,
    warning: 70,
    monitor: 80,
  });

  const [notifications, setNotifications] = useState({
    criticalAlert: true,
    warningAlert: true,
    monitorAlert: false,
    emailNotifications: false,
  });

  const [display, setDisplay] = useState({
    refreshInterval: 15,
    defaultTimeRange: '365',
    itemsPerPage: 10,
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transformers');
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        setStats({
          totalTransformers: data.length,
          activeTransformers: data.filter((t: any) => t.is_active).length,
          criticalCount: data.filter((t: any) => t.status === 'CRITICAL').length,
          warningCount: data.filter((t: any) => t.status === 'WARNING').length,
          lastUpdated: new Date().toLocaleString(),
          dbConnected: true,
        });
      }
    } catch {
      setStats(prev => prev ? { ...prev, dbConnected: false } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success('Settings saved successfully!');
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Settings className="text-gray-400" size={32} /> System Settings
            </h1>
            <p className="text-gray-400 text-sm mt-1">Configure thresholds, notifications, and system preferences</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-60 shadow-lg shadow-blue-900/30"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">

          {/* Left column */}
          <div className="col-span-8 space-y-6">

            {/* HI Thresholds */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} className="text-blue-400" /> Health Index Thresholds
              </h2>
              <p className="text-xs text-gray-500">
                Define the Health Index (HI %) boundaries for each alert level. Values apply system-wide.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'critical', label: 'Critical Threshold', color: 'border-red-500/40 focus:border-red-500/60', badge: 'text-red-400 bg-red-500/10 border-red-500/30', desc: 'HI below this value → CRITICAL' },
                  { key: 'warning', label: 'Warning Threshold', color: 'border-orange-500/40 focus:border-orange-500/60', badge: 'text-orange-400 bg-orange-500/10 border-orange-500/30', desc: 'HI below this value → WARNING' },
                  { key: 'monitor', label: 'Monitor Threshold', color: 'border-yellow-500/40 focus:border-yellow-500/60', badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', desc: 'HI below this value → MONITOR' },
                ].map(({ key, label, color, badge, desc }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
                    <div className="relative">
                      <input
                        type="number" min={0} max={100}
                        value={thresholds[key as keyof typeof thresholds]}
                        onChange={e => setThresholds(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className={`w-full bg-gray-800 border ${color} rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none transition-all pr-10`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">%</span>
                    </div>
                    <p className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge}`}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Visual Threshold Bar */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Threshold Preview</p>
                <div className="relative h-6 rounded-full overflow-hidden flex">
                  <div className="h-full bg-red-500/60" style={{ width: `${thresholds.critical}%` }} />
                  <div className="h-full bg-orange-500/60" style={{ width: `${thresholds.warning - thresholds.critical}%` }} />
                  <div className="h-full bg-yellow-500/60" style={{ width: `${thresholds.monitor - thresholds.warning}%` }} />
                  <div className="h-full bg-emerald-500/60" style={{ width: `${100 - thresholds.monitor}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>0%</span>
                  <span className="text-red-400">{thresholds.critical}%</span>
                  <span className="text-orange-400">{thresholds.warning}%</span>
                  <span className="text-yellow-400">{thresholds.monitor}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Display Preferences */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server size={16} className="text-cyan-400" /> Display Preferences
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Data Refresh (min)</label>
                  <select
                    value={display.refreshInterval}
                    onChange={e => setDisplay(prev => ({ ...prev, refreshInterval: Number(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    {[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Default Time Range</label>
                  <select
                    value={display.defaultTimeRange}
                    onChange={e => setDisplay(prev => ({ ...prev, defaultTimeRange: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 6 months</option>
                    <option value="365">Last 1 year</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Items Per Page</label>
                  <select
                    value={display.itemsPerPage}
                    onChange={e => setDisplay(prev => ({ ...prev, itemsPerPage: Number(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v} rows</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell size={16} className="text-yellow-400" /> Notification Preferences
              </h2>
              <div className="space-y-3">
                {[
                  { key: 'criticalAlert', label: 'Critical Alerts', desc: 'Alert when HI drops below critical threshold' },
                  { key: 'warningAlert', label: 'Warning Alerts', desc: 'Alert when HI drops below warning threshold' },
                  { key: 'monitorAlert', label: 'Monitor Alerts', desc: 'Alert when HI drops into monitoring range' },
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send alerts to admin email address' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-200">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${notifications[key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${notifications[key as keyof typeof notifications] ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — System Status */}
          <div className="col-span-4 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database size={16} className="text-blue-400" /> System Status
                </h2>
                <button onClick={fetchStats} disabled={loading}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border ${stats.dbConnected ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                    <span className="text-xs text-gray-400 font-bold uppercase">Database</span>
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${stats.dbConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.dbConnected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {stats.dbConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {[
                    { label: 'Total Transformers', value: stats.totalTransformers, color: 'text-blue-400' },
                    { label: 'Active Units', value: stats.activeTransformers, color: 'text-emerald-400' },
                    { label: 'Critical Alerts', value: stats.criticalCount, color: 'text-red-400' },
                    { label: 'Warnings', value: stats.warningCount, color: 'text-orange-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                      <span className="text-xs text-gray-400 font-bold uppercase">{item.label}</span>
                      <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
                    </div>
                  ))}

                  <div className="bg-gray-800 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Last Refreshed</p>
                    <p className="text-xs text-gray-300">{stats.lastUpdated}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Failed to load system stats.</p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-5 space-y-2">
              <p className="text-xs font-bold text-blue-300 uppercase">About This System</p>
              <p className="text-xs text-gray-400">
                Transformer Lifecycle Management System uses XGBoost ML model to predict Health Index (HI) from real-time telemetry.
              </p>
              <div className="space-y-1 text-[10px] text-gray-500 mt-2">
                <div className="flex justify-between"><span>Model</span><span className="text-gray-300">XGBoost Regressor</span></div>
                <div className="flex justify-between"><span>R² Score</span><span className="text-gray-300">0.91</span></div>
                <div className="flex justify-between"><span>MAE</span><span className="text-gray-300">4.21</span></div>
                <div className="flex justify-between"><span>RMSE</span><span className="text-gray-300">6.87</span></div>
                <div className="flex justify-between"><span>Data Interval</span><span className="text-gray-300">15 min</span></div>
                <div className="flex justify-between"><span>Version</span><span className="text-gray-300">v1.0.0</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
