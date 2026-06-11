'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Cpu,
  MapPin, Zap, Activity, AlertTriangle, CheckCircle2, RefreshCw, Database, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

type Transformer = {
  id: string;
  name: string;
  location: string;
  type: string;
  capacity: number;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ModalMode = 'add' | 'edit' | null;

const STATUS_OPTIONS = ['GOOD', 'MONITOR', 'WARNING', 'CRITICAL'];
const TYPE_OPTIONS = ['Distribution', 'Step-up', 'Step-down', 'Power', 'Auto'];
const STATUS_COLORS: Record<string, string> = {
  GOOD: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MONITOR: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  WARNING: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const DEFAULT_FORM = {
  name: '',
  location: '',
  type: 'Distribution',
  capacity: 50,
  status: 'GOOD',
};

export default function AdminTransformersPage() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Transformer | null>(null);
  const { id: _removeId, ...DEFAULT_FORM_NO_ID } = DEFAULT_FORM as any;
  const DEFAULT_FORM_NO_ID_STATE = DEFAULT_FORM_NO_ID as typeof DEFAULT_FORM;

  type TransformerForm = {
    name: string;
    location: string;
    type: typeof DEFAULT_FORM.type;
    capacity: number;
    status: typeof DEFAULT_FORM.status;
  };

  const [form, setForm] = useState<TransformerForm>(DEFAULT_FORM_NO_ID_STATE as TransformerForm);

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transformer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // CSV Bulk Import State
  const [selectedUploadTrf, setSelectedUploadTrf] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    insertedCount?: number;
    failedCount?: number;
    error?: string;
  } | null>(null);

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadTrf) {
      toast.error('Please select a target transformer');
      return;
    }
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('transformerId', selectedUploadTrf);
      formData.append('duplicateAction', 'update');

      const res = await fetch('/api/admin/transformers/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Import completed! ${data.insertedCount} records imported.`);
        setImportResult({
          success: true,
          insertedCount: data.insertedCount,
          failedCount: data.failedCount,
        });
        setCsvFile(null);
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchTransformers();
        broadcastRefresh();
      } else {
        toast.error(data.error || 'Import failed');
        setImportResult({
          success: false,
          error: data.error,
          failedCount: data.failedCount,
        });
      }
    } catch {
      toast.error('Network error during import');
    } finally {
      setImporting(false);
    }
  };

  const fetchTransformers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transformers');
      const data = await res.json();
      if (data.success) setTransformers(data.data);
      else toast.error(data.error || 'Failed to load transformers');
    } catch {
      toast.error('Failed to fetch transformers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransformers(); }, [fetchTransformers]);

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (t: Transformer) => {
    setForm({ name: t.name, location: t.location, type: t.type, capacity: t.capacity, status: t.status });
    setEditTarget(t);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/transformers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Transformer ${data.assignedId} created!`);
          closeModal();
          fetchTransformers();
          broadcastRefresh();
        } else {
          toast.error(data.error || 'Failed to add');
        }
      } else if (modalMode === 'edit' && editTarget) {
        const res = await fetch(`/api/admin/transformers/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, location: form.location, type: form.type, capacity: form.capacity, status: form.status }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Transformer ${editTarget.id} updated!`);
          closeModal();
          fetchTransformers();
          broadcastRefresh();
        } else {
          toast.error(data.error || 'Failed to update');
        }
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/transformers/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Transformer ${deleteTarget.id} deleted!`);
        setDeleteTarget(null);
        fetchTransformers();
        broadcastRefresh();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
  };

  const broadcastRefresh = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('transformer_updates');
      bc.postMessage('refresh');
      bc.close();
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Cpu className="text-blue-500" size={32} /> Transformer Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">Add, edit, and delete transformers from the system</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTransformers}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              id="add-transformer-btn"
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-blue-900/30"
            >
              <Plus size={16} /> Add Transformer
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: transformers.length, color: 'text-blue-400' },
            { label: 'Active', value: transformers.filter(t => t.is_active).length, color: 'text-emerald-400' },
            { label: 'Critical', value: transformers.filter(t => t.status === 'CRITICAL').length, color: 'text-red-400' },
            { label: 'Warning', value: transformers.filter(t => t.status === 'WARNING').length, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase">{s.label}</p>
              <p className={`text-3xl font-black mt-1 ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* CSV Bulk Import Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Upload className="text-blue-500" size={20} />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Bulk CSV Sensor Data Import</h2>
          </div>
          
          <form onSubmit={handleCsvUpload} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">1. Select Target Transformer</label>
              <select
                value={selectedUploadTrf}
                onChange={e => setSelectedUploadTrf(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
              >
                <option value="">-- Choose Transformer --</option>
                {transformers.map(t => (
                  <option key={t.id} value={t.id}>{t.id} ({t.name})</option>
                ))}
              </select>
            </div>

            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">2. Select CSV File</label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={e => setCsvFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-1.5 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-500 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={importing || !selectedUploadTrf || !csvFile}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm uppercase transition-all shadow-lg cursor-pointer"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? 'Importing...' : 'Upload & Import'}
            </button>
          </form>

          {importResult && (
            <div className={`mt-3 p-4 rounded-xl border text-xs ${
              importResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider mb-1">
                {importResult.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {importResult.success ? 'Import Successful' : 'Import Failed'}
              </div>
              {importResult.success ? (
                <p>
                  Successfully imported <strong>{importResult.insertedCount}</strong> rows.
                  {importResult.failedCount ? ` Skipped/Failed ${importResult.failedCount} rows.` : ''}
                </p>
              ) : (
                <p>
                  Error: {importResult.error}.
                  {importResult.failedCount ? ` Failed rows logged: ${importResult.failedCount}.` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[10px] font-bold uppercase whitespace-nowrap">

                  <th className="py-4 px-3">Timestamp</th>
                  <th className="py-4 px-3">Ambient Temp (°C)</th>
                  <th className="py-4 px-3">Age (yr)</th>
                  <th className="py-4 px-3">Maintenance Count</th>
                  <th className="py-4 px-3">Short Circuits</th>
                  <th className="py-4 px-3">Outages (hrs/yr)</th>
                  <th className="py-4 px-3">Current (A)</th>
                  <th className="py-4 px-3">Voltage (kV)</th>
                  <th className="py-4 px-3">Temp Score</th>
                  <th className="py-4 px-3">Age Score</th>
                  <th className="py-4 px-3">Maint Score</th>
                  <th className="py-4 px-3">ShortCircuit Score</th>
                  <th className="py-4 px-3">Outage Score</th>
                  <th className="py-4 px-3">Current Score</th>
                  <th className="py-4 px-3">Voltage Score</th>
                  <th className="py-4 px-3">HI</th>
                  <th className="py-4 px-3">Predicted HI</th>
                  <th className="py-4 px-3 text-right sticky right-0 bg-gray-900 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 20 }).map((_, j) => (
                        <td key={j} className="py-4 px-3">
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-12" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transformers.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="py-16 text-center text-gray-500 font-bold">
                      No transformers found. Click "Add Transformer" to get started.
                    </td>
                  </tr>
                ) : (
                  transformers.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-800/50 transition-colors whitespace-nowrap">

                      <td className="py-3 px-3 text-gray-400">{t.Timestamp ? new Date(t.Timestamp).toLocaleString() : '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Ambient_Temperature_C ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Age_yr ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Maintenance_Count ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.No_of_Short_Circuits ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Outages_hours_per_year ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Current_A ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Voltage_kV ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Temp_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Age_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Maintenance_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.ShortCircuit_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Outage_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Current_score ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{t.Voltage_score ?? '—'}</td>
                      <td className="py-3 px-3 font-bold text-cyan-400">{t.HI !== undefined ? (t.HI * 100).toFixed(1) + '%' : '—'}</td>
                      <td className="py-3 px-3 font-bold text-purple-400">{t.Predicted_HI !== undefined ? (t.Predicted_HI * 100).toFixed(1) + '%' : '—'}</td>
                      <td className="py-3 px-3 sticky right-0 bg-gray-900 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.location.href = `/admin/transformers/${t.id.match(/\\d+/)?.[0] ?? t.id}`}
                            className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-600 rounded transition-all cursor-pointer flex items-center gap-1"
                            title="View Data"
                          >
                            <Database size={12} /> <span className="text-[10px] uppercase font-bold">View Data</span>
                          </button>
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {modalMode === 'add' ? '+ Add Transformer' : `Edit ${editTarget?.id}`}
                </h2>
                <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">


                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Name *</label>
                  <input
                    id="form-transformer-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

                    placeholder="e.g. Transformer 26"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Location</label>
                    <input
                      id="form-transformer-location"
                      type="text"
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Substation Alpha"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Capacity (kVA)</label>
                    <input
                      id="form-transformer-capacity"
                      type="number"
                      value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                      placeholder="50"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                    <select
                      id="form-transformer-type"
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                      {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                    <select
                      id="form-transformer-status"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-transformer-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-red-800/40 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Delete Transformer</h2>
                  <p className="text-sm text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-300">
                  Are you sure you want to delete <span className="font-black text-white">{deleteTarget.id}</span> ({deleteTarget.name})?
                  It will be removed from the dashboard immediately.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
