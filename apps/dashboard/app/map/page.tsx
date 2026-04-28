"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, Wifi, WifiOff, AlertTriangle, Search } from "lucide-react";
import { useDeviceStore, useEventStore } from "@/stores";
import { fetchEvents } from "@/lib/api";
import type { Device } from "@/types";

const MapComponent = dynamic(
  () => import("@/components/Map").then((mod) => ({ default: mod.Map })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600" />
      </div>
    ),
  }
);

export default function MapPage() {
  const storeDevices = useDeviceStore((s) => s.devices);
  const setDevices = useDeviceStore((s) => s.setDevices);
  const setEvents = useEventStore((s) => s.setEvents);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load events from API and derive devices from them
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const evData = await fetchEvents({ limit: 200 });
        setEvents(evData);

        // Build devices from events (group by deviceId, take latest)
        const deviceMap = new Map<string, Device>();
        for (const ev of evData) {
          const existing = deviceMap.get(ev.deviceId);
          const isNewer = !existing || new Date(ev.timestamp) > new Date(existing.lastSeen || "");
          if (isNewer && ev.location) {
            deviceMap.set(ev.deviceId, {
              id: ev.deviceId,
              name: ev.location.name || ev.deviceId,
              location: ev.location,
              status: "active",
              lastSeen: ev.timestamp,
              metrics: ev.metrics,
            });
          }
        }
        setDevices(Array.from(deviceMap.values()));
      } catch (err) {
        console.error("Không thể tải dữ liệu thiết bị:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [setEvents, setDevices]);

  const devices = Array.from(storeDevices.values());
  const activeCount = devices.filter((d) => d.status === "active").length;
  const alertCount = devices.filter((d) => d.status === "alert").length;
  const inactiveCount = devices.filter((d) => d.status === "inactive").length;

  const filteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "alert": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "alert": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "active": return "HOẠT ĐỘNG";
      case "alert": return "CẢNH BÁO";
      default: return "NGẮT KN";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          Bản đồ thiết bị
        </h1>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <span className="flex items-center gap-2 text-green-700">
            <Wifi className="w-4 h-4" /> {activeCount} Hoạt động
          </span>
          <span className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" /> {alertCount} Cảnh báo
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <WifiOff className="w-4 h-4" /> {inactiveCount} Ngắt kết nối
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thiết bị..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {devices.length === 0
                  ? "Chưa có thiết bị nào. Đang chờ dữ liệu từ simulator..."
                  : "Không tìm thấy thiết bị phù hợp."}
              </div>
            ) : (
              filteredDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                    selectedDevice?.id === device.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{device.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {device.location?.name || `${device.location.lat.toFixed(4)}, ${device.location.lng.toFixed(4)}`}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(device.status)}`}>
                      {statusLabel(device.status)}
                    </span>
                  </div>
                  {device.metrics && (
                    <div className="mt-2 flex gap-3 text-xs text-gray-500">
                      {device.metrics.latency !== undefined && <span>Latency: {device.metrics.latency}ms</span>}
                      {device.metrics.signalStrength !== undefined && <span>Signal: {device.metrics.signalStrength} dBm</span>}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
            Tổng cộng {devices.length} thiết bị
          </div>
        </div>

        <div className="flex-1 relative">
          <MapComponent
            devices={devices}
            onDeviceClick={(device) => setSelectedDevice(device)}
          />

          {selectedDevice && (
            <div className="absolute bottom-6 left-6 z-[1000] w-80 rounded-xl bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedDevice.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedDevice.location?.name ||
                      `${selectedDevice.location.lat.toFixed(4)}, ${selectedDevice.location.lng.toFixed(4)}`}
                  </p>
                </div>
                <button onClick={() => setSelectedDevice(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${statusColor(selectedDevice.status)}`} />
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(selectedDevice.status)}`}>
                  {statusLabel(selectedDevice.status)}
                </span>
              </div>
              {selectedDevice.metrics && (
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Latency</p>
                    <p className="text-sm font-bold text-gray-900">{selectedDevice.metrics.latency ?? "-"}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Packet Loss</p>
                    <p className="text-sm font-bold text-gray-900">{selectedDevice.metrics.packetLoss ?? "-"}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Signal</p>
                    <p className="text-sm font-bold text-gray-900">{selectedDevice.metrics.signalStrength ?? "-"}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
