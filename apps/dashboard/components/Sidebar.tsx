'use client';

import React from 'react';
import { LayoutDashboard, MapPin, AlertCircle, BarChart3, Settings, Radio } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore, useAlertStore } from '@/stores';

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const pathname = usePathname();
  const openAlerts = useAlertStore((s) => s.alerts.filter((a) => a.status === 'open').length);

  const menuItems = [
    { label: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { label: 'Bản đồ', href: '/map', icon: MapPin },
    { label: 'Cảnh báo', href: '/alerts', icon: AlertCircle, badge: openAlerts || undefined },
    { label: 'Chỉ số', href: '/metrics', icon: BarChart3 },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white transition-all duration-300 z-40 md:sticky md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SignalOps</h1>
            <p className="text-[10px] text-blue-400 uppercase tracking-widest font-medium">Giám sát mạng</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3 mt-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
            <span className="text-xs text-green-400 font-medium">Hệ thống hoạt động</span>
          </div>
          <p className="text-[11px] text-gray-500">SignalOps v1.0</p>
        </div>
      </div>
    </aside>
  );
}
