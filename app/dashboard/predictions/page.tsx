'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Play, 
  Cpu, 
  Activity, 
  Calendar, 
  CheckCircle,
  AlertTriangle,
  History,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';

const transformers = Array.from({ length: 25 }, (_, i) => `TRF-${String(i + 1).padStart(2, '0')}`);

export default function PredictionsPage() {
  const [selectedTrf, setSelectedTrf] = useState('TRF-01');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [predictions, setPredictions] = useState({
    rulDays: 1540,
    rulYears: 4.22,
    confidence: 94,
    failureDate: '12-Jul-2028',
    lastCalculated: '',
  });

  const getSimulatedRUL = (trfId: string) => {
    const num = parseInt(trfId.split('-')[1]);
    const baseHI = num <= 5 ? 88 + num : num <= 15 ? 70 + num : num <= 20 ? 55 + num : 30 + num;
    
    const days = Math.round(baseHI * 16.6);
    const years = parseFloat((days / 365.25).toFixed(2));
    const confidence = Math.round(85 + (baseHI % 10));
    
    const d = new Date();
    d.setDate(d.getDate() + days);
    
    return {
      rulDays: days,
      rulYears: years,
      confidence: Math.min(99, confidence),
      failureDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      lastCalculated: new Date().toLocaleString(),
    };
  };

  useEffect(() => {
    setPredictions(getSimulatedRUL(selectedTrf));
  }, [selectedTrf]);

  const handleRunPrediction = () => {
    setIsSimulating(true);
    setSimulationStep(1);

    setTimeout(() => {
      setSimulationStep(2);
    }, 1000);

    setTimeout(() => {
      setSimulationStep(3);
    }, 2200);

    setTimeout(() => {
      setPredictions(getSimulatedRUL(selectedTrf));
      setIsSimulating(false);
      setSimulationStep(0);
    }, 3200);
  };

  const metricsMap: { [key: string]: number } = {};
  transformers.forEach((trf) => {
    const num = parseInt(trf.split('-')[1]);
    metricsMap[trf] = num <= 5 ? 88 + num : num <= 15 ? 70 + num : num <= 20 ? 55 + num : 30 + num;
  });

  // Timeline forecast data
  const forecastData = Array.from({ length: 6 }, (_, i) => {
    const year = 2024 + i;
    const factor = Math.max(0, (predictions.rulYears - i) / predictions.rulYears);
    const hiValue = Math.round(metricsMap[selectedTrf] * factor);
    return {
      name: String(year),
      hi: hiValue,
      criticalLimit: 50,
    };
  });

  const getRulColorClass = (days: number) => {
    if (days >= 1000) return 'text-green-400';
    if (days >= 500) return 'text-yellow-400';
    if (days >= 200) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="text-cyan-400" size={28} /> RUL Prediction
          </h1>
          <p className="text-muted-foreground text-sm">Deploy Machine Learning prediction engines, remaining useful life estimates, and aging forecasts</p>
        </div>

        {/* Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-muted-foreground uppercase">Select Asset:</span>
          <select 
            value={selectedTrf}
            onChange={(e) => setSelectedTrf(e.target.value)}
            disabled={isSimulating}
            className="bg-[#121633] border border-blue-500/15 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30 shadow-inner cursor-pointer disabled:opacity-40"
          >
            {transformers.map((trf) => (
              <option key={trf} value={trf}>{trf}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Simulation Block & Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ML Engine Activation Card */}
        <div className="xl:col-span-5 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="text-cyan-400" size={16} /> ML Prediction Engine
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activate the predictive model pipeline. The XGBoost Regressor will ingest sensor coefficients, compute insulation degradation factors, and estimate Remaining Useful Life (RUL).
            </p>
          </div>

          <div className="py-6 flex items-center justify-center min-h-[140px] relative">
            <AnimatePresence mode="wait">
              {!isSimulating ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleRunPrediction}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black uppercase rounded-xl shadow-lg neon-glow flex items-center gap-2 cursor-pointer transition-all duration-300 active:scale-95"
                >
                  <Play size={16} /> Run RUL Prediction Engine
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-1 font-bold text-xs">
                    {simulationStep === 1 && <p className="text-cyan-300 animate-pulse">Ingesting Sensor History Matrix...</p>}
                    {simulationStep === 2 && <p className="text-[#a855f7] animate-pulse">Analyzing Furan & Winding Degradation...</p>}
                    {simulationStep === 3 && <p className="text-[#10b981] animate-pulse">Formulating XGBoost Regression Estimates...</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-blue-500/10 pt-3 mt-4 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
            <span>Last Calculated: {predictions.lastCalculated}</span>
            <span className="flex items-center gap-1 text-[#10b981]">
              <CheckCircle size={10} /> Model Ready
            </span>
          </div>
        </div>

        {/* Prediction Results Scorecard */}
        <div className="xl:col-span-7 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* RUL score */}
          <div className="bg-[#121633]/60 border border-blue-500/5 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">RUL Days Forecast</span>
            <div className="mt-4">
              <h3 className={`text-4xl font-black ${getRulColorClass(predictions.rulDays)}`}>{predictions.rulDays}</h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">Days remaining useful life</p>
            </div>
            <div className="pt-2 border-t border-blue-500/5 text-[9px] font-bold text-muted-foreground flex items-center gap-1">
              <Calendar size={10} /> Failure Est: {predictions.failureDate}
            </div>
          </div>

          {/* RUL Years */}
          <div className="bg-[#121633]/60 border border-blue-500/5 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">RUL Years Estimate</span>
            <div className="mt-4">
              <h3 className="text-4xl font-black text-white">{predictions.rulYears} <span className="text-sm font-semibold text-muted-foreground">Yrs</span></h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">Estimated useful service life</p>
            </div>
            <div className="pt-2 border-t border-blue-500/5 text-[9px] font-bold text-[#eab308] flex items-center gap-1">
              <TrendingDown size={10} /> Degradation Rate: 3.2%/yr
            </div>
          </div>

          {/* Model Confidence */}
          <div className="bg-[#121633]/60 border border-blue-500/5 rounded-xl p-4 shadow-inner flex flex-col justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Model Confidence</span>
            <div className="mt-4">
              <h3 className="text-4xl font-black text-white">{predictions.confidence}%</h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">Algorithm confidence score</p>
            </div>
            <div className="pt-2 border-t border-blue-500/5 text-[9px] font-bold text-[#10b981] flex items-center gap-1">
              <Activity size={10} /> Signal Quality: Optimal
            </div>
          </div>

        </div>

      </div>

      {/* Aging Timeline Forecast Chart */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35">
        <div className="mb-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <History className="text-cyan-400" size={16} /> Projected Health Index Aging Curve Forecast (XGBoost Regressor Simulation)
          </h2>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rulForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27273a" strokeOpacity={0.4} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={9} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#0a0e27', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}
                itemStyle={{ fontSize: '10px', color: '#fff' }}
              />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" dataKey="hi" name="Projected Health Index" stroke="#3b82f6" strokeWidth={2} fill="url(#rulForecast)" />
              <Area type="monotone" dataKey="criticalLimit" name="Critical Threshold limit" stroke="#ef4444" strokeDasharray="5 5" fill="none" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
