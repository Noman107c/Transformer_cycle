'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Database,
  ArrowLeft, RefreshCw, Calendar, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─── */
type TransformerData = {
  Timestamp: string;
  Ambient_Temperature_C: number | null;
  Age_yr: number | null;
  Maintenance_Count: number | null;
  No_of_Short_Circuits: number | null;
  Outages_hours_per_year: number | null;
  Current_A: number | null;
  Voltage_kV: number | null;
  Temp_score: number | null;
  Age_score: number | null;
  Maintenance_score: number | null;
  ShortCircuit_score: number | null;
  Outage_score: number | null;
  Current_score: number | null;
  Voltage_score: number | null;
  HI: number | null;
  Predicted_HI: number | null;
};

/* ─── Column metadata for UI labelling ─── */
const COL_META: { key: keyof TransformerData; label: string; unit?: string; group: string }[] = [
  { key: 'Timestamp',              label: 'Timestamp',           group: 'info' },
  { key: 'HI',                     label: 'Health Index',        unit: '(0–1)', group: 'health' },
  { key: 'Predicted_HI',          label: 'Predicted HI',        unit: '(0–1)', group: 'health' },
  { key: 'Ambient_Temperature_C', label: 'Ambient Temp',         unit: '°C',    group: 'sensor' },
  { key: 'Age_yr',                 label: 'Age',                 unit: 'yr',    group: 'sensor' },
  { key: 'Current_A',             label: 'Current',              unit: 'A',     group: 'sensor' },
  { key: 'Voltage_kV',            label: 'Voltage',              unit: 'kV',    group: 'sensor' },
  { key: 'Outages_hours_per_year',label: 'Outages',              unit: 'hr/yr', group: 'sensor' },
  { key: 'Maintenance_Count',     label: 'Maintenance Count',    group: 'sensor' },
  { key: 'No_of_Short_Circuits',  label: 'Short Circuits',       group: 'sensor' },
  { key: 'Temp_score',            label: 'Temp Score',           group: 'score' },
  { key: 'Age_score',             label: 'Age Score',            group: 'score' },
  { key: 'Maintenance_score',     label: 'Maint. Score',         group: 'score' },
  { key: 'ShortCircuit_score',    label: 'Short Cir. Score',     group: 'score' },
  { key: 'Outage_score',          label: 'Outage Score',         group: 'score' },
  { key: 'Current_score',         label: 'Current Score',        group: 'score' },
  { key: 'Voltage_score',         label: 'Voltage Score',        group: 'score' },
];

const ALL_KEYS = COL_META.map(c => c.key);

const DEFAULT_FORM: TransformerData = {
  Timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  Ambient_Temperature_C: 0, Age_yr: 0, Maintenance_Count: 0,
  No_of_Short_Circuits: 0, Outages_hours_per_year: 0,
  Current_A: 0, Voltage_kV: 0,
  Temp_score: 0, Age_score: 0, Maintenance_score: 0,
  ShortCircuit_score: 0, Outage_score: 0, Current_score: 0, Voltage_score: 0,
  HI: 0, Predicted_HI: 0,
};

/* ─── helpers ─── */
const fmtVal = (v: number | null | undefined) =>
  v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, '');

const hiColor = (hi: number | null) => {
  if (hi == null) return 'text-gray-500';
  const pct = hi * 100;
  if (pct < 55) return 'text-red-400';
  if (pct < 70) return 'text-orange-400';
  if (pct < 80) return 'text-yellow-400';
  return 'text-emerald-400';
};

/* ═══════════════ COMPONENT ═══════════════ */
export default function TransformerDataPage({ params }: { params: Promise<{ id: string }> }) {
  const transformerId = React.use(params).id;

  const [data,         setData]         = useState<TransformerData[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalMode,    setModalMode]    = useState<'add' | 'edit' | null>(null);
  const [editTarget,   setEditTarget]   = useState<TransformerData | null>(null);
  const [form,         setForm]         = useState<TransformerData>(DEFAULT_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransformerData | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res     = await fetch(`/api/admin/transformers/${transformerId}/data`);
      const resData = await res.json();
      if (resData.success) setData(resData.data);
      else toast.error(resData.error || 'Failed to load data');
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [transformerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── open modals ── */
  const openAdd = () => {
    setForm({ ...DEFAULT_FORM, Timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (record: TransformerData) => {
    const ts = record.Timestamp
      ? new Date(new Date(record.Timestamp).getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString().slice(0, 19).replace('T', ' ')
      : record.Timestamp;
    setForm({ ...record, Timestamp: ts });
    setEditTarget(record);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  /* ── save ── */
  const handleSave = async () => {
    if (!form.Timestamp) { toast.error('Timestamp is required'); return; }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const res    = await fetch(`/api/admin/transformers/${transformerId}/data`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const result = await res.json();
        if (result.success) { toast.success('Record added!'); closeModal(); fetchData(); }
        else toast.error(result.error || 'Failed to add');

      } else if (modalMode === 'edit' && editTarget) {
        // Use capital-T key — matches the API's destructuring
        const payload = { ...form, original_Timestamp: editTarget.Timestamp };
        const res     = await fetch(`/api/admin/transformers/${transformerId}/data`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result  = await res.json();
        if (result.success) { toast.success('Record updated!'); closeModal(); fetchData(); }
        else toast.error(result.error || 'Failed to update');
      }
    } catch { toast.error('Network error'); }
    finally  { setSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ts  = encodeURIComponent(deleteTarget.Timestamp);
      const res = await fetch(`/api/admin/transformers/${transformerId}/data?ts=${ts}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast.success('Record deleted!'); setDeleteTarget(null); fetchData(); }
      else toast.error(result.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
    finally   { setDeleting(false); }
  };

  /* ── input change ── */
  const handleInput = (field: keyof TransformerData, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'Timestamp' ? value : (value === '' ? null : Number(value)),
    }));
  };

  /* ── summary from latest record ── */
  const latest = data[0];

  /* ══════════════ RENDER ══════════════ */
  return (
    <AdminLayout>
      <div className="p-6 space-y-5 text-gray-100 bg-gray-950 min-h-screen">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Database className="text-cyan-500" size={26} />
                Transformer <span className="text-cyan-400">{transformerId}</span> — Sensor Records
              </h1>
              <p className="text-gray-400 text-xs mt-1">
                All readings from <code className="text-gray-300 font-mono">transformer_{transformerId.replace(/\D/g,'')}</code> table · {data.length} row(s) loaded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-xs uppercase transition-all"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-cyan-900/30"
            >
              <Plus size={14} /> Add Record
            </button>
          </div>
        </div>

        {/* Latest reading summary strip */}
        {!loading && latest && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: 'HI',          val: latest.HI != null ? `${(latest.HI * 100).toFixed(1)}%` : '—', cls: hiColor(latest.HI) },
              { label: 'Pred. HI',    val: latest.Predicted_HI != null ? `${(latest.Predicted_HI * 100).toFixed(1)}%` : '—', cls: 'text-blue-400' },
              { label: 'Temp °C',     val: fmtVal(latest.Ambient_Temperature_C), cls: 'text-amber-400' },
              { label: 'Age yr',      val: fmtVal(latest.Age_yr), cls: 'text-purple-400' },
              { label: 'Current A',   val: fmtVal(latest.Current_A), cls: 'text-sky-400' },
              { label: 'Voltage kV',  val: fmtVal(latest.Voltage_kV), cls: 'text-indigo-400' },
              { label: 'Maint.',      val: latest.Maintenance_Count ?? '—', cls: 'text-teal-400' },
              { label: 'Short Cir.', val: latest.No_of_Short_Circuits ?? '—', cls: 'text-pink-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[9px] text-gray-500 font-bold uppercase">{s.label}</span>
                <span className={`text-base font-black ${s.cls}`}>{String(s.val)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
            <Activity size={13} className="text-cyan-400" />
            Sensor Data Records
            <span className="ml-auto text-gray-600">{data.length} row(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-gray-900/60">
                  <th className="py-3 px-4 sticky left-0 z-10 bg-gray-900/90">Actions</th>
                  {COL_META.map(c => (
                    <th key={c.key} className="py-3 px-4">
                      {c.label}{c.unit ? <span className="text-gray-600 ml-1">{c.unit}</span> : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4 sticky left-0 bg-gray-900">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-12" />
                      </td>
                      {COL_META.map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-14" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={COL_META.length + 1} className="py-16 text-center text-gray-500 font-bold">
                      No records found. Click &ldquo;Add Record&rdquo; to insert the first reading.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.Timestamp || i} className="hover:bg-gray-800/30 transition-colors">
                      {/* Sticky Actions */}
                      <td className="py-2.5 px-4 sticky left-0 z-10 bg-gray-900 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.6)]">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Data cells */}
                      {COL_META.map(c => (
                        <td
                          key={c.key}
                          className={`py-2.5 px-4 ${
                            c.key === 'Timestamp'
                              ? 'font-mono text-cyan-400 font-semibold'
                              : c.key === 'HI'
                              ? hiColor(row.HI as number)
                              : c.key === 'Predicted_HI'
                              ? 'text-blue-400'
                              : c.group === 'score'
                              ? 'text-gray-500'
                              : 'text-gray-300'
                          }`}
                        >
                          {c.key === 'Timestamp'
                            ? new Date(row[c.key] as string).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                              })
                            : fmtVal(row[c.key] as number | null)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && data.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-800 text-[10px] text-gray-500">
              <span className="text-gray-400 font-bold">{data.length}</span> records · sorted by Timestamp DESC · latest: {' '}
              <span className="font-mono text-gray-400">
                {new Date(data[0].Timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══════ Add / Edit Modal ══════ */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl shadow-2xl space-y-5 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  {modalMode === 'add'
                    ? <><Plus className="text-cyan-500" size={20}/> Add Sensor Record — {transformerId}</>
                    : <><Pencil className="text-blue-500" size={18}/> Edit Sensor Record — {transformerId}</>
                  }
                </h2>
                <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Fields Grid */}
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">

                {/* Timestamp — full row */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                    <Calendar size={12} /> Timestamp *
                  </label>
                  <input
                    type="text"
                    value={form.Timestamp}
                    onChange={e => handleInput('Timestamp', e.target.value)}
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    className="w-full bg-gray-950 border border-cyan-700/40 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-500">Format: YYYY-MM-DD HH:MM:SS (PostgreSQL timestamp)</p>
                </div>

                {/* Sensor readings */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Sensor Readings</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {COL_META.filter(c => c.group === 'sensor').map(c => (
                      <div key={c.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          {c.label}{c.unit ? <span className="text-gray-600 ml-1">{c.unit}</span> : ''}
                        </label>
                        <input
                          type="number" step="any"
                          value={form[c.key] ?? ''}
                          onChange={e => handleInput(c.key, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Index */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Health Index</p>
                  <div className="grid grid-cols-2 gap-3">
                    {COL_META.filter(c => c.group === 'health').map(c => (
                      <div key={c.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-400 uppercase">
                          {c.label} {c.unit}
                        </label>
                        <input
                          type="number" step="any" min="0" max="1"
                          value={form[c.key] ?? ''}
                          onChange={e => handleInput(c.key, e.target.value)}
                          className="w-full bg-gray-800 border border-emerald-700/40 rounded-lg px-3 py-2 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scores */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Score Fields</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {COL_META.filter(c => c.group === 'score').map(c => (
                      <div key={c.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">{c.label}</label>
                        <input
                          type="number" step="any"
                          value={form[c.key] ?? ''}
                          onChange={e => handleInput(c.key, e.target.value)}
                          className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button onClick={closeModal} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving…' : 'Save Record'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════ Delete Confirm Modal ══════ */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  <p className="text-xs text-gray-400">This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-sm text-gray-300">
                  Delete reading from{' '}
                  <span className="font-mono text-cyan-400 font-bold">
                    {new Date(deleteTarget.Timestamp).toLocaleString()}
                  </span>?
                </p>
                {deleteTarget.HI != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    HI: {(deleteTarget.HI * 100).toFixed(1)}% · Temp: {deleteTarget.Ambient_Temperature_C ?? '—'} °C
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
