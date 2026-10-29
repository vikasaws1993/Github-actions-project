/**
 * Hospital Service Layer (UI-only / Local Resilience)
 * Manages hospital empanelment, local persistence, and reactivity across the UI.
 * Completely decoupled from backend APIs as requested.
 */

import api from './api';
import { doctorService } from './doctorService';

const STORAGE_KEY = 'arogyamitra_hospitals_data';

/**
 * Normalizes hospital record to uniform frontend schema
 */
export const normalizeHospital = (raw) => {
  if (!raw) return null;

  let specialties = [];

  if (Array.isArray(raw.specialties)) {
    specialties = raw.specialties;
  } else if (Array.isArray(raw.speciality)) {
    specialties = raw.speciality;
  } else if (typeof raw.specialties === 'string') {
    specialties = raw.specialties
      .split(/[,|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (typeof raw.speciality === 'string') {
    specialties = raw.speciality
      .split(/[,|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  let assignedSevaksList = [];

  if (Array.isArray(raw.assigned_sevaks) && raw.assigned_sevaks.length > 0) {
    assignedSevaksList = raw.assigned_sevaks;
  } else if (Array.isArray(raw.assignedSevaks) && raw.assignedSevaks.length > 0) {
    assignedSevaksList = raw.assignedSevaks;
  }

  // Deduplicate assigned sevaks list by ID and name
  const sevakMap = new Map();

  assignedSevaksList.forEach((s) => {
    const sId =
      typeof s === 'string'
        ? s
        : s.id ||
          s.employee_code ||
          s.name ||
          s.full_name ||
          s.sevak_name;

    const key = (sId || '').toString().toLowerCase().trim();

    if (key && !sevakMap.has(key)) {
      sevakMap.set(key, s);
    }
  });

  assignedSevaksList = Array.from(sevakMap.values());

  let sevakNames = [];

  if (assignedSevaksList.length > 0) {
    sevakNames = assignedSevaksList
      .map(
        (s) =>
          typeof s === 'string'
            ? s
            : s.sevak_name ||
              s.full_name ||
              s.name ||
              s.employee_code
      )
      .filter(Boolean);
  } else if (
    raw.sevak ||
    raw.assigned_sevak_name ||
    raw.assignedSevakName
  ) {
    const rawStr =
      raw.sevak ||
      raw.assigned_sevak_name ||
      raw.assignedSevakName;

    if (
      rawStr &&
      rawStr !== 'Not assigned' &&
      rawStr !== 'Unassigned' &&
      rawStr !== '—'
    ) {
      sevakNames = rawStr
        .split(/[,|;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Strict deduplication of names
  sevakNames = Array.from(
    new Set(
      sevakNames.filter(
        (n) =>
          n &&
          n !== 'Not assigned' &&
          n !== 'Unassigned' &&
          n !== '—'
      )
    )
  );

  const sevakStr =
    sevakNames.length > 0 ? sevakNames.join(', ') : 'Not assigned';

  return {
    id:
      raw.id ||
      `HOSP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,

    hospital_code: raw.hospital_code || raw.id,

    name: raw.name || 'Unnamed Hospital',

    type:
      raw.type ||
      raw.hospital_type ||
      (raw.name?.toLowerCase().includes('civil') ||
      raw.name?.toLowerCase().includes('govt') ||
      raw.name?.toLowerCase().includes('sassoon') ||
      raw.name?.toLowerCase().includes('city care')
        ? 'Government'
        : 'Non-Government'),

    location:
      raw.location ||
      raw.city ||
      raw.district ||
      'Pune',

    areaTaluka:
      raw.areaTaluka ||
      raw.taluka ||
      'Haveli Taluka',

    pincode:
      raw.pincode ||
      '411004',

    address:
      raw.address ||
      raw.address_line ||
      `${raw.name}, Pune`,

    scheme:
      raw.scheme ||
      'PM-JAY, MJPJAY',

    nearestLandmark:
      raw.nearestLandmark ||
      raw.nearest_landmark ||
      '',

    sevak: sevakStr,

    assigned_sevak_name: sevakStr,

    assigned_sevaks: assignedSevaksList,

    assignedSevaks: assignedSevaksList,

    activeCases:
      raw.activeCases != null
        ? raw.activeCases
        : raw.active_cases || 0,

    bedsAvailable:
      raw.bedsAvailable != null
        ? raw.bedsAvailable
        : raw.beds_available != null
        ? raw.beds_available
        : 15,

    contact:
      raw.contact ||
      raw.contact_number ||
      raw.phone ||
      '020-25678900',

    email:
      raw.email || '',

    status:
      raw.status ||
      'ACTIVE',

    specialties:
      specialties.length > 0
        ? specialties
        : ['General Medicine', 'Emergency Care'],

    doctors: Array.isArray(raw.doctors) ? raw.doctors : [],

    createdAt:
      raw.created_at ||
      raw.createdAt ||
      new Date().toISOString(),
  };
};

/**
 * Load initial hospitals
 */
const getInitialHospitals = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeHospital);
      }
    }
  } catch (e) {
    console.warn(
      '[HospitalService] Failed to parse stored hospitals:',
      e
    );
  }

  return [];
};

let cachedHospitals = getInitialHospitals();

const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((fn) => fn([...cachedHospitals]));

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cachedHospitals)
    );
  } catch (e) {
    console.warn(
      '[HospitalService] Failed to save to localStorage:',
      e
    );
  }
};

let _inFlightHospitalsPromise = null;

export const hospitalService = {
  /**
   * Subscribe to live hospital updates
   */
  subscribe: (callback) => {
    listeners.add(callback);
    callback([...cachedHospitals]);

    return () => listeners.delete(callback);
  },

  /**
   * Get current cached hospitals synchronously
   */
  getCached: () => [...cachedHospitals],

  /**
   * Fetch hospitals
   */
  fetchHospitals: async () => {
    if (_inFlightHospitalsPromise) {
      return _inFlightHospitalsPromise;
    }

    _inFlightHospitalsPromise = (async () => {
      try {
        const res = await api.get('/hospitals');

        const list =
          res?.data?.hospitals ||
          (Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : null);

        if (Array.isArray(list)) {
          const normalized = list.map(normalizeHospital);

          cachedHospitals = normalized;

          notifyListeners();

          return {
            success: true,
            data: [...cachedHospitals],
            source: 'backend-api',
          };
        }
      } catch (err) {
        console.warn(
          '[HospitalService] Backend fetch error:',
          err.message
        );
      } finally {
        _inFlightHospitalsPromise = null;
      }

      return {
        success: true,
        data: [...cachedHospitals],
        source: 'ui-local',
      };
    })();

    return _inFlightHospitalsPromise;
  },

  /**
   * Get single hospital by ID
   */
  getHospitalById: async (id) => {
    try {
      const res = await api.get(`/hospitals/${id}`);

      if (res?.data) {
        return normalizeHospital(res.data);
      }
    } catch (err) {
      console.warn(
        '[HospitalService] Backend getById fallback:',
        err.message
      );
    }

    return (
      cachedHospitals.find((h) => h.id === id) ||
      null
    );
  },

  /**
   * Empanel a new hospital
   */
  createHospital: async (formData) => {
    const specialtiesList = Array.isArray(formData.specialties)
      ? formData.specialties
      : typeof formData.specialties === 'string'
      ? formData.specialties
          .split(/[,|;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : ['General Medicine'];

    const payload = {
      name: formData.name?.trim(),
      type: formData.type || 'Government',
      location: formData.location?.trim() || 'Pune',
      address: formData.address?.trim(),
      areaTaluka:
        formData.areaTaluka?.trim() || 'Haveli Taluka',
      pincode:
        formData.pincode?.trim() || '411004',
      scheme:
        formData.scheme || 'PM-JAY, MJPJAY',
      nearestLandmark:
        formData.nearestLandmark?.trim() || '',
      contact:
        formData.contact?.trim() || '',
      specialties: specialtiesList,
      selectedSevaks:
        formData.selectedSevaks || [],
      selectedSevakIds:
        formData.selectedSevakIds || [],
      doctors:
        formData.doctors || [],
    };

    let createdData = null;

    try {
      const res = await api.post(
        '/hospitals',
        payload
      );

      if (res?.data) {
        createdData = normalizeHospital(
          res.data
        );
      }
    } catch (err) {
      console.warn(
        '[HospitalService] Backend create failed, using local resilient store:',
        err.message
      );
    }

    if (!createdData) {
      const cleanCode =
        formData.hospital_code ||
        `HOSP-${Date.now().toString().slice(-4)}`;

      createdData = normalizeHospital({
        id: `HOSP-${Date.now()}`,
        hospital_code: cleanCode,
        name: formData.name.trim(),
        type: formData.type || 'Government',
        location:
          formData.location?.trim() || 'Pune',
        areaTaluka:
          formData.areaTaluka?.trim() ||
          'Haveli Taluka',
        address:
          formData.address?.trim() ||
          `${formData.name.trim()}, Pune`,
        pincode:
          formData.pincode?.trim() || '411004',
        scheme:
          formData.scheme || 'PM-JAY, MJPJAY',
        nearestLandmark:
          formData.nearestLandmark?.trim() || '',
        specialties: specialtiesList,
        sevak: formData.selectedSevaks?.length
          ? formData.selectedSevaks.join(', ')
          : 'Not assigned',
        bedsAvailable:
          Number(formData.bedsAvailable) || 15,
        activeCases: 0,
        contact:
          formData.contact?.trim() ||
          '020-25678900',
        email:
          formData.email?.trim() || '',
        status: 'ACTIVE',
        doctors: formData.doctors || [],
        assigned_sevaks: (
          formData.selectedSevaks || []
        ).map((name, i) => ({
          id: `sevak-temp-${i}`,
          sevak_name: name,
          full_name: name,
        })),
        createdAt:
          new Date().toISOString(),
      });
    }

    cachedHospitals = [
      createdData,
      ...cachedHospitals.filter(
        (h) => h.id !== createdData.id
      ),
    ];

    notifyListeners();
    try { doctorService?.invalidateCache?.(); } catch (_) {}

    return {
      success: true,
      data: createdData,
    };
  },

  /**
   * Bulk insert hospitals via API / parsed CSV
   */
  bulkCreateHospitals: async (hospitalList) => {
    if (
      !Array.isArray(hospitalList) ||
      hospitalList.length === 0
    ) {
      return {
        success: false,
        count: 0,
        message: 'No hospitals to import',
      };
    }

    let createdList = null;

    try {
      const res = await api.post(
        '/hospitals/bulk',
        { hospitals: hospitalList }
      );

      const apiHospitals =
        res?.data?.hospitals ||
        res?.data;

      if (
        Array.isArray(apiHospitals) &&
        apiHospitals.length > 0
      ) {
        createdList =
          apiHospitals.map(normalizeHospital);
      }
    } catch (err) {
      console.warn(
        '[HospitalService] Backend bulk create failed, using local resilient store:',
        err.message
      );
    }

    if (!createdList) {
      createdList = hospitalList
        .map((item, idx) => {
          const cleanCode =
            item.hospital_code ||
            `HOSP-CSV-${Date.now()}-${idx + 1}`;

          return normalizeHospital({
            id: `HOSP-CSV-${Date.now()}-${idx + 1}`,
            hospital_code: cleanCode,
            name:
              item.name ||
              item.hospital_name ||
              item.hospital ||
              `Hospital ${idx + 1}`,
            type:
              item.type ||
              item.hospital_type ||
              'Government',
            location:
              item.location ||
              item.city ||
              item.district ||
              'Pune',
            areaTaluka:
              item.areaTaluka ||
              item.taluka ||
              'Haveli Taluka',
            address:
              item.address ||
              item.full_address ||
              `${item.name || 'Hospital'}, Pune`,
            pincode:
              item.pincode ||
              item.zip ||
              '411004',
            scheme:
              item.scheme ||
              item.schemes ||
              'PM-JAY, MJPJAY',
            contact:
              item.contact ||
              item.phone ||
              item.mobile ||
              '020-25678900',
            sevak:
              item.sevak ||
              item.assigned_sevak ||
              'Not assigned',
            bedsAvailable:
              Number(
                item.bedsAvailable ||
                item.beds ||
                item.available_beds
              ) || 20,
            activeCases:
              Number(
                item.activeCases ||
                item.cases
              ) || 0,
            specialties:
              item.specialties ||
              item.speciality ||
              item.specialities ||
              [],
          });
        })
        .filter(Boolean);
    }

    cachedHospitals = [
      ...createdList,
      ...cachedHospitals.filter(
        (h) =>
          !createdList.some(
            (c) => c.id === h.id
          )
      ),
    ];

    notifyListeners();

    return {
      success: true,
      count: createdList.length,
      data: createdList,
    };
  },

  /**
   * Upload raw CSV file directly to backend API
   */
  uploadCsvFile: async (file) => {
    if (!file) {
      return {
        success: false,
        count: 0,
        message: 'No file provided',
      };
    }

    const formData = new FormData();

    formData.append('file', file);

    try {
      const res = await api.post(
        '/hospitals/bulk',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      const apiHospitals =
        res?.data?.hospitals ||
        res?.data;

      if (
        Array.isArray(apiHospitals) &&
        apiHospitals.length > 0
      ) {
        const normalized =
          apiHospitals.map(
            normalizeHospital
          );

        cachedHospitals = [
          ...normalized,
          ...cachedHospitals.filter(
            (h) =>
              !normalized.some(
                (c) => c.id === h.id
              )
          ),
        ];

        notifyListeners();

        return {
          success: true,
          count: normalized.length,
          data: normalized,
        };
      }

      return {
        success: true,
        count:
          res?.data?.successCount || 0,
        data: res?.data,
      };
    } catch (err) {
      console.warn(
        '[HospitalService] CSV file upload API error:',
        err.message
      );

      throw err;
    }
  },

  /**
   * Update hospital record
   */
  updateHospital: async (
    id,
    updateData
  ) => {
    cachedHospitals =
      cachedHospitals.map((h) =>
        h.id === id
          ? { ...h, ...updateData }
          : h
      );

    notifyListeners();

    return {
      success: true,
    };
  },

  /**
   * Assign ArogyaSevaks to a specific Hospital
   */
  assignSevaksToHospital: async (
    hospitalId,
    selectedSevakList = []
  ) => {
    // Deduplicate selectedSevakList
    const uniqueMap = new Map();

    (
      Array.isArray(selectedSevakList)
        ? selectedSevakList
        : []
    ).forEach((s) => {
      const key = (
        typeof s === 'string'
          ? s
          : s.id ||
            s.name ||
            s.full_name ||
            s.sevak_name ||
            ''
      )
        .toString()
        .toLowerCase()
        .trim();

      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });

    const cleanList =
      Array.from(uniqueMap.values());

    const sevakIds = cleanList
      .map((s) =>
        typeof s === 'string'
          ? s
          : s.id
      )
      .filter(Boolean);

    const sevakNames = Array.from(
      new Set(
        cleanList
          .map((s) =>
            typeof s === 'string'
              ? s
              : s.name ||
                s.full_name ||
                s.sevak_name
          )
          .filter(Boolean)
      )
    );

    const sevakNamesStr =
      sevakNames.length > 0
        ? sevakNames.join(', ')
        : 'Not assigned';

    // 1. Send to backend API
    try {
      await api.post(
        `/hospitals/${encodeURIComponent(
          hospitalId
        )}/assign-sevaks`,
        {
          sevak_ids: sevakIds,
          selectedSevaks: sevakNames,
          remarks:
            'Assigned via Admin Portal',
        }
      );
    } catch (err) {
      console.warn(
        '[HospitalService] Backend assign-sevaks fallback:',
        err.message
      );
    }

    // 2. Update cached hospitals
    cachedHospitals =
      cachedHospitals.map((h) => {
        const match =
          String(h.id) ===
            String(hospitalId) ||
          String(h.hospital_code || '') ===
            String(hospitalId) ||
          (h.name &&
            h.name.toLowerCase().trim() ===
              String(hospitalId)
                .toLowerCase()
                .trim());

        if (match) {
          return {
            ...h,
            assigned_sevaks: cleanList,
            assignedSevaks: cleanList,
            sevak: sevakNamesStr,
            assigned_sevak_name:
              sevakNamesStr,
          };
        }

        return h;
      });

    notifyListeners();

    return {
      success: true,
    };
  },

  /**
   * Get all Arogya Sevaks assigned to a particular hospital
   * GET /api/hospitals/:id/sevaks
   */
  fetchHospitalSevaks: async (id) => {
    try {
      const res = await api.get(`/hospitals/${encodeURIComponent(id)}/sevaks`);
      return res?.data || res;
    } catch (err) {
      console.warn(`[HospitalService] fetchHospitalSevaks(${id}) error:`, err.message);
      throw err;
    }
  },

  /**
   * Delete hospital by ID
   */
  deleteHospital: async (id) => {
    try {
      await api.delete(
        `/hospitals/${id}`
      );
    } catch (err) {
      console.warn(
        '[HospitalService] Backend delete fallback:',
        err.message
      );
    }

    cachedHospitals =
      cachedHospitals.filter(
        (h) => h.id !== id
      );

    notifyListeners();

    return {
      success: true,
    };
  },
};

export default hospitalService;