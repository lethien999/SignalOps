'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Settings, X, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useUIStore, useAlertStore } from '@/stores';
import { DarkModeToggle } from './DarkModeToggle';
import { PwaInstallPrompt } from './PwaInstallPrompt';

interface HeaderProps {
  unreadAlerts?: number;
}

const ALERT_SOUND_STORAGE_KEY = 'signalops-alert-sound';

export function Header({ unreadAlerts = 0 }: HeaderProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const alerts = useAlertStore((s) => s.alerts);
  const [showNotif, setShowNotif] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  const recentAlerts = alerts.filter((a) => a.status === 'open').slice(0, 5);

  useEffect(() => {
    const saved = localStorage.getItem(ALERT_SOUND_STORAGE_KEY);
    setSoundEnabled(saved !== 'off');

    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(ALERT_SOUND_STORAGE_KEY, next ? 'on' : 'off');
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
      <PwaInstallPrompt />
      <div className="max-w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors md:hidden"
            aria-label="Mở/đóng thanh bên"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
            <span>Realtime • {alerts.filter(a => a.status === 'open').length} cảnh báo đang mở</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 animate-fade-in">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Thông báo</h3>
                  <button onClick={() => setShowNotif(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentAlerts.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Không có cảnh báo mới</p>
                    </div>
                  ) : (
                    recentAlerts.map((alert) => (
                      <div key={alert.id} className="px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                            alert.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            <AlertTriangle className={`w-4 h-4 ${
                              alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{alert.type}</p>
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{alert.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString('vi-VN')}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setShowNotif(false)}
                  className="block px-5 py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-b-2xl border-t border-gray-100 transition-colors"
                >
                  Xem tất cả cảnh báo →
                </Link>
              </div>
            )}
          </div>

          <DarkModeToggle />

          <button
            onClick={toggleSound}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label={soundEnabled ? 'Tắt âm cảnh báo' : 'Bật âm cảnh báo'}
            title={soundEnabled ? 'Âm cảnh báo đang bật' : 'Âm cảnh báo đang tắt'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-gray-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
          </button>

          <Link href="/settings" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Cài đặt">
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>
    </header>
  );
}
