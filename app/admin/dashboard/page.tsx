'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Upload, RefreshCw, Plus, Pencil, Trash2, X, Save, Loader2, Cpu,
  MapPin, Zap, AlertTriangle, CheckCircle2, HardDrive, Database, Activity, ChevronDown, ChevronUp
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
  id: '', name: '', location: '', type: 'Distribution', capacity: 50, status: 'GOOD',
};

export default function AdminDashboard() {
  const [syncing, setSyncing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Transformer | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transformer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);

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

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        broadcastRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to synchronize datasets');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = async (transformerId: string, file: File) => {
    if (!file) return;

    const fileType = file.name.endsWith('.csv') ? 'csv' : file.name.endsWith('.json') ? 'json' : null;
    if (!fileType) {
      toast.error('Only CSV (.csv) and JSON (.json) files are supported.');
      return;
    }

    try {
      setUploadingId(transformerId);
      
      const reader = new FileReader();
      const contentPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error('File reading error'));
        reader.readAsText(file);
      });

      const fileContent = await contentPromise;

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformerId, fileType, fileContent })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Uploaded successfully to ${transformerId}!`);
        broadcastRefresh();
        if (expandedId === transformerId) {
          fetchReadings(transformerId);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to upload to ${transformerId}`);
    } finally {
      setUploadingId(null);
    }
  };

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (t: Transformer) => {
    setForm({ id: t.id, name: t.name, location: t.location, type: t.type, capacity: t.capacity, status: t.status });
    setEditTarget(t);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      toast.error('ID and Name are required');
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
          toast.success(`Transformer ${form.id} added!`);
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
        if (expandedId === deleteTarget.id) setExpandedId(null);
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

  const fetchReadings = async (id: string) => {
    setLoadingReadings(true);
    try {
      const numMatch = id.match(/\d+/);
      const res = await fetch(`/api/admin/transformers/${numMatch ? numMatch[0] : id}/data`);
      const data = await res.json();
      if (data.success) {
        setReadings(data.data || []);
      } else {
        toast.error(data.error || 'Failed to load readings');
        setReadings([]);
      }
    } catch {
      toast.error('Failed to fetch readings');
      setReadings([]);
    } finally {
      setLoadingReadings(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchReadings(id);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Cpu className="text-blue-500" size={32} /> Dashboard Control Center
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage transformers, upload datasets, and view telemetry all in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Re-slicing...' : 'Sync All'}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-blue-900/30"
            >
              <Plus size={16} /> Add Transformer
            </button>
          </div>
        </div>

        {/* Transformer List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs font-bold uppercase bg-gray-900/50">
                  <th className="py-4 px-5">ID</th>
                  <th className="py-4 px-5">Details</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Dataset</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-4 px-5">
                        <div className="h-6 bg-gray-800 rounded animate-pulse w-full max-w-2xl" />
                      </td>
                    </tr>
                  ))
                ) : transformers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500 font-bold">
                      No transformers found. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  transformers.map(t => (
                    <React.Fragment key={t.id}>
                      <tr className={`transition-colors ${expandedId === t.id ? 'bg-blue-900/10' : 'hover:bg-gray-800/50'}`}>
                        <td className="py-4 px-5 font-black text-white font-mono cursor-pointer" onClick={() => toggleExpand(t.id)}>
                          <div className="flex items-center gap-2">
                            {expandedId === t.id ? <ChevronUp size={16} className="text-blue-400" /> : <ChevronDown size={16} className="text-gray-500" />}
                            {t.id}
                          </div>
                        </td>
                        <td className="py-4 px-5 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                          <div className="font-semibold text-gray-200">{t.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><MapPin size={10} /> {t.location || 'N/A'}</span>
                            <span className="flex items-center gap-1"><Zap size={10} /> {t.capacity} kVA</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${STATUS_COLORS[t.status] || 'text-gray-400 bg-gray-700 border-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="relative group inline-block">
                            <input
                              type="file"
                              accept=".csv,.json"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(t.id, file);
                                e.target.value = '';
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              disabled={uploadingId === t.id}
                              title="Upload Dataset CSV/JSON"
                            />
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-xs font-bold transition-all">
                              {uploadingId === t.id ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )}
                              {uploadingId === t.id ? 'Uploading...' : 'Upload Data'}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(t.id)}
                              className={`p-2 rounded-lg transition-all ${expandedId === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                              title="View Database Records"
                            >
                              <Database size={16} />
                            </button>
                            <button
                              onClick={() => openEdit(t)}
                              className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row: Database Records */}
                      <AnimatePresence>
                        {expandedId === t.id && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-black/40 border-b border-gray-800"
                          >
                            <td colSpan={5} className="p-0">
                              <div className="p-6 border-l-2 border-blue-500 m-4 rounded-r-xl bg-gray-900/50">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                    <Activity size={16} className="text-blue-400" />
                                    Database Records ({t.id})
                                  </h3>
                                  <span className="text-xs text-gray-500 font-mono">Showing latest readings</span>
                                </div>

                                {loadingReadings ? (
                                  <div className="flex items-center justify-center py-8 text-gray-400">
                                    <Loader2 className="animate-spin mr-2" size={20} /> Loading records...
                                  </div>
                                ) : readings.length === 0 ? (
                                  <div className="text-center py-8 text-gray-500 bg-gray-950 rounded-lg border border-gray-800 border-dashed">
                                    <Database size={24} className="mx-auto mb-2 opacity-50" />
                                    No records found for this transformer in the database.<br/>
                                    Upload a dataset to see data here.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto bg-gray-950 rounded-lg border border-gray-800">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-gray-900 text-gray-400">
                                        <tr>
                                          <th className="py-2 px-4 whitespace-nowrap">Time</th>
                                          <th className="py-2 px-4">HI</th>
                                          <th className="py-2 px-4">Temp (°C)</th>
                                          <th className="py-2 px-4">Load (A)</th>
                                          <th className="py-2 px-4">Voltage (kV)</th>
                                          <th className="py-2 px-4">Age (yr)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-800">
                                        {readings.slice(-10).reverse().map((r, idx) => (
                                          <tr key={r.Timestamp || idx} className="hover:bg-gray-900 transition-colors">
                                            <td className="py-2 px-4 font-mono text-gray-300">{new Date(r.Timestamp).toLocaleString()}</td>
                                            <td className="py-2 px-4 font-bold text-white">
                                              <span className={r.HI < 0.6 ? 'text-red-400' : r.HI < 0.8 ? 'text-yellow-400' : 'text-emerald-400'}>
                                                {(r.HI * 100).toFixed(1)}%
                                              </span>
                                            </td>
                                            <td className="py-2 px-4 text-gray-300">{r.Ambient_Temperature_C?.toFixed(1) || '-'}</td>
                                            <td className="py-2 px-4 text-gray-300">{r.Current_A?.toFixed(1) || '-'}</td>
                                            <td className="py-2 px-4 text-gray-300">{r.Voltage_kV?.toFixed(1) || '-'}</td>
                                            <td className="py-2 px-4 text-gray-300">{r.Age_yr || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {readings.length > 10 && (
                                      <div className="text-center py-2 bg-gray-900 text-xs text-gray-500 font-medium border-t border-gray-800">
                                        Showing latest 10 of {readings.length} records.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modals for Add/Edit/Delete are identical to the original ones */}
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
               <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
                 <X size={18} />
               </button>
             </div>

             <div className="space-y-4">
               {modalMode === 'add' && (
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-gray-400 uppercase">Transformer ID *</label>
                   <input
                     type="text"
                     value={form.id}
                     onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
                     placeholder="e.g. T26"
                     className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                   />
                 </div>
               )}

               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-gray-400 uppercase">Name *</label>
                 <input
                   type="text"
                   value={form.name}
                   onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                   placeholder="e.g. Transformer 26"
                   className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-gray-400 uppercase">Location</label>
                   <input
                     type="text"
                     value={form.location}
                     onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                     placeholder="e.g. Substation Alpha"
                     className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-gray-400 uppercase">Capacity (kVA)</label>
                   <input
                     type="number"
                     value={form.capacity}
                     onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                     placeholder="50"
                     className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                   <select
                     value={form.type}
                     onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                     className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                   >
                     {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                   <select
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
                 className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all"
               >
                 Cancel
               </button>
               <button
                 onClick={handleSave}
                 disabled={saving}
                 className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
               >
                 {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                 {saving ? 'Saving...' : 'Save'}
               </button>
             </div>
           </motion.div>
         </div>
        )}
      </AnimatePresence>

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
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
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
