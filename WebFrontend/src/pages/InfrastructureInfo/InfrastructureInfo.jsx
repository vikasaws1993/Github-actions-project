import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Save,
  Stethoscope,
  Activity,
  Bed,
  Clock,
  AlertCircle,
  LayoutGrid,
  Sparkles,
  Check,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Pencil,
  FileText,
  Send,
  X,
  Plus,
  Trash2,
  Search,
  Users,
  Heart,
  Droplet,
  Phone,
  MapPin,
  Award,
  Calendar,
  ShieldCheck,
  Radio,
  FileCheck2,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Eye,
  Package,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import hospitalFacilityService from '@/services/hospitalFacilityService';
import packageMasterService from '@/services/packageMasterService';
import doctorService from '@/services/doctorService';
import './InfrastructureInfo.css';

export const getUserDraftStorageKey = (userObj, hospId) => {
  const uid = userObj?.id || userObj?.sevakId || userObj?.employee_code || userObj?.phone || userObj?._id || 'default_sevak';
  const hid = hospId || userObj?.hospital_id || userObj?.hospitalCode || userObj?.hospitalId || 'new_hospital';
  return `arogya_facilities_v3_${uid}_${hid}`;
};

// Quick Qualification & Degrees Pills
export const QUICK_QUALIFICATIONS = [
  'MBBS',
  'MD (General Medicine)',
  'MS (General Surgery)',
  'MD (Cardiology)',
  'DM (Cardiology)',
  'MS (Orthopedics)',
  'MD (Pediatrics)',
  'MD (Obstetrics & Gynae)',
  'DNB',
  'MCh (Neurosurgery)',
  'BDS / MDS',
  'Fellowship (Critical Care)',
];

// Quick Doctor Speciality Toggle Pills
export const QUICK_DOC_SPECIALITIES = [
  'Burns Management',
  'Cardio-thoracic & Vascular surgery',
  'Cardiology',
  'Emergency Room Packages',
  'General Medicine',
  'General Surgery',
  'Infectious Diseases',
  'Interventional Neuroradiology',
  'Medical Oncology',
  'Mental Diseases / Psychiatry',
];

// Maharashtra Districts
export const MAHARASHTRA_DISTRICTS = [
  'Pune',
  'Mumbai City',
  'Mumbai Suburban',
  'Thane',
  'Nagpur',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Solapur',
  'Kolhapur',
  'Satara',
  'Sangli',
  'Ahmednagar',
  'Amravati',
  'Nanded',
  'Jalgaon',
  'Akola',
  'Latur',
  'Dhule',
  'Raigad',
  'Ratnagiri',
  'Sindhudurg',
  'Chandrapur',
  'Yavatmal',
  'Beed',
  'Jalna',
  'Parbhani',
  'Buldhana',
  'Dharashiv (Osmanabad)',
  'Wardha',
  'Gondia',
  'Gadchiroli',
  'Bhandara',
  'Hingoli',
  'Washim',
  'Nandurbar',
  'Palghar',
];

// Week days for Doctor Duty Schedule
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const getDoctorDutyDays = (doc) => {
  if (!doc) return 'Mon - Sat';
  if (doc.dutyType === 'On-Call' || (doc.availability && doc.availability.includes('On-Call'))) {
    return 'On-Call (24/7)';
  }
  let days = doc.workingDays;
  if (!days || !Array.isArray(days) || days.length === 0) {
    const match = doc.availability?.match(/\[(.*?)\]/);
    if (match && match[1]) {
      days = match[1].split(',').map((d) => d.trim()).filter(Boolean);
    }
  }
  if (!days || days.length === 0) {
    return 'Mon - Sat';
  }
  if (days.length === 7) return 'All Days (Mon - Sun)';
  if (days.length === 6 && !days.includes('Sun')) return 'Mon - Sat';
  if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return 'Mon - Fri';
  return days.join(', ');
};

// 26 Standard Clinical Specialities (English)
export const ALL_26_SPECIALITIES = [
  { id: 'burns', name: 'Burns Management', category: 'Surgical' },
  { id: 'ctvs', name: 'Cardio-thoracic & Vascular surgery', category: 'Surgical' },
  { id: 'cardio', name: 'Cardiology', category: 'Super-Specialty' },
  { id: 'emergency', name: 'Emergency Room Packages', category: 'Critical' },
  { id: 'gen_med', name: 'General Medicine', category: 'Primary' },
  { id: 'gen_surg', name: 'General Surgery', category: 'Primary' },
  { id: 'infectious', name: 'Infectious Diseases', category: 'Medical' },
  { id: 'interv_neuro', name: 'Interventional Neuroradiology', category: 'Super-Specialty' },
  { id: 'onco_med', name: 'Medical Oncology', category: 'Super-Specialty' },
  { id: 'neuro_med', name: 'Neurology', category: 'Super-Specialty' },
  { id: 'neuro_surg', name: 'Neurosurgery', category: 'Surgical' },
  { id: 'onco_surg', name: 'Surgical Oncology', category: 'Surgical' },
  { id: 'gyn_obs', name: 'Gynecology & Obstetrics', category: 'Primary' },
  { id: 'pediatrics', name: 'Pediatrics', category: 'Primary' },
  { id: 'ped_surg', name: 'Pediatric Surgery', category: 'Surgical' },
  { id: 'ortho', name: 'Orthopedics', category: 'Surgical' },
  { id: 'nephro', name: 'Nephrology & Dialysis', category: 'Super-Specialty' },
  { id: 'urology', name: 'Urology', category: 'Surgical' },
  { id: 'pulmo', name: 'Pulmonology (Chest)', category: 'Medical' },
  { id: 'gastro', name: 'Gastroenterology', category: 'Super-Specialty' },
  { id: 'eye_opht', name: 'Ophthalmology (Eye)', category: 'Specialized' },
  { id: 'ent', name: 'ENT (Ear, Nose, Throat)', category: 'Specialized' },
  { id: 'derma', name: 'Dermatology', category: 'Specialized' },
  { id: 'psych', name: 'Mental Diseases / Psychiatry', category: 'Medical' },
  { id: 'endo', name: 'Endocrinology & Diabetes', category: 'Medical' },
  { id: 'radiology', name: 'Radiology & Imaging', category: 'Diagnostic' },
];

export const INFRA_SECTIONS = [
  { id: 's1', num: 1, title: 'Hospital Info', subtitle: 'Basic Contact & Facility Details', icon: Building2 },
  { id: 's2', num: 2, title: 'Capacity', subtitle: 'IPD, Diagnostic, Operative, Emergency & Blood Bank', icon: Bed },
  { id: 's3', num: 3, title: 'Specialities', subtitle: '26 Clinical Specialities & Super-Specialty Units', icon: Stethoscope },
  { id: 's4', num: 4, title: 'Packages', subtitle: 'Procedures & Healthcare Scheme Treatment Packages', icon: Package },
  { id: 's5', num: 5, title: 'Doctors', subtitle: 'Attending Specialists, Qualifications & Availability', icon: Users },
  { id: 's6', num: 6, title: 'Resource Count', subtitle: 'Doctors, Nurses & Support Staff Strength', icon: LayoutGrid },
];

const INITIAL_HOSP_INFO = {
  name: '',
  type: '',
  address: '',
  city: '',
  district: '',
  areaTaluka: '',
  pincode: '',
  nearestLandmark: '',
  contact: '',
};

const INITIAL_CAPACITY = {
  ipd: {
    noOfWards: '',
    generalBeds: '',
    icuUnits: '',
    nicuBeds: '',
    picuBeds: '',
    isolationBeds: '',
  },
  diagnosis: {
    xray: { available: '', count: '' },
    mri: { available: '', count: '' },
    ultrasound: { available: '', count: '' },
    ctScan: { available: '', count: '' },
    ecg: { available: '', count: '' },
    endoscopy: { available: '', count: '' },
  },
  operative: {
    operationTheatres: '',
    operationTheatresAvailable: false,
    recoveryBeds: '',
    recoveryBedsAvailable: false,
    dialysisUnits: '',
    dialysisUnitsAvailable: false,
  },
  emergency: {
    emergencyBeds: '',
    emergencyBedsAvailable: false,
    ambulances: '',
    ambulancesAvailable: false,
  },
  bloodBank: {
    available: '',
    bloodGroups: {
      'A+': false,
      'A-': false,
      'B+': false,
      'B-': false,
      'AB+': false,
      'AB-': false,
      'O+': false,
      'O-': false,
    },
  },
};

const INITIAL_DOCTORS = [];

const INITIAL_RESOURCE_COUNT = {
  nursingStaff: '',
  paramedicalStaff: '',
  supportStaff: '',
};

export const InfrastructureInfo = () => {
  const { user } = useAuth();
  const storageKey = getUserDraftStorageKey(user);

  const getInitialDraft = () => {
    try {
      // Actively purge all legacy or dirty draft keys from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('arogya_facilities_v2_') || k.startsWith('arogya_facilities_draft_') || k.includes('guest') || k.includes('assigned_hosp'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Remove any old dummy doctors from draft
        if (Array.isArray(parsed?.doctorsList)) {
          parsed.doctorsList = parsed.doctorsList.filter(
            (d) => d && d.name !== 'Dr. Nilesh Bapat' && d.name !== 'Dr. Arvind Mahadeo Joshi' && d.name !== 'Dr. Meenal Kulkarni-Deshpande' && d.name !== 'Dr. Rajesh Vitthalrao Salunkhe' && !String(d.id || '').startsWith('doc-')
          );
        }
        // Remove legacy seed specialities if not submitted
        if (Array.isArray(parsed?.selectedSpecialities)) {
          const legacySeed = ['gen_med', 'gen_surg', 'gyn_obs', 'pediatrics', 'ortho', 'cardio', 'emergency'];
          if (parsed.selectedSpecialities.length === legacySeed.length && parsed.selectedSpecialities.every((s, i) => s === legacySeed[i]) && !parsed.isFinalSubmitted) {
            parsed.selectedSpecialities = [];
          }
        }
        return parsed;
      }
    } catch (err) {
      console.error('Failed to parse draft from localStorage:', err);
    }
    return null;
  };

  const checkAllSectionsComplete = (info, cap, specs, pkgs, docs, res) => {
    const s1Ok = Boolean(
      info?.name?.trim() &&
      info?.type &&
      info?.address?.trim() &&
      info?.city?.trim() &&
      info?.district?.trim() &&
      info?.areaTaluka?.trim() &&
      info?.pincode?.trim() &&
      info?.contact?.trim()
    );
    const s2Ok = Boolean(
      cap?.ipd?.noOfWards &&
      cap?.ipd?.generalBeds &&
      cap?.ipd?.icuUnits
    );
    const s3Ok = Boolean(Array.isArray(specs) && specs.length > 0);
    const s4Ok = Boolean(Array.isArray(pkgs) && pkgs.length > 0);
    const s5Ok = Boolean(Array.isArray(docs) && docs.length > 0);
    const s6Ok = Boolean(res?.nursingStaff || res?.paramedicalStaff || res?.supportStaff);
    return s1Ok && s2Ok && s3Ok && s4Ok && s5Ok && s6Ok;
  };

  const savedDraft = getInitialDraft();
  const initialAllComplete = checkAllSectionsComplete(
    savedDraft?.hospInfo,
    savedDraft?.capacity,
    savedDraft?.selectedSpecialities,
    savedDraft?.selectedPackages,
    savedDraft?.doctorsList,
    savedDraft?.resourceCount
  );
  const initialIsSubmitted = Boolean(savedDraft?.isFinalSubmitted && initialAllComplete);

  const [activeSection, setActiveSection] = useState(() => savedDraft?.activeSection || 's1');
  const [completedSections, setCompletedSections] = useState(() => savedDraft?.completedSections || []);
  const [touchedSections, setTouchedSections] = useState(() => savedDraft?.touchedSections || ['s1']);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [resetToast, setResetToast] = useState('');
  const [lastDraftSaved, setLastDraftSaved] = useState(() => savedDraft?.lastSaved || null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(() => initialIsSubmitted);
  const [showSummary, setShowSummary] = useState(() => initialIsSubmitted);
  const [inlineEditSection, setInlineEditSection] = useState(null);
  const [showFinalModal, setShowFinalModal] = useState(false);

  // Sync state when user or hospital changes
  useEffect(() => {
    const draft = getInitialDraft();
    if (draft) {
      if (draft.hospInfo) setHospInfo({ ...INITIAL_HOSP_INFO, ...draft.hospInfo });
      if (draft.capacity) setCapacity(draft.capacity);
      if (Array.isArray(draft.selectedSpecialities)) setSelectedSpecialities(draft.selectedSpecialities);
      if (Array.isArray(draft.selectedPackages)) setSelectedPackages(draft.selectedPackages);
      if (Array.isArray(draft.doctorsList)) setDoctorsList(draft.doctorsList);
      if (draft.resourceCount) setResourceCount({ ...INITIAL_RESOURCE_COUNT, ...draft.resourceCount });
      if (draft.activeSection) setActiveSection(draft.activeSection);
      if (Array.isArray(draft.completedSections)) setCompletedSections(draft.completedSections);
      if (draft.isFinalSubmitted !== undefined) {
        setIsFinalSubmitted(draft.isFinalSubmitted);
        setShowSummary(draft.isFinalSubmitted);
      }
    } else {
      setHospInfo(INITIAL_HOSP_INFO);
      setCapacity(INITIAL_CAPACITY);
      setSelectedSpecialities([]);
      setSelectedPackages([]);
      setDoctorsList([]);
      setResourceCount(INITIAL_RESOURCE_COUNT);
      setActiveSection('s1');
      setCompletedSections([]);
      setIsFinalSubmitted(false);
      setShowSummary(false);
    }
  }, [storageKey]);

  // Notify Navbar when summary view is active
  useEffect(() => {
    sessionStorage.setItem('arogya_facilities_summary_active', showSummary ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('arogyamitra:facilities-view-change', {
        detail: { showSummary: Boolean(showSummary) },
      })
    );
    return () => {
      sessionStorage.removeItem('arogya_facilities_summary_active');
      window.dispatchEvent(
        new CustomEvent('arogyamitra:facilities-view-change', {
          detail: { showSummary: false },
        })
      );
    };
  }, [showSummary]);

  // Section 1: Hospital Information
  const [hospInfo, setHospInfo] = useState(() => ({
    ...INITIAL_HOSP_INFO,
    ...(savedDraft?.hospInfo || {}),
  }));

  const [assignedHospitalData, setAssignedHospitalData] = useState(null);

  // Section 2: Capacity
  const [capacity, setCapacity] = useState(() => {
    if (savedDraft?.capacity) return savedDraft.capacity;
    return {
      ...INITIAL_CAPACITY,
      ipd: { ...INITIAL_CAPACITY.ipd, ...(savedDraft?.beds ? { generalBeds: savedDraft.beds.totalBeds, icuUnits: savedDraft.beds.totalIcuBeds } : {}) },
    };
  });

  // Section 3: Specialities (Set of selected speciality IDs)
  const [selectedSpecialities, setSelectedSpecialities] = useState(() => {
    if (savedDraft?.selectedSpecialities && Array.isArray(savedDraft.selectedSpecialities)) {
      return savedDraft.selectedSpecialities;
    }
    return [];
  });

  const [specialitySearch, setSpecialitySearch] = useState('');

  // Section 4: Packages & Procedures Master
  const [packagesDataMap, setPackagesDataMap] = useState({});
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState(() => {
    if (savedDraft?.selectedPackages && Array.isArray(savedDraft.selectedPackages)) {
      return savedDraft.selectedPackages;
    }
    return [];
  });
  const [packageSearch, setPackageSearch] = useState('');
  const [packageSpecialtyFilter, setPackageSpecialtyFilter] = useState('SELECTED');
  const [specialtySearchMap, setSpecialtySearchMap] = useState({});
  const [openSpecialties, setOpenSpecialties] = useState({});

  // Load packages master from backend API
  useEffect(() => {
    const loadPackagesMaster = async () => {
      try {
        setPackagesLoading(true);
        const res = await packageMasterService.getBySpecialtyMap();
        const map = res?.data || res || {};
        setPackagesDataMap(map);
      } catch (err) {
        console.warn('Could not load packages master:', err);
      } finally {
        setPackagesLoading(false);
      }
    };
    loadPackagesMaster();
  }, []);

  // Section 5: Doctors Roster
  const [doctorsList, setDoctorsList] = useState(() => {
    if (savedDraft?.doctorsList && Array.isArray(savedDraft.doctorsList)) {
      return savedDraft.doctorsList;
    }
    return [];
  });

  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [hospitalMasterDoctors, setHospitalMasterDoctors] = useState([]);
  const [isDocNameDropdownOpen, setIsDocNameDropdownOpen] = useState(false);
  const [selectedDocSpecialities, setSelectedDocSpecialities] = useState(['General Medicine']);
  const [isDocSpecDropdownOpen, setIsDocSpecDropdownOpen] = useState(false);
  const [docModalSpecSearch, setDocModalSpecSearch] = useState('');
  const [docModalErrors, setDocModalErrors] = useState({});
  const [docFormData, setDocFormData] = useState({
    name: '',
    speciality: 'General Medicine',
    doctorType: 'Both',
    qualification: '',
    experience: '',
    dutyType: 'Shift',
    startTime: '08:00',
    startPeriod: 'AM',
    endTime: '02:00',
    endPeriod: 'PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    availability: 'Shift (08:00 AM - 02:00 PM)',
    location: '',
    mobile: '',
    altMobile: '',
    address: '',
    city: '',
    district: '',
    taluka: '',
    pincode: '',
    nearestLandmark: '',
  });

  // Filtered list of registered master doctors matching current name/speciality query
  const matchingHospitalDocs = useMemo(() => {
    if (!hospitalMasterDoctors || hospitalMasterDoctors.length === 0) return [];
    const query = (docFormData.name || '').trim().toLowerCase();
    if (!query) return hospitalMasterDoctors;
    return hospitalMasterDoctors.filter((doc) =>
      (doc.name && doc.name.toLowerCase().includes(query)) ||
      (doc.speciality && doc.speciality.toLowerCase().includes(query))
    );
  }, [hospitalMasterDoctors, docFormData.name]);

  // Section 6: Resource Count
  const [resourceCount, setResourceCount] = useState(() => ({
    ...INITIAL_RESOURCE_COUNT,
    ...(savedDraft?.resourceCount || {}),
  }));

  // Selected specialities names list
  const selectedSpecialityNames = useMemo(() => {
    return ALL_26_SPECIALITIES.filter((s) => selectedSpecialities.includes(s.id)).map((s) => s.name);
  }, [selectedSpecialities]);

  // Packages list grouped by specialty, filtered by search and filter tab
  const filteredPackagesGrouped = useMemo(() => {
    const searchLower = packageSearch.trim().toLowerCase();
    const result = [];

    const specialtyKeys = Object.keys(packagesDataMap);
    if (specialtyKeys.length === 0) return result;

    specialtyKeys.forEach((specKey) => {
      const specGroup = packagesDataMap[specKey];
      const isSpecSelected = selectedSpecialityNames.some(
        (name) => name.toLowerCase() === specKey.toLowerCase()
      );

      // Filter by tab
      if (packageSpecialtyFilter === 'SELECTED' && !isSpecSelected) {
        return;
      }
      if (
        packageSpecialtyFilter !== 'ALL' &&
        packageSpecialtyFilter !== 'SELECTED' &&
        packageSpecialtyFilter.toLowerCase() !== specKey.toLowerCase()
      ) {
        return;
      }

      const rawList = specGroup.procedures || specGroup.packages || [];
      const seenCodes = new Set();
      const uniquePackages = [];

      for (const item of rawList) {
        const code = (item.package_code || item.procedure_code || item.id || '').trim();
        const name = (item.package_name || item.procedure_name || '').trim();
        const key = `${code}__${name}`;
        if (seenCodes.has(key)) continue;
        seenCodes.add(key);

        uniquePackages.push({
          id: code || item.id,
          package_code: code || item.procedure_code || 'PKG',
          package_name: name || code,
          specialty: specKey,
          specialty_code: specGroup.specialty_code || '',
          category: item.category || 'General',
        });
      }

      let filteredPackages = uniquePackages;
      if (searchLower) {
        filteredPackages = filteredPackages.filter(
          (p) =>
            p.package_name.toLowerCase().includes(searchLower) ||
            p.package_code.toLowerCase().includes(searchLower) ||
            p.specialty.toLowerCase().includes(searchLower)
        );
      }

      // Per-specialty search filter
      const specSearchTerm = (specialtySearchMap[specKey] || '').trim().toLowerCase();
      if (specSearchTerm) {
        filteredPackages = filteredPackages.filter(
          (p) =>
            p.package_name.toLowerCase().includes(specSearchTerm) ||
            p.package_code.toLowerCase().includes(specSearchTerm)
        );
      }

      if (filteredPackages.length > 0 || specSearchTerm) {
        result.push({
          specialty: specKey,
          specialty_code: specGroup.specialty_code,
          isSelectedSpecialty: isSpecSelected,
          packages: filteredPackages,
          totalCount: uniquePackages.length,
        });
      }
    });

    return result;
  }, [packagesDataMap, packageSearch, packageSpecialtyFilter, selectedSpecialityNames, specialtySearchMap]);

  const handleTogglePackage = (pkgCodeOrId) => {
    setSelectedPackages((prev) =>
      prev.includes(pkgCodeOrId)
        ? prev.filter((p) => p !== pkgCodeOrId)
        : [...prev, pkgCodeOrId]
    );
  };

  const handleSelectAllSpecialtyPackages = (packagesList) => {
    const ids = packagesList.map((p) => p.package_code || p.id);
    setSelectedPackages((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const set = new Set([...prev, ...ids]);
      return Array.from(set);
    });
  };

  const handleSelectAllForSelectedSpecialities = () => {
    const idsToSelect = [];
    Object.keys(packagesDataMap).forEach((specKey) => {
      const isSpecSelected = selectedSpecialityNames.some(
        (name) => name.toLowerCase() === specKey.toLowerCase()
      );
      if (isSpecSelected) {
        const rawList = packagesDataMap[specKey].procedures || packagesDataMap[specKey].packages || [];
        rawList.forEach((p) => {
          const code = (p.package_code || p.procedure_code || p.id || '').trim();
          if (code) idsToSelect.push(code);
        });
      }
    });
    setSelectedPackages((prev) => Array.from(new Set([...prev, ...idsToSelect])));
  };

  const isSpecialtyOpen = (specName, idx) => {
    if (openSpecialties[specName] !== undefined) {
      return Boolean(openSpecialties[specName]);
    }
    // Default: 1st specialty (idx === 0) is open, all subsequent ones are collapsed
    return idx === 0;
  };

  const handleToggleSpecialtyOpen = (specName, idx) => {
    const currentState = isSpecialtyOpen(specName, idx);
    setOpenSpecialties((prev) => ({
      ...prev,
      [specName]: !currentState,
    }));
  };

  // Sync / Save data to backend
  const saveToBackend = async (overrides = {}) => {
    try {
      const payload = {
        hospitalInfo: overrides.hospInfo || hospInfo,
        capacity: overrides.capacity || capacity,
        selectedSpecialities: overrides.selectedSpecialities || selectedSpecialities,
        selectedPackages: overrides.selectedPackages || selectedPackages,
        doctorsList: overrides.doctorsList || doctorsList,
        resourceCount: overrides.resourceCount || resourceCount,
        completedSections: overrides.completedSections || completedSections,
        isFullyCompleted: overrides.isFinalSubmitted !== undefined ? overrides.isFinalSubmitted : isFinalSubmitted,
        status: (overrides.isFinalSubmitted !== undefined ? overrides.isFinalSubmitted : isFinalSubmitted) ? 'SUBMITTED' : 'DRAFT',
      };
      await hospitalFacilityService.saveHospitalFacilities(payload);
    } catch (err) {
      console.warn('Could not sync hospital facility survey to backend:', err?.message);
    }
  };

  // Pre-fill hospital details (only when user clicks Auto-fill)
  const applyHospitalDetails = (hosp, force = false) => {
    if (!hosp) return;
    setHospInfo((prev) => ({
      ...prev,
      name: force || !prev.name ? (hosp.name || hosp.hospital_name || '') : prev.name,
      type: force || !prev.type ? (hosp.hospital_type || hosp.type || '') : prev.type,
      address: force || !prev.address ? (hosp.address || hosp.address_line || '') : prev.address,
      city: force || !prev.city ? (hosp.city || '') : prev.city,
      district: force || !prev.district ? (hosp.district || '') : prev.district,
      areaTaluka: force || !prev.areaTaluka ? (hosp.taluka || hosp.area || '') : prev.areaTaluka,
      pincode: force || !prev.pincode ? (hosp.pincode || '') : prev.pincode,
      nearestLandmark: force || !prev.nearestLandmark ? (hosp.nearest_landmark || '') : prev.nearestLandmark,
      contact: force || !prev.contact ? (hosp.contact_number || hosp.phone || '') : prev.contact,
    }));

    if (force) {
      setResetToast(`Section 1 populated with official details of ${hosp.name || 'Assigned Hospital'}`);
      setTimeout(() => setResetToast(''), 3500);
    }
  };

  // Fetch initial assigned hospital info on mount
  useEffect(() => {
    const fetchHospitalFacilitiesData = async () => {
      try {
        const res = await hospitalFacilityService.getHospitalFacilities();
        const data = res?.data;
        if (data) {
          if (data.hospitalInfo || data.hospitalName) {
            setAssignedHospitalData({
              name: data.hospitalName || data.hospitalInfo?.name || '',
              hospital_type: data.hospitalInfo?.type || '',
              address: data.hospitalInfo?.address || '',
              city: data.hospitalInfo?.city || '',
              district: data.hospitalInfo?.district || '',
              taluka: data.hospitalInfo?.areaTaluka || '',
              pincode: data.hospitalInfo?.pincode || '',
              contact_number: data.hospitalInfo?.contact || '',
            });
          }

          // Load and sync existing master doctors for this hospital
          const backendMasterDocs = Array.isArray(data.hospitalDoctorsMaster) && data.hospitalDoctorsMaster.length > 0
            ? data.hospitalDoctorsMaster
            : (Array.isArray(data.doctorsList) ? data.doctorsList : []);
          
          if (backendMasterDocs.length > 0) {
            setHospitalMasterDoctors(backendMasterDocs);
          }

          // If current doctorsList is empty, seed it with hospital master doctors
          if (backendMasterDocs.length > 0 && doctorsList.length === 0) {
            setDoctorsList(backendMasterDocs);
          }

          // Only restore survey details if there is an actual saved/submitted survey
          const hasSavedSurvey = Boolean(
            data.isFullyCompleted === true ||
            data.status === 'SUBMITTED' ||
            (Array.isArray(data.completedSections) && data.completedSections.length > 0)
          );

          if (hasSavedSurvey) {
            if (data.hospitalInfo && Object.keys(data.hospitalInfo).length > 0) {
              setHospInfo((prev) => ({ ...prev, ...data.hospitalInfo }));
            }
            if (data.capacity) {
              setCapacity(data.capacity);
            }
            if (Array.isArray(data.selectedSpecialities) && data.selectedSpecialities.length > 0) {
              setSelectedSpecialities(data.selectedSpecialities);
            }
            if (Array.isArray(data.selectedPackages) && data.selectedPackages.length > 0) {
              setSelectedPackages(data.selectedPackages);
            }
            if (Array.isArray(data.doctorsList) && data.doctorsList.length > 0) {
              setDoctorsList(data.doctorsList);
            }
            if (data.resourceCount) {
              setResourceCount(data.resourceCount);
            }
            const allCompletedInBackend = checkAllSectionsComplete(
              data.hospitalInfo || hospInfo,
              data.capacity || capacity,
              data.selectedSpecialities || selectedSpecialities,
              data.selectedPackages || selectedPackages,
              data.doctorsList || doctorsList,
              data.resourceCount || resourceCount
            );
            const isSurveySubmitted = Boolean(
              (data.isFullyCompleted === true || data.status === 'SUBMITTED') && allCompletedInBackend
            );
            setIsFinalSubmitted(isSurveySubmitted);
            setShowSummary(isSurveySubmitted);
          }
        }
      } catch (e) {
        console.warn('Could not auto-fetch hospital facilities:', e?.message);
        try {
          const fallbackRes = await api.get('/arogya-sevaks/assigned-hospital/details');
          if (fallbackRes?.data) {
            setAssignedHospitalData(fallbackRes.data);
          }
        } catch (err) {
          // ignore
        }
      }
    };

    fetchHospitalFacilitiesData();
  }, []);

  // Auto-save draft on change
  useEffect(() => {
    const draftPayload = {
      hospInfo,
      capacity,
      selectedSpecialities,
      selectedPackages,
      doctorsList,
      resourceCount,
      activeSection,
      completedSections,
      touchedSections,
      isFinalSubmitted,
      lastSaved: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(draftPayload));
      setLastDraftSaved(draftPayload.lastSaved);
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
  }, [
    hospInfo,
    capacity,
    selectedSpecialities,
    selectedPackages,
    doctorsList,
    resourceCount,
    activeSection,
    completedSections,
    touchedSections,
    isFinalSubmitted,
    storageKey,
  ]);

  // Section Validation
  const validateSection = (secId) => {
    if (secId === 's1') {
      if (
        !hospInfo.name?.trim() ||
        !hospInfo.type ||
        !hospInfo.address?.trim() ||
        !hospInfo.city?.trim() ||
        !hospInfo.district?.trim() ||
        !hospInfo.areaTaluka?.trim() ||
        !hospInfo.pincode?.trim() ||
        !hospInfo.contact?.trim()
      ) {
        return 'Please fill all required Hospital Information fields (Name, Type, Street Address, City, District, Taluka, Pincode, Contact Helpline).';
      }
    }
    if (secId === 's2') {
      const { ipd } = capacity;
      if (!ipd.noOfWards || !ipd.generalBeds || !ipd.icuUnits) {
        return 'Please provide essential IPD capacity details (No. of Wards, General Beds, ICU Units).';
      }
    }
    if (secId === 's3') {
      if (!selectedSpecialities || selectedSpecialities.length === 0) {
        return 'Please select at least 1 active Clinical Speciality for this hospital facility.';
      }
    }
    if (secId === 's4') {
      if (!selectedPackages || selectedPackages.length === 0) {
        return 'Please select at least 1 procedure / treatment package available at this hospital.';
      }
    }
    if (secId === 's5') {
      if (!doctorsList || doctorsList.length === 0) {
        return 'Please add at least 1 doctor to the hospital doctor roster.';
      }
    }
    if (secId === 's6') {
      if (!resourceCount.nursingStaff && !resourceCount.paramedicalStaff && !resourceCount.supportStaff) {
        return 'Please enter the nursing and workforce staff count in Section 6.';
      }
    }
    return null;
  };

  const hasSectionData = (secId) => {
    if (secId === 's1') {
      return Boolean(
        hospInfo.name?.trim() ||
        hospInfo.type ||
        hospInfo.address?.trim() ||
        hospInfo.city?.trim() ||
        hospInfo.district?.trim() ||
        hospInfo.areaTaluka?.trim() ||
        hospInfo.pincode?.trim() ||
        hospInfo.nearestLandmark?.trim() ||
        hospInfo.contact?.trim()
      );
    }
    if (secId === 's2') {
      return Boolean(
        capacity.ipd?.noOfWards ||
        capacity.ipd?.generalBeds ||
        capacity.ipd?.icuUnits ||
        capacity.operative?.operationTheatres ||
        capacity.emergency?.emergencyBeds
      );
    }
    if (secId === 's3') {
      return selectedSpecialities.length > 0;
    }
    if (secId === 's4') {
      return selectedPackages.length > 0;
    }
    if (secId === 's5') {
      return doctorsList.length > 0;
    }
    if (secId === 's6') {
      return Object.values(resourceCount).some((v) => v !== '' && v !== null && v !== undefined);
    }
    return false;
  };

  const markSectionCompleted = (secId) => {
    setCompletedSections((prev) => (prev.includes(secId) ? prev : [...prev, secId]));
    setValidationError('');
  };

  const handleStepClick = (secId) => {
    setActiveSection(secId);
    setTouchedSections((prev) => (prev.includes(secId) ? prev : [...prev, secId]));
    setValidationError('');
  };

  const handleNextSection = (currentSecId) => {
    const error = validateSection(currentSecId);
    if (error) {
      setValidationError(error);
      return;
    }
    markSectionCompleted(currentSecId);

    const stepOrder = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const curIdx = stepOrder.indexOf(currentSecId);
    if (curIdx >= 0 && curIdx < stepOrder.length - 1) {
      const nextId = stepOrder[curIdx + 1];
      setActiveSection(nextId);
      setTouchedSections((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      for (const sec of INFRA_SECTIONS) {
        const err = validateSection(sec.id);
        if (err) {
          setValidationError(err);
          setActiveSection(sec.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
      setShowFinalModal(true);
    }
  };

  const handlePreviousSection = (currentSecId) => {
    setValidationError('');
    const stepOrder = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const curIdx = stepOrder.indexOf(currentSecId);
    if (curIdx > 0) {
      const prevId = stepOrder[curIdx - 1];
      setActiveSection(prevId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveDraft = async () => {
    setSaveSuccess(true);
    await saveToBackend();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetSection = (secId) => {
    if (secId === 's1') setHospInfo(INITIAL_HOSP_INFO);
    if (secId === 's2') setCapacity(INITIAL_CAPACITY);
    if (secId === 's3') setSelectedSpecialities([]);
    if (secId === 's4') setSelectedPackages([]);
    if (secId === 's5') setDoctorsList([]);
    if (secId === 's6') setResourceCount(INITIAL_RESOURCE_COUNT);
    setCompletedSections((prev) => prev.filter((id) => id !== secId));
    setResetToast(`Section ${secId.replace('s', '')} cleared successfully.`);
    setTimeout(() => setResetToast(''), 3000);
  };

  const handleFinalSubmit = async () => {
    for (const sec of INFRA_SECTIONS) {
      const err = validateSection(sec.id);
      if (err) {
        setValidationError(err);
        setShowSummary(false);
        setActiveSection(sec.id);
        setShowFinalModal(false);
        return;
      }
    }
    setCompletedSections(['s1', 's2', 's3', 's4', 's5', 's6']);
    setIsFinalSubmitted(true);
    setShowFinalModal(false);
    setShowSummary(true);
  };

  // Speciality toggle handler
  const handleToggleSpeciality = (specId) => {
    setSelectedSpecialities((prev) =>
      prev.includes(specId) ? prev.filter((id) => id !== specId) : [...prev, specId]
    );
  };

  // Filtered specialities based on search box
  const filteredSpecialities = useMemo(() => {
    const q = specialitySearch.toLowerCase().trim();
    if (!q) return ALL_26_SPECIALITIES;
    return ALL_26_SPECIALITIES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [specialitySearch]);

  // Filtered specialities for Doctor Modal
  const docModalFilteredSpecs = useMemo(() => {
    const q = docModalSpecSearch.toLowerCase().trim();
    if (!q) return ALL_26_SPECIALITIES;
    return ALL_26_SPECIALITIES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [docModalSpecSearch]);

  // Helper to parse availability
  const parseDoctorAvailability = (availStr) => {
    if (!availStr) {
      return {
        dutyType: 'Shift',
        startTime: '08:00',
        startPeriod: 'AM',
        endTime: '02:00',
        endPeriod: 'PM',
        availability: 'Shift (08:00 AM - 02:00 PM)',
      };
    }
    const lower = availStr.toLowerCase();
    if (lower.includes('on-call') || lower.includes('on call')) {
      return {
        dutyType: 'On-Call',
        startTime: '08:00',
        startPeriod: 'AM',
        endTime: '02:00',
        endPeriod: 'PM',
        availability: 'On-Call Specialist',
      };
    }
    const match = availStr.match(/(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
    if (match) {
      return {
        dutyType: 'Shift',
        startTime: match[1],
        startPeriod: match[2].toUpperCase(),
        endTime: match[3],
        endPeriod: match[4].toUpperCase(),
        availability: availStr,
      };
    }
    return {
      dutyType: 'Shift',
      startTime: '08:00',
      startPeriod: 'AM',
      endTime: '02:00',
      endPeriod: 'PM',
      availability: availStr,
    };
  };

  // Doctor modal helpers
  const handleOpenAddDoctor = () => {
    setEditingDocId(null);
    setDocFormData({
      name: '',
      speciality: 'General Medicine',
      doctorType: 'Both',
      qualification: '',
      experience: '',
      dutyType: 'Shift',
      startTime: '08:00',
      startPeriod: 'AM',
      endTime: '02:00',
      endPeriod: 'PM',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      availability: 'Shift (08:00 AM - 02:00 PM)',
      location: '',
      mobile: '',
      altMobile: '',
      address: '',
      city: hospInfo.city || 'Pune',
      district: hospInfo.district || 'Pune',
      taluka: hospInfo.areaTaluka || '',
      pincode: hospInfo.pincode || '',
      nearestLandmark: '',
    });
    setSelectedDocSpecialities(['General Medicine']);
    setIsDocSpecDropdownOpen(false);
    setDocModalSpecSearch('');
    setDocModalErrors({});
    setDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (doc) => {
    setEditingDocId(doc.id);
    const existingSpecs = (doc.speciality || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setSelectedDocSpecialities(existingSpecs.length > 0 ? existingSpecs : ['General Medicine']);
    
    const parsedTiming = parseDoctorAvailability(doc.availability);
    const parsedDays = Array.isArray(doc.workingDays)
      ? doc.workingDays
      : doc.availability?.match(/\[(.*?)\]/)?.[1]?.split(',').map((d) => d.trim()).filter(Boolean) || [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
        ];

    setDocFormData({
      name: doc.name || '',
      speciality: doc.speciality || 'General Medicine',
      doctorType: doc.doctorType || 'Both',
      qualification: doc.qualification || '',
      experience: doc.experience || '',
      dutyType: doc.dutyType || parsedTiming.dutyType,
      startTime: doc.startTime || parsedTiming.startTime,
      startPeriod: doc.startPeriod || parsedTiming.startPeriod,
      endTime: doc.endTime || parsedTiming.endTime,
      endPeriod: doc.endPeriod || parsedTiming.endPeriod,
      workingDays: parsedDays,
      availability: doc.availability || parsedTiming.availability,
      location: doc.location || '',
      mobile: doc.mobile || '',
      altMobile: doc.altMobile || '',
      address: doc.address || '',
      city: doc.city || 'Pune',
      district: doc.district || 'Pune',
      taluka: doc.taluka || '',
      pincode: doc.pincode || '',
      nearestLandmark: doc.nearestLandmark || '',
    });
    setIsDocSpecDropdownOpen(false);
    setDocModalSpecSearch('');
    setDocModalErrors({});
    setDoctorModalOpen(true);
  };

  const handleToggleDocSpeciality = (specName) => {
    setSelectedDocSpecialities((prev) => {
      const exists = prev.includes(specName);
      if (exists) {
        return prev.filter((s) => s !== specName);
      } else {
        return [...prev, specName];
      }
    });
  };

  const handleToggleWorkingDay = (day) => {
    setDocFormData((prev) => {
      const days = prev.workingDays || [];
      const exists = days.includes(day);
      const updated = exists ? days.filter((d) => d !== day) : [...days, day];
      return { ...prev, workingDays: updated };
    });
  };

  const handleAppendQualification = (qual) => {
    const current = (docFormData.qualification || '').trim();
    if (!current) {
      setDocFormData((prev) => ({ ...prev, qualification: qual }));
    } else {
      const parts = current.split(',').map((p) => p.trim());
      if (parts.includes(qual)) {
        const filtered = parts.filter((p) => p !== qual);
        setDocFormData((prev) => ({ ...prev, qualification: filtered.join(', ') }));
      } else {
        setDocFormData((prev) => ({ ...prev, qualification: `${current}, ${qual}` }));
      }
    }
  };

  // Select existing doctor from hospital master and autofill form
  const handleSelectExistingDoctor = (doc) => {
    if (!doc) return;
    const existingSpecs = (doc.speciality || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSelectedDocSpecialities(existingSpecs.length > 0 ? existingSpecs : ['General Medicine']);

    const parsedTiming = parseDoctorAvailability(doc.availability);
    const parsedDays = Array.isArray(doc.workingDays)
      ? doc.workingDays
      : doc.availability?.match(/\[(.*?)\]/)?.[1]?.split(',').map((d) => d.trim()).filter(Boolean) || [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
        ];

    setDocFormData({
      name: doc.name || '',
      speciality: doc.speciality || 'General Medicine',
      doctorType: doc.doctorType || 'Both',
      qualification: doc.qualification || 'MBBS',
      experience: doc.experience || '',
      dutyType: doc.dutyType || parsedTiming.dutyType,
      startTime: doc.startTime || parsedTiming.startTime,
      startPeriod: doc.startPeriod || parsedTiming.startPeriod,
      endTime: doc.endTime || parsedTiming.endTime,
      endPeriod: doc.endPeriod || parsedTiming.endPeriod,
      workingDays: parsedDays,
      availability: doc.availability || parsedTiming.availability,
      location: doc.location || '',
      mobile: doc.mobile || '',
      altMobile: doc.altMobile || '',
      address: doc.address || '',
      city: doc.city || hospInfo.city || 'Pune',
      district: doc.district || hospInfo.district || 'Pune',
      taluka: doc.taluka || hospInfo.areaTaluka || '',
      pincode: doc.pincode || hospInfo.pincode || '',
      nearestLandmark: doc.nearestLandmark || '',
    });

    if (doc.id && !String(doc.id).startsWith('doc-')) {
      setEditingDocId(doc.id);
    }
    setIsDocNameDropdownOpen(false);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!docFormData.name.trim()) return;

    // Mobile Validation
    const cleanMobile = (docFormData.mobile || '').replace(/\D/g, '');
    const newErrors = {};

    if (!cleanMobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number (starts with 6, 7, 8, or 9)';
    }

    if (docFormData.altMobile) {
      const cleanAlt = docFormData.altMobile.replace(/\D/g, '');
      if (cleanAlt.length > 0 && cleanAlt.length < 10) {
        newErrors.altMobile = 'Alternative contact must be at least 10 digits';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setDocModalErrors(newErrors);
      return;
    }

    const finalSpeciality =
      selectedDocSpecialities.length > 0
        ? selectedDocSpecialities.join(', ')
        : (docFormData.speciality || 'General Medicine');

    let finalAvailability = 'On-Call Specialist';
    if (docFormData.dutyType === 'Shift') {
      const sT = docFormData.startTime || '08:00';
      const sP = docFormData.startPeriod || 'AM';
      const eT = docFormData.endTime || '02:00';
      const eP = docFormData.endPeriod || 'PM';
      const daysStr =
        docFormData.workingDays && docFormData.workingDays.length > 0
          ? ` [${docFormData.workingDays.join(', ')}]`
          : '';
      finalAvailability = `Shift (${sT} ${sP} - ${eT} ${eP})${daysStr}`;
    }

    const doctorDataToSave = {
      ...docFormData,
      doctorType: docFormData.doctorType || 'Both',
      speciality: finalSpeciality,
      availability: finalAvailability,
    };

    let updatedList = [];
    if (editingDocId) {
      updatedList = doctorsList.map((d) => (d.id === editingDocId ? { ...d, ...doctorDataToSave } : d));
      setDoctorsList(updatedList);
      setHospitalMasterDoctors((prev) => prev.map((d) => (d.id === editingDocId ? { ...d, ...doctorDataToSave } : d)));
      if (!String(editingDocId).startsWith('doc-') && String(editingDocId).length >= 32) {
        doctorService.updateDoctor(editingDocId, doctorDataToSave).catch((err) => console.warn('Doctor direct update notice:', err.message));
      }
    } else {
      const newDocId = `doc-${Date.now()}`;
      const newDoc = {
        id: newDocId,
        ...doctorDataToSave,
      };
      updatedList = [...doctorsList, newDoc];
      setDoctorsList(updatedList);
      
      // Save doctor into main database table
      doctorService.addDoctor(doctorDataToSave).then((saved) => {
        if (saved && saved.id) {
          setDoctorsList((prev) => prev.map((d) => (d.id === newDocId ? { ...d, id: saved.id } : d)));
          setHospitalMasterDoctors((prev) => {
            const exists = prev.some((d) => d.id === saved.id || d.name.toLowerCase() === saved.name.toLowerCase());
            return exists ? prev.map((d) => (d.name.toLowerCase() === saved.name.toLowerCase() ? { ...d, ...saved } : d)) : [...prev, saved];
          });
        }
      }).catch((err) => console.warn('Doctor direct add notice:', err.message));
    }

    setDoctorModalOpen(false);
    saveToBackend({ doctorsList: updatedList });
  };

  const handleDeleteDoctor = (docId) => {
    const updated = doctorsList.filter((d) => d.id !== docId);
    setDoctorsList(updated);
    saveToBackend({ doctorsList: updated });
    if (docId && !String(docId).startsWith('doc-') && String(docId).length >= 32) {
      doctorService.deleteDoctor(docId).catch((err) => console.warn('Doctor direct delete notice:', err.message));
    }
  };

  const handleToggleDoctorStatus = (docId) => {
    const targetDoc = doctorsList.find((d) => d.id === docId);
    const newStatus = targetDoc?.status === 'Inactive' ? 'Active' : 'Inactive';
    const isActivating = newStatus === 'Active';

    const updated = doctorsList.map((d) =>
      d.id === docId
        ? { ...d, status: newStatus, isActive: isActivating, is_active: isActivating }
        : d
    );
    setDoctorsList(updated);
    setHospitalMasterDoctors((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, status: newStatus, isActive: isActivating, is_active: isActivating }
          : d
      )
    );
    saveToBackend({ doctorsList: updated });

    if (docId && !String(docId).startsWith('doc-')) {
      doctorService
        .updateDoctor(docId, {
          isActive: isActivating,
          is_active: isActivating,
          status: isActivating ? 'ACTIVE' : 'INACTIVE',
          availabilityStatus: isActivating ? 'Available' : 'Unavailable',
        })
        .catch((err) => console.warn('Doctor direct status toggle notice:', err.message));
    }
  };

  // Total Resource Count Sum
  const totalStaffCount = useMemo(() => {
    const n = parseInt(resourceCount.nursingStaff, 10) || 0;
    const p = parseInt(resourceCount.paramedicalStaff, 10) || 0;
    const s = parseInt(resourceCount.supportStaff, 10) || 0;
    return n + p + s;
  }, [resourceCount]);

  // Dynamic live validation check for each section
  const isSectionFilled = (secId) => !validateSection(secId);
  const completedCount = INFRA_SECTIONS.filter((s) => isSectionFilled(s.id)).length;

  const getSectionStatus = (secId, idx) => {
    const isFilled = isSectionFilled(secId);
    if (isFilled) return 'completed';

    const hasData = hasSectionData(secId);
    const wasVisited = touchedSections.includes(secId);
    const activeIdx = INFRA_SECTIONS.findIndex((s) => s.id === activeSection);
    const isPast = activeSection !== 'all' && idx < activeIdx;

    // A section is marked 'incomplete' ONLY if it has partial data entered,
    // or if the user visited it and navigated away,
    // or if the user skipped past it to a later step.
    if (hasData || (wasVisited && activeSection !== secId) || isPast) {
      return 'incomplete';
    }

    if (activeSection === secId) {
      return 'active';
    }

    // Otherwise it is an unvisited / upcoming step (neutral pending state)
    return 'pending';
  };

  const actualIncompleteCount = INFRA_SECTIONS.filter((s, i) => getSectionStatus(s.id, i) === 'incomplete').length;

  return (
    <div className="am-infra-page">
      {/* Toast Notifications */}
      {saveSuccess && (
        <div className="am-infra-success-toast">
          <div className="toast-icon"><Check size={18} /></div>
          <div className="toast-text">
            <strong>Draft Saved</strong>
            <span>Hospital facility draft saved successfully.</span>
          </div>
        </div>
      )}

      {resetToast && (
        <div className="am-infra-info-toast">
          <RotateCcw size={16} />
          <span>{resetToast}</span>
        </div>
      )}

      {/* 5-Step Progress Bar Card with Smart Incomplete / Completed status */}
      {!showSummary && (
        <div className="am-app-progress-card">
          <div className="am-progress-card-header">
            <div className="am-progress-title-wrap">
              <h3>Application Progress</h3>
              <div className="am-progress-badges">
                <span className="am-draft-pill">
                  <span className="am-draft-dot" /> Draft Saved
                </span>
                {actualIncompleteCount > 0 && (
                  <span className="am-incomplete-pill">
                    <AlertCircle size={12} /> {actualIncompleteCount} Incomplete
                  </span>
                )}
                <span className="am-completed-pill">
                  <Check size={12} /> {completedCount} / 5 Completed
                </span>
              </div>
            </div>

            <div className="am-progress-header-actions">
              {activeSection !== 'all' && (
                <button
                  type="button"
                  className="am-header-reset-btn"
                  onClick={() => handleResetSection(activeSection)}
                  title="Reset fields in active section"
                >
                  <RotateCcw size={13} />
                  <span>Reset Section</span>
                </button>
              )}

              <button
                type="button"
                className={`am-all-view-btn ${activeSection === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveSection(activeSection === 'all' ? 's1' : 'all')}
              >
                <LayoutGrid size={13} />
                <span>{activeSection === 'all' ? 'Wizard Mode' : 'Show All Sections'}</span>
              </button>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="am-stepper-container">
            {INFRA_SECTIONS.map((sec, idx) => {
              const status = getSectionStatus(sec.id, idx);
              const isActive = activeSection === sec.id;

              let itemStateClass = `is-${status}`;
              if (isActive && status !== 'active') {
                itemStateClass += ' is-active';
              }

              return (
                <React.Fragment key={sec.id}>
                  <div
                    className={`am-step-item ${itemStateClass}`}
                    onClick={() => handleStepClick(sec.id)}
                  >
                    <div className="am-step-circle">
                      {status === 'completed' ? <Check size={16} /> : sec.num}
                    </div>
                    <span className="am-step-label">{sec.title}</span>
                    {status === 'incomplete' && (
                      <span className="am-step-status-indicator">Incomplete</span>
                    )}
                  </div>

                  {idx < INFRA_SECTIONS.length - 1 && (
                    <div
                      className={`am-step-connector ${
                        status === 'completed'
                          ? 'is-completed'
                          : status === 'incomplete'
                          ? 'is-incomplete'
                          : 'is-pending'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="am-infra-error-toast" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <span style={{ flex: 1 }}>{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE: REVIEW SUMMARY (ALL 5 SECTIONS)
          ========================================================================= */}
      {showSummary ? (
        <div className="am-summary-wrap">
          <div className="am-summary-hero">
            <div className="am-summary-hero-left">
              <div className="am-summary-pill-row">
                <span className="am-summary-hero-pill">FACILITY PROFILE SUMMARY</span>
                {isFinalSubmitted && (
                  <span className="am-summary-hero-pill" style={{ background: '#059669', color: '#ffffff' }}>
                    <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    OFFICIALLY SUBMITTED
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0', color: '#ffffff' }}>
                {hospInfo.name || 'Hospital Infrastructure Overview'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0' }}>
                {hospInfo.address ? `${hospInfo.address}, ${hospInfo.city} - ${hospInfo.pincode}` : 'Verify all 6 infrastructure & clinical roster dimensions.'}
              </p>
            </div>

            {!isFinalSubmitted && (
              <div className="am-summary-hero-actions">
                <button
                  type="button"
                  className="am-summary-btn-secondary"
                  onClick={() => {
                    setShowSummary(false);
                    setActiveSection('s1');
                  }}
                >
                  <Pencil size={15} />
                  <span>Return to Questionnaire</span>
                </button>

                <button
                  type="button"
                  className="am-summary-btn-primary"
                  onClick={() => setShowFinalModal(true)}
                >
                  <Send size={15} />
                  <span>Final Submit Survey</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 1 Summary Card */}
          <div className={`am-summary-card ${inlineEditSection === 's1' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-blue-tint"><Building2 size={18} /></div>
                <div>
                  <h3>1. Hospital Information</h3>
                  <span>Registered Details & Location</span>
                </div>
              </div>
              {inlineEditSection === 's1' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="am-inline-cancel-btn"
                    onClick={() => setInlineEditSection(null)}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="am-inline-save-btn"
                    onClick={async () => {
                      const err = validateSection('s1');
                      if (err) {
                        setValidationError(err);
                        return;
                      }
                      await saveToBackend({ hospInfo });
                      setInlineEditSection(null);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                  >
                    <Check size={13} /> Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="am-section-edit-btn"
                  onClick={() => {
                    setValidationError('');
                    setInlineEditSection('s1');
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Section 1</span>
                </button>
              )}
            </div>

            <div className="am-summary-card-body">
              {inlineEditSection === 's1' ? (
                <div className="am-infra-form-body" style={{ padding: 0 }}>
                  {assignedHospitalData && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-autofill"
                        onClick={() => applyHospitalDetails(assignedHospitalData, true)}
                      >
                        <Sparkles size={14} />
                        <span>Auto-fill from Assigned Hospital</span>
                      </button>
                    </div>
                  )}

                  {/* Row 1: Hospital Name & Hospital Type */}
                  <div className="am-form-grid-two">
                    <div className="am-field-group">
                      <label className="am-field-label">
                        <span className="am-field-label-title">HOSPITAL NAME <span className="req-star">*</span></span>
                      </label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Sahyadri Super Specialty Hospital"
                        value={hospInfo.name}
                        onChange={(e) => setHospInfo({ ...hospInfo, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label">
                        <span className="am-field-label-title">HOSPITAL TYPE <span className="req-star">*</span></span>
                      </label>
                      <select
                        className="am-infra-select"
                        value={hospInfo.type}
                        onChange={(e) => setHospInfo({ ...hospInfo, type: e.target.value })}
                        required
                      >
                        <option value="">Select hospital ownership type...</option>
                        <option value="Government">Government / Public</option>
                        <option value="Private Multi-Specialty">Private Multi-Specialty</option>
                        <option value="Charitable Trust">Charitable Trust</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Full Street Address */}
                  <div className="am-form-grid-full" style={{ marginTop: '14px' }}>
                    <div className="am-field-group">
                      <label className="am-field-label">
                        <span className="am-field-label-title">FULL STREET ADDRESS (PLOT NO., ROAD, AREA) <span className="req-star">*</span></span>
                      </label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Plot 10, Karve Road, Deccan Gymkhana"
                        value={hospInfo.address}
                        onChange={(e) => setHospInfo({ ...hospInfo, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 3: City, District, Taluka */}
                  <div className="am-form-grid-three" style={{ marginTop: '14px' }}>
                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">CITY <span className="req-star">*</span></span></label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Pune"
                        value={hospInfo.city}
                        onChange={(e) => setHospInfo({ ...hospInfo, city: e.target.value })}
                        required
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">DISTRICT <span className="req-star">*</span></span></label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Pune"
                        value={hospInfo.district}
                        onChange={(e) => setHospInfo({ ...hospInfo, district: e.target.value })}
                        required
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">TALUKA / SUB-DISTRICT <span className="req-star">*</span></span></label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Haveli"
                        value={hospInfo.areaTaluka}
                        onChange={(e) => setHospInfo({ ...hospInfo, areaTaluka: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 4: Pincode, Nearest Landmark, Helpline */}
                  <div className="am-form-grid-three" style={{ marginTop: '14px' }}>
                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">PINCODE <span className="req-star">*</span></span></label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. 411004"
                        value={hospInfo.pincode}
                        onChange={(e) => setHospInfo({ ...hospInfo, pincode: e.target.value })}
                        required
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">NEAREST LANDMARK / STATION</span></label>
                      <input
                        type="text"
                        className="am-infra-input"
                        placeholder="e.g. Near Deccan Bus Stop (300m)"
                        value={hospInfo.nearestLandmark}
                        onChange={(e) => setHospInfo({ ...hospInfo, nearestLandmark: e.target.value })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">CONTACT HELPLINE / PHONE <span className="req-star">*</span></span></label>
                      <input
                        type="tel"
                        className="am-infra-input"
                        placeholder="e.g. +91 20 2553 4000"
                        value={hospInfo.contact}
                        onChange={(e) => setHospInfo({ ...hospInfo, contact: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="am-summary-kv-grid">
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Hospital Name</span><span className="am-summary-kv-val">{hospInfo.name || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Hospital Type</span><span className="am-summary-kv-val">{hospInfo.type || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Helpline / Phone</span><span className="am-summary-kv-val">{hospInfo.contact || '—'}</span></div>
                  <div className="am-summary-kv-item am-summary-kv-full"><span className="am-summary-kv-label">Full Street Address</span><span className="am-summary-kv-val">{hospInfo.address || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">City</span><span className="am-summary-kv-val">{hospInfo.city || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">District</span><span className="am-summary-kv-val">{hospInfo.district || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Taluka</span><span className="am-summary-kv-val">{hospInfo.areaTaluka || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Pincode</span><span className="am-summary-kv-val">{hospInfo.pincode || '—'}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Nearest Landmark</span><span className="am-summary-kv-val">{hospInfo.nearestLandmark || 'None'}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 Summary Card: Capacity */}
          <div className={`am-summary-card ${inlineEditSection === 's2' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-indigo-tint"><Bed size={18} /></div>
                <div>
                  <h3>2. Hospital Capacity</h3>
                  <span>IPD Wards, Diagnostic, Operative, Emergency & Blood Bank</span>
                </div>
              </div>
              {inlineEditSection === 's2' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="am-inline-cancel-btn"
                    onClick={() => setInlineEditSection(null)}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="am-inline-save-btn"
                    onClick={async () => {
                      const err = validateSection('s2');
                      if (err) {
                        setValidationError(err);
                        return;
                      }
                      await saveToBackend({ capacity });
                      setInlineEditSection(null);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                  >
                    <Check size={13} /> Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="am-section-edit-btn"
                  onClick={() => {
                    setValidationError('');
                    setInlineEditSection('s2');
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Capacity</span>
                </button>
              )}
            </div>

            <div className="am-summary-card-body">
              {inlineEditSection === 's2' ? (
                <div className="am-infra-form-body" style={{ padding: 0 }}>
                  {/* 2.1 IPD Capacity */}
                  <div className="am-form-sub-header">
                    <Bed size={16} className="text-blue-600" />
                    <h4>1. IPD (In-Patient Department) Capacity</h4>
                  </div>

                  <div className="am-form-grid-three">
                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">NUMBER OF WARDS <span className="req-star">*</span></span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 12"
                        value={capacity.ipd?.noOfWards}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, noOfWards: e.target.value } })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">TOTAL GENERAL BEDS <span className="req-star">*</span></span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 150"
                        value={capacity.ipd?.generalBeds}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, generalBeds: e.target.value } })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">TOTAL ICU UNITS <span className="req-star">*</span></span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 24"
                        value={capacity.ipd?.icuUnits}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, icuUnits: e.target.value } })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">NICU BEDS (NEONATAL ICU)</span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 10"
                        value={capacity.ipd?.nicuBeds}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, nicuBeds: e.target.value } })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">PICU BEDS (PEDIATRIC ICU)</span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 8"
                        value={capacity.ipd?.picuBeds}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, picuBeds: e.target.value } })}
                      />
                    </div>

                    <div className="am-field-group">
                      <label className="am-field-label"><span className="am-field-label-title">ISOLATION BEDS</span></label>
                      <input
                        type="number"
                        min="0"
                        className="am-infra-input"
                        placeholder="e.g. 6"
                        value={capacity.ipd?.isolationBeds}
                        onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, isolationBeds: e.target.value } })}
                      />
                    </div>
                  </div>

                  {/* 2.2 Diagnosis */}
                  <div className="am-form-sub-header" style={{ marginTop: '20px' }}>
                    <Activity size={16} className="text-emerald-600" />
                    <h4>2. Diagnosis & Imaging Modalities</h4>
                  </div>

                  <div className="am-spec-grid">
                    {[
                      { key: 'xray', label: 'X-Ray (Digital Radiography)', desc: 'Static & Mobile Digital X-Ray Units' },
                      { key: 'mri', label: 'MRI Scanner', desc: '1.5T / 3.0T Magnetic Resonance Imaging' },
                      { key: 'ultrasound', label: 'Ultra Sound (USG & 2D Echo)', desc: 'Sonography & Doppler Imaging Unit' },
                      { key: 'ctScan', label: 'CT Scan (Computed Tomography)', desc: 'Multi-slice CT Scanner' },
                      { key: 'ecg', label: 'ECG (Electrocardiogram)', desc: '12-lead diagnostic ECG machines' },
                      { key: 'endoscopy', label: 'Endoscopy & Colonoscopy Suite', desc: 'Video endoscope & GI diagnostic tower' },
                    ].map((item) => {
                      const isChecked = capacity.diagnosis?.[item.key]?.available === 'Yes';
                      return (
                        <div
                          key={item.key}
                          className={`am-facility-toggle-card ${isChecked ? 'is-checked' : ''}`}
                          onClick={() => {
                            setCapacity({
                              ...capacity,
                              diagnosis: {
                                ...capacity.diagnosis,
                                [item.key]: {
                                  ...capacity.diagnosis?.[item.key],
                                  available: isChecked ? 'No' : 'Yes',
                                  count: isChecked ? '' : (capacity.diagnosis?.[item.key]?.count || ''),
                                },
                              },
                            });
                          }}
                        >
                          <div className="am-facility-toggle-main">
                            <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                              {isChecked && <Check size={14} />}
                            </div>
                            <div className="am-facility-info">
                              <strong>{item.label}</strong>
                              <span className="am-facility-desc">{item.desc}</span>
                            </div>
                          </div>

                          {isChecked && (
                            <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="0"
                                className="am-facility-num-input"
                                placeholder="Count"
                                value={capacity.diagnosis?.[item.key]?.count || ''}
                                onChange={(e) =>
                                  setCapacity({
                                    ...capacity,
                                    diagnosis: {
                                      ...capacity.diagnosis,
                                      [item.key]: {
                                        ...capacity.diagnosis?.[item.key],
                                        available: 'Yes',
                                        count: e.target.value,
                                      },
                                    },
                                  })
                                }
                              />
                              <span className="am-count-unit-text">Units</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 2.3 Operative & 2.4 Emergency */}
                  <div className="am-form-grid-two" style={{ marginTop: '20px' }}>
                    {/* Operative */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <div className="am-form-sub-header" style={{ margin: '0 0 12px' }}>
                        <Stethoscope size={16} className="text-purple-600" />
                        <h4>3. Operative Facilities</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { key: 'operationTheatres', label: 'Operation Theatres (OT)', desc: 'Major & Minor Surgical Suites', unit: 'OTs' },
                          { key: 'recoveryBeds', label: 'Post-Op Recovery Beds / Wards', desc: 'Post-Anesthesia Care Beds', unit: 'Beds' },
                          { key: 'dialysisUnits', label: 'Dialysis Units / Beds', desc: 'Dialysis Stations & Equipment', unit: 'Units' },
                        ].map((item) => {
                          const isChecked = Boolean(
                            capacity.operative?.[`${item.key}Available`] !== undefined
                              ? capacity.operative[`${item.key}Available`]
                              : (capacity.operative?.[item.key] !== '' && capacity.operative?.[item.key] !== undefined && capacity.operative?.[item.key] !== null)
                          );
                          return (
                            <div
                              key={item.key}
                              className={`am-facility-toggle-card mini ${isChecked ? 'is-checked' : ''}`}
                              onClick={() => {
                                setCapacity({
                                  ...capacity,
                                  operative: {
                                    ...capacity.operative,
                                    [`${item.key}Available`]: !isChecked,
                                    [item.key]: !isChecked ? (capacity.operative?.[item.key] || '') : '',
                                  },
                                });
                              }}
                            >
                              <div className="am-facility-toggle-main">
                                <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                  {isChecked && <Check size={14} />}
                                </div>
                                <div className="am-facility-info">
                                  <strong>{item.label}</strong>
                                  <span className="am-facility-desc">{item.desc}</span>
                                </div>
                              </div>

                              {isChecked && (
                                <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min="0"
                                    className="am-facility-num-input"
                                    placeholder="Count"
                                    value={capacity.operative?.[item.key] || ''}
                                    onChange={(e) =>
                                      setCapacity({
                                        ...capacity,
                                        operative: {
                                          ...capacity.operative,
                                          [`${item.key}Available`]: true,
                                          [item.key]: e.target.value,
                                        },
                                      })
                                    }
                                  />
                                  <span className="am-count-unit-text">{item.unit}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Emergency */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <div className="am-form-sub-header" style={{ margin: '0 0 12px' }}>
                        <Activity size={16} className="text-red-600" />
                        <h4>4. Emergency Facilities</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { key: 'emergencyBeds', label: 'Emergency / Casualty Beds', desc: 'Triage & Acute Trauma Resuscitation', unit: 'Beds' },
                          { key: 'ambulances', label: 'Ambulances (Basic & Cardiac ICU)', desc: 'Equipped Emergency Response Vehicles', unit: 'Ambulances' },
                        ].map((item) => {
                          const isChecked = Boolean(
                            capacity.emergency?.[`${item.key}Available`] !== undefined
                              ? capacity.emergency[`${item.key}Available`]
                              : (capacity.emergency?.[item.key] !== '' && capacity.emergency?.[item.key] !== undefined && capacity.emergency?.[item.key] !== null)
                          );
                          return (
                            <div
                              key={item.key}
                              className={`am-facility-toggle-card mini ${isChecked ? 'is-checked' : ''}`}
                              onClick={() => {
                                setCapacity({
                                  ...capacity,
                                  emergency: {
                                    ...capacity.emergency,
                                    [`${item.key}Available`]: !isChecked,
                                    [item.key]: !isChecked ? (capacity.emergency?.[item.key] || '') : '',
                                  },
                                });
                              }}
                            >
                              <div className="am-facility-toggle-main">
                                <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                  {isChecked && <Check size={14} />}
                                </div>
                                <div className="am-facility-info">
                                  <strong>{item.label}</strong>
                                  <span className="am-facility-desc">{item.desc}</span>
                                </div>
                              </div>

                              {isChecked && (
                                <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min="0"
                                    className="am-facility-num-input"
                                    placeholder="Count"
                                    value={capacity.emergency?.[item.key] || ''}
                                    onChange={(e) =>
                                      setCapacity({
                                        ...capacity,
                                        emergency: {
                                          ...capacity.emergency,
                                          [`${item.key}Available`]: true,
                                          [item.key]: e.target.value,
                                        },
                                      })
                                    }
                                  />
                                  <span className="am-count-unit-text">{item.unit}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2.5 Blood Bank */}
                  <div className="am-form-sub-header" style={{ marginTop: '24px' }}>
                    <Droplet size={16} className="text-emerald-600" />
                    <h4>5. Blood Bank (Available Blood Groups)</h4>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="am-selected-count-badge" style={{ padding: '2px 10px', fontSize: '11.5px' }}>
                        {Object.values(capacity.bloodBank?.bloodGroups || {}).filter((v) =>
                          Boolean(v === true || v === 'Yes' || (typeof v === 'string' && v !== '' && v !== '0'))
                        ).length} / 8 Selected
                      </span>
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => {
                          const allTrue = {
                            'A+': true,
                            'A-': true,
                            'B+': true,
                            'B-': true,
                            'AB+': true,
                            'AB-': true,
                            'O+': true,
                            'O-': true,
                          };
                          setCapacity({
                            ...capacity,
                            bloodBank: { ...capacity.bloodBank, available: 'Yes', bloodGroups: allTrue },
                          });
                        }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => {
                          const allFalse = {
                            'A+': false,
                            'A-': false,
                            'B+': false,
                            'B-': false,
                            'AB+': false,
                            'AB-': false,
                            'O+': false,
                            'O-': false,
                          };
                          setCapacity({
                            ...capacity,
                            bloodBank: { ...capacity.bloodBank, bloodGroups: allFalse },
                          });
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="am-blood-groups-grid">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => {
                      const isChecked = Boolean(
                        capacity.bloodBank?.bloodGroups?.[grp] === true ||
                        capacity.bloodBank?.bloodGroups?.[grp] === 'Yes' ||
                        (typeof capacity.bloodBank?.bloodGroups?.[grp] === 'string' && capacity.bloodBank?.bloodGroups?.[grp] !== '' && capacity.bloodBank?.bloodGroups?.[grp] !== '0')
                      );
                      return (
                        <div
                          key={grp}
                          className={`am-blood-item-card ${isChecked ? 'is-checked' : ''}`}
                          onClick={() => {
                            setCapacity({
                              ...capacity,
                              bloodBank: {
                                ...capacity.bloodBank,
                                available: 'Yes',
                                bloodGroups: {
                                  ...capacity.bloodBank?.bloodGroups,
                                  [grp]: !isChecked,
                                },
                              },
                            });
                          }}
                        >
                          <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={14} />}
                          </div>
                          <span className="am-blood-name">{grp}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="am-capacity-summary-subgrid">
                  {/* IPD */}
                  <div className="am-cap-subcard">
                    <h4 className="am-cap-sub-title">IPD Capacity</h4>
                    <div className="am-cap-pill-row">
                      <span className="am-cap-pill"><strong>{capacity.ipd?.noOfWards || 0}</strong> Wards</span>
                      <span className="am-cap-pill"><strong>{capacity.ipd?.generalBeds || 0}</strong> General Beds</span>
                      <span className="am-cap-pill"><strong>{capacity.ipd?.icuUnits || 0}</strong> ICU Units</span>
                      <span className="am-cap-pill"><strong>{capacity.ipd?.nicuBeds || 0}</strong> NICU</span>
                      <span className="am-cap-pill"><strong>{capacity.ipd?.picuBeds || 0}</strong> PICU</span>
                      <span className="am-cap-pill"><strong>{capacity.ipd?.isolationBeds || 0}</strong> Isolation</span>
                    </div>
                  </div>

                  {/* Diagnostics */}
                  <div className="am-cap-subcard">
                    <h4 className="am-cap-sub-title">Diagnostics & Imaging</h4>
                    <div className="am-cap-pill-row">
                      {Object.entries(capacity.diagnosis || {}).filter(([_, d]) => d?.available === 'Yes').length > 0 ? (
                        Object.entries(capacity.diagnosis || {})
                          .filter(([_, d]) => d?.available === 'Yes')
                          .map(([key, d]) => (
                            <span key={key} className="am-cap-pill">
                              <Check size={12} style={{ color: '#059669', marginRight: '4px' }} />
                              {key === 'ctScan' ? 'CT Scan' : key === 'xray' ? 'X-Ray' : key.charAt(0).toUpperCase() + key.slice(1)}: <strong>{d?.count ? `${d.count} Units` : 'Available'}</strong>
                            </span>
                          ))
                      ) : (
                        <span className="am-cap-pill" style={{ color: '#94a3b8' }}>None Available / Selected</span>
                      )}
                    </div>
                  </div>

                  {/* Operative & Emergency */}
                  <div className="am-cap-subcard">
                    <h4 className="am-cap-sub-title">Operative & Emergency Facilities</h4>
                    <div className="am-cap-pill-row">
                      {capacity.operative?.operationTheatres ? <span className="am-cap-pill"><strong>{capacity.operative.operationTheatres}</strong> OTs</span> : null}
                      {capacity.operative?.recoveryBeds ? <span className="am-cap-pill"><strong>{capacity.operative.recoveryBeds}</strong> Recovery Beds</span> : null}
                      {capacity.operative?.dialysisUnits ? <span className="am-cap-pill"><strong>{capacity.operative.dialysisUnits}</strong> Dialysis Units</span> : null}
                      {capacity.emergency?.emergencyBeds ? <span className="am-cap-pill"><strong>{capacity.emergency.emergencyBeds}</strong> Emergency Beds</span> : null}
                      {capacity.emergency?.ambulances ? <span className="am-cap-pill"><strong>{capacity.emergency.ambulances}</strong> Ambulances</span> : null}
                      {!capacity.operative?.operationTheatres && !capacity.operative?.recoveryBeds && !capacity.operative?.dialysisUnits && !capacity.emergency?.emergencyBeds && !capacity.emergency?.ambulances && (
                        <span className="am-cap-pill" style={{ color: '#94a3b8' }}>None Configured</span>
                      )}
                    </div>
                  </div>

                  {/* Blood Bank */}
                  <div className="am-cap-subcard">
                    <h4 className="am-cap-sub-title">Blood Bank & Available Blood Groups</h4>
                    <div className="am-cap-pill-row">
                      {Object.entries(capacity.bloodBank?.bloodGroups || {}).filter(([_, v]) => Boolean(v === true || v === 'Yes' || (typeof v === 'string' && v !== '' && v !== '0'))).length > 0 ? (
                        Object.entries(capacity.bloodBank?.bloodGroups || {})
                          .filter(([_, v]) => Boolean(v === true || v === 'Yes' || (typeof v === 'string' && v !== '' && v !== '0')))
                          .map(([grp]) => (
                            <span key={grp} className="am-blood-badge">
                              <Droplet size={12} style={{ color: '#ef4444' }} />
                              <strong>{grp}</strong> Available
                            </span>
                          ))
                      ) : (
                        <span className="am-cap-pill" style={{ color: '#94a3b8' }}>No Blood Groups Selected</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3 Summary Card: 26 Specialities */}
          <div className={`am-summary-card ${inlineEditSection === 's3' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-emerald-tint"><Stethoscope size={18} /></div>
                <div>
                  <h3>3. Active Specialities ({selectedSpecialities.length}/26)</h3>
                  <span>Operating Clinical & Super-Specialty Departments</span>
                </div>
              </div>
              {inlineEditSection === 's3' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="am-inline-cancel-btn"
                    onClick={() => setInlineEditSection(null)}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="am-inline-save-btn"
                    onClick={async () => {
                      const err = validateSection('s3');
                      if (err) {
                        setValidationError(err);
                        return;
                      }
                      await saveToBackend({ selectedSpecialities });
                      setInlineEditSection(null);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                  >
                    <Check size={13} /> Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="am-section-edit-btn"
                  onClick={() => {
                    setValidationError('');
                    setInlineEditSection('s3');
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Specialities</span>
                </button>
              )}
            </div>

            <div className="am-summary-card-body">
              {inlineEditSection === 's3' ? (
                <div className="am-infra-form-body" style={{ padding: 0 }}>
                  <div className="am-spec-search-bar-wrap">
                    <div className="am-spec-search-input-box">
                      <Search size={18} className="am-spec-search-icon" />
                      <input
                        type="text"
                        className="am-spec-search-input"
                        placeholder="Search specialities (e.g. Pediatrics, Cardiology, Orthopedics, General Surgery)..."
                        value={specialitySearch}
                        onChange={(e) => setSpecialitySearch(e.target.value)}
                      />
                      {specialitySearch && (
                        <button
                          type="button"
                          className="am-spec-clear-search"
                          onClick={() => setSpecialitySearch('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="am-spec-quick-actions">
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        onClick={() => setSelectedSpecialities(ALL_26_SPECIALITIES.map((s) => s.id))}
                      >
                        Select All (26)
                      </button>
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        onClick={() => setSelectedSpecialities([])}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="am-specialities-checkbox-grid">
                    {filteredSpecialities.map((spec) => {
                      const isChecked = selectedSpecialities.includes(spec.id);
                      return (
                        <div
                          key={spec.id}
                          className={`am-spec-checkbox-card ${isChecked ? 'is-checked' : ''}`}
                          onClick={() => handleToggleSpeciality(spec.id)}
                        >
                          <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={14} />}
                          </div>

                          <div className="am-spec-card-labels">
                            <span className="am-spec-name">{spec.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="am-summary-chips-wrap">
                  {selectedSpecialities.map((id) => {
                    const spec = ALL_26_SPECIALITIES.find((s) => s.id === id);
                    if (!spec) return null;
                    return (
                      <div key={id} className="am-spec-tag-active">
                        <Check size={13} style={{ color: '#059669' }} />
                        <span>{spec.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 4 Summary Card: Packages */}
          <div className={`am-summary-card ${inlineEditSection === 's4' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-teal-tint"><Package size={18} /></div>
                <div>
                  <h3>4. Government Healthcare Scheme Packages ({selectedPackages.length} Selected)</h3>
                  <span>MJPJAY, PM-JAY & State Scheme Packages Mapped to Specialities</span>
                </div>
              </div>

              {inlineEditSection === 's4' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="am-inline-cancel-btn"
                    onClick={() => setInlineEditSection(null)}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="am-inline-save-btn"
                    onClick={async () => {
                      const err = validateSection('s4');
                      if (err) {
                        setValidationError(err);
                        return;
                      }
                      await saveToBackend({ selectedPackages });
                      setInlineEditSection(null);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                  >
                    <Check size={13} /> Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="am-section-edit-btn"
                  onClick={() => {
                    setValidationError('');
                    setInlineEditSection('s4');
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Packages</span>
                </button>
              )}
            </div>

            <div className="am-summary-card-body">
              {inlineEditSection === 's4' ? (
                <div className="am-infra-form-body" style={{ padding: 0 }}>
                  <div className="am-spec-search-bar-wrap">
                    <div className="am-spec-search-input-box">
                      <Search size={18} className="am-spec-search-icon" />
                      <input
                        type="text"
                        className="am-spec-search-input"
                        placeholder="Search packages by package code or package name (e.g. BM001, Thermal burns, Angioplasty)..."
                        value={packageSearch}
                        onChange={(e) => setPackageSearch(e.target.value)}
                      />
                      {packageSearch && (
                        <button
                          type="button"
                          className="am-spec-clear-search"
                          onClick={() => setPackageSearch('')}
                          title="Clear Search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="am-spec-quick-actions">
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        onClick={handleSelectAllForSelectedSpecialities}
                      >
                        <CheckSquare size={13} style={{ marginRight: '4px' }} />
                        Select All for Specialities
                      </button>
                      <button
                        type="button"
                        className="am-btn-ghost-sm"
                        onClick={() => setSelectedPackages([])}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="am-pkg-filter-tabs">
                    <button
                      type="button"
                      className={`am-pkg-filter-tab ${packageSpecialtyFilter === 'SELECTED' ? 'active' : ''}`}
                      onClick={() => setPackageSpecialtyFilter('SELECTED')}
                    >
                      <Layers size={13} />
                      <span>Selected Specialities ({selectedSpecialityNames.length})</span>
                    </button>
                  </div>

                  {filteredPackagesGrouped.map((group, groupIdx) => {
                    const specPackages = group.packages || [];
                    const selectedInSpec = specPackages.filter((p) =>
                      selectedPackages.includes(p.package_code || p.id)
                    );
                    const isAllInSpecSelected =
                      specPackages.length > 0 && selectedInSpec.length === specPackages.length;
                    const isOpen = isSpecialtyOpen(group.specialty, groupIdx);

                    return (
                      <div key={group.specialty} className={`am-pkg-spec-accordion-card ${isOpen ? 'is-open' : 'is-collapsed'}`}>
                        <div className="am-pkg-spec-header">
                          <div className="am-pkg-spec-title-group" onClick={() => handleToggleSpecialtyOpen(group.specialty, groupIdx)} style={{ cursor: 'pointer' }}>
                            <div className="am-pkg-spec-badge">{group.specialty_code || 'SPEC'}</div>
                            <div>
                              <h4 className="am-pkg-spec-name">{group.specialty}</h4>
                              <span className="am-pkg-spec-count-sub">
                                {selectedInSpec.length} of {group.totalCount || specPackages.length} packages selected
                              </span>
                            </div>
                          </div>

                          {/* Search option in the middle between Speciality Name and Right Actions */}
                          <div className="am-pkg-spec-header-search-wrap">
                            <Search size={14} className="am-pkg-spec-search-icon" />
                            <input
                              type="text"
                              className="am-pkg-spec-search-input"
                              placeholder={`Search in ${group.specialty}...`}
                              value={specialtySearchMap[group.specialty] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSpecialtySearchMap((prev) => ({
                                  ...prev,
                                  [group.specialty]: val,
                                }));
                              }}
                            />
                            {specialtySearchMap[group.specialty] && (
                              <button
                                type="button"
                                className="am-pkg-spec-clear-search-btn"
                                onClick={() =>
                                  setSpecialtySearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: '',
                                  }))
                                }
                                title="Clear search"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Right Action Group: Select All + Chevron Arrow to the right */}
                          <div className="am-pkg-spec-header-actions">
                            <button
                              type="button"
                              className={`am-pkg-select-all-spec-btn ${isAllInSpecSelected ? 'all-active' : ''}`}
                              onClick={() => handleSelectAllSpecialtyPackages(specPackages)}
                            >
                              {isAllInSpecSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                              <span>{isAllInSpecSelected ? 'Deselect Specialty' : 'Select All'}</span>
                            </button>

                            {/* Down / Up Arrow to open & close packages on right of select all */}
                            <button
                              type="button"
                              className={`am-pkg-spec-collapse-toggle-btn ${isOpen ? 'is-open' : ''}`}
                              onClick={() => handleToggleSpecialtyOpen(group.specialty, groupIdx)}
                              title={isOpen ? 'Collapse packages' : 'Expand packages'}
                            >
                              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="am-pkg-procedures-grid">
                            {specPackages.map((pkg) => {
                              const pkgId = pkg.package_code || pkg.id;
                              const isChecked = selectedPackages.includes(pkgId);
                              return (
                                <div
                                  key={pkgId}
                                  className={`am-pkg-procedure-card ${isChecked ? 'is-checked' : ''}`}
                                  onClick={() => handleTogglePackage(pkgId)}
                                >
                                  <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                    {isChecked && <Check size={14} />}
                                  </div>
                                  <div className="am-pkg-proc-info">
                                    <div className="am-pkg-code-row">
                                      <span className="am-pkg-code-pill">{pkg.package_code}</span>
                                    </div>
                                    <span className="am-pkg-proc-name">{pkg.package_name}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {selectedPackages.length > 0 ? (
                    <div className="am-summary-packages-overview">
                      <div className="am-summary-pkg-stat-bar">
                        <span className="am-summary-pkg-count-pill">
                          <strong>{selectedPackages.length}</strong> Scheme Packages Activated
                        </span>
                      </div>
                      <div className="am-summary-pkg-chips-wrap">
                        {Object.entries(packagesDataMap).map(([specName, specData]) => {
                          const rawList = specData.procedures || specData.packages || [];
                          const seen = new Set();
                          const pkgsInSpec = [];
                          rawList.forEach((p) => {
                            const code = (p.package_code || p.procedure_code || p.id || '').trim();
                            const name = (p.package_name || p.procedure_name || '').trim();
                            const key = `${code}__${name}`;
                            if (!seen.has(key) && selectedPackages.includes(code)) {
                              seen.add(key);
                              pkgsInSpec.push({ package_code: code, package_name: name });
                            }
                          });

                          if (pkgsInSpec.length === 0) return null;
                          return (
                            <div key={specName} className="am-summary-pkg-spec-box">
                              <div className="am-summary-pkg-spec-header">
                                <span className="am-summary-pkg-spec-title">{specName}</span>
                                <span className="am-summary-pkg-spec-badge">{pkgsInSpec.length} packages</span>
                              </div>
                              <div className="am-summary-pkg-proc-list">
                                {pkgsInSpec.map((p) => (
                                  <span key={p.package_code} className="am-pkg-summary-pill">
                                    <code>{p.package_code}</code>
                                    <span>{p.package_name}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="am-empty-specialities" style={{ padding: '16px' }}>
                      <p style={{ color: '#94a3b8', margin: 0 }}>No treatment packages selected.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 5 Summary Card: Doctors */}
          <div className={`am-summary-card ${inlineEditSection === 's5' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-purple-tint"><Users size={18} /></div>
                <div>
                  <h3>5. Doctors ({doctorsList.length} Registered)</h3>
                  <span>Attending Medical Specialists & Duty Timing</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-autofill"
                  style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '5px 12px', fontSize: '12px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
                  onClick={handleOpenAddDoctor}
                >
                  <Plus size={14} />
                  <span>Add Doctor</span>
                </button>

                {inlineEditSection === 's5' ? (
                  <>
                    <button
                      type="button"
                      className="am-inline-cancel-btn"
                      onClick={() => setInlineEditSection(null)}
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="am-inline-save-btn"
                      onClick={async () => {
                        const err = validateSection('s5');
                        if (err) {
                          setValidationError(err);
                          return;
                        }
                        await saveToBackend({ doctorsList });
                        setInlineEditSection(null);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 2500);
                      }}
                    >
                      <Check size={13} /> Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="am-section-edit-btn"
                    onClick={() => {
                      setValidationError('');
                      setInlineEditSection('s5');
                    }}
                  >
                    <Pencil size={13} />
                    <span>Edit Doctors</span>
                  </button>
                )}
              </div>
            </div>

            <div className="am-summary-card-body">
              {doctorsList.length > 0 ? (
                <div className="am-doctors-table-container">
                  <table className="am-doctors-table">
                    <thead>
                      <tr>
                        <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                        <th>DOCTOR & SPECIALITY</th>
                        <th>QUALIFICATION & EXP</th>
                        <th>DUTY DAYS</th>
                        <th>CONTACT PHONE</th>
                        <th style={{ width: '170px', textAlign: 'center' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorsList.map((doc, idx) => (
                        <tr
                          key={doc.id}
                          className={`am-doc-table-row ${doc.status === 'Inactive' ? 'is-inactive-doctor' : ''}`}
                          onClick={() => setViewingDoc(doc)}
                          title={`Click to view doctor details${doc.status === 'Inactive' ? ' (Inactive)' : ''}`}
                        >
                          {/* Sr No */}
                          <td className="am-doc-td-idx" style={{ textAlign: 'center' }}>
                            <span className="am-doc-idx-badge">{idx + 1}</span>
                          </td>

                          {/* Doctor Name & Speciality */}
                          <td className="am-doc-td-primary">
                            <div className="am-doc-table-name-cell">
                              <div className="am-doc-table-avatar">
                                <Stethoscope size={16} />
                              </div>
                              <div className="am-doc-table-name-info">
                                <strong className="am-doc-table-name">{doc.name}</strong>
                                <div className="am-doc-table-spec-chips">
                                  {(doc.speciality || 'General Medicine')
                                    .split(',')
                                    .map((sp, sIdx) => (
                                      <span key={sIdx} className="am-doc-spec-mini-pill">
                                        {sp.trim()}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Qualification & Experience */}
                          <td>
                            <div className="am-doc-td-qual-cell">
                              <span className="am-doc-qual-text">{doc.qualification || 'MBBS'}</span>
                              {doc.experience && (
                                <span className="am-doc-exp-badge">
                                  <Activity size={11} /> {doc.experience}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Duty Days Only */}
                          <td>
                            <div className="am-doc-td-shift-cell">
                              <span className="am-doc-days-pill">
                                <Calendar size={12} /> {getDoctorDutyDays(doc)}
                              </span>
                            </div>
                          </td>

                          {/* Contact Phone & City */}
                          <td>
                            <div className="am-doc-td-contact-cell">
                              <div className="am-doc-contact-item">
                                <Phone size={12} className="text-slate-500" />
                                <span className="am-doc-phone-val">{doc.mobile || '—'}</span>
                              </div>
                              {(doc.district || doc.address) && (
                                <div className="am-doc-address-item" title={doc.address}>
                                  <MapPin size={11} className="text-slate-400" />
                                  <span>
                                    {doc.taluka ? `${doc.taluka}, ` : ''}{doc.district || doc.city || 'Pune'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions Group: View (Eye), Edit (Pencil), Active/Inactive Toggle */}
                          <td className="am-doc-td-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="am-doc-table-actions-group">
                              {/* View (Eye) */}
                              <button
                                type="button"
                                className="am-doc-tbl-action-btn view"
                                title="View Doctor Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingDoc(doc);
                                }}
                              >
                                <Eye size={15} />
                              </button>

                              {/* Edit (Pencil) */}
                              <button
                                type="button"
                                className="am-doc-tbl-action-btn edit"
                                title="Edit Doctor"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditDoctor(doc);
                                }}
                              >
                                <Pencil size={15} />
                              </button>

                              {/* Active / Inactive Status Toggle */}
                              <button
                                type="button"
                                className={`am-doc-status-pill-btn ${doc.status !== 'Inactive' ? 'active' : 'inactive'}`}
                                title={`Status: ${doc.status !== 'Inactive' ? 'Active on Duty' : 'Inactive'}. Click to toggle.`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDoctorStatus(doc.id);
                                }}
                              >
                                <span className="am-status-dot" />
                                <span>{doc.status !== 'Inactive' ? 'Active' : 'Inactive'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="am-empty-doctors-notice">
                  <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                  <h4>No Doctors Registered Yet</h4>
                  <p>Click "Add Doctor" above to add doctors to the hospital roster.</p>
                  <button type="button" className="btn-progress-ghost" onClick={handleOpenAddDoctor}>
                    <Plus size={14} /> Add Doctor
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 6 Summary Card: Resource Count */}
          <div className={`am-summary-card ${inlineEditSection === 's6' ? 'is-editing' : ''}`}>
            <div className="am-summary-card-header">
              <div className="am-summary-card-title-group">
                <div className="hdr-icon bg-amber-tint"><LayoutGrid size={18} /></div>
                <div>
                  <h3>6. Resource & Workforce Count</h3>
                  <span>Total Staff Strength: {totalStaffCount} Personnel</span>
                </div>
              </div>
              {inlineEditSection === 's6' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="am-inline-cancel-btn"
                    onClick={() => setInlineEditSection(null)}
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="am-inline-save-btn"
                    onClick={async () => {
                      const err = validateSection('s6');
                      if (err) {
                        setValidationError(err);
                        return;
                      }
                      await saveToBackend({ resourceCount });
                      setInlineEditSection(null);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                  >
                    <Check size={13} /> Save Changes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="am-section-edit-btn"
                  onClick={() => {
                    setValidationError('');
                    setInlineEditSection('s6');
                  }}
                >
                  <Pencil size={13} />
                  <span>Edit Resource Count</span>
                </button>
              )}
            </div>

            <div className="am-summary-card-body">
              {inlineEditSection === 's6' ? (
                <div className="am-infra-form-body" style={{ padding: 0 }}>
                  <div className="am-workforce-stacked-list">
                    {/* 1. Nursing Staff */}
                    <div className="am-workforce-row-card">
                      <div className="am-workforce-row-label">
                        <span className="am-workforce-row-title">
                          NURSING STAFF (REGISTERED NURSES / GNM) <span className="req-star">*</span>
                        </span>
                      </div>
                      <div className="am-workforce-row-input-wrap">
                        <input
                          type="number"
                          min="0"
                          className="am-workforce-compact-input"
                          placeholder="e.g. 60"
                          value={resourceCount.nursingStaff}
                          onChange={(e) => setResourceCount({ ...resourceCount, nursingStaff: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 3. Paramedical Staff */}
                    <div className="am-workforce-row-card">
                      <div className="am-workforce-row-label">
                        <span className="am-workforce-row-title">
                          PARAMEDICAL & LAB TECHNICIANS
                        </span>
                      </div>
                      <div className="am-workforce-row-input-wrap">
                        <input
                          type="number"
                          min="0"
                          className="am-workforce-compact-input"
                          placeholder="e.g. 18"
                          value={resourceCount.paramedicalStaff}
                          onChange={(e) => setResourceCount({ ...resourceCount, paramedicalStaff: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 4. Support Staff */}
                    <div className="am-workforce-row-card">
                      <div className="am-workforce-row-label">
                        <span className="am-workforce-row-title">
                          SUPPORT & WARD BOYS
                        </span>
                      </div>
                      <div className="am-workforce-row-input-wrap">
                        <input
                          type="number"
                          min="0"
                          className="am-workforce-compact-input"
                          placeholder="e.g. 30"
                          value={resourceCount.supportStaff}
                          onChange={(e) => setResourceCount({ ...resourceCount, supportStaff: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="am-summary-kv-grid">
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Nursing Staff</span><span className="am-summary-kv-val">{resourceCount.nursingStaff || 0}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Paramedical Staff</span><span className="am-summary-kv-val">{resourceCount.paramedicalStaff || 0}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Support Staff</span><span className="am-summary-kv-val">{resourceCount.supportStaff || 0}</span></div>
                  <div className="am-summary-kv-item"><span className="am-summary-kv-label">Total Healthcare Workforce</span><span className="am-summary-kv-val" style={{ color: '#059669', fontWeight: 800 }}>{totalStaffCount} Personnel</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            QUESTIONNAIRE SECTIONS (SECTIONS 1 TO 5)
            ========================================================================= */
        <div className="am-infra-sections-container">
          {/* --------------------------------------------------------------------------
             SECTION 1: Hospital Information
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's1') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-blue-tint"><Building2 size={18} /></div>
                  <div>
                    <h3>1. Hospital Information</h3>
                    <span className="hdr-sub">Basic Contact & Location Details</span>
                  </div>
                </div>
                {assignedHospitalData && (
                  <button
                    type="button"
                    className="btn-autofill"
                    onClick={() => applyHospitalDetails(assignedHospitalData, true)}
                  >
                    <Sparkles size={14} />
                    <span>Auto-fill from Assigned Hospital</span>
                  </button>
                )}
              </div>

              <div className="am-infra-form-body">
                {/* Row 1: Hospital Name & Hospital Type */}
                <div className="am-form-grid-two">
                  <div className="am-field-group">
                    <label className="am-field-label">
                      <span className="am-field-label-title">HOSPITAL NAME <span className="req-star">*</span></span>
                    </label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Sahyadri Super Specialty Hospital"
                      value={hospInfo.name}
                      onChange={(e) => setHospInfo({ ...hospInfo, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label">
                      <span className="am-field-label-title">HOSPITAL TYPE <span className="req-star">*</span></span>
                    </label>
                    <select
                      className="am-infra-select"
                      value={hospInfo.type}
                      onChange={(e) => setHospInfo({ ...hospInfo, type: e.target.value })}
                      required
                    >
                      <option value="">Select hospital ownership type...</option>
                      <option value="Government">Government / Public</option>
                      <option value="Private Multi-Specialty">Private Multi-Specialty</option>
                      <option value="Charitable Trust">Charitable Trust</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Full Street Address */}
                <div className="am-form-grid-full">
                  <div className="am-field-group">
                    <label className="am-field-label">
                      <span className="am-field-label-title">FULL STREET ADDRESS (PLOT NO., ROAD, AREA) <span className="req-star">*</span></span>
                    </label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Plot 10, Karve Road, Deccan Gymkhana"
                      value={hospInfo.address}
                      onChange={(e) => setHospInfo({ ...hospInfo, address: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Row 3: City, District, Taluka */}
                <div className="am-form-grid-three">
                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">CITY <span className="req-star">*</span></span></label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Pune"
                      value={hospInfo.city}
                      onChange={(e) => setHospInfo({ ...hospInfo, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">DISTRICT <span className="req-star">*</span></span></label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Pune"
                      value={hospInfo.district}
                      onChange={(e) => setHospInfo({ ...hospInfo, district: e.target.value })}
                      required
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">TALUKA / SUB-DISTRICT <span className="req-star">*</span></span></label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Haveli"
                      value={hospInfo.areaTaluka}
                      onChange={(e) => setHospInfo({ ...hospInfo, areaTaluka: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Pincode, Nearest Landmark, Helpline */}
                <div className="am-form-grid-three">
                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">PINCODE <span className="req-star">*</span></span></label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. 411004"
                      value={hospInfo.pincode}
                      onChange={(e) => setHospInfo({ ...hospInfo, pincode: e.target.value })}
                      required
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">NEAREST LANDMARK / STATION</span></label>
                    <input
                      type="text"
                      className="am-infra-input"
                      placeholder="e.g. Near Deccan Bus Stop (300m)"
                      value={hospInfo.nearestLandmark}
                      onChange={(e) => setHospInfo({ ...hospInfo, nearestLandmark: e.target.value })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">CONTACT HELPLINE / PHONE <span className="req-star">*</span></span></label>
                    <input
                      type="tel"
                      className="am-infra-input"
                      placeholder="e.g. +91 20 2553 4000"
                      value={hospInfo.contact}
                      onChange={(e) => setHospInfo({ ...hospInfo, contact: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                    <Save size={15} /> Save Draft
                  </button>
                  <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s1')}>
                    <span>Next: Hospital Capacity</span> <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------------
             SECTION 2: Capacity (IPD, Diagnosis, Operative, Emergency, Blood Bank)
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's2') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-indigo-tint"><Bed size={18} /></div>
                  <div>
                    <h3>2. Hospital Capacity</h3>
                    <span className="hdr-sub">IPD Units, Diagnostic Modalities, Operative OTs, Emergency & Blood Bank</span>
                  </div>
                </div>
                <span className="am-sec-tag indigo-tag">Facility Capacities</span>
              </div>

              <div className="am-infra-form-body">
                {/* 2.1 IPD Capacity */}
                <div className="am-form-sub-header">
                  <Bed size={16} className="text-blue-600" />
                  <h4>1. IPD (In-Patient Department) Capacity</h4>
                </div>

                <div className="am-form-grid-three">
                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">NUMBER OF WARDS <span className="req-star">*</span></span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 12"
                      value={capacity.ipd?.noOfWards}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, noOfWards: e.target.value } })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">TOTAL GENERAL BEDS <span className="req-star">*</span></span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 150"
                      value={capacity.ipd?.generalBeds}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, generalBeds: e.target.value } })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">TOTAL ICU UNITS <span className="req-star">*</span></span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 24"
                      value={capacity.ipd?.icuUnits}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, icuUnits: e.target.value } })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">NICU BEDS (NEONATAL ICU)</span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 10"
                      value={capacity.ipd?.nicuBeds}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, nicuBeds: e.target.value } })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">PICU BEDS (PEDIATRIC ICU)</span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 8"
                      value={capacity.ipd?.picuBeds}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, picuBeds: e.target.value } })}
                    />
                  </div>

                  <div className="am-field-group">
                    <label className="am-field-label"><span className="am-field-label-title">ISOLATION BEDS</span></label>
                    <input
                      type="number"
                      min="0"
                      className="am-infra-input"
                      placeholder="e.g. 6"
                      value={capacity.ipd?.isolationBeds}
                      onChange={(e) => setCapacity({ ...capacity, ipd: { ...capacity.ipd, isolationBeds: e.target.value } })}
                    />
                  </div>
                </div>

                {/* 2.2 Diagnosis */}
                <div className="am-form-sub-header" style={{ marginTop: '20px' }}>
                  <Activity size={16} className="text-emerald-600" />
                  <h4>2. Diagnosis & Imaging Modalities</h4>
                </div>

                <div className="am-spec-grid">
                  {[
                    { key: 'xray', label: 'X-Ray (Digital Radiography)', desc: 'Static & Mobile Digital X-Ray Units' },
                    { key: 'mri', label: 'MRI Scanner', desc: '1.5T / 3.0T Magnetic Resonance Imaging' },
                    { key: 'ultrasound', label: 'Ultra Sound (USG & 2D Echo)', desc: 'Sonography & Doppler Imaging Unit' },
                    { key: 'ctScan', label: 'CT Scan (Computed Tomography)', desc: 'Multi-slice CT Scanner' },
                    { key: 'ecg', label: 'ECG (Electrocardiogram)', desc: '12-lead diagnostic ECG machines' },
                    { key: 'endoscopy', label: 'Endoscopy & Colonoscopy Suite', desc: 'Video endoscope & GI diagnostic tower' },
                  ].map((item) => {
                    const isChecked = capacity.diagnosis?.[item.key]?.available === 'Yes';
                    return (
                      <div
                        key={item.key}
                        className={`am-facility-toggle-card ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => {
                          setCapacity({
                            ...capacity,
                            diagnosis: {
                              ...capacity.diagnosis,
                              [item.key]: {
                                ...capacity.diagnosis?.[item.key],
                                available: isChecked ? 'No' : 'Yes',
                                count: isChecked ? '' : (capacity.diagnosis?.[item.key]?.count || ''),
                              },
                            },
                          });
                        }}
                      >
                        <div className="am-facility-toggle-main">
                          <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={14} />}
                          </div>
                          <div className="am-facility-info">
                            <strong>{item.label}</strong>
                            <span className="am-facility-desc">{item.desc}</span>
                          </div>
                        </div>

                        {isChecked && (
                          <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min="0"
                              className="am-facility-num-input"
                              placeholder="Count"
                              value={capacity.diagnosis?.[item.key]?.count || ''}
                              onChange={(e) =>
                                setCapacity({
                                  ...capacity,
                                  diagnosis: {
                                    ...capacity.diagnosis,
                                    [item.key]: {
                                      ...capacity.diagnosis?.[item.key],
                                      available: 'Yes',
                                      count: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                            <span className="am-count-unit-text">Units</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2.3 Operative & 2.4 Emergency */}
                <div className="am-form-grid-two" style={{ marginTop: '20px' }}>
                  {/* Operative */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div className="am-form-sub-header" style={{ margin: '0 0 12px' }}>
                      <Stethoscope size={16} className="text-purple-600" />
                      <h4>3. Operative Facilities</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { key: 'operationTheatres', label: 'Operation Theatres (OT)', desc: 'Major & Minor Surgical Suites', unit: 'OTs' },
                        { key: 'recoveryBeds', label: 'Post-Op Recovery Beds / Wards', desc: 'Post-Anesthesia Care Beds', unit: 'Beds' },
                        { key: 'dialysisUnits', label: 'Dialysis Units / Beds', desc: 'Dialysis Stations & Equipment', unit: 'Units' },
                      ].map((item) => {
                        const isChecked = Boolean(
                          capacity.operative?.[`${item.key}Available`] !== undefined
                            ? capacity.operative[`${item.key}Available`]
                            : (capacity.operative?.[item.key] !== '' && capacity.operative?.[item.key] !== undefined && capacity.operative?.[item.key] !== null)
                        );
                        return (
                          <div
                            key={item.key}
                            className={`am-facility-toggle-card mini ${isChecked ? 'is-checked' : ''}`}
                            onClick={() => {
                              setCapacity({
                                ...capacity,
                                operative: {
                                  ...capacity.operative,
                                  [`${item.key}Available`]: !isChecked,
                                  [item.key]: !isChecked ? (capacity.operative?.[item.key] || '') : '',
                                },
                              });
                            }}
                          >
                            <div className="am-facility-toggle-main">
                              <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                {isChecked && <Check size={14} />}
                              </div>
                              <div className="am-facility-info">
                                <strong>{item.label}</strong>
                                <span className="am-facility-desc">{item.desc}</span>
                              </div>
                            </div>

                            {isChecked && (
                              <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min="0"
                                  className="am-facility-num-input"
                                  placeholder="Count"
                                  value={capacity.operative?.[item.key] || ''}
                                  onChange={(e) =>
                                    setCapacity({
                                      ...capacity,
                                      operative: {
                                        ...capacity.operative,
                                        [`${item.key}Available`]: true,
                                        [item.key]: e.target.value,
                                      },
                                    })
                                  }
                                />
                                <span className="am-count-unit-text">{item.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Emergency */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div className="am-form-sub-header" style={{ margin: '0 0 12px' }}>
                      <Activity size={16} className="text-red-600" />
                      <h4>4. Emergency Facilities</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { key: 'emergencyBeds', label: 'Emergency / Casualty Beds', desc: 'Triage & Acute Trauma Resuscitation', unit: 'Beds' },
                        { key: 'ambulances', label: 'Ambulances (Basic & Cardiac ICU)', desc: 'Equipped Emergency Response Vehicles', unit: 'Ambulances' },
                      ].map((item) => {
                        const isChecked = Boolean(
                          capacity.emergency?.[`${item.key}Available`] !== undefined
                            ? capacity.emergency[`${item.key}Available`]
                            : (capacity.emergency?.[item.key] !== '' && capacity.emergency?.[item.key] !== undefined && capacity.emergency?.[item.key] !== null)
                        );
                        return (
                          <div
                            key={item.key}
                            className={`am-facility-toggle-card mini ${isChecked ? 'is-checked' : ''}`}
                            onClick={() => {
                              setCapacity({
                                ...capacity,
                                emergency: {
                                  ...capacity.emergency,
                                  [`${item.key}Available`]: !isChecked,
                                  [item.key]: !isChecked ? (capacity.emergency?.[item.key] || '') : '',
                                },
                              });
                            }}
                          >
                            <div className="am-facility-toggle-main">
                              <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                {isChecked && <Check size={14} />}
                              </div>
                              <div className="am-facility-info">
                                <strong>{item.label}</strong>
                                <span className="am-facility-desc">{item.desc}</span>
                              </div>
                            </div>

                            {isChecked && (
                              <div className="am-facility-count-box" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min="0"
                                  className="am-facility-num-input"
                                  placeholder="Count"
                                  value={capacity.emergency?.[item.key] || ''}
                                  onChange={(e) =>
                                    setCapacity({
                                      ...capacity,
                                      emergency: {
                                        ...capacity.emergency,
                                        [`${item.key}Available`]: true,
                                        [item.key]: e.target.value,
                                      },
                                    })
                                  }
                                />
                                <span className="am-count-unit-text">{item.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2.5 Blood Bank */}
                <div className="am-form-sub-header" style={{ marginTop: '24px' }}>
                  <Droplet size={16} className="text-emerald-600" />
                  <h4>5. Blood Bank (Available Blood Groups)</h4>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="am-selected-count-badge" style={{ padding: '2px 10px', fontSize: '11.5px' }}>
                      {Object.values(capacity.bloodBank?.bloodGroups || {}).filter((v) =>
                        Boolean(v === true || v === 'Yes' || (typeof v === 'string' && v !== '' && v !== '0'))
                      ).length} / 8 Selected
                    </span>
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => {
                        const allTrue = {
                          'A+': true,
                          'A-': true,
                          'B+': true,
                          'B-': true,
                          'AB+': true,
                          'AB-': true,
                          'O+': true,
                          'O-': true,
                        };
                        setCapacity({
                          ...capacity,
                          bloodBank: { ...capacity.bloodBank, available: 'Yes', bloodGroups: allTrue },
                        });
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => {
                        const allFalse = {
                          'A+': false,
                          'A-': false,
                          'B+': false,
                          'B-': false,
                          'AB+': false,
                          'AB-': false,
                          'O+': false,
                          'O-': false,
                        };
                        setCapacity({
                          ...capacity,
                          bloodBank: { ...capacity.bloodBank, bloodGroups: allFalse },
                        });
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="am-blood-groups-grid">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => {
                    const isChecked = Boolean(
                      capacity.bloodBank?.bloodGroups?.[grp] === true ||
                      capacity.bloodBank?.bloodGroups?.[grp] === 'Yes' ||
                      (typeof capacity.bloodBank?.bloodGroups?.[grp] === 'string' && capacity.bloodBank?.bloodGroups?.[grp] !== '' && capacity.bloodBank?.bloodGroups?.[grp] !== '0')
                    );
                    return (
                      <div
                        key={grp}
                        className={`am-blood-item-card ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => {
                          setCapacity({
                            ...capacity,
                            bloodBank: {
                              ...capacity.bloodBank,
                              available: 'Yes',
                              bloodGroups: {
                                ...capacity.bloodBank?.bloodGroups,
                                [grp]: !isChecked,
                              },
                            },
                          });
                        }}
                      >
                        <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <Check size={14} />}
                        </div>
                        <span className="am-blood-name">{grp}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={() => handlePreviousSection('s2')}>
                    <ArrowLeft size={15} /> Previous
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                      <Save size={15} /> Save Draft
                    </button>
                    <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s2')}>
                      <span>Next: Specialities</span> <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------------
             SECTION 3: 26 Specialities (Checkbox Grid + Web Search Bar)
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's3') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-emerald-tint"><Stethoscope size={18} /></div>
                  <div>
                    <h3>3. Clinical Specialities (26 Specialities)</h3>
                    <span className="hdr-sub">Tap each department currently operating with active specialists (min. 1 required)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="am-selected-count-badge">
                    {selectedSpecialities.length} Selected
                  </span>
                </div>
              </div>

              <div className="am-infra-form-body">
                {/* Desktop Web Search Bar & Quick Controls */}
                <div className="am-spec-search-bar-wrap">
                  <div className="am-spec-search-input-box">
                    <Search size={18} className="am-spec-search-icon" />
                    <input
                      type="text"
                      className="am-spec-search-input"
                      placeholder="Search specialities (e.g. Pediatrics, Cardiology, Orthopedics, General Surgery)..."
                      value={specialitySearch}
                      onChange={(e) => setSpecialitySearch(e.target.value)}
                    />
                    {specialitySearch && (
                      <button
                        type="button"
                        className="am-spec-clear-search"
                        onClick={() => setSpecialitySearch('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="am-spec-quick-actions">
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      onClick={() => setSelectedSpecialities(ALL_26_SPECIALITIES.map((s) => s.id))}
                    >
                      Select All (26)
                    </button>
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      onClick={() => setSelectedSpecialities([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* 26 Specialities Checkbox Cards Grid (3 Columns Desktop) */}
                <div className="am-specialities-checkbox-grid">
                  {filteredSpecialities.map((spec) => {
                    const isChecked = selectedSpecialities.includes(spec.id);
                    return (
                      <div
                        key={spec.id}
                        className={`am-spec-checkbox-card ${isChecked ? 'is-checked' : ''}`}
                        onClick={() => handleToggleSpeciality(spec.id)}
                      >
                        <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <Check size={14} />}
                        </div>

                        <div className="am-spec-card-labels">
                          <span className="am-spec-name">{spec.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredSpecialities.length === 0 && (
                  <div className="am-empty-specialities">
                    <Search size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <p>No specialities found matching "{specialitySearch}"</p>
                    <button type="button" className="btn-progress-ghost" onClick={() => setSpecialitySearch('')}>
                      Clear Search Filter
                    </button>
                  </div>
                )}
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={() => handlePreviousSection('s3')}>
                    <ArrowLeft size={15} /> Previous
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                      <Save size={15} /> Save Draft
                    </button>
                    <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s3')}>
                      <span>Next: Packages</span> <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------------
             SECTION 4: Packages (Healthcare Scheme & Treatment Packages Mapped to Specialities)
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's4') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-teal-tint"><Package size={18} /></div>
                  <div>
                    <h3>4. Healthcare Scheme & Treatment Packages</h3>
                    <span className="hdr-sub">Select treatment packages available under Government Healthcare Schemes (MJPJAY / PM-JAY / State Packages)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="am-selected-count-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                    {selectedPackages.length} Packages Selected
                  </span>
                </div>
              </div>

              <div className="am-infra-form-body">
                {/* Search & Quick Filter Row */}
                <div className="am-spec-search-bar-wrap">
                  <div className="am-spec-search-input-box">
                    <Search size={18} className="am-spec-search-icon" />
                    <input
                      type="text"
                      className="am-spec-search-input"
                      placeholder="Search packages by package code or name (e.g. BM001, Thermal burns, Angioplasty, Dialysis)..."
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                    />
                    {packageSearch && (
                      <button
                        type="button"
                        className="am-spec-clear-search"
                        onClick={() => setPackageSearch('')}
                        title="Clear Search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="am-spec-quick-actions">
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      onClick={handleSelectAllForSelectedSpecialities}
                      title="Select all packages under currently chosen clinical specialities"
                    >
                      <CheckSquare size={13} style={{ marginRight: '4px' }} />
                      Select All for My Specialities
                    </button>
                    <button
                      type="button"
                      className="am-btn-ghost-sm"
                      onClick={() => setSelectedPackages([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="am-pkg-filter-tabs">
                  <button
                    type="button"
                    className={`am-pkg-filter-tab ${packageSpecialtyFilter === 'SELECTED' ? 'active' : ''}`}
                    onClick={() => setPackageSpecialtyFilter('SELECTED')}
                  >
                    <Layers size={13} />
                    <span>Selected Specialities ({selectedSpecialityNames.length})</span>
                  </button>
                </div>

                {/* Loading state or packages list */}
                {packagesLoading ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                    <div className="am-loading-spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Loading Government Healthcare Packages Master...</p>
                  </div>
                ) : filteredPackagesGrouped.length === 0 ? (
                  <div className="am-empty-specialities">
                    <Package size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>
                      {packageSpecialtyFilter === 'SELECTED' && selectedSpecialityNames.length === 0
                        ? 'No Clinical Specialities Selected in Step 3'
                        : 'No Packages Found'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {packageSpecialtyFilter === 'SELECTED' && selectedSpecialityNames.length === 0
                        ? 'Please go back to Step 3 and select your active clinical specialities.'
                        : `No packages match "${packageSearch}". Try a different keyword.`}
                    </p>
                  </div>
                ) : (
                  <div className="am-packages-grouped-container">
                    {filteredPackagesGrouped.map((group, groupIdx) => {
                      const specPackages = group.packages || [];
                      const selectedInSpec = specPackages.filter((p) =>
                        selectedPackages.includes(p.package_code || p.id)
                      );
                      const isAllInSpecSelected =
                        specPackages.length > 0 && selectedInSpec.length === specPackages.length;
                      const isOpen = isSpecialtyOpen(group.specialty, groupIdx);

                      return (
                        <div key={group.specialty} className={`am-pkg-spec-accordion-card ${isOpen ? 'is-open' : 'is-collapsed'}`}>
                          <div className="am-pkg-spec-header">
                            <div className="am-pkg-spec-title-group" onClick={() => handleToggleSpecialtyOpen(group.specialty, groupIdx)} style={{ cursor: 'pointer' }}>
                              <div className="am-pkg-spec-badge">
                                {group.specialty_code || 'SPEC'}
                              </div>
                              <div>
                                <h4 className="am-pkg-spec-name">{group.specialty}</h4>
                                <span className="am-pkg-spec-count-sub">
                                  {selectedInSpec.length} of {group.totalCount || specPackages.length} packages selected
                                </span>
                              </div>
                            </div>

                            {/* Search option in the middle between Speciality Name and Right Actions */}
                            <div className="am-pkg-spec-header-search-wrap">
                              <Search size={14} className="am-pkg-spec-search-icon" />
                              <input
                                type="text"
                                className="am-pkg-spec-search-input"
                                placeholder={`Search in ${group.specialty}...`}
                                value={specialtySearchMap[group.specialty] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSpecialtySearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: val,
                                  }));
                                }}
                              />
                              {specialtySearchMap[group.specialty] && (
                                <button
                                  type="button"
                                  className="am-pkg-spec-clear-search-btn"
                                  onClick={() =>
                                    setSpecialtySearchMap((prev) => ({
                                      ...prev,
                                      [group.specialty]: '',
                                    }))
                                  }
                                  title="Clear search"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>

                            {/* Right Action Group: Select All + Chevron Arrow to the right */}
                            <div className="am-pkg-spec-header-actions">
                              <button
                                type="button"
                                className={`am-pkg-select-all-spec-btn ${isAllInSpecSelected ? 'all-active' : ''}`}
                                onClick={() => handleSelectAllSpecialtyPackages(specPackages)}
                              >
                                {isAllInSpecSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                                <span>{isAllInSpecSelected ? 'Deselect Specialty' : 'Select All'}</span>
                              </button>

                              {/* Down / Up Arrow to open & close packages on right of select all */}
                              <button
                                type="button"
                                className={`am-pkg-spec-collapse-toggle-btn ${isOpen ? 'is-open' : ''}`}
                                onClick={() => handleToggleSpecialtyOpen(group.specialty, groupIdx)}
                                title={isOpen ? 'Collapse packages' : 'Expand packages'}
                              >
                                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="am-pkg-procedures-grid">
                              {specPackages.map((pkg) => {
                                const pkgId = pkg.package_code || pkg.id;
                                const isChecked = selectedPackages.includes(pkgId);

                                return (
                                  <div
                                    key={pkgId}
                                    className={`am-pkg-procedure-card ${isChecked ? 'is-checked' : ''}`}
                                    onClick={() => handleTogglePackage(pkgId)}
                                  >
                                    <div className={`am-spec-custom-checkbox ${isChecked ? 'checked' : ''}`}>
                                      {isChecked && <Check size={14} />}
                                    </div>

                                    <div className="am-pkg-proc-info">
                                      <div className="am-pkg-code-row">
                                        <span className="am-pkg-code-pill">{pkg.package_code}</span>
                                      </div>
                                      <span className="am-pkg-proc-name">{pkg.package_name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={() => handlePreviousSection('s4')}>
                    <ArrowLeft size={15} /> Previous
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                      <Save size={15} /> Save Draft
                    </button>
                    <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s4')}>
                      <span>Next: Doctors</span> <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------------
             SECTION 5: Doctors (Their Name, Speciality, Qualification, Experience, Availability, Location, Mobile, Alt Mobile)
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's5') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-purple-tint"><Users size={18} /></div>
                  <div>
                    <h3>5. Doctors ({doctorsList.length} Registered)</h3>
                    <span className="hdr-sub">Doctor Name, Speciality, Qualification, Experience, Availability & Contact</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-autofill"
                  style={{ background: '#2563eb', color: '#ffffff', border: 'none', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
                  onClick={handleOpenAddDoctor}
                >
                  <Plus size={15} />
                  <span>Add New Doctor</span>
                </button>
              </div>

              <div className="am-infra-form-body">
                {/* Doctors List Data Table */}
                {doctorsList.length > 0 ? (
                  <div className="am-doctors-table-container">
                    <table className="am-doctors-table">
                      <thead>
                        <tr>
                          <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                          <th>DOCTOR & SPECIALITY</th>
                          <th>QUALIFICATION & EXP</th>
                          <th>DUTY DAYS</th>
                          <th>CONTACT PHONE</th>
                          <th style={{ width: '170px', textAlign: 'center' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorsList.map((doc, idx) => (
                          <tr
                            key={doc.id}
                            className={`am-doc-table-row ${doc.status === 'Inactive' ? 'is-inactive-doctor' : ''}`}
                            onClick={() => setViewingDoc(doc)}
                            title={`Click to view doctor details${doc.status === 'Inactive' ? ' (Inactive)' : ''}`}
                          >
                            {/* Sr No */}
                            <td className="am-doc-td-idx" style={{ textAlign: 'center' }}>
                              <span className="am-doc-idx-badge">{idx + 1}</span>
                            </td>

                            {/* Doctor Name & Speciality */}
                            <td className="am-doc-td-primary">
                              <div className="am-doc-table-name-cell">
                                <div className="am-doc-table-avatar">
                                  <Stethoscope size={16} />
                                </div>
                                <div className="am-doc-table-name-info">
                                  <strong className="am-doc-table-name">{doc.name}</strong>
                                  <div className="am-doc-table-spec-chips">
                                    {(doc.speciality || 'General Medicine')
                                      .split(',')
                                      .map((sp, sIdx) => (
                                        <span key={sIdx} className="am-doc-spec-mini-pill">
                                          {sp.trim()}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Qualification & Experience */}
                            <td>
                              <div className="am-doc-td-qual-cell">
                                <span className="am-doc-qual-text">{doc.qualification || 'MBBS'}</span>
                                {doc.experience && (
                                  <span className="am-doc-exp-badge">
                                    <Activity size={11} /> {doc.experience}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Duty Days Only */}
                            <td>
                              <div className="am-doc-td-shift-cell">
                                <span className="am-doc-days-pill">
                                  <Calendar size={12} /> {getDoctorDutyDays(doc)}
                                </span>
                              </div>
                            </td>

                            {/* Contact Phone & City */}
                            <td>
                              <div className="am-doc-td-contact-cell">
                                <div className="am-doc-contact-item">
                                  <Phone size={12} className="text-slate-500" />
                                  <span className="am-doc-phone-val">{doc.mobile || '—'}</span>
                                </div>
                                {(doc.district || doc.address) && (
                                  <div className="am-doc-address-item" title={doc.address}>
                                    <MapPin size={11} className="text-slate-400" />
                                    <span>
                                      {doc.taluka ? `${doc.taluka}, ` : ''}{doc.district || doc.city || 'Pune'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Actions Group: View (Eye), Edit (Pencil), Active/Inactive Toggle */}
                            <td className="am-doc-td-actions" onClick={(e) => e.stopPropagation()}>
                              <div className="am-doc-table-actions-group">
                                {/* View (Eye) */}
                                <button
                                  type="button"
                                  className="am-doc-tbl-action-btn view"
                                  title="View Doctor Details"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingDoc(doc);
                                  }}
                                >
                                  <Eye size={15} />
                                </button>

                                {/* Edit (Pencil) */}
                                <button
                                  type="button"
                                  className="am-doc-tbl-action-btn edit"
                                  title="Edit Doctor"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditDoctor(doc);
                                  }}
                                >
                                  <Pencil size={15} />
                                </button>

                                {/* Active / Inactive Status Toggle in place of delete icon */}
                                <button
                                  type="button"
                                  className={`am-doc-status-pill-btn ${doc.status !== 'Inactive' ? 'active' : 'inactive'}`}
                                  title={`Status: ${doc.status !== 'Inactive' ? 'Active on Duty' : 'Inactive'}. Click to toggle.`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDoctorStatus(doc.id);
                                  }}
                                >
                                  <span className="am-status-dot" />
                                  <span>{doc.status !== 'Inactive' ? 'Active' : 'Inactive'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="am-empty-doctors-notice">
                    <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <h4>No Doctors Added Yet</h4>
                    <p>Click "Add New Doctor" above to register doctors on duty for this hospital facility.</p>
                    <button type="button" className="btn-progress-ghost" onClick={handleOpenAddDoctor}>
                      <Plus size={14} /> Add First Doctor
                    </button>
                  </div>
                )}
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={() => handlePreviousSection('s5')}>
                    <ArrowLeft size={15} /> Previous
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                      <Save size={15} /> Save Draft
                    </button>
                    <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s5')}>
                      <span>Next: Resource Count</span> <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------------
             SECTION 6: Resource Count (Doctor, Nursing Staff, Paramedical, Support)
             -------------------------------------------------------------------------- */}
          {(activeSection === 'all' || activeSection === 's6') && (
            <div className="am-infra-card">
              <div className="am-infra-card-header">
                <div className="hdr-title-wrap">
                  <div className="hdr-icon bg-amber-tint"><LayoutGrid size={18} /></div>
                  <div>
                    <h3>6. Resource & Workforce Count</h3>
                    <span className="hdr-sub">Hospital Staff Strength: Nursing, Paramedical & Support Staff</span>
                  </div>
                </div>
                <div className="am-total-workforce-badge">
                  <span>Total Workforce:</span>
                  <strong>{totalStaffCount} Personnel</strong>
                </div>
              </div>

              <div className="am-infra-form-body">
                <div className="am-workforce-stacked-list">
                  {/* 1. Nursing Staff */}
                  <div className="am-workforce-row-card">
                    <div className="am-workforce-row-label">
                      <span className="am-workforce-row-title">
                        NURSING STAFF (REGISTERED NURSES / GNM) <span className="req-star">*</span>
                      </span>
                    </div>
                    <div className="am-workforce-row-input-wrap">
                      <input
                        type="number"
                        min="0"
                        className="am-workforce-compact-input"
                        placeholder="e.g. 60"
                        value={resourceCount.nursingStaff}
                        onChange={(e) => setResourceCount({ ...resourceCount, nursingStaff: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 3. Paramedical Staff */}
                  <div className="am-workforce-row-card">
                    <div className="am-workforce-row-label">
                      <span className="am-workforce-row-title">
                        PARAMEDICAL & LAB TECHNICIANS
                      </span>
                    </div>
                    <div className="am-workforce-row-input-wrap">
                      <input
                        type="number"
                        min="0"
                        className="am-workforce-compact-input"
                        placeholder="e.g. 18"
                        value={resourceCount.paramedicalStaff}
                        onChange={(e) => setResourceCount({ ...resourceCount, paramedicalStaff: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 4. Support Staff */}
                  <div className="am-workforce-row-card">
                    <div className="am-workforce-row-label">
                      <span className="am-workforce-row-title">
                        SUPPORT & WARD BOYS
                      </span>
                    </div>
                    <div className="am-workforce-row-input-wrap">
                      <input
                        type="number"
                        min="0"
                        className="am-workforce-compact-input"
                        placeholder="e.g. 30"
                        value={resourceCount.supportStaff}
                        onChange={(e) => setResourceCount({ ...resourceCount, supportStaff: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {activeSection !== 'all' && (
                <div className="am-infra-card-footer">
                  <button type="button" className="btn-footer-ghost" onClick={() => handlePreviousSection('s6')}>
                    <ArrowLeft size={15} /> Previous
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-footer-ghost" onClick={handleSaveDraft}>
                      <Save size={15} /> Save Draft
                    </button>
                    <button type="button" className="btn-footer-primary" onClick={() => handleNextSection('s6')}>
                      <span>Review Complete Summary</span> <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT DOCTOR MODAL DIALOG
          ========================================================================= */}
      {doctorModalOpen && (
        <div className="am-modal-overlay">
          <div className="am-modal-card am-doc-custom-modal">
            {/* Modal Header */}
            <div className="am-doc-modal-header">
              <div className="am-doc-modal-header-left">
                <div className="am-doc-modal-icon-badge">
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h3 className="am-doc-modal-title">
                    {editingDocId ? 'Edit Doctor Details' : 'Add Doctor to Hospital'}
                  </h3>
                  <p className="am-doc-modal-subtitle">
                    Enter doctor's credentials, qualifications, contact numbers, and address details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="am-doc-modal-close-btn"
                onClick={() => setDoctorModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDoctor} className="am-doc-modal-body">
              {/* Doctor Full Name with Existing Doctors Dropdown */}
              <div className="am-doc-form-group" style={{ position: 'relative' }}>
                <div className="am-doc-label-row">
                  <label className="am-doc-form-label">
                    DOCTOR FULL NAME <span className="req-star">*</span>
                  </label>
                  {hospitalMasterDoctors.length > 0 && matchingHospitalDocs.length > 0 && (
                    <button
                      type="button"
                      className="am-doc-link-btn"
                      onClick={() => setIsDocNameDropdownOpen(!isDocNameDropdownOpen)}
                      style={{ fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Users size={12} />
                      <span>{isDocNameDropdownOpen ? 'Close Doctors List' : `Select Existing Doctor (${matchingHospitalDocs.length})`}</span>
                      <ChevronDown size={12} style={{ transform: isDocNameDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  )}
                </div>
                <div className="am-doc-input-wrap">
                  <User size={18} className="am-doc-input-icon" />
                  <input
                    type="text"
                    className="am-doc-text-input"
                    placeholder="e.g. Dr. Rajesh Kulkarni"
                    value={docFormData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDocFormData({ ...docFormData, name: val });
                      const query = val.trim().toLowerCase();
                      if (query.length > 0 && hospitalMasterDoctors.length > 0) {
                        const hasMatches = hospitalMasterDoctors.some(
                          (doc) =>
                            (doc.name && doc.name.toLowerCase().includes(query)) ||
                            (doc.speciality && doc.speciality.toLowerCase().includes(query))
                        );
                        setIsDocNameDropdownOpen(hasMatches);
                      } else {
                        setIsDocNameDropdownOpen(false);
                      }
                    }}
                    required
                  />
                  {hospitalMasterDoctors.length > 0 && matchingHospitalDocs.length > 0 && (
                    <button
                      type="button"
                      className="am-doc-input-dropdown-btn"
                      onClick={() => setIsDocNameDropdownOpen(!isDocNameDropdownOpen)}
                      title="Show registered doctors for this hospital"
                    >
                      <ChevronDown size={16} />
                    </button>
                  )}
                </div>

                {/* Autocomplete / Dropdown list of existing hospital doctors (Only shown if matching doctors exist) */}
                {isDocNameDropdownOpen && matchingHospitalDocs.length > 0 && (
                  <div className="am-doc-existing-popover">
                    <div className="am-doc-existing-popover-header">
                      <span>Existing Doctors Registered in Hospital ({matchingHospitalDocs.length})</span>
                      <button
                        type="button"
                        className="am-doc-popover-close-btn"
                        onClick={() => setIsDocNameDropdownOpen(false)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="am-doc-existing-list">
                      {matchingHospitalDocs.map((doc) => (
                        <div
                          key={doc.id || doc.name}
                          className="am-doc-existing-item"
                          onClick={() => handleSelectExistingDoctor(doc)}
                        >
                          <div className="am-doc-existing-avatar">
                            <Stethoscope size={14} />
                          </div>
                          <div className="am-doc-existing-info">
                            <div className="am-doc-existing-name-row">
                              <strong>{doc.name}</strong>
                              <span className="am-doc-existing-spec-badge">{doc.speciality || 'General Medicine'}</span>
                              {doc.doctorType && (
                                <span style={{ fontSize: '10.5px', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  {doc.doctorType}
                                </span>
                              )}
                            </div>
                            <div className="am-doc-existing-meta">
                              <span>{doc.qualification || 'MBBS'}</span>
                              {doc.mobile && <span>• 📞 {doc.mobile}</span>}
                              {doc.availability && <span>• ⏰ {doc.availability}</span>}
                            </div>
                          </div>
                          <button type="button" className="am-doc-existing-select-btn">
                            Autofill
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Row (2 Columns) */}
              <div className="am-doc-form-grid-two">
                {/* Primary Phone */}
                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    PRIMARY PHONE / MOBILE NUMBER <span className="req-star">*</span>
                  </label>
                  <div className="am-doc-input-wrap">
                    <Phone size={18} className="am-doc-input-icon" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      className={`am-doc-text-input ${docModalErrors.mobile ? 'has-error' : ''}`}
                      placeholder="e.g. 9822011223"
                      value={docFormData.mobile}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setDocFormData({ ...docFormData, mobile: raw });
                        if (raw.length > 0 && !/^[6-9]/.test(raw)) {
                          setDocModalErrors((prev) => ({ ...prev, mobile: 'Mobile number must start with 6, 7, 8, or 9' }));
                        } else if (raw.length > 0 && raw.length < 10) {
                          setDocModalErrors((prev) => ({ ...prev, mobile: 'Must be exactly 10 digits' }));
                        } else {
                          setDocModalErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.mobile;
                            return copy;
                          });
                        }
                      }}
                      required
                    />
                  </div>
                  {docModalErrors.mobile ? (
                    <span className="am-doc-input-error-msg">
                      ⚠️ {docModalErrors.mobile}
                    </span>
                  ) : (
                    <span className="am-doc-input-helper">Primary 10-digit mobile for emergency/OPD coordination</span>
                  )}
                </div>

                {/* Alternate Contact */}
                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    ALTERNATIVE CONTACT NUMBER
                  </label>
                  <div className="am-doc-input-wrap">
                    <Phone size={18} className="am-doc-input-icon" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={12}
                      className={`am-doc-text-input ${docModalErrors.altMobile ? 'has-error' : ''}`}
                      placeholder="e.g. 020-25678900 or 9822099887"
                      value={docFormData.altMobile}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d-]/g, '').slice(0, 12);
                        setDocFormData({ ...docFormData, altMobile: raw });
                        const digits = raw.replace(/\D/g, '');
                        if (digits.length > 0 && digits.length < 10) {
                          setDocModalErrors((prev) => ({ ...prev, altMobile: 'Enter valid contact (minimum 10 digits)' }));
                        } else {
                          setDocModalErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.altMobile;
                            return copy;
                          });
                        }
                      }}
                    />
                  </div>
                  {docModalErrors.altMobile ? (
                    <span className="am-doc-input-error-msg">
                      ⚠️ {docModalErrors.altMobile}
                    </span>
                  ) : (
                    <span className="am-doc-input-helper">Optional secondary or clinic landline</span>
                  )}
                </div>
              </div>

              {/* Qualification & Degrees */}
              <div className="am-doc-form-group">
                <label className="am-doc-form-label">
                  QUALIFICATION & DEGREES <span className="req-star">*</span>
                </label>
                <div className="am-doc-input-wrap">
                  <GraduationCap size={18} className="am-doc-input-icon" />
                  <input
                    type="text"
                    className="am-doc-text-input"
                    placeholder="e.g. MBBS, MD"
                    value={docFormData.qualification}
                    onChange={(e) => setDocFormData({ ...docFormData, qualification: e.target.value })}
                    required
                  />
                </div>

                {/* Quick select pills */}
                <div className="am-quick-qual-row">
                  <span className="am-quick-qual-label">Quick select:</span>
                  <div className="am-quick-qual-pills">
                    {QUICK_QUALIFICATIONS.map((qual) => {
                      const isSelected = (docFormData.qualification || '')
                        .split(',')
                        .map((q) => q.trim().toLowerCase())
                        .includes(qual.toLowerCase());
                      return (
                        <button
                          key={qual}
                          type="button"
                          className={`am-quick-qual-chip ${isSelected ? 'is-active' : ''}`}
                          onClick={() => handleAppendQualification(qual)}
                        >
                          + {qual}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Clinical Experience (Years) */}
              <div className="am-doc-form-group">
                <label className="am-doc-form-label">
                  CLINICAL EXPERIENCE (YEARS)
                </label>
                <div className="am-doc-input-wrap">
                  <Award size={18} className="am-doc-input-icon" />
                  <input
                    type="text"
                    className="am-doc-text-input"
                    placeholder="e.g. 14 Years"
                    value={docFormData.experience}
                    onChange={(e) => setDocFormData({ ...docFormData, experience: e.target.value })}
                  />
                </div>
              </div>

              {/* Doctor Specialities Multi-select Dropdown & Quick Toggle Pills */}
              <div className="am-doc-form-group">
                <div className="am-doc-label-row">
                  <label className="am-doc-form-label">
                    DOCTOR SPECIALITIES <span className="req-star">*</span>
                  </label>
                  <span className="am-doc-selected-badge">
                    {selectedDocSpecialities.length} Selected
                  </span>
                </div>

                {/* Trigger Button */}
                <div
                  className={`am-doc-spec-trigger ${isDocSpecDropdownOpen ? 'is-open' : ''}`}
                  onClick={() => setIsDocSpecDropdownOpen(!isDocSpecDropdownOpen)}
                >
                  <div className="am-doc-spec-trigger-left">
                    <Stethoscope size={18} className="am-doc-spec-trigger-icon" />
                    <span className="am-doc-spec-trigger-text">
                      {selectedDocSpecialities.length > 0
                        ? selectedDocSpecialities.join(', ')
                        : 'Select doctor specialties (e.g. Cardiology, Hemodialysis)...'}
                    </span>
                  </div>
                  {isDocSpecDropdownOpen ? (
                    <ChevronUp size={18} className="am-doc-chevron-icon" />
                  ) : (
                    <ChevronDown size={18} className="am-doc-chevron-icon" />
                  )}
                </div>

                {/* Dropdown / Popover Content */}
                {isDocSpecDropdownOpen && (
                  <div className="am-doc-spec-popover">
                    {/* Search box inside dropdown */}
                    <div className="am-doc-popover-search-wrap">
                      <Search size={16} className="am-doc-popover-search-icon" />
                      <input
                        type="text"
                        className="am-doc-popover-search-input"
                        placeholder="Search 26 clinical specialties..."
                        value={docModalSpecSearch}
                        onChange={(e) => setDocModalSpecSearch(e.target.value)}
                        autoFocus
                      />
                      {docModalSpecSearch && (
                        <button
                          type="button"
                          className="am-doc-popover-search-clear"
                          onClick={() => setDocModalSpecSearch('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Popover Action Sub-row */}
                    <div className="am-doc-popover-subbar">
                      <span className="am-doc-popover-count">
                        Showing {docModalFilteredSpecs.length} specialties
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="am-doc-link-btn"
                          onClick={() => setSelectedDocSpecialities(ALL_26_SPECIALITIES.map((s) => s.name))}
                        >
                          Select All (26)
                        </button>
                        <button
                          type="button"
                          className="am-doc-link-btn"
                          onClick={() => setSelectedDocSpecialities([])}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* 3 Columns Grid of Speciality Checkbox Cards */}
                    <div className="am-doc-popover-grid">
                      {docModalFilteredSpecs.map((spec) => {
                        const isChecked = selectedDocSpecialities.includes(spec.name);
                        return (
                          <div
                            key={spec.id}
                            className={`am-doc-popover-item ${isChecked ? 'is-checked' : ''}`}
                            onClick={() => handleToggleDocSpeciality(spec.name)}
                          >
                            <div className={`am-doc-checkbox-box ${isChecked ? 'checked' : ''}`}>
                              {isChecked && <Check size={12} />}
                            </div>
                            <span className="am-doc-popover-spec-name">{spec.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Doctor Practice Scope / Role (OPD / IPD / Both) */}
              <div className="am-doc-form-group">
                <label className="am-doc-form-label">
                  DOCTOR PRACTICE SCOPE / ROLE <span className="req-star">*</span>
                </label>
                <div className="am-doc-role-group">
                  <button
                    type="button"
                    className={`am-doc-role-btn ${docFormData.doctorType === 'OPD' ? 'active' : ''}`}
                    onClick={() => setDocFormData({ ...docFormData, doctorType: 'OPD' })}
                  >
                    <Users size={16} />
                    <span>OPD (Outpatient)</span>
                  </button>

                  <button
                    type="button"
                    className={`am-doc-role-btn ${docFormData.doctorType === 'IPD' ? 'active' : ''}`}
                    onClick={() => setDocFormData({ ...docFormData, doctorType: 'IPD' })}
                  >
                    <Bed size={16} />
                    <span>IPD (Inpatient)</span>
                  </button>

                  <button
                    type="button"
                    className={`am-doc-role-btn ${docFormData.doctorType === 'Both' || !docFormData.doctorType ? 'active' : ''}`}
                    onClick={() => setDocFormData({ ...docFormData, doctorType: 'Both' })}
                  >
                    <Activity size={16} />
                    <span>Both (OPD & IPD)</span>
                  </button>
                </div>
              </div>

              {/* Duty Type & Availability Scheduling */}
              <div className="am-doc-duty-schedule-card">
                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    DUTY AVAILABILITY & TIMING TYPE <span className="req-star">*</span>
                  </label>
                  <div className="am-doc-input-wrap">
                    <Clock size={18} className="am-doc-input-icon" />
                    <select
                      className="am-doc-text-input am-doc-select-input"
                      value={docFormData.dutyType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setDocFormData({
                          ...docFormData,
                          dutyType: newType,
                          availability:
                            newType === 'On-Call'
                              ? 'On-Call Specialist'
                              : `Shift (${docFormData.startTime || '08:00'} ${docFormData.startPeriod || 'AM'} - ${docFormData.endTime || '02:00'} ${docFormData.endPeriod || 'PM'})`,
                        });
                      }}
                    >
                      <option value="Shift">Regular Shift (Set Start & End Time)</option>
                      <option value="On-Call">On-Call Specialist (Emergency / Call Basis)</option>
                    </select>
                  </div>
                </div>

                {/* If On-Call is selected: No time asked, show info badge */}
                {docFormData.dutyType === 'On-Call' ? (
                  <div className="am-doc-oncall-notice">
                    <Phone size={16} className="text-blue-600" />
                    <div>
                      <strong>On-Call Duty Selected</strong>
                      <p>Doctor is available 24/7 on emergency call basis. No fixed shift timing is required.</p>
                    </div>
                  </div>
                ) : (
                  /* If Shift is selected: Show Start Time and End Time with AM/PM selection & Working Days */
                  <div className="am-doc-shift-timing-box">
                    {/* 1. Duty Days in a Week (Weekdays) - Above Time Selection */}
                    <div className="am-weekdays-group-wrap">
                      <div className="am-doc-label-row" style={{ marginBottom: '4px' }}>
                        <label className="am-doc-form-label">
                          DUTY DAYS IN A WEEK (WEEKDAYS) <span className="req-star">*</span>
                        </label>
                        <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 700 }}>
                          {(docFormData.workingDays || []).length} / 7 Days Active
                        </span>
                      </div>

                      <div className="am-weekdays-pills-row">
                        {WEEK_DAYS.map((day) => {
                          const isDayActive = (docFormData.workingDays || []).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`am-weekday-btn ${isDayActive ? 'is-selected' : ''}`}
                              onClick={() => handleToggleWorkingDay(day)}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Day Presets */}
                      <div className="am-quick-qual-row" style={{ marginTop: '2px' }}>
                        <span className="am-quick-qual-label">Quick select:</span>
                        <div className="am-quick-qual-pills">
                          <button
                            type="button"
                            className="am-quick-qual-chip"
                            onClick={() => setDocFormData({ ...docFormData, workingDays: [...WEEK_DAYS] })}
                          >
                            All Days (Mon - Sun)
                          </button>
                          <button
                            type="button"
                            className="am-quick-qual-chip"
                            onClick={() => setDocFormData({ ...docFormData, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] })}
                          >
                            Mon - Sat
                          </button>
                          <button
                            type="button"
                            className="am-quick-qual-chip"
                            onClick={() => setDocFormData({ ...docFormData, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })}
                          >
                            Mon - Fri (Weekdays)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Start Time & End Time */}
                    <div className="am-doc-form-grid-two" style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      {/* Start Time */}
                      <div className="am-doc-form-group">
                        <label className="am-doc-form-label">
                          START TIME <span className="req-star">*</span>
                        </label>
                        <div className="am-time-input-container">
                          <input
                            type="text"
                            className="am-time-field-input"
                            placeholder="08:00"
                            value={docFormData.startTime}
                            onChange={(e) =>
                              setDocFormData({
                                ...docFormData,
                                startTime: e.target.value,
                              })
                            }
                          />
                          <select
                            className="am-time-ampm-select"
                            value={docFormData.startPeriod || 'AM'}
                            onChange={(e) =>
                              setDocFormData({
                                ...docFormData,
                                startPeriod: e.target.value,
                              })
                            }
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="am-doc-form-group">
                        <label className="am-doc-form-label">
                          END TIME <span className="req-star">*</span>
                        </label>
                        <div className="am-time-input-container">
                          <input
                            type="text"
                            className="am-time-field-input"
                            placeholder="02:00"
                            value={docFormData.endTime}
                            onChange={(e) =>
                              setDocFormData({
                                ...docFormData,
                                endTime: e.target.value,
                              })
                            }
                          />
                          <select
                            className="am-time-ampm-select"
                            value={docFormData.endPeriod || 'PM'}
                            onChange={(e) =>
                              setDocFormData({
                                ...docFormData,
                                endPeriod: e.target.value,
                              })
                            }
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. Quick Common Shift Presets */}
                    <div className="am-quick-qual-row" style={{ marginTop: '2px' }}>
                      <span className="am-quick-qual-label">Presets:</span>
                      <div className="am-quick-qual-pills">
                        {[
                          { label: 'Morning (08:00 AM - 02:00 PM)', sTime: '08:00', sP: 'AM', eTime: '02:00', eP: 'PM' },
                          { label: 'Evening (04:00 PM - 08:00 PM)', sTime: '04:00', sP: 'PM', eTime: '08:00', eP: 'PM' },
                          { label: 'Full Day (09:00 AM - 05:00 PM)', sTime: '09:00', sP: 'AM', eTime: '05:00', eP: 'PM' },
                          { label: 'Night Shift (08:00 PM - 08:00 AM)', sTime: '08:00', sP: 'PM', eTime: '08:00', eP: 'AM' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className="am-quick-qual-chip"
                            onClick={() =>
                              setDocFormData({
                                ...docFormData,
                                startTime: preset.sTime,
                                startPeriod: preset.sP,
                                endTime: preset.eTime,
                                endPeriod: preset.eP,
                              })
                            }
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-header: Doctor Address & Location Details */}
              <div className="am-doc-section-divider">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', margin: '6px 0 2px' }}>
                  <MapPin size={17} />
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Doctor Address & Location Details</strong>
                </div>
              </div>

              {/* Full Street Address */}
              <div className="am-doc-form-group">
                <label className="am-doc-form-label">
                  FULL STREET ADDRESS (PLOT NO., ROAD, AREA / OPD WING) <span className="req-star">*</span>
                </label>
                <div className="am-doc-input-wrap">
                  <MapPin size={18} className="am-doc-input-icon" />
                  <input
                    type="text"
                    className="am-doc-text-input"
                    placeholder="e.g. OPD Wing B, Room 204, 2nd Floor, Senapati Bapat Road"
                    value={docFormData.address}
                    onChange={(e) => setDocFormData({ ...docFormData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* City/District & Taluka/Sub-District (2 Columns) */}
              <div className="am-doc-form-grid-two">
                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    CITY / DISTRICT <span className="req-star">*</span>
                  </label>
                  <select
                    className="am-doc-text-input am-doc-select-input"
                    style={{ paddingLeft: '14px' }}
                    value={docFormData.district}
                    onChange={(e) =>
                      setDocFormData({
                        ...docFormData,
                        district: e.target.value,
                        city: e.target.value,
                      })
                    }
                  >
                    <option value="">Type district (e.g. Pune)...</option>
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    TALUKA / SUB-DISTRICT <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="am-doc-text-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder={docFormData.district ? `${docFormData.district} Taluka / Area` : 'Select District first'}
                    value={docFormData.taluka}
                    onChange={(e) => setDocFormData({ ...docFormData, taluka: e.target.value })}
                  />
                </div>
              </div>

              {/* Pincode & Nearest Landmark (2 Columns) */}
              <div className="am-doc-form-grid-two">
                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    PINCODE <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="am-doc-text-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="e.g. 411004"
                    value={docFormData.pincode}
                    onChange={(e) => setDocFormData({ ...docFormData, pincode: e.target.value })}
                  />
                </div>

                <div className="am-doc-form-group">
                  <label className="am-doc-form-label">
                    NEAREST LANDMARK / STATION
                  </label>
                  <input
                    type="text"
                    className="am-doc-text-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="e.g. Near Swargate Bus Stand (500m)"
                    value={docFormData.nearestLandmark}
                    onChange={(e) => setDocFormData({ ...docFormData, nearestLandmark: e.target.value })}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="am-doc-modal-footer">
                <button
                  type="button"
                  className="am-doc-modal-btn-cancel"
                  onClick={() => setDoctorModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="am-doc-modal-btn-submit"
                >
                  <Check size={16} />
                  <span>{editingDocId ? 'Save Doctor Changes' : 'Add Doctor to Hospital'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW DOCTOR DETAILS MODAL DIALOG
          ========================================================================= */}
      {viewingDoc && (
        <div className="am-modal-overlay" onClick={() => setViewingDoc(null)}>
          <div className="am-modal-card am-doc-view-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="am-doc-modal-header" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
              <div className="am-doc-modal-header-left">
                <div className="am-doc-modal-icon-badge" style={{ background: '#2563eb', color: '#ffffff' }}>
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h3 className="am-doc-modal-title" style={{ fontSize: '17px' }}>{viewingDoc.name}</h3>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d4ed8' }}>
                    {viewingDoc.speciality || 'General Medicine'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="am-doc-modal-close-btn"
                onClick={() => setViewingDoc(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="am-doc-view-modal-body">
              {/* Profile Stats Grid */}
              <div className="am-doc-view-stats-row">
                <div className="am-doc-view-stat-box">
                  <span className="am-stat-lbl"><Award size={13} /> Qualification</span>
                  <strong className="am-stat-val">{viewingDoc.qualification || 'MBBS'}</strong>
                </div>
                <div className="am-doc-view-stat-box">
                  <span className="am-stat-lbl"><Activity size={13} /> Experience</span>
                  <strong className="am-stat-val">{viewingDoc.experience || 'Experienced'}</strong>
                </div>
                <div className="am-doc-view-stat-box">
                  <span className="am-stat-lbl"><Users size={13} /> Practice Scope</span>
                  <strong className="am-stat-val">
                    {viewingDoc.doctorType === 'OPD'
                      ? 'OPD (Outpatient)'
                      : viewingDoc.doctorType === 'IPD'
                      ? 'IPD (Inpatient)'
                      : 'Both (OPD & IPD)'}
                  </strong>
                </div>
              </div>

              {/* Duty Schedule & Shift Details */}
              <div className="am-doc-view-card-section">
                <div className="am-doc-view-section-hdr">
                  <Clock size={15} className="text-blue-600" />
                  <span>Duty Availability & Timings</span>
                </div>
                <p className="am-doc-view-shift-val">{viewingDoc.availability || 'Full Day Shift'}</p>
              </div>

              {/* Contact Info */}
              <div className="am-doc-view-card-section">
                <div className="am-doc-view-section-hdr">
                  <Phone size={15} className="text-emerald-600" />
                  <span>Contact Mobile Numbers</span>
                </div>
                <div className="am-doc-view-phones-row">
                  <a href={`tel:${viewingDoc.mobile}`} className="am-doc-view-phone-link">
                    <Phone size={13} /> Primary: <strong>{viewingDoc.mobile || '—'}</strong>
                  </a>
                  {viewingDoc.altMobile && (
                    <a href={`tel:${viewingDoc.altMobile}`} className="am-doc-view-phone-link">
                      <Phone size={13} /> Alternate: <strong>{viewingDoc.altMobile}</strong>
                    </a>
                  )}
                </div>
              </div>

              {/* Address & Location Details */}
              <div className="am-doc-view-card-section">
                <div className="am-doc-view-section-hdr">
                  <MapPin size={15} className="text-rose-600" />
                  <span>Address & Location</span>
                </div>
                <div className="am-doc-view-addr-text">
                  {viewingDoc.address ? (
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{viewingDoc.address}</p>
                      <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '12.5px' }}>
                        {viewingDoc.taluka ? `${viewingDoc.taluka}, ` : ''}
                        {viewingDoc.district || viewingDoc.city || 'Pune'}
                        {viewingDoc.pincode ? ` - ${viewingDoc.pincode}` : ''}
                      </p>
                      {viewingDoc.nearestLandmark && (
                        <p style={{ margin: '4px 0 0', color: '#059669', fontSize: '12px' }}>
                          Landmark: {viewingDoc.nearestLandmark}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No address specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="am-doc-modal-footer">
              <button
                type="button"
                className="am-doc-modal-btn-cancel"
                onClick={() => setViewingDoc(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="am-doc-modal-btn-submit"
                onClick={() => {
                  const docToEdit = viewingDoc;
                  setViewingDoc(null);
                  handleOpenEditDoctor(docToEdit);
                }}
              >
                <Pencil size={15} />
                <span>Edit Doctor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FINAL SUBMISSION CONFIRMATION MODAL
          ========================================================================= */}
      {showFinalModal && (
        <div className="am-modal-overlay">
          <div className="am-modal-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ padding: '24px 24px 16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
                Confirm Final Facility Submission
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to submit all 5 infrastructure & clinical roster sections for <strong>{hospInfo.name || 'this hospital'}</strong>?
              </p>
            </div>

            <div className="am-modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn-footer-ghost"
                onClick={() => setShowFinalModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-footer-primary"
                onClick={handleFinalSubmit}
              >
                <Check size={15} />
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructureInfo;
