import { create } from 'zustand';
import type { Alert, Event, Device, SystemStats } from '@/types';

interface AlertStore {
  alerts: Alert[];
  selectedAlert: Alert | null;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  selectAlert: (alert: Alert | null) => void;
  removeAlert: (id: string) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  selectedAlert: null,
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
    })),
  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      selectedAlert:
        state.selectedAlert?.id === id
          ? { ...state.selectedAlert, ...updates }
          : state.selectedAlert,
    })),
  selectAlert: (alert) => set({ selectedAlert: alert }),
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}));

interface EventStore {
  events: Event[];
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 1000),
    })),
}));

interface DeviceStore {
  devices: Map<string, Device>;
  setDevices: (devices: Device[]) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  getDevice: (id: string) => Device | undefined;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: new Map(),
  setDevices: (devices) =>
    set({
      devices: new Map(devices.map((d) => [d.id, d])),
    }),
  updateDevice: (id, updates) =>
    set((state) => {
      const devices = new Map(state.devices);
      const device = devices.get(id);
      if (device) {
        devices.set(id, { ...device, ...updates });
      }
      return { devices };
    }),
  getDevice: (id) => {
    return get().devices.get(id);
  },
}));

interface SystemStore {
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
  setStats: (stats: SystemStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateQueueDepth: (depth: number) => void;
  updateWorkerStats: (stats: { processing: number; completed: number; failed: number }) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  stats: null,
  loading: false,
  error: null,
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  updateQueueDepth: (depth) =>
    set((state) => ({
      stats: state.stats
        ? { ...state.stats, queueDepth: depth }
        : {
            totalEvents: 0,
            activeAlerts: 0,
            eventsPerMinute: 0,
            activeDevices: 0,
            queueDepth: depth,
          },
    })),
  updateWorkerStats: (workerStats) =>
    set((state) => ({
      stats: state.stats
        ? { ...state.stats, workerStats }
        : { totalEvents: 0, activeAlerts: 0, eventsPerMinute: 0, activeDevices: 0, workerStats },
    })),
}));

interface UIStore {
  sidebarOpen: boolean;
  selectedFilters: {
    severity?: 'low' | 'medium' | 'high' | 'all';
    status?: 'open' | 'acknowledged' | 'resolved' | 'all';
    search?: string;
  };
  toggleSidebar: () => void;
  setFilters: (filters: UIStore['selectedFilters']) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  selectedFilters: {
    severity: 'all',
    status: 'all',
    search: '',
  },
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  setFilters: (filters) =>
    set((state) => ({
      selectedFilters: { ...state.selectedFilters, ...filters },
    })),
}));
