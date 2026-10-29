import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  User,
  CheckCircle2,
  Calendar,
  Activity,
  AlertCircle,
  XCircle,
  Stethoscope,
  Users,
  Bed,
  Sun,
  Moon,
  Clock,
  MapPin,
  Phone,
  Edit,
  UserMinus,
  UserCheck,
  Home,
  Check,
  UserPlus,
  Loader2,
  Building2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  doctorService,
  STANDARD_SPECIALIZATIONS,
  SHIFT_OPTIONS,
  AVAILABILITY_CONFIG
} from '@/services/doctorService';
import { locationService } from '@/services/locationService';
import { ROUTES } from '@/utils/constants';
import Loader from '@/components/common/Loader/Loader';
import { useLanguage } from '@/context/LanguageContext';
import './DoctorManagement.css';

// Time Conversion & Formatting Utilities
function formatTo12Hour(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function parseTo24Hour(time12) {
  if (!time12) return '';
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const m = match[2].padStart(2, '0');
  const ampm = (match[3] || 'AM').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function extractTimesFromTimingString(timingStr) {
  if (!timingStr) return { start: '08:00', end: '12:00' };
  const parts = timingStr.split('-');
  if (parts.length === 2) {
    return {
      start: parseTo24Hour(parts[0]) || '08:00',
      end: parseTo24Hour(parts[1]) || '12:00',
    };
  }
  return { start: '08:00', end: '12:00' };
}

function calculateDuration(startTime24, endTime24) {
  if (!startTime24 || !endTime24) return '4 hrs duty';
  const [h1, m1] = startTime24.split(':').map(Number);
  const [h2, m2] = endTime24.split(':').map(Number);
  let totalMin1 = h1 * 60 + m1;
  let totalMin2 = h2 * 60 + m2;
  if (totalMin2 < totalMin1) totalMin2 += 24 * 60; // overnight
  const diffMin = totalMin2 - totalMin1;
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  if (minutes === 0) return `${hours} hrs duty`;
  return `${hours}h ${minutes}m duty`;
}

export const DoctorManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Instant SWR state hydration from memory/cache for 0ms initial render
  const initialCachedDoctors = React.useMemo(() => doctorService.getCachedDoctors(), []);
  const [doctors, setDoctors] = useState(initialCachedDoctors);
  const [loading, setLoading] = useState(() => initialCachedDoctors.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Assigned Hospital State
  const [assignedHospital, setAssignedHospital] = useState(() => {
    try {
      const cached = localStorage.getItem('ward_arogya_assigned_hospital');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name && parsed?.id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  // Districts and Talukas State
  const [districtsList, setDistrictsList] = useState([]);
  const [talukasList, setTalukasList] = useState([]);
  const [loadingTalukas, setLoadingTalukas] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);

  const savedDraft = useMemo(() => {
    try {
      const saved = sessionStorage.getItem('ward_doctor_form_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }, []);

  // Modal Form State (Auto-hydrated from draft if available)
  const [formName, setFormName] = useState(() => savedDraft?.formName || '');
  const [formQualification, setFormQualification] = useState(() => savedDraft?.formQualification || '');
  const [formSpecialization, setFormSpecialization] = useState(() => savedDraft?.formSpecialization || '');
  const [formDoctorType, setFormDoctorType] = useState(() => savedDraft?.formDoctorType || 'OPD');
  const [formOpdShift, setFormOpdShift] = useState(() => savedDraft?.formOpdShift || 'Morning');
  const [formStartTime, setFormStartTime] = useState(() => savedDraft?.formStartTime || '08:00');
  const [formEndTime, setFormEndTime] = useState(() => savedDraft?.formEndTime || '12:00');
  const [formOpdTiming, setFormOpdTiming] = useState(() => savedDraft?.formOpdTiming || 'Morning 8:00 AM - 12:00 PM');
  const [formAvailability, setFormAvailability] = useState(() => savedDraft?.formAvailability || 'Available');
  const [formPhone, setFormPhone] = useState(() => savedDraft?.formPhone || '');
  const [formVillageCity, setFormVillageCity] = useState(() => savedDraft?.formVillageCity || '');
  const [formTaluka, setFormTaluka] = useState(() => savedDraft?.formTaluka || 'Haveli');
  const [formDistrict, setFormDistrict] = useState(() => savedDraft?.formDistrict || 'Pune');
  const [formPincode, setFormPincode] = useState(() => savedDraft?.formPincode || '');

  // Auto-sync form changes to sessionStorage across page switches
  useEffect(() => {
    if (!editingDoctorId && (formName || formPhone || formQualification || formVillageCity)) {
      try {
        sessionStorage.setItem('ward_doctor_form_draft', JSON.stringify({
          formName,
          formQualification,
          formSpecialization,
          formDoctorType,
          formOpdShift,
          formStartTime,
          formEndTime,
          formOpdTiming,
          formAvailability,
          formPhone,
          formVillageCity,
          formTaluka,
          formDistrict,
          formPincode
        }));
      } catch (e) {}
    }
  }, [editingDoctorId, formName, formQualification, formSpecialization, formDoctorType, formOpdShift, formStartTime, formEndTime, formOpdTiming, formAvailability, formPhone, formVillageCity, formTaluka, formDistrict, formPincode]);

  // Load doctors from backend API service
  const reloadDoctors = useCallback(async (force = false) => {
    if (doctors.length === 0) {
      setLoading(true);
    }
    try {
      const list = await doctorService.getDoctors({}, force);
      if (Array.isArray(list)) {
        setDoctors(list);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  }, [doctors.length]);

  // Initial load on component mount: Doctors, Districts list & Assigned Hospital
  useEffect(() => {
    reloadDoctors();
    locationService.getDistricts().then((list) => {
      setDistrictsList(list || []);
    });

    let isMounted = true;
    api.get('/arogya-sevaks/assigned-hospitals')
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.active_hospitals?.length > 0) {
          const firstHosp = res.data.active_hospitals[0];
          const hospObj = {
            name: firstHosp.hospital_name || firstHosp.name || 'Assigned Hospital',
            address: firstHosp.hospital_address || firstHosp.address || '',
            code: firstHosp.hospital_code || firstHosp.code || '',
            contact: firstHosp.hospital_contact || firstHosp.contact || '',
            id: firstHosp.hospital_id || firstHosp.id,
          };
          setAssignedHospital(hospObj);
          try {
            localStorage.setItem('ward_arogya_assigned_hospital', JSON.stringify(hospObj));
          } catch (e) {}
        } else {
          setAssignedHospital(null);
          try {
            localStorage.removeItem('ward_arogya_assigned_hospital');
          } catch (e) {}
        }
      })
      .catch((err) => {
        setAssignedHospital(null);
        console.warn('Assigned hospital API info:', err?.message);
      });

    return () => { isMounted = false; };
  }, [reloadDoctors]);

  // Load talukas whenever formDistrict changes
  useEffect(() => {
    if (!formDistrict) {
      setTalukasList([]);
      return;
    }
    let isMounted = true;
    setLoadingTalukas(true);
    locationService.getTalukas(formDistrict).then((list) => {
      if (isMounted) {
        setTalukasList(list || []);
        setLoadingTalukas(false);
      }
    }).catch((err) => {
      console.error('Failed to load talukas:', err);
      if (isMounted) setLoadingTalukas(false);
    });
    return () => { isMounted = false; };
  }, [formDistrict]);

  // Handle District selection
  const handleDistrictChange = (e) => {
    const selectedDist = e.target.value;
    setFormDistrict(selectedDist);
    setFormTaluka('');
  };

  // Handle shift card selection
  const handleSelectShift = (shiftOption) => {
    setFormOpdShift(shiftOption.shift);
    if (shiftOption.startTime && shiftOption.endTime) {
      setFormStartTime(shiftOption.startTime);
      setFormEndTime(shiftOption.endTime);
      setFormOpdTiming(shiftOption.defaultTiming);
    }
  };

  // Synchronize composite shift string
  const updateCompositeTiming = (shiftName, start24, end24) => {
    const start12 = formatTo12Hour(start24);
    const end12 = formatTo12Hour(end24);
    const prefix = shiftName && shiftName !== 'Custom' && shiftName !== 'Full Day' ? `${shiftName} ` : '';
    const composite = `${prefix}${start12} - ${end12}`;
    setFormOpdTiming(composite);
  };

  const handleStartTimeChange = (e) => {
    const newStart = e.target.value;
    setFormStartTime(newStart);
    updateCompositeTiming(formOpdShift, newStart, formEndTime);
  };

  const handleEndTimeChange = (e) => {
    const newEnd = e.target.value;
    setFormEndTime(newEnd);
    updateCompositeTiming(formOpdShift, formStartTime, newEnd);
  };

  // Show Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Stats
  const stats = useMemo(() => {
    const activeDocs = doctors.filter((d) => d.isActive);
    return {
      total: doctors.length,
      activeCount: activeDocs.length,
      availableNow: activeDocs.filter((d) => (d.availabilityStatus || '').trim().toLowerCase() === 'available').length,
      opdDoctors: activeDocs.filter((d) => d.doctorType === 'OPD' || d.doctorType === 'Both').length,
      ipdDoctors: activeDocs.filter((d) => d.doctorType === 'IPD' || d.doctorType === 'Both').length,
      onLeave: activeDocs.filter((d) => (d.availabilityStatus || '').trim().toLowerCase() === 'on leave').length,
      deactivated: doctors.filter((d) => !d.isActive).length,
    };
  }, [doctors]);

  // Filtered doctors (active doctors first, deactivated placed at the bottom)
  const filteredDoctors = useMemo(() => {
    const list = doctors.filter((doc) => {
      const docStatus = (doc.availabilityStatus || '').trim().toLowerCase();

      // Tab filter: 'All' keeps ALL doctors (both active and deactivated) visible
      if (activeFilter === 'Available' && (docStatus !== 'available' || !doc.isActive)) return false;
      if (activeFilter === 'OPD' && (!['OPD', 'Both'].includes(doc.doctorType) || !doc.isActive)) return false;
      if (activeFilter === 'IPD' && (!['IPD', 'Both'].includes(doc.doctorType) || !doc.isActive)) return false;
      if (activeFilter === 'On Leave' && (docStatus !== 'on leave' || !doc.isActive)) return false;
      if (activeFilter === 'Deactivated' && doc.isActive) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = doc.name?.toLowerCase().includes(q);
        const specMatch = doc.specialization?.toLowerCase().includes(q);
        const cityMatch = doc.personalAddress?.villageCity?.toLowerCase().includes(q);
        const qualMatch = doc.qualification?.toLowerCase().includes(q);
        return nameMatch || specMatch || cityMatch || qualMatch;
      }
      return true;
    });

    // Place active doctors at top, deactivated doctors at bottom
    return list.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });
  }, [doctors, activeFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingDoctorId(null);
    let draft = null;
    try {
      const saved = sessionStorage.getItem('ward_doctor_form_draft');
      if (saved) draft = JSON.parse(saved);
    } catch (e) {}

    if (draft && (draft.formName || draft.formPhone || draft.formQualification || draft.formVillageCity)) {
      setFormName(draft.formName || '');
      setFormQualification(draft.formQualification || '');
      setFormSpecialization(draft.formSpecialization || STANDARD_SPECIALIZATIONS[0]);
      setFormDoctorType(draft.formDoctorType || 'OPD');
      setFormOpdShift(draft.formOpdShift || 'Morning');
      setFormStartTime(draft.formStartTime || '08:00');
      setFormEndTime(draft.formEndTime || '12:00');
      setFormOpdTiming(draft.formOpdTiming || 'Morning 8:00 AM - 12:00 PM');
      setFormAvailability(draft.formAvailability || 'Available');
      setFormPhone(draft.formPhone || '');
      setFormVillageCity(draft.formVillageCity || '');
      setFormTaluka(draft.formTaluka || 'Haveli');
      setFormDistrict(draft.formDistrict || 'Pune');
      setFormPincode(draft.formPincode || '');
    } else {
      setFormName('');
      setFormQualification('');
      setFormSpecialization(STANDARD_SPECIALIZATIONS[0]);
      setFormDoctorType('OPD');
      setFormOpdShift('Morning');
      setFormStartTime('08:00');
      setFormEndTime('12:00');
      setFormOpdTiming('Morning 8:00 AM - 12:00 PM');
      setFormAvailability('Available');
      setFormPhone('');
      setFormVillageCity('');
      setFormTaluka('Haveli');
      setFormDistrict('Pune');
      setFormPincode('');
    }
    setModalVisible(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (doc) => {
    setEditingDoctorId(doc.id);
    setFormName(doc.name);
    setFormQualification(doc.qualification || '');
    setFormSpecialization(doc.specialization || '');
    setFormDoctorType(doc.doctorType || 'OPD');
    setFormOpdShift(doc.opdShift || 'Morning');
    const times = extractTimesFromTimingString(doc.opdTiming);
    setFormStartTime(times.start);
    setFormEndTime(times.end);
    setFormOpdTiming(doc.opdTiming || '');
    setFormAvailability(doc.availabilityStatus || 'Available');
    setFormPhone(doc.contactPhone || doc.contactNumber || '');
    setFormVillageCity(doc.personalAddress?.villageCity || '');
    setFormTaluka(doc.personalAddress?.taluka || 'Haveli');
    setFormDistrict(doc.personalAddress?.district || 'Pune');
    setFormPincode(doc.personalAddress?.pincode || '');
    setModalVisible(true);
  };

  // Save Doctor
  const handleSaveDoctor = async (e) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert('Please enter Doctor Full Name');
      return;
    }
    if (!formSpecialization.trim()) {
      alert('Please enter or select Specialization');
      return;
    }
    if (!formVillageCity.trim()) {
      alert('Please enter Residential Village / City');
      return;
    }

    const payload = {
      name: formName.trim(),
      qualification: formQualification.trim() || 'MBBS',
      specialization: formSpecialization.trim(),
      doctorType: formDoctorType,
      opdShift: formDoctorType !== 'IPD' ? formOpdShift : undefined,
      opdTiming: formDoctorType !== 'IPD' ? formOpdTiming.trim() : undefined,
      availabilityStatus: formAvailability,
      contactPhone: formPhone.trim() || undefined,
      hospitalId: assignedHospital?.id || undefined,
      hospitalName: assignedHospital?.name || undefined,
      personalAddress: {
        villageCity: formVillageCity.trim(),
        taluka: formTaluka.trim() || 'Haveli',
        district: formDistrict.trim() || 'Pune',
        pincode: formPincode.trim() || undefined,
      },
    };

    try {
      setIsSaving(true);
      if (editingDoctorId) {
        await doctorService.updateDoctor(editingDoctorId, payload);
        showToast(`Updated details for ${payload.name}`);
      } else {
        await doctorService.addDoctor(payload);
        showToast(`Added ${payload.name} to Doctor Directory`);
      }

      try {
        sessionStorage.removeItem('ward_doctor_form_draft');
      } catch (e) {}

      setModalVisible(false);
      await reloadDoctors();
    } catch (error) {
      alert(error?.message || 'Failed to save doctor details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ visible: false, doc: null, action: 'deactivate' });

  // Quick availability status change directly from card
  const handleQuickStatusChange = async (doctorId, newStatus, docName, isDoctorActive = true) => {
    if (!isDoctorActive) {
      showToast(`${docName} is Deactivated. Click "Activate" to enable status changes.`);
      return;
    }

    // Immediate Optimistic UI update
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, availabilityStatus: newStatus } : d))
    );
    showToast(`${docName} status updated to ${newStatus}`);

    try {
      await doctorService.setDoctorAvailability(doctorId, newStatus);
    } catch (err) {
      console.warn('Failed to sync availability status to backend:', err);
    }
  };

  // Open Confirmation Dialog for Activate
  const handleActivateClick = (doc) => {
    if (doc.isActive) {
      showToast(`${doc.name} is already Active`);
      return;
    }
    setConfirmModal({
      visible: true,
      doc,
      action: 'activate',
    });
  };

  // Open Confirmation Dialog for Deactivate
  const handleDeactivateClick = (doc) => {
    if (!doc.isActive) {
      showToast(`${doc.name} is already Deactivated`);
      return;
    }
    setConfirmModal({
      visible: true,
      doc,
      action: 'deactivate',
    });
  };

  // Perform Toggle after confirmation
  const handleConfirmToggleActive = async () => {
    if (!confirmModal.doc) return;
    const doc = confirmModal.doc;
    const isActivating = confirmModal.action === 'activate';
    const actionName = isActivating ? 'Activated' : 'Deactivated';
    setConfirmModal({ visible: false, doc: null, action: 'deactivate' });

    // Immediate Optimistic update
    setDoctors((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, isActive: isActivating } : d))
    );
    showToast(`${doc.name} has been ${actionName}`);

    try {
      if (doc.isActive !== isActivating) {
        await doctorService.toggleDoctorActive(doc.id);
      }
    } catch (err) {
      console.warn('Failed to toggle active status on server:', err);
    }
  };

  // Render status icon helper
  const renderStatusIcon = (statusKey, size = 14) => {
    switch (statusKey) {
      case 'Available':
        return <CheckCircle2 size={size} />;
      case 'On Leave':
        return <Calendar size={size} />;
      case 'In Surgery':
        return <Activity size={size} />;
      case 'Emergency Duty':
        return <AlertCircle size={size} />;
      case 'Unavailable':
      default:
        return <XCircle size={size} />;
    }
  };

  // Modal Translation Helpers
  const getSpecLabel = (spec) => {
    switch (spec) {
      case 'General Medicine': return t('doctorModal.generalMedicine', 'General Medicine');
      case 'General Surgery': return t('doctorModal.generalSurgery', 'General Surgery');
      case 'Obstetrics & Gynecology': return t('doctorModal.obstetricsGynecology', 'Obstetrics & Gynecology');
      case 'Pediatrics': return t('doctorModal.pediatrics', 'Pediatrics');
      case 'Orthopedics': return t('doctorModal.orthopedics', 'Orthopedics');
      case 'Cardiology': return t('doctorModal.cardiology', 'Cardiology');
      case 'Neurology & Neurosurgery': return t('doctorModal.neurologyNeurosurgery', 'Neurology & Neurosurgery');
      case 'Nephrology & Dialysis': return t('doctorModal.nephrologyDialysis', 'Nephrology & Dialysis');
      case 'Emergency & Trauma': return t('doctorModal.emergencyTrauma', 'Emergency & Trauma');
      case 'Dermatology': return t('doctorModal.dermatology', 'Dermatology');
      case 'Ophthalmology (Eye)': return t('doctorModal.ophthalmologyEye', 'Ophthalmology (Eye)');
      case 'ENT': return t('doctorModal.ent', 'ENT');
      case 'Psychiatry': return t('doctorModal.psychiatry', 'Psychiatry');
      case 'Pulmonology': return t('doctorModal.pulmonology', 'Pulmonology');
      default: return spec;
    }
  };

  const getShiftOptionLabel = (shift) => {
    switch (shift) {
      case 'Morning': return t('doctorModal.morningShift', 'Morning Shift');
      case 'Evening': return t('doctorModal.eveningShift', 'Evening Shift');
      case 'Night': return t('doctorModal.nightShift', 'Night Shift');
      case 'Full Day': return t('doctorModal.fullDayShift', 'Full Day Shift');
      default: return shift;
    }
  };

  const getStatusButtonLabel = (statusKey) => {
    switch (statusKey) {
      case 'Available': return t('doctorModal.availableNow', 'Available');
      case 'In Surgery': return t('doctorModal.inSurgery', 'In Surgery');
      case 'In Ward Round': return t('doctorModal.inWardRound', 'In Ward Round');
      case 'On Break': return t('doctorModal.onBreak', 'On Break');
      case 'Off Duty': return t('doctorModal.offDuty', 'Off Duty');
      default: return statusKey;
    }
  };

  return (
    <div className="am-doc-page">
      {/* Top Header & Actions */}
      <div className="am-doc-topbar">
        <button
          type="button"
          className="am-doc-back-btn"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          title={t('doctors.backToDashboard', 'Back to Dashboard')}
        >
          <ArrowLeft size={18} />
          <span>{t('doctors.backToDashboard', 'Back to Dashboard')}</span>
        </button>

        <div className="am-doc-hospital-pill" title={assignedHospital?.address || ''}>
          <Building2 size={16} className="am-doc-hosp-pill-icon" />
          <span className="am-doc-hosp-pill-name">{assignedHospital?.name || t('doctors.noHospitalAssigned', 'No Hospital Assigned')}</span>
        </div>

        <button
          type="button"
          className="am-doc-btn-add"
          onClick={handleOpenAdd}
          id="btn-add-doctor"
        >
          <Plus size={18} />
          <span>{t('doctors.addNewDoctor', 'Add New Doctor')}</span>
        </button>
      </div>

      {/* Main Viewport Container */}
      <div className="am-doc-viewport-container">
        <div className="am-doc-content-wrapper">

          {/* Stats Metric Card (Styled to match Doctor Cards) */}
          <div className="am-doc-stats-card">
            <div
              className={`am-stat-col ${activeFilter === 'All' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('All')}
              title="Click to show All Doctors"
            >
              <div className="am-stat-avatar am-stat-blue">
                <Users size={22} />
              </div>
              <div className="am-stat-info">
                <span className="am-stat-number">{stats.total}</span>
                <span className="am-stat-label">{t('doctors.totalDoctors', 'Total Doctors')}</span>
              </div>
            </div>

            <div
              className={`am-stat-col ${activeFilter === 'Available' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('Available')}
              title="Click to filter Available Doctors"
            >
              <div className="am-stat-avatar am-stat-emerald">
                <CheckCircle2 size={22} />
              </div>
              <div className="am-stat-info">
                <div className="am-stat-val-row">
                  <span className="am-live-dot" />
                  <span className="am-stat-number text-emerald">{stats.availableNow}</span>
                </div>
                <span className="am-stat-label">{t('doctors.availableNow', 'Available Now')}</span>
              </div>
            </div>

            <div
              className={`am-stat-col ${activeFilter === 'OPD' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('OPD')}
              title="Click to filter OPD Doctors"
            >
              <div className="am-stat-avatar am-stat-sky">
                <Stethoscope size={22} />
              </div>
              <div className="am-stat-info">
                <span className="am-stat-number text-sky">{stats.opdDoctors}</span>
                <span className="am-stat-label">{t('doctors.opdDoctors', 'OPD Doctors')}</span>
              </div>
            </div>

            <div
              className={`am-stat-col ${activeFilter === 'IPD' ? 'is-active' : ''}`}
              onClick={() => setActiveFilter('IPD')}
              title="Click to filter IPD Doctors"
            >
              <div className="am-stat-avatar am-stat-purple">
                <Bed size={22} />
              </div>
              <div className="am-stat-info">
                <span className="am-stat-number text-purple">{stats.ipdDoctors}</span>
                <span className="am-stat-label">{t('doctors.ipdDoctors', 'IPD Doctors')}</span>
              </div>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="am-doc-search-wrap">
            <Search size={18} className="am-doc-search-icon" />
            <input
              type="text"
              className="am-doc-search-input"
              placeholder={t('doctors.searchPlaceholder', 'Search by name, department, or city...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-doctors-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="am-doc-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Pills Row */}
          <div className="am-doc-filter-pills">
            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'All' ? 'active' : ''}`}
              onClick={() => setActiveFilter('All')}
            >
              <span>{t('doctors.all', 'All')}</span>
              <span className="am-pill-badge">{stats.total}</span>
            </button>

            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'Available' ? 'active' : ''}`}
              onClick={() => setActiveFilter('Available')}
            >
              <span>{t('doctors.available', 'Available')}</span>
              <span className="am-pill-badge">{stats.availableNow}</span>
            </button>

            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'OPD' ? 'active' : ''}`}
              onClick={() => setActiveFilter('OPD')}
            >
              <span>{t('doctors.opd', 'OPD')}</span>
              <span className="am-pill-badge">{stats.opdDoctors}</span>
            </button>

            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'IPD' ? 'active' : ''}`}
              onClick={() => setActiveFilter('IPD')}
            >
              <span>{t('doctors.ipd', 'IPD')}</span>
              <span className="am-pill-badge">{stats.ipdDoctors}</span>
            </button>

            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'On Leave' ? 'active' : ''}`}
              onClick={() => setActiveFilter('On Leave')}
            >
              <span>{t('doctors.onLeave', 'On Leave')}</span>
              {stats.onLeave > 0 && <span className="am-pill-badge">{stats.onLeave}</span>}
            </button>

            <button
              type="button"
              className={`am-filter-pill-btn ${activeFilter === 'Deactivated' ? 'active' : ''}`}
              onClick={() => setActiveFilter('Deactivated')}
            >
              <span>{t('doctors.deactivated', 'Deactivated')}</span>
              <span className="am-pill-badge">{stats.deactivated}</span>
            </button>
          </div>

          {/* Doctors List */}
          {loading ? (
            <Loader
              card
              message="Loading Doctors Roster..."
              subtext="Fetching medical specialists, duty shifts & hospital availability"
            />
          ) : filteredDoctors.length === 0 ? (
            <div className="am-doc-empty-state">
              <div className="am-empty-icon-wrap">
                <User size={30} />
              </div>
              <h3 className="am-empty-title">{t('doctors.noDoctorsFound', 'No doctors found')}</h3>
              <p className="am-empty-desc">
                {searchQuery
                  ? `No doctors matched "${searchQuery}". Try a different keyword.`
                  : t('doctors.noDoctorsSub', 'No doctors in this category. Click "+ Add" to add a new doctor.')}
              </p>
              <button
                type="button"
                className="am-doc-btn-add"
                onClick={handleOpenAdd}
              >
                <Plus size={16} />
                <span>{t('doctors.addDoctor', 'Add Doctor')}</span>
              </button>
            </div>
          ) : (
            <div className="am-doc-list">
              {filteredDoctors.map((doc) => {
                const formattedAddress = [
                  doc.personalAddress?.villageCity,
                  doc.personalAddress?.taluka,
                  doc.personalAddress?.district,
                  doc.personalAddress?.pincode ? `- ${doc.personalAddress.pincode}` : '',
                ]
                  .filter(Boolean)
                  .join(', ')
                  .replace(', -', ' -');

                return (
                  <div
                    key={doc.id}
                    className={`am-doc-card ${!doc.isActive ? 'is-inactive' : ''}`}
                  >
                    {/* Header: Avatar, Name, Qualification, Inline Availability Status Pills */}
                    <div className="am-doc-card-header">
                      <div className="am-doc-card-info">
                        <div className="am-doc-avatar">
                          <User size={20} />
                        </div>
                        <div className="am-doc-name-qual">
                          <div className="am-doc-name-row">
                            <h2 className="am-doc-name">{doc.name}</h2>
                            {!doc.isActive && (
                              <span className="am-doc-inactive-tag">
                                <span className="am-inactive-dot" /> Deactivated
                              </span>
                            )}
                          </div>
                          <span className="am-doc-qual">{doc.qualification || 'MBBS'}</span>
                        </div>
                      </div>

                      {/* Current Availability Status (In line of doctor's name on top) */}
                      <div className="am-doc-availability-top-wrap">
                        <span className="am-avail-top-label">Status:</span>
                        <div className={`am-avail-pills-wrap ${!doc.isActive ? 'is-disabled-status-wrap' : ''}`}>
                          {Object.keys(AVAILABILITY_CONFIG).map((statusKey) => {
                            const isSelected =
                              (doc.availabilityStatus || '').trim().toLowerCase() ===
                              statusKey.trim().toLowerCase();
                            const cleanKey = statusKey.replace(/\s+/g, '');
                            return (
                              <button
                                key={statusKey}
                                type="button"
                                disabled={!doc.isActive}
                                className={`am-avail-pill-opt ${isSelected ? `is-selected-${cleanKey}` : ''} ${!doc.isActive ? 'am-pill-disabled' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatusChange(doc.id, statusKey, doc.name, doc.isActive);
                                }}
                                title={!doc.isActive ? 'Doctor is deactivated. Click Activate below to enable status changes.' : `Set availability to ${statusKey}`}
                              >
                                {renderStatusIcon(statusKey, 11)}
                                <span>{statusKey}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Tags row: Department/Specialty, OPD/IPD, Shift, and Timing */}
                    <div className="am-doc-tags-row">
                      <span className="am-doc-tag am-tag-specialty">
                        <Stethoscope size={12} />
                        <span>{doc.specialization}</span>
                      </span>

                      <span className="am-doc-tag am-tag-role">
                        {doc.doctorType === 'IPD' ? <Bed size={12} /> : <Users size={12} />}
                        <span>{doc.doctorType === 'Both' ? 'OPD & IPD' : doc.doctorType}</span>
                      </span>

                      {doc.opdShift && (
                        <span className="am-doc-tag am-tag-shift">
                          <Sun size={12} />
                          <span>{doc.opdShift}</span>
                        </span>
                      )}

                      {doc.opdTiming && (
                        <span className="am-doc-tag am-tag-timing">
                          <Clock size={12} />
                          <span>{doc.opdTiming}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Footer Row: Address & Phone on Left, Actions on Right */}
                    <div className="am-doc-card-footer-row">
                      <div className="am-doc-location-phone">
                        {formattedAddress && (
                          <div className="am-doc-location" title={formattedAddress}>
                            <MapPin size={13} style={{ flexShrink: 0 }} />
                            <span className="am-truncate-text">{formattedAddress}</span>
                          </div>
                        )}

                        {doc.contactPhone && (
                          <a
                            href={`tel:${doc.contactPhone}`}
                            className="am-doc-phone-btn"
                            title="Call Doctor"
                          >
                            <Phone size={12} />
                            <span>{doc.contactPhone}</span>
                          </a>
                        )}
                      </div>

                      {/* Card Actions: Edit Doctor, Activate, Deactivate */}
                      <div className="am-doc-card-actions">
                        <button
                          type="button"
                          className="am-btn-edit-doc"
                          onClick={() => handleOpenEdit(doc)}
                          title="Edit doctor details"
                        >
                          <Edit size={13} />
                          <span>Edit Doctor</span>
                        </button>

                        <button
                          type="button"
                          className={`am-btn-activate-doc ${doc.isActive ? 'is-current-active' : ''}`}
                          onClick={() => handleActivateClick(doc)}
                          title={doc.isActive ? 'Doctor is currently Active' : 'Click to activate this doctor'}
                        >
                          <UserCheck size={13} />
                          <span>Activate</span>
                        </button>

                        <button
                          type="button"
                          className={`am-btn-deactivate-doc ${!doc.isActive ? 'is-current-inactive' : ''}`}
                          onClick={() => handleDeactivateClick(doc)}
                          title={!doc.isActive ? 'Doctor is currently Deactivated' : 'Click to deactivate this doctor'}
                        >
                          <UserMinus size={13} />
                          <span>Deactivate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================================
          Add / Edit Doctor Modal Form (Faithfully matching Photos 2, 3, 4)
          ========================================================================== */}
      {modalVisible && (
        <div className="am-doc-modal-backdrop" onClick={() => setModalVisible(false)}>
          <div className="am-doc-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="am-doc-modal-header">
              <div className="am-doc-modal-title-wrap">
                <div className="am-modal-head-icon-box">
                  <UserPlus size={20} className="am-modal-head-icon" />
                </div>
                <div className="am-modal-header-text">
                  <h2 className="am-doc-modal-title">
                    {editingDoctorId ? t('doctorModal.editDoctorDetails', 'Edit Doctor Details') : t('doctorModal.addNewDoctor', '+ Add New Doctor')}
                  </h2>
                  <div className="am-modal-hospital-sub" title={assignedHospital?.address || ''}>
                    <Building2 size={13} className="am-modal-hosp-icon" />
                    <span>{assignedHospital?.name || t('doctorModal.noHospitalAssigned', 'No Hospital Assigned')}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="am-doc-modal-close-btn"
                onClick={() => setModalVisible(false)}
                title={t('common.close', 'Close')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDoctor} className="am-doc-modal-form">
              <div className="am-doc-modal-body">
                {/* Assigned Hospital Info Banner */}
                <div className="am-modal-hosp-badge-row">
                  <div className="am-modal-hosp-badge-content">
                    <Building2 size={16} className="am-modal-hosp-banner-icon" />
                    <div className="am-modal-hosp-meta">
                      <span className="am-modal-hosp-label">{t('doctorModal.assignedHospital', 'Assigned Hospital')}</span>
                      <strong className="am-modal-hosp-name">{assignedHospital?.name || t('doctorModal.noHospitalAssigned', 'No Hospital Assigned')}</strong>
                    </div>
                  </div>
                  {assignedHospital?.code && (
                    <span className="am-modal-hosp-code">{assignedHospital.code}</span>
                  )}
                </div>

                {/* 1. Doctor Full Name & Qualifications in 2-column row */}
                <div className="am-form-2col am-form-name-qual-row">
                  <div className="am-form-group">
                    <label className="am-form-label">
                      {t('doctorModal.doctorFullName', 'Doctor Full Name')}<span className="am-req-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="am-form-input"
                      placeholder={t('doctorModal.doctorNamePlaceholder', 'e.g. Dr. Rahul S. Deshmukh')}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="am-form-group">
                    <label className="am-form-label">{t('doctorModal.qualifications', 'Qualifications / Degrees')}</label>
                    <input
                      type="text"
                      className="am-form-input"
                      placeholder={t('doctorModal.qualificationsPlaceholder', 'e.g. MBBS, MD, MS...')}
                      value={formQualification}
                      onChange={(e) => setFormQualification(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Specialization & Quick Selector Chips */}
                <div className="am-form-group">
                  <label className="am-form-label">
                    {t('doctorModal.specialization', 'Specialization')}<span className="am-req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="am-form-input"
                    placeholder={t('doctorModal.specializationPlaceholder', 'e.g. Cardiology, Pediatrics...')}
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    required
                  />
                  <div className="am-spec-chips-row">
                    {STANDARD_SPECIALIZATIONS.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        className={`am-spec-chip ${formSpecialization === spec ? 'active' : ''}`}
                        onClick={() => setFormSpecialization(spec)}
                      >
                        {getSpecLabel(spec)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Doctor Role (OPD / IPD) */}
                <div className="am-form-group">
                  <label className="am-form-label">
                    {t('doctorModal.doctorRole', 'Doctor Role (OPD / IPD)')}<span className="am-req-star">*</span>
                  </label>
                  <div className="am-role-toggle-group">
                    <button
                      type="button"
                      className={`am-role-toggle-btn ${formDoctorType === 'OPD' ? 'active' : ''}`}
                      onClick={() => setFormDoctorType('OPD')}
                    >
                      <Users size={14} />
                      <span>{t('doctorModal.opdOutpatient', 'OPD (Outpatient)')}</span>
                    </button>

                    <button
                      type="button"
                      className={`am-role-toggle-btn ${formDoctorType === 'IPD' ? 'active' : ''}`}
                      onClick={() => setFormDoctorType('IPD')}
                    >
                      <Bed size={14} />
                      <span>{t('doctorModal.ipdInpatient', 'IPD (Inpatient)')}</span>
                    </button>

                    <button
                      type="button"
                      className={`am-role-toggle-btn ${formDoctorType === 'Both' ? 'active' : ''}`}
                      onClick={() => setFormDoctorType('Both')}
                    >
                      <Activity size={14} />
                      <span>{t('doctorModal.bothOpdIpd', 'Both OPD & IPD')}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Duty Shift Selection Container */}
                <div className="am-shift-section-box">
                  <label className="am-shift-main-label" htmlFor="input-shift-start-time">
                    <Clock size={15} color="#0284c7" />
                    <span>{t('doctorModal.selectDutyShift', 'Select Duty Shift')} *</span>
                  </label>

                  {/* Shift Selection Cards Grid */}
                  <div className="am-shift-cards-grid">
                    {SHIFT_OPTIONS.map((item) => {
                      const isSelected = formOpdShift === item.shift;
                      return (
                        <div
                          key={item.shift}
                          role="button"
                          tabIndex={0}
                          className={`am-shift-card ${isSelected ? 'is-selected' : ''} shift-${item.shift.toLowerCase().replace(/\s+/g, '')}`}
                          onClick={() => handleSelectShift(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleSelectShift(item);
                          }}
                        >
                          <div className="am-shift-card-left">
                            <span className="am-shift-icon-wrap">
                              {item.shift === 'Morning' ? (
                                <Sun size={14} className="am-shift-icon-sun" />
                              ) : item.shift === 'Evening' ? (
                                <Moon size={14} className="am-shift-icon-moon" />
                              ) : (
                                <Clock size={13} color="#0284c7" />
                              )}
                            </span>
                            <span className="am-shift-card-title">{getShiftOptionLabel(item.shift)}</span>
                          </div>

                          <div
                            className={`am-shift-badge-pill ${isSelected ? 'is-active-pill' : 'is-pending-pill'}`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={11} strokeWidth={3} />
                                <span>{formStartTime ? `${formStartTime}` : (item.timeBadge || 'Active')}</span>
                              </>
                            ) : (
                              <>
                                <Clock size={11} strokeWidth={2.4} />
                                <span>{item.timeBadge ? item.timeBadge : 'Pending'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Watch / Clock Time Selection Box */}
                  <div className="am-time-picker-container">
                    <div className="am-time-picker-grid">
                      <div className="am-time-box">
                        <label className="am-time-box-label" htmlFor="input-shift-start-time">
                          <Clock size={12} />
                          <span>{t('doctorModal.fromStartTime', 'From (Start Time)')}</span>
                        </label>
                        <input
                          type="time"
                          className="am-time-input"
                          value={formStartTime}
                          onChange={handleStartTimeChange}
                          id="input-shift-start-time"
                          required
                        />
                      </div>

                      <div className="am-time-box">
                        <label className="am-time-box-label" htmlFor="input-shift-end-time">
                          <Clock size={12} />
                          <span>{t('doctorModal.toEndTime', 'To (End Time)')}</span>
                        </label>
                        <input
                          type="time"
                          className="am-time-input"
                          value={formEndTime}
                          onChange={handleEndTimeChange}
                          id="input-shift-end-time"
                          required
                        />
                      </div>
                    </div>

                    {/* Live Timing Preview with Duration Badge */}
                    <div className="am-time-preview-bar">
                      <div className="am-time-preview-val">
                        <Clock size={13} color="#0284c7" />
                        <span>{formOpdTiming || `${formatTo12Hour(formStartTime)} - ${formatTo12Hour(formEndTime)}`}</span>
                      </div>
                      <span className="am-time-duration-chip">
                        ⏱️ {calculateDuration(formStartTime, formEndTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Current Availability Status */}
                <div className="am-form-group">
                  <label className="am-form-label">
                    {t('doctorModal.currentAvailability', 'Current Availability Status')}<span className="am-req-star">*</span>
                  </label>
                  <div className="am-status-options-grid">
                    {Object.keys(AVAILABILITY_CONFIG).map((statusKey) => {
                      const isSelected = formAvailability === statusKey;
                      const cleanKey = statusKey.replace(/\s+/g, '');
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          className={`am-modal-status-btn ${isSelected ? `active is-${cleanKey}` : ''}`}
                          onClick={() => setFormAvailability(statusKey)}
                        >
                          {renderStatusIcon(statusKey, 13)}
                          <span>{getStatusButtonLabel(statusKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Contact Phone Number */}
                <div className="am-form-group">
                  <label className="am-form-label">{t('doctorModal.contactPhone', 'Contact Phone Number (Optional)')}</label>
                  <input
                    type="tel"
                    className="am-form-input"
                    placeholder="+91 98221 45678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>

                {/* 7. Residential Address Container */}
                <div className="am-inner-section-card">
                  <h4 className="am-inner-card-title">
                    <Home size={15} />
                    <span>{t('doctorModal.residentialAddress', 'Residential Address')}</span>
                  </h4>

                  <div className="am-form-2col am-form-city-pin-row">
                    <div className="am-form-group">
                      <label className="am-form-label">
                        {t('doctorModal.villageCity', 'Village / City')}<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="am-form-input"
                        placeholder={t('doctorModal.villagePlaceholder', 'e.g. Kothrud, Pune / Village Wadgaon')}
                        value={formVillageCity}
                        onChange={(e) => setFormVillageCity(e.target.value)}
                        required
                      />
                    </div>

                    <div className="am-form-group">
                      <label className="am-form-label">{t('doctorModal.pincode', 'Pincode (Optional)')}</label>
                      <input
                        type="text"
                        className="am-form-input"
                        placeholder="411038"
                        value={formPincode}
                        onChange={(e) => setFormPincode(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="am-form-2col">
                    <div className="am-form-group">
                      <label className="am-form-label">
                        {t('doctorModal.district', 'District')}<span className="am-req-star">*</span>
                      </label>
                      <select
                        className="am-form-input am-form-select"
                        value={formDistrict}
                        onChange={handleDistrictChange}
                        required
                        id="select-doctor-district"
                      >
                        <option value="">{t('doctorModal.selectDistrict', 'Select District')}</option>
                        {districtsList.map((d) => (
                          <option key={d.districtCode || d.id || d.nameEnglish} value={d.nameEnglish}>
                            {d.nameEnglish} {d.nameMarathi ? `(${d.nameMarathi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="am-form-group">
                      <label className="am-form-label">
                        {t('doctorModal.taluka', 'Taluka')}<span className="am-req-star">*</span>
                      </label>
                      <select
                        className="am-form-input am-form-select"
                        value={formTaluka}
                        onChange={(e) => setFormTaluka(e.target.value)}
                        required
                        disabled={!formDistrict || loadingTalukas}
                        id="select-doctor-taluka"
                      >
                        <option value="">
                          {loadingTalukas ? t('doctorModal.loadingTalukas', 'Loading Talukas...') : !formDistrict ? t('doctorModal.selectDistrictFirst', 'Select District First') : t('doctorModal.selectTaluka', 'Select Taluka')}
                        </option>
                        {talukasList.map((t) => (
                          <option key={t.subdistrictCode || t.id || t.nameEnglish} value={t.nameEnglish}>
                            {t.nameEnglish} {t.nameMarathi ? `(${t.nameMarathi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="am-doc-modal-footer">
                <button
                  type="button"
                  className="am-modal-btn-cancel"
                  onClick={() => setModalVisible(false)}
                >
                  {t('doctorModal.cancel', 'Cancel')}
                </button>
                <button type="submit" className="am-modal-btn-save">
                  <Check size={16} />
                  <span>{t('doctorModal.saveDoctor', 'Save Doctor')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          Personalized Confirmation Modal Dialog (Replaces native browser alert)
          ========================================================================== */}
      {confirmModal.visible && confirmModal.doc && (
        <div className="am-confirm-modal-backdrop" onClick={() => setConfirmModal({ visible: false, doc: null, action: 'deactivate' })}>
          <div className="am-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className={`am-confirm-icon-wrap ${confirmModal.action === 'deactivate' ? 'is-danger' : 'is-success'}`}>
              {confirmModal.action === 'deactivate' ? <UserMinus size={28} /> : <UserCheck size={28} />}
            </div>

            <h3 className="am-confirm-title">
              {confirmModal.action === 'deactivate' ? t('doctorModal.deactivateDoctor', 'Deactivate Doctor') : t('doctorModal.activateDoctor', 'Activate Doctor')}
            </h3>

            <div className="am-confirm-doc-pill">
              <div className="am-confirm-doc-avatar">
                <User size={18} />
              </div>
              <div className="am-confirm-doc-info">
                <span className="am-confirm-doc-name">{confirmModal.doc.name}</span>
                <span className="am-confirm-doc-spec">{confirmModal.doc.specialization} &bull; {confirmModal.doc.doctorType}</span>
              </div>
            </div>

            <p className="am-confirm-msg">
              {confirmModal.action === 'deactivate' ? (
                <>
                  Are you sure you want to deactivate <strong>{confirmModal.doc.name}</strong>? They will be moved to the Deactivated roster list and will not be available for daily duty assignments.
                </>
              ) : (
                <>
                  Activate <strong>{confirmModal.doc.name}</strong> and restore them to the active duty roster? They will immediately appear in the active doctors list.
                </>
              )}
            </p>

            <div className="am-confirm-actions">
              <button
                type="button"
                className="am-confirm-btn-cancel"
                onClick={() => setConfirmModal({ visible: false, doc: null, action: 'deactivate' })}
              >
                {t('doctorModal.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className={`am-confirm-btn-confirm ${confirmModal.action === 'deactivate' ? 'btn-danger' : 'btn-success'}`}
                onClick={handleConfirmToggleActive}
              >
                {confirmModal.action === 'deactivate' ? (
                  <>
                    <UserMinus size={16} />
                    <span>{t('doctorModal.yesDeactivate', 'Yes, Deactivate')}</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>{t('doctorModal.yesActivate', 'Yes, Activate')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div className="am-doc-toast success">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default DoctorManagement;
