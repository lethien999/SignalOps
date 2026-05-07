import axios from 'axios';
import type { Alert, Device, DlqJob, Event, NotificationWebhook, SystemStats, ThresholdProfile } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

type AlertApiResponse = Alert & {
  _id?: string;
};

function normalizeAlert(alert: AlertApiResponse): Alert {
  return {
    ...alert,
    id: alert.id || alert._id || '',
  };
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string } | string | undefined;

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
      return responseData;
    }

    if (responseData && typeof responseData === 'object' && typeof responseData.message === 'string' && responseData.message.trim().length > 0) {
      return responseData.message;
    }

    if (typeof error.response?.statusText === 'string' && error.response.statusText.trim().length > 0) {
      return error.response.statusText;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export async function fetchAlerts(params?: {
  severity?: string;
  status?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}): Promise<Alert[]> {
  try {
    const response = await api.get<{ data: AlertApiResponse[] }>('/alerts', { params });
    return response.data.data.map(normalizeAlert);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    throw error;
  }
}

export async function fetchAlertsPage(params?: {
  severity?: string;
  status?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}): Promise<{
  data: Alert[];
  pagination: { skip: number; limit: number; total: number };
  summary: { open: number; acknowledged: number; resolved: number; highOpen: number };
}> {
  try {
    const response = await api.get<{
      data: AlertApiResponse[];
      pagination: { skip: number; limit: number; total: number };
      summary: { open: number; acknowledged: number; resolved: number; highOpen: number };
    }>('/alerts', { params });

    return {
      data: response.data.data.map(normalizeAlert),
      pagination: response.data.pagination,
      summary: response.data.summary,
    };
  } catch (error) {
    console.error('Failed to fetch paged alerts:', error);
    throw error;
  }
}

export async function downloadAlertHistoryCsv(params?: {
  severity?: string;
  status?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  days?: number;
}): Promise<string> {
  try {
    const response = await api.get<string>('/alerts/history/csv', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to download alert history CSV:', error);
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

export async function fetchDevices(): Promise<Device[]> {
  try {
    const response = await api.get<Device[]>('/devices');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    throw error;
  }
}

export async function setDeviceMaintenance(
  deviceId: string,
  payload: { enabled: boolean; reason?: string; updatedBy?: string },
): Promise<{ deviceId: string; enabled: boolean; reason?: string; updatedBy?: string; updatedAt?: string }> {
  try {
    const response = await api.patch<{
      deviceId: string;
      enabled: boolean;
      reason?: string;
      updatedBy?: string;
      updatedAt?: string;
    }>(`/devices/${deviceId}/maintenance`, payload);
    return response.data;
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể cập nhật trạng thái bảo trì');
    console.error('Không thể cập nhật trạng thái bảo trì:', message);
    throw new Error(message);
  }
}

export async function updateAlertStatus(
  alertId: string,
  status: 'acknowledged' | 'resolved',
  extra?: Record<string, string>,
): Promise<Alert> {
  try {
    const response = await api.patch<AlertApiResponse>(`/alerts/${alertId}`, {
      status,
      ...extra,
    });
    return normalizeAlert(response.data);
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể cập nhật cảnh báo');
    console.error('Không thể cập nhật cảnh báo:', message);
    throw new Error(message);
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

export async function batchUpdateAlerts(
  ids: string[],
  status: 'acknowledged' | 'resolved',
  extra?: Record<string, string>,
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const response = await api.post<{ success: number; failed: number; errors: string[] }>('/alerts/batch', {
      ids,
      status,
      ...extra,
    });
    return response.data;
  } catch (error) {
    console.error('Không thể cập nhật hàng loạt:', error);
    throw error;
  }
}

function normalizeDlqJob(job: Record<string, unknown>): DlqJob {
  return {
    id: String(job.id || job['name'] || job['timestamp'] || ''),
    name: typeof job.name === 'string' ? job.name : undefined,
    failedReason: typeof job.failedReason === 'string' ? job.failedReason : undefined,
    attemptsMade: typeof job.attemptsMade === 'number' ? job.attemptsMade : undefined,
    timestamp: typeof job.timestamp === 'number' ? job.timestamp : undefined,
    processedOn: typeof job.processedOn === 'number' ? job.processedOn : undefined,
    finishedOn: typeof job.finishedOn === 'number' ? job.finishedOn : undefined,
    data: job.data && typeof job.data === 'object' ? (job.data as Record<string, unknown>) : undefined,
  };
}

export async function fetchDlqFailedJobs(limit = 20): Promise<DlqJob[]> {
  try {
    const response = await api.get<Array<Record<string, unknown>>>('/dlq/failed-jobs', {
      params: { limit },
    });
    return response.data.map(normalizeDlqJob);
  } catch (error) {
    console.error('Failed to fetch DLQ jobs:', error);
    throw error;
  }
}

export async function fetchNotificationWebhooks(): Promise<NotificationWebhook[]> {
  try {
    const response = await api.get<NotificationWebhook[]>('/notifications/webhooks');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch notification webhooks:', error);
    throw error;
  }
}

export async function fetchThresholdProfiles(): Promise<ThresholdProfile[]> {
  try {
    const response = await api.get<ThresholdProfile[]>('/thresholds');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch threshold profiles:', error);
    throw error;
  }
}

export async function fetchEffectiveThresholdProfile(deviceId?: string): Promise<ThresholdProfile[]> {
  try {
    const response = await api.get<ThresholdProfile[]>('/thresholds/effective', {
      params: deviceId ? { deviceId } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch effective threshold profile:', error);
    throw error;
  }
}

export async function saveThresholdProfile(payload: {
  scopeType: 'global' | 'device';
  scopeId: string;
  latencyWarningMs?: number;
  latencyCriticalMs?: number;
  packetLossWarningPercent?: number;
  packetLossCriticalPercent?: number;
  signalWarningDbm?: number;
  signalCriticalDbm?: number;
  enabled?: boolean;
  note?: string;
  updatedBy?: string;
}): Promise<ThresholdProfile> {
  try {
    const response = await api.patch<ThresholdProfile>('/thresholds', payload);
    return response.data;
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể lưu cấu hình ngưỡng');
    throw new Error(message);
  }
}

export async function rollbackThresholdProfile(scopeType: 'global' | 'device', scopeId: string): Promise<{ success: boolean }> {
  try {
    const response = await api.delete<{ success: boolean }>(`/thresholds/${scopeType}/${scopeId}`);
    return response.data;
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể rollback cấu hình ngưỡng');
    throw new Error(message);
  }
}

export async function createNotificationWebhook(payload: {
  name: string;
  channel: 'slack' | 'telegram';
  webhookUrl: string;
  severities: Array<'low' | 'warning' | 'medium' | 'high' | 'critical'>;
  enabled?: boolean;
  retryMax?: number;
  retryBackoffMs?: number;
  updatedBy?: string;
}): Promise<NotificationWebhook> {
  try {
    const response = await api.post<NotificationWebhook>('/notifications/webhooks', payload);
    return response.data;
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể tạo cấu hình webhook');
    throw new Error(message);
  }
}

export async function updateNotificationWebhook(
  id: string,
  payload: Partial<{
    name: string;
    channel: 'slack' | 'telegram';
    webhookUrl: string;
    severities: Array<'low' | 'warning' | 'medium' | 'high' | 'critical'>;
    enabled: boolean;
    retryMax: number;
    retryBackoffMs: number;
    updatedBy: string;
  }>,
): Promise<NotificationWebhook> {
  try {
    const response = await api.patch<NotificationWebhook>(`/notifications/webhooks/${id}`, payload);
    return response.data;
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Không thể cập nhật cấu hình webhook');
    throw new Error(message);
  }
}

export { api };
