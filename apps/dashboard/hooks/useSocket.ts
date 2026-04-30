'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  useAlertStore,
  useEventStore,
  useDeviceStore,
  useSystemStore,
} from '@/stores';
import type { Alert, DeviceStatus, Event } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

type WorkerStatsPayload = {
  processing: number;
  completed: number;
  failed: number;
};

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const addAlert = useAlertStore((state) => state.addAlert);
  const updateAlert = useAlertStore((state) => state.updateAlert);
  const addEvent = useEventStore((state) => state.addEvent);
  const updateDevice = useDeviceStore((state) => state.updateDevice);
  const updateQueueDepth = useSystemStore((state) => state.updateQueueDepth);
  const updateWorkerStats = useSystemStore((state) => state.updateWorkerStats);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on('connect', () => {
        console.log('WebSocket connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      socketRef.current.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      socketRef.current.on('alert:new', (data: Alert) => {
        console.log('Received alert:new', data);
        addAlert(data);
      });

      socketRef.current.on('alert:acknowledged', (data: Alert) => {
        console.log('Received alert:acknowledged', data);
        updateAlert(data.id, data);
      });

      socketRef.current.on('alert:resolved', (data: Alert) => {
        console.log('Received alert:resolved', data);
        updateAlert(data.id, data);
      });

      socketRef.current.on('event:processed', (data: Event) => {
        console.log('Received event:processed', data);
        addEvent(data);
      });

      socketRef.current.on('device:status:changed', (data: { deviceId: string; status: DeviceStatus }) => {
        console.log('Received device:status:changed', data);
        updateDevice(data.deviceId, { status: data.status });
      });

      socketRef.current.on('queue:depth', (data: { depth: number; timestamp: string }) => {
        console.log('Received queue:depth', data);
        updateQueueDepth(data.depth);
      });

      socketRef.current.on('worker:stats', (data: WorkerStatsPayload) => {
        console.log('Received worker:stats', data);
        updateWorkerStats({
          processing: data.processing,
          completed: data.completed,
          failed: data.failed,
        });
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [addAlert, updateAlert, addEvent, updateDevice, updateQueueDepth, updateWorkerStats]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    connect,
    disconnect,
  };
}
