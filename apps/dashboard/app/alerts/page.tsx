'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AlertTable } from '@/components/AlertTable';
import { AlertDetailModal } from '@/components/AlertDetailModal';
import { ToastStack, type ToastItem, type ToastType } from '@/components/ToastStack';
import { useAlertStore } from '@/stores';
import { downloadAlertHistoryCsv, fetchAlertsPage } from '@/lib/api';

type AlertSummary = {
  open: number;
  acknowledged: number;
  resolved: number;
  highOpen: number;
};

const PAGE_SIZE = 20;

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [status, setStatus] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [deviceId, setDeviceId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AlertSummary>({
    open: 0,
    acknowledged: 0,
    resolved: 0,
    highOpen: 0,
  });

  const alerts = useAlertStore((s) => s.alerts);
  const selectedAlert = useAlertStore((s) => s.selectedAlert);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const selectAlert = useAlertStore((s) => s.selectAlert);

  const loadAlerts = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setRefreshing(true);
        const response = await fetchAlertsPage({
          severity: severity === 'all' ? undefined : severity,
          status: status === 'all' ? undefined : status,
          deviceId: deviceId.trim() || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        });

        setAlerts(response.data);
        setTotal(response.pagination.total);
        setSummary(response.summary);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải cảnh báo');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deviceId, fromDate, page, severity, setAlerts, status, toDate]
  );

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const openAlerts = summary.open;
  const ackAlerts = summary.acknowledged;
  const resolvedAlerts = summary.resolved;
  const highAlerts = summary.highOpen;

  const pushToast = (msg: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((c) => [...c, { id, message: msg, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500);
  };

  const exportCsv = async () => {
    try {
      setExportingCsv(true);
      const blobUrl = await downloadAlertHistoryCsv({
        severity: severity === 'all' ? undefined : severity,
        status: status === 'all' ? undefined : status,
        deviceId: deviceId.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'alert-history.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      pushToast('Đã tải file CSV theo bộ lọc hiện tại', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể tải CSV', 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))}
      />

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            Quản lý cảnh báo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi, xác nhận và xử lý các cảnh báo theo thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
          >
            {exportingCsv ? 'Đang xuất CSV...' : 'Tải CSV'}
          </button>
          <button
            onClick={() => loadAlerts(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <Filter className="w-4 h-4" />
          Bộ lọc phía server
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Mức độ
            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value as typeof severity);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="high">Nghiêm trọng</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Trạng thái
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="open">Đang mở</option>
              <option value="acknowledged">Đã xác nhận</option>
              <option value="resolved">Đã xử lý</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Device ID
            <input
              value={deviceId}
              onChange={(event) => {
                setDeviceId(event.target.value);
                setPage(1);
              }}
              placeholder="device-001"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Từ ngày
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Đến ngày
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
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
          <p className="mt-2 text-xs text-gray-500">Tổng bản ghi theo bộ lọc hiện tại: {total}</p>
        </div>
        <div className="metric-card !border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đang mở</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{openAlerts}</p>
              {highAlerts > 0 && (
                <p className="text-xs text-red-500 mt-1">{highAlerts} nghiêm trọng</p>
              )}
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
          <AlertTable alerts={alerts} onSelectAlert={selectAlert} serverSide />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-gray-600">
          Trang {page} / {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => selectAlert(null)}
        onActionComplete={(msg, type = 'info') => pushToast(msg, type)}
      />
    </div>
  );
}
