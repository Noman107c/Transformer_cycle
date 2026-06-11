'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Calendar, 
  Settings, 
  CheckCircle,
  Clock,
  Sparkles,
  TrendingDown,
  Wrench,
  AlertTriangle,
  Cpu
} from 'lucide-react';

const reportTemplates = [
  { id: 'TMP-001', name: 'Fleet Health & Aging Audit', desc: 'Comprehensive condition evaluation of all 25 distribution units, including average health scores, moderate/critical allocations, and risk matrices.', icon: Cpu, type: 'Health', color: 'text-green-400 bg-green-500/10' },
  { id: 'TMP-002', name: 'ML Remaining Useful Life Prognostics', desc: 'Detailed RUL prediction parameters via XGBoost regressor model, residual regressions charts, and aging curves.', icon: TrendingDown, type: 'Analytics', color: 'text-cyan-400 bg-cyan-500/10' },
  { id: 'TMP-003', name: 'Completed & Scheduled Maintenance Registry', desc: 'Chronological timeline of resolved overhauls, technician log logs, oil refinement indexes, and upcoming schedules.', icon: Wrench, type: 'Maintenance', color: 'text-yellow-400 bg-yellow-500/10' },
  { id: 'TMP-004', name: 'Anomaly & Severity-Critical Alert Logbook', desc: 'Categorized database logs of all warning and critical sensor triggers, furan/temp limit spikes, and resolution times.', icon: AlertTriangle, type: 'Safety', color: 'text-red-400 bg-red-500/10' },
];

export default function ReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('TMP-001');
  const [reportFormat, setReportFormat] = useState('PDF');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStep, setCompileStep] = useState(0);

  const handleGenerateReport = () => {
    setIsCompiling(true);
    setCompileStep(1);

    setTimeout(() => {
      setCompileStep(2);
    }, 1000);

    setTimeout(() => {
      setCompileStep(3);
    }, 2200);

    setTimeout(() => {
      setIsCompiling(false);
      setCompileStep(0);
      
      // Simulate file download
      const content = `TranSys Fleet Asset Report - Template ${selectedTemplate}\nCompiled on: ${new Date().toLocaleString()}\nFormat: ${reportFormat}\nTotal Records Analyzed: 2,92,200\nExecution Status: Verified`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transys_compiled_report_${selectedTemplate.toLowerCase()}.${reportFormat.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Report generated successfully! \nDownloading: transys_compiled_report_${selectedTemplate.toLowerCase()}.${reportFormat.toLowerCase()}`);
    }, 3200);
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="text-cyan-400" size={28} /> Reports
          </h1>
          <p className="text-muted-foreground text-sm">Compile analytical summaries, customize report parameters, and trigger virtual document compilation engines</p>
        </div>
      </div>

      {/* Select Report Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Templates selector grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-wider">Select Report Template</h2>
          <div className="grid grid-cols-1 gap-4">
            {reportTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  onClick={() => !isCompiling && setSelectedTemplate(template.id)}
                  className={`glassmorphism rounded-xl border p-4 bg-[#151a37]/35 cursor-pointer transition-all duration-300 flex items-start gap-4 hover:border-cyan-500/30 ${
                    selectedTemplate === template.id 
                      ? 'border-blue-500 neon-glow bg-blue-500/5' 
                      : 'border-blue-500/10'
                  } ${isCompiling ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${template.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-white leading-none">{template.name}</h3>
                      <span className="text-[9px] bg-blue-500/10 text-cyan-400 font-extrabold px-1.5 py-0.2 rounded uppercase border border-blue-500/20">{template.type}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">{template.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customize Options & Run Compiler */}
        <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 flex flex-col justify-between h-fit space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings size={14} className="text-cyan-400" /> Customize Compilation Parameters
            </h2>

            <div className="space-y-4 text-xs font-semibold leading-relaxed">
              
              {/* Formats Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground uppercase text-[10px]">Select Export Format</label>
                <div className="flex gap-2">
                  {['PDF', 'Excel', 'Word'].map((format) => (
                    <button
                      key={format}
                      type="button"
                      disabled={isCompiling}
                      onClick={() => setReportFormat(format)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                        reportFormat === format 
                          ? 'bg-blue-600 border-blue-500 text-white font-black' 
                          : 'bg-[#121633] border-blue-500/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {format} Document
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope details */}
              <div className="bg-[#0a0e27]/40 border border-blue-500/5 rounded-lg p-3 space-y-1.5 text-[10px] text-muted-foreground shadow-inner">
                <p>&bull; Target dataset: <span className="text-white font-bold">2,92,200 sensor ticks</span></p>
                <p>&bull; Model inclusion: <span className="text-white font-bold">XGBoost degradation curves</span></p>
                <p>&bull; Diagnostic scope: <span className="text-white font-bold">Health / Maintenance / Alerts logs</span></p>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-blue-500/5 flex flex-col items-center justify-center min-h-[100px]">
            <AnimatePresence mode="wait">
              {!isCompiling ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleGenerateReport}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase rounded-lg shadow-md neon-glow flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95"
                >
                  <Download size={14} /> Compile &amp; Download Document
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-1 font-bold text-xs">
                    {compileStep === 1 && <p className="text-cyan-300 animate-pulse">Aggregating sensor diagnostic database...</p>}
                    {compileStep === 2 && <p className="text-[#a855f7] animate-pulse">Rendering model importance vector charts...</p>}
                    {compileStep === 3 && <p className="text-[#10b981] animate-pulse">Compiling final {reportFormat} document...</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Recents compiled logs */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col space-y-4">
        <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={14} className="text-cyan-400" /> Compiled Document Archives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground">
          {/* We will populate this array when reports are actually compiled. For now, empty state. */}
          <div className="col-span-full text-center py-4 text-muted-foreground italic">
            No compiled reports found in archive. Select a template and compile above.
          </div>
        </div>
      </div>

    </div>
  );
}
