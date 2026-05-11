"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio, RefreshCcw, Smartphone, Wifi } from "lucide-react";
import {
  useAlertStore,
  useEventStore,
  useDeviceStore,
  useSystemStore,
} from "@/stores";
import { AIConfidenceBadge } from "@/components/AIScoreDisplay";
import { fetchAlerts, fetchDevices, fetchEvents, fetchSystemStats } from "@/lib/api";

export default function MobileOpsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alerts = useAlertStore((s) => s.alerts);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const devicesMap = useDeviceStore((s) => s.devices);
  const setDevices = useDeviceStore((s) => s.setDevices);
  const stats = useSystemStore((s) => s.stats);
  const setStats = useSystemStore((s) => s.setStats);
  const events = useEventStore((s) => s.events);
  const setEvents = useEventStore((s) => s.setEvents);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [nextAlerts, nextDevices, nextStats] = await Promise.all([
        fetchAlerts({ limit: 30 }),
        fetchDevices(),
        fetchSystemStats(),
      ]);

      const nextEvents = await fetchEvents({ limit: 30 });

      setAlerts(nextAlerts);
      setDevices(nextDevices);
      setStats(nextStats);
      setEvents(nextEvents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu mobile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="mx-auto w-full max-w-xl p-4 pb-24">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 px-4 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-200">SignalOps Mobile</p>
            <h1 className="mt-1 text-xl font-bold">Vận hành hiện trường</h1>
          </div>
          <Smartphone className="h-6 w-6 text-blue-200" />
        </div>
        <p className="mt-2 text-sm text-blue-100">Theo dõi nhanh cảnh báo và thiết bị trên điện thoại.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-xs text-red-600">Cảnh báo mở</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{openAlerts.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
          <p className="text-xs text-emerald-700">Thiết bị online</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{devices.filter((d) => d.status === "active").length}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Tổng quan realtime</h2>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
          <p className="text-xs text-gray-500">Sự kiện/phút</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{stats?.eventsPerMinute ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
          <p className="text-xs text-gray-500">Độ sâu hàng đợi</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{stats?.queueDepth ?? 0}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold text-gray-900">Cảnh báo mới nhất</h3>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Đang tải...</p>
        ) : openAlerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">Không có cảnh báo mở.</p>
        ) : (
          <div className="space-y-2">
            {openAlerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{alert.type}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-600">{alert.message}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">{new Date(alert.createdAt).toLocaleString("vi-VN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <h3 className="text-sm font-semibold text-purple-900">AI shadow mode</h3>
        </div>

        {events.filter((event) => (event.anomalyScore ?? 0) >= 35).length === 0 ? (
          <p className="py-3 text-center text-sm text-purple-700">Chưa có tín hiệu AI đáng chú ý.</p>
        ) : (
          <div className="space-y-2">
            {events
              .filter((event) => (event.anomalyScore ?? 0) >= 35)
              .sort((left, right) => (right.anomalyScore ?? 0) - (left.anomalyScore ?? 0))
              .slice(0, 5)
              .map((event) => (
                <div key={event.id} className="rounded-lg border border-purple-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">Thiết bị {event.deviceId}</p>
                      <p className="truncate text-xs text-gray-600">{event.anomalyReasons?.[0] || 'Đang đánh giá bất thường'}</p>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700 flex-shrink-0">
                      {event.anomalyScore ?? 0}%
                    </span>
                  </div>
                  {event.anomalyConfidence !== undefined && (
                    <div className="flex justify-end">
                      <AIConfidenceBadge confidence={event.anomalyConfidence} className="text-[10px] px-2 py-0.5" />
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Thiết bị gần nhất</h3>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Đang tải...</p>
        ) : devices.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">Không có thiết bị.</p>
        ) : (
          <div className="space-y-2">
            {devices.slice(0, 8).map((device) => (
              <div key={device.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{device.name}</p>
                    <p className="truncate text-xs text-gray-600">{device.location?.name || `${device.location?.lat}, ${device.location?.lng}`}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-700">
                    <Radio className="h-3 w-3" />
                    {device.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
