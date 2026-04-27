"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MetricCard } from "@/components/MetricCard";
import { AlertTable } from "@/components/AlertTable";
import { useSocket } from "@/hooks/useSocket";
import {
  useAlertStore,
  useSystemStore,
  useDeviceStore,
} from "@/stores";
import { fetchAlerts, fetchSystemStats } from "@/lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store selectors
  const alerts = useAlertStore((state) => state.alerts);
  const setAlerts = useAlertStore((state) => state.setAlerts);
  const selectAlert = useAlertStore((state) => state.selectAlert);
  const stats = useSystemStore((state) => state.stats);
  const setStats = useSystemStore((state) => state.setStats);
  const devices = Array.from(useDeviceStore((state) => state.devices).values());

  // WebSocket connection
  useSocket();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [alertsData, statsData] = await Promise.all([
          fetchAlerts({ limit: 100 }),
          fetchSystemStats(),
        ]);

        setAlerts(alertsData);
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
  }, [setAlerts, setStats]);

  const activeAlerts = alerts.filter((a) => a.status === "open").length;
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "high" && a.status === "open"
  ).length;

  return (
    <div className="flex h-screen bg-gray-50">
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
