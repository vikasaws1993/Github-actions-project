/**
 * Doctor Service Layer
 * Connects frontend Doctor Management & Duty Roster to the Backend REST APIs.
 */

import api from './api';

export const STANDARD_SPECIALIZATIONS = [
  'General Medicine',
  'General Surgery',
  'Obstetrics & Gynecology',
  'Pediatrics',
  'Orthopedics',
  'Cardiology',
  'Neurology & Neurosurgery',
  'Nephrology & Dialysis',
  'Emergency & Trauma',
  'Dermatology',
  'Ophthalmology (Eye)',
  'ENT',
  'Psychiatry',
  'Pulmonology',
];

export const SHIFT_OPTIONS = [
  {
    shift: 'Morning',
    label: 'Morning Shift',
    defaultTiming: 'Morning 8:00 AM - 12:00 PM',
    timeBadge: '08:00',
    startTime: '08:00',
    endTime: '12:00',
    badgeBg: '#dcfce7',
    badgeColor: '#16a34a',
  },
  {
    shift: 'Evening',
    label: 'Evening Shift',
    defaultTiming: 'Evening 4:00 PM - 8:00 PM',
    timeBadge: 'Pending',
    startTime: '16:00',
    endTime: '20:00',
    badgeBg: '#fef3c7',
    badgeColor: '#d97706',
  },
  {
    shift: 'Afternoon',
    label: 'Afternoon Shift',
    defaultTiming: 'Afternoon 1:00 PM - 4:00 PM',
    timeBadge: '13:00',
    startTime: '13:00',
    endTime: '16:00',
    badgeBg: '#e0f2fe',
    badgeColor: '#0284c7',
  },
  {
    shift: 'Full Day',
    label: 'Full Day Shift',
    defaultTiming: '9:00 AM - 5:00 PM',
    timeBadge: '09:00',
    startTime: '09:00',
    endTime: '17:00',
    badgeBg: '#f3e8ff',
    badgeColor: '#9333ea',
  },
];

export const AVAILABILITY_CONFIG = {
  Available: {
    label: 'Available',
    bg: '#DCFCE7',
    text: '#16A34A',
    border: '#86EFAC',
    dot: '#22C55E',
  },
  'On Leave': {
    label: 'On Leave',
    bg: '#FEF3C7',
    text: '#D97706',
    border: '#FDE68A',
    dot: '#F59E0B',
  },
  'In Surgery': {
    label: 'In Surgery',
    bg: '#F3E8FF',
    text: '#9333EA',
    border: '#D8B4FE',
    dot: '#A855F7',
  },
  'Emergency Duty': {
    label: 'Emergency Duty',
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FCA5A5',
    dot: '#EF4444',
  },
  Unavailable: {
    label: 'Unavailable',
    bg: '#F1F5F9',
    text: '#64748B',
    border: '#CBD5E1',
    dot: '#94A3B8',
  },
};

const DOCTORS_STORAGE_KEY = 'arogyamitra_doctors_cache';
let _cachedDoctors = null;
let _cachedDoctorsTimestamp = 0;
let _inFlightDoctorsPromise = null;
const DOCTORS_CACHE_TTL_MS = 25000; // 25s TTL

function getStoredDoctors() {
  try {
    const data = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function saveStoredDoctors(list) {
  _cachedDoctors = list;
  _cachedDoctorsTimestamp = Date.now();
  try {
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

class DoctorService {
  invalidateCache() {
    _cachedDoctors = null;
    _cachedDoctorsTimestamp = 0;
    _inFlightDoctorsPromise = null;
  }

  getCachedDoctors() {
    if (_cachedDoctors && Array.isArray(_cachedDoctors) && _cachedDoctors.length > 0) {
      return _cachedDoctors;
    }
    return getStoredDoctors();
  }

  /**
   * 1) GET /api/doctors
   * Fetch all doctors with optional filters and search
   */
  async getDoctors(filters = {}, options = {}) {
    const forceRefresh = options === true || options?.forceRefresh === true;
    const isFiltered = Boolean(filters.search || filters.hospitalId || (filters.doctorType && filters.doctorType !== 'All') || (filters.availabilityStatus && filters.availabilityStatus !== 'All') || filters.isActive !== undefined);

    if (!isFiltered && !forceRefresh && _cachedDoctors && (Date.now() - _cachedDoctorsTimestamp < DOCTORS_CACHE_TTL_MS)) {
      return _cachedDoctors;
    }

    if (!isFiltered && _inFlightDoctorsPromise && !forceRefresh) {
      return _inFlightDoctorsPromise;
    }

    const fetchPromise = (async () => {
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.hospitalId) queryParams.append('hospitalId', filters.hospitalId);
        if (filters.doctorType && filters.doctorType !== 'All') queryParams.append('doctorType', filters.doctorType);
        if (filters.availabilityStatus && filters.availabilityStatus !== 'All') {
          queryParams.append('availabilityStatus', filters.availabilityStatus);
        }
        if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive);

        const qs = queryParams.toString();
        const endpoint = qs ? `/doctors?${qs}` : '/doctors';
        const response = await api.get(endpoint);

        let list = [];
        if (response?.data?.doctors) {
          list = response.data.doctors;
        } else if (Array.isArray(response?.data)) {
          list = response.data;
        }

        if (Array.isArray(list)) {
          if (!isFiltered) {
            saveStoredDoctors(list);
          }
          return list;
        }
        return getStoredDoctors();
      } catch (error) {
        console.warn('DoctorService.getDoctors notice, using local cache:', error.message);
        return getStoredDoctors();
      }
    })().finally(() => {
      if (!isFiltered) {
        _inFlightDoctorsPromise = null;
      }
    });

    if (!isFiltered) {
      _inFlightDoctorsPromise = fetchPromise;
    }

    return fetchPromise;
  }

  /**
   * 2) GET /api/doctors/stats
   * Fetch dynamic roster statistics
   */
  async getStats(hospitalId) {
    try {
      const endpoint = hospitalId ? `/doctors/stats?hospitalId=${encodeURIComponent(hospitalId)}` : '/doctors/stats';
      const response = await api.get(endpoint);
      if (response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('DoctorService.getStats failed:', error);
      return null;
    }
  }

  /**
   * 3) POST /api/doctors
   * Add a new doctor
   */
  async addDoctor(doctorData) {
    try {
      const response = await api.post('/doctors', doctorData);
      return response?.data || response;
    } catch (error) {
      console.error('DoctorService.addDoctor failed:', error);
      throw error;
    }
  }

  /**
   * 4) PUT /api/doctors/:id
   * Update existing doctor profile or duty schedule
   */
  async updateDoctor(id, patch) {
    try {
      const response = await api.put(`/doctors/${id}`, patch);
      return response?.data || response;
    } catch (error) {
      console.error(`DoctorService.updateDoctor(${id}) failed:`, error);
      throw error;
    }
  }

  /**
   * 5) PATCH /api/doctors/:id/availability
   * 1-click update of doctor availability status
   */
  async setDoctorAvailability(id, status) {
    try {
      const response = await api.patch(`/doctors/${id}/availability`, { availabilityStatus: status });
      return response?.data || response;
    } catch (error) {
      console.error(`DoctorService.setDoctorAvailability(${id}) failed:`, error);
      throw error;
    }
  }

  /**
   * 6) PATCH /api/doctors/:id/toggle-status
   * Toggle doctor active / deactivated status
   */
  async toggleDoctorActive(id) {
    try {
      const response = await api.patch(`/doctors/${id}/toggle-status`, {});
      return response?.data || response;
    } catch (error) {
      console.error(`DoctorService.toggleDoctorActive(${id}) failed:`, error);
      throw error;
    }
  }

  /**
   * 7) DELETE /api/doctors/:id
   * Delete doctor record
   */
  async deleteDoctor(id) {
    try {
      const response = await api.delete(`/doctors/${id}`);
      return response?.data || response;
    } catch (error) {
      console.error(`DoctorService.deleteDoctor(${id}) failed:`, error);
      throw error;
    }
  }
}

export const doctorService = new DoctorService();
export default doctorService;
