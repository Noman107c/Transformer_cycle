'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save, 
  Sliders, 
  Bell, 
  Cpu, 
  Database,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const [criticalHI, setCriticalHI] = useState(50);
  const [warningHI, setWarningHI] = useState(70);
  const [tempLimit, setTempLimit] = useState(90);
  const [oilLimit, setOilLimit] = useState(60);
  const [activeModel, setActiveModel] = useState('XGBoost Regressor');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1000);
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="text-cyan-400 animate-spin-slow" size={28} /> Settings
          </h1>
          <p className="text-muted-foreground text-sm">Configure system threshold warnings, select analytical AI models, and calibrate notifications</p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* System Thresholds */}
        <div className="xl:col-span-6 glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="text-cyan-400" size={16} /> Critical Threshold Alerts Calibration
            </h2>

            <div className="space-y-4 text-xs font-semibold leading-relaxed">
              
              {/* Critical Health Index */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground uppercase">Critical Health Index Threshold</span>
                  <span className="text-red-400 font-extrabold">{criticalHI}%</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="60" 
                  value={criticalHI}
                  onChange={(e) => setCriticalHI(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#0a0e27] rounded-lg appearance-none cursor-pointer accent-red-400 focus:outline-none"
                />
              </div>

              {/* Warning Health Index */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground uppercase">Warning Health Index Threshold</span>
                  <span className="text-yellow-400 font-extrabold">{warningHI}%</span>
                </div>
                <input 
                  type="range" 
                  min="60" 
                  max="85" 
                  value={warningHI}
                  onChange={(e) => setWarningHI(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#0a0e27] rounded-lg appearance-none cursor-pointer accent-yellow-400 focus:outline-none"
                />
              </div>

              {/* Temperature Limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground uppercase">Winding Temperature Limit (°C)</span>
                  <span className="text-orange-400 font-extrabold">{tempLimit}°C</span>
                </div>
                <input 
                  type="range" 
                  min="70" 
                  max="110" 
                  value={tempLimit}
                  onChange={(e) => setTempLimit(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#0a0e27] rounded-lg appearance-none cursor-pointer accent-orange-400 focus:outline-none"
                />
              </div>

              {/* Oil Level Limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground uppercase">Oil Level Limit (%)</span>
                  <span className="text-cyan-400 font-extrabold">{oilLimit}%</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="80" 
                  value={oilLimit}
                  onChange={(e) => setOilLimit(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#0a0e27] rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Model Config & Notifications */}
        <div className="xl:col-span-6 space-y-6 flex flex-col">
          
          {/* Model Config */}
          <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="text-cyan-400" size={16} /> ML Prognostics Model Configuration
            </h2>
            <div className="space-y-3 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground uppercase text-[10px]">Active Analytical Model</label>
                <div className="flex flex-col gap-2">
                  {['XGBoost Regressor', 'Random Forest Regressor', 'Deep Neural Net (LSTM)'].map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setActiveModel(model)}
                      className={`w-full py-2 px-4 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                        activeModel === model 
                          ? 'bg-blue-600 border-blue-500 text-white font-black neon-glow' 
                          : 'bg-[#121633] border-blue-500/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications config */}
          <div className="glassmorphism rounded-xl border border-blue-500/10 p-5 bg-[#151a37]/35 space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="text-cyan-400" size={16} /> Notification Alert Options
            </h2>
            <div className="space-y-3 text-xs font-semibold">
              
              {/* Email Alerts */}
              <div className="flex items-center justify-between p-2.5 bg-[#0a0e27]/40 border border-blue-500/5 rounded-lg">
                <span className="text-white">Email Alerts (Winding / Oil criticals)</span>
                <button
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${emailAlerts ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${emailAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* SMS Alerts */}
              <div className="flex items-center justify-between p-2.5 bg-[#0a0e27]/40 border border-blue-500/5 rounded-lg">
                <span className="text-white">SMS Alerts (Immediate dispatch)</span>
                <button
                  type="button"
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${smsAlerts ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${smsAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* System Console Alerts */}
              <div className="flex items-center justify-between p-2.5 bg-[#0a0e27]/40 border border-blue-500/5 rounded-lg">
                <span className="text-white">System Console Notifications</span>
                <button
                  type="button"
                  onClick={() => setSystemAlerts(!systemAlerts)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${systemAlerts ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${systemAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 mt-auto pt-4 border-t border-blue-500/5">
            {showToast && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[#10b981] font-bold text-xs bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg"
              >
                <CheckCircle size={14} /> System Parameters Saved!
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase rounded-lg shadow-md hover:shadow-blue-500/20 neon-glow flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all duration-300 active:scale-95"
            >
              {isSaving ? 'Saving...' : <><Save size={14} /> Save Parameters</>}
            </button>
          </div>

        </div>

      </form>

    </div>
  );
}
