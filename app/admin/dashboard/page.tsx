'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Cpu,
  MapPin, Zap, AlertTriangle, CheckCircle2, RefreshCw,
  Database, Search, ChevronUp, ChevronDown, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

/* ─────────────────────────── types ─────────────────────────── */
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
  /* live sensor fields (may be null if table missing) */
  HI?: number | null;
  Predicted_HI?: number | null;
  Ambient_Temperature_C?: number | null;
  Age_yr?: number | null;
  Current_A?: number | null;
  Voltage_kV?: number | null;
  Maintenance_Count?: number | null;
  No_of_Short_Circuits?: number | null;
  Outages_hours_per_year?: number | null;
  Timestamp?: string | null;
  /* score fields */
  Temp_score?: number | null;
  Age_score?: number | null;
  Maintenance_score?: number | null;
  ShortCircuit_score?: number | null;
  Outage_score?: number | null;
  Current_score?: number | null;
  Voltage_score?: number | null;
};

type ModalMode = 'add' | 'edit' | null;
type SortKey = keyof Transformer;

/* ─────────────────────────── constants ─────────────────────── */
const STATUS_OPTIONS = ['GOOD', 'MONITOR', 'WARNING', 'CRITICAL'];
const TYPE_OPTIONS   = ['Distribution', 'Step-up', 'Step-down', 'Power', 'Auto'];

const STATUS_COLORS: Record<string, string> = {
  GOOD:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MONITOR:  'text-yellow-400  bg-yellow-500/10  border-yellow-500/30',
  WARNING:  'text-orange-400  bg-orange-500/10  border-orange-500/30',
  CRITICAL: 'text-red-400     bg-red-500/10     border-red-500/30',
};

const DEFAULT_FORM = {
  id: '', name: '', location: '', type: 'Distribution', capacity: 50, status: 'GOOD',
};

/* ─────────────────────────── helpers ───────────────────────── */
const fmt = (v: number | null | undefined, dec = 2) =>
  v == null ? <span className="text-gray-600">—</span> : v.toFixed(dec);

const hi2pct = (hi: number | null | undefined) =>
  hi == null ? null : +(hi * 100).toFixed(1);

/* ═══════════════════════════ COMPONENT ════════════════════════ */
export default function AdminDashboard() {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [filtered,     setFiltered]     = useState<Transformer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [sortKey,      setSortKey]      = useState<SortKey>('id');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc');

  /* modal */
  const [modalMode,   setModalMode]   = useState<ModalMode>(null);
  const [editTarget,  setEditTarget]  = useState<Transformer | null>(null);
  const [form,        setForm]        = useState(DEFAULT_FORM);
  const [saving,      setSaving]      = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<Transformer | null>(null);
  const [cascade,      setCascade]      = useState(true);
  const [deleting,     setDeleting]     = useState(false);

  /* ── fetch ── */
  const fetchTransformers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/transformers');
      const data = await res.json();
      if (data.success) {
        setTransformers(data.data);
      } else {
        toast.error(data.error || 'Failed to load transformers');
      }
    } catch {
      toast.error('Network error – could not fetch transformers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransformers(); }, [fetchTransformers]);

  /* ── filter + sort ── */
  useEffect(() => {
    const q = search.toLowerCase();
    let rows = transformers.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.location || '').toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
    rows = [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    setFiltered(rows);
  }, [transformers, search, sortKey, sortDir]);

  /* ── sort toggle ── */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === 'asc' ? <ChevronUp size={11} className="inline ml-0.5" /> : <ChevronDown size={11} className="inline ml-0.5" />)
      : <ChevronUp size={11} className="inline ml-0.5 opacity-20" />;

  /* ── modals ── */
  const openAdd  = () => { setForm(DEFAULT_FORM); setEditTarget(null); setModalMode('add'); };
  const openEdit = (t: Transformer) => {
    setForm({ id: t.id, name: t.name, location: t.location || '', type: t.type, capacity: t.capacity, status: t.status });
    setEditTarget(t);
    setModalMode('edit');
  };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  /* ── save (add / edit) ── */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const res  = await fetch('/api/admin/transformers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Do NOT send id — server auto-generates it
          body: JSON.stringify({ name: form.name, location: form.location, type: form.type, capacity: form.capacity, status: form.status }),
        });
        const data = await res.json();
        if (data.success) { toast.success(`Transformer ${data.data?.id ?? ''} added! Table created.`); closeModal(); fetchTransformers(); }
        else toast.error(data.error || 'Failed to add transformer');

      } else if (modalMode === 'edit' && editTarget) {
        const res  = await fetch(`/api/admin/transformers/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, location: form.location, type: form.type, capacity: form.capacity, status: form.status }),
        });
        const data = await res.json();
        if (data.success) { toast.success(`Transformer ${editTarget.id} updated!`); closeModal(); fetchTransformers(); }
        else toast.error(data.error || 'Failed to update transformer');
      }
    } catch { toast.error('Network error'); }
    finally  { setSaving(false); }
  };

  /* ── delete (with optional cascade) ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      /* 1) If cascade: drop the sensor table first */
      if (cascade) {
        const cascadeRes  = await fetch(`/api/admin/transformers/${deleteTarget.id}/cascade`, { method: 'DELETE' });
        const cascadeData = await cascadeRes.json();
        /* cascade route may not exist — gracefully skip */
        if (!cascadeRes.ok && cascadeData?.error && !cascadeData.error.includes('not exist')) {
          throw new Error(cascadeData.error);
        }
      }

      /* 2) Delete from transformers metadata table */
      const res  = await fetch(`/api/admin/transformers/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success(
          cascade
            ? `Transformer ${deleteTarget.id} and its sensor data deleted!`
            : `Transformer ${deleteTarget.id} deleted (sensor table kept).`
        );
        setDeleteTarget(null);
        fetchTransformers();
      } else {
        toast.error(data.error || 'Failed to delete transformer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  /* ── summary stats ── */
  const stats = {
    total:    transformers.length,
    active:   transformers.filter(t => t.is_active).length,
    critical: transformers.filter(t => t.status === 'CRITICAL').length,
    warning:  transformers.filter(t => t.status === 'WARNING').length,
    good:     transformers.filter(t => t.status === 'GOOD').length,
  };

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <AdminLayout>
      <div className="p-6 space-y-5 text-gray-100 bg-gray-950 min-h-screen">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Cpu className="text-blue-500" size={28} /> Transformer Records
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Live data fetched via SQL · {transformers.length} transformer(s) in database
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransformers} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-blue-900/30"
            >
              <Plus size={14} /> Add Transformer
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-blue-400',    border: 'border-blue-500/20' },
            { label: 'Active',   value: stats.active,   color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Good',     value: stats.good,     color: 'text-green-400',   border: 'border-green-500/20' },
            { label: 'Warning',  value: stats.warning,  color: 'text-orange-400',  border: 'border-orange-500/20' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400',     border: 'border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-3`}>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
              <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 max-w-sm">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, name, location, status…"
            className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Main Table ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2 text-xs text-gray-400 font-bold uppercase">
            <Database size={13} className="text-blue-400" />
            Transformer Records — SQL Query Result
            <span className="ml-auto text-gray-600">{filtered.length} row(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase bg-gray-900/60">
                  {([
                    { label: 'Name',          key: 'name' },
                    { label: 'Location',      key: 'location' },
                    { label: 'Type',          key: 'type' },
                    { label: 'Cap. (kVA)',    key: 'capacity' },
                    { label: 'Status',        key: 'status' },
                    { label: 'Active',        key: 'is_active' },
                    { label: 'HI (%)',        key: 'HI' },
                    { label: 'Pred. HI',      key: 'Predicted_HI' },
                    { label: 'Temp (°C)',     key: 'Ambient_Temperature_C' },
                    { label: 'Age (yr)',      key: 'Age_yr' },
                    { label: 'Current (A)',   key: 'Current_A' },
                    { label: 'Voltage (kV)', key: 'Voltage_kV' },
                    { label: 'Outages',       key: 'Outages_hours_per_year' },
                    { label: 'Maint.',        key: 'Maintenance_Count' },
                    { label: 'Short Cir.',    key: 'No_of_Short_Circuits' },
                    { label: 'Temp Score',    key: 'Temp_score' },
                    { label: 'Age Score',     key: 'Age_score' },
                    { label: 'Maint. Score',  key: 'Maintenance_score' },
                    { label: 'SC Score',      key: 'ShortCircuit_score' },
                    { label: 'Outage Score',  key: 'Outage_score' },
                    { label: 'Curr. Score',   key: 'Current_score' },
                    { label: 'Volt. Score',   key: 'Voltage_score' },
                    { label: 'Last Reading',  key: 'Timestamp' },
                  ] as { label: string; key: SortKey }[]).map(col => (
                    <th
                      key={col.key}
                      className="py-3 px-4 cursor-pointer whitespace-nowrap hover:text-white transition-colors select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label} <SortIcon k={col.key} />
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={26} className="py-3 px-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="py-16 text-center text-gray-500 font-bold">
                      {search ? 'No results match your search.' : 'No transformers found. Add one to get started.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => {
                    const hiPct = hi2pct(t.HI);
                    const predPct = hi2pct(t.Predicted_HI);
                    return (
                      <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">

                        {/* Name + ID badge combined */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-200">{t.name}</div>
                          <div className="text-[10px] font-mono text-blue-400 mt-0.5">{t.id}</div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={10} className="shrink-0" />{t.location || '—'}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{t.type}</td>

                        {/* Capacity */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Zap size={10} />{t.capacity}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${STATUS_COLORS[t.status] || 'text-gray-400 bg-gray-700 border-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>

                        {/* Active */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {t.is_active
                            ? <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 size={11} />Yes</span>
                            : <span className="flex items-center gap-1 text-gray-500 font-bold"><AlertTriangle size={11} />No</span>}
                        </td>

                        {/* HI % */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {hiPct == null
                            ? <span className="text-gray-600">—</span>
                            : (
                              <div className="flex items-center gap-2">
                                <span className={hiPct < 55 ? 'text-red-400' : hiPct < 70 ? 'text-orange-400' : hiPct < 80 ? 'text-yellow-400' : 'text-emerald-400'}>
                                  {hiPct}%
                                </span>
                                <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${hiPct < 55 ? 'bg-red-500' : hiPct < 70 ? 'bg-orange-500' : hiPct < 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${hiPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                        </td>

                        {/* Predicted HI */}
                        <td className="py-3 px-4 text-blue-300 whitespace-nowrap">
                          {predPct == null ? <span className="text-gray-600">—</span> : `${predPct}%`}
                        </td>

                        {/* Temp */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{fmt(t.Ambient_Temperature_C, 1)}</td>

                        {/* Age */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{fmt(t.Age_yr, 1)}</td>

                        {/* Current */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{fmt(t.Current_A, 1)}</td>

                        {/* Voltage */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{fmt(t.Voltage_kV, 2)}</td>

                        {/* Outages */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{fmt(t.Outages_hours_per_year, 1)}</td>

                        {/* Maintenance */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{t.Maintenance_Count ?? <span className="text-gray-600">—</span>}</td>

                        {/* Short Circuits */}
                        <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{t.No_of_Short_Circuits ?? <span className="text-gray-600">—</span>}</td>

                        {/* Score fields */}
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Temp_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Age_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Maintenance_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.ShortCircuit_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Outage_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Current_score, 4)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmt(t.Voltage_score, 4)}</td>

                        {/* Last Reading Timestamp */}
                        <td className="py-3 px-4 text-gray-500 font-mono whitespace-nowrap text-[10px]">
                          {t.Timestamp
                            ? new Date(t.Timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : <span className="text-gray-600">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/transformers/${t.id.replace(/\D/g, '')}`}
                              className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-700 rounded-lg transition-all"
                              title="View sensor data"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                              title="Edit metadata"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(t); setCascade(true); }}
                              className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
              <span>Showing <span className="text-gray-300 font-bold">{filtered.length}</span> of <span className="text-gray-300 font-bold">{transformers.length}</span> transformers</span>
              <span className="text-gray-600">Live data · sorted by <span className="text-gray-400">{String(sortKey)}</span> ({sortDir})</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ Add / Edit Modal ══════════════ */}
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
                  {modalMode === 'add' ? '＋ Add Transformer' : `Edit · ${editTarget?.id}`}
                </h2>
                <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* NO id field for Add — auto-generated by server */}
                {modalMode === 'edit' && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold uppercase">ID</span>
                    <span className="font-mono font-black text-white ml-2">{editTarget?.id}</span>
                    <span className="ml-auto text-[10px] text-gray-600">Auto-assigned, not editable</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Name *</label>
                  <input
                    type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Transformer 26"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Location</label>
                    <input
                      type="text" value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Substation Alpha"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Capacity (kVA)</label>
                    <input
                      type="number" value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                    <select
                      value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                      {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                    <select
                      value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeModal} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════ Delete Confirm Modal ══════════════ */}
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
                  <p className="text-xs text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-1.5">
                <p className="text-sm text-gray-300">
                  Delete <span className="font-black text-white">{deleteTarget.id}</span> — {deleteTarget.name}?
                </p>
                <p className="text-xs text-gray-500">Location: {deleteTarget.location || 'N/A'} · Status: {deleteTarget.status}</p>
              </div>

              {/* Cascade toggle */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input
                    type="checkbox"
                    checked={cascade}
                    onChange={e => setCascade(e.target.checked)}
                    className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-300 group-hover:text-red-200 transition-colors">
                    Also delete sensor data table (CASCADE)
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Drops the <code className="text-gray-400 font-mono">transformer_{deleteTarget.id.replace(/\D/g, '')}</code> table from the database permanently.
                  </p>
                </div>
              </label>

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
                  {deleting ? 'Deleting…' : cascade ? 'Delete + Cascade' : 'Delete Record Only'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
