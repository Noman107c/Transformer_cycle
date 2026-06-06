'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Cpu, 
  BarChart3, 
  Sliders, 
  Binary, 
  Database,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Feature importance data
const defaultFeatures = [
  { name: 'Voltage', importance: 28, weight: 28 },
  { name: 'Current', importance: 22, weight: 22 },
  { name: 'Age', importance: 18, weight: 18 },
  { name: 'Outage Occurred', importance: 13, weight: 13 },
  { name: 'Short Circuits', importance: 9, weight: 9 },
  { name: 'Maintenance Count', importance: 6, weight: 6 },
  { name: 'Ambient Temp', importance: 4, weight: 4 },
];

// Actual vs Predicted Scatter Data
const scatterData = Array.from({ length: 30 }, (_, i) => {
  const actual = 200 + i * 40 + (Math.random() - 0.5) * 80;
  const predicted = actual + (Math.random() - 0.5) * 35;
  return { actual: Math.round(actual), predicted: Math.round(predicted) };
});

// Loss residual epochs
const lossHistory = [
  { epoch: 'Epoch 10', trainLoss: 45.2, valLoss: 48.9 },
  { epoch: 'Epoch 20', trainLoss: 28.6, valLoss: 31.4 },
  { epoch: 'Epoch 30', trainLoss: 18.3, valLoss: 21.0 },
  { epoch: 'Epoch 40', trainLoss: 12.5, valLoss: 15.2 },
  { epoch: 'Epoch 50', trainLoss: 8.4, valLoss: 11.1 },
  { epoch: 'Epoch 60', trainLoss: 5.6, valLoss: 8.5 },
  { epoch: 'Epoch 70', trainLoss: 4.3, valLoss: 7.1 },
  { epoch: 'Epoch 80', trainLoss: 3.5, valLoss: 6.2 },
  { epoch: 'Epoch 90', trainLoss: 3.0, valLoss: 5.4 },
  { epoch: 'Epoch 100', trainLoss: 2.8, valLoss: 4.8 },
];

export default function AnalyticsPage() {
  const [weights, setWeights] = useState(defaultFeatures);
  const [metrics, setMetrics] = useState({
    mae: 4.21,
    rmse: 6.87,
    r2: 0.91,
  });

  const handleWeightChange = (index: number, val: number) => {
    setWeights((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], weight: val };
      
      // Dynamically simulate changing R2 score based on weight modifications
      const totalVariance = next.reduce((acc, curr) => acc + Math.abs(curr.importance - curr.weight), 0);
      const simulatedR2 = parseFloat((0.91 - totalVariance * 0.003).toFixed(2));
      const simulatedMAE = parseFloat((4.21 + totalVariance * 0.04).toFixed(2));
      const simulatedRMSE = parseFloat((6.87 + totalVariance * 0.06).toFixed(2));
      
      setMetrics({
        mae: Math.max(1.5, simulatedMAE),
        rmse: Math.max(2.5, simulatedRMSE),
        r2: Math.min(1.0, Math.max(0.4, simulatedR2)),
      });
      return next;
    });
  };

  const handleResetWeights = () => {
    setWeights(defaultFeatures);
    setMetrics({
      mae: 4.21,
      rmse: 6.87,
      r2: 0.91,
    });
  };

  return (
    <div className="p-8 bg-[#0a0e27] min-h-screen text-foreground space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={28} /> ML Analytics
          </h1>
          <p className="text-muted-foreground text-sm">XGBoost Regressor parameter controls, residual maps, training loss, and correlations</p>
        </div>

        <button 
          onClick={handleResetWeights}
          className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/15 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
        >
          Reset Model Defaults
        </button>
      </div>

      {/* Model Overview Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Model info */}
        <div className="glassmorphism p-5 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <Cpu size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">Model Meta Details</span>
          </div>
          <div className="mt-3 space-y-2 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework:</span>
              <span className="text-white">XGBoost API</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-white">Regression</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Features count:</span>
              <span className="text-white">7 Parameters</span>
            </div>
          </div>
        </div>

        {/* MAE */}
        <div className="glassmorphism p-5 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-md flex flex-col justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Mean Absolute Error (MAE)</span>
          <h3 className="text-3xl font-black text-white mt-2">{metrics.mae}</h3>
          <p className="text-[9px] text-green-400 font-bold mt-1">&darr; 0.15 deviation lower than base</p>
        </div>

        {/* RMSE */}
        <div className="glassmorphism p-5 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-md flex flex-col justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Root Mean Squared Error (RMSE)</span>
          <h3 className="text-3xl font-black text-white mt-2">{metrics.rmse}</h3>
          <p className="text-[9px] text-green-400 font-bold mt-1">&darr; 0.22 variance lower than base</p>
        </div>

        {/* R2 Score */}
        <div className="glassmorphism p-5 rounded-lg border border-blue-500/10 bg-[#151a37]/35 shadow-md flex flex-col justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">R² Coefficient of Determination</span>
          <h3 className="text-3xl font-black text-white mt-2">{metrics.r2}</h3>
          <p className="text-[9px] text-[#10b981] font-bold mt-1">Excellent correlation &gt;0.90</p>
        </div>

      </div>

      {/* Main Charts & Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Interactive Feature Weights Tuner */}
        <div className="xl:col-span-5 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="text-cyan-400" size={16} /> Interactive Feature Weights Tuner
              </h2>
              <div className="group relative">
                <Info size={14} className="text-muted-foreground cursor-help" />
                <span className="absolute bottom-6 right-0 w-48 p-2 bg-[#0a0e27] border border-blue-500/20 text-[9px] rounded shadow-xl hidden group-hover:block z-10 leading-normal">
                  Adjust parameter weights to simulate changes in model prediction accuracy in real time.
                </span>
              </div>
            </div>
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {weights.map((item, idx) => (
                <div key={item.name} className="space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white">{item.name}</span>
                    <span className="text-cyan-300 font-bold">Weight: {item.weight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={item.weight}
                    onChange={(e) => handleWeightChange(idx, parseInt(e.target.value))}
                    className="w-full h-1 bg-[#0a0e27] rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Importance Representation Chart */}
        <div className="xl:col-span-4 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col justify-between">
          <div className="mb-3">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={16} /> Importance Representation Chart
            </h2>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weights} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27273a" strokeOpacity={0.4} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0a0e27', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}
                  itemStyle={{ fontSize: '10px', color: '#fff' }}
                />
                <Bar dataKey="weight" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {weights.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.4 + (index * 0.08)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Residual Matrix */}
        <div className="xl:col-span-3 glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35 flex flex-col justify-between">
          <div className="mb-3">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Binary className="text-cyan-400" size={16} /> Predicted vs Actual RUL (Days)
            </h2>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27273a" strokeOpacity={0.4} />
                <XAxis type="number" dataKey="actual" name="Actual RUL" stroke="#71717a" fontSize={8} tickLine={false} unit="d" />
                <YAxis type="number" dataKey="predicted" name="Predicted RUL" stroke="#71717a" fontSize={8} tickLine={false} unit="d" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#0a0e27', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}
                  itemStyle={{ fontSize: '10px', color: '#fff' }}
                />
                <Scatter name="RUL Predictions" data={scatterData} fill="#06b6d4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Epoch Loss residual curves */}
      <div className="glassmorphism rounded-lg border border-blue-500/10 p-5 shadow-lg bg-[#151a37]/35">
        <div className="mb-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="text-cyan-400" size={16} /> Training Loss Curve (Regression Epoch Diagnostics)
          </h2>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lossHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27273a" strokeOpacity={0.4} />
              <XAxis dataKey="epoch" stroke="#71717a" fontSize={9} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#0a0e27', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}
                itemStyle={{ fontSize: '10px', color: '#fff' }}
              />
              <Line type="monotone" dataKey="trainLoss" name="Training Loss" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="valLoss" name="Validation Loss" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
