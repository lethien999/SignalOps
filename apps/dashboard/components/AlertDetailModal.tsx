"use client";

import React, { useState } from "react";
import { X, CheckCircle2, RotateCcw, Clock, MapPin, User, FileText } from "lucide-react";
import { updateAlertStatus } from "@/lib/api";
import { useAlertStore } from "@/stores";
import { AIScoreDisplay } from "./AIScoreDisplay";
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
  const [operatorName, setOperatorName] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const updateAlert = useAlertStore((state) => state.updateAlert);
  const selectAlert = useAlertStore((state) => state.selectAlert);

  if (!alert) return null;

  const handleStatusChange = async (status: "acknowledged" | "resolved") => {
    if (!operatorName.trim()) {
      setActionError("Vui lòng nhập tên người thực hiện");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      setPendingAction(null);

      const payload: Record<string, string> = { status };
      if (status === "acknowledged") {
        payload.acknowledgedBy = operatorName.trim();
      } else {
        payload.resolvedBy = operatorName.trim();
        if (resolutionNote.trim()) {
          payload.resolutionNote = resolutionNote.trim();
        }
      }

      const updatedAlert = await updateAlertStatus(alert.id, status, payload);
      updateAlert(alert.id, updatedAlert);
      selectAlert(updatedAlert);
      setOperatorName("");
      setResolutionNote("");
      onActionComplete?.(
        status === "acknowledged"
          ? "Đã xác nhận cảnh báo thành công."
          : "Đã xử lý cảnh báo thành công.",
        "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật cảnh báo";
      setActionError(message);
      onActionComplete?.(message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const severityLabel: Record<string, string> = {
    critical: "Tới hạn",
    high: "Nghiêm trọng",
    warning: "Cảnh báo",
    medium: "Trung bình",
    low: "Thấp",
  };

  const statusLabel: Record<string, string> = {
    open: "Đang mở",
    acknowledged: "Đã xác nhận",
    resolved: "Đã xử lý",
  };

  const severityColor: Record<string, string> = {
    critical: "text-red-700 bg-red-100 border-red-300",
    high: "text-red-600 bg-red-50 border-red-200",
    warning: "text-orange-600 bg-orange-50 border-orange-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    low: "text-blue-600 bg-blue-50 border-blue-200",
  };

  const statusColor: Record<string, string> = {
    open: "text-red-600 bg-red-50 border-red-200",
    acknowledged: "text-yellow-600 bg-yellow-50 border-yellow-200",
    resolved: "text-green-600 bg-green-50 border-green-200",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
              Chi tiết cảnh báo
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">{alert.type}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Đóng"
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
                Mức độ
              </p>
              <p className={`mt-2 inline-block text-sm font-bold px-3 py-1 rounded-full border ${severityColor[alert.severity] || ""}`}>
                {severityLabel[alert.severity] || alert.severity.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trạng thái
              </p>
              <p className={`mt-2 inline-block text-sm font-bold px-3 py-1 rounded-full border ${statusColor[alert.status] || ""}`}>
                {statusLabel[alert.status] || alert.status.toUpperCase()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nội dung
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{alert.message}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Thiết bị
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">{alert.deviceId}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <MapPin className="h-3.5 w-3.5" /> Vị trí
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.location?.name || `${alert.location?.lat ?? "?"}, ${alert.location?.lng ?? "?"}`}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Clock className="h-3.5 w-3.5" /> Thời gian tạo
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {new Date(alert.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Clock className="h-3.5 w-3.5" /> Lần cập nhật cuối
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.updatedAt ? new Date(alert.updatedAt).toLocaleString("vi-VN") : "Chưa cập nhật"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <User className="h-3.5 w-3.5" /> Người xác nhận
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.acknowledgedBy || "—"}
              </p>
              {alert.acknowledgedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(alert.acknowledgedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <User className="h-3.5 w-3.5" /> Người xử lý
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {alert.resolvedBy || "—"}
              </p>
              {alert.resolvedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(alert.resolvedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
            {(alert.anomalyScore !== undefined || alert.anomalyLabel || alert.anomalyReasons?.length) && (
              <div className="md:col-span-2">
                <AIScoreDisplay
                  score={alert.anomalyScore}
                  confidence={alert.anomalyConfidence}
                  label={alert.anomalyLabel}
                  reasons={alert.anomalyReasons}
                />
              </div>
            )}
            {alert.resolutionNote && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 md:col-span-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                  <FileText className="h-3.5 w-3.5" /> Ghi chú xử lý
                </p>
                <p className="mt-2 text-sm text-green-900">{alert.resolutionNote}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Quay lại
            </button>
            {alert.status === "open" && (
              <button
                type="button"
                onClick={() => { setPendingAction("acknowledged"); setOperatorName(""); setActionError(null); }}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-70"
              >
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận cảnh báo
              </button>
            )}
            {alert.status === "acknowledged" && (
              <button
                type="button"
                onClick={() => { setPendingAction("resolved"); setOperatorName(""); setResolutionNote(""); setActionError(null); }}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70"
              >
                <RotateCcw className="h-4 w-4" />
                Đánh dấu đã xử lý
              </button>
            )}
            {alert.status === "resolved" && (
              <p className="w-full text-sm text-amber-700">
                Cảnh báo này đã ở trạng thái đã xử lý, nên không thể xác nhận lại.
              </p>
            )}
            {alert.status === "acknowledged" && (
              <p className="w-full text-sm text-blue-700">
                Cảnh báo đã được xác nhận, bạn có thể chuyển sang trạng thái đã xử lý nếu cần.
              </p>
            )}
          </div>

          {/* Confirmation dialog with name input */}
          {pendingAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
                <h4 className="text-lg font-bold text-gray-900">
                  {pendingAction === "acknowledged" ? "Xác nhận cảnh báo" : "Hoàn tất xử lý"}
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {pendingAction === "acknowledged"
                    ? "Bạn sẽ xác nhận đã tiếp nhận cảnh báo này và chịu trách nhiệm xử lý."
                    : "Bạn sẽ đánh dấu cảnh báo này đã được xử lý xong."}
                </p>

                {/* Name input */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên người thực hiện <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="Nhập tên của bạn..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  {pendingAction === "resolved" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ghi chú xử lý
                      </label>
                      <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Mô tả ngắn gọn đã làm gì để khắc phục..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  )}
                </div>

                {actionError && (
                  <p className="mt-3 text-sm text-red-600">{actionError}</p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => { setPendingAction(null); setActionError(null); }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(pendingAction)}
                    disabled={actionLoading || !operatorName.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác nhận"}
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