import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { useAuth } from '../../../shared/hooks/useAuth';
import { specializationService } from '../../../shared/services/specializationService';
import { apiClient } from '../../../api/client';
import {
  HospitalFacilityProfile,
  HospitalCapacityData,
  HospitalDoctor,
  HospitalResourceCount,
  INITIAL_HOSPITAL_PROFILE,
  EMPTY_HOSPITAL_SURVEY_PROFILE,
  DEFAULT_CAPACITY_DATA,
  sevakHospitalService,
  getCompletedSurveySections,
} from '../../services/sevakHospitalService';
import { sevakDraftService } from '../../services/sevakDraftService';

export const SECTIONS = [
  { id: 1, title: 'Hospital Info', subtitle: 'Basic Contact & Location Details', icon: 'business-outline' },
  { id: 2, title: 'Capacity', subtitle: 'IPD, Diagnostics, Operative, Emergency & Blood Bank', icon: 'bed-outline' },
  { id: 3, title: 'Specialities', subtitle: '26 Clinical Specialities & Departments', icon: 'medkit-outline' },
  { id: 4, title: 'Packages', subtitle: 'Healthcare Scheme Treatment Packages', icon: 'cube-outline' },
  { id: 5, title: 'Doctors', subtitle: 'Attending Specialists & Duty Schedule', icon: 'people-outline' },
  { id: 6, title: 'Resource Count', subtitle: 'Doctors, Nurses & Support Staff Strength', icon: 'grid-outline' },
];

export const HOSPITAL_TYPES = [
  'Government / Public',
  'Private Multi-Specialty',
  'Charitable Trust',
  'Semi-Government',
];

export const DIAGNOSTIC_MODALITIES = [
  { key: 'xray', label: 'X-Ray (Digital Radiography)', desc: 'Static & Mobile Digital X-Ray Units', unit: 'Units' },
  { key: 'mri', label: 'MRI Scanner', desc: '1.5T / 3.0T Magnetic Resonance Imaging', unit: 'Units' },
  { key: 'ultrasound', label: 'Ultra Sound (USG & 2D Echo)', desc: 'Sonography & Doppler Imaging Unit', unit: 'Units' },
  { key: 'ctScan', label: 'CT Scan (Computed Tomography)', desc: 'Multi-slice CT Scanner', unit: 'Units' },
  { key: 'ecg', label: 'ECG (Electrocardiogram)', desc: '12-lead diagnostic ECG machines', unit: 'Units' },
  { key: 'endoscopy', label: 'Endoscopy & Colonoscopy Suite', desc: 'Video endoscope & GI diagnostic tower', unit: 'Units' },
];

export const OPERATIVE_FACILITIES = [
  { key: 'operationTheatres', label: 'Operation Theatres (OT)', desc: 'Major & Minor Surgical Suites', unit: 'OTs' },
  { key: 'recoveryBeds', label: 'Post-Op Recovery Beds / Wards', desc: 'Post-Anesthesia Care Beds', unit: 'Beds' },
  { key: 'dialysisUnits', label: 'Dialysis Units / Beds', desc: 'Dialysis Stations & Equipment', unit: 'Units' },
];

export const EMERGENCY_FACILITIES = [
  { key: 'emergencyBeds', label: 'Emergency / Casualty Beds', desc: 'Triage & Acute Trauma Resuscitation', unit: 'Beds' },
  { key: 'ambulances', label: 'Ambulances (Basic & Cardiac ICU)', desc: 'Equipped Emergency Response Vehicles', unit: 'Ambulances' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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

export const MAHARASHTRA_DISTRICTS = [
  'Pune', 'Mumbai City', 'Mumbai Suburban', 'Thane', 'Nagpur', 'Nashik',
  'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Satara', 'Sangli',
  'Ahmednagar', 'Amravati', 'Nanded', 'Jalgaon', 'Akola', 'Latur', 'Dhule',
  'Raigad', 'Ratnagiri', 'Sindhudurg', 'Chandrapur', 'Yavatmal', 'Beed',
  'Jalna', 'Parbhani', 'Buldhana', 'Dharashiv (Osmanabad)', 'Wardha',
  'Gondia', 'Gadchiroli', 'Bhandara', 'Hingoli', 'Washim', 'Nandurbar', 'Palghar',
];

export const QUICK_QUALIFICATIONS = [
  'MBBS', 'MD (General Medicine)', 'MS (General Surgery)', 'MD (Cardiology)',
  'DM (Cardiology)', 'MS (Orthopedics)', 'MD (Pediatrics)', 'MD (Obstetrics & Gynae)',
  'DNB', 'MCh (Neurosurgery)', 'BDS / MDS', 'Fellowship (Critical Care)',
];

export const QUICK_DOC_SPECIALITIES = [
  'Burns Management', 'Cardio-thoracic & Vascular surgery', 'Cardiology',
  'Emergency Room Packages', 'General Medicine', 'General Surgery',
  'Infectious Diseases', 'Interventional Neuroradiology', 'Medical Oncology',
  'Mental Diseases / Psychiatry',
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const getDoctorDutyDays = (doc: any) => {
  if (!doc) return 'Mon - Sat';
  if (doc.dutyType === 'On-Call' || (doc.availability && doc.availability.includes('On-Call'))) {
    return 'On-Call (24/7)';
  }
  let days = doc.workingDays;
  if (!days || !Array.isArray(days) || days.length === 0) {
    const match = doc.availability?.match(/\[(.*?)\]/);
    if (match && match[1]) {
      days = match[1].split(',').map((d: string) => d.trim()).filter(Boolean);
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

// Comprehensive fallback packages master mapped to 26 standard specialties
const FALLBACK_PACKAGES_MAP: Record<string, { specialty_code: string; procedures: { package_code: string; package_name: string }[] }> = {
  'Burns Management': {
    specialty_code: 'BM',
    procedures: [
      { package_code: 'BM001', package_name: 'Thermal burns 10% to 20% conservative management' },
      { package_code: 'BM002', package_name: 'Thermal burns 21% to 40% resuscitation & debridement' },
      { package_code: 'BM003', package_name: 'Deep chemical / electrical burns wound debridement' },
      { package_code: 'BM004', package_name: 'Post-burn contracture release & skin grafting' },
    ],
  },
  'Cardio-thoracic & Vascular surgery': {
    specialty_code: 'CTVS',
    procedures: [
      { package_code: 'CT001', package_name: 'Coronary Artery Bypass Grafting (CABG - Off Pump)' },
      { package_code: 'CT002', package_name: 'Single / Double Valve Replacement (MVR / AVR)' },
      { package_code: 'CT003', package_name: 'ASD / VSD Congenital Heart Defect Closure' },
      { package_code: 'CT004', package_name: 'Peripheral Arterial Embolectomy / Bypass' },
    ],
  },
  'Cardiology': {
    specialty_code: 'CARD',
    procedures: [
      { package_code: 'CD001', package_name: 'Coronary Angiography (CAG Diagnostic)' },
      { package_code: 'CD002', package_name: 'Primary PTCA / Angioplasty with DES Stent' },
      { package_code: 'CD003', package_name: 'Permanent Pacemaker Implantation (PPI Single/Dual Chamber)' },
      { package_code: 'CD004', package_name: 'Acute Myocardial Infarction ICU Thrombolysis Care' },
    ],
  },
  'Emergency Room Packages': {
    specialty_code: 'EMRG',
    procedures: [
      { package_code: 'ER001', package_name: 'Acute Polytrauma Resuscitation & Stabilization' },
      { package_code: 'ER002', package_name: 'Acute Poisoning / Snake Bite Anti-Venom Protocol' },
      { package_code: 'ER003', package_name: 'Severe Acute Respiratory Distress & Invasive Ventilation' },
      { package_code: 'ER004', package_name: 'Septic Shock Triage & Central Line Placement' },
    ],
  },
  'General Medicine': {
    specialty_code: 'GMED',
    procedures: [
      { package_code: 'GM001', package_name: 'Severe Malaria / Dengue with Thrombocytopenia IPD' },
      { package_code: 'GM002', package_name: 'Uncontrolled Diabetes with Ketoacidosis (DKA Management)' },
      { package_code: 'GM003', package_name: 'Hypertensive Emergency & Acute Cerebrovascular Stroke' },
      { package_code: 'GM004', package_name: 'Community Acquired Pneumonia & Chronic Bronchitis' },
    ],
  },
  'General Surgery': {
    specialty_code: 'GSUR',
    procedures: [
      { package_code: 'GS001', package_name: 'Laparoscopic / Open Cholecystectomy' },
      { package_code: 'GS002', package_name: 'Laparoscopic / Open Appendectomy' },
      { package_code: 'GS003', package_name: 'Inguinal / Umbilical / Incisional Hernioplasty with Mesh' },
      { package_code: 'GS004', package_name: 'Exploratory Laparotomy for Intestinal Perforation / Obstruction' },
    ],
  },
  'Infectious Diseases': {
    specialty_code: 'INF',
    procedures: [
      { package_code: 'IN001', package_name: 'Multi-Drug Resistant Tuberculosis Isolation Care' },
      { package_code: 'IN002', package_name: 'Enteric Fever / Typhoid with Sepsis Protocol' },
      { package_code: 'IN003', package_name: 'Severe Leptospirosis with Renal Involvement' },
    ],
  },
  'Interventional Neuroradiology': {
    specialty_code: 'INR',
    procedures: [
      { package_code: 'NR001', package_name: 'Digital Subtraction Angiography (Brain DSA)' },
      { package_code: 'NR002', package_name: 'Mechanical Thrombectomy in Acute Ischemic Stroke' },
      { package_code: 'NR003', package_name: 'Intracranial Aneurysm Coiling / Flow Diverter' },
    ],
  },
  'Medical Oncology': {
    specialty_code: 'ONCM',
    procedures: [
      { package_code: 'MO001', package_name: 'Chemotherapy Daycare Infusion (Targeted / Standard Protocol)' },
      { package_code: 'MO002', package_name: 'Bone Marrow Aspiration & Biopsy' },
      { package_code: 'MO003', package_name: 'Immunotherapy Infusion for Advanced Malignancy' },
    ],
  },
  'Neurology': {
    specialty_code: 'NEUR',
    procedures: [
      { package_code: 'NE001', package_name: 'Acute Ischemic Stroke Thrombolysis (IV r-tPA)' },
      { package_code: 'NE002', package_name: 'Refractory Status Epilepticus ICU Management' },
      { package_code: 'NE003', package_name: 'Guillain-Barré Syndrome (GBS) / Myasthenia Crisis IVIG' },
    ],
  },
  'Neurosurgery': {
    specialty_code: 'NSUR',
    procedures: [
      { package_code: 'NS001', package_name: 'Emergency Craniotomy for Intracranial Hematoma (EDH / SDH)' },
      { package_code: 'NS002', package_name: 'Brain Tumor Excision (Microsurgical)' },
      { package_code: 'NS003', package_name: 'Ventriculoperitoneal (VP) Shunt for Hydrocephalus' },
      { package_code: 'NS004', package_name: 'Spinal Decompression & Lumbar / Cervical Fixation' },
    ],
  },
  'Surgical Oncology': {
    specialty_code: 'ONCS',
    procedures: [
      { package_code: 'SO001', package_name: 'Modified Radical Mastectomy (MRM Breast Cancer)' },
      { package_code: 'SO002', package_name: 'Oral Cavity Cancer Resection with Neck Dissection' },
      { package_code: 'SO003', package_name: 'Gastrointestinal Malignancy Resection & Anastomosis' },
    ],
  },
  'Gynecology & Obstetrics': {
    specialty_code: 'GYN',
    procedures: [
      { package_code: 'GO001', package_name: 'Lower Segment Cesarean Section (LSCS Delivery)' },
      { package_code: 'GO002', package_name: 'Normal Vaginal Delivery with Episiotomy' },
      { package_code: 'GO003', package_name: 'Total Abdominal / Vaginal / Laparoscopic Hysterectomy' },
      { package_code: 'GO004', package_name: 'Ectopic Pregnancy Emergency Salpingectomy' },
    ],
  },
  'Pediatrics': {
    specialty_code: 'PED',
    procedures: [
      { package_code: 'PD001', package_name: 'Neonatal Respiratory Distress / Severe Sepsis in NICU' },
      { package_code: 'PD002', package_name: 'Severe Pediatric Pneumonia with Oxygen Support' },
      { package_code: 'PD003', package_name: 'Phototherapy & Exchange Transfusion for Neonatal Jaundice' },
    ],
  },
  'Pediatric Surgery': {
    specialty_code: 'PSUR',
    procedures: [
      { package_code: 'PS001', package_name: 'Congenital Herniotomy / Hydrocele Repair in Child' },
      { package_code: 'PS002', package_name: 'Tracheoesophageal Fistula (TEF) / Atresia Correction' },
      { package_code: 'PS003', package_name: 'Intussusception Reduction / Anorectal Malformation Correction' },
    ],
  },
  'Orthopedics': {
    specialty_code: 'ORTH',
    procedures: [
      { package_code: 'OR001', package_name: 'Open Reduction & Internal Fixation (ORIF Femur/Tibia/Humerus)' },
      { package_code: 'OR002', package_name: 'Total Knee Replacement (TKR Unilateral/Bilateral)' },
      { package_code: 'OR003', package_name: 'Total Hip Replacement (THR Bipolar / Total)' },
      { package_code: 'OR004', package_name: 'Arthroscopic Ligament Reconstruction (ACL / PCL)' },
    ],
  },
  'Nephrology & Dialysis': {
    specialty_code: 'NEPH',
    procedures: [
      { package_code: 'NP001', package_name: 'Hemodialysis (Single / Monthly Sessional Package)' },
      { package_code: 'NP002', package_name: 'AV Fistula Construction for Vascular Access' },
      { package_code: 'NP003', package_name: 'Acute Kidney Injury (AKI) ICU Renal Replacement Protocol' },
    ],
  },
  'Urology': {
    specialty_code: 'UROL',
    procedures: [
      { package_code: 'UR001', package_name: 'URSL (Ureteroscopic Laser Lithotripsy for Kidney/Ureter Stone)' },
      { package_code: 'UR002', package_name: 'PCNL (Percutaneous Nephrolithotomy)' },
      { package_code: 'UR003', package_name: 'TURP (Transurethral Resection of Prostate)' },
    ],
  },
  'Pulmonology (Chest)': {
    specialty_code: 'PULM',
    procedures: [
      { package_code: 'PL001', package_name: 'Diagnostic & Therapeutic Fiberoptic Bronchoscopy' },
      { package_code: 'PL002', package_name: 'Intercostal Drainage (ICD) Tube Insertion for Pneumothorax/Empyema' },
      { package_code: 'PL003', package_name: 'Severe Acute COPD Exacerbation with BiPAP Support' },
    ],
  },
  'Gastroenterology': {
    specialty_code: 'GAST',
    procedures: [
      { package_code: 'GE001', package_name: 'Upper GI Endoscopy & Endoscopic Variceal Ligation (EVL Banding)' },
      { package_code: 'GE002', package_name: 'ERCP (Endoscopic Retrograde Cholangiopancreatography) with Stenting' },
      { package_code: 'GE003', package_name: 'Colonoscopy with Polypectomy / Biopsy' },
    ],
  },
  'Ophthalmology (Eye)': {
    specialty_code: 'OPHT',
    procedures: [
      { package_code: 'EY001', package_name: 'Phacoemulsification with Foldable Intraocular Lens (IOL Cataract)' },
      { package_code: 'EY002', package_name: 'Trabeculectomy for Glaucoma' },
      { package_code: 'EY003', package_name: 'Pars Plana Vitrectomy for Retinal Detachment' },
    ],
  },
  'ENT (Ear, Nose, Throat)': {
    specialty_code: 'ENT',
    procedures: [
      { package_code: 'ET001', package_name: 'Tympanoplasty / Mastoidectomy for CSOM' },
      { package_code: 'ET002', package_name: 'Functional Endoscopic Sinus Surgery (FESS)' },
      { package_code: 'ET003', package_name: 'Tonsillectomy / Adenoidectomy' },
    ],
  },
  'Dermatology': {
    specialty_code: 'DERM',
    procedures: [
      { package_code: 'DM001', package_name: 'Severe Pemphigus / Stevens-Johnson Syndrome Inpatient Care' },
      { package_code: 'DM002', package_name: 'Skin Biopsy & Excision of Cutaneous Lesion' },
    ],
  },
  'Mental Diseases / Psychiatry': {
    specialty_code: 'PSYC',
    procedures: [
      { package_code: 'PY001', package_name: 'Acute Psychosis & Severe Depression Inpatient Stabilization' },
      { package_code: 'PY002', package_name: 'Substance De-addiction & Withdrawal Protocol' },
    ],
  },
  'Endocrinology & Diabetes': {
    specialty_code: 'ENDO',
    procedures: [
      { package_code: 'ED001', package_name: 'Diabetic Foot Ulcer Debridement & Limb Salvage Protocol' },
      { package_code: 'ED002', package_name: 'Severe Thyroid Crisis / Adrenal Insufficiency Management' },
    ],
  },
  'Radiology & Imaging': {
    specialty_code: 'RAD',
    procedures: [
      { package_code: 'RD001', package_name: 'CT Guided Fine Needle Aspiration / Core Biopsy' },
      { package_code: 'RD002', package_name: 'USG Guided Drainage / Pigtail Catheter Insertion' },
    ],
  },
};

export const HospitalFacilitySurveyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const getSectionTitle = (id: number) => {
    switch (id) {
      case 1: return 'Hospital Info';
      case 2: return 'Capacity';
      case 3: return 'Specialities';
      case 4: return 'Packages';
      case 5: return 'Doctors';
      case 6: return 'Resource Count';
      default: return '';
    }
  };

  const [activeStep, setActiveStep] = useState<number>(route.params?.initialStep || 1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [profile, setProfile] = useState<HospitalFacilityProfile>(EMPTY_HOSPITAL_SURVEY_PROFILE);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const stepperScrollRef = useRef<any>(null);
  const formScrollRef = useRef<any>(null);

  // Auto-scroll form to top whenever step changes
  useEffect(() => {
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeStep]);

  // Step 1: Hospital Type modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // Step 3: Specialities Search
  const [specialitySearch, setSpecialitySearch] = useState('');

  // Step 4: Packages State
  const [packagesDataMap, setPackagesDataMap] = useState<Record<string, any>>(FALLBACK_PACKAGES_MAP);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [openSpecialties, setOpenSpecialties] = useState<Record<string, boolean>>({});
  const [specialtySearchMap, setSpecialtySearchMap] = useState<Record<string, string>>({});

  // Step 5: Doctors Roster & Modals
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<HospitalDoctor | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [selectedDocSpecialities, setSelectedDocSpecialities] = useState<string[]>(['General Medicine']);
  const [isDocSpecDropdownOpen, setIsDocSpecDropdownOpen] = useState(false);
  const [docModalSpecSearch, setDocModalSpecSearch] = useState('');
  const [isDocDistrictModalOpen, setIsDocDistrictModalOpen] = useState(false);
  const [docFormData, setDocFormData] = useState<HospitalDoctor>({
    id: '',
    name: '',
    speciality: 'General Medicine',
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
    city: 'Pune',
    district: 'Pune',
    taluka: '',
    pincode: '',
    nearestLandmark: '',
    status: 'Active',
  });

  const getDraftKey = (hospId: string) => {
    const userId = user?.id || (user as any)?._id || user?.phoneNumber || 'guest';
    return sevakDraftService.keys.hospitalSurvey(userId, hospId);
  };

  // Selected Speciality Names
  const selectedSpecialityNames = useMemo(() => {
    const ids = profile.selectedSpecialities || profile.specializations || [];
    return ALL_26_SPECIALITIES.filter((s) => ids.includes(s.id) || ids.includes(s.name)).map((s) => s.name);
  }, [profile.selectedSpecialities, profile.specializations]);

  // Load packages master from backend API
  useEffect(() => {
    const loadPackagesMaster = async () => {
      try {
        setPackagesLoading(true);
        const res = await apiClient.get('/packages/by-specialty');
        const map = res?.data || res;
        if (map && typeof map === 'object' && Object.keys(map).length > 0) {
          setPackagesDataMap(map);
        }
      } catch {
        // Fallback to FALLBACK_PACKAGES_MAP
        setPackagesDataMap(FALLBACK_PACKAGES_MAP);
      } finally {
        setPackagesLoading(false);
      }
    };
    loadPackagesMaster();
  }, []);

  // Selected specialities packages grouped
  const selectedPackagesGrouped = useMemo(() => {
    const result: { specialty: string; specialty_code: string; packages: any[]; totalCount: number }[] = [];
    const specialtyKeys = Object.keys(packagesDataMap);
    if (specialtyKeys.length === 0) return result;

    specialtyKeys.forEach((specKey) => {
      const isSpecSelected = selectedSpecialityNames.some(
        (name) => name.toLowerCase() === specKey.toLowerCase()
      );
      if (!isSpecSelected) return;

      const specGroup = packagesDataMap[specKey] || {};
      const rawList = specGroup.procedures || specGroup.packages || [];
      const seenCodes = new Set<string>();
      const uniquePackages: any[] = [];

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
        });
      }

      if (uniquePackages.length > 0) {
        result.push({
          specialty: specKey,
          specialty_code: specGroup.specialty_code || 'SPEC',
          packages: uniquePackages,
          totalCount: uniquePackages.length,
        });
      }
    });

    return result;
  }, [packagesDataMap, selectedSpecialityNames]);

  // Validation helper
  const isSectionCompleted = useCallback((sectionId: number, prof: HospitalFacilityProfile): boolean => {
    switch (sectionId) {
      case 1: {
        const hasName = !!prof.hospitalName?.trim();
        const hasType = !!prof.hospitalType?.trim();
        const hasAddress = !!prof.fullAddress?.trim() || !!prof.streetAddress?.trim();
        const hasCity = !!prof.city?.trim();
        const hasDistrict = !!prof.district?.trim();
        const hasTaluka = !!prof.taluka?.trim();
        const hasPincode = !!prof.pincode?.trim() && prof.pincode.trim().length === 6;
        const hasHelpline = !!prof.contactHelpline?.trim();
        return (
          hasName &&
          hasType &&
          hasAddress &&
          hasCity &&
          hasDistrict &&
          hasTaluka &&
          hasPincode &&
          hasHelpline
        );
      }
      case 2: {
        const ipd = prof.capacity?.ipd;
        if (!ipd) return false;
        return (
          Boolean(ipd.noOfWards !== '' && ipd.noOfWards !== undefined && ipd.noOfWards !== null) &&
          Boolean(ipd.generalBeds !== '' && ipd.generalBeds !== undefined && ipd.generalBeds !== null) &&
          Boolean(ipd.icuUnits !== '' && ipd.icuUnits !== undefined && ipd.icuUnits !== null)
        );
      }
      case 3: {
        const specs = prof.selectedSpecialities || prof.specializations || [];
        return Array.isArray(specs) && specs.length > 0;
      }
      case 4: {
        const pkgs = prof.selectedPackages || [];
        return Array.isArray(pkgs) && pkgs.length > 0;
      }
      case 5: {
        const docs = prof.doctorsList || [];
        return Array.isArray(docs) && docs.length > 0;
      }
      case 6: {
        const res = prof.resourceCount;
        return Boolean(res?.nursingStaff !== undefined && String(res.nursingStaff).trim() !== '');
      }
      default:
        return false;
    }
  }, []);

  const isSectionPartiallyFilled = useCallback((sectionId: number, prof: HospitalFacilityProfile): boolean => {
    if (isSectionCompleted(sectionId, prof)) return false;

    switch (sectionId) {
      case 1: {
        return Boolean(
          prof.hospitalName?.trim() ||
          prof.hospitalType?.trim() ||
          prof.streetAddress?.trim() ||
          prof.city?.trim() ||
          prof.district?.trim() ||
          prof.taluka?.trim() ||
          prof.pincode?.trim() ||
          prof.contactHelpline?.trim()
        );
      }
      case 2: {
        const cap = prof.capacity;
        if (!cap) return false;
        const hasIpd = Boolean(cap.ipd?.noOfWards || cap.ipd?.generalBeds || cap.ipd?.icuUnits);
        const hasDiag = Object.values(cap.diagnosis || {}).some((d) => d?.available === 'Yes');
        const hasOp = Boolean(cap.operative?.operationTheatres || cap.operative?.recoveryBeds || cap.operative?.dialysisUnits);
        const hasEm = Boolean(cap.emergency?.emergencyBeds || cap.emergency?.ambulances);
        const hasBlood = Object.values(cap.bloodBank?.bloodGroups || {}).some(Boolean);
        return hasIpd || hasDiag || hasOp || hasEm || hasBlood;
      }
      case 3: {
        const specs = prof.selectedSpecialities || prof.specializations || [];
        return specs.length > 0;
      }
      case 4: {
        return (prof.selectedPackages?.length || 0) > 0;
      }
      case 5: {
        return (prof.doctorsList?.length || 0) > 0;
      }
      case 6: {
        const res = prof.resourceCount;
        return Boolean(res?.totalDoctors || res?.nursingStaff || res?.paramedicalStaff || res?.supportStaff);
      }
      default:
        return false;
    }
  }, [isSectionCompleted]);

  // Persist draft helper
  const persistSurveyDraft = async (
    updatedProfile: HospitalFacilityProfile,
    step?: number,
    updatedCompleted?: number[]
  ) => {
    try {
      const hospId = updatedProfile.assignedHospitalId || 'HOSP-PUN-042';
      const key = getDraftKey(hospId);
      await sevakDraftService.saveDraft(key, {
        profile: updatedProfile,
        activeStep: step ?? activeStep,
        completedSections: updatedCompleted ?? completedSections,
        savedAt: new Date().toISOString(),
      });
      setHasDraft(true);
    } catch (e) {
      console.warn('Failed to auto-save survey draft', e);
    }
  };

  // Mount initialization
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const serverProfile = await sevakHospitalService.getHospitalProfile();
        const hospId = serverProfile.assignedHospitalId || 'HOSP-PUN-042';
        const draftKey = getDraftKey(hospId);
        const savedDraft = await sevakDraftService.loadDraft<{
          profile: HospitalFacilityProfile;
          activeStep: number;
          completedSections?: number[];
        }>(draftKey);

        const serverCompleted = getCompletedSurveySections(serverProfile);
        const isServerTrulyComplete = Boolean(
          serverProfile.currentStatus?.verifiedBySevak === true || serverCompleted.length >= 6
        );

        if (isServerTrulyComplete) {
          setProfile(serverProfile);
          setIsSubmitted(true);
          setCompletedSections([1, 2, 3, 4, 5, 6]);
        } else if (savedDraft && savedDraft.profile) {
          setHasDraft(true);
          setProfile({
            ...savedDraft.profile,
            capacity: savedDraft.profile.capacity || DEFAULT_CAPACITY_DATA,
            selectedSpecialities: savedDraft.profile.selectedSpecialities || savedDraft.profile.specializations || [],
            selectedPackages: savedDraft.profile.selectedPackages || [],
            doctorsList: savedDraft.profile.doctorsList || [],
            resourceCount: savedDraft.profile.resourceCount || { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' },
          });
          const draftCompleted = Array.isArray(savedDraft.completedSections)
            ? savedDraft.completedSections
            : getCompletedSurveySections(savedDraft.profile);
          setCompletedSections(draftCompleted);
          const nextStep = savedDraft.activeStep || ([1, 2, 3, 4, 5, 6].find((s) => !draftCompleted.includes(s)) || 1);
          setActiveStep(nextStep);
          setIsSubmitted(false);
        } else {
          setProfile({
            ...serverProfile,
            capacity: serverProfile.capacity || DEFAULT_CAPACITY_DATA,
            selectedSpecialities: serverProfile.selectedSpecialities || serverProfile.specializations || [],
            selectedPackages: serverProfile.selectedPackages || [],
            doctorsList: serverProfile.doctorsList || [],
            resourceCount: serverProfile.resourceCount || { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' },
          });
          setCompletedSections(serverCompleted);
          const nextStep = [1, 2, 3, 4, 5, 6].find((s) => !serverCompleted.includes(s)) || 1;
          setActiveStep(nextStep);
          setIsSubmitted(false);
        }
      } catch (e) {
        console.warn('Error during survey load', e);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [t]);

  // Stepper horizontal auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stepperScrollRef.current) {
        const approxStepWidth = 90;
        const targetOffset = Math.max(0, (activeStep - 1) * approxStepWidth - 60);
        stepperScrollRef.current.scrollTo({ x: targetOffset, animated: true });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [activeStep]);

  // Update profile field and persist
  const updateProfile = (updater: (prev: HospitalFacilityProfile) => HospitalFacilityProfile) => {
    setProfile((prev) => {
      const updated = updater(prev);
      persistSurveyDraft(updated, activeStep);
      return updated;
    });
  };

  // Auto-fill from assigned hospital
  const handleAutoFillHospital = () => {
    const assigned = (user as any)?.assignedHospital || {};
    const officialName = assigned.name || assigned.hospital_name || assigned.hospitalName || profile.hospitalName || 'Sahyadri Super Specialty Hospital';
    const officialType = assigned.hospital_type || assigned.type || assigned.hospitalType || 'Private Multi-Specialty';
    const officialAddress = assigned.address || assigned.address_line || assigned.streetAddress || 'Plot 10, Karve Road, Deccan Gymkhana';
    const officialCity = assigned.city || profile.city || 'Pune';
    const officialDistrict = assigned.district || profile.district || 'Pune';
    const officialTaluka = assigned.taluka || assigned.area || assigned.areaTaluka || 'Haveli';
    const officialPincode = assigned.pincode || profile.pincode || '411004';
    const officialLandmark = assigned.nearest_landmark || assigned.landmark || 'Near Deccan Bus Stop (300m)';
    const officialContact = assigned.contact_number || assigned.contact || assigned.phone || '+91 20 2553 4000';

    updateProfile((prev) => ({
      ...prev,
      hospitalName: officialName,
      hospitalType: officialType,
      streetAddress: officialAddress,
      fullAddress: officialAddress,
      city: officialCity,
      district: officialDistrict,
      taluka: officialTaluka,
      pincode: officialPincode,
      landmark: officialLandmark,
      contactHelpline: officialContact,
    }));

    Alert.alert('✨ Auto-filled', `Section 1 details populated with official records for ${officialName}.`);
  };

  // Reset Section
  const handleResetSection = (secId: number) => {
    Alert.alert(
      'Reset Section',
      `Are you sure you want to reset answers for Section ${secId}?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: 'Reset Section',
          style: 'destructive',
          onPress: () => {
            const nextCompleted = completedSections.filter((id) => id !== secId);
            setCompletedSections(nextCompleted);
            updateProfile((prev) => {
              const fresh = { ...prev };
              switch (secId) {
                case 1:
                  fresh.hospitalName = '';
                  fresh.hospitalType = '';
                  fresh.streetAddress = '';
                  fresh.fullAddress = '';
                  fresh.city = '';
                  fresh.district = '';
                  fresh.taluka = '';
                  fresh.pincode = '';
                  fresh.landmark = '';
                  fresh.contactHelpline = '';
                  break;
                case 2:
                  fresh.capacity = JSON.parse(JSON.stringify(DEFAULT_CAPACITY_DATA));
                  break;
                case 3:
                  fresh.selectedSpecialities = [];
                  fresh.specializations = [];
                  break;
                case 4:
                  fresh.selectedPackages = [];
                  break;
                case 5:
                  fresh.doctorsList = [];
                  break;
                case 6:
                  fresh.resourceCount = {
                    totalDoctors: '',
                    nursingStaff: '',
                    paramedicalStaff: '',
                    supportStaff: '',
                  };
                  break;
              }
              persistSurveyDraft(fresh, activeStep, nextCompleted);
              return fresh;
            });
          },
        },
      ]
    );
  };

  // Reset All
  const handleResetAll = () => {
    Alert.alert(
      'Reset Entire Survey',
      'Are you sure you want to clear all survey responses and start completely fresh?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Responses',
          style: 'destructive',
          onPress: async () => {
            const hospId = profile.assignedHospitalId || 'HOSP-PUN-042';
            await sevakDraftService.clearDraft(getDraftKey(hospId));
            setHasDraft(false);
            setCompletedSections([]);
            setActiveStep(1);
            setProfile({
              ...EMPTY_HOSPITAL_SURVEY_PROFILE,
              capacity: JSON.parse(JSON.stringify(DEFAULT_CAPACITY_DATA)),
              selectedSpecialities: [],
              selectedPackages: [],
              doctorsList: [],
              resourceCount: { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' },
            });
          },
        },
      ]
    );
  };

  const getNextButtonLabel = (step: number) => {
    switch (step) {
      case 1: return 'Next: Hospital Capacity';
      case 2: return 'Next: Specialities';
      case 3: return 'Next: Packages';
      case 4: return 'Next: Doctors';
      case 5: return 'Next: Resource Count';
      case 6: return 'Review Complete Summary';
      default: return 'Next Section';
    }
  };

  // Save and Next
  const handleSaveAndNext = async () => {
    try {
      setSaving(true);
      const isFullyDone = isSectionCompleted(activeStep, profile);

      if (!isFullyDone) {
        Alert.alert(
          'Required Fields Incomplete',
          `Please fill in all mandatory fields for Section ${activeStep} before continuing. Your progress has been saved as draft.`
        );
        const updatedCompleted = completedSections.filter((id) => id !== activeStep);
        setCompletedSections(updatedCompleted);
        await persistSurveyDraft(profile, activeStep, updatedCompleted);
        return;
      }

      const nextCompleted = completedSections.includes(activeStep)
        ? completedSections
        : [...completedSections, activeStep];
      setCompletedSections(nextCompleted);

      await persistSurveyDraft(profile, activeStep, nextCompleted);
      await sevakHospitalService.saveHospitalProfile(profile);

      if (activeStep < 6) {
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        await persistSurveyDraft(profile, nextStep, nextCompleted);
      } else {
        // Step 6 completed -> Show Summary view
        setIsSubmitted(true);
      }
    } catch {
      Alert.alert('Error', 'Unable to save survey progress at this time.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = () => {
    if (activeStep > 1) {
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
      persistSurveyDraft(profile, prevStep);
    }
  };

  const handleStartEditSection = (secId: number) => {
    setActiveStep(secId);
    setEditingSectionId(secId);
    setIsSubmitted(false);
  };

  const handleCancelSectionEdit = () => {
    setEditingSectionId(null);
    setIsSubmitted(true);
  };

  const handleSmartBack = useCallback((): boolean => {
    // 1. If any modal is open, dismiss it first
    if (showFinalModal) {
      setShowFinalModal(false);
      return true;
    }
    if (doctorModalOpen) {
      setDoctorModalOpen(false);
      return true;
    }
    if (viewingDoc) {
      setViewingDoc(null);
      return true;
    }
    if (isTypeModalOpen) {
      setIsTypeModalOpen(false);
      return true;
    }
    if (isDocDistrictModalOpen) {
      setIsDocDistrictModalOpen(false);
      return true;
    }
    if (isDocSpecDropdownOpen) {
      setIsDocSpecDropdownOpen(false);
      return true;
    }

    // 2. If editing a single section from summary view, return to summary view
    if (editingSectionId !== null) {
      handleCancelSectionEdit();
      return true;
    }

    // 3. If in summary/review view, return to Step 6 of the survey
    if (isSubmitted) {
      setIsSubmitted(false);
      setActiveStep(6);
      return true;
    }

    // 4. If on Step 2..6, travel backwards step by step (e.g. 5 -> 4 -> 3 -> 2 -> 1)
    if (activeStep > 1) {
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
      persistSurveyDraft(profile, prevStep);
      return true;
    }

    // 5. If on Step 1, navigate back to dashboard
    navigation.goBack();
    return true;
  }, [
    showFinalModal,
    doctorModalOpen,
    viewingDoc,
    isTypeModalOpen,
    isDocDistrictModalOpen,
    isDocSpecDropdownOpen,
    editingSectionId,
    isSubmitted,
    activeStep,
    profile,
    navigation,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleSmartBack();
    });

    return () => subscription.remove();
  }, [handleSmartBack]);

  const handleUpdateSingleSection = async () => {
    if (!editingSectionId) return;
    try {
      setSaving(true);
      const isFullyDone = isSectionCompleted(editingSectionId, profile);
      if (!isFullyDone) {
        Alert.alert(
          'Required Fields Incomplete',
          `Please fill in all mandatory fields for Section ${editingSectionId} before updating.`
        );
        return;
      }

      const nextCompleted = completedSections.includes(editingSectionId)
        ? completedSections
        : [...completedSections, editingSectionId];
      setCompletedSections(nextCompleted);

      await persistSurveyDraft(profile, editingSectionId, nextCompleted);
      await sevakHospitalService.saveHospitalProfile(profile);

      Alert.alert(
        'Section Updated',
        `Section ${editingSectionId} (${getSectionTitle(editingSectionId)}) details have been updated successfully!`,
        [
          {
            text: 'View Summary',
            onPress: () => {
              setEditingSectionId(null);
              setIsSubmitted(true);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Unable to update section details at this time.');
    } finally {
      setSaving(false);
    }
  };

  // Final Submit Action
  const handleFinalSubmit = async () => {
    try {
      setSaving(true);
      const timeStr = new Date().toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const submittedProfile: HospitalFacilityProfile = {
        ...profile,
        currentStatus: {
          ...profile.currentStatus,
          verifiedBySevak: true,
          lastUpdated: timeStr,
        },
      };

      await sevakHospitalService.saveHospitalProfile(submittedProfile);
      await sevakDraftService.clearDraft(
        getDraftKey(profile.assignedHospitalId || 'HOSP-PUN-042')
      );
      setHasDraft(false);
      setProfile(submittedProfile);
      setCompletedSections([1, 2, 3, 4, 5, 6]);
      setShowFinalModal(false);
      setIsSubmitted(true);

      Alert.alert(
        'Survey Submitted Successfully 🎉',
        'Hospital facility infrastructure assessment has been verified & submitted to the Health Administration.'
      );
    } catch {
      Alert.alert('Error', 'Unable to submit survey at this time.');
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Toggle Speciality
  const handleToggleSpeciality = (specId: string) => {
    updateProfile((prev) => {
      const current = prev.selectedSpecialities || prev.specializations || [];
      const exists = current.includes(specId);
      const next = exists ? current.filter((s) => s !== specId) : [...current, specId];
      return {
        ...prev,
        selectedSpecialities: next,
        specializations: next,
      };
    });
  };

  // Step 3: Filtered Specialities
  const filteredSpecialities = useMemo(() => {
    const q = specialitySearch.toLowerCase().trim();
    if (!q) return ALL_26_SPECIALITIES;
    return ALL_26_SPECIALITIES.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q))
    );
  }, [specialitySearch]);

  // Step 4: Toggle Package
  const handleTogglePackage = (pkgCodeOrId: string) => {
    updateProfile((prev) => {
      const current = prev.selectedPackages || [];
      const exists = current.includes(pkgCodeOrId);
      const next = exists ? current.filter((p) => p !== pkgCodeOrId) : [...current, pkgCodeOrId];
      return { ...prev, selectedPackages: next };
    });
  };

  // Step 4: Select All for a Specialty
  const handleSelectAllSpecialtyPackages = (packagesList: any[]) => {
    const ids = packagesList.map((p) => p.package_code || p.id);
    updateProfile((prev) => {
      const current = prev.selectedPackages || [];
      const allSelected = ids.every((id) => current.includes(id));
      const next = allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]));
      return { ...prev, selectedPackages: next };
    });
  };

  // Step 4: Select All for My Specialities
  const handleSelectAllForSelectedSpecialities = () => {
    const idsToSelect: string[] = [];
    selectedPackagesGrouped.forEach((group) => {
      group.packages.forEach((p) => {
        if (p.package_code) idsToSelect.push(p.package_code);
      });
    });
    updateProfile((prev) => ({
      ...prev,
      selectedPackages: Array.from(new Set([...(prev.selectedPackages || []), ...idsToSelect])),
    }));
  };

  const isSpecialtyOpen = useCallback((specName: string, idx: number) => {
    if (openSpecialties[specName] !== undefined) {
      return Boolean(openSpecialties[specName]);
    }
    return idx === 0;
  }, [openSpecialties]);

  const handleToggleSpecialtyOpen = useCallback((specName: string, idx: number) => {
    const current = isSpecialtyOpen(specName, idx);
    setOpenSpecialties((prev) => ({
      ...prev,
      [specName]: !current,
    }));
  }, [isSpecialtyOpen]);

  // Step 5: Doctor Handlers
  const handleOpenAddDoctor = () => {
    setEditingDocId(null);
    setDocFormData({
      id: '',
      name: '',
      speciality: 'General Medicine',
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
      city: profile.city || 'Pune',
      district: profile.district || 'Pune',
      taluka: profile.taluka || '',
      pincode: profile.pincode || '',
      nearestLandmark: '',
      status: 'Active',
    });
    setSelectedDocSpecialities(['General Medicine']);
    setIsDocSpecDropdownOpen(false);
    setDocModalSpecSearch('');
    setDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (doc: HospitalDoctor) => {
    setEditingDocId(doc.id);
    const existingSpecs = (doc.speciality || '').split(',').map((s) => s.trim()).filter(Boolean);
    setSelectedDocSpecialities(existingSpecs.length > 0 ? existingSpecs : ['General Medicine']);

    setDocFormData({
      ...doc,
      workingDays: Array.isArray(doc.workingDays) ? doc.workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    });
    setIsDocSpecDropdownOpen(false);
    setDocModalSpecSearch('');
    setDoctorModalOpen(true);
  };

  const handleToggleDocSpeciality = (specName: string) => {
    setSelectedDocSpecialities((prev) => {
      const exists = prev.includes(specName);
      return exists ? prev.filter((s) => s !== specName) : [...prev, specName];
    });
  };

  const handleToggleWorkingDay = (day: string) => {
    setDocFormData((prev) => {
      const days = prev.workingDays || [];
      const exists = days.includes(day);
      const next = exists ? days.filter((d) => d !== day) : [...days, day];
      return { ...prev, workingDays: next };
    });
  };

  const handleAppendQualification = (qual: string) => {
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

  const handleSaveDoctor = () => {
    if (!docFormData.name.trim()) {
      Alert.alert('Doctor Name Required', 'Please enter the doctor full name.');
      return;
    }
    if (!docFormData.mobile.trim()) {
      Alert.alert('Phone Number Required', 'Please enter primary contact number.');
      return;
    }
    if (!docFormData.qualification.trim()) {
      Alert.alert('Qualification Required', 'Please enter doctor qualification degrees.');
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

    const doctorDataToSave: HospitalDoctor = {
      ...docFormData,
      id: editingDocId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speciality: finalSpeciality,
      availability: finalAvailability,
      status: docFormData.status || 'Active',
    };

    updateProfile((prev) => {
      const existing = prev.doctorsList || [];
      const updated = editingDocId
        ? existing.map((d) => (d.id === editingDocId ? doctorDataToSave : d))
        : [...existing, doctorDataToSave];
      return { ...prev, doctorsList: updated };
    });

    setDoctorModalOpen(false);
  };

  const handleDeleteDoctor = (docId: string) => {
    Alert.alert(
      'Remove Doctor',
      'Are you sure you want to remove this doctor from the hospital roster?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateProfile((prev) => ({
              ...prev,
              doctorsList: (prev.doctorsList || []).filter((d) => d.id !== docId),
            }));
          },
        },
      ]
    );
  };

  const handleToggleDoctorStatus = (docId: string) => {
    updateProfile((prev) => ({
      ...prev,
      doctorsList: (prev.doctorsList || []).map((d) =>
        d.id === docId ? { ...d, status: d.status === 'Inactive' ? 'Active' : 'Inactive' } : d
      ),
    }));
  };

  // Step 6: Total Workforce Sum
  const totalStaffCount = useMemo(() => {
    const res = profile.resourceCount;
    const d = parseInt(String(res?.totalDoctors || 0), 10) || (profile.doctorsList?.length || 0);
    const n = parseInt(String(res?.nursingStaff || 0), 10) || 0;
    const p = parseInt(String(res?.paramedicalStaff || 0), 10) || 0;
    const s = parseInt(String(res?.supportStaff || 0), 10) || 0;
    return d + n + p + s;
  }, [profile.resourceCount, profile.doctorsList]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.sevak.primary} />
        <Text style={styles.loadingText}>Loading Hospital Facility Details...</Text>
      </View>
    );
  }

  // =========================================================================
  // REVIEW & SUMMARY VIEW (6 SECTIONS)
  // =========================================================================
  if (isSubmitted && !editingSectionId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSmartBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Facility Profile Summary</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {profile.hospitalName || 'Hospital Infrastructure Overview'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.summaryScrollBody} showsVerticalScrollIndicator={false}>
          {/* Verified Success Banner */}
          <View style={styles.verifiedSuccessBanner}>
            <View style={styles.verifiedSuccessIconWrap}>
              <Ionicons name="shield-checkmark" size={28} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedSuccessTitle}>
                {profile.currentStatus?.verifiedBySevak ? 'OFFICIALLY SUBMITTED' : 'VERIFIED DRAFT READY'}
              </Text>
              <Text style={styles.verifiedSuccessSub}>
                All 6 infrastructure dimensions verified for {profile.hospitalName}.
              </Text>
              {profile.currentStatus?.lastUpdated ? (
                <Text style={styles.verifiedSuccessTime}>
                  Last Updated: {profile.currentStatus.lastUpdated}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Section 1 Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="business" size={18} color="#0284C7" />
              <Text style={styles.summaryCardTitle}>1. Hospital Information</Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hospital Name:</Text>
                <Text style={styles.summaryValue}>{profile.hospitalName || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hospital Type:</Text>
                <Text style={styles.summaryValue}>{profile.hospitalType || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Full Address:</Text>
                <Text style={styles.summaryValue}>{profile.streetAddress || profile.fullAddress || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue}>
                  {[profile.city, profile.district, profile.taluka].filter(Boolean).join(', ')} {profile.pincode ? `(${profile.pincode})` : ''}
                </Text>
              </View>
              {profile.landmark ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Landmark:</Text>
                  <Text style={styles.summaryValue}>{profile.landmark}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Contact Helpline:</Text>
                <Text style={styles.summaryValue}>{profile.contactHelpline || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Section 2 Summary Card: Capacity */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="bed" size={18} color="#6366F1" />
              <Text style={styles.summaryCardTitle}>2. Hospital Capacity</Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(2)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              <Text style={[styles.fieldLabel, { fontSize: 12, color: '#0284C7', marginBottom: 6 }]}>
                IPD (In-Patient Department) Capacity:
              </Text>
              <View style={styles.summaryGridRow}>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricVal}>{profile.capacity?.ipd?.noOfWards || 0}</Text>
                  <Text style={styles.summaryMetricLbl}>Wards</Text>
                </View>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricVal}>{profile.capacity?.ipd?.generalBeds || 0}</Text>
                  <Text style={styles.summaryMetricLbl}>General Beds</Text>
                </View>
                <View style={styles.summaryMetricBox}>
                  <Text style={[styles.summaryMetricVal, { color: '#DC2626' }]}>{profile.capacity?.ipd?.icuUnits || 0}</Text>
                  <Text style={styles.summaryMetricLbl}>ICU Units</Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { fontSize: 12, color: '#059669', marginTop: 12, marginBottom: 6 }]}>
                Diagnostics & Operative Modalities:
              </Text>
              <View style={styles.summaryChipWrap}>
                {DIAGNOSTIC_MODALITIES.filter((d) => profile.capacity?.diagnosis?.[d.key]?.available === 'Yes').map((d) => (
                  <View key={d.key} style={styles.summaryChip}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.summaryChipText}>
                      {d.label} {profile.capacity?.diagnosis?.[d.key]?.count ? `(${profile.capacity.diagnosis[d.key]?.count} Units)` : ''}
                    </Text>
                  </View>
                ))}
                {OPERATIVE_FACILITIES.filter((op) => profile.capacity?.operative?.[`${op.key}Available`] || profile.capacity?.operative?.[op.key]).map((op) => (
                  <View key={op.key} style={styles.summaryChip}>
                    <Ionicons name="medkit" size={13} color="#7C3AED" />
                    <Text style={styles.summaryChipText}>
                      {op.label}: {profile.capacity?.operative?.[op.key] || 'Available'} {op.unit}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { fontSize: 12, color: '#DC2626', marginTop: 12, marginBottom: 6 }]}>
                Available Blood Groups:
              </Text>
              <View style={styles.summaryChipWrap}>
                {BLOOD_GROUPS.filter((bg) => profile.capacity?.bloodBank?.bloodGroups?.[bg]).map((bg) => (
                  <View key={bg} style={[styles.summaryChip, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                    <Ionicons name="water" size={13} color="#DC2626" />
                    <Text style={[styles.summaryChipText, { color: '#B91C1C', fontWeight: '800' }]}>{bg}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Section 3 Summary Card: Specialities */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="medkit" size={18} color="#059669" />
              <Text style={styles.summaryCardTitle}>
                3. Specialities ({(profile.selectedSpecialities || profile.specializations || []).length} Active)
              </Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(3)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryChipWrap}>
                {ALL_26_SPECIALITIES.filter((s) =>
                  (profile.selectedSpecialities || profile.specializations || []).includes(s.id) ||
                  (profile.selectedSpecialities || profile.specializations || []).includes(s.name)
                ).map((spec) => (
                  <View key={spec.id} style={styles.summaryChip}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.summaryChipText}>{spec.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Section 4 Summary Card: Packages */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="cube" size={18} color="#0D9488" />
              <Text style={styles.summaryCardTitle}>
                4. Scheme Packages ({(profile.selectedPackages || []).length} Selected)
              </Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(4)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              {(profile.selectedPackages || []).length > 0 ? (
                <View style={styles.summaryChipWrap}>
                  {(profile.selectedPackages || []).map((pkgCode) => (
                    <View key={pkgCode} style={[styles.summaryChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Text style={[styles.summaryChipText, { color: '#065F46', fontWeight: '700' }]}>
                        {pkgCode}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCustomSpecText}>No treatment packages selected.</Text>
              )}
            </View>
          </View>

          {/* Section 5 Summary Card: Doctors */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="people" size={18} color="#7C3AED" />
              <Text style={styles.summaryCardTitle}>
                5. Doctors ({(profile.doctorsList || []).length} Registered)
              </Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(5)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              {(profile.doctorsList || []).length > 0 ? (
                (profile.doctorsList || []).map((doc, idx) => (
                  <View key={doc.id || idx} style={styles.docSummaryCardItem}>
                    <View style={styles.docSummaryAvatar}>
                      <Ionicons name="person" size={16} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docSummaryName}>{doc.name}</Text>
                      <Text style={styles.docSummarySpec}>{doc.speciality}</Text>
                      <Text style={styles.docSummaryTiming}>{getDoctorDutyDays(doc)} • {doc.qualification}</Text>
                    </View>
                    <View style={[styles.statusPillBadge, doc.status !== 'Inactive' ? styles.statusPillBadgeYes : styles.statusPillBadgeNo]}>
                      <Text style={[styles.statusPillText, doc.status !== 'Inactive' ? styles.statusPillTextYes : styles.statusPillTextNo]}>
                        {doc.status !== 'Inactive' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyCustomSpecText}>No doctors registered yet.</Text>
              )}
            </View>
          </View>

          {/* Section 6 Summary Card: Resource Count */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="grid" size={18} color="#D97706" />
              <Text style={styles.summaryCardTitle}>
                6. Workforce & Resource Strength
              </Text>
              <TouchableOpacity
                style={styles.summaryEditSectionBtn}
                onPress={() => handleStartEditSection(6)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={13} color="#0284C7" />
                <Text style={styles.summaryEditSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryGridRow}>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricVal}>{profile.resourceCount?.totalDoctors || (profile.doctorsList?.length || 0)}</Text>
                  <Text style={styles.summaryMetricLbl}>Total Doctors</Text>
                </View>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricVal}>{profile.resourceCount?.nursingStaff || 0}</Text>
                  <Text style={styles.summaryMetricLbl}>Nurses</Text>
                </View>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricVal}>{profile.resourceCount?.paramedicalStaff || 0}</Text>
                  <Text style={styles.summaryMetricLbl}>Paramedical</Text>
                </View>
              </View>
              <View style={[styles.summaryRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#0F172A' }]}>Total Healthcare Workforce:</Text>
                <Text style={[styles.summaryValue, { color: '#059669', fontSize: 14, fontWeight: '800' }]}>
                  {totalStaffCount} Personnel
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons in Summary View */}
          <View style={styles.summaryActionsRow}>
            <TouchableOpacity
              style={styles.summaryEditBtn}
              onPress={() => {
                setIsSubmitted(false);
                setActiveStep(1);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#0284C7" />
              <Text style={styles.summaryEditBtnText}>Return to Questionnaire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.summaryBackBtn}
              onPress={() => setShowFinalModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.summaryBackBtnText}>Final Submit Survey</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Final Submission Modal */}
        <Modal visible={showFinalModal} transparent animationType="fade" onRequestClose={() => setShowFinalModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 360, alignItems: 'center', paddingVertical: 24 }]}>
              <View style={styles.finalModalIconWrap}>
                <Ionicons name="shield-checkmark" size={36} color="#16A34A" />
              </View>
              <Text style={styles.finalModalTitle}>Confirm Facility Submission</Text>
              <Text style={styles.finalModalDesc}>
                Are you sure you want to officially submit all 6 verified infrastructure sections for {profile.hospitalName || 'this hospital'}?
              </Text>
              <View style={styles.finalModalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowFinalModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleFinalSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.modalSubmitBtnText}>Confirm & Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // =========================================================================
  // QUESTIONNAIRE WIZARD (STEPS 1 TO 6)
  // =========================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleSmartBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {editingSectionId !== null
              ? `Edit Section ${editingSectionId}: ${getSectionTitle(editingSectionId)}`
              : 'Arogya Sevak Survey'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {profile.hospitalName || 'Hospital Facility Assessment'}
          </Text>
        </View>

        {editingSectionId !== null ? (
          <TouchableOpacity
            style={styles.cancelEditHeaderBtn}
            onPress={handleCancelSectionEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelEditHeaderText}>{t('cancel') || 'Cancel'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={styles.resetAllButton}
              onPress={handleResetAll}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={13} color="#DC2626" />
              <Text style={styles.resetAllText}>Reset All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={styles.progressTitleWrap}>
            <Text style={styles.progressCardHeading}>Application Progress</Text>
            <View style={styles.progressBadgesRow}>
              {hasDraft && (
                <View style={styles.draftBadgePill}>
                  <View style={styles.draftDot} />
                  <Text style={styles.draftBadgeText}>Draft Saved</Text>
                </View>
              )}
              <View style={styles.completedBadgePill}>
                <Ionicons name="checkmark" size={11} color="#059669" />
                <Text style={styles.completedBadgePillText}>
                  {completedSections.length} / 6 Completed
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetSectionHeaderBtn}
            onPress={() => handleResetSection(activeStep)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={12} color="#DC2626" />
            <Text style={styles.resetSectionHeaderBtnText}>Reset Section</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={stepperScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepScrollContent}
        >
          {SECTIONS.map((sec, idx) => {
            const isCurrent = activeStep === sec.id;
            const isCompleted = completedSections.includes(sec.id) || isSectionCompleted(sec.id, profile);
            const isPending = !isCompleted && isSectionPartiallyFilled(sec.id, profile);

            return (
              <React.Fragment key={sec.id}>
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => {
                    persistSurveyDraft(profile, sec.id);
                    setActiveStep(sec.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isCurrent && styles.stepCircleActive,
                      isPending && styles.stepCirclePending,
                      isPending && isCurrent && styles.stepCircleActivePending,
                      isCompleted && styles.stepCircleCompleted,
                      isCompleted && isCurrent && styles.stepCircleActiveCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : isPending ? (
                      <Ionicons name="hourglass-outline" size={13} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNumber, isCurrent && styles.stepNumberActive]}>
                        {sec.id}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      isCurrent && styles.stepTextActive,
                      isPending && styles.stepTextPending,
                      isCompleted && styles.stepTextCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {sec.title}
                  </Text>
                </TouchableOpacity>

                {idx < SECTIONS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isPending && styles.stepLinePending,
                      isCompleted && styles.stepLineCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Section Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={formScrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ==========================================
              STEP 1: Hospital Information
             ========================================== */}
          {activeStep === 1 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="business" size={20} color="#0284C7" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>1. Hospital Information</Text>
                  <Text style={styles.sectionSubTitle}>Basic Contact & Location Details</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.autoFillButton}
                onPress={handleAutoFillHospital}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={15} color="#059669" />
                <Text style={styles.autoFillButtonText}>Auto-fill from Assigned Hospital</Text>
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  HOSPITAL NAME <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.fullWidthInput}
                  value={profile.hospitalName}
                  onChangeText={(val) => updateProfile((prev) => ({ ...prev, hospitalName: val }))}
                  placeholder="e.g. Sahyadri Super Specialty Hospital"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  HOSPITAL TYPE <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsTypeModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !profile.hospitalType && styles.dropdownPlaceholderText,
                    ]}
                  >
                    {profile.hospitalType || 'Select hospital ownership type...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  FULL STREET ADDRESS (PLOT NO., ROAD, AREA) <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.fullWidthInput, styles.multilineInput]}
                  value={profile.streetAddress || profile.fullAddress}
                  multiline
                  numberOfLines={2}
                  onChangeText={(val) =>
                    updateProfile((prev) => ({ ...prev, streetAddress: val, fullAddress: val }))
                  }
                  placeholder="e.g. Plot 10, Karve Road, Deccan Gymkhana"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>
                    CITY <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    value={profile.city || ''}
                    onChangeText={(val) => updateProfile((prev) => ({ ...prev, city: val }))}
                    placeholder="e.g. Pune"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>
                    DISTRICT <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    value={profile.district || ''}
                    onChangeText={(val) => updateProfile((prev) => ({ ...prev, district: val }))}
                    placeholder="e.g. Pune"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>
                    TALUKA / SUB-DISTRICT <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    value={profile.taluka || ''}
                    onChangeText={(val) => updateProfile((prev) => ({ ...prev, taluka: val }))}
                    placeholder="e.g. Haveli"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>
                    PINCODE <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    value={profile.pincode || ''}
                    keyboardType="numeric"
                    maxLength={6}
                    onChangeText={(val) => updateProfile((prev) => ({ ...prev, pincode: val }))}
                    placeholder="e.g. 411004"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>NEAREST LANDMARK / STATION</Text>
                <TextInput
                  style={styles.fullWidthInput}
                  value={profile.landmark || ''}
                  onChangeText={(val) => updateProfile((prev) => ({ ...prev, landmark: val }))}
                  placeholder="e.g. Near Deccan Bus Stop (300m)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  CONTACT HELPLINE / PHONE <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.fullWidthInput}
                  value={profile.contactHelpline}
                  keyboardType="phone-pad"
                  onChangeText={(val) => updateProfile((prev) => ({ ...prev, contactHelpline: val }))}
                  placeholder="e.g. +91 20 2553 4000"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          )}

          {/* ==========================================
              STEP 2: Hospital Capacity
             ========================================== */}
          {activeStep === 2 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="bed" size={20} color="#6366F1" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>2. Hospital Capacity</Text>
                  <Text style={styles.sectionSubTitle}>
                    IPD Units, Diagnostic Modalities, Operative OTs, Emergency & Blood Bank
                  </Text>
                </View>
                <View style={styles.capacityBadgeWrap}>
                  <Text style={styles.capacityBadgeText}>FACILITY CAPACITIES</Text>
                </View>
              </View>

              {/* 1. IPD Capacity */}
              <View style={styles.subSectionCard}>
                <View style={styles.subSectionHeaderRow}>
                  <Ionicons name="bed-outline" size={16} color="#0284C7" />
                  <Text style={styles.subSectionMainHeading}>1. IPD (IN-PATIENT DEPARTMENT) CAPACITY</Text>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>
                      NUMBER OF WARDS <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 12"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.noOfWards !== undefined ? String(profile.capacity.ipd.noOfWards) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              noOfWards: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>

                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>
                      TOTAL GENERAL BEDS <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 150"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.generalBeds !== undefined ? String(profile.capacity.ipd.generalBeds) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              generalBeds: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>
                      TOTAL ICU UNITS <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 24"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.icuUnits !== undefined ? String(profile.capacity.ipd.icuUnits) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              icuUnits: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>

                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>NICU BEDS (NEONATAL ICU)</Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 10"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.nicuBeds !== undefined ? String(profile.capacity.ipd.nicuBeds) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              nicuBeds: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>PICU BEDS (PEDIATRIC ICU)</Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 8"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.picuBeds !== undefined ? String(profile.capacity.ipd.picuBeds) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              picuBeds: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>

                  <View style={styles.columnHalf}>
                    <Text style={styles.fieldLabel}>ISOLATION BEDS</Text>
                    <TextInput
                      style={styles.fullWidthInput}
                      keyboardType="numeric"
                      placeholder="e.g. 6"
                      placeholderTextColor="#94A3B8"
                      value={profile.capacity?.ipd?.isolationBeds !== undefined ? String(profile.capacity.ipd.isolationBeds) : ''}
                      onChangeText={(val) =>
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: {
                              ...(prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd),
                              isolationBeds: val,
                            },
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                          },
                        }))
                      }
                    />
                  </View>
                </View>
              </View>

              {/* 2. Diagnosis & Imaging Modalities */}
              <View style={[styles.subSectionCard, { marginTop: 14 }]}>
                <View style={styles.subSectionHeaderRow}>
                  <Ionicons name="pulse" size={16} color="#059669" />
                  <Text style={styles.subSectionMainHeading}>2. DIAGNOSIS & IMAGING MODALITIES</Text>
                </View>

                <View style={styles.facilityCardsContainer}>
                  {DIAGNOSTIC_MODALITIES.map((item) => {
                    const isChecked = profile.capacity?.diagnosis?.[item.key]?.available === 'Yes';
                    const countVal = profile.capacity?.diagnosis?.[item.key]?.count !== undefined ? String(profile.capacity.diagnosis[item.key]?.count) : '';

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.facilityCard, isChecked && styles.facilityCardChecked]}
                        activeOpacity={0.75}
                        onPress={() => {
                          updateProfile((prev) => ({
                            ...prev,
                            capacity: {
                              ...prev.capacity,
                              ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                              diagnosis: {
                                ...(prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis),
                                [item.key]: {
                                  available: isChecked ? 'No' : 'Yes',
                                  count: isChecked ? '' : countVal,
                                },
                              },
                              operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                              emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                              bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                            },
                          }));
                        }}
                      >
                        <View style={styles.facilityCardTopRow}>
                          <View style={[styles.facilityCheckbox, isChecked && styles.facilityCheckboxChecked]}>
                            {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <View style={styles.facilityCardInfo}>
                            <Text style={[styles.facilityCardTitle, isChecked && styles.facilityCardTitleChecked]}>
                              {item.label}
                            </Text>
                            <Text style={styles.facilityCardDesc}>{item.desc}</Text>
                          </View>
                        </View>

                        {isChecked && (
                          <View style={styles.facilityCountRow} onStartShouldSetResponder={() => true}>
                            <Text style={styles.facilityCountLabel}>Total Units:</Text>
                            <TextInput
                              style={styles.facilityCountInput}
                              keyboardType="numeric"
                              placeholder="Count"
                              placeholderTextColor="#94A3B8"
                              value={countVal}
                              onChangeText={(text) => {
                                updateProfile((prev) => ({
                                  ...prev,
                                  capacity: {
                                    ...prev.capacity,
                                    ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                                    diagnosis: {
                                      ...(prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis),
                                      [item.key]: {
                                        available: 'Yes',
                                        count: text,
                                      },
                                    },
                                    operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                                    emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                                    bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                                  },
                                }));
                              }}
                            />
                            <Text style={styles.facilityCountUnitText}>Units</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Operative Facilities */}
              <View style={[styles.subSectionCard, { marginTop: 14 }]}>
                <View style={styles.subSectionHeaderRow}>
                  <Ionicons name="medkit-outline" size={16} color="#7C3AED" />
                  <Text style={styles.subSectionMainHeading}>3. OPERATIVE FACILITIES</Text>
                </View>

                <View style={styles.facilityCardsContainer}>
                  {OPERATIVE_FACILITIES.map((item) => {
                    const isChecked = Boolean(
                      profile.capacity?.operative?.[`${item.key}Available`] !== undefined
                        ? profile.capacity?.operative?.[`${item.key}Available`]
                        : Boolean(profile.capacity?.operative?.[item.key])
                    );
                    const countVal = profile.capacity?.operative?.[item.key] !== undefined ? String(profile.capacity.operative[item.key]) : '';

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.facilityCard, isChecked && styles.facilityCardChecked]}
                        activeOpacity={0.75}
                        onPress={() => {
                          updateProfile((prev) => ({
                            ...prev,
                            capacity: {
                              ...prev.capacity,
                              ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                              diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                              operative: {
                                ...(prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative),
                                [`${item.key}Available`]: !isChecked,
                                [item.key]: !isChecked ? countVal : '',
                              },
                              emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                              bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                            },
                          }));
                        }}
                      >
                        <View style={styles.facilityCardTopRow}>
                          <View style={[styles.facilityCheckbox, isChecked && styles.facilityCheckboxChecked]}>
                            {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <View style={styles.facilityCardInfo}>
                            <Text style={[styles.facilityCardTitle, isChecked && styles.facilityCardTitleChecked]}>
                              {item.label}
                            </Text>
                            <Text style={styles.facilityCardDesc}>{item.desc}</Text>
                          </View>
                        </View>

                        {isChecked && (
                          <View style={styles.facilityCountRow} onStartShouldSetResponder={() => true}>
                            <Text style={styles.facilityCountLabel}>Total Count:</Text>
                            <TextInput
                              style={styles.facilityCountInput}
                              keyboardType="numeric"
                              placeholder="Count"
                              placeholderTextColor="#94A3B8"
                              value={countVal}
                              onChangeText={(text) => {
                                updateProfile((prev) => ({
                                  ...prev,
                                  capacity: {
                                    ...prev.capacity,
                                    ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                                    diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                                    operative: {
                                      ...(prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative),
                                      [`${item.key}Available`]: true,
                                      [item.key]: text,
                                    },
                                    emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                                    bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                                  },
                                }));
                              }}
                            />
                            <Text style={styles.facilityCountUnitText}>{item.unit}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Emergency Facilities */}
              <View style={[styles.subSectionCard, { marginTop: 14 }]}>
                <View style={styles.subSectionHeaderRow}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.subSectionMainHeading}>4. EMERGENCY FACILITIES</Text>
                </View>

                <View style={styles.facilityCardsContainer}>
                  {EMERGENCY_FACILITIES.map((item) => {
                    const isChecked = Boolean(
                      profile.capacity?.emergency?.[`${item.key}Available`] !== undefined
                        ? profile.capacity?.emergency?.[`${item.key}Available`]
                        : Boolean(profile.capacity?.emergency?.[item.key])
                    );
                    const countVal = profile.capacity?.emergency?.[item.key] !== undefined ? String(profile.capacity.emergency[item.key]) : '';

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.facilityCard, isChecked && styles.facilityCardChecked]}
                        activeOpacity={0.75}
                        onPress={() => {
                          updateProfile((prev) => ({
                            ...prev,
                            capacity: {
                              ...prev.capacity,
                              ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                              diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                              operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                              emergency: {
                                ...(prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency),
                                [`${item.key}Available`]: !isChecked,
                                [item.key]: !isChecked ? countVal : '',
                              },
                              bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                            },
                          }));
                        }}
                      >
                        <View style={styles.facilityCardTopRow}>
                          <View style={[styles.facilityCheckbox, isChecked && styles.facilityCheckboxChecked]}>
                            {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <View style={styles.facilityCardInfo}>
                            <Text style={[styles.facilityCardTitle, isChecked && styles.facilityCardTitleChecked]}>
                              {item.label}
                            </Text>
                            <Text style={styles.facilityCardDesc}>{item.desc}</Text>
                          </View>
                        </View>

                        {isChecked && (
                          <View style={styles.facilityCountRow} onStartShouldSetResponder={() => true}>
                            <Text style={styles.facilityCountLabel}>Total Count:</Text>
                            <TextInput
                              style={styles.facilityCountInput}
                              keyboardType="numeric"
                              placeholder="Count"
                              placeholderTextColor="#94A3B8"
                              value={countVal}
                              onChangeText={(text) => {
                                updateProfile((prev) => ({
                                  ...prev,
                                  capacity: {
                                    ...prev.capacity,
                                    ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                                    diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                                    operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                                    emergency: {
                                      ...(prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency),
                                      [`${item.key}Available`]: true,
                                      [item.key]: text,
                                    },
                                    bloodBank: prev.capacity?.bloodBank || DEFAULT_CAPACITY_DATA.bloodBank,
                                  },
                                }));
                              }}
                            />
                            <Text style={styles.facilityCountUnitText}>{item.unit}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Blood Bank */}
              <View style={[styles.subSectionCard, { marginTop: 14 }]}>
                <View style={styles.bloodBankHeaderRow}>
                  <View style={styles.bloodBankTitleLeft}>
                    <Ionicons name="water-outline" size={16} color="#059669" />
                    <Text style={styles.subSectionMainHeading}>5. BLOOD BANK</Text>
                  </View>
                  <View style={styles.bloodBankActionsRight}>
                    <View style={styles.bloodCountBadge}>
                      <Text style={styles.bloodCountBadgeText}>
                        {Object.values(profile.capacity?.bloodBank?.bloodGroups || {}).filter(Boolean).length} / 8 Selected
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.bloodGhostBtn}
                      onPress={() => {
                        const allTrue: Record<string, boolean> = {};
                        BLOOD_GROUPS.forEach((bg) => { allTrue[bg] = true; });
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: { bloodGroups: allTrue },
                          },
                        }));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bloodGhostBtnText}>All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bloodGhostBtn}
                      onPress={() => {
                        const allFalse: Record<string, boolean> = {};
                        BLOOD_GROUPS.forEach((bg) => { allFalse[bg] = false; });
                        updateProfile((prev) => ({
                          ...prev,
                          capacity: {
                            ...prev.capacity,
                            ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                            diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                            operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                            emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                            bloodBank: { bloodGroups: allFalse },
                          },
                        }));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bloodGhostBtnText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.bloodGroupsGrid}>
                  {BLOOD_GROUPS.map((grp) => {
                    const isSelected = Boolean(profile.capacity?.bloodBank?.bloodGroups?.[grp]);
                    return (
                      <TouchableOpacity
                        key={grp}
                        style={[styles.bloodGroupCard, isSelected && styles.bloodGroupCardSelected]}
                        activeOpacity={0.7}
                        onPress={() => {
                          updateProfile((prev) => ({
                            ...prev,
                            capacity: {
                              ...prev.capacity,
                              ipd: prev.capacity?.ipd || DEFAULT_CAPACITY_DATA.ipd,
                              diagnosis: prev.capacity?.diagnosis || DEFAULT_CAPACITY_DATA.diagnosis,
                              operative: prev.capacity?.operative || DEFAULT_CAPACITY_DATA.operative,
                              emergency: prev.capacity?.emergency || DEFAULT_CAPACITY_DATA.emergency,
                              bloodBank: {
                                bloodGroups: {
                                  ...(prev.capacity?.bloodBank?.bloodGroups || {}),
                                  [grp]: !isSelected,
                                },
                              },
                            },
                          }));
                        }}
                      >
                        <View style={[styles.facilityCheckbox, isSelected && styles.facilityCheckboxChecked]}>
                          {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.bloodGroupText, isSelected && styles.bloodGroupTextSelected]}>
                          {grp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ==========================================
              STEP 3: Clinical Specialities (26 Specialities)
             ========================================== */}
          {activeStep === 3 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="medkit" size={20} color="#7C3AED" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>3. Clinical Specialities</Text>
                  <Text style={styles.sectionSubTitle}>26 Clinical Departments (Min. 1 required)</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>
                    {(profile.selectedSpecialities || profile.specializations || []).length} Selected
                  </Text>
                </View>
              </View>

              {/* Search Bar & Quick Actions */}
              <View style={styles.searchBarRow}>
                <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginLeft: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search specialities (e.g. Cardiology, Orthopedics)..."
                  placeholderTextColor="#94A3B8"
                  value={specialitySearch}
                  onChangeText={setSpecialitySearch}
                />
                {specialitySearch ? (
                  <TouchableOpacity onPress={() => setSpecialitySearch('')} style={{ padding: 6 }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => {
                    const allIds = ALL_26_SPECIALITIES.map((s) => s.id);
                    updateProfile((prev) => ({
                      ...prev,
                      selectedSpecialities: allIds,
                      specializations: allIds,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionBtnText}>Select All (26)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => {
                    updateProfile((prev) => ({
                      ...prev,
                      selectedSpecialities: [],
                      specializations: [],
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionBtnText}>Clear All</Text>
                </TouchableOpacity>
              </View>

              {/* Specialities Grid */}
              <View style={styles.specGridTwoCols}>
                {filteredSpecialities.map((spec) => {
                  const selectedList = profile.selectedSpecialities || profile.specializations || [];
                  const isChecked = selectedList.includes(spec.id) || selectedList.includes(spec.name);

                  return (
                    <TouchableOpacity
                      key={spec.id}
                      style={[styles.specCardItem, isChecked && styles.specCardItemActive]}
                      onPress={() => handleToggleSpeciality(spec.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.facilityCheckbox, isChecked && styles.facilityCheckboxChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.specCardText, isChecked && styles.specCardTextActive]}>
                          {spec.name}
                        </Text>
                        <Text style={styles.specCategoryText}>{spec.category}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredSpecialities.length === 0 && (
                <View style={styles.emptySearchWrap}>
                  <Text style={styles.emptyCustomSpecText}>No specialities matching "{specialitySearch}"</Text>
                </View>
              )}
            </View>
          )}

          {/* ==========================================
              STEP 4: Healthcare Scheme Packages
             ========================================== */}
          {activeStep === 4 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="cube" size={20} color="#0D9488" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>4. Scheme Treatment Packages</Text>
                  <Text style={styles.sectionSubTitle}>
                    Configuring packages for your selected specialities
                  </Text>
                </View>
                <View style={[styles.badgeWrap, { backgroundColor: '#CCFBF1' }]}>
                  <Text style={[styles.badgeText, { color: '#0F766E' }]}>
                    {(profile.selectedPackages || []).length} Selected
                  </Text>
                </View>
              </View>

              {/* Simple Clean Top Action Bar */}
              <View style={styles.pkgSimpleTopBar}>
                <View style={styles.pkgSpecCountBadge}>
                  <Ionicons name="medkit-outline" size={13} color="#0D9488" />
                  <Text style={styles.pkgSpecCountBadgeText}>
                    {selectedSpecialityNames.length} Specialit{selectedSpecialityNames.length === 1 ? 'y' : 'ies'} Active
                  </Text>
                </View>

                <View style={styles.pkgSimpleTopActions}>
                  <TouchableOpacity
                    style={styles.pkgSelectAllTopBtn}
                    onPress={handleSelectAllForSelectedSpecialities}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                    <Text style={styles.pkgSelectAllTopBtnText}>Select All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pkgClearAllTopBtn}
                    onPress={() => updateProfile((prev) => ({ ...prev, selectedPackages: [] }))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={13} color="#DC2626" />
                    <Text style={styles.pkgClearAllTopBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Packages List or Empty State */}
              {packagesLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading Scheme Packages...</Text>
                </View>
              ) : selectedSpecialityNames.length === 0 ? (
                <View style={styles.pkgEmptySpecialityCard}>
                  <View style={styles.pkgEmptyIconWrap}>
                    <Ionicons name="medkit-outline" size={32} color="#0D9488" />
                  </View>
                  <Text style={styles.pkgEmptyTitle}>No Specialities Selected</Text>
                  <Text style={styles.pkgEmptyDesc}>
                    Please select your hospital's clinical specialities in Step 3 before configuring treatment packages.
                  </Text>
                  <TouchableOpacity
                    style={styles.pkgGoToStep3Btn}
                    onPress={() => setActiveStep(3)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={15} color="#FFFFFF" />
                    <Text style={styles.pkgGoToStep3BtnText}>Go to Step 3 (Specialities)</Text>
                  </TouchableOpacity>
                </View>
              ) : selectedPackagesGrouped.length === 0 ? (
                <View style={styles.emptySearchWrap}>
                  <Text style={styles.emptyCustomSpecText}>
                    No treatment package procedures found for the chosen specialities.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 4 }}>
                  {selectedPackagesGrouped.map((group, groupIdx) => {
                    const specPackages = group.packages || [];
                    const selectedInSpec = specPackages.filter((p) =>
                      (profile.selectedPackages || []).includes(p.package_code || p.id)
                    );
                    const isAllSelected = specPackages.length > 0 && selectedInSpec.length === specPackages.length;
                    const isOpen = isSpecialtyOpen(group.specialty, groupIdx);

                    return (
                      <View
                        key={group.specialty}
                        style={[
                          styles.pkgGroupCard,
                          isOpen ? styles.pkgGroupCardOpen : styles.pkgGroupCardCollapsed,
                        ]}
                      >
                        {/* Clean Specialty Accordion Header */}
                        <TouchableOpacity
                          style={styles.pkgGroupHeaderTouchable}
                          onPress={() => handleToggleSpecialtyOpen(group.specialty, groupIdx)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.pkgGroupHeaderLeft}>
                            <View style={styles.pkgGroupBadge}>
                              <Text style={styles.pkgGroupBadgeText}>{group.specialty_code || 'SPEC'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pkgGroupName}>{group.specialty}</Text>
                              <Text
                                style={[
                                  styles.pkgGroupCountText,
                                  selectedInSpec.length > 0 && styles.pkgGroupCountTextActive,
                                ]}
                              >
                                {selectedInSpec.length} of {group.totalCount || specPackages.length} selected
                              </Text>
                            </View>
                          </View>

                          <View style={styles.pkgGroupHeaderActions}>
                            <TouchableOpacity
                              style={[styles.pkgSelectAllBtn, isAllSelected && styles.pkgSelectAllBtnActive]}
                              onPress={() => handleSelectAllSpecialtyPackages(specPackages)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={isAllSelected ? 'checkbox' : 'square-outline'}
                                size={14}
                                color={isAllSelected ? '#059669' : '#64748B'}
                              />
                              <Text style={[styles.pkgSelectAllBtnText, isAllSelected && styles.pkgSelectAllBtnTextActive]}>
                                {isAllSelected ? 'Deselect' : 'Select All'}
                              </Text>
                            </TouchableOpacity>

                            <View style={[styles.pkgCollapseChevron, isOpen && styles.pkgCollapseChevronOpen]}>
                              <Ionicons
                                name={isOpen ? 'chevron-up' : 'chevron-down'}
                                size={17}
                                color={isOpen ? '#0D9488' : '#475569'}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Individual Specialty Search Box */}
                        {isOpen && (
                          <View style={styles.pkgSpecSearchBoxWrap}>
                            <Ionicons name="search-outline" size={14} color="#64748B" style={{ marginLeft: 8 }} />
                            <TextInput
                              style={styles.pkgSpecSearchInput}
                              placeholder={`Search in ${group.specialty} (code or name)...`}
                              placeholderTextColor="#94A3B8"
                              value={specialtySearchMap[group.specialty] || ''}
                              onChangeText={(val) =>
                                setSpecialtySearchMap((prev) => ({
                                  ...prev,
                                  [group.specialty]: val,
                                }))
                              }
                            />
                            {specialtySearchMap[group.specialty] ? (
                              <TouchableOpacity
                                onPress={() =>
                                  setSpecialtySearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: '',
                                  }))
                                }
                                style={{ padding: 6 }}
                              >
                                <Ionicons name="close-circle" size={15} color="#94A3B8" />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}

                        {/* Clean List of Procedures */}
                        {isOpen && (
                          <View style={styles.pkgProceduresList}>
                            {(() => {
                              const specSearch = (specialtySearchMap[group.specialty] || '').trim().toLowerCase();
                              const filteredSpecPackages = specSearch
                                ? specPackages.filter(
                                  (p) =>
                                    p.package_name.toLowerCase().includes(specSearch) ||
                                    p.package_code.toLowerCase().includes(specSearch)
                                )
                                : specPackages;

                              if (filteredSpecPackages.length === 0 && specSearch) {
                                return (
                                  <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                                    <Text style={styles.emptyCustomSpecText}>
                                      No procedures matching "{specialtySearchMap[group.specialty]}" in {group.specialty}
                                    </Text>
                                  </View>
                                );
                              }

                              return filteredSpecPackages.map((pkg) => {
                                const pkgId = pkg.package_code || pkg.id;
                                const isChecked = (profile.selectedPackages || []).includes(pkgId);

                                return (
                                  <TouchableOpacity
                                    key={pkgId}
                                    style={[styles.pkgProcedureCard, isChecked && styles.pkgProcedureCardChecked]}
                                    onPress={() => handleTogglePackage(pkgId)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={[styles.facilityCheckbox, isChecked && styles.facilityCheckboxChecked]}>
                                      {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <View style={styles.pkgCodeRow}>
                                        <Text style={styles.pkgCodeText}>{pkg.package_code}</Text>
                                      </View>
                                      <Text style={styles.pkgNameText}>{pkg.package_name}</Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              });
                            })()}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ==========================================
              STEP 5: Doctors Roster
             ========================================== */}
          {activeStep === 5 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="people" size={20} color="#7C3AED" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>5. Doctors Roster</Text>
                  <Text style={styles.sectionSubTitle}>Registered Attending Specialists & Duty Schedule</Text>
                </View>
                <TouchableOpacity
                  style={styles.addDoctorHeaderBtn}
                  onPress={handleOpenAddDoctor}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                  <Text style={styles.addDoctorHeaderBtnText}>Add Doctor</Text>
                </TouchableOpacity>
              </View>

              {/* Doctors List */}
              {(profile.doctorsList || []).length > 0 ? (
                <View style={{ gap: 10, marginTop: 4 }}>
                  {(profile.doctorsList || []).map((doc, idx) => (
                    <View key={doc.id || idx} style={styles.doctorItemCard}>
                      <View style={styles.doctorItemTopRow}>
                        <View style={styles.doctorAvatarCircle}>
                          <Ionicons name="person" size={18} color="#4F46E5" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.doctorCardName}>{doc.name}</Text>
                          <Text style={styles.doctorCardSpec}>{doc.speciality}</Text>
                          <View style={styles.doctorChipsRow}>
                            <View style={styles.docChip}>
                              <Ionicons name="school-outline" size={11} color="#64748B" />
                              <Text style={styles.docChipText}>{doc.qualification || 'MBBS'}</Text>
                            </View>
                            {doc.experience ? (
                              <View style={styles.docChip}>
                                <Ionicons name="ribbon-outline" size={11} color="#64748B" />
                                <Text style={styles.docChipText}>{doc.experience}</Text>
                              </View>
                            ) : null}
                            <View style={[styles.docChip, { backgroundColor: '#FEF3C7' }]}>
                              <Ionicons name="calendar-outline" size={11} color="#D97706" />
                              <Text style={[styles.docChipText, { color: '#92400E' }]}>{getDoctorDutyDays(doc)}</Text>
                            </View>
                          </View>
                          <View style={styles.doctorContactRow}>
                            <Ionicons name="call-outline" size={12} color="#059669" />
                            <Text style={styles.doctorContactText}>{doc.mobile}</Text>
                            {doc.district ? (
                              <Text style={styles.doctorAddressText}>• {doc.district}</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {/* Doctor Action Buttons */}
                      <View style={styles.doctorActionsBar}>
                        <TouchableOpacity
                          style={[styles.statusToggleBtn, doc.status !== 'Inactive' ? styles.statusToggleBtnActive : styles.statusToggleBtnInactive]}
                          onPress={() => handleToggleDoctorStatus(doc.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.statusDot, { backgroundColor: doc.status !== 'Inactive' ? '#16A34A' : '#94A3B8' }]} />
                          <Text style={[styles.statusToggleText, { color: doc.status !== 'Inactive' ? '#16A34A' : '#64748B' }]}>
                            {doc.status !== 'Inactive' ? 'Active' : 'Inactive'}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.docIconBtn}
                            onPress={() => setViewingDoc(doc)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={15} color="#0284C7" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.docIconBtn}
                            onPress={() => handleOpenEditDoctor(doc)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="create-outline" size={15} color="#4F46E5" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.docIconBtn, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}
                            onPress={() => handleDeleteDoctor(doc.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={15} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySearchWrap}>
                  <Ionicons name="people-outline" size={32} color="#94A3B8" />
                  <Text style={[styles.emptyCustomSpecText, { marginTop: 6 }]}>No doctors added yet</Text>
                  <TouchableOpacity style={styles.addDoctorInlineBtn} onPress={handleOpenAddDoctor}>
                    <Ionicons name="add-circle" size={16} color="#0284C7" />
                    <Text style={styles.addDoctorInlineBtnText}>Add First Doctor</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ==========================================
              STEP 6: Resource Count
             ========================================== */}
          {activeStep === 6 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="grid" size={20} color="#D97706" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionMainTitle}>6. Resource & Workforce Count</Text>
                  <Text style={styles.sectionSubTitle}>Hospital Staff Strength: Doctors, Nursing & Support Staff</Text>
                </View>
                <View style={[styles.badgeWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.badgeText, { color: '#B45309' }]}>
                    {totalStaffCount} Total
                  </Text>
                </View>
              </View>

              <View style={styles.workforceListWrap}>
                {/* 1. Nursing Staff */}
                <View style={styles.workforceCard}>
                  <View style={styles.workforceCardInfo}>
                    <Text style={styles.workforceCardTitle}>
                      NURSING STAFF (REGISTERED NURSES / GNM) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <Text style={styles.workforceCardDesc}>Ward, ICU & OT qualified registered nursing staff</Text>
                  </View>
                  <TextInput
                    style={styles.workforceNumInput}
                    keyboardType="numeric"
                    placeholder="e.g. 60"
                    placeholderTextColor="#94A3B8"
                    value={profile.resourceCount?.nursingStaff !== undefined ? String(profile.resourceCount.nursingStaff) : ''}
                    onChangeText={(val) =>
                      updateProfile((prev) => ({
                        ...prev,
                        resourceCount: {
                          ...(prev.resourceCount || { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' }),
                          nursingStaff: val,
                        },
                      }))
                    }
                  />
                </View>

                {/* 3. Paramedical & Lab Technicians */}
                <View style={styles.workforceCard}>
                  <View style={styles.workforceCardInfo}>
                    <Text style={styles.workforceCardTitle}>PARAMEDICAL & LAB TECHNICIANS</Text>
                    <Text style={styles.workforceCardDesc}>Pathology, Radiology & Dialysis technicians</Text>
                  </View>
                  <TextInput
                    style={styles.workforceNumInput}
                    keyboardType="numeric"
                    placeholder="e.g. 18"
                    placeholderTextColor="#94A3B8"
                    value={profile.resourceCount?.paramedicalStaff !== undefined ? String(profile.resourceCount.paramedicalStaff) : ''}
                    onChangeText={(val) =>
                      updateProfile((prev) => ({
                        ...prev,
                        resourceCount: {
                          ...(prev.resourceCount || { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' }),
                          paramedicalStaff: val,
                        },
                      }))
                    }
                  />
                </View>

                {/* 4. Support Staff */}
                <View style={styles.workforceCard}>
                  <View style={styles.workforceCardInfo}>
                    <Text style={styles.workforceCardTitle}>SUPPORT & WARD BOYS</Text>
                    <Text style={styles.workforceCardDesc}>Ward attendants, cleaners & housekeeping</Text>
                  </View>
                  <TextInput
                    style={styles.workforceNumInput}
                    keyboardType="numeric"
                    placeholder="e.g. 30"
                    placeholderTextColor="#94A3B8"
                    value={profile.resourceCount?.supportStaff !== undefined ? String(profile.resourceCount.supportStaff) : ''}
                    onChangeText={(val) =>
                      updateProfile((prev) => ({
                        ...prev,
                        resourceCount: {
                          ...(prev.resourceCount || { totalDoctors: '', nursingStaff: '', paramedicalStaff: '', supportStaff: '' }),
                          supportStaff: val,
                        },
                      }))
                    }
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Persistent Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {editingSectionId !== null ? (
            <View style={styles.sectionEditBottomRow}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={handleCancelSectionEdit}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#475569" />
                <Text style={styles.cancelEditBtnText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, styles.updateSectionBtn]}
                onPress={handleUpdateSingleSection}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={17} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      Update Section {editingSectionId}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {activeStep > 1 ? (
                <TouchableOpacity
                  style={styles.footerGhostBtn}
                  onPress={handlePrev}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color="#334155" />
                  <Text style={styles.footerGhostBtnText}>Previous</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.footerGhostBtn}
                onPress={async () => {
                  await persistSurveyDraft(profile, activeStep, completedSections);
                  Alert.alert('Draft Saved', 'Your progress has been saved successfully.');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={16} color="#334155" />
                <Text style={styles.footerGhostBtnText}>Save Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerPrimaryBtn, activeStep === 6 && styles.submitButton]}
                onPress={handleSaveAndNext}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.footerPrimaryBtnText}>
                      {getNextButtonLabel(activeStep)}
                    </Text>
                    <Ionicons
                      name={activeStep === 6 ? 'checkmark-circle' : 'arrow-forward'}
                      size={16}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* =========================================================================
          MODALS
         ========================================================================= */}
      {/* 1. Hospital Type Modal */}
      <Modal visible={isTypeModalOpen} transparent animationType="fade" onRequestClose={() => setIsTypeModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsTypeModalOpen(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Hospital Type</Text>
                <Text style={styles.modalSubTitle}>Ownership & classification</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsTypeModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalList}>
              {HOSPITAL_TYPES.map((type) => {
                const isSelected = profile.hospitalType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateProfile((prev) => ({ ...prev, hospitalType: type }));
                      setIsTypeModalOpen(false);
                    }}
                  >
                    <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={18} color={isSelected ? '#059669' : '#94A3B8'} />
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. Add / Edit Doctor Modal */}
      <Modal visible={doctorModalOpen} transparent animationType="slide" onRequestClose={() => setDoctorModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCard, { maxHeight: '90%', padding: 0 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { paddingHorizontal: 16, paddingTop: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingDocId ? 'Edit Doctor Details' : 'Add Doctor to Hospital'}
                </Text>
                <Text style={styles.modalSubTitle}>Doctor qualifications, shift & contact</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDoctorModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Doctor Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  DOCTOR FULL NAME <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.fullWidthInput}
                  placeholder="e.g. Dr. Rajesh Kulkarni"
                  placeholderTextColor="#94A3B8"
                  value={docFormData.name}
                  onChangeText={(val) => setDocFormData((prev) => ({ ...prev, name: val }))}
                />
              </View>

              {/* Phone numbers */}
              <View style={styles.twoColumnRow}>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>
                    PRIMARY PHONE <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    placeholder="e.g. 9822011223"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={docFormData.mobile}
                    onChangeText={(val) => setDocFormData((prev) => ({ ...prev, mobile: val }))}
                  />
                </View>

                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>ALT PHONE</Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    placeholder="e.g. 9822099887"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={docFormData.altMobile}
                    onChangeText={(val) => setDocFormData((prev) => ({ ...prev, altMobile: val }))}
                  />
                </View>
              </View>

              {/* Qualification & Degrees */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  QUALIFICATION & DEGREES <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.fullWidthInput}
                  placeholder="e.g. MBBS, MD (General Medicine)"
                  placeholderTextColor="#94A3B8"
                  value={docFormData.qualification}
                  onChangeText={(val) => setDocFormData((prev) => ({ ...prev, qualification: val }))}
                />

                <View style={{ marginTop: 6 }}>
                  <Text style={styles.quickSelectLabel}>Quick select:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    {QUICK_QUALIFICATIONS.map((qual) => (
                      <TouchableOpacity
                        key={qual}
                        style={styles.quickChip}
                        onPress={() => handleAppendQualification(qual)}
                      >
                        <Text style={styles.quickChipText}>+ {qual}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Experience */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CLINICAL EXPERIENCE (YEARS)</Text>
                <TextInput
                  style={styles.fullWidthInput}
                  placeholder="e.g. 14 Years"
                  placeholderTextColor="#94A3B8"
                  value={docFormData.experience}
                  onChangeText={(val) => setDocFormData((prev) => ({ ...prev, experience: val }))}
                />
              </View>

              {/* Duty Type */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>DUTY AVAILABILITY & TIMING TYPE</Text>
                <View style={styles.segmentedToggleLarge}>
                  <TouchableOpacity
                    style={[styles.toggleBtnLarge, docFormData.dutyType === 'Shift' && styles.toggleBtnLargeActive]}
                    onPress={() => setDocFormData((prev) => ({ ...prev, dutyType: 'Shift' }))}
                  >
                    <Text style={[styles.toggleBtnLargeText, docFormData.dutyType === 'Shift' && styles.toggleBtnLargeTextActive]}>
                      Regular Shift
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtnLarge, docFormData.dutyType === 'On-Call' && styles.toggleBtnLargeActive]}
                    onPress={() => setDocFormData((prev) => ({ ...prev, dutyType: 'On-Call' }))}
                  >
                    <Text style={[styles.toggleBtnLargeText, docFormData.dutyType === 'On-Call' && styles.toggleBtnLargeTextActive]}>
                      On-Call (24/7)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* If Shift: Days and Timings */}
              {docFormData.dutyType === 'Shift' && (
                <View style={styles.shiftBoxWrap}>
                  <Text style={[styles.fieldLabel, { fontSize: 12 }]}>DUTY DAYS IN WEEK</Text>
                  <View style={styles.weekDaysRow}>
                    {WEEK_DAYS.map((day) => {
                      const isSelected = (docFormData.workingDays || []).includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.weekDayBtn, isSelected && styles.weekDayBtnActive]}
                          onPress={() => handleToggleWorkingDay(day)}
                        >
                          <Text style={[styles.weekDayBtnText, isSelected && styles.weekDayBtnTextActive]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.twoColumnRow, { marginTop: 10 }]}>
                    <View style={styles.columnHalf}>
                      <Text style={styles.fieldLabel}>START TIME</Text>
                      <TextInput
                        style={styles.fullWidthInput}
                        placeholder="08:00 AM"
                        placeholderTextColor="#94A3B8"
                        value={`${docFormData.startTime || '08:00'} ${docFormData.startPeriod || 'AM'}`}
                        onChangeText={(val) => {
                          const parts = val.split(' ');
                          setDocFormData((prev) => ({
                            ...prev,
                            startTime: parts[0] || '08:00',
                            startPeriod: (parts[1]?.toUpperCase() as any) || 'AM',
                          }));
                        }}
                      />
                    </View>

                    <View style={styles.columnHalf}>
                      <Text style={styles.fieldLabel}>END TIME</Text>
                      <TextInput
                        style={styles.fullWidthInput}
                        placeholder="02:00 PM"
                        placeholderTextColor="#94A3B8"
                        value={`${docFormData.endTime || '02:00'} ${docFormData.endPeriod || 'PM'}`}
                        onChangeText={(val) => {
                          const parts = val.split(' ');
                          setDocFormData((prev) => ({
                            ...prev,
                            endTime: parts[0] || '02:00',
                            endPeriod: (parts[1]?.toUpperCase() as any) || 'PM',
                          }));
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Specialities multi-select */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  DOCTOR SPECIALITIES ({selectedDocSpecialities.length} Selected)
                </Text>
                <View style={styles.quickQualWrap}>
                  {QUICK_DOC_SPECIALITIES.map((spec) => {
                    const isSelected = selectedDocSpecialities.includes(spec);
                    return (
                      <TouchableOpacity
                        key={spec}
                        style={[styles.quickChip, isSelected && styles.quickChipActive]}
                        onPress={() => handleToggleDocSpeciality(spec)}
                      >
                        <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
                          {isSelected ? '✓ ' : '+ '}{spec}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Address & District */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>DOCTOR OPD ROOM / ADDRESS</Text>
                <TextInput
                  style={styles.fullWidthInput}
                  placeholder="e.g. OPD Room 204, 2nd Floor"
                  placeholderTextColor="#94A3B8"
                  value={docFormData.address}
                  onChangeText={(val) => setDocFormData((prev) => ({ ...prev, address: val }))}
                />
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>DISTRICT</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setIsDocDistrictModalOpen(true)}
                  >
                    <Text style={styles.dropdownTriggerText}>{docFormData.district || 'Pune'}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.columnHalf}>
                  <Text style={styles.fieldLabel}>TALUKA</Text>
                  <TextInput
                    style={styles.fullWidthInput}
                    placeholder="e.g. Haveli"
                    placeholderTextColor="#94A3B8"
                    value={docFormData.taluka}
                    onChangeText={(val) => setDocFormData((prev) => ({ ...prev, taluka: val }))}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDoctorModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveDoctor}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>
                  {editingDocId ? 'Save Changes' : 'Add Doctor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. View Doctor Modal */}
      {viewingDoc && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setViewingDoc(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{viewingDoc.name}</Text>
                  <Text style={[styles.modalSubTitle, { color: '#0284C7', fontWeight: '700' }]}>
                    {viewingDoc.speciality}
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewingDoc(null)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Qualification:</Text>
                  <Text style={styles.summaryValue}>{viewingDoc.qualification}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Experience:</Text>
                  <Text style={styles.summaryValue}>{viewingDoc.experience || 'Experienced'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duty Schedule:</Text>
                  <Text style={styles.summaryValue}>{viewingDoc.availability || 'Regular Shift'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Primary Mobile:</Text>
                  <Text style={[styles.summaryValue, { color: '#059669', fontWeight: '800' }]}>{viewingDoc.mobile}</Text>
                </View>
                {viewingDoc.altMobile ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Alt Phone:</Text>
                    <Text style={styles.summaryValue}>{viewingDoc.altMobile}</Text>
                  </View>
                ) : null}
                {viewingDoc.address ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Address / OPD:</Text>
                    <Text style={styles.summaryValue}>{viewingDoc.address}, {viewingDoc.district}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalFooterRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setViewingDoc(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={() => {
                    const d = viewingDoc;
                    setViewingDoc(null);
                    handleOpenEditDoctor(d);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.modalSubmitBtnText}>Edit Doctor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 4. Maharashtra Districts Selector Modal */}
      <Modal visible={isDocDistrictModalOpen} transparent animationType="fade" onRequestClose={() => setIsDocDistrictModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsDocDistrictModalOpen(false)}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsDocDistrictModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {MAHARASHTRA_DISTRICTS.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[styles.modalItem, docFormData.district === dist && styles.modalItemSelected]}
                  onPress={() => {
                    setDocFormData((prev) => ({ ...prev, district: dist, city: dist }));
                    setIsDocDistrictModalOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, docFormData.district === dist && styles.modalItemTextSelected]}>
                    {dist}
                  </Text>
                  {docFormData.district === dist && <Ionicons name="checkmark" size={16} color="#059669" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#047857',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  resetAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelEditHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelEditHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressTitleWrap: {
    flex: 1,
  },
  progressCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  draftBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  draftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedBadgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  resetSectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  resetSectionHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  stepScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 68,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    elevation: 2,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepCircleActiveCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    borderWidth: 2,
    elevation: 3,
  },
  stepCirclePending: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  stepCircleActivePending: {
    backgroundColor: '#F59E0B',
    borderColor: '#B45309',
    borderWidth: 2,
    elevation: 3,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  stepTextCompleted: {
    color: '#059669',
    fontWeight: '700',
  },
  stepTextPending: {
    color: '#D97706',
    fontWeight: '700',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 16,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepLinePending: {
    backgroundColor: '#F59E0B',
  },
  scrollArea: {
    flex: 1,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 130,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitleBlock: {
    flex: 1,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  autoFillButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  fullWidthInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  columnHalf: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  dropdownPlaceholderText: {
    color: '#94A3B8',
  },
  capacityBadgeWrap: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  capacityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  subSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 12,
  },
  subSectionMainHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  facilityCardsContainer: {
    gap: 10,
  },
  facilityCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  facilityCardChecked: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  facilityCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  facilityCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  facilityCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  facilityCardInfo: {
    flex: 1,
  },
  facilityCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  facilityCardTitleChecked: {
    color: '#065F46',
  },
  facilityCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  facilityCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  facilityCountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  facilityCountInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  facilityCountUnitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bloodBankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodBankTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bloodBankActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bloodCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bloodCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  bloodGhostBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bloodGhostBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bloodGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodGroupCard: {
    width: '22.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  bloodGroupCardSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  bloodGroupText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  bloodGroupTextSelected: {
    color: '#DC2626',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  specGridTwoCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specCardItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  specCardItemActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  specCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
  },
  specCardTextActive: {
    color: '#0369A1',
    fontWeight: '700',
  },
  specCategoryText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptySearchWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCustomSpecText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterTabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  filterTabBtnActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pkgSimpleTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  pkgSpecCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pkgSpecCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  pkgSimpleTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pkgSelectAllTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pkgSelectAllTopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pkgClearAllTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  pkgClearAllTopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  pkgEmptySpecialityCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 6,
  },
  pkgEmptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pkgEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pkgEmptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 280,
  },
  pkgGoToStep3Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: '#0D9488',
  },
  pkgGoToStep3BtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pkgGroupCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
  },
  pkgGroupCardOpen: {
    backgroundColor: '#F8FAFC',
    borderColor: '#99F6E4',
  },
  pkgGroupCardCollapsed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  pkgGroupHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pkgGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pkgGroupBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pkgGroupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pkgGroupName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pkgCountBadgeWrap: {
    marginTop: 1,
  },
  pkgGroupCountText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  pkgGroupCountTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  pkgGroupHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pkgSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pkgSelectAllBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  pkgSelectAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  pkgSelectAllBtnTextActive: {
    color: '#059669',
  },
  pkgCollapseChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgCollapseChevronOpen: {
    backgroundColor: '#CCFBF1',
  },
  pkgSpecSearchBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  pkgSpecSearchInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  pkgProceduresList: {
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pkgProcedureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  pkgProcedureCardChecked: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  pkgCodeRow: {
    marginBottom: 2,
  },
  pkgCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
  },
  pkgNameText: {
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 15,
  },
  addDoctorHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  addDoctorHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doctorItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  doctorItemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  doctorAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorCardSpec: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 1,
  },
  doctorChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  doctorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  doctorContactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  doctorAddressText: {
    fontSize: 11,
    color: '#64748B',
  },
  doctorActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusToggleBtnActive: {
    backgroundColor: '#DCFCE7',
  },
  statusToggleBtnInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docIconBtn: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addDoctorInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  addDoctorInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  workforceListWrap: {
    gap: 10,
  },
  workforceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  workforceCardInfo: {
    flex: 1,
  },
  workforceCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  workforceCardDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  workforceNumInput: {
    width: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -3 },
  },
  footerGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerGhostBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  footerPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 9,
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  submitButton: {
    backgroundColor: '#4338CA',
  },
  footerPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionEditBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cancelEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelEditBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  updateSectionBtn: {
    flex: 1,
    backgroundColor: '#059669',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryScrollBody: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  verifiedSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 14,
  },
  verifiedSuccessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  verifiedSuccessSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  verifiedSuccessTime: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  summaryCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryEditSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  summaryEditSectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  summaryCardContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '55%',
    textAlign: 'right',
  },
  summaryChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  summaryMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryMetricLbl: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  docSummaryCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docSummaryAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  docSummaryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSummarySpec: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4F46E5',
  },
  docSummaryTiming: {
    fontSize: 10,
    color: '#64748B',
  },
  statusPillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillBadgeYes: {
    backgroundColor: '#DCFCE7',
  },
  statusPillBadgeNo: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextYes: {
    color: '#15803D',
  },
  statusPillTextNo: {
    color: '#DC2626',
  },
  summaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  summaryEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 12,
  },
  summaryEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  summaryBackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
  },
  summaryBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalList: {
    gap: 8,
    marginTop: 6,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  modalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#065F46',
    fontWeight: '700',
  },
  quickSelectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  quickQualWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  segmentedToggleLarge: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtnLarge: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  toggleBtnLargeActive: {
    backgroundColor: '#0284C7',
  },
  toggleBtnLargeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnLargeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  shiftBoxWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  weekDaysRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    justifyContent: 'space-between',
  },
  weekDayBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  weekDayBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  weekDayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  weekDayBtnTextActive: {
    color: '#FFFFFF',
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: '#059669',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finalModalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  finalModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  finalModalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  finalModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
    justifyContent: 'center',
  },
});

export default HospitalFacilitySurveyScreen;
