'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  LayoutGrid,
  Activity,
  TrendingUp,
  Zap,
  Wrench,
  AlertCircle,
  Database,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/assets', label: 'Asset Dashboard', icon: LayoutGrid },
  { href: '/dashboard/health', label: 'Health Monitoring', icon: Activity },
  { href: '/dashboard/analytics', label: 'ML Analytics', icon: TrendingUp },
  { href: '/dashboard/predictions', label: 'RUL Prediction', icon: Zap },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/alerts', label: 'Alerts & Events', icon: AlertCircle },
  { href: '/dashboard/explorer', label: 'Data Explorer', icon: Database },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/admin/dashboard', label: 'Admin Panel', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-sidebar-border bg-[#0f1429] min-h-screen flex flex-col sticky top-0 shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center neon-glow">
            <Zap className="text-primary-foreground" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">TranSys</h1>
            <p className="text-xs text-sidebar-accent font-semibold uppercase tracking-wider">Monitor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground neon-glow shadow-lg'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
              )}
            >
              <Icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="p-4 rounded-lg glassmorphism bg-[#050818]/60 border border-blue-500/10 space-y-3 shadow-inner">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Total Transformers</span>
              <span className="text-foreground font-bold text-sm">25</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Monitoring Duration</span>
              <span className="text-foreground font-bold text-sm">5 Years</span>
            </div>
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground font-medium">Data Points (15 Min Interval)</span>
              <span className="text-foreground font-bold text-sm">2,92,200</span>
            </div>
          </div>
          <button 
            onClick={() => {
              // Trigger a download simulation
              alert('Compiling comprehensive fleet audit report (2,92,200 data points)... \nCSV download initiated successfully.');
            }}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-md shadow-md hover:shadow-blue-500/20 neon-glow transition-all duration-300 active:scale-95 cursor-pointer"
          >
            Export Report
          </button>
        </div>
      </div>
    </aside>
  );
}
