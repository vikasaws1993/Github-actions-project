import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { DailyHospitalUpdate, ShiftType, TodayShiftStatus } from '../types/sevakDailyUpdate.types';
import { sevakHospitalService } from './sevakHospitalService';

import { storage } from '../../shared/services/storage/storage';
import { APP_CONFIG } from '../../shared/constants/config';
import { UserProfile } from '../../shared/types/common.types';

const getStorageKey = async (): Promise<string> => {
  try {
    const user = await storage.getItem<UserProfile>(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
    if (user?.id) return `@arogyamitra_sevak_daily_updates_${user.id}`;
    if (user?.phoneNumber) return `@arogyamitra_sevak_daily_updates_${user.phoneNumber}`;
  } catch (_) {}
  return '@arogyamitra_sevak_daily_updates';
};

export const parseDateToYYYYMMDD = (input?: string | Date | null): string => {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Match ISO date start: 2026-09-23
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    // Try parsing as standard date
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }
  if (input instanceof Date && !isNaN(input.getTime())) {
    const yyyy = input.getFullYear();
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const dd = String(input.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

const getTodayDateString = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatTimeTo12Hour = (input?: Date | string | number | null): string => {
  if (!input) {
    const d = new Date();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Already in 12-hour format e.g. "10:04 AM" or "05:07 PM"
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
      return trimmed;
    }
    // In 24-hour format e.g. "17:07" or "09:30"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match24 && !trimmed.includes('-') && !trimmed.includes('/')) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
  }

  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const getCurrentShift = (): ShiftType => {
  const hour = new Date().getHours();
  // Before 2 PM (14:00) is morning shift, 2 PM and after is evening shift
  return hour < 14 ? 'morning' : 'evening';
};

const isSameDate = (dateStr1?: string, dateStr2?: string): boolean => {
  if (!dateStr1 || !dateStr2) return false;
  const clean1 = parseDateToYYYYMMDD(dateStr1);
  const clean2 = parseDateToYYYYMMDD(dateStr2);
  if (clean1 && clean2) {
    return clean1 === clean2;
  }
  return dateStr1.trim() === dateStr2.trim();
};

// In-Memory RAM Cache for Blazing Fast Shift Status (< 1ms)
let memoryDailyUpdates: DailyHospitalUpdate[] | null = null;
let lastDailyUpdatesTimestamp = 0;
const DAILY_CACHE_TTL_MS = 25000;

export const sevakDailyUpdateService = {
  /**
   * Clear all locally cached daily updates
   */
  async clearCache(): Promise<void> {
    try {
      memoryDailyUpdates = null;
      lastDailyUpdatesTimestamp = 0;
      const storageKey = await getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.removeItem('@arogyamitra_sevak_daily_updates');
    } catch (_) {}
  },

  /**
   * Retrieve all daily updates from backend (with instant RAM & local cache fallback)
   */
  async getAllUpdates(forceRefresh: boolean = false): Promise<DailyHospitalUpdate[]> {
    if (!forceRefresh && memoryDailyUpdates && Date.now() - lastDailyUpdatesTimestamp < DAILY_CACHE_TTL_MS) {
      return memoryDailyUpdates;
    }

    const storageKey = await getStorageKey();

    let localReports: DailyHospitalUpdate[] = [];
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        localReports = JSON.parse(raw);
        if (!memoryDailyUpdates && localReports.length > 0) {
          memoryDailyUpdates = localReports;
          lastDailyUpdatesTimestamp = Date.now();
        }
      }
    } catch (_) {}

    if (localReports.length > 0 && !forceRefresh) {
      // Revalidate in background
      this.fetchRemoteUpdates(storageKey).catch(() => {});
      return localReports;
    }

    const remote = await this.fetchRemoteUpdates(storageKey);
    return remote || localReports;
  },

  async fetchRemoteUpdates(storageKey: string): Promise<DailyHospitalUpdate[] | null> {
    try {
      const res = await apiClient.get('/daily-updates');
      if (res?.success && res?.data?.reports && Array.isArray(res.data.reports)) {
        const reports: DailyHospitalUpdate[] = res.data.reports.map((r: any) => {
          const shiftStr = String(r.shift || '').toLowerCase();
          const shiftLower: ShiftType =
            shiftStr.includes('evening') || shiftStr.includes('night')
              ? 'evening'
              : 'morning';

          // Extract actual report date correctly without timezone shift
          let formattedDate =
            parseDateToYYYYMMDD(r.reportDate) ||
            parseDateToYYYYMMDD(r.rawDate) ||
            parseDateToYYYYMMDD(r.createdAt) ||
            parseDateToYYYYMMDD(r.created_at) ||
            parseDateToYYYYMMDD(r.date);

          if (!formattedDate) {
            formattedDate = getTodayDateString();
          }

          let submittedTime =
            (r.submittedAt ? formatTimeTo12Hour(r.submittedAt) : '') ||
            (r.createdAt || r.created_at ? formatTimeTo12Hour(r.createdAt || r.created_at) : '') ||
            (r.date && r.date.includes(',') ? formatTimeTo12Hour(r.date.split(',')[1]?.trim()) : '') ||
            '';

          return {
            id: r.id || `upd-${formattedDate}-${shiftLower}`,
            hospitalId: res.data.hospitalId || r.hospital_id || 'HOSP-PUN-042',
            hospitalName: res.data.hospitalName || r.hospital_name || 'City Care Hospital',
            date: formattedDate,
            shift: shiftLower,
            submittedAt: submittedTime,
            reportingOfficer: r.submittedBy || r.reporting_officer_name || res.data.reportingOfficer || 'Arogya Sevak',
            availableIcuBeds: Number(r.icuAvailable ?? r.icu_available ?? 0),
            totalIcuBeds: Number(r.icuTotal ?? r.icu_total ?? 15),
            availableGeneralBeds: Number(r.generalAvailable ?? r.general_available ?? 0),
            totalGeneralBeds: Number(r.generalTotal ?? r.general_total ?? 85),
            availableNicuBeds: Number(r.nicuAvailable ?? r.nicu_available ?? 0),
            totalNicuBeds: Number(r.nicuTotal ?? r.nicu_total ?? 8),
            availablePicuBeds: Number(r.picuAvailable ?? r.picu_available ?? 0),
            totalPicuBeds: Number(r.picuTotal ?? r.picu_total ?? 6),
            availableIsolationBeds: Number(r.isolationAvailable ?? r.isolation_available ?? 0),
            totalIsolationBeds: Number(r.isolationTotal ?? r.isolation_total ?? 10),
            availableWards: Number(r.wardsAvailable ?? r.wards_available ?? 0),
            totalWards: Number(r.wardsTotal ?? r.wards_total ?? 10),
            admissionsToday: Number(r.myAdmissions ?? r.my_admissions ?? 0),
            doctorsOnDuty: Number(r.doctorsOnDuty ?? r.doctors_on_duty ?? 0),
            ventilatorsAvailable: Number(r.ventilators ?? r.ventilators_available ?? 0),
            oxygenBedsAvailable: Number(r.oxygenBeds ?? r.oxygen_beds_available ?? 0),
            dialysisMachinesFree: Number(r.dialysisUnits ?? r.dialysis_machines_free ?? 0),
            operationTheatresReady: Number(r.operationTheatres ?? r.active_operation_theatres ?? 0),
            opdDoctorRecords: Array.isArray(r.opdDoctorRecords) ? r.opdDoctorRecords : undefined,
            remarks: r.remarks || '',
          };
        });

        memoryDailyUpdates = reports;
        lastDailyUpdatesTimestamp = Date.now();
        await AsyncStorage.setItem(storageKey, JSON.stringify(reports));
        return reports;
      }
    } catch (e) {
      console.warn('[sevakDailyUpdateService] Remote fetch notice:', e);
    }
    return null;
  },

  async getTodayShiftStatus(forceRefresh: boolean = false): Promise<TodayShiftStatus> {
    const today = getTodayDateString();
    const all = await this.getAllUpdates(forceRefresh);

    const morning = all.find((u) => isSameDate(u.date, today) && u.shift === 'morning') || null;
    const evening = all.find((u) => isSameDate(u.date, today) && u.shift === 'evening') || null;
    const activeShift = getCurrentShift();

    return {
      morning,
      evening,
      activeShift,
    };
  },

  async getUpdateForShift(date: string, shift: ShiftType): Promise<DailyHospitalUpdate | null> {
    const all = await this.getAllUpdates();
    return all.find((u) => isSameDate(u.date, date) && u.shift === shift) || null;
  },

  /**
   * Submit daily update report to backend & cache locally
   */
  async saveDailyUpdate(data: Omit<DailyHospitalUpdate, 'id' | 'submittedAt'> & { id?: string; submittedAt?: string }): Promise<DailyHospitalUpdate> {
    const today = parseDateToYYYYMMDD(data.date) || getTodayDateString();
    const formattedTime = formatTimeTo12Hour();

    const newRecord: DailyHospitalUpdate = {
      ...data,
      id: data.id || `upd-${today}-${data.shift}-${Date.now()}`,
      date: today,
      submittedAt: formattedTime,
    };

    // Remote POST to backend
    try {
      await apiClient.post('/daily-updates', {
        reportDate: today,
        shift: data.shift === 'morning' ? 'Morning Shift' : 'Evening Shift',
        icuAvailable: data.availableIcuBeds,
        icuTotal: data.totalIcuBeds,
        generalAvailable: data.availableGeneralBeds,
        generalTotal: data.totalGeneralBeds,
        nicuAvailable: data.availableNicuBeds,
        nicuTotal: data.totalNicuBeds,
        picuAvailable: data.availablePicuBeds,
        picuTotal: data.totalPicuBeds,
        isolationAvailable: data.availableIsolationBeds,
        isolationTotal: data.totalIsolationBeds,
        wardsAvailable: data.availableWards,
        wardsTotal: data.totalWards,
        myAdmissions: data.admissionsToday,
        doctorsOnDuty: data.doctorsOnDuty,
        ventilators: data.ventilatorsAvailable,
        oxygenBeds: data.oxygenBedsAvailable,
        dialysisUnits: data.dialysisMachinesFree,
        operationTheatres: data.operationTheatresReady,
        opdDoctorRecords: data.opdDoctorRecords,
        remarks: data.remarks,
        reportingOfficerName: data.reportingOfficer,
      });
    } catch (apiErr) {
      console.warn('[sevakDailyUpdateService] Remote submission notice:', apiErr);
    }

    const all = await this.getAllUpdates();
    const existingIndex = all.findIndex((u) => isSameDate(u.date, today) && u.shift === data.shift);
    let updatedList: DailyHospitalUpdate[];
    if (existingIndex >= 0) {
      updatedList = [...all];
      updatedList[existingIndex] = newRecord;
    } else {
      updatedList = [newRecord, ...all];
    }

    const storageKey = await getStorageKey();
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));

    // Sync latest bed counts & critical resources back to hospital profile
    try {
      const hospProfile = await sevakHospitalService.getHospitalProfile();
      if (hospProfile) {
        const syncedProfile = {
          ...hospProfile,
          bedAvailability: {
            ...hospProfile.bedAvailability,
            availableIcuBeds: newRecord.availableIcuBeds,
            totalIcuBeds: newRecord.totalIcuBeds,
            availableHospitalBeds: newRecord.availableGeneralBeds,
            totalHospitalBeds: newRecord.totalGeneralBeds,
          },
          criticalResources: {
            ...hospProfile.criticalResources,
            ventilators: {
              ...hospProfile.criticalResources.ventilators,
              total: Math.max(hospProfile.criticalResources.ventilators?.total || 18, newRecord.ventilatorsAvailable),
            },
            oxygenBeds: {
              ...hospProfile.criticalResources.oxygenBeds,
              total: Math.max(hospProfile.criticalResources.oxygenBeds?.total || 120, newRecord.oxygenBedsAvailable),
            },
          },
          currentStatus: {
            ...hospProfile.currentStatus,
            sevakRemarks: newRecord.remarks || hospProfile.currentStatus?.sevakRemarks,
            lastUpdated: `${newRecord.date}, ${newRecord.submittedAt} (${newRecord.shift === 'morning' ? 'Morning' : 'Evening'} Shift)`,
          },
        };
        await sevakHospitalService.saveHospitalProfile(syncedProfile);
      }
    } catch (e) {
      console.warn('Failed to sync hospital profile with daily update', e);
    }

    return newRecord;
  },
};

