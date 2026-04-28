"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Activity, TrendingUp, BarChart3, Cpu, Wifi, AlertTriangle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { useEventStore, useSystemStore, useDeviceStore } from "@/stores";
import { fetchEvents, fetchSystemStats } from "@/lib/api";
import type { Event } from "@/types";

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

  const events = useEventStore((s) => s.events);
  const setEvents = useEventStore((s) => s.setEvents);
  const stats = useSystemStore((s) => s.stats);
  const setStats = useSystemStore((s) => s.setStats);
  const devices = Array.from(useDeviceStore((s) => s.devices).values());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ev, st] = await Promise.all([fetchEvents({ limit: 200 }), fetchSystemStats()]);
        setEvents(ev);
        setStats(st);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [setEvents, setStats]);

  const chartData = useMemo(() => buildChartData(events), [events]);

  const avgLatency = events.length
    ? Math.round(events.reduce((sum, e) => sum + (e.metrics?.latency ?? 0), 0) / events.length)
    : 0;
  const avgPacketLoss = events.length
    ? (events.reduce((sum, e) => sum + (e.metrics?.packetLoss ?? 0), 0) / events.length).toFixed(2)
    : "0";

  const workerStats = stats?.workerStats;

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
