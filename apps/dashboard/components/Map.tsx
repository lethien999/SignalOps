'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useDeviceStore } from '@/stores';
import type { Device, DeviceStatus } from '@/types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const createIcon = (status: DeviceStatus, maintenanceMode?: boolean) => {
  const color = maintenanceMode
    ? '#f59e0b'
    : status === 'active'
      ? '#10b981'
      : status === 'alert'
        ? '#ef4444'
        : '#6b7280';
  return new L.Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(color)}'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'/%3E%3C/svg%3E`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Wrapper component để sử dụng MarkerClusterGroup
interface MarkerClusterGroupProps {
  devices: Device[];
  onDeviceClick?: (device: Device) => void;
}

function MarkerClusterManager({ devices, onDeviceClick }: MarkerClusterGroupProps) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerClusterGroupRef = useRef<any>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!map) return;

    // Tạo marker cluster group
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      disableClusteringAtZoom: 16,
    });

    markerClusterGroupRef.current = markerClusterGroup;
    map.addLayer(markerClusterGroup);

    return () => {
      if (markerClusterGroup && map) {
        map.removeLayer(markerClusterGroup);
      }
    };
  }, [map]);

  // Cập nhật markers khi devices thay đổi
  useEffect(() => {
    if (!markerClusterGroupRef.current) return;

    const mcg = markerClusterGroupRef.current;

    // Xóa markers cũ
    Object.values(markersRef.current).forEach((marker) => {
      mcg.removeLayer(marker);
    });
    markersRef.current = {};

    // Thêm markers mới
    devices.forEach((device) => {
      const marker = L.marker([device.location.lat, device.location.lng], {
        icon: createIcon(device.status, device.maintenanceMode),
      });

      // Thêm popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-2';
      popupContent.innerHTML = `
        <p class="font-semibold text-gray-900">${device.name}</p>
        ${
          device.maintenanceMode
            ? '<p class="mt-1"><span class="inline-block px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">BẢO TRÌ</span></p>'
            : ''
        }
        <p class="text-sm text-gray-600">
          <span class="inline-block px-2 py-1 rounded text-xs font-semibold ${
            device.status === 'active'
              ? 'bg-green-100 text-green-800'
              : device.status === 'alert'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }">
            ${device.status.toUpperCase()}
          </span>
        </p>
        ${
          device.metrics
            ? `
          <div class="mt-2 text-xs text-gray-600 space-y-1">
            ${device.maintenanceReason ? `<p>Bảo trì: ${device.maintenanceReason}</p>` : ''}
            ${device.metrics.latency ? `<p>Latency: ${device.metrics.latency}ms</p>` : ''}
            ${device.metrics.packetLoss !== undefined ? `<p>Packet Loss: ${device.metrics.packetLoss}%</p>` : ''}
            ${device.metrics.signalStrength ? `<p>Signal: ${device.metrics.signalStrength} dBm</p>` : ''}
          </div>
        `
            : ''
        }
      `;

      marker.bindPopup(popupContent);

      // Thêm click handler
      marker.on('click', () => {
        onDeviceClick?.(device);
      });

      mcg.addLayer(marker);
      markersRef.current[device.id] = marker;
    });
  }, [devices, onDeviceClick]);

  return null;
}

interface MapProps {
  devices?: Device[];
  onDeviceClick?: (device: Device) => void;
  center?: [number, number];
  zoom?: number;
}

export function Map({ devices, onDeviceClick, center = [10.7769, 106.6998], zoom = 13 }: MapProps) {
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
        <p className="text-gray-600">Không có thiết bị để hiển thị trên bản đồ</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        bounds={bounds}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterManager devices={displayDevices} onDeviceClick={onDeviceClick} />
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Chú thích
        </p>
        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span>Thiết bị hoạt động</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span>Thiết bị cảnh báo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span>Thiết bị bảo trì (suppress alert)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gray-500" />
            <span>Thiết bị ngắt KN</span>
          </div>
        </div>
      </div>
    </div>
  );
}
