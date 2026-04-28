"use client";

import React, { useEffect, useState } from "react";
import {
  Settings as SettingsIcon, Server, Wifi, Bell, Shield, Activity,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Send,
} from "lucide-react";
import { fetchHealth } from "@/lib/api";

function InfoRow({ label, value, status }: { label: string; value: string; status?: "ok" | "warn" | "error" }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {status === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {status === "warn" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
        {status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [health, setHealth] = useState<{ status: string; uptime: number } | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Test event
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const apiUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api")
    : "";
  const socketUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000")
    : "";

  const loadHealth = () => {
    setRefreshing(true);
    fetchHealth()
      .then((data) => { setHealth(data); setHealthError(false); })
      .catch(() => setHealthError(true))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { loadHealth(); }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút`;
    return `${m} phút`;
  };

  const sendTestEvent = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "test-device-manual",
          location: { lat: 10.77, lng: 106.70, name: "Test thủ công" },
          metrics: { latency: 250, packetLoss: 8, signalStrength: -95 },
        }),
      });
      if (res.ok) {
        setTestResult("✅ Gửi thành công! Event đã được tiếp nhận (latency=250ms, loss=8% → sẽ tạo cảnh báo).");
      } else {
        setTestResult(`❌ Lỗi: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setTestResult(`❌ Không thể kết nối tới API: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-gray-600" />
          Cài đặt hệ thống
        </h1>
        <p className="mt-1 text-sm text-gray-500">Cấu hình hệ thống, trạng thái kết nối và các ngưỡng cảnh báo.</p>
      </div>

      <div className="space-y-6">
        {/* Trạng thái kết nối */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Trạng thái kết nối</h2>
            </div>
            <button
              onClick={loadHealth}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="API Gateway" value={apiUrl} status={health ? "ok" : healthError ? "error" : undefined} />
            <InfoRow label="WebSocket" value={socketUrl} />
            <InfoRow
              label="Trạng thái API"
              value={health ? "Hoạt động" : healthError ? "Không thể kết nối" : "Đang kiểm tra..."}
              status={health ? "ok" : healthError ? "error" : undefined}
            />
            <InfoRow label="Thời gian hoạt động" value={health ? formatUptime(health.uptime) : "—"} />
          </div>
        </div>

        {/* Ngưỡng cảnh báo */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <Bell className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ngưỡng cảnh báo</h2>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Latency tối đa" value="200 ms → Cảnh báo mức HIGH" status="warn" />
            <InfoRow label="Packet Loss tối đa" value="5% → Cảnh báo mức HIGH" status="warn" />
            <InfoRow label="Signal Strength tối thiểu" value="-90 dBm → Cảnh báo mức MEDIUM" status="warn" />
          </div>
          <div className="px-6 py-3 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500">
              Các ngưỡng được cấu hình qua biến môi trường trên API Gateway.
              Khi chỉ số vượt ngưỡng, Worker Service tự động tạo cảnh báo.
            </p>
          </div>
        </div>

        {/* Thông tin hệ thống */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Thông tin hệ thống</h2>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Phiên bản" value="1.0.0" />
            <InfoRow label="Môi trường" value="Development" />
            <InfoRow label="Cổng Dashboard" value="3001" />
            <InfoRow label="Cổng API Gateway" value="3000" />
          </div>
        </div>

        {/* Dịch vụ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <Activity className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Các dịch vụ</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "API Gateway", desc: "REST API & WebSocket", icon: Server, color: "text-blue-500" },
                { name: "Event Broker", desc: "Điều phối sự kiện, đẩy hàng đợi", icon: Activity, color: "text-purple-500" },
                { name: "Worker Service", desc: "Xử lý sự kiện, phát hiện bất thường", icon: Shield, color: "text-green-500" },
                { name: "Simulator", desc: "Tạo dữ liệu mô phỏng", icon: Send, color: "text-orange-500" },
                { name: "Dashboard", desc: "Giao diện giám sát (Next.js)", icon: Wifi, color: "text-cyan-500" },
              ].map((svc) => {
                const Icon = svc.icon;
                return (
                  <div key={svc.name} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                    <Icon className={`w-5 h-5 ${svc.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                      <p className="text-xs text-gray-500">{svc.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Test gửi event */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <Send className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Kiểm tra gửi sự kiện</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-4">
              Gửi một event thử với các chỉ số vượt ngưỡng (latency=250ms, loss=8%) để kiểm tra toàn bộ luồng xử lý:
              API → Hàng đợi → Worker → Tạo cảnh báo → Dashboard.
            </p>
            <button
              onClick={sendTestEvent}
              disabled={testLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {testLoading ? "Đang gửi..." : "Gửi event thử nghiệm"}
            </button>
            {testResult && (
              <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${testResult.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {testResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
