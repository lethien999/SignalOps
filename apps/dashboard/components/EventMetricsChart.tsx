"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Event, SystemStats } from "@/types";

interface EventMetricsChartProps {
  events: Event[];
  stats: SystemStats | null;
}

type ChartPoint = {
  label: string;
  latency: number;
  packetLoss: number;
  timestamp: number;
};

export function EventMetricsChart({ events, stats }: EventMetricsChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return [...events]
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .slice(-20)
      .map((event) => ({
        label: new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        latency: event.metrics?.latency ?? 0,
        packetLoss: event.metrics?.packetLoss ?? 0,
        timestamp: new Date(event.timestamp).getTime(),
      }));
  }, [events]);

  const maxEventsPerMinute = Math.max(1, Math.ceil(stats?.eventsPerMinute || 1));
  const refreshRate = Math.min(100, Math.round(((stats?.eventsPerMinute || 0) / maxEventsPerMinute) * 100));

  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Event Trends</h2>
          <p className="text-sm text-gray-500">Biểu đồ xu hướng từ dữ liệu events gần nhất.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Refresh rate: {stats?.eventsPerMinute || 0}/min
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Latency over time
          </h3>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-500">
              No event data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="latency" stroke="#2563eb" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Packet loss over time
          </h3>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-500">
              No event data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Area type="monotone" dataKey="packetLoss" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
          <span>Refresh rate visualization</span>
          <span>{stats?.eventsPerMinute || 0} events/min</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
            style={{ width: `${refreshRate}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </section>
  );
}