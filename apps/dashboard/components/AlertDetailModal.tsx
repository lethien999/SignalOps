"use client";

import React, { useState } from "react";
import { X, CheckCircle2, RotateCcw, Clock, MapPin } from "lucide-react";
import { updateAlertStatus } from "@/lib/api";
import { useAlertStore } from "@/stores";
import type { Alert } from "@/types";
import type { ToastType } from "@/components/ToastStack";

interface AlertDetailModalProps {
  alert: Alert | null;
  onClose: () => void;
  onActionComplete?: (message: string, type?: ToastType) => void;
}

export function AlertDetailModal({ alert, onClose, onActionComplete }: AlertDetailModalProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"acknowledged" | "resolved" | null>(null);
  const updateAlert = useAlertStore((state) => state.updateAlert);
  const selectAlert = useAlertStore((state) => state.selectAlert);

  if (!alert) {
    return null;
  }

  const handleStatusChange = async (status: "acknowledged" | "resolved") => {
    try {
      setActionLoading(true);
      setActionError(null);
      setPendingAction(null);

      const updatedAlert = await updateAlertStatus(alert.id, status);
      updateAlert(alert.id, updatedAlert);
      selectAlert(updatedAlert);
      onActionComplete?.(
        status === "acknowledged"
          ? "Alert acknowledged successfully."
          : "Alert resolved successfully.",
        "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update alert";
      setActionError(message);
      onActionComplete?.(message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
              Alert detail
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">{alert.type}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close alert details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {actionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Severity
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {alert.severity.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {alert.status.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Message
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{alert.message}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Device ID
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">{alert.deviceId}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Location
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.location?.name || `${alert.location?.lat ?? "?"}, ${alert.location?.lng ?? "?"}`}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Clock className="h-4 w-4" />
                Created
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <MapPin className="h-4 w-4" />
                Updated
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.updatedAt ? new Date(alert.updatedAt).toLocaleString() : "Not updated yet"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Acknowledged by
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.acknowledgedBy || "Not acknowledged"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Resolved by
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.resolvedBy || "Not resolved"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
            {alert.status === "open" && (
              <button
                type="button"
                onClick={() => setPendingAction("acknowledged")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <CheckCircle2 className="h-4 w-4" />
                Acknowledge
              </button>
            )}
            {alert.status === "acknowledged" && (
              <button
                type="button"
                onClick={() => setPendingAction("resolved")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RotateCcw className="h-4 w-4" />
                Resolve
              </button>
            )}
          </div>

          {pendingAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h4 className="text-lg font-bold text-gray-900">Confirm action</h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {pendingAction === "acknowledged"
                    ? "Bạn có chắc muốn xác nhận alert này là đã được acknowledge?"
                    : "Bạn có chắc muốn đánh dấu alert này là resolved?"}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(pendingAction)}
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}