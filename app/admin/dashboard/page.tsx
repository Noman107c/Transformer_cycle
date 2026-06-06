'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { Upload, RefreshCw, FileText, CheckCircle2, AlertCircle, Cpu, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [syncing, setSyncing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        
        // Notify dashboard tabs to refresh
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('transformer_updates');
          bc.postMessage('refresh');
          bc.close();
        }
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
      
      // Read file content
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
        body: JSON.stringify({
          transformerId,
          fileType,
          fileContent
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Uploaded successfully to ${transformerId}!`);
        
        // Notify dashboard tabs to refresh
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('transformer_updates');
          bc.postMessage('refresh');
          bc.close();
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

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 text-gray-100 bg-gray-950 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Cpu className="text-blue-500" size={32} /> Dataset Control Center
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Upload raw CSV/JSON records to database and sync optimized assets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Re-slicing...' : 'Sync & Re-slice All'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-950/20 border border-blue-800/30 rounded-xl flex items-start gap-3 text-blue-300 max-w-4xl text-xs leading-relaxed">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
          <div>
            <span className="font-bold text-white uppercase block mb-1">Architecture Note</span>
            When you upload a new dataset, the backend stores the full file in the raw database (`json/T*.json`) and automatically extracts and compiles the last 500 records into a client-optimized payload in the public store (`public/json/T*.json`). Open client dashboards will auto-refresh.
          </div>
        </div>

        {/* Grid of upload widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 25 }, (_, i) => {
            const id = `T${i + 1}`;
            return (
              <div 
                key={id}
                className="bg-gray-900 border border-gray-850 p-5 rounded-xl shadow-lg hover:border-blue-900/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-800 rounded-lg text-blue-400">
                      <HardDrive size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm">Transformer {id}</span>
                      <p className="text-[10px] text-gray-500 font-mono">public/json/{id}.json</p>
                    </div>
                  </div>
                  {uploadingId === id ? (
                    <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Uploading...
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold uppercase bg-gray-800 px-2 py-0.5 rounded">
                      Ready
                    </span>
                  )}
                </div>

                <div className="border border-dashed border-gray-700 hover:border-blue-500/50 rounded-lg p-4 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer group">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(id, file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingId !== null}
                  />
                  <Upload className="text-gray-500 group-hover:text-blue-400 transition-colors mb-2" size={24} />
                  <span className="text-xs font-semibold text-gray-300 group-hover:text-white">
                    Drop file or click to select
                  </span>
                  <span className="text-[9px] text-gray-500 mt-1">
                    Accepts CSV (.csv) or JSON (.json)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminLayout>
  );
}
