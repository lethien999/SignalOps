/**
 * Notification Service for PWA - M13
 *
 * Supports:
 * 1. Browser Notification API (desktop + mobile background notifications)
 * 2. In-app toast notifications (UI component)
 *
 * Flow:
 * 1. Request permission (shown once)
 * 2. WebSocket receives alert event
 * 3. Service checks if tab is focused
 * 4. If background: show system notification
 * 5. If foreground: show in-app toast
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Reuse notification if tag exists
  requireInteraction?: boolean; // Keep on screen until user interacts
}

export class NotificationService {
  private static isSupported = typeof window !== 'undefined' && 'Notification' in window;
  private static permission: NotificationPermission | null = null;

  /**
   * Check if browser supports Notifications API
   */
  static isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Request notification permission (required before sending notifications)
   * @returns Promise<boolean> - true if permission granted
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notification API not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied by user');
      return false;
    }

    // Permission is 'default' - ask user
    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Send system notification
   * @param payload - Notification content
   */
  static async notify(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported) return;

    // Check if permission already granted
    if (Notification.permission !== 'granted') {
      const permitted = await this.requestPermission();
      if (!permitted) return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.svg',
        badge: payload.badge || '/icons/icon-192.svg',
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction ?? false,
      });

      // Handle click
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });

      // Auto-close after 5 seconds if not set to require interaction
      if (!payload.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send alert notification (helper for alert events)
   */
  static async notifyAlert(deviceId: string, alertType: string, severity: string): Promise<void> {
    const severityIcons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      warning: '🟡',
      low: '🟢',
    };

    const icon = severityIcons[severity] || '📢';

    await this.notify({
      title: `[${severity.toUpperCase()}] Alert`,
      body: `Device ${deviceId}: ${alertType} detected`,
      tag: `alert-${deviceId}-${alertType}`,
      requireInteraction: ['critical', 'high'].includes(severity),
    });
  }

  /**
   * Get current permission status
   */
  static getPermissionStatus(): NotificationPermission | 'not-supported' {
    if (!this.isSupported) return 'not-supported';
    return Notification.permission;
  }
}
