import { storage } from '../../shared/services/storage/storage';
import { APP_CONFIG } from '../../shared/constants/config';
import { SyncItem } from '../types/sevak.types';

export const offlineSyncService = {
  async getQueue(): Promise<SyncItem[]> {
    const queue = await storage.getItem<SyncItem[]>(APP_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
    return queue || [];
  },

  async enqueue(item: Omit<SyncItem, 'id' | 'timestamp' | 'status'>): Promise<void> {
    const queue = await this.getQueue();
    const newItem: SyncItem = {
      ...item,
      id: `sync-${Date.now()}`,
      timestamp: 'Just now',
      status: 'PENDING',
    };
    queue.push(newItem);
    await storage.setItem(APP_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, queue);
  },

  async syncAll(): Promise<{ syncedCount: number }> {
    const queue = await this.getQueue();
    const count = queue.length;
    // Simulate sync upload
    await storage.removeItem(APP_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
    return { syncedCount: count };
  },
};
