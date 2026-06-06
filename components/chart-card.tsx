'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  subtitle?: string;
}

export default function ChartCard({ title, description, children, subtitle }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glassmorphism rounded-lg border border-blue-500/20 p-6 neon-glow hover:border-cyan-500/40 transition-all duration-300"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {title}
          {subtitle && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {subtitle}
          </span>}
        </h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="w-full overflow-auto">
        {children}
      </div>
    </motion.div>
  );
}
