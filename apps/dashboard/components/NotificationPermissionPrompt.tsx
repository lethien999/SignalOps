'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { NotificationService } from '../services/notification.service';

export function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'not-supported' | null>(null);

  useEffect(() => {
    if (!NotificationService.isAvailable()) {
      setPermission('not-supported');
      return;
    }

    const currentPermission = NotificationService.getPermissionStatus();
    setPermission(currentPermission);

    // Show prompt only if permission is default (not yet asked)
    if (currentPermission === 'default') {
      setShow(true);
    }
  }, []);

  const handleEnable = async () => {
    const granted = await NotificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    setShow(false);

    if (granted) {
      // Test notification
      NotificationService.notify({
        title: 'Notifications Enabled',
        body: 'You will receive alerts for critical events',
      });
    }
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (permission === 'not-supported' || permission === 'granted' || !show) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Enable Notifications?</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get notified about critical alerts on your device
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-colors"
            >
              <Bell className="h-4 w-4" />
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 text-sm font-medium rounded hover:bg-gray-100 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Status badge for showing notification permission status
 */
export function NotificationStatusBadge() {
  const [permission, setPermission] = useState<NotificationPermission | 'not-supported' | null>(null);

  useEffect(() => {
    if (!NotificationService.isAvailable()) {
      setPermission('not-supported');
      return;
    }

    setPermission(NotificationService.getPermissionStatus());
  }, []);

  if (permission === 'not-supported' || permission === 'granted') {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
      <BellOff className="h-3 w-3" />
      Notifications disabled
    </div>
  );
}
