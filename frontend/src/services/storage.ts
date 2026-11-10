/**
 * Local Storage Service
 * Provides persistent storage for settings, notifications, and reports
 */

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultResolution: number;
  defaultCloudCover: number;
  mapProvider: 'cesium' | 'openstreetmap';
  autoSaveReports: boolean;
  notificationsEnabled: boolean;
  showWelcomeMessage: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface SavedReport {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  analysisDate: string;
  createdAt: string;
  comparisonId?: string;
  earlierDate?: string;
  laterDate?: string;
  ndviMean?: number;
  changeDetected?: boolean;
  landCoverClasses?: any[];
  status: 'completed' | 'failed';
}

class StorageService {
  private readonly SETTINGS_KEY = 'ecosense_settings';
  private readonly NOTIFICATIONS_KEY = 'ecosense_notifications';
  private readonly REPORTS_KEY = 'ecosense_reports';

  // Settings
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[Storage] Failed to load settings:', error);
    }
    return this.getDefaultSettings();
  }

  saveSettings(settings: Partial<AppSettings>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[Storage] Failed to save settings:', error);
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      theme: 'dark',
      defaultResolution: 10,
      defaultCloudCover: 20,
      mapProvider: 'cesium',
      autoSaveReports: true,
      notificationsEnabled: true,
      showWelcomeMessage: true
    };
  }

  // Notifications
  getNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem(this.NOTIFICATIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Storage] Failed to load notifications:', error);
    }
    return [];
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    try {
      const notifications = this.getNotifications();
      const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifications.unshift(newNotification);

      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }

      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('[Storage] Failed to add notification:', error);
    }
  }

  markNotificationRead(id: string): void {
    try {
      const notifications = this.getNotifications();
      const notification = notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
      }
    } catch (error) {
      console.error('[Storage] Failed to mark notification as read:', error);
    }
  }

  markAllNotificationsRead(): void {
    try {
      const notifications = this.getNotifications();
      notifications.forEach(n => n.read = true);
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('[Storage] Failed to mark all notifications as read:', error);
    }
  }

  clearNotifications(): void {
    try {
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('[Storage] Failed to clear notifications:', error);
    }
  }

  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.read).length;
  }

  // Reports
  getReports(): SavedReport[] {
    try {
      const stored = localStorage.getItem(this.REPORTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Storage] Failed to load reports:', error);
    }
    return [];
  }

  saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>): SavedReport {
    try {
      const reports = this.getReports();
      const newReport: SavedReport = {
        ...report,
        id: `report_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        createdAt: new Date().toISOString()
      };
      reports.unshift(newReport);

      // Keep only last 100 reports
      if (reports.length > 100) {
        reports.splice(100);
      }

      localStorage.setItem(this.REPORTS_KEY, JSON.stringify(reports));
      return newReport;
    } catch (error) {
      console.error('[Storage] Failed to save report:', error);
      throw error;
    }
  }

  getReport(id: string): SavedReport | null {
    const reports = this.getReports();
    return reports.find(r => r.id === id) || null;
  }

  deleteReport(id: string): void {
    try {
      const reports = this.getReports();
      const filtered = reports.filter(r => r.id !== id);
      localStorage.setItem(this.REPORTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[Storage] Failed to delete report:', error);
    }
  }

  searchReports(query: string): SavedReport[] {
    const reports = this.getReports();
    const lowerQuery = query.toLowerCase();
    return reports.filter(r =>
      r.locationName.toLowerCase().includes(lowerQuery) ||
      r.id.toLowerCase().includes(lowerQuery)
    );
  }

  // Storage info
  getStorageInfo(): { used: number; available: number } {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      // LocalStorage limit is typically 5-10MB, assume 5MB
      const available = 5 * 1024 * 1024;
      return { used, available };
    } catch (error) {
      return { used: 0, available: 5 * 1024 * 1024 };
    }
  }
}

export const storageService = new StorageService();
