import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import {
  HospitalDoctor,
  DoctorStats,
  DoctorAvailabilityStatus,
} from '../types/sevakDoctor.types';

const STORAGE_KEY = '@arogyamitra_sevak_hospital_doctors';

const normalizeDoctor = (d: any): HospitalDoctor => {
  const rawPhone = d.contactPhone || d.contactNumber || d.contact_number || d.phone || '';
  let formattedPhone = rawPhone;
  if (rawPhone && rawPhone !== '—') {
    const digits = rawPhone.replace(/\D/g, '');
    const clean10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
    if (clean10.length === 10) {
      formattedPhone = `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`;
    }
  }

  const rawAddr = d.personalAddress || d.personal_address || {};
  return {
    id: String(d.id || d.uuid || `doc-${Date.now()}`),
    hospitalId: d.hospitalId || d.hospital_id || 'HOSP-PUN-042',
    name: d.name || d.full_name || 'Doctor',
    qualification: d.qualification || 'MBBS',
    specialization: d.specialization || 'General Medicine',
    doctorType: (d.doctorType || d.doctor_type || 'OPD') as any,
    opdShift: (d.opdShift || d.opd_shift || 'Morning') as any,
    opdTiming: d.opdTiming || d.opd_timing || 'Morning 8:00 AM - 12:00 PM',
    availabilityStatus: (d.availabilityStatus || d.availability_status || 'Available') as any,
    contactPhone: formattedPhone || '—',
    personalAddress: {
      villageCity: rawAddr.villageCity || d.address_village_city || 'Pune',
      taluka: rawAddr.taluka || d.address_taluka || 'Haveli',
      district: rawAddr.district || d.address_district || 'Pune',
      pincode: rawAddr.pincode || d.address_pincode || '',
    },
    isActive: d.isActive !== undefined ? Boolean(d.isActive) : (d.is_active !== undefined ? Boolean(d.is_active) : true),
    deactivationReason: d.deactivationReason || d.deactivation_reason,
    joinedDate: d.joiningDate || d.joinedDate || d.joining_date || '2024',
    lastUpdated: 'Today',
  };
};

export const INITIAL_HOSPITAL_DOCTORS: HospitalDoctor[] = [];

let memoryDoctors: HospitalDoctor[] | null = null;
let lastDoctorsTimestamp = 0;
const DOCTORS_CACHE_TTL_MS = 30000;

class SevakDoctorService {
  /**
   * Fetch doctors list from backend (with instant RAM & offline cache fallback)
   */
  async getDoctors(hospitalId?: string, forceRefresh: boolean = false): Promise<HospitalDoctor[]> {
    if (!forceRefresh && memoryDoctors && Date.now() - lastDoctorsTimestamp < DOCTORS_CACHE_TTL_MS) {
      return hospitalId ? memoryDoctors.filter((d: HospitalDoctor) => d.hospitalId === hospitalId) : memoryDoctors;
    }

    let localList: HospitalDoctor[] = [];
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        localList = JSON.parse(json);
        if (!memoryDoctors && localList.length > 0) {
          memoryDoctors = localList;
          lastDoctorsTimestamp = Date.now();
        }
      }
    } catch (_) {}

    if (localList.length > 0 && !forceRefresh) {
      this.fetchRemoteDoctors(hospitalId).catch(() => {});
      return hospitalId ? localList.filter((d) => d.hospitalId === hospitalId) : localList;
    }

    const remote = await this.fetchRemoteDoctors(hospitalId);
    return remote || localList;
  }

  async fetchRemoteDoctors(hospitalId?: string): Promise<HospitalDoctor[] | null> {
    try {
      const endpoint = hospitalId ? `/doctors?hospitalId=${encodeURIComponent(hospitalId)}` : '/doctors';
      const res = await apiClient.get(endpoint);
      if (res?.success && (res?.data?.doctors || Array.isArray(res?.data))) {
        const rawList = res?.data?.doctors || res?.data;
        const normalized = rawList.map(normalizeDoctor);
        if (normalized.length > 0) {
          memoryDoctors = normalized;
          lastDoctorsTimestamp = Date.now();
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          return hospitalId ? normalized.filter((d: HospitalDoctor) => d.hospitalId === hospitalId) : normalized;
        }
      }
    } catch (e) {
      console.warn('[sevakDoctorService] Remote doctor fetch notice:', e);
    }
    return null;
  }

  /**
   * Fetch roster KPI stats from backend
   */
  async getDoctorStats(hospitalId?: string): Promise<DoctorStats> {
    try {
      const endpoint = hospitalId ? `/doctors/stats?hospitalId=${encodeURIComponent(hospitalId)}` : '/doctors/stats';
      const res = await apiClient.get(endpoint);
      if (res?.success && res?.data) {
        const d = res.data;
        const totalActive = Number(d.active ?? d.total ?? d.total_active ?? 0);
        return {
          total: Number(d.totalAll ?? d.total_all ?? d.total ?? totalActive),
          active: totalActive,
          availableNow: Number(d.availableNow ?? d.available ?? d.available_now ?? 0),
          opdCount: Number(d.opdCount ?? d.opdDoctors ?? d.opd_doctors ?? 0),
          ipdCount: Number(d.ipdCount ?? d.ipdDoctors ?? d.ipd_doctors ?? 0),
          onLeave: Number(d.onLeave ?? d.on_leave ?? 0),
          deactivated: Number(d.deactivated ?? d.total_deactivated ?? 0),
        };
      }
    } catch (_) {}

    const doctors = await this.getDoctors(hospitalId);
    const active = doctors.filter((d) => d.isActive);
    return {
      total: doctors.length,
      active: active.length,
      availableNow: active.filter((d) => d.availabilityStatus === 'Available').length,
      opdCount: active.filter((d) => d.doctorType === 'OPD' || d.doctorType === 'Both').length,
      ipdCount: active.filter((d) => d.doctorType === 'IPD' || d.doctorType === 'Both').length,
      onLeave: active.filter((d) => d.availabilityStatus === 'On Leave').length,
      deactivated: doctors.filter((d) => !d.isActive).length,
    };
  }

  async addDoctor(data: Omit<HospitalDoctor, 'id'>): Promise<HospitalDoctor> {
    try {
      const res = await apiClient.post('/doctors', {
        name: data.name,
        qualification: data.qualification,
        specialization: data.specialization,
        doctorType: data.doctorType,
        opdShift: data.opdShift,
        opdTiming: data.opdTiming,
        availabilityStatus: data.availabilityStatus,
        contactPhone: data.contactPhone,
        contactNumber: data.contactPhone,
        phone: data.contactPhone,
        personalAddress: data.personalAddress,
        villageCity: data.personalAddress?.villageCity,
        taluka: data.personalAddress?.taluka,
        district: data.personalAddress?.district,
        pincode: data.personalAddress?.pincode,
        hospitalId: data.hospitalId,
      });
      if (res?.success && res?.data) {
        const created = normalizeDoctor(res.data);
        const doctors = await this.getDoctors();
        const updated = [created, ...doctors.filter((d) => d.id !== created.id)];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return created;
      }
      if (res?.data && (res.data.id || res.data.name)) {
        const created = normalizeDoctor(res.data);
        const doctors = await this.getDoctors();
        const updated = [created, ...doctors.filter((d) => d.id !== created.id)];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return created;
      }
    } catch (apiErr: any) {
      console.warn('[sevakDoctorService] Remote doctor creation notice:', apiErr);
      const errorMsg = apiErr?.response?.data?.message || apiErr?.message;
      if (errorMsg && !errorMsg.includes('Network') && !errorMsg.includes('fetch')) {
        throw new Error(errorMsg);
      }
    }

    const doctors = await this.getDoctors();
    const newDoctor: HospitalDoctor = {
      ...data,
      id: `doc-${Date.now()}`,
      isActive: true,
      lastUpdated: 'Just now',
      joinedDate: 'Today',
    };
    const updated = [newDoctor, ...doctors];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newDoctor;
  }

  async updateDoctor(id: string, updates: Partial<HospitalDoctor>): Promise<HospitalDoctor> {
    try {
      await apiClient.put(`/doctors/${encodeURIComponent(id)}`, {
        name: updates.name,
        qualification: updates.qualification,
        specialization: updates.specialization,
        doctorType: updates.doctorType,
        opdShift: updates.opdShift,
        opdTiming: updates.opdTiming,
        availabilityStatus: updates.availabilityStatus,
        contactPhone: updates.contactPhone,
        contactNumber: updates.contactPhone,
        phone: updates.contactPhone,
        personalAddress: updates.personalAddress,
        villageCity: updates.personalAddress?.villageCity,
        taluka: updates.personalAddress?.taluka,
        district: updates.personalAddress?.district,
        pincode: updates.personalAddress?.pincode,
        isActive: updates.isActive,
      });
    } catch (apiErr) {
      console.warn('[sevakDoctorService] Remote doctor update notice:', apiErr);
    }

    const doctors = await this.getDoctors();
    const index = doctors.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Doctor with ID ${id} not found`);
    }
    const updatedDoctor: HospitalDoctor = {
      ...doctors[index],
      ...updates,
      lastUpdated: 'Just now',
    };
    doctors[index] = updatedDoctor;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
    return updatedDoctor;
  }

  async setDoctorAvailability(
    id: string,
    status: DoctorAvailabilityStatus
  ): Promise<HospitalDoctor> {
    try {
      await apiClient.patch(`/doctors/${encodeURIComponent(id)}/availability`, {
        availabilityStatus: status,
      });
    } catch (apiErr) {
      console.warn('[sevakDoctorService] Remote doctor availability update notice:', apiErr);
    }

    return this.updateDoctor(id, { availabilityStatus: status });
  }

  async toggleDoctorActive(id: string, reason?: string): Promise<HospitalDoctor> {
    try {
      const res = await apiClient.patch(`/doctors/${encodeURIComponent(id)}/toggle-status`, {
        deactivationReason: reason,
      });
      if (res?.success && res?.data) {
        const normalized = normalizeDoctor(res.data);
        const doctors = await this.getDoctors();
        const updated = doctors.map((d) => (d.id === id ? normalized : d));
        memoryDoctors = updated;
        lastDoctorsTimestamp = Date.now();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return normalized;
      }
    } catch (apiErr: any) {
      console.warn('[sevakDoctorService] Remote doctor toggle notice:', apiErr);
      const errorMsg = apiErr?.response?.data?.message || apiErr?.message;
      if (errorMsg && !errorMsg.includes('Network') && !errorMsg.includes('fetch')) {
        throw new Error(errorMsg);
      }
    }

    const doctors = await this.getDoctors();
    const target = doctors.find((d) => d.id === id);
    if (!target) throw new Error(`Doctor with ID ${id} not found`);

    const nextActive = !target.isActive;
    const updatedDoctor: HospitalDoctor = {
      ...target,
      isActive: nextActive,
      deactivationReason: nextActive ? undefined : (reason || 'No longer part of this hospital'),
      lastUpdated: 'Just now',
    };
    const updated = doctors.map((d) => (d.id === id ? updatedDoctor : d));
    memoryDoctors = updated;
    lastDoctorsTimestamp = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updatedDoctor;
  }

  async resetDoctorsToDefault(): Promise<HospitalDoctor[]> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export const sevakDoctorService = new SevakDoctorService();

