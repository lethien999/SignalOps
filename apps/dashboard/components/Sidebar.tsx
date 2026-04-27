'use client';

import React from 'react';
import { LayoutDashboard, MapPin, AlertCircle, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { useUIStore } from '@/stores';

export function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Map View',
      href: '/map',
      icon: MapPin,
    },
    {
      label: 'Alerts',
      href: '/alerts',
      icon: AlertCircle,
    },
    {
      label: 'Metrics',
      href: '/metrics',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-900 text-white transition-all duration-300 z-30 md:sticky md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-100 hover:text-white"
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">SignalOps v1.0</p>
          <p>Real-time Monitoring</p>
        </div>
      </div>
    </aside>
  );
}
