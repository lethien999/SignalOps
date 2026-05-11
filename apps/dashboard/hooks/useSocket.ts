'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  useAlertStore,
  useEventStore,
  useDeviceStore,
  useSystemStore,
} from '@/stores';
import { NotificationService } from '../services/notification.service';
import type { Alert, DeviceStatus, Event } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

type WorkerStatsPayload = {
  processing: number;
  completed: number;
  failed: number;
};

const ALERT_SOUND_STORAGE_KEY = 'signalops-alert-sound';

function playAlertSound(severity: Alert['severity']) {
  try {
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    let frequency: number;
    if (severity === 'critical') {
      frequency = 987; // B5
    } else if (severity === 'high') {
      frequency = 880; // A5
    } else if (severity === 'warning') {
      frequency = 741; // F5
    } else if (severity === 'medium') {
      frequency = 660; // E5
    } else {
      frequency = 523; // C5
    }

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.0001;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.stop(audioContext.currentTime + 0.24);
    oscillator.onended = () => {
      audioContext.close().catch(() => undefined);
    };
  } catch (error) {
    console.warn('Failed to play alert sound:', error);
  }
}

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

        if (typeof window !== 'undefined' && window.localStorage.getItem(ALERT_SOUND_STORAGE_KEY) !== 'off') {
          playAlertSound(data.severity);
        }

        // M13: Send push notification for critical/high alerts
        if (['critical', 'high'].includes(data.severity)) {
          NotificationService.notifyAlert(data.deviceId, data.type, data.severity).catch((err) =>
            console.warn('Failed to send notification:', err),
          );
        }
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
