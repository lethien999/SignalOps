"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useDeviceStore } from "@/stores";
import type { Device, DeviceStatus } from "@/types";
import "leaflet/dist/leaflet.css";

const createIcon = (status: DeviceStatus) => {
  const color = status === "active" ? "#10b981" : status === "alert" ? "#ef4444" : "#6b7280";
  return new L.Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(color)}'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'/%3E%3C/svg%3E`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface MapProps {
  devices?: Device[];
  onDeviceClick?: (device: Device) => void;
  center?: [number, number];
  zoom?: number;
}

export function Map({
  devices,
  onDeviceClick,
  center = [10.7769, 106.6998],
  zoom = 13,
}: MapProps) {
  const storeDevices = useDeviceStore((state) => state.devices);
  const displayDevices = devices || Array.from(storeDevices.values());

  // Calculate bounds from devices
  const bounds = useMemo(() => {
    if (displayDevices.length === 0) {
      return undefined;
    }
    const lats = displayDevices.map((d) => d.location.lat);
    const lngs = displayDevices.map((d) => d.location.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
  }, [displayDevices]);

  if (displayDevices.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">No devices to display on map</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      bounds={bounds}
      className="w-full h-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {displayDevices.map((device) => (
        <Marker
          key={device.id}
          position={[device.location.lat, device.location.lng]}
          icon={createIcon(device.status)}
          eventHandlers={{
            click: () => {
              onDeviceClick?.(device);
            },
          }}
        >
          <Popup>
            <div className="p-2">
              <p className="font-semibold text-gray-900">{device.name}</p>
              <p className="text-sm text-gray-600">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    device.status === "active"
                      ? "bg-green-100 text-green-800"
                      : device.status === "alert"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {device.status.toUpperCase()}
                </span>
              </p>
              {device.metrics && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {device.metrics.latency && (
                    <p>Latency: {device.metrics.latency}ms</p>
                  )}
                  {device.metrics.packetLoss !== undefined && (
                    <p>Packet Loss: {device.metrics.packetLoss}%</p>
                  )}
                  {device.metrics.signalStrength && (
                    <p>Signal: {device.metrics.signalStrength} dBm</p>
                  )}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
