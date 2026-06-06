'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Plus, Edit2, Trash2, Calendar, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';

interface Transformer {
  _id: string;
  name: string;
  transformerId: string;
  location?: string;
}

interface TransformerDataManagementModalProps {
  transformer: Transformer | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent: () => void;
}

export function TransformerDataManagementModal({
  transformer,
  isOpen,
  onClose,
  onRefreshParent,
}: TransformerDataManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'import' | 'edit'>('add');
  const [readings, setReadings] = useState<any[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    timestamp: '',
    ageYr: '',
    ambientTemperatureC: '',
    noOfShortCircuits: '',
    maintenanceCount: '',
    outagesHoursPerYear: '',
    voltageKV: '',
    currentA: '',
    tempScore: '',
    ageScore: '',
    maintenanceScore: '',
    shortCircuitScore: '',
    outageScore: '',
    currentScore: '',
    voltageScore: '',
    healthIndex: '',
    predictedHealthIndex: '',
  });

  // Reading Inline Editing States
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    if (isOpen && transformer) {
      loadReadings();
      resetForms();
      setActiveTab('add');
    }
  }, [isOpen, transformer]);

  const resetForms = () => {
    // Set timestamp to current date/time in local timezone input format (YYYY-MM-DDTHH:MM)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    
    setManualForm({
      timestamp: localISOTime,
      ageYr: '5.0',
      ambientTemperatureC: '25.0',
      noOfShortCircuits: '0',
      maintenanceCount: '2',
      outagesHoursPerYear: '10.0',
      voltageKV: '11.0',
      currentA: '400',
      tempScore: '1.0',
      ageScore: '0.8',
      maintenanceScore: '1.0',
      shortCircuitScore: '1.0',
      outageScore: '1.0',
      currentScore: '1.0',
      voltageScore: '1.0',
      healthIndex: '0.85',
      predictedHealthIndex: '0.84',
    });
    setCsvFile(null);
    setUploadProgress(0);
    setCsvErrors([]);
    setEditingReadingId(null);
    setEditForm(null);
  };

  const loadReadings = async () => {
    if (!transformer) return;
    setLoadingReadings(true);
    try {
      const res = await fetch(`/api/transformer/data?transformerId=${transformer._id}`);
      const data = await res.json();
      if (data.success) {
        setReadings(data.data);
      } else {
        toast.error(data.error || 'Failed to load readings');
      }
    } catch (err) {
      toast.error('Failed to load readings');
    } finally {
      setLoadingReadings(false);
    }
  };

  // Handle Manual Add Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transformer) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/transformer/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformerId: transformer._id,
          ...manualForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Reading added successfully!');
        resetForms();
        loadReadings();
        onRefreshParent();
      } else {
        toast.error(data.error || 'Failed to add reading');
      }
    } catch (err) {
      toast.error('Error adding reading');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Parsing & Upload
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvErrors([]);
      setUploadProgress(0);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !transformer) return;
    setSubmitting(true);
    setUploadProgress(10);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        setUploadProgress(30);

        try {
          const res = await fetch('/api/transformer/data/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transformerId: transformer._id,
              csvText: text,
            }),
          });
          setUploadProgress(70);
          
          const data = await res.json();
          setUploadProgress(100);

          if (res.ok && data.success) {
            toast.success(data.message || 'CSV imported successfully!');
            setCsvFile(null);
            loadReadings();
            onRefreshParent();
          } else {
            if (data.errors && Array.isArray(data.errors)) {
              setCsvErrors(data.errors);
              toast.error('CSV import failed validation');
            } else {
              toast.error(data.error || 'Failed to import CSV');
            }
          }
        } catch (err) {
          toast.error('Error importing CSV data');
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsText(csvFile);
    } catch (err) {
      toast.error('Failed to read file');
      setSubmitting(false);
    }
  };

  // Delete Reading
  const handleDeleteReading = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this reading?')) return;
    try {
      const res = await fetch(`/api/transformer/data/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Reading deleted successfully');
        loadReadings();
        onRefreshParent();
      } else {
        toast.error(data.error || 'Failed to delete reading');
      }
    } catch (err) {
      toast.error('Error deleting reading');
    }
  };

  // Start Inline Edit
  const startEditing = (reading: any) => {
    setEditingReadingId(reading._id);
    // Format timestamp back to local datetime input format
    const date = new Date(reading.timestamp);
    const offset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    
    setEditForm({
      ...reading,
      timestamp: localISO,
    });
  };

  // Save Inline Edit
  const handleSaveEdit = async () => {
    if (!editForm || !editingReadingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transformer/data/${editingReadingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Reading updated successfully');
        setEditingReadingId(null);
        setEditForm(null);
        loadReadings();
        onRefreshParent();
      } else {
        toast.error(data.error || 'Failed to update reading');
      }
    } catch (err) {
      toast.error('Error updating reading');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700 text-white flex flex-col p-0 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-start bg-gray-800/40">
          <div>
            <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
              <Calendar className="text-cyan-400" size={24} />
              Readings Management: {transformer?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-1">
              Add, upload, edit, or delete sensor diagnostic data points for transformer {transformer?.name}.
            </DialogDescription>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex bg-gray-950/60 border-b border-gray-800 p-2 gap-2">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Plus size={14} /> Manual Add Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Upload size={14} /> CSV Import Data
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Edit2 size={14} /> Edit Existing Data ({readings.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          
          {/* TAB 1: MANUAL ADD FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Primary Parameters */}
                <div className="space-y-4 md:col-span-3 border-b border-gray-800 pb-2">
                  <h4 className="text-sm font-black tracking-wider text-cyan-400 uppercase">1. Core Operational Reading Details</h4>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timestamp" className="text-gray-300 text-xs font-bold">Timestamp *</Label>
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    required
                    value={manualForm.timestamp}
                    onChange={(e) => setManualForm(prev => ({ ...prev, timestamp: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ageYr" className="text-gray-300 text-xs font-bold">Age (years) *</Label>
                  <Input
                    id="ageYr"
                    type="number"
                    step="0.01"
                    required
                    value={manualForm.ageYr}
                    onChange={(e) => setManualForm(prev => ({ ...prev, ageYr: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ambientTemperatureC" className="text-gray-300 text-xs font-bold">Ambient Temp (°C) *</Label>
                  <Input
                    id="ambientTemperatureC"
                    type="number"
                    step="0.01"
                    required
                    value={manualForm.ambientTemperatureC}
                    onChange={(e) => setManualForm(prev => ({ ...prev, ambientTemperatureC: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="voltageKV" className="text-gray-300 text-xs font-bold">Voltage (kV) *</Label>
                  <Input
                    id="voltageKV"
                    type="number"
                    step="0.001"
                    required
                    value={manualForm.voltageKV}
                    onChange={(e) => setManualForm(prev => ({ ...prev, voltageKV: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currentA" className="text-gray-300 text-xs font-bold">Current (A) *</Label>
                  <Input
                    id="currentA"
                    type="number"
                    step="0.1"
                    required
                    value={manualForm.currentA}
                    onChange={(e) => setManualForm(prev => ({ ...prev, currentA: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="noOfShortCircuits" className="text-gray-300 text-xs font-bold">No. of Short Circuits *</Label>
                  <Input
                    id="noOfShortCircuits"
                    type="number"
                    required
                    value={manualForm.noOfShortCircuits}
                    onChange={(e) => setManualForm(prev => ({ ...prev, noOfShortCircuits: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maintenanceCount" className="text-gray-300 text-xs font-bold">Maintenance Count *</Label>
                  <Input
                    id="maintenanceCount"
                    type="number"
                    required
                    value={manualForm.maintenanceCount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, maintenanceCount: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outagesHoursPerYear" className="text-gray-300 text-xs font-bold">Outages (hrs/yr) *</Label>
                  <Input
                    id="outagesHoursPerYear"
                    type="number"
                    step="0.01"
                    required
                    value={manualForm.outagesHoursPerYear}
                    onChange={(e) => setManualForm(prev => ({ ...prev, outagesHoursPerYear: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                {/* Score parameters */}
                <div className="space-y-4 md:col-span-3 border-b border-gray-800 pt-4 pb-2">
                  <h4 className="text-sm font-black tracking-wider text-cyan-400 uppercase">2. Subsystem Reliability Scores (0.0 to 1.0)</h4>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tempScore" className="text-gray-300 text-xs font-bold">Temp Score *</Label>
                  <Input
                    id="tempScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.tempScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, tempScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ageScore" className="text-gray-300 text-xs font-bold">Age Score *</Label>
                  <Input
                    id="ageScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.ageScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, ageScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maintenanceScore" className="text-gray-300 text-xs font-bold">Maintenance Score *</Label>
                  <Input
                    id="maintenanceScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.maintenanceScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, maintenanceScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shortCircuitScore" className="text-gray-300 text-xs font-bold">Short Circuit Score *</Label>
                  <Input
                    id="shortCircuitScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.shortCircuitScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, shortCircuitScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outageScore" className="text-gray-300 text-xs font-bold">Outage Score *</Label>
                  <Input
                    id="outageScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.outageScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, outageScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currentScore" className="text-gray-300 text-xs font-bold">Current Score *</Label>
                  <Input
                    id="currentScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.currentScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, currentScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="voltageScore" className="text-gray-300 text-xs font-bold">Voltage Score *</Label>
                  <Input
                    id="voltageScore"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={manualForm.voltageScore}
                    onChange={(e) => setManualForm(prev => ({ ...prev, voltageScore: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                {/* Health Index details */}
                <div className="space-y-4 md:col-span-3 border-b border-gray-800 pt-4 pb-2">
                  <h4 className="text-sm font-black tracking-wider text-cyan-400 uppercase">3. Health Assessment (0.0 to 1.0)</h4>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="healthIndex" className="text-gray-300 text-xs font-bold">Current Health Index (HI) *</Label>
                  <Input
                    id="healthIndex"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    required
                    value={manualForm.healthIndex}
                    onChange={(e) => setManualForm(prev => ({ ...prev, healthIndex: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="predictedHealthIndex" className="text-gray-300 text-xs font-bold">Predicted Health Index (Predicted_HI)</Label>
                  <Input
                    id="predictedHealthIndex"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={manualForm.predictedHealthIndex}
                    onChange={(e) => setManualForm(prev => ({ ...prev, predictedHealthIndex: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    placeholder="Same as current if blank"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForms}
                  disabled={submitting}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : 'Save Reading'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: CSV IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              
              {/* Drag and Drop Container */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 bg-gray-950/40 hover:bg-gray-950/70 p-10 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleCsvSelect}
                  className="hidden"
                />
                
                <div className="p-4 bg-gray-800/80 rounded-full text-cyan-400 mb-4 shadow-inner">
                  <Upload size={32} />
                </div>
                
                <h3 className="text-lg font-bold text-white">Choose CSV File</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-md">
                  Upload historical dataset for {transformer?.name}. Must contain headers matching: Timestamp, Age_yr, Ambient_Temperature_C, No_of_Short_Circuits, Maintenance_Count, Outages_hours_per_year, Voltage_kV, Temp_score, Age_score, ShortCircuit_score, Outage_score, Current_score, Voltage_score, HI, Predicted_HI.
                </p>
                
                {csvFile && (
                  <div className="mt-4 px-4 py-2 bg-gray-800/90 rounded-lg flex items-center gap-2 border border-gray-700 animate-fadeIn">
                    <FileText size={16} className="text-yellow-400" />
                    <span className="text-xs font-bold text-white max-w-[200px] truncate">{csvFile.name}</span>
                    <span className="text-[10px] text-gray-400">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCsvFile(null);
                      }} 
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress > 0 && (
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-400">Import Progress</span>
                    <span className="text-cyan-400">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Display errors */}
              {csvErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-2 animate-fadeIn max-h-[200px] overflow-y-auto">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertCircle size={14} />
                    CSV Validation Errors ({csvErrors.length})
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-red-300 space-y-1">
                    {csvErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvErrors([]);
                    setUploadProgress(0);
                  }}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  Clear Selection
                </Button>
                <Button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                    </>
                  ) : 'Import CSV Data'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: LIST / EDIT READINGS */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              
              {loadingReadings ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                  <span className="text-xs text-gray-400">Loading historical data...</span>
                </div>
              ) : readings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                  <FileText size={40} className="text-gray-600" />
                  <span className="text-sm font-semibold">No readings recorded yet</span>
                  <span className="text-xs text-gray-500">Go to Manual Add or CSV Import to populate data.</span>
                </div>
              ) : (
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950/20">
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-800/80 border-b border-gray-800 text-gray-400 font-bold sticky top-0 z-10">
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-3 py-3 text-center">HI %</th>
                          <th className="px-3 py-3 text-center">Temp °C</th>
                          <th className="px-3 py-3 text-center">Voltage kV</th>
                          <th className="px-3 py-3 text-center">Current A</th>
                          <th className="px-3 py-3 text-center">Outages</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {readings.map((reading) => {
                          const isEditing = editingReadingId === reading._id;
                          
                          if (isEditing && editForm) {
                            return (
                              <tr key={reading._id} className="bg-gray-800/40 hover:bg-gray-800/60 transition-colors animate-pulseFast">
                                <td className="px-4 py-2">
                                  <Input
                                    type="datetime-local"
                                    value={editForm.timestamp}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, timestamp: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 w-38"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    value={editForm.healthIndex}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, healthIndex: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 text-center w-16 mx-auto"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editForm.ambientTemperatureC}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, ambientTemperatureC: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 text-center w-16 mx-auto"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.voltageKV}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, voltageKV: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 text-center w-16 mx-auto"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editForm.currentA}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, currentA: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 text-center w-16 mx-auto"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editForm.outagesHoursPerYear}
                                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, outagesHoursPerYear: e.target.value }))}
                                    className="bg-gray-900 border-gray-700 text-white text-xs h-7 py-0.5 px-2 text-center w-16 mx-auto"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={submitting}
                                      className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-6 py-0.5 px-2 font-bold"
                                    >
                                      {submitting ? 'Save...' : 'Save'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingReadingId(null);
                                        setEditForm(null);
                                      }}
                                      className="bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 text-[10px] h-6 py-0.5 px-2"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={reading._id} className="hover:bg-gray-800/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-white">
                                {new Date(reading.timestamp).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-center text-cyan-300 font-extrabold">
                                {(reading.healthIndex * 100).toFixed(1)}%
                              </td>
                              <td className="px-3 py-3 text-center text-gray-300">
                                {reading.ambientTemperatureC?.toFixed(1)} °C
                              </td>
                              <td className="px-3 py-3 text-center text-gray-300">
                                {reading.voltageKV?.toFixed(2)} kV
                              </td>
                              <td className="px-3 py-3 text-center text-gray-300">
                                {reading.currentA?.toFixed(0)} A
                              </td>
                              <td className="px-3 py-3 text-center text-gray-300">
                                {reading.outagesHoursPerYear?.toFixed(1)} hrs/yr
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => startEditing(reading)}
                                    className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                                    title="Edit details"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReading(reading._id)}
                                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                    title="Delete reading"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
}
