"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Activity, TrendingUp, BarChart3, Cpu, Wifi, ShieldCheck, Siren, DollarSign, Gauge, AlertTriangle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { useEventStore, useSystemStore, useDeviceStore } from "@/stores";
import { fetchEvents, fetchSlaSnapshot, fetchSystemStats } from "@/lib/api";
import type { Event, SlaSnapshot } from "@/types";

type ChartPoint = { label: string; latency: number; packetLoss: number; signalStrength: number; ts: number };

function buildChartData(events: Event[]): ChartPoint[] {
  return [...events]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-30)
    .map((e) => ({
      label: new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      latency: e.metrics?.latency ?? 0,
      packetLoss: e.metrics?.packetLoss ?? 0,
      signalStrength: e.metrics?.signalStrength ?? 0,
      ts: new Date(e.timestamp).getTime(),
    }));
}

export default function MetricsPage() {
  const [loading, setLoading] = useState(true);
  const [slaSnapshot, setSlaSnapshot] = useState<SlaSnapshot | null>(null);
  const [slaDays, setSlaDays] = useState<7 | 14 | 30>(7);
  const [slaSeverity, setSlaSeverity] = useState<"all" | "low" | "warning" | "medium" | "high" | "critical">("all");
  const [slaType, setSlaType] = useState<"all" | "latency" | "packet_loss" | "signal">("all");

  const events = useEventStore((s) => s.events);
  const setEvents = useEventStore((s) => s.setEvents);
  const stats = useSystemStore((s) => s.stats);
  const setStats = useSystemStore((s) => s.setStats);
  const devices = Array.from(useDeviceStore((s) => s.devices).values());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ev, st, sla] = await Promise.all([
          fetchEvents({ limit: 200 }),
          fetchSystemStats(),
          fetchSlaSnapshot({
            days: slaDays,
            severity: slaSeverity === "all" ? undefined : slaSeverity,
            type: slaType === "all" ? undefined : slaType,
          }),
        ]);
        setEvents(ev);
        setStats(st);
        setSlaSnapshot(sla);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [setEvents, setStats, slaDays, slaSeverity, slaType]);

  const chartData = useMemo(() => buildChartData(events), [events]);

  const avgLatency = events.length
    ? Math.round(events.reduce((sum, e) => sum + (e.metrics?.latency ?? 0), 0) / events.length)
    : 0;
  const avgPacketLoss = events.length
    ? (events.reduce((sum, e) => sum + (e.metrics?.packetLoss ?? 0), 0) / events.length).toFixed(2)
    : "0";

  const workerStats = stats?.workerStats;
  const costMetrics = stats?.costMetrics;
  const scaleStatus = stats?.scaleStatus;
  const costBreakdown = costMetrics?.breakdown ?? [];
  const costAlertTone = costMetrics?.warning ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          Chỉ số hệ thống
        </h1>
        <p className="mt-1 text-sm text-gray-500">Giám sát hiệu suất và phân tích dữ liệu theo thời gian thực.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Tổng sự kiện" value={stats?.totalEvents || 0} icon={Activity} trend="up" trendValue={`${stats?.eventsPerMinute || 0}/phút`} bgColor="bg-blue-50" />
        <MetricCard title="Latency TB" value={`${avgLatency}ms`} icon={TrendingUp} trend={avgLatency > 150 ? "up" : "stable"} trendValue={avgLatency > 150 ? "Cao" : "Bình thường"} bgColor="bg-purple-50" />
        <MetricCard title="Thiết bị" value={devices.length} icon={Wifi} trend="stable" bgColor="bg-green-50" />
        <MetricCard title="Hàng đợi" value={stats?.queueDepth || 0} icon={Cpu} trend="stable" bgColor="bg-yellow-50" />
      </div>

      {/* SLA Cards and Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">SLA Dashboard</h3>
            <p className="text-xs text-gray-500 mt-1">Theo dõi MTTR, Uptime và Alert Rate theo bộ lọc.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
            <select
              value={slaDays}
              onChange={(event) => setSlaDays(Number(event.target.value) as 7 | 14 | 30)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
            <select
              value={slaSeverity}
              onChange={(event) => setSlaSeverity(event.target.value as typeof slaSeverity)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Severity: Tất cả</option>
              <option value="low">Severity: low</option>
              <option value="warning">Severity: warning</option>
              <option value="medium">Severity: medium</option>
              <option value="high">Severity: high</option>
              <option value="critical">Severity: critical</option>
            </select>
            <select
              value={slaType}
              onChange={(event) => setSlaType(event.target.value as typeof slaType)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Service/Type: tất cả</option>
              <option value="latency">latency</option>
              <option value="packet_loss">packet_loss</option>
              <option value="signal">signal</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="MTTR"
            value={`${slaSnapshot?.mttrMinutes ?? 0} phút`}
            icon={TrendingUp}
            trend={(slaSnapshot?.mttrMinutes ?? 0) > 60 ? "up" : "stable"}
            trendValue={(slaSnapshot?.mttrMinutes ?? 0) > 60 ? "Cần tối ưu" : "Ổn định"}
            bgColor="bg-orange-50"
          />
          <MetricCard
            title="Uptime"
            value={`${slaSnapshot?.uptimePercent ?? 0}%`}
            icon={ShieldCheck}
            trend={(slaSnapshot?.uptimePercent ?? 0) < 99 ? "up" : "stable"}
            trendValue={(slaSnapshot?.uptimePercent ?? 0) < 99 ? "Dưới mục tiêu" : "Đạt mục tiêu"}
            bgColor="bg-emerald-50"
          />
          <MetricCard
            title="Alert Rate"
            value={`${slaSnapshot?.alertRatePerHour ?? 0}/giờ`}
            icon={Siren}
            trend={(slaSnapshot?.alertRatePerHour ?? 0) > 5 ? "up" : "stable"}
            trendValue={`${slaSnapshot?.totals.total ?? 0} alerts / kỳ`}
            bgColor="bg-rose-50"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">SLA theo ngày</h3>
        {!slaSnapshot || slaSnapshot.byDay.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            Chưa có dữ liệu SLA cho bộ lọc hiện tại
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={slaSnapshot.byDay.map((row) => ({ ...row, label: row.date.slice(5) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.2} dot={false} name="Alerts" />
              <Line yAxisId="right" type="monotone" dataKey="mttrMinutes" stroke="#ea580c" strokeWidth={2.2} dot={false} name="MTTR (phút)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Latency theo thời gian</h3>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="latency" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Packet Loss theo thời gian</h3>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Area type="monotone" dataKey="packetLoss" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} name="Packet Loss (%)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Signal Strength theo thời gian</h3>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="signalStrength" stroke="#059669" strokeWidth={2.5} dot={false} name="Signal (dBm)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Worker Stats */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Hiệu suất Worker</h3>
          {workerStats ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: "Processing", value: workerStats.processing }, { name: "Completed", value: workerStats.completed }, { name: "Failed", value: workerStats.failed }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-gray-500">Đang xử lý</p>
                  <p className="text-lg font-bold text-blue-700">{workerStats.processing}</p>
                </div>
                <div className="text-center rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-gray-500">Hoàn thành</p>
                  <p className="text-lg font-bold text-green-700">{workerStats.completed}</p>
                </div>
                <div className="text-center rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-gray-500">Thất bại</p>
                  <p className="text-lg font-bold text-red-700">{workerStats.failed}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
              <div className="text-center">
                <Cpu className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Chưa có dữ liệu Worker</p>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cost & Auto-scaling</h3>
              <p className="mt-1 text-xs text-gray-500">Theo dõi chi phí hạ tầng, snapshot scale và cảnh báo khi vượt ngưỡng.</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${costAlertTone}`}>
              {costMetrics?.warning ? <AlertTriangle className="h-4 w-4" /> : <Gauge className="h-4 w-4" />}
              {costMetrics?.warning ?? 'Chi phí ổn định'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Cost / giờ"
              value={`$${(costMetrics?.hourlyCostUsd ?? 0).toFixed(2)}`}
              icon={DollarSign}
              trend={(costMetrics?.hourlyCostUsd ?? 0) > 1 ? "up" : "stable"}
              trendValue={`Kỳ: ${costMetrics?.period ?? 'day'}`}
              bgColor="bg-amber-50"
            />
            <MetricCard
              title="Cost kỳ"
              value={`$${(costMetrics?.periodCostUsd ?? 0).toFixed(2)}`}
              icon={BarChart3}
              trend={(costMetrics?.periodCostUsd ?? 0) > 24 ? "up" : "stable"}
              trendValue={`${costMetrics?.hours ?? 0} giờ`}
              bgColor="bg-sky-50"
            />
            <MetricCard
              title="CPU"
              value={`${(costMetrics?.cpuPercent ?? 0).toFixed(1)}%`}
              icon={Cpu}
              trend={(costMetrics?.cpuPercent ?? 0) > 70 ? "up" : "stable"}
              trendValue={costMetrics?.queueName ?? 'default'}
              bgColor="bg-violet-50"
            />
            <MetricCard
              title="Memory"
              value={`${(costMetrics?.memoryPercent ?? 0).toFixed(1)}%`}
              icon={Activity}
              trend={(costMetrics?.memoryPercent ?? 0) > 80 ? "up" : "stable"}
              trendValue={`${Math.round((costMetrics?.memoryBytes ?? 0) / 1024 / 1024)} MB RSS`}
              bgColor="bg-emerald-50"
            />
            <MetricCard
              title="Scale"
              value={scaleStatus?.recommendation ?? 'stable'}
              icon={TrendingUp}
              trend={scaleStatus?.recommendation === 'scale_up' ? "up" : scaleStatus?.recommendation === 'scale_down' ? "down" : "stable"}
              trendValue={`Score ${scaleStatus?.score ?? 0}`}
              bgColor="bg-rose-50"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Breakdown chi phí</h4>
              {costBreakdown.length === 0 ? (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">Chưa có dữ liệu cost breakdown</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={costBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="resource" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="amountUsd" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scale status</h4>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-gray-600">Recommendation</span>
                  <span className="text-sm font-semibold capitalize text-gray-900">{scaleStatus?.recommendation ?? 'stable'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-gray-600">Queue depth</span>
                  <span className="text-sm font-semibold text-gray-900">{scaleStatus?.queueDepth ?? 0}</span>
                </div>
                <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium text-gray-700">Lý do đề xuất</p>
                  {scaleStatus?.reasons?.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {scaleStatus.reasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Chưa có tín hiệu scale rõ ràng</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Avg Stats Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Tổng hợp chỉ số trung bình</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
              <span>Latency TB</span>
              <span className="font-semibold">{avgLatency}ms</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all" style={{ width: `${Math.min(100, (avgLatency / 300) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
              <span>Packet Loss TB</span>
              <span className="font-semibold">{avgPacketLoss}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div className="h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all" style={{ width: `${Math.min(100, Number(avgPacketLoss) * 10)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
              <span>Sự kiện/phút</span>
              <span className="font-semibold">{stats?.eventsPerMinute || 0}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (stats?.eventsPerMinute || 0) * 5)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
