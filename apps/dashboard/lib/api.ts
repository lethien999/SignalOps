import axios from 'axios';
import type { Alert, Event, SystemStats } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export async function fetchAlerts(params?: {
  severity?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<Alert[]> {
  try {
    const response = await api.get<{ data: Alert[] }>('/alerts', { params });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    throw error;
  }
}

export async function fetchEvents(params?: {
  deviceId?: string;
  skip?: number;
  limit?: number;
}): Promise<Event[]> {
  try {
    const response = await api.get<{ data: Event[] }>('/events', { params });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
}

export async function updateAlertStatus(
  alertId: string,
  status: 'acknowledged' | 'resolved',
): Promise<Alert> {
  try {
    const response = await api.patch<Alert>(`/alerts/${alertId}`, {
      status,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update alert status:', error);
    throw error;
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const response = await api.get<SystemStats>('/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch system stats:', error);
    throw error;
  }
}

export async function fetchHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await api.get<{ status: string; uptime: number }>('/health');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch health status:', error);
    throw error;
  }
}

export { api };
