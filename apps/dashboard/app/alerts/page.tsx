"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, ShieldAlert, RefreshCw } from "lucide-react";
import { AlertTable } from "@/components/AlertTable";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { ToastStack, type ToastItem, type ToastType } from "@/components/ToastStack";
import { useAlertStore } from "@/stores";
import { fetchAlerts } from "@/lib/api";

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const alerts = useAlertStore((s) => s.alerts);
  const selectedAlert = useAlertStore((s) => s.selectedAlert);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const selectAlert = useAlertStore((s) => s.selectAlert);

  const loadAlerts = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setRefreshing(true);
      const data = await fetchAlerts({ limit: 500 });
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cảnh báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAlerts(); }, [setAlerts]);

  const openAlerts = alerts.filter((a) => a.status === "open").length;
  const ackAlerts = alerts.filter((a) => a.status === "acknowledged").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;
  const highAlerts = alerts.filter((a) => a.severity === "high" && a.status === "open").length;

  const pushToast = (msg: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((c) => [...c, { id, message: msg, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} />

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            Quản lý cảnh báo
          </h1>
          <p className="mt-1 text-sm text-gray-500">Theo dõi, xác nhận và xử lý các cảnh báo theo thời gian thực.</p>
        </div>
        <button
          onClick={() => loadAlerts(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Tổng cảnh báo</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{alerts.length}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3.5">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="metric-card !border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đang mở</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{openAlerts}</p>
              {highAlerts > 0 && <p className="text-xs text-red-500 mt-1">{highAlerts} nghiêm trọng</p>}
            </div>
            <div className="rounded-xl bg-red-50 p-3.5">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="metric-card !border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đã xác nhận</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{ackAlerts}</p>
            </div>
            <div className="rounded-xl bg-yellow-50 p-3.5">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="metric-card !border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đã xử lý</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{resolvedAlerts}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3.5">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600" />
            <p className="text-sm text-gray-500">Đang tải cảnh báo...</p>
          </div>
        ) : (
          <AlertTable alerts={alerts} onSelectAlert={selectAlert} />
        )}
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => selectAlert(null)}
        onActionComplete={(msg, type = "info") => pushToast(msg, type)}
      />
    </div>
  );
}
