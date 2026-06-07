'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Database,
  ArrowLeft, RefreshCw, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

type TransformerData = {
  Timestamp: string;
  Ambient_Temperature_C: number;
  Age_yr: number;
  Maintenance_Count: number;
  No_of_Short_Circuits: number;
  Outages_hours_per_year: number;
  Current_A: number;
  Voltage_kV: number;
  Temp_score: number;
  Age_score: number;
  Maintenance_score: number;
  ShortCircuit_score: number;
  Outage_score: number;
  Current_score: number;
  Voltage_score: number;
  HI: number;
  Predicted_HI: number;
};

const DEFAULT_FORM: TransformerData = {
  Timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  Ambient_Temperature_C: 0,
  Age_yr: 0,
  Maintenance_Count: 0,
  No_of_Short_Circuits: 0,
  Outages_hours_per_year: 0,
  Current_A: 0,
  Voltage_kV: 0,
  Temp_score: 0,
  Age_score: 0,
  Maintenance_score: 0,
  ShortCircuit_score: 0,
  Outage_score: 0,
  Current_score: 0,
  Voltage_score: 0,
  HI: 0,
  Predicted_HI: 0,
};

const COLUMNS = Object.keys(DEFAULT_FORM) as Array<keyof TransformerData>;

export default function TransformerDataPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<TransformerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<TransformerData | null>(null);
  const [form, setForm] = useState<TransformerData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransformerData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transformers/${params.id}/data`);
      const resData = await res.json();
      if (resData.success) setData(resData.data);
      else toast.error(resData.error || 'Failed to load data');
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setForm({ ...DEFAULT_FORM, Timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (record: TransformerData) => {
    // Format timestamp for HTML datetime-local input if needed, or keep string
    const formattedRecord = { ...record };
    if (formattedRecord.Timestamp) {
      // Postgres returns ISO string
      const date = new Date(formattedRecord.Timestamp);
      const isoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0,19).replace('T', ' ');
      formattedRecord.Timestamp = isoString;
    }
    setForm(formattedRecord);
    setEditTarget(record);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.Timestamp) {
      toast.error('Timestamp is required');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const res = await fetch(`/api/admin/transformers/${params.id}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const result = await res.json();
        if (result.success) {
          toast.success('Record added successfully!');
          closeModal();
          fetchData();
        } else {
          toast.error(result.error || 'Failed to add record');
        }
      } else if (modalMode === 'edit' && editTarget) {
        const payload = { ...form, original_timestamp: editTarget.Timestamp };
        const res = await fetch(`/api/admin/transformers/${params.id}/data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          toast.success('Record updated successfully!');
          closeModal();
          fetchData();
        } else {
          toast.error(result.error || 'Failed to update record');
        }
      }
    } catch {
      toast.error('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ts = encodeURIComponent(deleteTarget.Timestamp);
      const res = await fetch(`/api/admin/transformers/${params.id}/data?ts=${ts}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success('Record deleted successfully!');
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete record');
      }
    } catch {
      toast.error('Network error while deleting');
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field: keyof TransformerData, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'Timestamp' ? value : (value === '' ? 0 : Number(value))
    }));
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/transformers" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Database className="text-cyan-500" size={32} /> {params.id} Data Records
              </h1>
              <p className="text-gray-400 text-sm mt-1">Manage lifecycle data for transformer {params.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-cyan-900/30"
            >
              <Plus size={16} /> Add Record
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-gray-900/50">
                  <th className="py-4 px-5 sticky left-0 z-10 bg-gray-900">Actions</th>
                  {COLUMNS.map(col => (
                    <th key={col} className="py-4 px-5">{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-5 sticky left-0 z-10 bg-gray-900">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-16" />
                      </td>
                      {COLUMNS.map((_, j) => (
                        <td key={j} className="py-4 px-5">
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-gray-500 font-bold">
                      No records found for this transformer. Click &quot;Add Record&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.Timestamp || i} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-2 px-5 sticky left-0 z-10 bg-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-all"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {COLUMNS.map(col => (
                        <td key={col} className={`py-3 px-5 ${col === 'Timestamp' ? 'font-mono text-cyan-400 font-semibold' : 'text-gray-300'}`}>
                          {col === 'Timestamp' 
                            ? new Date(row[col] as string).toLocaleString()
                            : (row[col] !== null ? Number(row[col]).toFixed(2).replace(/\.00$/, '') : '—')}
                        </td>
                      ))}
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  {modalMode === 'add' ? <Plus className="text-cyan-500"/> : <Pencil className="text-blue-500"/>}
                  {modalMode === 'add' ? 'Add New Record' : 'Edit Record'}
                </h2>
                <button onClick={closeModal} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Timestamp special handling */}
                <div className="space-y-1.5 lg:col-span-3 mb-2">
                  <label className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1"><Calendar size={12}/> Timestamp (YYYY-MM-DD HH:MM:SS) *</label>
                  <input
                    type="text"
                    value={form.Timestamp}
                    onChange={e => handleInputChange('Timestamp', e.target.value)}
                    placeholder="2024-01-01 12:00:00"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                  <p className="text-[10px] text-gray-500">PostgreSQL compatible timestamp</p>
                </div>

                {/* Numeric Fields */}
                {COLUMNS.filter(c => c !== 'Timestamp').map(col => (
                  <div key={col} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase truncate" title={col.replace(/_/g, ' ')}>
                      {col.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form[col] as number}
                      onChange={e => handleInputChange(col, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer shadow-lg shadow-cyan-900/20"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Record'}
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
                  <h2 className="text-lg font-black text-white">Delete Record</h2>
                  <p className="text-sm text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-300">
                  Are you sure you want to delete the record from <span className="font-mono text-cyan-400">{new Date(deleteTarget.Timestamp).toLocaleString()}</span>?
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
