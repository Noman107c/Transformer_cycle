'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'blue' | 'cyan' | 'purple' | 'pink' | 'green';
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  cyan: 'from-cyan-500 to-cyan-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  green: 'from-green-500 to-green-600',
};

export default function StatCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glassmorphism p-6 rounded-lg border border-blue-500/20 neon-glow group hover:border-cyan-500/40 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend !== undefined && (
            <p className={`text-xs mt-2 font-semibold ${trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white neon-glow-accent`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
