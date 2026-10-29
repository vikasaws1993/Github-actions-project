import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  ShieldCheck,
  Activity,
  Stethoscope,
  Scissors,
  BedDouble,
  Radio,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  HeartPulse,
  Truck,
  Sparkles,
  UserCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  GraduationCap,
  Award,
  AlertCircle,
  Plus,
  UserPlus,
  X,
  Check,
  Mail,
  User,
  Eye
} from 'lucide-react';
import { hospitalService } from '../../../services/hospitalService';
import { doctorService, AVAILABILITY_CONFIG } from '../../../services/doctorService';
import { locationDirectoryService } from '../../../services/locationDirectoryService';
import { SearchableLocationInput } from '../../../components/common/SearchableLocationInput/SearchableLocationInput';
import {
  DEFAULT_CLINICAL_SPECIALTIES,
  PRIMARY_QUALIFICATIONS,
  ALL_QUALIFICATIONS,
  WEEK_DAYS,
  SHIFT_PRESETS
} from './AddHospital';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './HospitalDetail.css';
import './AddHospital.css';

export const HospitalDetail = () => {
  const routeParams = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  let ctxHospitals = [];
  let arogyaSevaks = [];
  try {
    const adminCtx = useAdmin();
    if (adminCtx) {
      ctxHospitals = adminCtx.hospitals || [];
      arogyaSevaks = adminCtx.arogyaSevaks || [];
    }
  } catch (_) {
    // Rendered outside AdminProvider (e.g. in Arogya Sevak Portal)
  }

  // Resolve ID from URL param or from logged in user/sevak assigned hospital
  const id = routeParams.id || (() => {
    try {
      const stored = localStorage.getItem('ward_arogya_assigned_hospital');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.id || parsed?.hospital_id || parsed?.name;
      }
      const userStr = localStorage.getItem('ward_arogya_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return u?.hospital_id || (typeof u?.hospital === 'string' ? u.hospital : u?.hospital?.id);
      }
    } catch (_) {}
    return null;
  })();

  const [serviceHospitals, setServiceHospitals] = useState([]);

  // Subscribe to hospitalService updates (includes CSV imports and local cache)
  useEffect(() => {
    hospitalService.fetchHospitals();
    const unsubscribe = hospitalService.subscribe((updatedList) => {
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setServiceHospitals(updatedList);
      }
    });
    return () => unsubscribe();
  }, []);

  // Merge context hospitals and service hospitals
  const allHospitals = useMemo(() => {
    const combined = [...serviceHospitals, ...ctxHospitals];
    const map = new Map();
    combined.forEach((h) => {
      const key = (h.id || h.name || '').toString().toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, h);
      }
    });
    return Array.from(map.values());
  }, [serviceHospitals, ctxHospitals]);

  const targetIdStr = id ? decodeURIComponent(id).toLowerCase().trim() : '';

  // Find hospital by ID, code, or name match
  const hospFromList = useMemo(() => {
    if (!targetIdStr) return null;
    return allHospitals.find((h) =>
      String(h.id).toLowerCase().trim() === targetIdStr ||
      String(h.hospital_code || '').toLowerCase().trim() === targetIdStr ||
      (h.name && h.name.toLowerCase().trim() === targetIdStr)
    ) || null;
  }, [allHospitals, targetIdStr]);

  const [hosp, setHosp] = useState(hospFromList || null);
  const [loading, setLoading] = useState(!hospFromList);

  // Doctors State for this specific hospital
  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isDoctorsExpanded, setIsDoctorsExpanded] = useState(true);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorDutyFilter, setDoctorDutyFilter] = useState('All');

  // Modal & Form State for Adding Doctor
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const [docSpecialtiesDropdownOpen, setDocSpecialtiesDropdownOpen] = useState(false);
  const [docSpecialtiesSearch, setDocSpecialtiesSearch] = useState('');
  const [showAllQualifications, setShowAllQualifications] = useState(false);
  const [doctorSelectedSpecialties, setDoctorSelectedSpecialties] = useState([]);
  const [doctorFormErrors, setDoctorFormErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const docSpecialtiesDropdownRef = useRef(null);

  const initialDoctorForm = {
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    qualification: 'MBBS',
    experience: '',
    doctorType: 'Both',
    dutyType: 'Shift',
    startTime: '04:00',
    startPeriod: 'PM',
    endTime: '08:00',
    endPeriod: 'PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    address: '',
    district: '',
    taluka: '',
    pincode: '',
    landmark: '',
  };

  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [viewingDoctor, setViewingDoctor] = useState(null);

  const showFeedbackToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    if (hospFromList) {
      setHosp(hospFromList);
      setLoading(false);
    } else if (id) {
      hospitalService.getHospitalById(id).then((data) => {
        if (data) setHosp(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id, hospFromList]);

  const currentHosp = hosp || {
    id: id || 'HOSP-1',
    name: 'Sassoon General Government Hospital',
    type: 'Government',
    location: 'Pune',
    address: 'Near Pune Railway Station, Sassoon Road',
    areaTaluka: 'Haveli Taluka',
    pincode: '411001',
    nearestLandmark: 'Opposite Pune Railway Station',
    contact: '020-26128000',
    scheme: 'PM-JAY, MJPJAY, CMRF',
    sevak: 'Not assigned',
    specialties: ['Interventional Cardiology', 'Trauma Vascular', 'Hemodialysis', 'Neurosurgery', 'Pediatric ICU'],
    bedsAvailable: 45,
    activeCases: 8
  };

  const openAddDoctorModal = () => {
    setDoctorForm({
      ...initialDoctorForm,
      address: '',
      district: '',
      taluka: '',
      pincode: '',
      landmark: ''
    });
    setDoctorSelectedSpecialties([]);
    setDoctorFormErrors({});
    setIsAddDoctorModalOpen(true);
  };

  const closeAddDoctorModal = () => {
    setIsAddDoctorModalOpen(false);
    setDoctorFormErrors({});
    setDocSpecialtiesDropdownOpen(false);
    setDocSpecialtiesSearch('');
  };

  const handleDoctorInputChange = (field, val) => {
    setDoctorForm((prev) => ({ ...prev, [field]: val }));
    if (doctorFormErrors[field]) {
      setDoctorFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleToggleDoctorSpecialty = (spec) => {
    if (!spec) return;
    setDoctorSelectedSpecialties((prev) => {
      const exists = prev.some((s) => s.toLowerCase() === spec.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.toLowerCase() !== spec.toLowerCase());
      }
      return [...prev, spec];
    });
    if (doctorFormErrors.specialities) {
      setDoctorFormErrors((prev) => ({ ...prev, specialities: null }));
    }
  };

  const handleDoctorSelectAllFiltered = () => {
    const filtered = (DEFAULT_CLINICAL_SPECIALTIES || []).filter((s) =>
      s.toLowerCase().includes(docSpecialtiesSearch.toLowerCase().trim())
    );
    setDoctorSelectedSpecialties((prev) => {
      const set = new Set([...prev, ...filtered]);
      return Array.from(set);
    });
  };

  const handleDoctorClearAllSpecialties = () => {
    setDoctorSelectedSpecialties([]);
  };

  const handleToggleDoctorWorkingDay = (day) => {
    setDoctorForm((prev) => {
      const current = prev.workingDays || [];
      if (current.includes(day)) {
        return { ...prev, workingDays: current.filter((d) => d !== day) };
      }
      return { ...prev, workingDays: [...current, day] };
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        docSpecialtiesDropdownRef.current &&
        !docSpecialtiesDropdownRef.current.contains(e.target)
      ) {
        setDocSpecialtiesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDoctorSpecialties = useMemo(() => {
    if (!docSpecialtiesSearch.trim()) return DEFAULT_CLINICAL_SPECIALTIES;
    const q = docSpecialtiesSearch.toLowerCase().trim();
    return DEFAULT_CLINICAL_SPECIALTIES.filter((s) => s.toLowerCase().includes(q));
  }, [docSpecialtiesSearch]);

  const handleSaveDoctor = async () => {
    const errs = {};
    if (!doctorForm.name || !doctorForm.name.trim()) {
      errs.name = 'Doctor full name is required';
    }
    if (!doctorForm.phone || !doctorForm.phone.trim()) {
      errs.phone = 'Primary mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(doctorForm.phone.trim().replace(/\D/g, ''))) {
      errs.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (doctorSelectedSpecialties.length === 0) {
      errs.specialities = 'Please select at least 1 clinical specialty';
    }

    if (Object.keys(errs).length > 0) {
      setDoctorFormErrors(errs);
      showFeedbackToast('Please fill all required fields highlighted in red (*)', 'error');
      return;
    }

    setIsSavingDoctor(true);
    try {
      const primarySpec = doctorSelectedSpecialties[0] || 'General Medicine';
      const opdTimingStr = doctorForm.dutyType === 'On-Call'
        ? '24/7 Emergency On-Call'
        : `${doctorForm.startTime || '04:00'} ${doctorForm.startPeriod || 'PM'} - ${doctorForm.endTime || '08:00'} ${doctorForm.endPeriod || 'PM'}`;

      const payload = {
        hospitalId: currentHosp.id,
        hospital_id: currentHosp.id,
        name: doctorForm.name.trim(),
        contactPhone: doctorForm.phone.trim(),
        contactNumber: doctorForm.phone.trim(),
        phone: doctorForm.phone.trim(),
        altContactNumber: doctorForm.altPhone ? doctorForm.altPhone.trim() : null,
        email: doctorForm.email ? doctorForm.email.trim().toLowerCase() : null,
        qualification: doctorForm.qualification || 'MBBS',
        specialization: primarySpec,
        specialties: doctorSelectedSpecialties,
        experience: doctorForm.experience ? `${doctorForm.experience.trim()} Years` : '',
        experienceYears: parseInt(doctorForm.experience, 10) || 0,
        doctorType: doctorForm.doctorType || 'Both',
        dutyType: doctorForm.dutyType || 'Shift',
        workingDays: doctorForm.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        startTime: doctorForm.startTime || '04:00',
        startPeriod: doctorForm.startPeriod || 'PM',
        endTime: doctorForm.endTime || '08:00',
        endPeriod: doctorForm.endPeriod || 'PM',
        opdShift: doctorForm.dutyType === 'On-Call' ? 'On-Call' : (doctorForm.startPeriod === 'PM' ? 'Evening' : 'Morning'),
        opdTiming: opdTimingStr,
        availabilityStatus: 'Available',
        address: doctorForm.address || currentHosp.address || '',
        streetAddress: doctorForm.address || currentHosp.address || '',
        district: doctorForm.district || currentHosp.district || currentHosp.location || 'Pune',
        taluka: doctorForm.taluka || currentHosp.taluka || currentHosp.areaTaluka || 'Haveli',
        pincode: doctorForm.pincode || currentHosp.pincode || '',
        landmark: doctorForm.landmark || currentHosp.nearestLandmark || '',
        isActive: true,
        status: 'ACTIVE'
      };

      const res = await doctorService.addDoctor(payload);
      const savedDoc = res?.data || res || payload;

      setDoctorsList((prev) => [savedDoc, ...prev]);
      showFeedbackToast(`Doctor "${doctorForm.name.trim()}" added to ${currentHosp.name} successfully!`, 'success');
      closeAddDoctorModal();
    } catch (err) {
      console.error('Failed to add doctor:', err);
      showFeedbackToast(err.message || 'Failed to add doctor record', 'error');
    } finally {
      setIsSavingDoctor(false);
    }
  };

  const getDoctorInitials = (name) => {
    if (!name) return 'DR';
    const clean = name.replace(/^Dr\.?\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'DR';
  };

  // Fetch doctors strictly assigned to this hospital
  useEffect(() => {
    if (!currentHosp?.id) return;
    let isMounted = true;
    setLoadingDoctors(true);

    // If already preloaded on currentHosp
    if (Array.isArray(currentHosp.doctors) && currentHosp.doctors.length > 0) {
      setDoctorsList(currentHosp.doctors);
      setLoadingDoctors(false);
    }

    doctorService.getDoctors({ hospitalId: currentHosp.id }, true)
      .then((docs) => {
        if (!isMounted) return;
        if (Array.isArray(docs)) {
          const hospIdStr = String(currentHosp.id).toLowerCase();
          const hospNameStr = String(currentHosp.name || '').toLowerCase().trim();
          const filtered = docs.filter((d) => {
            const dHospId = String(d.hospitalId || d.hospital_id || '').toLowerCase();
            const dHospName = String(d.hospitalName || '').toLowerCase().trim();
            return dHospId === hospIdStr || (dHospName && dHospName === hospNameStr);
          });
          setDoctorsList(filtered.length > 0 ? filtered : (Array.isArray(currentHosp.doctors) ? currentHosp.doctors : filtered));
        }
      })
      .catch((err) => {
        console.warn('[HospitalDetail] Error fetching hospital doctors:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingDoctors(false);
      });

    return () => { isMounted = false; };
  }, [currentHosp?.id, currentHosp?.name]);

  // Resolve assigned ArogyaSevak(s) list
  const assignedSevaksList = useMemo(() => {
    if (!currentHosp) return [];

    // 1. Direct array on hospital object
    const directList = currentHosp.assigned_sevaks || currentHosp.assignedSevaks;
    if (Array.isArray(directList) && directList.length > 0) {
      return directList.map((s) => {
        if (typeof s === 'string') {
          const match = arogyaSevaks?.find((as) => as.name?.toLowerCase() === s.toLowerCase());
          return match || { name: s, mobile: '—', status: 'Active' };
        }
        return {
          ...s,
          name: s.name || s.full_name || s.sevak_name || 'Arogya Sevak',
          mobile: s.mobile || s.phone || '—',
          status: s.status || 'Active'
        };
      });
    }

    // 2. Cross-reference with arogyaSevaks in context
    if (arogyaSevaks && currentHosp.name) {
      const hospNameLower = currentHosp.name.toLowerCase().trim();
      const matched = arogyaSevaks.filter((s) => {
        if (!s.hospital || s.hospital === '—' || s.hospital === 'Unassigned' || s.hospital === 'Not assigned') {
          return false;
        }
        const sHosp = s.hospital.toLowerCase().trim();
        return (
          sHosp === hospNameLower ||
          sHosp.includes(hospNameLower) ||
          hospNameLower.includes(sHosp) ||
          (Array.isArray(s.assignedHospitals) &&
            s.assignedHospitals.some((ah) =>
              String(ah.id) === String(currentHosp.id) ||
              (ah.name && ah.name.toLowerCase().trim() === hospNameLower)
            ))
        );
      });
      if (matched.length > 0) return matched;
    }

    // 3. String sevak name on hospital object
    if (
      currentHosp.sevak &&
      currentHosp.sevak !== 'Not assigned' &&
      currentHosp.sevak !== 'Unassigned' &&
      currentHosp.sevak !== '—'
    ) {
      const names = currentHosp.sevak.split(/[,|;]/).map((n) => n.trim()).filter(Boolean);
      return names.map((n) => {
        const match = arogyaSevaks?.find((as) => as.name?.toLowerCase() === n.toLowerCase());
        return match || { name: n, mobile: currentHosp.sevakMobile || '—', status: 'Active' };
      });
    }

    return [];
  }, [currentHosp, arogyaSevaks]);

  // Filtered doctors list for this specific hospital
  const filteredDoctors = useMemo(() => {
    let list = Array.isArray(doctorsList) ? [...doctorsList] : [];
    
    // Strict guard: ensure doctors belong specifically to this hospital
    const hospIdStr = String(currentHosp?.id || '').toLowerCase();
    const hospNameStr = String(currentHosp?.name || '').toLowerCase().trim();

    list = list.filter((d) => {
      const dHospId = String(d.hospitalId || d.hospital_id || '').toLowerCase();
      const dHospName = String(d.hospitalName || '').toLowerCase().trim();
      return !dHospId || dHospId === hospIdStr || (dHospName && dHospName === hospNameStr);
    });

    if (doctorDutyFilter !== 'All') {
      if (doctorDutyFilter === 'Shift') {
        list = list.filter((d) => (d.dutyType || d.duty_type) === 'Shift');
      } else if (doctorDutyFilter === 'On-Call') {
        list = list.filter((d) => (d.dutyType || d.duty_type) === 'On-Call');
      } else if (doctorDutyFilter === 'Available') {
        list = list.filter((d) => (d.availabilityStatus || d.availability_status) === 'Available');
      }
    }

    if (doctorSearchQuery.trim()) {
      const q = doctorSearchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        const name = (d.name || '').toLowerCase();
        const qual = (d.qualification || '').toLowerCase();
        const spec = (d.specialization || '').toLowerCase();
        const specs = Array.isArray(d.specialties) ? d.specialties.join(' ').toLowerCase() : '';
        const phone = (d.contactPhone || d.contactNumber || d.phone || '').toLowerCase();
        const code = (d.doctorCode || d.registrationNumber || '').toLowerCase();
        return (
          name.includes(q) ||
          qual.includes(q) ||
          spec.includes(q) ||
          specs.includes(q) ||
          phone.includes(q) ||
          code.includes(q)
        );
      });
    }

    return list;
  }, [doctorsList, doctorDutyFilter, doctorSearchQuery, currentHosp?.id, currentHosp?.name]);

  const doctorCounts = useMemo(() => {
    const all = Array.isArray(doctorsList) ? doctorsList : [];
    return {
      total: all.length,
      shift: all.filter((d) => (d.dutyType || d.duty_type) === 'Shift').length,
      onCall: all.filter((d) => (d.dutyType || d.duty_type) === 'On-Call').length,
      available: all.filter((d) => (d.availabilityStatus || d.availability_status) === 'Available').length
    };
  }, [doctorsList]);

  if (loading) {
    return (
      <Loader
        fullPage
        message="Loading Hospital Details..."
        subtext="Fetching clinical infrastructure, bed capacities, and Arogya Sevak roster"
      />
    );
  }

  // Structured ArogyaSevak telemetry dataset
  const sevakData = {
    lastUpdated: '15 Jun 2025 · 10:30 AM',
    reportedBy: assignedSevaksList.length > 0 ? `${assignedSevaksList[0].name || assignedSevaksList[0].full_name} (ArogyaSevak)` : 'ArogyaSevak Field Desk',
    is247Emergency: true,
    hasAmbulance: true,
    specializations: [
      { name: 'General Medicine', desc: 'Internal medicine & inpatient consultation', active: true },
      { name: 'General Surgery', desc: 'Routine & emergency surgical procedures', active: true },
      { name: 'Orthopedics', desc: 'Bone, joint & trauma fracture management', active: true },
      { name: 'Pediatrics & NICU', desc: 'Child health, pediatric & neonatal care', active: true },
      { name: 'Gynecology & Obstetrics', desc: 'Maternal, labor & female healthcare', active: true },
      { name: 'Cardiology (CathLab)', desc: 'Cardiac care & heart diagnostic support', active: true },
      { name: 'Neurology & Brain Care', desc: 'Brain & nerve treatment unit', active: true },
      { name: 'Neurosurgery', desc: 'Operative brain & spine surgery unit', active: true },
      { name: 'Nephrology & Renal', desc: 'Kidney disease & renal care', active: true },
      { name: 'Pulmonology', desc: 'Lung care & respiratory disorders', active: false },
      { name: 'Oncology (Chemo)', desc: 'Cancer diagnosis & chemotherapy', active: false }
    ],
    operations: [
      { name: 'Major Surgery', desc: 'Complex surgical operations capability', active: true },
      { name: 'Emergency Surgery', desc: 'Immediate emergency OT intervention', active: true },
      { name: 'C-Section (Cesarean)', desc: 'Emergency & planned obstetrics surgery', active: true },
      { name: 'Fracture / Joint Surgery', desc: 'Bone setting & joint reconstruction', active: true },
      { name: 'Brain Neurosurgery', desc: 'Craniotomy & brain injury surgery', active: true },
      { name: 'Angioplasty & Stenting', desc: 'Cath lab coronary stenting', active: true },
      { name: 'Dialysis Unit Care', desc: 'Renal hemodialysis facility', active: true },
      { name: 'Open Heart Surgery', desc: 'Bypass, valve & cardiac surgery', active: false },
      { name: 'Cancer Tumor Resection', desc: 'Surgical oncology procedures', active: false }
    ],
    beds: {
      totalHospitalBeds: 150,
      availableHospitalBeds: 45,
      totalIcuBeds: 30,
      availableIcuBeds: 8,
      totalEmergencyBeds: 20,
      availableEmergencyBeds: 5
    },
    criticalEquipment: [
      { name: 'ICU Unit', desc: 'Intensive care unit beds', active: true },
      { name: 'Ventilators', desc: 'Mechanical ventilation support', active: true },
      { name: 'Oxygen Support Beds', desc: 'Piped oxygen supply beds', active: true },
      { name: 'Dialysis Machines', desc: 'Hemodialysis equipment setup', active: true },
      { name: 'Operation Theatres', desc: 'Equipped surgical OTs', active: true },
      { name: 'Blood Bank Unit', desc: 'In-house blood storage & bank', active: true },
      { name: 'CT Scan Machine', desc: 'Computed tomography scanner', active: true },
      { name: 'Digital X-Ray Unit', desc: 'Digital radiography imaging', active: true },
      { name: 'Ultrasound Scanner', desc: 'Sonography diagnostic unit', active: true },
      { name: 'MRI Machine', desc: 'Magnetic resonance imaging', active: false }
    ],
    emergencyCapability: [
      { name: 'Critical Patient Triage', desc: 'Immediate emergency resuscitation capability', active: true },
      { name: '24×7 Emergency Surgery', desc: 'On-call surgical & anesthesia team', active: true },
      { name: '24×7 ICU Support', desc: 'Round-the-clock intensivist doctor', active: true },
      { name: 'Invasive Ventilator Support', desc: 'Functional invasive ventilators', active: true },
      { name: 'Emergency Blood Transfusion', desc: 'Blood bank access & cross-matching', active: true }
    ],
    liveStatus: {
      acceptingPatients: true,
      emergencyLoad: 'Medium (Steady Flow)',
      tempUnavailableService: 'None reported',
      remarks: 'Neurosurgery ICU bed availability is optimal for emergency transfers from Pune rural area. 24x7 Trauma team active.'
    }
  };

  // Status Pill Component
  const StatusPill = ({ active, labelYes = 'Available', labelNo = 'Not Available' }) => (
    <span className={`hosp-status-pill ${active ? 'is-active' : 'is-inactive'}`}>
      {active ? (
        <>
          <CheckCircle2 size={13} />
          <span>{labelYes}</span>
        </>
      ) : (
        <>
          <XCircle size={13} />
          <span>{labelNo}</span>
        </>
      )}
    </span>
  );

  return (
    <div className="hospital-detail-page">
      {/* Top Header & Navigation */}
      <div className="hosp-detail-top-nav">
        {location.pathname.startsWith('/arogyasevak') ? (
          <Link to="/arogyasevak/portal" className="hosp-back-btn">
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          <Link to="/admin/hospitals" className="hosp-back-btn">
            <ArrowLeft size={18} />
            <span>Back to Hospital Directory</span>
          </Link>
        )}
        <span className="live-report-badge">
          <Clock size={14} /> Telemetry Updated: {sevakData.lastUpdated}
        </span>
      </div>

      {/* Hospital Title Banner */}
      <div className="hosp-header-card">
        <div className="hosp-header-main-info">
          <div className="hosp-avatar-icon">
            <Building2 size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="hosp-title-name">{currentHosp.name}</h1>
              <span className={`hosp-type-chip ${currentHosp.type === 'Non-Government' ? 'n-govt' : 'govt'}`}>
                {currentHosp.type === 'Non-Government' ? 'Non-Government / Private' : 'Government / Public'}
              </span>
            </div>
            <div className="hosp-address-row">
              <span><MapPin size={14} /> {currentHosp.address}</span>
              <span className="dot">•</span>
              <span><ShieldCheck size={14} /> {currentHosp.scheme}</span>
              <span className="dot">•</span>
              <span><Phone size={14} /> {currentHosp.contact}</span>
              {assignedSevaksList.length > 0 && (
                <>
                  <span className="dot">•</span>
                  <span className="text-blue font-bold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <UserCheck size={14} />
                    {assignedSevaksList.map((s) => s.name || s.full_name || s.sevak_name).join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hosp-header-quick-stats">
          <div className="quick-stat-item">
            <span className="qs-label">Total Beds</span>
            <span className="qs-value text-emerald">{sevakData.beds.availableHospitalBeds} / {sevakData.beds.totalHospitalBeds} Available</span>
          </div>
          <div className="quick-stat-item">
            <span className="qs-label">ICU Beds</span>
            <span className="qs-value text-blue">{sevakData.beds.availableIcuBeds} / {sevakData.beds.totalIcuBeds} Free</span>
          </div>
        </div>
      </div>

      {/* Top KPI Telemetry Cards Bar */}
      <div className="telemetry-kpi-bar">
        {/* KPI 1: Bed Occupancy */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <BedDouble size={20} color="#0284c7" />
            <span className="kpi-title">Inpatient Bed Capacity</span>
          </div>
          <div className="kpi-body">
            <div className="bed-progress-row">
              <div className="bed-meta">
                <span>General Beds</span>
                <strong>{sevakData.beds.availableHospitalBeds} Free of {sevakData.beds.totalHospitalBeds}</strong>
              </div>
              <div className="bed-progress-bar">
                <div 
                  className="bed-progress-fill green" 
                  style={{ width: `${(sevakData.beds.availableHospitalBeds / sevakData.beds.totalHospitalBeds) * 100}%` }} 
                />
              </div>
            </div>

            <div className="bed-progress-row">
              <div className="bed-meta">
                <span>ICU Beds</span>
                <strong>{sevakData.beds.availableIcuBeds} Free of {sevakData.beds.totalIcuBeds}</strong>
              </div>
              <div className="bed-progress-bar">
                <div 
                  className="bed-progress-fill blue" 
                  style={{ width: `${(sevakData.beds.availableIcuBeds / sevakData.beds.totalIcuBeds) * 100}%` }} 
                />
              </div>
            </div>

            <div className="bed-progress-row">
              <div className="bed-meta">
                <span>Emergency Casualty Beds</span>
                <strong>{sevakData.beds.availableEmergencyBeds} Free of {sevakData.beds.totalEmergencyBeds}</strong>
              </div>
              <div className="bed-progress-bar">
                <div 
                  className="bed-progress-fill amber" 
                  style={{ width: `${(sevakData.beds.availableEmergencyBeds / sevakData.beds.totalEmergencyBeds) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Emergency Readiness */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <HeartPulse size={20} color="#dc2626" />
            <span className="kpi-title">Emergency Services</span>
          </div>
          <div className="kpi-body kpi-grid-stats">
            <div className="stat-pill-box">
              <span className="sp-name">24×7 Emergency</span>
              <StatusPill active={sevakData.is247Emergency} labelYes="Active" labelNo="Inactive" />
            </div>
            <div className="stat-pill-box">
              <span className="sp-name">Ambulance Service</span>
              <StatusPill active={sevakData.hasAmbulance} labelYes="Available" labelNo="None" />
            </div>
            <div className="stat-pill-box">
              <span className="sp-name">New Admissions</span>
              <StatusPill active={sevakData.liveStatus.acceptingPatients} labelYes="Open" labelNo="Full" />
            </div>
            <div className="stat-pill-box">
              <span className="sp-name">Emergency Load</span>
              <span className="badge-load-medium">⚡ {sevakData.liveStatus.emergencyLoad}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: ArogyaSevak Remarks */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <Sparkles size={20} color="#7c3aed" />
            <span className="kpi-title">Field Remarks & Notes</span>
          </div>
          <div className="kpi-body">
            <p className="field-remarks-text">
              "{sevakData.liveStatus.remarks}"
            </p>
            <div className="field-remarks-footer">
              <span>Status: <strong style={{ color: '#059669' }}>Operational ✓</strong></span>
              <span>Updated: <strong>Today 10:30 AM</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. General Hospital & Location Details */}
      <div className="detail-section-card">
        <div className="detail-section-header">
          <div className="sec-header-title">
            <Building2 size={18} className="text-blue" />
            <h3>1. General Facility & Geographic Info</h3>
          </div>
          <span className="sec-tag-badge">BASIC INFO</span>
        </div>

        <div className="detail-info-grid">
          <div className="info-block">
            <span className="ib-label">HOSPITAL NAME</span>
            <span className="ib-value bold">{currentHosp.name}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">HOSPITAL TYPE</span>
            <span className="ib-value">{currentHosp.type === 'Non-Government' ? 'Non-Government / Private' : 'Government / Public'}</span>
          </div>

          <div className="info-block span-two">
            <span className="ib-label">FULL STREET ADDRESS</span>
            <span className="ib-value">{currentHosp.address}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">CITY / DISTRICT</span>
            <span className="ib-value">{currentHosp.location || 'Pune'}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">TALUKA / SUB-DISTRICT</span>
            <span className="ib-value">{currentHosp.areaTaluka || 'Haveli Taluka'}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">PINCODE</span>
            <span className="ib-value">{currentHosp.pincode || '411004'}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">NEAREST LANDMARK</span>
            <span className="ib-value">{currentHosp.nearestLandmark || 'Near Swargate Bus Stand (500m)'}</span>
          </div>

          <div className="info-block">
            <span className="ib-label">HELPLINE CONTACT</span>
            <span className="ib-value font-mono">{currentHosp.contact || '020-25678900'}</span>
          </div>

          <div className="info-block span-two">
            <span className="ib-label">EMPANELLED SCHEMES</span>
            <span className="ib-value text-emerald font-bold">{currentHosp.scheme}</span>
          </div>

          {/* Prominent Assigned ArogyaSevak(s) Field Desk Section */}
          <div className="info-block span-three assigned-sevaks-highlight-box">
            <div className="assigned-sevak-hdr">
              <div className="assigned-sevak-hdr-left">
                <UserCheck size={16} color="#0284c7" />
                <span className="ib-label" style={{ margin: 0, color: '#0369a1' }}>
                  ASSIGNED AROGYASEVAK (FIELD DESK OFFICER)
                </span>
                {assignedSevaksList.length > 0 && (
                  <span className="assigned-count-pill">
                    {assignedSevaksList.length} Active {assignedSevaksList.length === 1 ? 'Sevak' : 'Sevaks'}
                  </span>
                )}
              </div>

              {!location.pathname.startsWith('/arogyasevak') && (
                <Link
                  to={`/admin/hospitals/assign-sevaks/${encodeURIComponent(currentHosp.id || currentHosp.hospital_code || '')}`}
                  state={{ hospitalId: currentHosp.id, hospitalName: currentHosp.name }}
                  className="btn-reassign-link"
                >
                  <UserCheck size={13} />
                  <span>{assignedSevaksList.length > 0 ? 'Change / Manage Assignment' : '+ Assign ArogyaSevak'}</span>
                </Link>
              )}
            </div>

            {assignedSevaksList.length > 0 ? (
              <div className="assigned-sevak-cards-container">
                {assignedSevaksList.map((sevak, idx) => {
                  const sName = sevak.name || sevak.full_name || sevak.sevak_name || 'Arogya Sevak';
                  const sMobile = sevak.mobile || sevak.phone || '—';
                  const sTaluka = sevak.taluka || sevak.city || sevak.district || '';
                  const sAddress = sevak.fullAddress || sevak.address || '';
                  const sPatients = sevak.patients || sevak.activeCases || 0;

                  return (
                    <div key={idx} className="assigned-sevak-entry-card">
                      <div className="sevak-entry-avatar">
                        <UserCheck size={18} />
                      </div>
                      <div className="sevak-entry-info">
                        <div className="sevak-entry-title-row">
                          <span className="sevak-entry-name">{sName}</span>
                          <span className="sevak-active-badge">✓ Assigned Officer</span>
                        </div>
                        <div className="sevak-entry-meta">
                          {sMobile && sMobile !== '—' && (
                            <span className="sevak-meta-phone">
                              <Phone size={12} /> {sMobile}
                            </span>
                          )}
                          {(sTaluka || sAddress) && (
                            <span className="sevak-meta-loc">
                              <MapPin size={12} /> {sTaluka ? `${sTaluka} Region` : sAddress}
                            </span>
                          )}
                          <span className="sevak-meta-cases">
                            📊 {sPatients} Active Cases
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="unassigned-sevak-state">
                <span className="unassigned-text">
                  ⚠️ No ArogyaSevak is currently assigned to this hospital.
                </span>
                {!location.pathname.startsWith('/arogyasevak') && (
                  <Link
                    to={`/admin/hospitals/assign-sevaks/${encodeURIComponent(currentHosp.id || currentHosp.hospital_code || '')}`}
                    state={{ hospitalId: currentHosp.id, hospitalName: currentHosp.name }}
                    className="quick-assign-cta"
                  >
                    <UserCheck size={14} /> Assign ArogyaSevak Now
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Hospital Doctors & Medical Specialists Table */}
      <div className="detail-section-card doctors-roster-section">
        <div 
          className="detail-section-header clickable" 
          onClick={() => setIsDoctorsExpanded((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDoctorsExpanded((prev) => !prev); }}
        >
          <div className="sec-header-title">
            <Stethoscope size={18} className="text-emerald" />
            <h3>2. Hospital Doctors & Medical Specialist Roster</h3>
            <span className="doc-count-badge-top">
              {doctorsList.length} {doctorsList.length === 1 ? 'Doctor' : 'Doctors'} Assigned
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-add-doctor-hosp"
              onClick={(e) => {
                e.stopPropagation();
                openAddDoctorModal();
              }}
              title="Add a new doctor to this hospital"
            >
              <Plus size={15} />
              <span>Add Doctor</span>
            </button>
            <span className="sec-tag-badge emerald">DOCTORS TABLE</span>
            <button className="btn-collapse-toggle" type="button" aria-label="Toggle Doctors Table">
              {isDoctorsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {isDoctorsExpanded && (
          <div className="doctors-table-section-content">
            {/* Quick KPI Stats Row for Doctors */}
            <div className="doctors-summary-kpi-bar">
              <div className="doc-kpi-box">
                <span className="doc-kpi-num">{doctorCounts.total}</span>
                <span className="doc-kpi-lbl">Total Hospital Doctors</span>
              </div>
              <div className="doc-kpi-box shift-highlight">
                <span className="doc-kpi-num">{doctorCounts.shift}</span>
                <span className="doc-kpi-lbl">Shift Duty Specialists</span>
              </div>
              <div className="doc-kpi-box oncall-highlight">
                <span className="doc-kpi-num">{doctorCounts.onCall}</span>
                <span className="doc-kpi-lbl">24/7 On-Call Doctors</span>
              </div>
              <div className="doc-kpi-box available-highlight">
                <span className="doc-kpi-num">{doctorCounts.available}</span>
                <span className="doc-kpi-lbl">Currently Available</span>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="doctors-table-toolbar">
              <div className="doc-search-input-wrap">
                <Search size={15} className="doc-search-icon" />
                <input
                  type="text"
                  className="doc-search-field"
                  placeholder="Search by doctor name, qualification, specialization or phone..."
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                />
                {doctorSearchQuery && (
                  <button className="btn-clear-search" type="button" onClick={() => setDoctorSearchQuery('')}>
                    ×
                  </button>
                )}
              </div>

              <div className="doc-filter-pills-group">
                {[
                  { key: 'All', label: `All Doctors (${doctorCounts.total})` },
                  { key: 'Shift', label: `Shift (${doctorCounts.shift})` },
                  { key: 'On-Call', label: `On-Call (${doctorCounts.onCall})` },
                  { key: 'Available', label: `Available (${doctorCounts.available})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`doc-filter-pill ${doctorDutyFilter === f.key ? 'active' : ''}`}
                    onClick={() => setDoctorDutyFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctors Table Container */}
            {loadingDoctors ? (
              <div className="doc-table-loading-state">
                <Loader message="Loading Hospital Doctors..." />
              </div>
            ) : filteredDoctors.length > 0 ? (
              <div className="hospital-doctors-table-container">
                <table className="hospital-doctors-table">
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Doctor & Registration</th>
                      <th style={{ width: '20%' }}>Specialization & Dept</th>
                      <th style={{ width: '10%' }}>Type</th>
                      <th style={{ width: '22%' }}>Duty Availability & Timings</th>
                      <th style={{ width: '14%' }}>Contact & Status</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map((doc, idx) => {
                      const avail = doc.availabilityStatus || doc.availability_status || 'Available';
                      const availCfg = AVAILABILITY_CONFIG[avail] || AVAILABILITY_CONFIG.Available;
                      const specList = Array.isArray(doc.specialties) && doc.specialties.length > 0
                        ? doc.specialties
                        : (doc.specialization ? [doc.specialization] : ['General Medicine']);
                      const dutyType = doc.dutyType || doc.duty_type || 'Shift';
                      const workingDays = Array.isArray(doc.workingDays || doc.working_days)
                        ? (doc.workingDays || doc.working_days)
                        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                      const isDocInactive = doc.isActive === false || doc.is_active === false || String(doc.status || '').toUpperCase() === 'INACTIVE';

                      return (
                        <tr
                          key={doc.id || idx}
                          className={`hosp-doc-row ${isDocInactive ? 'is-inactive-doc' : ''}`}
                          style={isDocInactive ? { opacity: 0.65, backgroundColor: '#f8fafc' } : {}}
                          onClick={() => setViewingDoctor(doc)}
                          title={`Click to view full doctor details${isDocInactive ? ' (Inactive)' : ''}`}
                        >
                          {/* 1. Doctor Name & Code */}
                          <td>
                            <div className="doc-main-cell">
                              <div className="doc-avatar-badge" style={isDocInactive ? { backgroundColor: '#e2e8f0', color: '#64748b' } : {}}>
                                {getDoctorInitials(doc.name)}
                              </div>
                              <div className="doc-name-block">
                                <span className="doc-row-name" style={isDocInactive ? { color: '#64748b' } : {}}>{doc.name}</span>
                                <div className="doc-qual-pills-row">
                                  <span className="doc-qual-chip">
                                    <GraduationCap size={11} /> {doc.qualification || 'MBBS'}
                                  </span>
                                  {(doc.doctorCode || doc.registrationNumber) && (
                                    <span className="doc-code-chip">
                                      {doc.doctorCode || doc.registrationNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Specialization */}
                          <td>
                            <div className="doc-spec-cell">
                              <span className="doc-primary-spec-tag">
                                {doc.specialization || specList[0] || 'General Medicine'}
                              </span>
                              {specList.length > 1 && (
                                <div className="doc-sub-specs">
                                  {specList.slice(1, 3).map((s, si) => (
                                    <span key={si} className="doc-sub-spec-chip">{s}</span>
                                  ))}
                                  {specList.length > 3 && (
                                    <span className="doc-sub-spec-more">+{specList.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. Doctor Type */}
                          <td>
                            <span className={`doc-type-badge ${(doc.doctorType || doc.doctor_type || 'Both').toLowerCase()}`}>
                              {doc.doctorType || doc.doctor_type || 'Both'}
                            </span>
                          </td>

                          {/* 4. Duty Availability & Shift Timings */}
                          <td>
                            <div className="doc-duty-cell">
                              <div className="doc-duty-hdr">
                                <span className={`doc-duty-type-pill ${dutyType === 'On-Call' ? 'on-call' : 'shift'}`}>
                                  {dutyType === 'On-Call' ? '⚡ 24/7 On-Call' : '🕒 Shift Timing'}
                                </span>
                                <span className="doc-timing-text">
                                  {dutyType === 'On-Call'
                                    ? 'Emergency On-Call'
                                    : (doc.opdTiming || `${doc.startTime || '04:00'} ${doc.startPeriod || 'PM'} - ${doc.endTime || '08:00'} ${doc.endPeriod || 'PM'}`)}
                                </span>
                              </div>

                              {dutyType !== 'On-Call' && (
                                <div className="doc-days-pills-row">
                                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                                    const isWork = workingDays.includes(day);
                                    return (
                                      <span key={day} className={`doc-day-dot ${isWork ? 'active' : 'inactive'}`} title={isWork ? `${day}: Working` : `${day}: Off`}>
                                        {day.slice(0, 1)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Contact & Status */}
                          <td>
                            <div className="doc-contact-cell">
                              {(doc.contactPhone || doc.contactNumber || doc.phone) ? (
                                <a
                                  href={`tel:${doc.contactPhone || doc.contactNumber || doc.phone}`}
                                  className="doc-phone-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone size={12} /> {doc.contactPhone || doc.contactNumber || doc.phone}
                                </a>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>—</span>
                              )}

                              {isDocInactive ? (
                                <span 
                                  className="doc-avail-status-chip"
                                  style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#64748b',
                                    borderColor: '#cbd5e1'
                                  }}
                                >
                                  <span className="doc-status-dot" style={{ backgroundColor: '#94a3b8' }} />
                                  Inactive
                                </span>
                              ) : (
                                <span 
                                  className="doc-avail-status-chip"
                                  style={{
                                    backgroundColor: availCfg.bg,
                                    color: availCfg.text,
                                    borderColor: availCfg.border
                                  }}
                                >
                                  <span className="doc-status-dot" style={{ backgroundColor: availCfg.dot }} />
                                  {availCfg.label}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Action */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-doc-view-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDoctor(doc);
                              }}
                              title="View Complete Doctor Profile"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-hospital-doctors-box">
                <div className="empty-doc-icon">
                  <Stethoscope size={36} color="#94a3b8" />
                </div>
                <h4>No Doctors Found for {currentHosp.name}</h4>
                <p>
                  {doctorSearchQuery || doctorDutyFilter !== 'All'
                    ? 'No doctors match the selected search or duty filters. Try clearing your search.'
                    : `Currently there are no medical specialists or OPD doctors assigned to ${currentHosp.name}. You can add doctors now to populate the roster.`}
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    className="btn-add-doc-empty"
                    type="button"
                    onClick={openAddDoctorModal}
                  >
                    <Plus size={16} />
                    <span>Add Doctor to {currentHosp.name}</span>
                  </button>
                  {(doctorSearchQuery || doctorDutyFilter !== 'All') && (
                    <button
                      className="btn-reset-filter"
                      type="button"
                      onClick={() => {
                        setDoctorSearchQuery('');
                        setDoctorDutyFilter('All');
                      }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Clinical Specializations */}
      <div className="detail-section-card">
        <div className="detail-section-header">
          <div className="sec-header-title">
            <Stethoscope size={18} className="text-emerald" />
            <h3>3. Clinical Specializations & Medical Departments</h3>
          </div>
          <span className="sec-tag-badge emerald">CLINICAL UNITS</span>
        </div>

        <div className="items-grid-two">
          {sevakData.specializations.map((spec, i) => (
            <div key={i} className={`telemetry-item-row ${spec.active ? 'active' : 'inactive'}`}>
              <div className="item-text-group">
                <span className="item-title">{spec.name}</span>
                <span className="item-desc">{spec.desc}</span>
              </div>
              <StatusPill active={spec.active} />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Surgical Operations & Procedures */}
      <div className="detail-section-card">
        <div className="detail-section-header">
          <div className="sec-header-title">
            <Scissors size={18} className="text-purple" />
            <h3>4. Surgical Operations & Interventions</h3>
          </div>
          <span className="sec-tag-badge purple">SURGICAL OT</span>
        </div>

        <div className="items-grid-two">
          {sevakData.operations.map((op, i) => (
            <div key={i} className={`telemetry-item-row ${op.active ? 'active' : 'inactive'}`}>
              <div className="item-text-group">
                <span className="item-title">{op.name}</span>
                <span className="item-desc">{op.desc}</span>
              </div>
              <StatusPill active={op.active} />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Critical Equipment & Diagnostic Support */}
      <div className="detail-section-card">
        <div className="detail-section-header">
          <div className="sec-header-title">
            <Activity size={18} className="text-amber" />
            <h3>5. Critical Equipment & Life Support Systems</h3>
          </div>
          <span className="sec-tag-badge amber">EQUIPMENT & DIAGNOSTICS</span>
        </div>

        <div className="items-grid-two">
          {sevakData.criticalEquipment.map((eq, i) => (
            <div key={i} className={`telemetry-item-row ${eq.active ? 'active' : 'inactive'}`}>
              <div className="item-text-group">
                <span className="item-title">{eq.name}</span>
                <span className="item-desc">{eq.desc}</span>
              </div>
              <StatusPill active={eq.active} />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Emergency & Trauma Readiness */}
      <div className="detail-section-card">
        <div className="detail-section-header">
          <div className="sec-header-title">
            <Radio size={18} className="text-red" />
            <h3>6. Emergency & Trauma Care Capabilities</h3>
          </div>
          <span className="sec-tag-badge red">TRAUMA READINESS</span>
        </div>

        <div className="items-grid-two">
          {sevakData.emergencyCapability.map((ec, i) => (
            <div key={i} className={`telemetry-item-row ${ec.active ? 'active' : 'inactive'}`}>
              <div className="item-text-group">
                <span className="item-title">{ec.name}</span>
                <span className="item-desc">{ec.desc}</span>
              </div>
              <StatusPill active={ec.active} labelYes="Supported" labelNo="Not Supported" />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toast.show && (
        <div className={`hosp-toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Add Doctor to Hospital Modal */}
      {isAddDoctorModalOpen && (
        <div className="doctor-modal-overlay" onClick={closeAddDoctorModal}>
          <div className="doctor-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="doctor-modal-header">
              <div className="doctor-modal-head-left">
                <div className="doctor-modal-icon-badge">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="doctor-modal-title">Add Doctor to Hospital</h3>
                  <p className="doctor-modal-subtitle">
                    Assigning new physician to <strong>{currentHosp.name}</strong> ({currentHosp.hospital_code || currentHosp.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-doctor-modal-close"
                onClick={closeAddDoctorModal}
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="doctor-modal-body">
              {/* Doctor Full Name */}
              <div className="form-field">
                <label className="field-label" htmlFor="hosp-doc-name">
                  Doctor Full Name <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={16} className="icon-prefix" />
                  <input
                    id="hosp-doc-name"
                    type="text"
                    className={`field-input icon-padded ${doctorFormErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Dr. Rajesh Kulkarni, MD (Cardiology)"
                    value={doctorForm.name}
                    onChange={(e) => handleDoctorInputChange('name', e.target.value)}
                    autoFocus
                  />
                </div>
                {doctorFormErrors.name && (
                  <span className="error-text">
                    <AlertCircle size={13} />
                    {doctorFormErrors.name}
                  </span>
                )}
              </div>

              {/* Contact Grid: Phone & Alt Phone */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-phone">
                    Primary Phone / Mobile Number <span className="req-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Phone size={16} className="icon-prefix" />
                    <input
                      id="hosp-doc-phone"
                      type="tel"
                      className={`field-input icon-padded ${doctorFormErrors.phone ? 'input-error' : ''}`}
                      placeholder="e.g. 9822011223"
                      value={doctorForm.phone}
                      onChange={(e) => handleDoctorInputChange('phone', e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  {doctorFormErrors.phone && (
                    <span className="error-text">
                      <AlertCircle size={13} />
                      {doctorFormErrors.phone}
                    </span>
                  )}
                  <span className="field-hint">Primary mobile for emergency/OPD coordination</span>
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-altphone">
                    Alternative Contact Number
                  </label>
                  <div className="input-with-icon">
                    <Phone size={16} className="icon-prefix" />
                    <input
                      id="hosp-doc-altphone"
                      type="tel"
                      className="field-input icon-padded"
                      placeholder="e.g. 020-25678900"
                      value={doctorForm.altPhone}
                      onChange={(e) => handleDoctorInputChange('altPhone', e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  <span className="field-hint">Optional secondary or clinic landline</span>
                </div>
              </div>

              {/* Email Address */}
              <div className="form-field">
                <label className="field-label" htmlFor="hosp-doc-email">
                  Doctor Email Address
                </label>
                <div className="input-with-icon">
                  <Mail size={16} className="icon-prefix" />
                  <input
                    id="hosp-doc-email"
                    type="email"
                    className="field-input icon-padded"
                    placeholder="e.g. dr.rajesh.kulkarni@hospital.org"
                    value={doctorForm.email}
                    onChange={(e) => handleDoctorInputChange('email', e.target.value)}
                  />
                </div>
                <span className="field-hint">For clinical notifications, pre-auth alerts, and escalations</span>
              </div>

              {/* Qualification & Degrees */}
              <div className="form-field">
                <label className="field-label" htmlFor="hosp-doc-qualification">
                  Qualification & Degrees <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <GraduationCap size={16} className="icon-prefix" />
                  <input
                    id="hosp-doc-qualification"
                    type="text"
                    className="field-input icon-padded"
                    placeholder="e.g. MBBS, MD (Medicine), DM (Cardiology)"
                    value={doctorForm.qualification}
                    onChange={(e) => handleDoctorInputChange('qualification', e.target.value)}
                  />
                </div>

                {/* Quick select pills */}
                <div className="doctor-quick-pills-row" style={{ marginTop: '6px' }}>
                  <span className="quick-pill-label">Quick select:</span>
                  <div className="am-quick-qual-pills">
                    {(showAllQualifications ? ALL_QUALIFICATIONS : PRIMARY_QUALIFICATIONS).map((qual) => {
                      const isPicked = (doctorForm.qualification || '').includes(qual);
                      return (
                        <button
                          key={qual}
                          type="button"
                          className={`quick-select-pill ${isPicked ? 'active' : ''}`}
                          onClick={() => {
                            const current = (doctorForm.qualification || '').trim();
                            if (!current) {
                              handleDoctorInputChange('qualification', qual);
                            } else if (current.includes(qual)) {
                              const cleaned = current
                                .split(/[,+]/)
                                .map((s) => s.trim())
                                .filter((s) => s && s !== qual)
                                .join(', ');
                              handleDoctorInputChange('qualification', cleaned);
                            } else {
                              handleDoctorInputChange('qualification', `${current}, ${qual}`);
                            }
                          }}
                        >
                          {isPicked ? '✓ ' : '+ '}{qual}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="quick-select-pill more-toggle-pill"
                      onClick={() => setShowAllQualifications((p) => !p)}
                    >
                      {showAllQualifications ? 'Show Less' : `+ More (${ALL_QUALIFICATIONS.length - PRIMARY_QUALIFICATIONS.length})`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Clinical Experience in Years */}
              <div className="form-field">
                <label className="field-label" htmlFor="hosp-doc-experience">
                  Clinical Experience (Years)
                </label>
                <div className="input-with-icon">
                  <Award size={16} className="icon-prefix" />
                  <input
                    id="hosp-doc-experience"
                    type="number"
                    min="0"
                    max="60"
                    className="field-input icon-padded"
                    placeholder="e.g. 14"
                    value={doctorForm.experience}
                    onChange={(e) => handleDoctorInputChange('experience', e.target.value)}
                  />
                </div>
                <span className="field-hint">e.g. 14 Years of Clinical Practice, Senior Consultant</span>
              </div>

              {/* Duty Availability & Shift Type Selector */}
              <div className="am-doc-duty-schedule-card">
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label" style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Duty Availability & Timing Type <span className="req-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Clock size={16} className="icon-prefix" style={{ color: '#64748b' }} />
                    <select
                      className="field-input icon-padded"
                      value={doctorForm.dutyType || 'Shift'}
                      onChange={(e) => handleDoctorInputChange('dutyType', e.target.value)}
                      style={{ cursor: 'pointer', fontWeight: 600 }}
                    >
                      <option value="Shift">Regular Shift (Set Start & End Time)</option>
                      <option value="On-Call">On-Call Specialist (Emergency / Call Basis)</option>
                    </select>
                  </div>
                </div>

                {/* If On-Call is selected: No time asked, show info badge */}
                {doctorForm.dutyType === 'On-Call' ? (
                  <div className="am-doc-oncall-notice">
                    <Phone size={16} className="text-blue" />
                    <div>
                      <strong>On-Call Duty Selected</strong>
                      <p>Doctor is available 24/7 on emergency call basis. No fixed shift timing is required.</p>
                    </div>
                  </div>
                ) : (
                  /* If Shift is selected: Show Start Time and End Time with AM/PM selection & Working Days */
                  <div className="am-doc-shift-timing-box">
                    {/* 1. Duty Days in a Week (Weekdays) */}
                    <div className="am-weekdays-group-wrap">
                      <div className="doc-section-subtitle-wrap" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                        <label className="field-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.75rem' }}>
                          Duty Days in a Week (Weekdays) <span className="req-star">*</span>
                        </label>
                        <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 700 }}>
                          {(doctorForm.workingDays || []).length} / 7 Days Active
                        </span>
                      </div>

                      <div className="am-weekdays-pills-row">
                        {WEEK_DAYS.map((day) => {
                          const isDayActive = (doctorForm.workingDays || []).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`am-weekday-btn ${isDayActive ? 'is-selected' : ''}`}
                              onClick={() => handleToggleDoctorWorkingDay(day)}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Day Presets */}
                      <div className="doctor-quick-pills-row" style={{ marginTop: '2px' }}>
                        <span className="quick-pill-label">Quick select:</span>
                        <div className="am-quick-qual-pills">
                          <button
                            type="button"
                            className="quick-select-pill"
                            onClick={() => setDoctorForm((prev) => ({ ...prev, workingDays: [...WEEK_DAYS] }))}
                          >
                            All Days (Mon - Sun)
                          </button>
                          <button
                            type="button"
                            className="quick-select-pill"
                            onClick={() => setDoctorForm((prev) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }))}
                          >
                            Mon - Sat
                          </button>
                          <button
                            type="button"
                            className="quick-select-pill"
                            onClick={() => setDoctorForm((prev) => ({ ...prev, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))}
                          >
                            Mon - Fri (Weekdays)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Start Time & End Time */}
                    <div className="form-grid-two" style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      {/* Start Time */}
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="field-label" style={{ fontWeight: 700, fontSize: '0.725rem', textTransform: 'uppercase' }}>
                          Start Time <span className="req-star">*</span>
                        </label>
                        <div className="am-time-input-container">
                          <input
                            type="text"
                            className="am-time-field-input"
                            placeholder="04:00"
                            value={doctorForm.startTime || ''}
                            onChange={(e) => handleDoctorInputChange('startTime', e.target.value)}
                          />
                          <select
                            className="am-time-ampm-select"
                            value={doctorForm.startPeriod || 'PM'}
                            onChange={(e) => handleDoctorInputChange('startPeriod', e.target.value)}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="field-label" style={{ fontWeight: 700, fontSize: '0.725rem', textTransform: 'uppercase' }}>
                          End Time <span className="req-star">*</span>
                        </label>
                        <div className="am-time-input-container">
                          <input
                            type="text"
                            className="am-time-field-input"
                            placeholder="08:00"
                            value={doctorForm.endTime || ''}
                            onChange={(e) => handleDoctorInputChange('endTime', e.target.value)}
                          />
                          <select
                            className="am-time-ampm-select"
                            value={doctorForm.endPeriod || 'PM'}
                            onChange={(e) => handleDoctorInputChange('endPeriod', e.target.value)}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. Quick Common Shift Presets */}
                    <div className="doctor-quick-pills-row" style={{ marginTop: '2px' }}>
                      <span className="quick-pill-label">Presets:</span>
                      <div className="am-quick-qual-pills">
                        {SHIFT_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className="quick-select-pill"
                            onClick={() =>
                              setDoctorForm((prev) => ({
                                ...prev,
                                startTime: preset.sTime,
                                startPeriod: preset.sP,
                                endTime: preset.eTime,
                                endPeriod: preset.eP,
                              }))
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

              {/* Clinical Specialities with Dropdown and Quick Select */}
              <div className="form-field specialties-form-field" ref={docSpecialtiesDropdownRef}>
                <div className="specialties-field-label-row">
                  <label className="field-label" htmlFor="doc-field-specialties-trigger">
                    Doctor Specialities <span className="req-star">*</span>
                  </label>
                  {doctorSelectedSpecialties.length > 0 && (
                    <span className="specialties-count-badge">
                      {doctorSelectedSpecialties.length} Selected
                    </span>
                  )}
                </div>

                {/* Custom Multi-Select Dropdown Button */}
                <div className="specialties-dropdown-wrapper">
                  <button
                    id="doc-field-specialties-trigger"
                    type="button"
                    className={`specialties-dropdown-btn ${docSpecialtiesDropdownOpen ? 'open' : ''} ${doctorFormErrors.specialities ? 'input-error' : ''}`}
                    onClick={() => setDocSpecialtiesDropdownOpen((prev) => !prev)}
                    aria-expanded={docSpecialtiesDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <div className="specialties-btn-left">
                      <Stethoscope size={18} className="specialties-btn-icon" />
                      {doctorSelectedSpecialties.length === 0 ? (
                        <span className="specialties-placeholder">
                          Select doctor specialties (e.g. Cardiology, Hemodialysis)...
                        </span>
                      ) : (
                        <span className="specialties-btn-text">
                          <strong>{doctorSelectedSpecialties.length}</strong> {doctorSelectedSpecialties.length === 1 ? 'Specialty' : 'Specialties'} Selected
                        </span>
                      )}
                    </div>

                    <div className="specialties-btn-right">
                      {doctorSelectedSpecialties.length > 0 && (
                        <span
                          className="specialties-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDoctorClearAllSpecialties();
                          }}
                          title="Clear all doctor specialties"
                          role="button"
                          tabIndex={0}
                        >
                          <X size={14} />
                        </span>
                      )}
                      {docSpecialtiesDropdownOpen ? (
                        <ChevronUp size={18} className="dropdown-chevron text-blue" />
                      ) : (
                        <ChevronDown size={18} className="dropdown-chevron" />
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu Popover */}
                  {docSpecialtiesDropdownOpen && (
                    <div className="specialties-menu-popover" role="listbox">
                      {/* Search Bar & Quick Actions Toolbar */}
                      <div className="specialties-menu-header">
                        <div className="specialties-search-box">
                          <Search size={15} className="specialties-search-icon" />
                          <input
                            type="text"
                            className="specialties-search-input"
                            placeholder="Search clinical specialties..."
                            value={docSpecialtiesSearch}
                            onChange={(e) => setDocSpecialtiesSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          {docSpecialtiesSearch && (
                            <button
                              type="button"
                              className="specialties-search-clear"
                              onClick={() => setDocSpecialtiesSearch('')}
                              aria-label="Clear search"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        <div className="specialties-quick-actions">
                          <span className="specialties-quick-info">
                            Showing {filteredDoctorSpecialties.length} {filteredDoctorSpecialties.length === 1 ? 'specialty' : 'specialties'}
                          </span>
                          <div className="specialties-action-btns">
                            <button
                              type="button"
                              className="specialties-action-btn"
                              onClick={handleDoctorSelectAllFiltered}
                            >
                              Select All ({filteredDoctorSpecialties.length})
                            </button>
                            {doctorSelectedSpecialties.length > 0 && (
                              <button
                                type="button"
                                className="specialties-action-btn clear"
                                onClick={handleDoctorClearAllSpecialties}
                              >
                                Clear All
                              </button>
                            )}
                            <button
                              type="button"
                              className="specialties-action-btn done"
                              onClick={() => setDocSpecialtiesDropdownOpen(false)}
                              title="Close dropdown"
                            >
                              Done / Close ✓
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox Options List */}
                      <div className="specialties-options-list" style={{ maxHeight: '200px' }}>
                        {filteredDoctorSpecialties.length > 0 ? (
                          filteredDoctorSpecialties.map((specialty) => {
                            const isChecked = doctorSelectedSpecialties.includes(specialty);
                            return (
                              <label
                                key={specialty}
                                className={`specialty-checkbox-item ${isChecked ? 'selected' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleDoctorSpecialty(specialty)}
                                  className="specialty-native-checkbox"
                                />
                                <span className={`specialty-custom-box ${isChecked ? 'checked' : ''}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </span>
                                <span className="specialty-item-name">{specialty}</span>
                                {isChecked && (
                                  <span className="specialty-selected-indicator">Selected</span>
                                )}
                              </label>
                            );
                          })
                        ) : (
                          <div className="specialties-no-results">
                            <p>No specialties found matching "{docSpecialtiesSearch}"</p>
                          </div>
                        )}
                      </div>

                      {/* Footer with Done / Close Button */}
                      <div className="specialties-menu-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '8px 12px' }}>
                        <div className="specialties-footer-bottom-row" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                          <span className="specialties-footer-selected-count">
                            <strong>{doctorSelectedSpecialties.length}</strong> {doctorSelectedSpecialties.length === 1 ? 'specialty' : 'specialties'} selected
                          </span>
                          <button
                            type="button"
                            className="btn-specialties-done-apply"
                            onClick={() => setDocSpecialtiesDropdownOpen(false)}
                          >
                            <Check size={14} />
                            <span>Done / Close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Specialties Chips Display */}
                {doctorSelectedSpecialties.length > 0 && (
                  <div className="selected-specialties-chips-wrap">
                    <div className="chips-list">
                      {doctorSelectedSpecialties.map((spec) => (
                        <span key={spec} className="specialty-chip">
                          <span className="chip-dot"></span>
                          <span className="chip-text">{spec}</span>
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => handleToggleDoctorSpecialty(spec)}
                            title={`Remove ${spec}`}
                            aria-label={`Remove ${spec}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Speciality Pills */}
                <div className="doctor-quick-pills-row" style={{ marginTop: '8px' }}>
                  <span className="quick-pill-label">Quick toggle:</span>
                  {(DEFAULT_CLINICAL_SPECIALTIES.slice(0, 8)).map((sp) => {
                    const isPicked = doctorSelectedSpecialties.some((s) => s.toLowerCase() === sp.toLowerCase());
                    return (
                      <button
                        key={sp}
                        type="button"
                        className={`quick-select-pill ${isPicked ? 'active' : ''}`}
                        onClick={() => handleToggleDoctorSpecialty(sp)}
                      >
                        {isPicked ? '✓ ' : '+ '}{sp}
                      </button>
                    );
                  })}
                </div>

                {doctorFormErrors.specialities && (
                  <span className="error-text">
                    <AlertCircle size={13} />
                    {doctorFormErrors.specialities}
                  </span>
                )}
              </div>

              {/* Doctor Practice Scope / Role (OPD / IPD / Both) */}
              <div className="form-field">
                <label className="field-label">
                  Doctor Practice Scope / Role <span className="req-star">*</span>
                </label>
                <div className="doctor-role-type-selector-group">
                  <button
                    type="button"
                    className={`doctor-role-type-btn ${doctorForm.doctorType === 'OPD' ? 'active' : ''}`}
                    onClick={() => handleDoctorInputChange('doctorType', 'OPD')}
                  >
                    <Users size={16} />
                    <span>OPD (Outpatient)</span>
                  </button>

                  <button
                    type="button"
                    className={`doctor-role-type-btn ${doctorForm.doctorType === 'IPD' ? 'active' : ''}`}
                    onClick={() => handleDoctorInputChange('doctorType', 'IPD')}
                  >
                    <BedDouble size={16} />
                    <span>IPD (Inpatient)</span>
                  </button>

                  <button
                    type="button"
                    className={`doctor-role-type-btn ${doctorForm.doctorType === 'Both' || !doctorForm.doctorType ? 'active' : ''}`}
                    onClick={() => handleDoctorInputChange('doctorType', 'Both')}
                  >
                    <Activity size={16} />
                    <span>Both (OPD & IPD)</span>
                  </button>
                </div>
                <span className="field-hint">Specify whether physician handles OPD consultations, IPD admissions/ward rounds, or both</span>
              </div>

              {/* Doctor Address & Geographical Location */}
              <div className="doctor-address-section-divider">
                <div className="doc-section-subtitle-wrap">
                  <MapPin size={15} className="text-emerald" />
                  <span className="doc-section-subtitle">Doctor Address & OPD Location</span>
                </div>
              </div>

              {/* Full Street Address */}
              <div className="form-field">
                <label className="field-label" htmlFor="hosp-doc-address">
                  Full Street Address (Plot No., Road, Area / OPD Wing)
                </label>
                <div className="input-with-icon">
                  <MapPin size={16} className="icon-prefix" />
                  <input
                    id="hosp-doc-address"
                    type="text"
                    className="field-input icon-padded"
                    placeholder="e.g. OPD Wing B, Room 204, 2nd Floor"
                    value={doctorForm.address}
                    onChange={(e) => handleDoctorInputChange('address', e.target.value)}
                  />
                </div>
              </div>

              {/* City / District & Taluka */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-district">
                    City / District
                  </label>
                  <SearchableLocationInput
                    id="hosp-doc-district"
                    placeholder="Type district (e.g. Pune)..."
                    options={locationDirectoryService.getDistricts()}
                    value={doctorForm.district}
                    onChange={(val) => handleDoctorInputChange('district', val)}
                    onSelect={(val) => handleDoctorInputChange('district', val)}
                    className="field-input"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-taluka">
                    Taluka / Sub-District
                  </label>
                  <SearchableLocationInput
                    id="hosp-doc-taluka"
                    placeholder={!doctorForm.district ? 'Select District first' : 'Type taluka (e.g. Haveli)...'}
                    options={doctorForm.district ? locationDirectoryService.getTalukas(doctorForm.district) : []}
                    value={doctorForm.taluka}
                    onChange={(val) => handleDoctorInputChange('taluka', val)}
                    onSelect={(val) => handleDoctorInputChange('taluka', val)}
                    disabled={!doctorForm.district}
                    className="field-input"
                  />
                </div>
              </div>

              {/* Pincode & Landmark */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-pincode">
                    Pincode
                  </label>
                  <input
                    id="hosp-doc-pincode"
                    type="text"
                    className="field-input"
                    placeholder="e.g. 411004"
                    value={doctorForm.pincode}
                    onChange={(e) => handleDoctorInputChange('pincode', e.target.value)}
                    maxLength={6}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="hosp-doc-landmark">
                    Nearest Landmark / Station
                  </label>
                  <input
                    id="hosp-doc-landmark"
                    type="text"
                    className="field-input"
                    placeholder="e.g. Near Swargate Bus Stand (500m)"
                    value={doctorForm.landmark}
                    onChange={(e) => handleDoctorInputChange('landmark', e.target.value)}
                    maxLength={150}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="doctor-modal-footer">
              <button
                type="button"
                className="btn-doc-modal-cancel"
                onClick={closeAddDoctorModal}
                disabled={isSavingDoctor}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-doc-modal-save"
                onClick={handleSaveDoctor}
                disabled={isSavingDoctor}
              >
                {isSavingDoctor ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Adding Doctor...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Add Doctor to Hospital</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Doctor Details Modal */}
      {viewingDoctor && (
        <div className="doctor-modal-overlay" onClick={() => setViewingDoctor(null)}>
          <div className="doctor-view-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="doc-view-header">
              <div className="doc-view-head-profile">
                <div className="doc-view-avatar">
                  {getDoctorInitials(viewingDoctor.name)}
                </div>
                <div className="doc-view-title-group">
                  <div className="doc-view-name-row">
                    <h3 className="doc-view-name">{viewingDoctor.name}</h3>
                    <span className={`doc-type-badge ${(viewingDoctor.doctorType || viewingDoctor.doctor_type || 'Both').toLowerCase()}`}>
                      {viewingDoctor.doctorType || viewingDoctor.doctor_type || 'Both'}
                    </span>
                    <span
                      className="doc-avail-status-chip"
                      style={{
                        backgroundColor: (AVAILABILITY_CONFIG[viewingDoctor.availabilityStatus || viewingDoctor.availability_status || 'Available'] || AVAILABILITY_CONFIG.Available).bg,
                        color: (AVAILABILITY_CONFIG[viewingDoctor.availabilityStatus || viewingDoctor.availability_status || 'Available'] || AVAILABILITY_CONFIG.Available).text,
                        borderColor: (AVAILABILITY_CONFIG[viewingDoctor.availabilityStatus || viewingDoctor.availability_status || 'Available'] || AVAILABILITY_CONFIG.Available).border
                      }}
                    >
                      <span
                        className="doc-status-dot"
                        style={{ backgroundColor: (AVAILABILITY_CONFIG[viewingDoctor.availabilityStatus || viewingDoctor.availability_status || 'Available'] || AVAILABILITY_CONFIG.Available).dot }}
                      />
                      {(AVAILABILITY_CONFIG[viewingDoctor.availabilityStatus || viewingDoctor.availability_status || 'Available'] || AVAILABILITY_CONFIG.Available).label}
                    </span>
                  </div>

                  <div className="doc-view-sub-badges">
                    <span className="doc-view-qual-pill">
                      <GraduationCap size={13} />
                      {viewingDoctor.qualification || 'MBBS'}
                    </span>
                    {(viewingDoctor.doctorCode || viewingDoctor.registrationNumber || viewingDoctor.doctor_code || viewingDoctor.registration_number) && (
                      <span className="doc-view-code-pill">
                        Reg ID: {viewingDoctor.doctorCode || viewingDoctor.registrationNumber || viewingDoctor.doctor_code || viewingDoctor.registration_number}
                      </span>
                    )}
                    {viewingDoctor.experience && (
                      <span className="doc-view-exp-pill">
                        <Award size={13} />
                        {viewingDoctor.experience}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-doctor-modal-close"
                onClick={() => setViewingDoctor(null)}
                aria-label="Close Profile"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="doc-view-body">
              {/* Quick Summary Grid */}
              <div className="doc-view-grid-summary">
                <div className="doc-view-stat-card">
                  <div className="doc-stat-icon-wrap blue">
                    <Stethoscope size={18} />
                  </div>
                  <div className="doc-stat-meta">
                    <span className="doc-stat-label">PRIMARY SPECIALITY</span>
                    <span className="doc-stat-value">
                      {viewingDoctor.specialization || (Array.isArray(viewingDoctor.specialties) ? viewingDoctor.specialties[0] : 'General Medicine')}
                    </span>
                  </div>
                </div>

                <div className="doc-view-stat-card">
                  <div className="doc-stat-icon-wrap emerald">
                    <Clock size={18} />
                  </div>
                  <div className="doc-stat-meta">
                    <span className="doc-stat-label">DUTY AVAILABILITY</span>
                    <span className="doc-stat-value">
                      {(viewingDoctor.dutyType || viewingDoctor.duty_type) === 'On-Call' ? '24/7 Emergency On-Call' : 'Standard Shift Roster'}
                    </span>
                  </div>
                </div>

                <div className="doc-view-stat-card">
                  <div className="doc-stat-icon-wrap purple">
                    <Building2 size={18} />
                  </div>
                  <div className="doc-stat-meta">
                    <span className="doc-stat-label">ASSIGNED HOSPITAL</span>
                    <span className="doc-stat-value">
                      {viewingDoctor.hospitalName || currentHosp.name}
                    </span>
                  </div>
                </div>

                <div className="doc-view-stat-card">
                  <div className="doc-stat-icon-wrap amber">
                    <Activity size={18} />
                  </div>
                  <div className="doc-stat-meta">
                    <span className="doc-stat-label">PRACTICE SCOPE</span>
                    <span className="doc-stat-value">
                      {viewingDoctor.doctorType === 'OPD' ? 'OPD (Outpatient)' : viewingDoctor.doctorType === 'IPD' ? 'IPD (Inpatient)' : 'Both OPD & IPD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Specialities Section */}
              <div className="doc-view-section-card">
                <div className="doc-view-card-head">
                  <Stethoscope size={16} className="text-blue" />
                  <span className="doc-view-card-title">Empanelled Clinical Specialities</span>
                </div>
                <div className="doc-view-chips-wrap">
                  {(Array.isArray(viewingDoctor.specialties) && viewingDoctor.specialties.length > 0
                    ? viewingDoctor.specialties
                    : (viewingDoctor.specialization ? [viewingDoctor.specialization] : ['General Medicine'])
                  ).map((spec, i) => (
                    <span key={i} className="doc-view-specialty-tag">
                      <span className="tag-dot" />
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Duty & Shift Timing Schedule */}
              <div className="doc-view-section-card">
                <div className="doc-view-card-head">
                  <Clock size={16} className="text-emerald" />
                  <span className="doc-view-card-title">Duty Schedule & OPD Consultation Timings</span>
                </div>
                
                <div className="doc-view-schedule-box">
                  <div className="schedule-row-timing">
                    <span className="schedule-label">CONSULTATION HOURS:</span>
                    <span className="schedule-badge-time">
                      {(viewingDoctor.dutyType || viewingDoctor.duty_type) === 'On-Call'
                        ? '24/7 Available for Hospital Escalations'
                        : (viewingDoctor.opdTiming || `${viewingDoctor.startTime || '04:00'} ${viewingDoctor.startPeriod || 'PM'} - ${viewingDoctor.endTime || '08:00'} ${viewingDoctor.endPeriod || 'PM'}`)}
                    </span>
                  </div>

                  {(viewingDoctor.dutyType || viewingDoctor.duty_type) !== 'On-Call' && (
                    <div className="schedule-weekdays-row">
                      <span className="schedule-label">ACTIVE DAYS:</span>
                      <div className="weekdays-chips-list">
                        {WEEK_DAYS.map((day) => {
                          const isDayOn = Array.isArray(viewingDoctor.workingDays || viewingDoctor.working_days)
                            ? (viewingDoctor.workingDays || viewingDoctor.working_days).includes(day)
                            : true;
                          return (
                            <span key={day} className={`weekday-status-pill ${isDayOn ? 'on' : 'off'}`}>
                              {day} {isDayOn ? '✓' : '—'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Contact & Telephony */}
              <div className="doc-view-section-card">
                <div className="doc-view-card-head">
                  <Phone size={16} className="text-cyan" />
                  <span className="doc-view-card-title">Contact & Medical Coordination</span>
                </div>

                <div className="doc-view-contact-grid">
                  <div className="doc-contact-item">
                    <span className="contact-label">PRIMARY MOBILE:</span>
                    {(viewingDoctor.contactPhone || viewingDoctor.contactNumber || viewingDoctor.phone) ? (
                      <a href={`tel:${viewingDoctor.contactPhone || viewingDoctor.contactNumber || viewingDoctor.phone}`} className="contact-val-link">
                        <Phone size={14} />
                        <strong>{viewingDoctor.contactPhone || viewingDoctor.contactNumber || viewingDoctor.phone}</strong>
                      </a>
                    ) : (
                      <span className="contact-val-empty">Not specified</span>
                    )}
                  </div>

                  <div className="doc-contact-item">
                    <span className="contact-label">ALTERNATIVE CONTACT:</span>
                    {(viewingDoctor.altContactNumber || viewingDoctor.altNumber || viewingDoctor.altPhone) ? (
                      <span className="contact-val-plain">
                        <Phone size={14} />
                        {viewingDoctor.altContactNumber || viewingDoctor.altNumber || viewingDoctor.altPhone}
                      </span>
                    ) : (
                      <span className="contact-val-empty">None specified</span>
                    )}
                  </div>

                  <div className="doc-contact-item">
                    <span className="contact-label">OFFICIAL EMAIL:</span>
                    {viewingDoctor.email ? (
                      <a href={`mailto:${viewingDoctor.email}`} className="contact-val-link email">
                        <Mail size={14} />
                        <span>{viewingDoctor.email}</span>
                      </a>
                    ) : (
                      <span className="contact-val-empty">None specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* OPD Chamber & Location Details */}
              <div className="doc-view-section-card">
                <div className="doc-view-card-head">
                  <MapPin size={16} className="text-amber" />
                  <span className="doc-view-card-title">OPD Chamber & Geographical Location</span>
                </div>

                <div className="doc-view-location-details">
                  <div className="loc-detail-row">
                    <span className="loc-lbl">OPD Chamber / Address:</span>
                    <span className="loc-val">{viewingDoctor.address || viewingDoctor.streetAddress || viewingDoctor.personalAddress?.streetAddress || currentHosp.address || 'Hospital Main OPD Wing'}</span>
                  </div>

                  <div className="loc-detail-grid">
                    <div>
                      <span className="loc-lbl">Taluka / Sub-District:</span>
                      <span className="loc-val">{viewingDoctor.taluka || viewingDoctor.personalAddress?.taluka || currentHosp.areaTaluka || '—'}</span>
                    </div>
                    <div>
                      <span className="loc-lbl">City / District:</span>
                      <span className="loc-val">{viewingDoctor.district || viewingDoctor.personalAddress?.district || currentHosp.location || '—'}</span>
                    </div>
                    <div>
                      <span className="loc-lbl">Pincode:</span>
                      <span className="loc-val">{viewingDoctor.pincode || viewingDoctor.personalAddress?.pincode || currentHosp.pincode || '—'}</span>
                    </div>
                    <div>
                      <span className="loc-lbl">Nearest Landmark:</span>
                      <span className="loc-val">{viewingDoctor.landmark || viewingDoctor.personalAddress?.landmark || currentHosp.nearestLandmark || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="doctor-modal-footer" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Assigned to: <strong>{currentHosp.name}</strong>
              </span>
              <button
                type="button"
                className="btn-doc-modal-cancel"
                onClick={() => setViewingDoctor(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDetail;

