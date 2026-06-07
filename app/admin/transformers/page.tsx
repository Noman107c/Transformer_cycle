'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Cpu,
  MapPin, Zap, Activity, AlertTriangle, CheckCircle2, RefreshCw
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

export default function AdminTransformersPage() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Transformer | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transformer | null>(null);
  const [deleting, setDeleting] = useState(false);

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

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs font-bold uppercase">
                  <th className="py-4 px-5">ID</th>
                  <th className="py-4 px-5">Name</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5">Capacity</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Active</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-5">
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transformers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-500 font-bold">
                      No transformers found. Click &quot;Add Transformer&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  transformers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-5 font-black text-white font-mono">{t.id}</td>
                      <td className="py-4 px-5 font-semibold text-gray-200">{t.name}</td>
                      <td className="py-4 px-5 text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-cyan-400" /> {t.location || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-gray-400">{t.type}</td>
                      <td className="py-4 px-5 text-gray-300 font-semibold">
                        <span className="flex items-center gap-1">
                          <Zap size={12} className="text-yellow-400" /> {t.capacity} kVA
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${STATUS_COLORS[t.status] || 'text-gray-400 bg-gray-700 border-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {t.is_active
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 size={13} /> Active</span>
                          : <span className="flex items-center gap-1 text-gray-500 text-xs font-bold"><AlertTriangle size={13} /> Inactive</span>
                        }
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.location.href = `/admin/transformers/${t.id}`}
                            className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-600 rounded-lg transition-all cursor-pointer"
                            title="View Data"
                          >
                            <Activity size={14} />
                          </button>
                          <button
                            id={`edit-${t.id}-btn`}
                            onClick={() => openEdit(t)}
                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            id={`delete-${t.id}-btn`}
                            onClick={() => setDeleteTarget(t)}
                            className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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
                {/* ID - only for add mode */}
                {modalMode === 'add' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Transformer ID *</label>
                    <input
                      id="form-transformer-id"
                      type="text"
                      value={form.id}
                      onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
                      placeholder="e.g. T26"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Name *</label>
                  <input
                    id="form-transformer-name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
