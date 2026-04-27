"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MetricCard } from "@/components/MetricCard";
import { AlertTable } from "@/components/AlertTable";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { EventMetricsChart } from "@/components/EventMetricsChart";
import { ToastStack, type ToastItem, type ToastType } from "@/components/ToastStack";
import { useSocket } from "@/hooks/useSocket";
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

  // Store selectors
  const alerts = useAlertStore((state) => state.alerts);
  const selectedAlert = useAlertStore((state) => state.selectedAlert);
  const setAlerts = useAlertStore((state) => state.setAlerts);
  const selectAlert = useAlertStore((state) => state.selectAlert);
  const events = useEventStore((state) => state.events);
  const setEvents = useEventStore((state) => state.setEvents);
  const stats = useSystemStore((state) => state.stats);
  const setStats = useSystemStore((state) => state.setStats);
  const devices = Array.from(useDeviceStore((state) => state.devices).values());

  // WebSocket connection
  useSocket();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [alertsData, eventsData, statsData] = await Promise.all([
          fetchAlerts({ limit: 100 }),
          fetchEvents({ limit: 100 }),
          fetchSystemStats(),
        ]);

        setAlerts(alertsData);
        setEvents(eventsData);
        setStats(statsData);

        setError(null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [setAlerts, setEvents, setStats]);

  const activeAlerts = alerts.filter((a) => a.status === "open").length;
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "high" && a.status === "open"
  ).length;

  const pushToast = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header unreadAlerts={activeAlerts} />

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-medium">Error loading dashboard: {error}</p>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                title="Total Events"
                value={stats?.totalEvents || 0}
                icon={Activity}
                trend="up"
                trendValue={`${stats?.eventsPerMinute || 0}/min`}
                bgColor="bg-blue-50"
              />
              <MetricCard
                title="Active Alerts"
                value={activeAlerts}
                icon={AlertTriangle}
                trend={activeAlerts > 0 ? "up" : "stable"}
                trendValue={`${criticalAlerts} critical`}
                bgColor="bg-red-50"
              />
              <MetricCard
                title="Active Devices"
                value={devices.length}
                icon={Activity}
                trend="stable"
                bgColor="bg-green-50"
              />
              <MetricCard
                title="Queue Depth"
                value={stats?.queueDepth || 0}
                icon={TrendingUp}
                trend="stable"
                bgColor="bg-yellow-50"
              />
            </div>

            {/* Alerts Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Recent Alerts
                </h2>
                {activeAlerts > 0 && (
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                    {activeAlerts} Open
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
                </div>
              ) : (
                <AlertTable
                  alerts={alerts.slice(0, 10)}
                  onSelectAlert={selectAlert}
                />
              )}
            </div>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent Events</h2>
                <span className="text-sm text-gray-500">{events.length} loaded</span>
              </div>

              {events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  No recent events yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">Device {event.deviceId}</p>
                        <p className="text-sm text-gray-500">
                          {event.location?.name || `${event.location?.lat ?? "?"}, ${event.location?.lng ?? "?"}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span>Latency: {event.metrics?.latency ?? "-"} ms</span>
                        <span>Packet loss: {event.metrics?.packetLoss ?? "-"}%</span>
                        <span>Signal: {event.metrics?.signalStrength ?? "-"} dBm</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <EventMetricsChart events={events} stats={stats} />

            <AlertDetailModal
              alert={selectedAlert}
              onClose={() => selectAlert(null)}
              onActionComplete={(message, type = "info") => pushToast(message, type)}
            />

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Last updated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
