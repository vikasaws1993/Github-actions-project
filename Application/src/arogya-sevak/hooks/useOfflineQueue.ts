import { useState, useEffect } from 'react';
import { SyncItem } from '../types/sevak.types';
import { offlineSyncService } from '../services/offlineSyncService';

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    refreshQueue();
  }, []);

  const refreshQueue = async () => {
    const items = await offlineSyncService.getQueue();
    setQueue(items);
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await offlineSyncService.syncAll();
      await refreshQueue();
    } finally {
      setSyncing(false);
    }
  };

  return { queue, pendingCount: queue.length, syncing, triggerSync, refreshQueue };
};
