import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { SevakNotification } from '../types/sevakNotification.types';
// eslint-disable-next-line no-restricted-imports
import { notificationService } from '../../citizen/services/notificationService';

const SEVAK_NOTIFICATIONS_STORAGE_KEY = '@arogya_sevak_notifications_v2';
const SEVAK_NOTIFICATIONS_READ_IDS_KEY = '@arogya_sevak_notifications_read_ids_v2';
const SEVAK_NOTIFICATIONS_CLEARED_IDS_KEY = '@arogya_sevak_notifications_cleared_ids_v2';
const SEVAK_NOTIFICATIONS_INITIALIZED_KEY = '@arogya_sevak_notifications_init_v2';

const DEFAULT_FALLBACK_NOTIFICATIONS: SevakNotification[] = [];

// In-Memory RAM Cache
let memoryNotifications: {
  notifications: SevakNotification[];
  total: number;
  unreadCount: number;
} | null = null;
let memoryNotificationsTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

class SevakNotificationService {
  /**
   * Get all notifications for the currently logged in Sevak with instant RAM response
   */
  async getNotifications(params?: { limit?: number; offset?: number; forceRefresh?: boolean }): Promise<{
    notifications: SevakNotification[];
    total: number;
    unreadCount: number;
  }> {
    const isBasicQuery = (!params?.limit || params.limit <= 20) && !params?.offset;

    if (!params?.forceRefresh && isBasicQuery && memoryNotifications && Date.now() - memoryNotificationsTimestamp < CACHE_TTL_MS) {
      return memoryNotifications;
    }

    const readIds = await this.getLocalReadIds();
    const clearedIds = await this.getLocalClearedIds();

    try {
      const qParams: string[] = [];
      if (params?.limit !== undefined) qParams.push(`limit=${encodeURIComponent(params.limit)}`);
      if (params?.offset !== undefined) qParams.push(`offset=${encodeURIComponent(params.offset)}`);
      const endpoint = `/arogya-sevaks/notifications${qParams.length ? `?${qParams.join('&')}` : ''}`;

      const res = await apiClient.get(endpoint);
      const isSuccess = res?.success !== false && (res?.statusCode === 200 || res?.success === true);

      let rawList: SevakNotification[] = [];
      if (Array.isArray(res?.data?.notifications)) {
        rawList = res.data.notifications;
      } else if (Array.isArray(res?.data?.data?.notifications)) {
        rawList = res.data.data.notifications;
      } else if (Array.isArray(res?.data)) {
        rawList = res.data;
      } else if (Array.isArray(res?.notifications)) {
        rawList = res.notifications;
      }

      if (isSuccess && Array.isArray(rawList) && rawList.length > 0) {
        // Filter out cleared notifications and apply read status
        const activeList = rawList
          .filter((n) => !clearedIds.has(n.id))
          .map((n) => ({
            ...n,
            is_read: Boolean(n.is_read || readIds.has(n.id)),
          }));

        await this.cacheNotificationsLocally(activeList);
        await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_INITIALIZED_KEY, 'true');

        // Fire Android push notifications for any unread alerts!
        for (const notif of activeList) {
          if (!notif.is_read) {
            const notifTitle = notif.title_mr || notif.title || notif.title_en || 'ArogyaMitra Alert';
            const notifMsg = notif.message_mr || notif.message || notif.message_en || '';
            notificationService.showNewAlertNotification(
              notif.id,
              notifTitle,
              notifMsg,
              notif.case_id || undefined,
              notif.type || undefined
            ).catch(() => {});
          }
        }

        const unreadCount = activeList.filter((n) => !n.is_read).length;
        const result = {
          notifications: activeList,
          total: activeList.length,
          unreadCount,
        };
        memoryNotifications = result;
        memoryNotificationsTimestamp = Date.now();
        return result;
      } else if (isSuccess && Array.isArray(rawList) && rawList.length === 0) {
        const isInit = await AsyncStorage.getItem(SEVAK_NOTIFICATIONS_INITIALIZED_KEY);
        if (isInit) {
          const result = {
            notifications: [],
            total: 0,
            unreadCount: 0,
          };
          memoryNotifications = result;
          memoryNotificationsTimestamp = Date.now();
          return result;
        }
      }
    } catch (err) {
      console.warn('[SevakNotificationService] API fetch failed, loading local/fallback cache:', err);
    }

    // Offline / fallback cache
    const isInitialized = await AsyncStorage.getItem(SEVAK_NOTIFICATIONS_INITIALIZED_KEY);
    let cached = await this.getCachedNotifications();

    if (!isInitialized && cached.length === 0) {
      // First time initial seed
      cached = DEFAULT_FALLBACK_NOTIFICATIONS;
      await this.cacheNotificationsLocally(cached);
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_INITIALIZED_KEY, 'true');
    }

    const filtered = cached
      .filter((n) => !clearedIds.has(n.id))
      .map((n) => ({
        ...n,
        is_read: n.is_read || readIds.has(n.id),
      }));

    const result = {
      notifications: filtered,
      total: filtered.length,
      unreadCount: filtered.filter((n) => !n.is_read).length,
    };
    memoryNotifications = result;
    memoryNotificationsTimestamp = Date.now();
    return result;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { unreadCount } = await this.getNotifications({ limit: 100 });
      return unreadCount;
    } catch (_) {
      return 0;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await this.addLocalReadId(notificationId);

      // Update in local cache
      const cached = await this.getCachedNotifications();
      const updated = cached.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      await this.cacheNotificationsLocally(updated);

      if (memoryNotifications) {
        memoryNotifications = {
          ...memoryNotifications,
          notifications: memoryNotifications.notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, memoryNotifications.unreadCount - 1),
        };
        memoryNotificationsTimestamp = Date.now();
      }

      await apiClient.patch(`/arogya-sevaks/notifications/${encodeURIComponent(notificationId)}/read`).catch(() => {});
      return true;
    } catch (err) {
      console.warn('[SevakNotificationService] markAsRead warning:', err);
      return true;
    }
  }

  /**
   * Mark all notifications as read for Sevak
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const cached = await this.getCachedNotifications();
      const ids = cached.map((n) => n.id);
      await this.addLocalReadIds(ids);

      const updated = cached.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      await this.cacheNotificationsLocally(updated);

      if (memoryNotifications) {
        memoryNotifications = {
          ...memoryNotifications,
          notifications: memoryNotifications.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })),
          unreadCount: 0,
        };
        memoryNotificationsTimestamp = Date.now();
      }

      await apiClient.patch('/arogya-sevaks/notifications/read-all').catch(() => {});
      return true;
    } catch (err) {
      console.warn('[SevakNotificationService] markAllAsRead warning:', err);
      return true;
    }
  }

  /**
   * Clear / purge all seen (read) notifications
   */
  async clearSeenNotifications(): Promise<boolean> {
    try {
      const cached = await this.getCachedNotifications();
      const readIds = await this.getLocalReadIds();

      // Find all notifications that are read
      const seenIds: string[] = [];
      const unreadList: SevakNotification[] = [];

      cached.forEach((n) => {
        if (n.is_read || readIds.has(n.id)) {
          seenIds.push(n.id);
        } else {
          unreadList.push(n);
        }
      });

      // Track all cleared notification IDs permanently so they never reappear
      await this.addLocalClearedIds(seenIds);

      // Save only unread list to local cache
      await this.cacheNotificationsLocally(unreadList);
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_INITIALIZED_KEY, 'true');

      memoryNotifications = {
        notifications: unreadList,
        total: unreadList.length,
        unreadCount: unreadList.length,
      };
      memoryNotificationsTimestamp = Date.now();

      await apiClient.delete('/arogya-sevaks/notifications/seen').catch(() => {});
      return true;
    } catch (err) {
      console.warn('[SevakNotificationService] clearSeenNotifications warning:', err);
      return true;
    }
  }

  // --- Local Cache Helpers ---
  private async getLocalReadIds(): Promise<Set<string>> {
    try {
      const data = await AsyncStorage.getItem(SEVAK_NOTIFICATIONS_READ_IDS_KEY);
      if (data) {
        const arr = JSON.parse(data);
        return new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (_) {}
    return new Set();
  }

  private async addLocalReadId(id: string): Promise<void> {
    try {
      const set = await this.getLocalReadIds();
      set.add(id);
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_READ_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }

  private async addLocalReadIds(ids: string[]): Promise<void> {
    try {
      const set = await this.getLocalReadIds();
      ids.forEach((id) => set.add(id));
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_READ_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }

  private async getLocalClearedIds(): Promise<Set<string>> {
    try {
      const data = await AsyncStorage.getItem(SEVAK_NOTIFICATIONS_CLEARED_IDS_KEY);
      if (data) {
        const arr = JSON.parse(data);
        return new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (_) {}
    return new Set();
  }

  private async addLocalClearedIds(ids: string[]): Promise<void> {
    try {
      const set = await this.getLocalClearedIds();
      ids.forEach((id) => set.add(id));
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_CLEARED_IDS_KEY, JSON.stringify(Array.from(set)));
    } catch (_) {}
  }

  private async getCachedNotifications(): Promise<SevakNotification[]> {
    try {
      const data = await AsyncStorage.getItem(SEVAK_NOTIFICATIONS_STORAGE_KEY);
      if (data) {
        const arr = JSON.parse(data);
        if (Array.isArray(arr)) return arr;
      }
    } catch (_) {}
    return [];
  }

  private async cacheNotificationsLocally(list: SevakNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SEVAK_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }
}

export const sevakNotificationService = new SevakNotificationService();
export default sevakNotificationService;
