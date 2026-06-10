'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  AlertCircle,
  Settings,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_MENU_ITEMS = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and key metrics',
  },
  {
    href: '/admin/transformers',
    label: 'Transformers',
    icon: Cpu,
    description: 'Add, edit & delete transformers',
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Detailed performance data',
  },
  {
    href: '/admin/logs',
    label: 'Logs',
    icon: AlertCircle,
    description: 'System and activity logs',
  },
  
];

type QuickStats = {
  total: number;
  active: number;
  critical: number;
  status: 'Healthy' | 'Degraded' | 'Critical';
};

export function AdminSidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<QuickStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/admin/transformers');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const data = json.data;
          const critical = data.filter((t: any) => t.status === 'CRITICAL').length;
          setStats({
            total: data.length,
            active: data.filter((t: any) => t.is_active).length,
            critical,
            status: critical > 3 ? 'Critical' : critical > 0 ? 'Degraded' : 'Healthy',
          });
        }
      } catch {
        // Silently fail — sidebar stats are non-critical
      }
    };
    loadStats();
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-700 bg-gray-900 pt-20 overflow-y-auto">
      <nav className="space-y-1 px-4 py-4">
        {ADMIN_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex flex-col gap-1 rounded-lg px-4 py-3 transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </div>
              <span className={cn(
                'text-xs transition-colors',
                isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-400'
              )}>
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Dynamic Quick Stats from DB */}
      <div className="border-t border-gray-700 px-4 py-4">
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Live Stats</h3>
          {stats ? (
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Total Transformers:</span>
                <span className="font-semibold text-white">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Units:</span>
                <span className="font-semibold text-emerald-400">{stats.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Critical Alerts:</span>
                <span className={`font-semibold ${stats.critical > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {stats.critical}
                </span>
              </div>
              <div className="flex justify-between">
                <span>System Status:</span>
                <span className={`font-semibold ${
                  stats.status === 'Healthy' ? 'text-green-400'
                  : stats.status === 'Degraded' ? 'text-yellow-400'
                  : 'text-red-400'
                }`}>
                  {stats.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
