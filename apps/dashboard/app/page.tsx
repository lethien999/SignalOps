"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle, Activity, TrendingUp, AlertCircle,
  Radio, Zap, Shield, ArrowRight, Wifi,
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { AlertTable } from "@/components/AlertTable";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { EventMetricsChart } from "@/components/EventMetricsChart";
import { ToastStack, type ToastItem, type ToastType } from "@/components/ToastStack";
import {
  useAlertStore,
  useEventStore,
  useSystemStore,
  useDeviceStore,
} from "@/stores";
import { fetchAlerts, fetchEvents, fetchSystemStats } from "@/lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const alerts = useAlertStore((s) => s.alerts);
  const selectedAlert = useAlertStore((s) => s.selectedAlert);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const selectAlert = useAlertStore((s) => s.selectAlert);
  const events = useEventStore((s) => s.events);
  const setEvents = useEventStore((s) => s.setEvents);
  const stats = useSystemStore((s) => s.stats);
  const setStats = useSystemStore((s) => s.setStats);
  const devices = Array.from(useDeviceStore((s) => s.devices).values());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [a, e, s] = await Promise.all([
          fetchAlerts({ limit: 100 }),
          fetchEvents({ limit: 100 }),
          fetchSystemStats(),
        ]);
        setAlerts(a);
        setEvents(e);
        setStats(s);
        setError(null);
      } catch (err) {
        console.error("Failed to load:", err);
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
  }, [setAlerts, setEvents, setStats]);

  const activeAlerts = alerts.filter((a) => a.status === "open").length;
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "high" && a.status === "open"
  ).length;
  const aiSuspiciousEvents = [...events]
    .filter((event) => (event.anomalyScore ?? 0) >= 35)
    .sort((left, right) => (right.anomalyScore ?? 0) - (left.anomalyScore ?? 0))
    .slice(0, 5);

  const pushToast = (msg: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((c) => [...c, { id, message: msg, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} />

      {/* ── Hero Banner ─────────────────────────── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold">Hệ thống giám sát SignalOps</h1>
              </div>
              <p className="text-blue-200 text-sm max-w-xl leading-relaxed">
                Giám sát chất lượng mạng viễn thông theo thời gian thực. Tự động phát hiện bất thường
                về Latency, Packet Loss và Signal Strength từ các thiết bị đang kết nối.
              </p>
            </div>

            {/* Live status */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                <span className="text-sm font-medium">Đang nhận dữ liệu</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2.5">
                <Wifi className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-medium">{devices.length} thiết bị</span>
              </div>
            </div>
          </div>

          {/* Flow diagram mini */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-blue-300">
            <span className="bg-blue-800/50 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Thiết bị
            </span>
            <ArrowRight className="w-4 h-4" />
            <span className="bg-blue-800/50 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> API Gateway
            </span>
            <ArrowRight className="w-4 h-4" />
            <span className="bg-blue-800/50 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Hàng đợi
            </span>
            <ArrowRight className="w-4 h-4" />
            <span className="bg-blue-800/50 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Phát hiện
            </span>
            <ArrowRight className="w-4 h-4" />
            <span className="bg-red-800/50 px-3 py-1.5 rounded-lg border border-red-700/50 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Cảnh báo
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
          <p className="font-medium">Lỗi tải dữ liệu: {error}</p>
        </div>
      )}

      {/* ── Threshold explainer ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">Latency &gt; 200ms</p>
            <p className="text-xs text-red-600 mt-0.5">Phản hồi chậm → Cảnh báo mức HIGH</p>
          </div>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-900">Packet Loss &gt; 5%</p>
            <p className="text-xs text-orange-600 mt-0.5">Mất dữ liệu → Cảnh báo mức HIGH</p>
          </div>
        </div>
        <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-900">Signal &lt; -90 dBm</p>
            <p className="text-xs text-yellow-600 mt-0.5">Tín hiệu yếu → Cảnh báo mức MEDIUM</p>
          </div>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Tổng sự kiện"
          value={stats?.totalEvents || 0}
          icon={Activity}
          trend="up"
          trendValue={`${stats?.eventsPerMinute || 0}/phút`}
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Cảnh báo đang mở"
          value={activeAlerts}
          icon={AlertTriangle}
          trend={activeAlerts > 0 ? "up" : "stable"}
          trendValue={`${criticalAlerts} nghiêm trọng`}
          bgColor="bg-red-50"
        />
        <MetricCard
          title="Thiết bị kết nối"
          value={devices.length}
          icon={Wifi}
          trend="stable"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Hàng đợi xử lý"
          value={stats?.queueDepth || 0}
          icon={TrendingUp}
          trend="stable"
          bgColor="bg-yellow-50"
        />
      </div>

      {/* ── Alerts section ───────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Cảnh báo gần đây
          </h2>
          <div className="flex items-center gap-3">
            {activeAlerts > 0 && (
              <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse-dot" />
                {activeAlerts} đang mở
              </span>
            )}
            <Link href="/alerts" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <AlertTable alerts={alerts.slice(0, 10)} onSelectAlert={selectAlert} />
        )}
      </div>

      {/* ── Recent events ────────────────────────── */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Sự kiện gần đây</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{events.length} đã tải</span>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chưa có sự kiện nào. Simulator đang chạy?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => {
              const isHigh = (event.metrics?.latency ?? 0) > 200 || (event.metrics?.packetLoss ?? 0) > 5;
              return (
                <div
                  key={event.id}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 md:flex-row md:items-center md:justify-between transition-colors ${
                    isHigh ? 'border-red-200 bg-red-50/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`status-dot ${isHigh ? 'alert' : 'online'}`} />
                    <div>
                      <p className="font-medium text-gray-900">Thiết bị {event.deviceId}</p>
                      <p className="text-sm text-gray-500">
                        {event.location?.name || `${event.location?.lat ?? "?"}, ${event.location?.lng ?? "?"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {(event.anomalyScore ?? 0) > 0 && (
                      <span className={`font-semibold ${event.anomalyScore && event.anomalyScore >= 70 ? 'text-purple-700' : 'text-purple-600'}`}>
                        AI: {event.anomalyScore}%
                      </span>
                    )}
                    <span className={`font-medium ${(event.metrics?.latency ?? 0) > 200 ? 'text-red-600' : 'text-gray-600'}`}>
                      Latency: {event.metrics?.latency ?? "-"}ms
                    </span>
                    <span className={`font-medium ${(event.metrics?.packetLoss ?? 0) > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                      Loss: {event.metrics?.packetLoss ?? "-"}%
                    </span>
                    <span className={`font-medium ${(event.metrics?.signalStrength ?? 0) < -90 ? 'text-yellow-600' : 'text-gray-600'}`}>
                      Signal: {event.metrics?.signalStrength ?? "-"} dBm
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-purple-200 bg-purple-50/60 p-6 shadow-sm animate-fade-in">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-purple-900">AI shadow mode</h2>
            <p className="text-sm text-purple-700">Chấm điểm bất thường song song rule-based để chuẩn bị cho rollout M13.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-purple-700 ring-1 ring-purple-200">
            {aiSuspiciousEvents.length} tín hiệu đáng chú ý
          </span>
        </div>

        {aiSuspiciousEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-purple-200 bg-white px-4 py-10 text-center text-sm text-purple-700">
            Chưa có tín hiệu AI đáng chú ý.
          </div>
        ) : (
          <div className="space-y-3">
            {aiSuspiciousEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-purple-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Thiết bị {event.deviceId}</p>
                    <p className="text-sm text-gray-500">
                      {event.anomalyLabel === 'anomalous' ? 'Bất thường cao' : event.anomalyLabel === 'suspicious' ? 'Đáng chú ý' : 'Ổn định'}
                      {event.anomalyConfidence ? ` • độ tin cậy ${event.anomalyConfidence}%` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${event.anomalyScore && event.anomalyScore >= 70 ? 'bg-purple-100 text-purple-800' : 'bg-purple-50 text-purple-700'}`}>
                    Score {event.anomalyScore ?? 0}/100
                  </span>
                </div>
                {event.anomalyReasons?.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-purple-800">
                    {event.anomalyReasons.slice(0, 3).map((reason, index) => (
                      <li key={`${event.id}-${index}`}>• {reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <EventMetricsChart events={events} stats={stats} />

      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => selectAlert(null)}
        onActionComplete={(msg, type = "info") => pushToast(msg, type)}
      />

      <div className="mt-8 text-center text-sm text-gray-400">
        <p>Cập nhật lần cuối: {new Date().toLocaleString("vi-VN")}</p>
      </div>
    </div>
  );
}
