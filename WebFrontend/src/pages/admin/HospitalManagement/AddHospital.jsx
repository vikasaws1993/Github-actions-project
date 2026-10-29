import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  ShieldCheck,
  UserCheck,
  Phone,
  Check,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Stethoscope,
  AlertCircle,
  GraduationCap,
  Trash2,
  Edit3,
  PhoneCall,
  User,
  UserPlus,
  Award,
  Mail,
  Download,
  UploadCloud,
  FileSpreadsheet,
  FileUp,
  FileCheck2,
  Clock,
  BedDouble,
  Activity
} from 'lucide-react';
import { hospitalService } from '../../../services/hospitalService';
import { packageMasterService } from '../../../services/packageMasterService';
import { locationDirectoryService } from '../../../services/locationDirectoryService';
import { SearchableLocationInput } from '../../../components/common/SearchableLocationInput/SearchableLocationInput';
import { useAdmin } from '../AdminContext';
import './AddHospital.css';

export const DEFAULT_CLINICAL_SPECIALTIES = [
  'Burns Management',
  'Cardiology',
  'Cardio-thoracic & Vascular surgery',
  'Emergency Room Packages',
  'General Medicine',
  'General Surgery',
  'Infectious Diseases',
  'Interventional Neuroradiology',
  'Medical Oncology',
  'Mental Disorders Packages',
  'Neo-natal care Packages',
  'Neurosurgery',
  'Obstetrics & Gynecology',
  'Ophthalmology',
  'Oral and Maxillofacial Surgery',
  'Organ & Tissue Transplant',
  'Orthopedics',
  'Otorhinolaryngology',
  'Pediatric Medical management',
  'Pediatric cancer',
  'Pediatric surgery',
  'Plastic & reconstructive Surgery',
  'Polytrauma',
  'Radiation Oncology',
  'Surgical Oncology',
  'Urology'
];

export const PRIMARY_QUALIFICATIONS = [
  'MBBS',
  'MD (Gen Med)',
  'MS (Gen Surgery)',
  'MD (Pediatrics)',
  'MS (Ortho)',
  'MD (OB-GYN)',
  'DNB',
  'DM (Cardiology)',
  'MCh (Neurosurgery)',
  'BAMS',
  'BHMS',
  'BDS'
];

export const ALL_QUALIFICATIONS = [
  'MBBS',
  'MD (Gen Med)',
  'MS (Gen Surgery)',
  'MD (Pediatrics)',
  'MS (Ortho)',
  'MD (OB-GYN)',
  'DNB',
  'DM (Cardiology)',
  'MCh (Neurosurgery)',
  'BAMS',
  'BHMS',
  'BDS',
  'MD (General Medicine)',
  'MS (General Surgery)',
  'MD (Obstetrics & Gynae)',
  'MD (Cardiology)',
  'DM (Neurology)',
  'DM (Nephrology)',
  'DM (Medical Oncology)',
  'MCh (CTVS)',
  'MCh (Surgical Oncology)',
  'MCh (Urology)',
  'MS (Ophthalmology)',
  'MS (ENT)',
  'DGO',
  'DCH',
  'MDS',
  'BPT',
  'MPT',
  'Fellowship (Critical Care)',
  'Fellowship (Diabetology)'
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SHIFT_PRESETS = [
  { label: 'Morning (08:00 AM - 02:00 PM)', sTime: '08:00', sP: 'AM', eTime: '02:00', eP: 'PM' },
  { label: 'Evening (04:00 PM - 08:00 PM)', sTime: '04:00', sP: 'PM', eTime: '08:00', eP: 'PM' },
  { label: 'Full Day (09:00 AM - 05:00 PM)', sTime: '09:00', sP: 'AM', eTime: '05:00', eP: 'PM' },
  { label: 'Night Shift (08:00 PM - 08:00 AM)', sTime: '08:00', sP: 'PM', eTime: '08:00', eP: 'AM' },
];

export const downloadSampleDoctorCsv = (showToast) => {
  const csvContent =
    `Name,Primary Number,Alternative Number,Specialities,Qualification,Address
Dr. Rajesh Kulkarni,9822011223,020-25678900,"Cardiology, Interventional Cardiology","MBBS, MD, DM","OPD Wing B, Room 204, Pune Campus"
Dr. Sunita Deshmukh,9822044556,9822077889,"Pediatrics, Neonatology","MBBS, MD (Pediatrics)","Children Care Wing, Room 105, Pune"
Dr. Amit Sharma,9822033221,,"Orthopedics, Joint Replacement","MBBS, MS (Ortho)","Orthopedic Clinic Suite 301, Pune"
Dr. Priyanka Shinde,9822099887,020-25678912,"Obstetrics & Gynecology","MBBS, MD (OB-GYN), DNB","Maternity OPD Room 12, Pune"
Dr. Mahesh Joshi,9822066554,9822011447,"General Surgery, Laparoscopy","MBBS, MS (General Surgery)","Surgical Unit Cabin 4, Pune"`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_hospital_doctors.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (showToast) {
    showToast('Sample doctors CSV template downloaded!', 'success');
  }
};

export const AddHospital = () => {
  const navigate = useNavigate();
  const {
    addHospital,
    arogyaSevaks = [],
    schemes = [],
    showToast,
    doctorFormDraft,
    updateDoctorFormDraft,
    clearDoctorFormDraft,
    hospitalFormDraft,
    updateHospitalFormDraft,
    clearHospitalFormDraft
  } = useAdmin();

  const [submitting, setSubmitting] = useState(false);

  // ArogyaSevak search, filter & pagination state
  const [sevakSearch, setSevakSearch] = useState('');
  const [sevakFilterTab, setSevakFilterTab] = useState('all'); // 'all' | 'selected'
  const [sevakPage, setSevakPage] = useState(1);
  const SEVAKS_PER_PAGE = 6;

  // Clinical Specialties Multi-Select Dropdown state
  const [specialtiesList, setSpecialtiesList] = useState(DEFAULT_CLINICAL_SPECIALTIES);
  const [specialtiesDropdownOpen, setSpecialtiesDropdownOpen] = useState(false);
  const [specialtiesSearch, setSpecialtiesSearch] = useState('');
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');
  const specialtiesDropdownRef = useRef(null);

  // Doctor Management State
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [docSpecialtiesDropdownOpen, setDocSpecialtiesDropdownOpen] = useState(false);
  const [docSpecialtiesSearch, setDocSpecialtiesSearch] = useState('');
  const [showAllQualifications, setShowAllQualifications] = useState(false);
  const docSpecialtiesDropdownRef = useRef(null);

  const [doctorForm, setDoctorForm] = useState(() => {
    if (doctorFormDraft && typeof doctorFormDraft === 'object') {
      return {
        name: '',
        number: '',
        altNumber: '',
        email: '',
        specialities: [],
        qualification: 'MBBS',
        experience: '',
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
        ...doctorFormDraft
      };
    }
    return {
      name: '',
      number: '',
      altNumber: '',
      email: '',
      specialities: [],
      qualification: 'MBBS',
      experience: '',
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
      landmark: ''
    };
  });
  const [doctorFormErrors, setDoctorFormErrors] = useState({});

  // CSV Bulk Upload State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewDoctors, setCsvPreviewDoctors] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState(null);
  const csvFileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => {
    if (hospitalFormDraft && typeof hospitalFormDraft === 'object') {
      return {
        name: '',
        type: 'Government',
        location: 'Pune',
        address: '',
        areaTaluka: 'Haveli Taluka',
        pincode: '411004',
        scheme: 'PM-JAY, MJPJAY',
        nearestLandmark: '',
        contact: '',
        specialties: [],
        selectedSevaks: [],
        doctors: [],
        ...hospitalFormDraft
      };
    }
    return {
      name: '',
      type: 'Government',
      location: 'Pune',
      address: '',
      areaTaluka: 'Haveli Taluka',
      pincode: '411004',
      scheme: 'PM-JAY, MJPJAY',
      nearestLandmark: '',
      contact: '',
      specialties: [],
      selectedSevaks: [],
      doctors: []
    };
  });

  // Auto-sync hospital form state to context & sessionStorage
  useEffect(() => {
    if (formData && updateHospitalFormDraft) {
      updateHospitalFormDraft(formData);
    }
  }, [formData, updateHospitalFormDraft]);

  // Auto-sync doctor form draft to context & sessionStorage whenever user modifies fields
  useEffect(() => {
    if (doctorForm && updateDoctorFormDraft) {
      if (doctorForm.name || doctorForm.number || doctorForm.email || (Array.isArray(doctorForm.specialities) && doctorForm.specialities.length > 0)) {
        updateDoctorFormDraft(doctorForm);
      }
    }
  }, [doctorForm, updateDoctorFormDraft]);

  // Fetch live package master 26 specialties on mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const res = await packageMasterService.getSpecialtiesHierarchy();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const names = list
            .map((item) => (typeof item === 'string' ? item : item.specialty))
            .filter(Boolean);
          if (names.length > 0) {
            setSpecialtiesList(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
          }
        }
      } catch (err) {
        console.warn('[AddHospital] Could not fetch live specialties:', err);
      }
    };
    loadSpecialties();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        specialtiesDropdownRef.current &&
        !specialtiesDropdownRef.current.contains(event.target)
      ) {
        setSpecialtiesDropdownOpen(false);
      }
      if (
        docSpecialtiesDropdownRef.current &&
        !docSpecialtiesDropdownRef.current.contains(event.target)
      ) {
        setDocSpecialtiesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [errors, setErrors] = useState({});

  /**
   * Field-level validation rules
   */
  const validateField = (field, value) => {
    const val = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'name':
        if (!val) return 'Hospital name is required';
        if (val.length < 3) return 'Hospital name must be at least 3 characters long';
        if (val.length > 200) return 'Hospital name cannot exceed 200 characters';
        return null;

      case 'type':
        if (!val) return 'Please select a hospital type';
        return null;

      case 'scheme':
        if (!val) return 'Please select at least one empanelled scheme';
        return null;

      case 'contact':
        if (!val) return null; // Optional, but validated if entered
        {
          const digitsOnly = val.replace(/\D/g, '');
          if (digitsOnly.length < 6 || digitsOnly.length > 15) {
            return 'Enter a valid phone number (6 to 15 digits, e.g. 020-66455100 or 9822011223)';
          }
          if (!/^[0-9+\-\s()]+$/.test(val)) {
            return 'Phone number contains invalid characters';
          }
        }
        return null;

      case 'address':
        if (!val) return 'Full street address is required';
        if (val.length < 5) return 'Address must be at least 5 characters long';
        if (val.length > 500) return 'Address cannot exceed 500 characters';
        return null;

      case 'location':
        if (!val) return 'City / District is required';
        if (!locationDirectoryService.isValidDistrict(val)) {
          return 'Please select a valid Maharashtra district';
        }
        return null;

      case 'areaTaluka':
        if (!val) return 'Taluka / Sub-district is required';
        if (!locationDirectoryService.isValidTaluka(formData.location, val)) {
          return 'Please select a valid taluka for the selected district';
        }
        return null;

      case 'pincode':
        if (!formData.areaTaluka) return 'Please select Taluka first';
        if (!val) return 'Pincode is required';
        if (!/^[1-9][0-9]{5}$/.test(val)) {
          return 'Enter a valid 6-digit PIN code (e.g. 411004, starting with 1-9)';
        }
        return null;

      case 'nearestLandmark':
        if (val && val.length > 200) return 'Landmark cannot exceed 200 characters';
        return null;

      case 'specialties':
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
          return 'Please select at least one clinical specialty';
        }
        return null;

      default:
        return null;
    }
  };

  // Filtered list based on search
  const filteredSpecialties = useMemo(() => {
    const query = specialtiesSearch.toLowerCase().trim();
    if (!query) return specialtiesList;
    return specialtiesList.filter((s) => s.toLowerCase().includes(query));
  }, [specialtiesList, specialtiesSearch]);

  const selectedSpecialties = useMemo(() => {
    if (Array.isArray(formData.specialties)) return formData.specialties;
    if (typeof formData.specialties === 'string') {
      return formData.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [formData.specialties]);

  const handleToggleSpecialty = (specialty) => {
    const isSelected = selectedSpecialties.includes(specialty);
    const updated = isSelected
      ? selectedSpecialties.filter((s) => s !== specialty)
      : [...selectedSpecialties, specialty];

    setFormData((prev) => ({ ...prev, specialties: updated }));
    if (errors.specialties) {
      setErrors((prev) => ({ ...prev, specialties: null }));
    }
  };

  const handleSelectAllFiltered = () => {
    const combined = Array.from(new Set([...selectedSpecialties, ...filteredSpecialties]));
    setFormData((prev) => ({ ...prev, specialties: combined }));
    if (errors.specialties) {
      setErrors((prev) => ({ ...prev, specialties: null }));
    }
  };

  const handleClearAllSpecialties = () => {
    setFormData((prev) => ({ ...prev, specialties: [] }));
  };

  const handleAddCustomSpecialty = (e) => {
    if (e) e.preventDefault();
    const trimmed = customSpecialtyInput.trim();
    if (!trimmed) return;

    if (!specialtiesList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSpecialtiesList((prev) => [trimmed, ...prev]);
    }

    if (!selectedSpecialties.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...selectedSpecialties, trimmed],
      }));
    }

    setCustomSpecialtyInput('');
    if (errors.specialties) {
      setErrors((prev) => ({ ...prev, specialties: null }));
    }
  };

  const handleDistrictChange = (newDistrict) => {
    setFormData((prev) => ({
      ...prev,
      location: newDistrict,
      areaTaluka: '',
      pincode: ''
    }));
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: null }));
    }
    if (errors.areaTaluka) {
      setErrors((prev) => ({ ...prev, areaTaluka: null }));
    }
    if (errors.pincode) {
      setErrors((prev) => ({ ...prev, pincode: null }));
    }
  };

  const handleTalukaChange = (newTaluka) => {
    setFormData((prev) => ({
      ...prev,
      areaTaluka: newTaluka,
      pincode: ''
    }));
    if (errors.areaTaluka) {
      setErrors((prev) => ({ ...prev, areaTaluka: null }));
    }
    if (errors.pincode) {
      setErrors((prev) => ({ ...prev, pincode: null }));
    }
  };

  const handleInputChange = (field, value) => {
    let sanitizedValue = value;

    if (field === 'pincode') {
      // Allow only digits, max 6 characters
      sanitizedValue = value.replace(/\D/g, '').slice(0, 6);
    } else if (field === 'contact') {
      // Allow digits, +, -, spaces, and ()
      sanitizedValue = value.replace(/[^0-9+\-\s()]/g, '').slice(0, 18);
    }

    setFormData((prev) => ({ ...prev, [field]: sanitizedValue }));

    // Real-time error clearing / live re-validation
    if (errors[field]) {
      const errorMsg = validateField(field, sanitizedValue);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handleBlur = (field) => {
    const errorMsg = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const toggleSevak = (sevakName) => {
    setFormData((prev) => {
      const isSelected = prev.selectedSevaks.includes(sevakName);
      const updatedSevaks = isSelected
        ? prev.selectedSevaks.filter((name) => name !== sevakName)
        : [...prev.selectedSevaks, sevakName];
      return { ...prev, selectedSevaks: updatedSevaks };
    });
  };

  const removeSelectedSevak = (sevakName, e) => {
    if (e) e.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      selectedSevaks: prev.selectedSevaks.filter((name) => name !== sevakName)
    }));
  };

  const clearAllSelectedSevaks = () => {
    setFormData((prev) => ({
      ...prev,
      selectedSevaks: []
    }));
  };

  const handleSevakSearchChange = (val) => {
    setSevakSearch(val);
    setSevakPage(1);
  };

  const handleFilterTabChange = (tab) => {
    setSevakFilterTab(tab);
    setSevakPage(1);
  };

  // Filtered ArogyaSevaks list based on search and tab
  const filteredSevaks = useMemo(() => {
    return (arogyaSevaks || []).filter((sevak) => {
      if (sevakFilterTab === 'selected' && !formData.selectedSevaks.includes(sevak.name)) {
        return false;
      }

      if (!sevakSearch.trim()) return true;

      const q = sevakSearch.toLowerCase().trim();
      const nameMatch = sevak.name?.toLowerCase().includes(q);
      const mobileMatch = sevak.mobile?.toLowerCase().includes(q);
      const hospitalMatch = sevak.hospital?.toLowerCase().includes(q);
      const talukaMatch = sevak.taluka?.toLowerCase().includes(q);
      const codeMatch = sevak.employeeCode?.toLowerCase().includes(q);

      return nameMatch || mobileMatch || hospitalMatch || talukaMatch || codeMatch;
    });
  }, [arogyaSevaks, sevakSearch, sevakFilterTab, formData.selectedSevaks]);

  // Total pages and safe current page
  const totalSevakPages = Math.max(1, Math.ceil(filteredSevaks.length / SEVAKS_PER_PAGE));
  const currentSevakPage = Math.min(sevakPage, totalSevakPages);
  const startIdx = (currentSevakPage - 1) * SEVAKS_PER_PAGE;
  const paginatedSevaks = filteredSevaks.slice(startIdx, startIdx + SEVAKS_PER_PAGE);

  /**
   * Filtered specialties for Doctor Modal Dropdown
   */
  const filteredDoctorSpecialties = useMemo(() => {
    const query = docSpecialtiesSearch.toLowerCase().trim();
    if (!query) return specialtiesList;
    return specialtiesList.filter((s) => s.toLowerCase().includes(query));
  }, [specialtiesList, docSpecialtiesSearch]);

  const doctorSelectedSpecialties = useMemo(() => {
    if (Array.isArray(doctorForm.specialities)) return doctorForm.specialities;
    if (typeof doctorForm.specialities === 'string') {
      return doctorForm.specialities.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [doctorForm.specialities]);

  const handleToggleDoctorSpecialty = (specialty) => {
    const isSelected = doctorSelectedSpecialties.includes(specialty);
    const updated = isSelected
      ? doctorSelectedSpecialties.filter((s) => s !== specialty)
      : [...doctorSelectedSpecialties, specialty];

    setDoctorForm((prev) => ({ ...prev, specialities: updated }));
    if (doctorFormErrors.specialities) {
      setDoctorFormErrors((prev) => ({ ...prev, specialities: null }));
    }
  };

  const handleDoctorSelectAllFiltered = () => {
    const combined = Array.from(new Set([...doctorSelectedSpecialties, ...filteredDoctorSpecialties]));
    setDoctorForm((prev) => ({ ...prev, specialities: combined }));
    if (doctorFormErrors.specialities) {
      setDoctorFormErrors((prev) => ({ ...prev, specialities: null }));
    }
  };

  const handleDoctorClearAllSpecialties = () => {
    setDoctorForm((prev) => ({ ...prev, specialities: [] }));
  };

  const handleDoctorDistrictChange = (newDistrict) => {
    setDoctorForm((prev) => ({
      ...prev,
      district: newDistrict,
      taluka: '',
      pincode: ''
    }));
    if (doctorFormErrors.district) {
      setDoctorFormErrors((prev) => ({ ...prev, district: null }));
    }
    if (doctorFormErrors.taluka) {
      setDoctorFormErrors((prev) => ({ ...prev, taluka: null }));
    }
    if (doctorFormErrors.pincode) {
      setDoctorFormErrors((prev) => ({ ...prev, pincode: null }));
    }
  };

  const handleDoctorTalukaChange = (newTaluka) => {
    setDoctorForm((prev) => ({
      ...prev,
      taluka: newTaluka,
      pincode: ''
    }));
    if (doctorFormErrors.taluka) {
      setDoctorFormErrors((prev) => ({ ...prev, taluka: null }));
    }
    if (doctorFormErrors.pincode) {
      setDoctorFormErrors((prev) => ({ ...prev, pincode: null }));
    }
  };

  /**
   * Field-level validation rules for Doctor Form
   */
  const validateDoctorField = (field, value) => {
    const val = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'name':
        if (!val) return 'Doctor name is required';
        if (val.length < 3) return 'Name must be at least 3 characters long';
        if (val.length > 150) return 'Name cannot exceed 150 characters';
        return null;

      case 'number':
        if (!val) return 'Primary phone / mobile number is required';
        {
          const digitsOnly = String(val).replace(/\D/g, '');
          if (digitsOnly.length < 6 || digitsOnly.length > 15) {
            return 'Enter a valid phone number (6 to 15 digits, e.g. 9822011223)';
          }
          if (!/^[0-9+\-\s()]+$/.test(val)) {
            return 'Phone number contains invalid characters';
          }
        }
        return null;

      case 'altNumber':
        if (!val) return null; // Optional
        {
          const digitsOnly = String(val).replace(/\D/g, '');
          if (digitsOnly.length < 6 || digitsOnly.length > 15) {
            return 'Enter a valid alternative number (6 to 15 digits)';
          }
          if (!/^[0-9+\-\s()]+$/.test(val)) {
            return 'Phone number contains invalid characters';
          }
        }
        return null;

      case 'email':
        if (!val) return null; // Optional
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
          return 'Enter a valid email address (e.g. dr.name@hospital.org)';
        }
        return null;

      case 'specialities':
        return null;

      case 'qualification':
        return null;

      case 'address':
      case 'district':
      case 'taluka':
      case 'pincode':
      case 'landmark':
        return null;

      default:
        return null;
    }
  };

  const openAddDoctorModal = () => {
    setEditingDoctorId(null);
    setDoctorForm({
      name: '',
      number: '',
      altNumber: '',
      email: '',
      specialities: [],
      doctorType: 'Both',
      qualification: 'MBBS',
      experience: '',
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
      landmark: ''
    });
    setShowAllQualifications(false);
    setDocSpecialtiesDropdownOpen(false);
    setDocSpecialtiesSearch('');
    setDoctorFormErrors({});
    setIsDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doctor) => {
    setEditingDoctorId(doctor.id);
    let specs = [];
    if (Array.isArray(doctor.specialities)) {
      specs = doctor.specialities;
    } else if (typeof doctor.specialities === 'string') {
      specs = doctor.specialities.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
    }

    setDoctorForm({
      name: doctor.name || '',
      number: doctor.number || '',
      altNumber: doctor.altNumber || '',
      email: doctor.email || '',
      specialities: specs,
      qualification: doctor.qualification || '',
      experience: doctor.experience || '',
      dutyType: doctor.dutyType || 'Shift',
      startTime: doctor.startTime || '04:00',
      startPeriod: doctor.startPeriod || 'PM',
      endTime: doctor.endTime || '08:00',
      endPeriod: doctor.endPeriod || 'PM',
      workingDays: Array.isArray(doctor.workingDays) && doctor.workingDays.length > 0
        ? doctor.workingDays
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      address: doctor.streetAddress || doctor.address || '',
      district: doctor.district || '',
      taluka: doctor.taluka || '',
      pincode: doctor.pincode || '',
      landmark: doctor.landmark || ''
    });
    setDocSpecialtiesDropdownOpen(false);
    setDocSpecialtiesSearch('');
    setDoctorFormErrors({});
    setIsDoctorModalOpen(true);
  };

  const closeDoctorModal = (clearDraft = false) => {
    setIsDoctorModalOpen(false);
    setEditingDoctorId(null);
    if (clearDraft) {
      if (clearDoctorFormDraft) clearDoctorFormDraft();
      setDoctorForm({
        name: '',
        number: '',
        altNumber: '',
        email: '',
        specialities: [],
        qualification: 'MBBS',
        experience: '',
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
        landmark: ''
      });
    }
    setDocSpecialtiesDropdownOpen(false);
    setDocSpecialtiesSearch('');
    setDoctorFormErrors({});
  };

  const handleToggleDoctorWorkingDay = (day) => {
    const currentDays = doctorForm.workingDays || [];
    const isSelected = currentDays.includes(day);
    const updated = isSelected
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    setDoctorForm((prev) => ({
      ...prev,
      workingDays: updated.length > 0 ? updated : [day],
    }));
  };

  const handleToggleQualification = (qual) => {
    const currentStr = doctorForm.qualification || '';
    const parts = currentStr.split(/[,|;]/).map((p) => p.trim()).filter(Boolean);
    const lowerQual = qual.toLowerCase();
    const isPresent = parts.some((p) => p.toLowerCase() === lowerQual);

    let updatedParts;
    if (isPresent) {
      updatedParts = parts.filter((p) => p.toLowerCase() !== lowerQual);
    } else {
      updatedParts = [...parts, qual];
    }

    const newQualStr = updatedParts.join(', ');
    handleDoctorInputChange('qualification', newQualStr);
  };

  const handleDoctorInputChange = (field, value) => {
    let sanitizedValue = value;
    if (field === 'number' || field === 'altNumber') {
      sanitizedValue = value.replace(/[^0-9+\-\s()]/g, '').slice(0, 18);
    } else if (field === 'pincode') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 6);
    }

    setDoctorForm((prev) => ({ ...prev, [field]: sanitizedValue }));

    if (doctorFormErrors[field]) {
      const err = validateDoctorField(field, sanitizedValue);
      setDoctorFormErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSaveDoctor = (e) => {
    if (e) e.preventDefault();
    const newDocErrors = {};
    ['name', 'number'].forEach((field) => {
      const err = validateDoctorField(field, doctorForm[field]);
      if (err) newDocErrors[field] = err;
    });

    if (Object.keys(newDocErrors).length > 0) {
      setDoctorFormErrors(newDocErrors);
      showToast('Please enter doctor full name and primary phone number (*)', 'warning');
      return;
    }

    const cleanedSpecialties = Array.isArray(doctorForm.specialities) && doctorForm.specialities.length > 0
      ? doctorForm.specialities.filter(Boolean)
      : (typeof doctorForm.specialities === 'string' && doctorForm.specialities.trim()
        ? doctorForm.specialities.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
        : (selectedSpecialties.length > 0 ? selectedSpecialties : ['General Medicine']));

    const docAddress = (doctorForm.address && doctorForm.address.trim()) || (formData.address && formData.address.trim()) || 'Hospital OPD Wing';
    const docDistrict = doctorForm.district || formData.location || 'Pune';
    const docTaluka = doctorForm.taluka || formData.areaTaluka || 'Haveli Taluka';
    const docPincode = doctorForm.pincode || formData.pincode || '411004';
    const docLandmark = (doctorForm.landmark && doctorForm.landmark.trim()) || (formData.nearestLandmark || '');

    const addressParts = [
      docAddress,
      docLandmark ? `(Near ${docLandmark})` : '',
      docTaluka,
      docDistrict,
      docPincode ? `PIN: ${docPincode}` : ''
    ].filter(Boolean);

    const formattedAddress = addressParts.join(', ');

    const dutyAvailabilityStr = doctorForm.dutyType === 'On-Call'
      ? 'On-Call Specialist'
      : `Shift (${doctorForm.startTime || '04:00'} ${doctorForm.startPeriod || 'PM'} - ${doctorForm.endTime || '08:00'} ${doctorForm.endPeriod || 'PM'})`;

    const opdTimingStr = doctorForm.dutyType === 'On-Call'
      ? '24/7 Emergency On-Call'
      : `${doctorForm.startTime || '04:00'} ${doctorForm.startPeriod || 'PM'} - ${doctorForm.endTime || '08:00'} ${doctorForm.endPeriod || 'PM'}`;

    const doctorData = {
      id: editingDoctorId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: doctorForm.name.trim(),
      number: doctorForm.number.trim(),
      altNumber: doctorForm.altNumber ? doctorForm.altNumber.trim() : '',
      email: doctorForm.email ? doctorForm.email.trim().toLowerCase() : '',
      specialities: cleanedSpecialties,
      qualification: (doctorForm.qualification && doctorForm.qualification.trim()) || 'MBBS',
      experience: doctorForm.experience ? doctorForm.experience.trim() : '',
      dutyType: doctorForm.dutyType || 'Shift',
      startTime: doctorForm.startTime || '04:00',
      startPeriod: doctorForm.startPeriod || 'PM',
      endTime: doctorForm.endTime || '08:00',
      endPeriod: doctorForm.endPeriod || 'PM',
      workingDays: doctorForm.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      availability: dutyAvailabilityStr,
      opdTiming: opdTimingStr,
      opdShift: doctorForm.dutyType === 'On-Call' ? 'On-Call' : (doctorForm.startPeriod === 'PM' ? 'Evening' : 'Morning'),
      address: formattedAddress,
      streetAddress: docAddress,
      district: docDistrict,
      taluka: docTaluka,
      pincode: docPincode,
      landmark: docLandmark
    };

    if (editingDoctorId) {
      setFormData((prev) => ({
        ...prev,
        doctors: (prev.doctors || []).map((doc) => (doc.id === editingDoctorId ? doctorData : doc))
      }));
      showToast(`Doctor details for "${doctorData.name}" updated!`, 'success');
    } else {
      setFormData((prev) => ({
        ...prev,
        doctors: [...(prev.doctors || []), doctorData]
      }));
      showToast(`Doctor "${doctorData.name}" added to hospital!`, 'success');
    }

    if (clearDoctorFormDraft) clearDoctorFormDraft();
    closeDoctorModal(true);
  };

  const handleRemoveDoctor = (docId, e) => {
    if (e) e.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      doctors: (prev.doctors || []).filter((doc) => doc.id !== docId)
    }));
    showToast('Doctor removed from hospital list', 'info');
  };

  const getDoctorInitials = (name) => {
    if (!name) return 'DR';
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'DR';
  };

  /**
   * CSV Parsing and Bulk Import Handlers
   */
  const parseCsvText = (csvText) => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing doctor data rows.');
    }

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const rawHeaders = parseLine(lines[0]);
    const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('doctor'));
    const numIdx = headers.findIndex((h) => (h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number')) && !h.includes('alt'));
    const altNumIdx = headers.findIndex((h) => h.includes('alt') || h.includes('secondary'));
    const specIdx = headers.findIndex((h) => h.includes('special') || h.includes('dept') || h.includes('department'));
    const qualIdx = headers.findIndex((h) => h.includes('qual') || h.includes('degree') || h.includes('education'));
    const addrIdx = headers.findIndex((h) => h.includes('addr') || h.includes('room') || h.includes('chamber') || h.includes('opd'));

    const doctors = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0] || '';
      const number = numIdx !== -1 ? cols[numIdx] : cols[1] || '';
      const altNumber = altNumIdx !== -1 ? cols[altNumIdx] : cols[2] || '';
      const specRaw = specIdx !== -1 ? cols[specIdx] : cols[3] || 'General Medicine';
      const qualification = qualIdx !== -1 ? cols[qualIdx] : cols[4] || 'MBBS';
      const address = addrIdx !== -1 ? cols[addrIdx] : cols[5] || (formData.name ? `OPD Wing, ${formData.name}` : 'Hospital OPD Wing');

      if (name && name.trim()) {
        const specs = specRaw.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
        doctors.push({
          id: `doc-csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          number: number.trim(),
          altNumber: altNumber.trim(),
          specialities: specs.length > 0 ? specs : ['General Medicine'],
          qualification: qualification.trim() || 'MBBS',
          address: address.trim() || 'Hospital OPD Wing'
        });
      }
    }

    if (doctors.length === 0) {
      throw new Error('No valid doctor records found in the CSV file.');
    }

    return doctors;
  };

  const handleProcessCsvFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a valid .csv file', 'warning');
      return;
    }

    setCsvFileName(file.name);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCsvText(text);
        setCsvPreviewDoctors(parsed);
        setIsCsvModalOpen(true);
      } catch (err) {
        console.error('CSV parse error:', err);
        setCsvError(err.message || 'Failed to parse CSV file');
        showToast(err.message || 'Failed to parse CSV file', 'error');
      }
    };
    reader.onerror = () => {
      showToast('Error reading the CSV file', 'error');
    };
    reader.readAsText(file);
  };

  const handleCsvFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessCsvFile(file);
    }
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const handleConfirmCsvImport = () => {
    if (!csvPreviewDoctors || csvPreviewDoctors.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      doctors: [...(prev.doctors || []), ...csvPreviewDoctors]
    }));
    showToast(`Successfully imported ${csvPreviewDoctors.length} doctors from CSV!`, 'success');
    setIsCsvModalOpen(false);
    setCsvPreviewDoctors([]);
    setCsvFileName('');
  };

  const handleCancelCsvImport = () => {
    setIsCsvModalOpen(false);
    setCsvPreviewDoctors([]);
    setCsvFileName('');
    setCsvError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Comprehensive Form Validation
    const newErrors = {};
    const fieldsToValidate = ['name', 'type', 'scheme', 'contact', 'address', 'location', 'areaTaluka', 'pincode', 'nearestLandmark', 'specialties'];

    fieldsToValidate.forEach((field) => {
      const errorMsg = validateField(field, formData[field]);
      if (errorMsg) {
        newErrors[field] = errorMsg;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the highlighted errors before submitting (*)', 'warning');

      // Autofocus first invalid input element
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(`field-${firstErrorKey}`) || document.querySelector('.input-error');
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const sevakString = formData.selectedSevaks.length > 0
      ? formData.selectedSevaks.join(', ')
      : 'Not assigned';

    const selectedSevakIds = (formData.selectedSevaks || [])
      .map((name) => {
        const match = (arogyaSevaks || []).find((s) => s.name === name);
        return match ? (match.sevakId || match.id) : null;
      })
      .filter((id) => id && !String(id).startsWith('SEVAK-'));

    setSubmitting(true);

    try {
      const finalSpecialties = Array.isArray(formData.specialties) && formData.specialties.length > 0
        ? formData.specialties
        : typeof formData.specialties === 'string' && formData.specialties.trim()
          ? formData.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
          : ['General Medicine'];

      const result = await hospitalService.createHospital({
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim(),
        address: formData.address.trim(),
        areaTaluka: formData.areaTaluka.trim(),
        pincode: formData.pincode.trim(),
        scheme: formData.scheme,
        nearestLandmark: formData.nearestLandmark.trim(),
        contact: formData.contact.trim(),
        specialties: finalSpecialties,
        sevak: sevakString,
        selectedSevaks: formData.selectedSevaks,
        selectedSevakIds: selectedSevakIds,
        doctors: formData.doctors || []
      });

      if (result?.success) {
        if (addHospital) {
          addHospital(result.data);
        }
        if (clearHospitalFormDraft) clearHospitalFormDraft();
        if (clearDoctorFormDraft) clearDoctorFormDraft();
        showToast(`Hospital "${formData.name.trim()}" empanelled successfully!`);
        navigate('/admin/hospitals');
      }
    } catch (err) {
      console.error('[AddHospital] Creation failed:', err);
      showToast(err.message || 'Failed to create hospital record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-hospital-page">
      {/* Back Link */}
      <div className="add-hosp-header">
        <button
          className="btn-back-link"
          onClick={() => navigate('/admin/hospitals')}
          type="button"
        >
          <ArrowLeft size={16} />
          Back to Hospital Directory
        </button>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="add-hosp-form-container">

        {/* Section 1: Primary Identity & Contact */}
        <div className="form-card-section">
          <div className="section-header">
            <Building2 size={18} className="text-blue" />
            <h3>Basic Hospital Information</h3>
          </div>

          <div className="form-grid-full">
            <div className="form-field">
              <label className="field-label" htmlFor="field-name">Hospital Name <span className="req-star">*</span></label>
              <input
                id="field-name"
                type="text"
                className={`field-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Deenanath Mangeshkar Hospital & Research Center"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
              />
              {errors.name && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.name}
                </span>
              )}
            </div>
          </div>

          <div className="form-grid-three">
            <div className="form-field">
              <label className="field-label" htmlFor="field-type">Hospital Type <span className="req-star">*</span></label>
              <div className="input-with-icon">
                <Building2 size={16} className="icon-prefix" />
                <select
                  id="field-type"
                  className={`field-select icon-padded ${errors.type ? 'input-error' : ''}`}
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  onBlur={() => handleBlur('type')}
                >
                  <option value="Government">Government (Govt)</option>
                  <option value="Non-Government">Non-Government / Private (Non-Govt)</option>
                </select>
              </div>
              {errors.type && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.type}
                </span>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="field-scheme">Empanelled Schemes <span className="req-star">*</span></label>
              <div className="input-with-icon">
                <ShieldCheck size={16} className="icon-prefix" />
                <select
                  id="field-scheme"
                  className={`field-select icon-padded ${errors.scheme ? 'input-error' : ''}`}
                  value={formData.scheme}
                  onChange={(e) => handleInputChange('scheme', e.target.value)}
                  onBlur={() => handleBlur('scheme')}
                >
                  <option value="PM-JAY, MJPJAY">PM-JAY & MJPJAY (All Core Schemes)</option>
                  {schemes.map(s => (
                    <option key={s.id} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </div>
              {errors.scheme && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.scheme}
                </span>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="field-contact">Contact Landline / Phone</label>
              <div className="input-with-icon">
                <Phone size={16} className="icon-prefix" />
                <input
                  id="field-contact"
                  type="text"
                  className={`field-input icon-padded ${errors.contact ? 'input-error' : ''}`}
                  placeholder="e.g. 020-66455100 or 9822011223"
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  onBlur={() => handleBlur('contact')}
                  maxLength={18}
                />
              </div>
              {errors.contact ? (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.contact}
                </span>
              ) : (
                <span className="field-hint">STD landline, 10-digit mobile, or toll-free</span>
              )}
            </div>
          </div>

          <div className="form-grid-full" style={{ marginTop: '1rem' }}>
            <div className="form-field specialties-form-field" ref={specialtiesDropdownRef}>
              <div className="specialties-field-label-row">
                <label className="field-label" htmlFor="field-specialties-trigger">
                  Empanelled Clinical Specialties <span className="req-star">*</span>
                </label>
                {selectedSpecialties.length > 0 && (
                  <span className="specialties-count-badge">
                    {selectedSpecialties.length} Selected
                  </span>
                )}
              </div>

              {/* Custom Multi-Select Dropdown Button */}
              <div className="specialties-dropdown-wrapper">
                <button
                  id="field-specialties-trigger"
                  type="button"
                  className={`specialties-dropdown-btn ${specialtiesDropdownOpen ? 'open' : ''} ${errors.specialties ? 'input-error' : ''}`}
                  onClick={() => setSpecialtiesDropdownOpen((prev) => !prev)}
                  aria-expanded={specialtiesDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <div className="specialties-btn-left">
                    <Stethoscope size={18} className="specialties-btn-icon" />
                    {selectedSpecialties.length === 0 ? (
                      <span className="specialties-placeholder">
                        Select specialties (e.g. Cardiology, Hemodialysis, Trauma Care...)
                      </span>
                    ) : (
                      <span className="specialties-btn-text">
                        <strong>{selectedSpecialties.length}</strong> Clinical {selectedSpecialties.length === 1 ? 'Specialty' : 'Specialties'} Selected
                      </span>
                    )}
                  </div>

                  <div className="specialties-btn-right">
                    {selectedSpecialties.length > 0 && (
                      <span
                        className="specialties-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAllSpecialties();
                        }}
                        title="Clear all selected specialties"
                        role="button"
                        tabIndex={0}
                      >
                        <X size={14} />
                      </span>
                    )}
                    {specialtiesDropdownOpen ? (
                      <ChevronUp size={18} className="dropdown-chevron text-blue" />
                    ) : (
                      <ChevronDown size={18} className="dropdown-chevron" />
                    )}
                  </div>
                </button>

                {/* Dropdown Menu Popover */}
                {specialtiesDropdownOpen && (
                  <div className="specialties-menu-popover" role="listbox">
                    {/* Search Bar & Quick Actions Toolbar */}
                    <div className="specialties-menu-header">
                      <div className="specialties-search-box">
                        <Search size={15} className="specialties-search-icon" />
                        <input
                          type="text"
                          className="specialties-search-input"
                          placeholder="Search specialties (e.g. Cardiology, Hemodialysis, ICU)..."
                          value={specialtiesSearch}
                          onChange={(e) => setSpecialtiesSearch(e.target.value)}
                          autoFocus
                        />
                        {specialtiesSearch && (
                          <button
                            type="button"
                            className="specialties-search-clear"
                            onClick={() => setSpecialtiesSearch('')}
                            aria-label="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <div className="specialties-quick-actions">
                        <span className="specialties-quick-info">
                          Showing {filteredSpecialties.length} {filteredSpecialties.length === 1 ? 'specialty' : 'specialties'}
                        </span>
                        <div className="specialties-action-btns">
                          <button
                            type="button"
                            className="specialties-action-btn"
                            onClick={handleSelectAllFiltered}
                          >
                            Select All ({filteredSpecialties.length})
                          </button>
                          {selectedSpecialties.length > 0 && (
                            <button
                              type="button"
                              className="specialties-action-btn clear"
                              onClick={handleClearAllSpecialties}
                            >
                              Clear All
                            </button>
                          )}
                          <button
                            type="button"
                            className="specialties-action-btn done"
                            onClick={() => setSpecialtiesDropdownOpen(false)}
                            title="Close dropdown"
                          >
                            Done / Close ✓
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox Options List */}
                    <div className="specialties-options-list">
                      {filteredSpecialties.length > 0 ? (
                        filteredSpecialties.map((specialty) => {
                          const isChecked = selectedSpecialties.includes(specialty);
                          return (
                            <label
                              key={specialty}
                              className={`specialty-checkbox-item ${isChecked ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSpecialty(specialty)}
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
                          <p>No predefined specialties found for "{specialtiesSearch}"</p>
                          <button
                            type="button"
                            className="btn-add-as-custom"
                            onClick={() => {
                              setCustomSpecialtyInput(specialtiesSearch);
                              handleAddCustomSpecialty();
                              setSpecialtiesSearch('');
                            }}
                          >
                            <Plus size={14} />
                            Add "{specialtiesSearch}" as Custom Specialty
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Add Custom Specialty & Close Dropdown Footer */}
                    <div className="specialties-menu-footer">
                      <div className="add-custom-specialty-row">
                        <input
                          type="text"
                          className="add-custom-input"
                          placeholder="+ Type and add custom specialty..."
                          value={customSpecialtyInput}
                          onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSpecialty();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn-add-custom"
                          disabled={!customSpecialtyInput.trim()}
                          onClick={handleAddCustomSpecialty}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>

                      <div className="specialties-footer-bottom-row">
                        <span className="specialties-footer-selected-count">
                          <strong>{selectedSpecialties.length}</strong> {selectedSpecialties.length === 1 ? 'specialty' : 'specialties'} selected
                        </span>
                        <button
                          type="button"
                          className="btn-specialties-done-apply"
                          onClick={() => setSpecialtiesDropdownOpen(false)}
                        >
                          <Check size={14} />
                          <span>Done / Close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Specialties Badges / Chips Display */}
              {selectedSpecialties.length > 0 && (
                <div className="selected-specialties-chips-wrap">
                  <div className="chips-list">
                    {selectedSpecialties.map((spec) => (
                      <span key={spec} className="specialty-chip">
                        <span className="chip-dot"></span>
                        <span className="chip-text">{spec}</span>
                        <button
                          type="button"
                          className="chip-remove-btn"
                          onClick={() => handleToggleSpecialty(spec)}
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

              {errors.specialties ? (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.specialties}
                </span>
              ) : (
                <span className="field-hint">
                  Select all empanelled specialties with checkboxes from the dropdown above. The first 2 will be highlighted in the main directory table.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Address & Location Details */}
        <div className="form-card-section">
          <div className="section-header">
            <MapPin size={18} className="text-emerald" />
            <h3>Address & Geographical Location</h3>
          </div>

          <div className="form-grid-full" style={{ marginBottom: '1rem' }}>
            <div className="form-field">
              <label className="field-label" htmlFor="field-address">Full Street Address (Plot No., Road, Area) <span className="req-star">*</span></label>
              <input
                id="field-address"
                type="text"
                className={`field-input ${errors.address ? 'input-error' : ''}`}
                placeholder="e.g. Plot 42, Senapati Bapat Road, Near ICC Trade Tower, Erandwane"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
              />
              {errors.address && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.address}
                </span>
              )}
            </div>
          </div>

          <div className="form-grid-two">
            <div className="form-field">
              <label className="field-label" htmlFor="field-location">City / District <span className="req-star">*</span></label>
              <SearchableLocationInput
                id="field-location"
                placeholder="Type district (e.g. Pune, Palghar)..."
                options={locationDirectoryService.getDistricts()}
                value={formData.location}
                onChange={handleDistrictChange}
                onSelect={handleDistrictChange}
                hasError={!!errors.location}
                className={`field-input ${errors.location ? 'input-error' : ''}`}
              />
              {errors.location && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.location}
                </span>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="field-areaTaluka">Taluka / Sub-district <span className="req-star">*</span></label>
              <SearchableLocationInput
                id="field-areaTaluka"
                placeholder={!formData.location ? 'Select District first' : 'Type taluka (e.g. Haveli)...'}
                options={formData.location ? locationDirectoryService.getTalukas(formData.location) : []}
                value={formData.areaTaluka}
                onChange={handleTalukaChange}
                onSelect={handleTalukaChange}
                disabled={!formData.location}
                hasError={!!errors.areaTaluka}
                className={`field-input ${errors.areaTaluka ? 'input-error' : ''}`}
              />
              {errors.areaTaluka && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.areaTaluka}
                </span>
              )}
            </div>
          </div><br></br>

          <div className="form-grid-two">
            <div className="form-field">
              <label className="field-label" htmlFor="field-pincode">Pincode <span className="req-star">*</span></label>
              <input
                id="field-pincode"
                type="text"
                className={`field-input ${errors.pincode ? 'input-error' : ''}`}
                placeholder={!formData.areaTaluka ? 'Select Taluka first' : '411004'}
                value={formData.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value)}
                onBlur={() => handleBlur('pincode')}
                maxLength={6}
                disabled={!formData.areaTaluka}
              />
              {errors.pincode ? (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.pincode}
                </span>
              ) : (
                <span className="field-hint">6-digit Indian PIN code (e.g. 411004)</span>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="field-nearestLandmark">Nearest Landmark / Station</label>
              <input
                id="field-nearestLandmark"
                type="text"
                className={`field-input ${errors.nearestLandmark ? 'input-error' : ''}`}
                placeholder="e.g. Near Swargate Bus Stand (500m)"
                value={formData.nearestLandmark}
                onChange={(e) => handleInputChange('nearestLandmark', e.target.value)}
                onBlur={() => handleBlur('nearestLandmark')}
              />
              {errors.nearestLandmark && (
                <span className="error-text">
                  <AlertCircle size={13} />
                  {errors.nearestLandmark}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Hospital Doctors & Medical Staff */}
        <div className="form-card-section doctors-section">
          <div className="section-header-with-action">
            <div className="section-header-left">
              <Stethoscope size={20} className="text-blue" />
              <div>
                <div className="section-title-badge-row">
                  <h3>Hospital Doctors</h3>
                  <span className="doctors-count-pill">
                    {formData.doctors.length} {formData.doctors.length === 1 ? 'Doctor' : 'Doctors'}
                  </span>
                </div>
                <p className="section-hint-text" style={{ margin: '3px 0 0 0' }}>
                  Add resident physicians, visiting specialists, and key consulting doctors for this hospital.
                </p>
              </div>
            </div>

            <div className="section-header-right doctor-header-actions">
              <button
                type="button"
                className="btn-csv-action sample"
                onClick={() => downloadSampleDoctorCsv(showToast)}
                title="Download standard CSV template for doctors"
              >
                <Download size={14} />
                <span>Sample CSV</span>
              </button>

              <button
                type="button"
                className="btn-csv-action upload"
                onClick={() => csvFileInputRef.current?.click()}
                title="Upload doctors via CSV spreadsheet"
              >
                <FileSpreadsheet size={15} />
                <span>Upload CSV</span>
              </button>

              <input
                type="file"
                ref={csvFileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleCsvFileInputChange}
              />

              <button
                type="button"
                className="btn-add-doctor-trigger"
                onClick={openAddDoctorModal}
              >
                <Plus size={16} />
                <span>Add Doctor</span>
              </button>
            </div>
          </div>

          {/* Doctor List or Empty State */}
          {formData.doctors.length === 0 ? (
            <div className="doctors-empty-state">
              <div className="empty-state-icon-box">
                <Stethoscope size={30} />
              </div>
              <h4 className="empty-state-title">No Doctors Added Yet</h4>
              <p className="empty-state-desc">
                You can add empanelled doctors manually one-by-one or bulk upload multiple doctors using a CSV file.
              </p>
              <div className="empty-state-action-buttons">
                <button
                  type="button"
                  className="btn-empty-add-doctor"
                  onClick={openAddDoctorModal}
                >
                  <UserPlus size={16} />
                  <span>+ Add Doctor Manually</span>
                </button>

                <button
                  type="button"
                  className="btn-empty-csv-upload"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <FileSpreadsheet size={16} />
                  <span>Upload Doctors CSV</span>
                </button>

                <button
                  type="button"
                  className="btn-empty-csv-sample"
                  onClick={() => downloadSampleDoctorCsv(showToast)}
                >
                  <Download size={14} />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="doctors-table-card">
              <div className="doctors-table-container">
                <table className="doctors-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                      <th>Doctor Name & Degrees</th>
                      <th>Clinical Specialities</th>
                      <th>Duty Availability & Shift</th>
                      <th>Contact Numbers</th>
                      <th>OPD Chamber / Address</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.doctors.map((doc, idx) => (
                      <tr key={doc.id || idx} className="doctor-data-row">
                        <td className="doc-row-index">{idx + 1}</td>
                        <td>
                          <div className="doctor-row-identity">
                            <div className="doctor-row-avatar">
                              {getDoctorInitials(doc.name)}
                            </div>
                            <div className="doctor-row-meta">
                              <span className="doctor-row-name">{doc.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {doc.qualification && (
                                  <span className="doctor-row-qual">
                                    <GraduationCap size={12} />
                                    <span>{doc.qualification}</span>
                                  </span>
                                )}
                                {doc.experience && (
                                  <span className="doctor-row-qual" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                                    <Award size={12} />
                                    <span>{doc.experience}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="doctor-row-specialties">
                            {(Array.isArray(doc.specialities) ? doc.specialities : [doc.specialities]).filter(Boolean).map((spec, sIdx) => (
                              <span key={sIdx} className="doctor-row-spec-badge">
                                <span className="spec-dot" />
                                {spec}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="doctor-row-timing">
                            <span className="doc-timing-pill">
                              <Clock size={12} className="text-blue" />
                              <span>{doc.availability || (doc.opdTiming ? doc.opdTiming : 'Regular Shift')}</span>
                            </span>
                            {doc.workingDays && doc.workingDays.length > 0 && (
                              <span className="doc-days-sub">
                                {doc.workingDays.length === 7 ? 'All 7 Days (Mon - Sun)' : doc.workingDays.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="doctor-row-phones">
                            <div className="doc-phone-line primary">
                              <Phone size={12} className="text-blue" />
                              <span>{doc.number}</span>
                            </div>
                            {doc.altNumber && (
                              <div className="doc-phone-line alt">
                                <PhoneCall size={12} className="text-slate" />
                                <span>Alt: {doc.altNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {doc.address ? (
                            <div className="doctor-row-address">
                              <MapPin size={13} className="text-emerald" style={{ flexShrink: 0 }} />
                              <span>{doc.address}</span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="doctor-row-actions">
                            <button
                              type="button"
                              className="btn-doc-row-action edit"
                              onClick={() => openEditDoctorModal(doc)}
                              title="Edit Doctor Details"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-doc-row-action delete"
                              onClick={(e) => handleRemoveDoctor(doc.id, e)}
                              title="Remove Doctor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions Footer */}
        <div className="add-hosp-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/admin/hospitals')}
          >
            Cancel
          </button>

          <button type="submit" className="btn-submit" disabled={submitting}>
            <Building2 size={16} />
            {submitting ? 'Empanelling...' : 'Empanel Hospital'}
          </button>
        </div>

      </form>

      {/* Add / Edit Doctor Modal */}
      {isDoctorModalOpen && (
        <div className="doctor-modal-overlay" onClick={closeDoctorModal}>
          <div className="doctor-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="doctor-modal-header">
              <div className="doctor-modal-head-left">
                <div className="doctor-modal-icon-badge">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="doctor-modal-title">
                    {editingDoctorId ? 'Edit Doctor Details' : 'Add Doctor to Hospital'}
                  </h3>
                  <p className="doctor-modal-subtitle">
                    Enter doctor's credentials, qualifications, contact numbers, and OPD chamber details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-doctor-modal-close"
                onClick={closeDoctorModal}
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="doctor-modal-body">
              {/* Doctor Name */}
              <div className="form-field">
                <label className="field-label" htmlFor="doc-field-name">
                  Doctor Full Name <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={16} className="icon-prefix" />
                  <input
                    id="doc-field-name"
                    type="text"
                    className={`field-input icon-padded ${doctorFormErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Dr. Rajesh Kulkarni"
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

              {/* Contact Numbers Row */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-number">
                    Primary Phone / Mobile Number <span className="req-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Phone size={16} className="icon-prefix" />
                    <input
                      id="doc-field-number"
                      type="text"
                      className={`field-input icon-padded ${doctorFormErrors.number ? 'input-error' : ''}`}
                      placeholder="e.g. 9822011223"
                      value={doctorForm.number}
                      onChange={(e) => handleDoctorInputChange('number', e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  {doctorFormErrors.number ? (
                    <span className="error-text">
                      <AlertCircle size={13} />
                      {doctorFormErrors.number}
                    </span>
                  ) : (
                    <span className="field-hint">Primary mobile for emergency/OPD coordination</span>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-alt-number">
                    Alternative Contact Number
                  </label>
                  <div className="input-with-icon">
                    <PhoneCall size={16} className="icon-prefix" />
                    <input
                      id="doc-field-alt-number"
                      type="text"
                      className={`field-input icon-padded ${doctorFormErrors.altNumber ? 'input-error' : ''}`}
                      placeholder="e.g. 020-25678900 or 9822099887"
                      value={doctorForm.altNumber}
                      onChange={(e) => handleDoctorInputChange('altNumber', e.target.value)}
                      maxLength={18}
                    />
                  </div>
                  {doctorFormErrors.altNumber ? (
                    <span className="error-text">
                      <AlertCircle size={13} />
                      {doctorFormErrors.altNumber}
                    </span>
                  ) : (
                    <span className="field-hint">Optional secondary or clinic landline</span>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div className="form-field">
                <label className="field-label" htmlFor="doc-field-email">
                  Doctor Email Address
                </label>
                <div className="input-with-icon">
                  <Mail size={16} className="icon-prefix" />
                  <input
                    id="doc-field-email"
                    type="email"
                    className={`field-input icon-padded ${doctorFormErrors.email ? 'input-error' : ''}`}
                    placeholder="e.g. dr.rajesh@hospital.org"
                    value={doctorForm.email}
                    onChange={(e) => handleDoctorInputChange('email', e.target.value)}
                  />
                </div>
                {doctorFormErrors.email ? (
                  <span className="error-text">
                    <AlertCircle size={13} />
                    {doctorFormErrors.email}
                  </span>
                ) : (
                  <span className="field-hint">For clinical notifications, pre-auth alerts, and escalations</span>
                )}
              </div>

              {/* Qualification */}
              <div className="form-field">
                <label className="field-label" htmlFor="doc-field-qualification">
                  Qualification & Degrees <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <GraduationCap size={16} className="icon-prefix" />
                  <input
                    id="doc-field-qualification"
                    type="text"
                    className={`field-input icon-padded ${doctorFormErrors.qualification ? 'input-error' : ''}`}
                    placeholder="e.g. MBBS, MD (General Medicine), DNB"
                    value={doctorForm.qualification}
                    onChange={(e) => handleDoctorInputChange('qualification', e.target.value)}
                  />
                </div>
                {/* Quick Qualification Suggestions */}
                <div className="doctor-quick-pills-row">
                  <span className="quick-pill-label">Quick select:</span>
                  <div className="am-quick-qual-pills">
                    {(showAllQualifications ? ALL_QUALIFICATIONS : PRIMARY_QUALIFICATIONS).map((q) => {
                      const isSelected = (doctorForm.qualification || '')
                        .split(/[,|;]/)
                        .map((part) => part.trim().toLowerCase())
                        .includes(q.toLowerCase());
                      return (
                        <button
                          key={q}
                          type="button"
                          className={`quick-select-pill ${isSelected ? 'active is-active' : ''}`}
                          onClick={() => handleToggleQualification(q)}
                          title={isSelected ? `Remove ${q}` : `Add ${q}`}
                        >
                          {isSelected ? `✓ ${q}` : `+ ${q}`}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="quick-select-pill more-toggle-pill"
                      onClick={() => setShowAllQualifications((prev) => !prev)}
                    >
                      {showAllQualifications ? 'Show Less ▴' : `+ More (${ALL_QUALIFICATIONS.length - PRIMARY_QUALIFICATIONS.length}) ▾`}
                    </button>
                  </div>
                </div>
                {doctorFormErrors.qualification && (
                  <span className="error-text">
                    <AlertCircle size={13} />
                    {doctorFormErrors.qualification}
                  </span>
                )}
              </div>

              {/* Doctor Experience */}
              <div className="form-field">
                <label className="field-label" htmlFor="doc-field-experience">
                  Clinical Experience (Years)
                </label>
                <div className="input-with-icon">
                  <Award size={16} className="icon-prefix" />
                  <input
                    id="doc-field-experience"
                    type="text"
                    className={`field-input icon-padded ${doctorFormErrors.experience ? 'input-error' : ''}`}
                    placeholder="e.g. 14 Years"
                    value={doctorForm.experience}
                    onChange={(e) => handleDoctorInputChange('experience', e.target.value)}
                  />
                </div>
                {doctorFormErrors.experience ? (
                  <span className="error-text">
                    <AlertCircle size={13} />
                    {doctorFormErrors.experience}
                  </span>
                ) : (
                  <span className="field-hint">e.g. 14 Years of Clinical Practice, Senior Consultant</span>
                )}
              </div>

              {/* Duty Type & Availability Scheduling */}
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
                      onChange={(e) => {
                        const newType = e.target.value;
                        setDoctorForm((prev) => ({
                          ...prev,
                          dutyType: newType,
                        }));
                      }}
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
                            onChange={(e) =>
                              setDoctorForm((prev) => ({
                                ...prev,
                                startTime: e.target.value,
                              }))
                            }
                          />
                          <select
                            className="am-time-ampm-select"
                            value={doctorForm.startPeriod || 'PM'}
                            onChange={(e) =>
                              setDoctorForm((prev) => ({
                                ...prev,
                                startPeriod: e.target.value,
                              }))
                            }
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
                            onChange={(e) =>
                              setDoctorForm((prev) => ({
                                ...prev,
                                endTime: e.target.value,
                              }))
                            }
                          />
                          <select
                            className="am-time-ampm-select"
                            value={doctorForm.endPeriod || 'PM'}
                            onChange={(e) =>
                              setDoctorForm((prev) => ({
                                ...prev,
                                endPeriod: e.target.value,
                              }))
                            }
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
                            placeholder="Search 26 clinical specialties..."
                            value={docSpecialtiesSearch}
                            onChange={(e) => setDocSpecialtiesSearch(e.target.value)}
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
                  <div className="selected-specialties-chips-wrap" style={{ marginTop: '8px' }}>
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
                  {(specialtiesList.slice(0, 10)).map((sp) => {
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

              {/* Doctor Address & Geographical Location (Similar to Hospital Address - Image 2) */}
              <div className="doctor-address-section-divider">
                <div className="doc-section-subtitle-wrap">
                  <MapPin size={15} className="text-emerald" />
                  <span className="doc-section-subtitle">Doctor Address & Location Details</span>
                </div>
              </div>

              {/* Full Street Address */}
              <div className="form-field">
                <label className="field-label" htmlFor="doc-field-address">
                  Full Street Address (Plot No., Road, Area / OPD Wing)
                </label>
                <div className="input-with-icon">
                  <MapPin size={16} className="icon-prefix" />
                  <input
                    id="doc-field-address"
                    type="text"
                    className="field-input icon-padded"
                    placeholder={formData.address ? `e.g. ${formData.address}` : 'e.g. OPD Wing B, Room 204, 2nd Floor, Senapati Bapat Road'}
                    value={doctorForm.address}
                    onChange={(e) => handleDoctorInputChange('address', e.target.value)}
                  />
                </div>
              </div>

              {/* City / District & Taluka / Sub-District Grid */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-district">
                    City / District
                  </label>
                  <SearchableLocationInput
                    id="doc-field-district"
                    placeholder="Type district (e.g. Pune)..."
                    options={locationDirectoryService.getDistricts()}
                    value={doctorForm.district}
                    onChange={handleDoctorDistrictChange}
                    onSelect={handleDoctorDistrictChange}
                    className="field-input"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-taluka">
                    Taluka / Sub-District
                  </label>
                  <SearchableLocationInput
                    id="doc-field-taluka"
                    placeholder={!doctorForm.district ? 'Select District first' : 'Type taluka (e.g. Haveli)...'}
                    options={doctorForm.district ? locationDirectoryService.getTalukas(doctorForm.district) : []}
                    value={doctorForm.taluka}
                    onChange={handleDoctorTalukaChange}
                    onSelect={handleDoctorTalukaChange}
                    disabled={!doctorForm.district}
                    className="field-input"
                  />
                </div>
              </div>

              {/* Pincode & Nearest Landmark / Station Grid */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-pincode">
                    Pincode
                  </label>
                  <input
                    id="doc-field-pincode"
                    type="text"
                    className="field-input"
                    placeholder={formData.pincode ? `${formData.pincode}` : 'e.g. 411004'}
                    value={doctorForm.pincode}
                    onChange={(e) => handleDoctorInputChange('pincode', e.target.value)}
                    maxLength={6}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="doc-field-landmark">
                    Nearest Landmark / Station
                  </label>
                  <input
                    id="doc-field-landmark"
                    type="text"
                    className={`field-input ${doctorFormErrors.landmark ? 'input-error' : ''}`}
                    placeholder="e.g. Near Swargate Bus Stand (500m)"
                    value={doctorForm.landmark}
                    onChange={(e) => handleDoctorInputChange('landmark', e.target.value)}
                    maxLength={150}
                  />
                  {doctorFormErrors.landmark && (
                    <span className="error-text">
                      <AlertCircle size={13} />
                      {doctorFormErrors.landmark}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="doctor-modal-footer">
              <button
                type="button"
                className="btn-doc-modal-cancel"
                onClick={closeDoctorModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-doc-modal-save"
                onClick={handleSaveDoctor}
              >
                <Check size={16} />
                <span>{editingDoctorId ? 'Save Doctor Changes' : 'Add Doctor to Hospital'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Preview Modal */}
      {isCsvModalOpen && (
        <div className="doctor-modal-overlay" onClick={handleCancelCsvImport}>
          <div className="doctor-modal-dialog csv-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="doctor-modal-header">
              <div className="doctor-modal-head-left">
                <div className="doctor-modal-icon-badge csv-badge">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="doctor-modal-title">Bulk Import Doctors (CSV)</h3>
                  <p className="doctor-modal-subtitle">
                    Found <strong>{csvPreviewDoctors.length}</strong> doctor record{csvPreviewDoctors.length === 1 ? '' : 's'} from <em>{csvFileName}</em>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-doctor-modal-close"
                onClick={handleCancelCsvImport}
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="doctor-modal-body csv-preview-body">
              <div className="csv-preview-info-banner">
                <div className="csv-banner-text">
                  <FileCheck2 size={16} className="text-emerald" />
                  <span>Verify parsed doctor details before adding them to the hospital directory:</span>
                </div>
                <button
                  type="button"
                  className="btn-sample-link"
                  onClick={() => downloadSampleDoctorCsv(showToast)}
                >
                  <Download size={13} />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              {/* Scrollable Preview Table */}
              <div className="csv-preview-table-container">
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Doctor Name</th>
                      <th>Qualification</th>
                      <th>Specialties</th>
                      <th>Primary Phone</th>
                      <th>Alt Number</th>
                      <th>OPD Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreviewDoctors.map((doc, idx) => (
                      <tr key={doc.id || idx}>
                        <td className="text-muted font-mono">{idx + 1}</td>
                        <td className="font-bold text-dark">{doc.name}</td>
                        <td>
                          <span className="table-qual-badge">{doc.qualification}</span>
                        </td>
                        <td>
                          <div className="table-spec-chips">
                            {(Array.isArray(doc.specialities) ? doc.specialities : [doc.specialities]).map((sp, i) => (
                              <span key={i} className="table-spec-chip">{sp}</span>
                            ))}
                          </div>
                        </td>
                        <td className="font-mono">{doc.number}</td>
                        <td className="font-mono text-muted">{doc.altNumber || '—'}</td>
                        <td className="text-slate">{doc.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="doctor-modal-footer">
              <button
                type="button"
                className="btn-doc-modal-cancel"
                onClick={handleCancelCsvImport}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-doc-modal-save csv-confirm-btn"
                onClick={handleConfirmCsvImport}
              >
                <Check size={16} />
                <span>Confirm & Add {csvPreviewDoctors.length} Doctor{csvPreviewDoctors.length === 1 ? '' : 's'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddHospital;
