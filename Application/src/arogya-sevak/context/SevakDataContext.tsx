import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AllocatedPatientCase,
  HospitalFacilityProfile,
  EMPTY_HOSPITAL_SURVEY_PROFILE,
  sevakHospitalService,
} from '../services/sevakHospitalService';
import { sevakDailyUpdateService } from '../services/sevakDailyUpdateService';
import { TodayShiftStatus } from '../types/sevakDailyUpdate.types';
import { sevakOpdService } from '../services/sevakOpdService';
import { OpdVisitEntry, OpdStats } from '../types/sevakOpd.types';
import { sevakDoctorService } from '../services/sevakDoctorService';
import { DoctorStats } from '../types/sevakDoctor.types';
import { sevakNotificationService } from '../services/sevakNotificationService';
import { SevakNotification } from '../types/sevakNotification.types';
import { useAuth } from '../../shared/hooks/useAuth';

export interface SevakDataContextValue {
  // State
  allocatedCases: AllocatedPatientCase[];
  hospitalProfile: HospitalFacilityProfile;
  todayShiftStatus: TodayShiftStatus | null;
  opdVisits: OpdVisitEntry[];
  opdStats: OpdStats | null;
  doctorStats: DoctorStats | null;
  notifications: SevakNotification[];
  unreadNotifCount: number;
  urgentNotification: SevakNotification | null;

  // Hydration & Network Sync
  isHydrated: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number;

  // Sync methods
  refreshAll: (force?: boolean) => Promise<void>;
  refreshCases: (force?: boolean) => Promise<AllocatedPatientCase[]>;
  refreshShiftStatus: (force?: boolean) => Promise<TodayShiftStatus | null>;
  refreshOpd: (force?: boolean) => Promise<OpdVisitEntry[]>;
  refreshNotifications: (force?: boolean) => Promise<void>;
  getCaseById: (caseId: string) => AllocatedPatientCase | undefined;

  // Instant optimistic state mutations
  updateLocalCase: (caseItem: AllocatedPatientCase) => void;
  updateLocalShiftStatus: (status: TodayShiftStatus) => void;
  updateLocalOpdVisit: (visit: OpdVisitEntry) => void;
  markLocalNotificationRead: (id: string) => void;
  clearLocalSeenNotifications: () => void;
}

const SevakDataContext = createContext<SevakDataContextValue | undefined>(undefined);

export const SevakDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [allocatedCases, setAllocatedCases] = useState<AllocatedPatientCase[]>([]);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalFacilityProfile>(EMPTY_HOSPITAL_SURVEY_PROFILE);
  const [todayShiftStatus, setTodayShiftStatus] = useState<TodayShiftStatus | null>(null);
  const [opdVisits, setOpdVisits] = useState<OpdVisitEntry[]>([]);
  const [opdStats, setOpdStats] = useState<OpdStats | null>(null);
  const [doctorStats, setDoctorStats] = useState<DoctorStats | null>(null);
  const [notifications, setNotifications] = useState<SevakNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [urgentNotification, setUrgentNotification] = useState<SevakNotification | null>(null);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(0);

  const isSyncingRef = useRef(false);

  /**
   * 1. Initial Instant Hydration from RAM & AsyncStorage (resolves in < 5ms)
   */
  const hydrateFromCache = useCallback(async () => {
    try {
      const [cases, hosp, shift, opd, stats, docs, notifs] = await Promise.all([
        sevakHospitalService.getAllocatedCases(false),
        sevakHospitalService.getHospitalProfile(false),
        sevakDailyUpdateService.getTodayShiftStatus(false),
        sevakOpdService.getAllOpdVisits('ALL', '', false),
        sevakOpdService.getOpdStats(),
        sevakDoctorService.getDoctorStats(),
        sevakNotificationService.getNotifications({ limit: 15, forceRefresh: false }).catch(() => ({
          notifications: [],
          total: 0,
          unreadCount: 0,
        })),
      ]);

      if (cases && cases.length > 0) setAllocatedCases(cases);
      if (hosp) setHospitalProfile(hosp);
      if (shift) setTodayShiftStatus(shift);
      if (opd && opd.length > 0) setOpdVisits(opd);
      if (stats) setOpdStats(stats);
      if (docs) setDoctorStats(docs);

      if (notifs) {
        setNotifications(notifs.notifications || []);
        setUnreadNotifCount(notifs.unreadCount || 0);
        const urgent = notifs.notifications?.find(
          (n) => ['CRITICAL', 'HIGH'].includes(n.priority) && !n.is_read
        );
        setUrgentNotification(urgent || null);
      }
    } catch (err) {
      console.warn('[SevakDataProvider] Hydration notice:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  /**
   * 2. Smart Background Live Sync
   */
  const syncWithBackend = useCallback(async (force: boolean = false) => {
    if (isSyncingRef.current && !force) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const [cases, hosp, shift, opd, stats, docs, notifs] = await Promise.all([
        sevakHospitalService.getAllocatedCases(force),
        sevakHospitalService.getHospitalProfile(force),
        sevakDailyUpdateService.getTodayShiftStatus(force),
        sevakOpdService.getAllOpdVisits('ALL', '', force),
        sevakOpdService.getOpdStats(),
        sevakDoctorService.getDoctorStats(),
        sevakNotificationService.getNotifications({ limit: 15, forceRefresh: force }).catch(() => ({
          notifications: [],
          total: 0,
          unreadCount: 0,
        })),
      ]);

      setAllocatedCases(cases || []);
      if (hosp) setHospitalProfile(hosp);
      setTodayShiftStatus(shift || null);
      setOpdVisits(opd || []);
      setOpdStats(stats || null);
      setDoctorStats(docs || null);

      if (notifs) {
        setNotifications(notifs.notifications || []);
        setUnreadNotifCount(notifs.unreadCount || 0);
        const urgent = notifs.notifications?.find(
          (n) => ['CRITICAL', 'HIGH'].includes(n.priority) && !n.is_read
        );
        setUrgentNotification(urgent || null);
      }

      setLastSyncTimestamp(Date.now());
    } catch (err) {
      console.warn('[SevakDataProvider] Sync warning:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Boot up: Hydrate instantly on load, then synchronize in background
  useEffect(() => {
    let isMounted = true;

    hydrateFromCache().then(() => {
      if (isMounted) {
        syncWithBackend(false);
      }
    });

    // Real-Time Background Heartbeat (every 18 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        syncWithBackend(false);
      }
    }, 18000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hydrateFromCache, syncWithBackend, user]);

  /**
   * Refresh Helpers
   */
  const refreshAll = useCallback(async (force = true) => {
    await syncWithBackend(force);
  }, [syncWithBackend]);

  const refreshCases = useCallback(async (force = true) => {
    const updated = await sevakHospitalService.getAllocatedCases(force);
    setAllocatedCases(updated);
    return updated;
  }, []);

  const refreshShiftStatus = useCallback(async (force = true) => {
    const updated = await sevakDailyUpdateService.getTodayShiftStatus(force);
    setTodayShiftStatus(updated);
    return updated;
  }, []);

  const refreshOpd = useCallback(async (force = true) => {
    const [visits, stats] = await Promise.all([
      sevakOpdService.getAllOpdVisits('ALL', '', force),
      sevakOpdService.getOpdStats(),
    ]);
    setOpdVisits(visits);
    setOpdStats(stats);
    return visits;
  }, []);

  const refreshNotifications = useCallback(async (force = true) => {
    const notifs = await sevakNotificationService.getNotifications({ limit: 20, forceRefresh: force });
    setNotifications(notifs.notifications || []);
    setUnreadNotifCount(notifs.unreadCount || 0);
    const urgent = notifs.notifications?.find(
      (n) => ['CRITICAL', 'HIGH'].includes(n.priority) && !n.is_read
    );
    setUrgentNotification(urgent || null);
  }, []);

  const getCaseById = useCallback(
    (caseId: string) => {
      if (!caseId) return undefined;
      return allocatedCases.find(
        (c) => c.id.toLowerCase() === caseId.toLowerCase()
      );
    },
    [allocatedCases]
  );

  /**
   * Optimistic Immediate Mutations (0ms UI latency)
   */
  const updateLocalCase = useCallback((updatedCase: AllocatedPatientCase) => {
    setAllocatedCases((prev) => {
      const exists = prev.some((c) => c.id === updatedCase.id);
      if (exists) {
        return prev.map((c) => (c.id === updatedCase.id ? updatedCase : c));
      }
      return [updatedCase, ...prev];
    });
  }, []);

  const updateLocalShiftStatus = useCallback((status: TodayShiftStatus) => {
    setTodayShiftStatus(status);
  }, []);

  const updateLocalOpdVisit = useCallback((visit: OpdVisitEntry) => {
    setOpdVisits((prev) => [visit, ...prev.filter((v) => v.id !== visit.id)]);
    setOpdStats((prev) =>
      prev
        ? {
            ...prev,
            totalVisits: prev.totalVisits + 1,
            todayCount: prev.todayCount + 1,
          }
        : null
    );
  }, []);

  const markLocalNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    setUrgentNotification((prev) => (prev?.id === id ? null : prev));
  }, []);

  const clearLocalSeenNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    setUnreadNotifCount(0);
  }, []);

  const value: SevakDataContextValue = {
    allocatedCases,
    hospitalProfile,
    todayShiftStatus,
    opdVisits,
    opdStats,
    doctorStats,
    notifications,
    unreadNotifCount,
    urgentNotification,
    isHydrated,
    isSyncing,
    lastSyncTimestamp,
    refreshAll,
    refreshCases,
    refreshShiftStatus,
    refreshOpd,
    refreshNotifications,
    getCaseById,
    updateLocalCase,
    updateLocalShiftStatus,
    updateLocalOpdVisit,
    markLocalNotificationRead,
    clearLocalSeenNotifications,
  };

  return <SevakDataContext.Provider value={value}>{children}</SevakDataContext.Provider>;
};

export const useSevakData = (): SevakDataContextValue => {
  const context = useContext(SevakDataContext);
  if (!context) {
    throw new Error('useSevakData must be used within a SevakDataProvider');
  }
  return context;
};
