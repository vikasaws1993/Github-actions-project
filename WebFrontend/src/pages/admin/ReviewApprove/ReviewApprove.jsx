import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  X,
  XCircle,
  Check,
  User,
  ClipboardCheck,
  Building2,
  Building,
  FileEdit,
  Eye,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Phone,
  FolderPlus,
  ArrowLeft,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  BedDouble,
  Activity,
  Send,
  FileText,
  FileCheck,
  Stethoscope,
  CheckCircle2,
  Search,
  Users,
  CheckCircle,
  Sparkles,
  HeartPulse,
  PhoneCall,
  Layers,
  Info
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import patientService from '../../../services/patientService';
import locationService from '../../../services/locationService';
import schemeService from '../../../services/schemeService';
import packageMasterService from '../../../services/packageMasterService';
import locationDirectoryService from '../../../services/locationDirectoryService';
import hospitalService from '../../../services/hospitalService';
import { doctorService, AVAILABILITY_CONFIG } from '../../../services/doctorService';
import { formatDateDDMMYYYY, applicationService } from '../../../services/applicationService';
import Loader from '@/components/common/Loader/Loader';
import './ReviewApprove.css';

// Maharashtra Districts list
export const MAHARASHTRA_DISTRICTS = [
  'Thane',
  'Mumbai Suburban',
  'Mumbai City',
  'Palghar',
  'Raigad',
  'Pune',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Nagpur',
  'Kolhapur',
  'Solapur',
  'Ahmednagar',
  'Satara',
  'Jalgaon',
  'Nanded',
  'Sangli',
  'Amravati',
  'Latur',
  'Dhule',
  'Ratnagiri',
  'Sindhudurg',
  'Beed',
  'Yavatmal',
  'Buldhana',
  'Dharashiv (Osmanabad)',
  'Parbhani',
  'Jalna',
  'Wardha',
  'Bhandara',
  'Gondia',
  'Chandrapur',
  'Gadchiroli',
  'Washim',
  'Hingoli',
  'Nandurbar'
];

// Talukas by District
export const TALUKAS_BY_DISTRICT = {
  'Thane': ['Kalyan', 'Dombivli', 'Thane', 'Bhiwandi', 'Ulhasnagar', 'Ambarnath', 'Murbad', 'Shahapur'],
  'Mumbai Suburban': ['Kurla', 'Andheri', 'Borivali', 'Bandra', 'Ghatkopar', 'Mulund', 'Chembur', 'Kandivali', 'Malad'],
  'Mumbai City': ['Mumbai City', 'Colaba', 'Dadar', 'Byculla', 'Fort', 'Parel', 'Worli', 'Girgaon'],
  'Palghar': ['Palghar', 'Vasai', 'Virar', 'Dahanu', 'Wada', 'Jawhar', 'Mokhada', 'Talasari', 'Vikramgad'],
  'Raigad': ['Panvel', 'Alibag', 'Karjat', 'Pen', 'Khalapur', 'Roha', 'Mahad', 'Mangaon', 'Uran', 'Shrivardhan', 'Murud'],
  'Pune': ['Pune City', 'Haveli', 'Pimpri-Chinchwad', 'Baramati', 'Maval', 'Khed', 'Shirur', 'Junner', 'Daund', 'Indapur', 'Bhor', 'Purandar', 'Mulshi', 'Ambegaon'],
  'Nashik': ['Nashik', 'Malegaon', 'Sinnar', 'Niphad', 'Igatpuri', 'Yeola', 'Dindori', 'Kalwan', 'Baglan', 'Chandwad'],
  'Chhatrapati Sambhajinagar': ['Aurangabad', 'Paithan', 'Vaijapur', 'Gangapur', 'Kannad', 'Khuldabad', 'Sillod', 'Soegaon', 'Phulambri'],
  'Nagpur': ['Nagpur Urban', 'Nagpur Rural', 'Kamptee', 'Hingna', 'Katol', 'Savner', 'Ramtek', 'Umred', 'Narkhed', 'Kalameshwar'],
  'Kolhapur': ['Karvir', 'Hatkangale', 'Shirol', 'Kagal', 'Gadhinglaj', 'Radhanagari', 'Panhala', 'Bhudargad', 'Ajra', 'Chandgad', 'Shahuwadi'],
  'Solapur': ['Solapur North', 'Solapur South', 'Pandharpur', 'Barshi', 'Malshiras', 'Sangole', 'Karmala', 'Mohol', 'Madha', 'Akkalkot'],
  'Ahmednagar': ['Nagar', 'Rahata (Shirdi)', 'Sangamner', 'Shrirampur', 'Kopargaon', 'Nevasa', 'Shevgaon', 'Pathardi', 'Parner', 'Shrigonda', 'Akole', 'Rahuri']
};

// Case Classification Types
export const CASE_TYPE_OPTIONS = [
  'Critical / Emergency (तात्काळ / अतिदक्षता)',
  'Surgical / Planned Procedure (शस्त्रक्रिया / नियोजित)',
  'Chronic Illness & Dialysis (दीर्घकालीन आजार / डायलिसिस)',
  'Maternity & Pediatric Care (मातृत्व व बालरोग)',
  'Oncology / Cancer Care (कर्करोग उपचार)',
  'Accident / Trauma & Vascular (अपघात व ट्रॉमा)',
  'General Hospitalization (सर्वसाधारण दाखल)'
];

// Patient Care Mode (OPD / IPD)
export const PATIENT_CARE_MODE_OPTIONS = [
  'IPD (In-Patient)',
  'OPD (Out-Patient)'
];

// Package Master - Full 26 Specialties List (Direct Alphabetical List)
export const ALL_PACKAGE_MASTER_SPECIALTIES = [
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

export const SPECIALTY_CATEGORIES = [
  {
    id: 'critical_surgical',
    title: '1. Critical, Surgical & Trauma Specialties (अतिदक्षता, शस्त्रक्रिया व ट्रॉमा)',
    icon: '⚡',
    specialties: [
      'Cardiology',
      'Cardio-thoracic & Vascular surgery',
      'Neurosurgery',
      'Orthopedics',
      'General Surgery',
      'Polytrauma',
      'Burns Management',
      'Emergency Room Packages',
      'Plastic & reconstructive Surgery'
    ]
  },
  {
    id: 'organ_chronic',
    title: '2. Organ Care, Oncology & Chronic Specialties (अवयव, कर्करोग व दीर्घकालीन उपचार)',
    icon: '🩺',
    specialties: [
      'Medical Oncology',
      'Surgical Oncology',
      'Radiation Oncology',
      'Urology',
      'Interventional Neuroradiology',
      'General Medicine',
      'Infectious Diseases',
      'Organ & Tissue Transplant',
      'Mental Disorders Packages'
    ]
  },
  {
    id: 'mother_child',
    title: '3. Mother, Child, Sensory & Special Care (मातृ-बाल, बालरोग व संवेदी उपचार)',
    icon: '👶',
    specialties: [
      'Obstetrics & Gynecology',
      'Neo-natal care Packages',
      'Pediatric Medical management',
      'Pediatric surgery',
      'Pediatric cancer',
      'Ophthalmology',
      'Otorhinolaryngology',
      'Oral and Maxillofacial Surgery'
    ]
  }
];

// Clinical Specialties and mapped procedures for Package Master
export const SPECIALTY_PROCEDURES_MAP = {
  'Cardiology': [
    'Coronary Angiography (CAG)',
    'Coronary Angioplasty (PTCA / Stenting)',
    'Permanent Pacemaker Implantation (PPI)',
    'Balloon Valvuloplasty / Heart Failure Care',
    'Electrophysiological Study (EP Study)',
    'ASD / VSD / PDA Device Closure'
  ],
  'Cardio-thoracic & Vascular surgery': [
    'Coronary Artery Bypass Graft (CABG)',
    'Heart Valve Replacement (AVR / MVR / DVR)',
    'Aortic Aneurysm Repair (EVAR / Open)',
    'Thoracotomy & Lung Lobectomy',
    'Peripheral Vascular Bypass / Thrombectomy'
  ],
  'Neurosurgery': [
    'Emergency Craniotomy for Hematoma / Trauma',
    'Brain Tumor Micro-Surgical Resection',
    'VP Shunt Insertion for Hydrocephalus',
    'Spine Lumbar / Cervical Decompression & Fusion',
    'Endovascular Coiling for Brain Aneurysm'
  ],
  'Orthopedics': [
    'Total Knee Replacement (TKR)',
    'Total Hip Replacement (THR)',
    'Complex Fracture ORIF & Plating',
    'Spine Decompression & Instrumentation',
    'Arthroscopic ACL / PCL Reconstruction',
    'Pediatric Deformity Correction'
  ],
  'General Surgery': [
    'Laparoscopic Cholecystectomy (Gallbladder)',
    'Laparoscopic Appendectomy',
    'Hernioplasty (Complex Inguinal Mesh Repair)',
    'Emergency Laparotomy for Intestinal Perforation',
    'Thyroidectomy / Hydrocele / Varicocele Surgery'
  ],
  'Polytrauma': [
    'Emergency Polytrauma Resuscitation & Stabilization',
    'External Fixation of Open Fractures',
    'Pelvic Fracture Stabilization',
    'Extensive Soft Tissue Debridement & Reconstruction'
  ],
  'Burns Management': [
    'Thermal & Scald Burns Inpatient Care',
    'Tangential Burn Excision & Skin Grafting',
    'Post-Burn Contracture Release Surgery',
    'Chemical & Electrical Burn Critical Protocol'
  ],
  'Emergency Room Packages': [
    'Cardiopulmonary Emergency Resuscitation',
    'Laceration - Suturing / Trauma Dressing',
    'Emergency Hematuria & Acute Care Protocol',
    'Acute Poisoning & Animal Bite Management'
  ],
  'Plastic & reconstructive Surgery': [
    'Microvascular Free Flap Reconstruction',
    'Cleft Lip and Palate Repair',
    'Tendon & Nerve Reconstruction',
    'Maxillofacial Soft Tissue Reconstruction'
  ],
  'Medical Oncology': [
    'Chemotherapy Regimen Cycles',
    'Immunotherapy & Targeted Biological Therapy',
    'Bone Marrow Biopsy & Supportive Cancer Care',
    'Port-A-Cath Insertion for Chemotherapy'
  ],
  'Surgical Oncology': [
    'Modified Radical Mastectomy (Breast)',
    'Head & Neck Tumor Resection & Micro-Flap',
    'Gastrointestinal Cancer Resection (Gastrectomy / Colectomy)',
    'Gynecological Onco-Surgery (Radical Hysterectomy)',
    'Musculoskeletal Limb Salvage Onco-Surgery'
  ],
  'Radiation Oncology': [
    'Intensity Modulated Radiation Therapy (IMRT)',
    'Image Guided Radiation Therapy (IGRT)',
    'Stereotactic Body Radiotherapy (SBRT)',
    'Brachytherapy (High Dose Rate HDR)'
  ],
  'Urology': [
    'Maintenance Hemodialysis (MHD)',
    'PCNL / URSL Laser Kidney Stone Removal',
    'Transurethral Resection of Prostate (TURP)',
    'AV Fistula Creation for Dialysis Access',
    'Ureteric Stenting (DJ Stent Insertion / Removal)',
    'Nephrectomy (Laparoscopic / Open)'
  ],
  'Interventional Neuroradiology': [
    'Catheter Directed Acute Stroke Thrombolysis',
    'Mechanical Thrombectomy for Ischemic Stroke',
    'AVM & Dural Fistula Embolization',
    'Carotid Artery Stenting (CAS)'
  ],
  'General Medicine': [
    'Infectious Disease & Sepsis Protocol',
    'Severe Pneumonia & Respiratory Failure Management',
    'Uncontrolled Diabetes & Ketoacidosis (DKA) ICU Care',
    'Acute Liver Failure / Hepatic Encephalopathy Protocol',
    'Hypertensive Crisis & Multi-System Medical Care'
  ],
  'Infectious Diseases': [
    'Severe Viral / Bacterial Infection Isolation Protocol',
    'Systemic Fungal Infection Anti-Mycotics Protocol',
    'Multi-Drug Resistant (MDR) Tuberculosis Care',
    'Tropical Infections (Dengue Shock / Malaria Critical Care)'
  ],
  'Organ & Tissue Transplant': [
    'Renal (Kidney) Transplant Pre-Op & Surgery',
    'Liver Transplant Inpatient Workup & Protocol',
    'Corneal Tissue Transplant (Keratoplasty)',
    'Bone Marrow / Stem Cell Transplant Workup'
  ],
  'Mental Disorders Packages': [
    'Acute Psychiatric Crisis Intervention & De-escalation',
    'Substance De-addiction & Rehabilitation Management',
    'Severe Depressive Disorder Inpatient Protocol',
    'Psychotherapy & Neuro-Psychiatric Evaluation'
  ],
  'Obstetrics & Gynecology': [
    'Emergency Lower Segment Cesarean Section (LSCS)',
    'High-Risk Pregnancy Intensive Monitoring',
    'Total Laparoscopic Hysterectomy (TLH)',
    'Ectopic Pregnancy Laparoscopic Salpingectomy',
    'Eclampsia / PPH Critical Resuscitation',
    'Cervical Encircling / Cerclage'
  ],
  'Neo-natal care Packages': [
    'NICU Level III Mechanical Ventilation',
    'Surfactant Therapy for Preterm Respiratory Distress',
    'Phototherapy & Exchange Transfusion for Jaundice',
    'Neonatal Sepsis & Hypothermia Intensive Care'
  ],
  'Pediatric Medical management': [
    'Pediatric Severe Sepsis & Shock Management',
    'Status Epilepticus & Pediatric Neuro Care',
    'Severe Dehydration & Malnutrition Rehabilitation',
    'Pediatric Acute Asthma & Bronchiolitis Protocol'
  ],
  'Pediatric surgery': [
    'Congenital Diaphragmatic Hernia Repair',
    'Tracheoesophageal Fistula (TEF) Correction',
    'Anorectal Malformation (PSARP) Surgery',
    'Pediatric Herniotomy & Orchidopexy'
  ],
  'Pediatric cancer': [
    'Pediatric Leukemia Induction Chemotherapy',
    'Retinoblastoma Multimodal Management',
    'Wilms Tumor & Neuroblastoma Multidisciplinary Care',
    'Pediatric Central Line & Bone Marrow Aspiration'
  ],
  'Ophthalmology': [
    'Phacoemulsification with Foldable IOL (MICS)',
    'Manual Small Incision Cataract Surgery (SICS)',
    'Vitrectomy & Retinal Laser Photocoagulation',
    'Glaucoma Trabeculectomy & Valve Implantation',
    'Corneal Grafting / Keratoplasty',
    'Pediatric Strabismus / Squint Correction'
  ],
  'Otorhinolaryngology': [
    'Functional Endoscopic Sinus Surgery (FESS)',
    'Tympanoplasty & Mastoidectomy for CSOM',
    'Tonsillectomy & Adenoidectomy',
    'Septoplasty & Microlaryngeal Surgery'
  ],
  'Oral and Maxillofacial Surgery': [
    'Maxillofacial Trauma / Mandible Fracture Fixation',
    'Temporomandibular Joint (TMJ) Arthroscopy',
    'Orthognathic Jaw Correction Surgery',
    'Oral Cysts & Tumor Enucleation with Reconstruction'
  ]
};

// Helper to extract clean human-readable document title
export const getCleanDocTitle = (doc) => {
  if (!doc) return 'Document';
  if (typeof doc === 'string') {
    if (doc.startsWith('rn_image_picker_') || doc.startsWith('doc_record_') || doc.length > 32) {
      return 'Applicant Uploaded Document';
    }
    return doc;
  }
  const rawName = (doc.name || doc.file_name || doc.fileName || doc.title || '').trim();
  const docCategory = (doc.category || doc.doc_type || doc.type || '').trim().toLowerCase();

  if (rawName && !rawName.startsWith('rn_image_picker_') && !rawName.startsWith('doc_record_') && rawName.length <= 32) {
    return rawName;
  }

  const cat = String(docCategory || rawName).toLowerCase();
  if (cat.includes('medical') || cat.includes('doctor') || cat.includes('referral') || cat.includes('prescription')) {
    return 'Doctor Medical Referral & Prescription Slip';
  }
  if (cat.includes('identity') || cat.includes('aadhaar') || cat.includes('id') || cat.includes('proof')) {
    return 'Citizen Identity Document (Aadhaar / ID Proof)';
  }
  if (cat.includes('income') || cat.includes('ration') || cat.includes('financial') || cat.includes('tahsildar')) {
    return 'Income & Ration Card Eligibility Proof';
  }
  if (cat.includes('hospital') || cat.includes('discharge') || cat.includes('bill') || cat.includes('estimate') || cat.includes('pre-auth')) {
    return 'Hospital Record / Clinical Pre-Auth';
  }
  return rawName || 'Applicant Uploaded Document';
};

// Helper to match hospital empanelment with selected scheme
const checkHospitalMatchesScheme = (hosp, targetScheme) => {
  if (!hosp || !targetScheme) return true;
  const target = String(targetScheme).toLowerCase().trim();

  const hospSchemes = [
    hosp.scheme,
    hosp.schemes,
    hosp.empanelledSchemes,
    hosp.empanelled_schemes,
    ...(Array.isArray(hosp.schemes) ? hosp.schemes : []),
    ...(Array.isArray(hosp.empanelledSchemes) ? hosp.empanelledSchemes : [])
  ]
    .filter(Boolean)
    .map(s => String(typeof s === 'object' ? s.name || s.schemeName || s.code || '' : s).toLowerCase())
    .join(' ');

  if (!hospSchemes) return hosp.type === 'Government';
  if (hospSchemes.includes(target)) return true;

  // Scheme aliases & keywords
  if (target.includes('pmjay') || target.includes('pm-jay') || target.includes('ayushman')) {
    return hospSchemes.includes('pm-jay') || hospSchemes.includes('pmjay') || hospSchemes.includes('ayushman') || hosp.type === 'Government';
  }
  if (target.includes('mjpjay') || target.includes('jyotirao') || target.includes('phule')) {
    return hospSchemes.includes('mjpjay') || hospSchemes.includes('phule') || hospSchemes.includes('jyotirao') || hosp.type === 'Government';
  }
  if (target.includes('cmrf') || target.includes('chief minister')) {
    return hospSchemes.includes('cmrf') || hospSchemes.includes('relief') || hosp.type === 'Government' || hospSchemes.includes('mjpjay') || hospSchemes.includes('pm-jay');
  }
  if (target.includes('mpkay') || target.includes('police')) {
    return hospSchemes.includes('mpkay') || hospSchemes.includes('police') || hosp.type === 'Government' || hospSchemes.includes('pm-jay');
  }
  if (target.includes('rbsk') || target.includes('bal')) {
    return hospSchemes.includes('rbsk') || hospSchemes.includes('bal') || hospSchemes.includes('pediatric') || hosp.type === 'Government';
  }
  if (target.includes('pmnrf') || target.includes('prime minister')) {
    return hospSchemes.includes('pmnrf') || hospSchemes.includes('pm-jay') || hosp.type === 'Government';
  }
  if (target.includes('mla') || target.includes('mp') || target.includes('charitable')) {
    return true; // Empanelled hospitals accept MLA/MP fund & Charitable assistance
  }

  const words = target.split(/[\s\-()/,]+/).filter(w => w.length > 2);
  return words.some(w => hospSchemes.includes(w)) || hosp.type === 'Government';
};

// Helper to match hospital specialties with patient condition
const checkHospitalMatchesCondition = (hosp, conditionStr, caseTypeDesc) => {
  if (!hosp) return { isMatch: false, matchedSpecialty: '' };

  const textToMatch = `${conditionStr || ''} ${caseTypeDesc || ''}`.toLowerCase();
  if (!textToMatch.trim()) return { isMatch: true, matchedSpecialty: 'General' };

  const specs = Array.isArray(hosp.specialties)
    ? hosp.specialties
    : typeof hosp.specialties === 'string'
      ? hosp.specialties.split(/[,|;]/)
      : [];

  const allSpecStr = specs.map(s => String(s)).join(' ').toLowerCase();

  const conditionRules = [
    {
      keywords: ['cardiac', 'heart', 'angio', 'bypass', 'stent', 'cicu', 'chest pain', 'cardiology', 'हृदय', 'हृदयरोग'],
      specialtyKeywords: ['cardiology', 'cardiac', 'cathlab', 'कॅथलॅब', 'हृदयरोग'],
      label: 'Cardiology'
    },
    {
      keywords: ['neuro', 'brain', 'stroke', 'head injury', 'paralysis', 'neurosurgery', 'मेंदू', 'मेंदू शस्त्रक्रिया'],
      specialtyKeywords: ['neurosurgery', 'neurology', 'मेंदू शस्त्रक्रिया', 'मेंदू'],
      label: 'Neurosurgery'
    },
    {
      keywords: ['cancer', 'onco', 'chemo', 'radiation', 'tumor', 'oncology', 'कर्करोग'],
      specialtyKeywords: ['oncology', 'chemo', 'cancer', 'कर्करोग'],
      label: 'Oncology'
    },
    {
      keywords: ['kidney', 'renal', 'dialysis', 'nephro', 'urinary', 'डायलिसिस'],
      specialtyKeywords: ['hemodialysis', 'dialysis', 'nephrology', 'renal', 'डायलिसिस'],
      label: 'Hemodialysis'
    },
    {
      keywords: ['eye', 'cataract', 'vision', 'retina', 'cornea', 'ophthalmology', 'नेत्र', 'मोतीबिंदू'],
      specialtyKeywords: ['ophthalmology', 'eye', 'cataract', 'नेत्ररोग', 'मोतीबिंदू'],
      label: 'Ophthalmology'
    },
    {
      keywords: ['bone', 'fracture', 'ortho', 'joint', 'knee', 'hip', 'spine', 'अस्थिरोग'],
      specialtyKeywords: ['orthopedics', 'ortho', 'joint', 'spine', 'अस्थिरोग'],
      label: 'Orthopedics'
    },
    {
      keywords: ['pediatric', 'child', 'infant', 'baby', 'nicu', 'picu', 'rbsk', 'bal', 'बालरोग'],
      specialtyKeywords: ['pediatric', 'picu', 'nicu', 'बालरोग'],
      label: 'Pediatric ICU'
    },
    {
      keywords: ['trauma', 'accident', 'vascular', 'wound', 'vascular surgery', 'रक्तवाहिनी'],
      specialtyKeywords: ['trauma', 'vascular', 'रक्तवाहिनी शस्त्रक्रिया', 'emergency', 'trauma vascular'],
      label: 'Trauma & Vascular'
    },
    {
      keywords: ['maternity', 'pregnancy', 'delivery', 'gynae', 'obstetric', 'स्त्रीरोग'],
      specialtyKeywords: ['maternity', 'gynecology', 'obstetrics', 'pediatric icu', 'स्त्रीरोग'],
      label: 'Maternity / Gynae'
    },
    {
      keywords: ['pulmonary', 'tb', 'tuberculosis', 'lung', 'respiratory', 'asthma', 'श्वसनरोग'],
      specialtyKeywords: ['pulmonary', 'respiratory', 'general medicine', 'श्वसनरोग'],
      label: 'Pulmonary / General'
    },
    {
      keywords: ['surgery', 'operation', 'surgical', 'appendix', 'hernia'],
      specialtyKeywords: ['general surgery', 'surgery', 'trauma'],
      label: 'General Surgery'
    }
  ];

  for (const rule of conditionRules) {
    const conditionMatches = rule.keywords.some(k => textToMatch.includes(k));
    if (conditionMatches) {
      const hospitalHasSpecialty = rule.specialtyKeywords.some(sk => allSpecStr.includes(sk));
      if (hospitalHasSpecialty) {
        return { isMatch: true, matchedSpecialty: rule.label };
      }
    }
  }

  if (allSpecStr.includes('general') || hosp.type === 'Government') {
    return { isMatch: true, matchedSpecialty: 'General Medicine' };
  }

  return { isMatch: false, matchedSpecialty: '' };
};

// Helper to determine if a document was uploaded or requested from Arogya Sevak
const isSevakDocument = (doc) => {
  if (!doc) return false;

  // 1. Explicit Sevak flags have top priority
  if (doc.is_sevak_upload === true || doc.isSevakUpload === true) return true;
  if (doc.uploaded_by_role === 'AROGYA_SEVAK' || doc.uploaded_by_role === 'SEVAK') return true;
  if (doc.uploaderRole === 'ArogyaSevak' || doc.uploaderRole === 'SEVAK' || doc.uploaderRole === 'sevak') return true;
  if (doc.uploadedBy === 'sevak' || doc.uploadedBy === 'ArogyaSevak') return true;
  if (doc.requestedFrom === 'sevak' || doc.requested_from === 'sevak') return true;
  if (doc.status === 'PENDING_SEVAK_UPLOAD' || doc.document_status === 'PENDING_SEVAK_UPLOAD') return true;
  if (typeof doc.source === 'string' && (doc.source.toLowerCase() === 'arogyasevak upload' || doc.source.toLowerCase() === 'sevak upload' || doc.source.toLowerCase() === 'hospital_ward')) return true;

  return false;
};

export const ReviewApprove = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEscalationId = searchParams.get('escalationId');
  const urlSpecialty = searchParams.get('specialty');

  const {
    operator,
    cases,
    hospitals,
    arogyaSevaks,
    schemes = [],
    escalationRequests = [],
    transferHospitalEscalation,
    approveCase,
    rejectCase,
    holdCase,
    reopenCase,
    getReopenInfo,
    setActiveModal,
    verifyDocument,
    updateCaseStatus,
    showToast
  } = useAdmin();

  // Find target case with cached/context fallback
  const contextCase = (cases && cases.find(c => c.id === id || c.caseId === id || c.applicationNumber === id || c.uuid === id)) || applicationService.getCachedApplicationById?.(id) || null;
  const [fetchedCase, setFetchedCase] = useState(() => contextCase);
  const [loading, setLoading] = useState(() => !contextCase);

  const refreshCase = useCallback(() => {
    if (!id) return;
    applicationService.fetchApplicationById(id)
      .then((res) => {
        if (res?.success && res.data) {
          setFetchedCase(res.data);
        }
      })
      .catch((err) => {
        console.warn('[ReviewApprove] Could not fetch live case details:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    refreshCase();
    // Real-time live polling for multi-admin collaboration (every 5 seconds)
    const syncTimer = setInterval(refreshCase, 5000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') refreshCase();
    };
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCase]);

  const caseItem = fetchedCase
    ? {
      ...contextCase,
      ...fetchedCase,
      status: fetchedCase.status || contextCase?.status,
      current_status: fetchedCase.current_status || contextCase?.current_status || fetchedCase.status || contextCase?.status,
      reviewedByAdminId: fetchedCase.reviewedByAdminId || fetchedCase.reviewed_by_admin_id || contextCase?.reviewedByAdminId || contextCase?.reviewed_by_admin_id || null,
      reviewedByAdminName: fetchedCase.reviewedByAdminName || fetchedCase.reviewed_by_admin_name || contextCase?.reviewedByAdminName || contextCase?.reviewed_by_admin_name || null,
      reviewed_by_admin_id: fetchedCase.reviewed_by_admin_id || fetchedCase.reviewedByAdminId || contextCase?.reviewed_by_admin_id || contextCase?.reviewedByAdminId || null,
      reviewed_by_admin_name: fetchedCase.reviewed_by_admin_name || fetchedCase.reviewedByAdminName || contextCase?.reviewed_by_admin_name || contextCase?.reviewedByAdminName || null,
      documents: (fetchedCase.documents && fetchedCase.documents.length > 0)
        ? fetchedCase.documents
        : (contextCase?.documents || [])
    }
    : (contextCase || {});
  const reopenInfo = getReopenInfo(caseItem);

  const handleClaimCase = (caseId, adminName) => {
    const targetName = adminName || operator?.name || 'Admin';
    claimCase(caseId, targetName);
    if (setFetchedCase) {
      setFetchedCase((prev) => prev ? ({
        ...prev,
        reviewedByAdminId: operator?.id || prev.reviewedByAdminId,
        reviewedByAdminName: targetName,
        reviewed_by_admin_id: operator?.id || prev.reviewed_by_admin_id,
        reviewed_by_admin_name: targetName,
        isClaimed: true,
      }) : prev);
    }
  };

  const handleUnclaimCase = (caseId) => {
    unclaimCase(caseId);
    if (setFetchedCase) {
      setFetchedCase((prev) => prev ? ({
        ...prev,
        reviewedByAdminId: null,
        reviewedByAdminName: null,
        reviewed_by_admin_id: null,
        reviewed_by_admin_name: null,
        isClaimed: false,
      }) : prev);
    }
  };

  const [sevakPatientData, setSevakPatientData] = useState(null);

  useEffect(() => {
    if (caseItem?.id) {
      patientService.getPatientById(caseItem.id).then(data => {
        if (data) setSevakPatientData(data);
      }).catch(err => console.log('Error loading Sevak patient record:', err));
    }
  }, [caseItem?.id]);

  // Active step tab (1: Doc Verification, 2: Hospital & Sevak, 3: Notes & WhatsApp, 4: Approve & Assign)
  const [activeStepTab, setActiveStepTab] = useState(1);


  // Dynamic schemes from database
  const [dbSchemes, setDbSchemes] = useState([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSchemesFromDb() {
      try {
        setLoadingSchemes(true);
        const res = await schemeService.fetchSchemes();
        const list = res?.data || [];
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const activeList = list.filter(s => s.status !== 'Inactive' && s.is_active !== false);
          setDbSchemes(activeList.length > 0 ? activeList : list);
        }
      } catch (err) {
        console.warn('[ReviewApprove] Failed to load schemes from DB:', err);
      } finally {
        if (isMounted) setLoadingSchemes(false);
      }
    }
    loadSchemesFromDb();
    return () => { isMounted = false; };
  }, []);

  const availableSchemes = useMemo(() => {
    if (dbSchemes && dbSchemes.length > 0) {
      const dbList = dbSchemes
        .map(s => {
          if (typeof s === 'string') return s;
          const name = s.name || s.scheme_name || s.schemeName;
          const code = s.code || s.scheme_code || s.schemeCode;
          if (name && code && !name.toLowerCase().includes(code.toLowerCase())) {
            return `${name} (${code})`;
          }
          return name || code;
        })
        .filter(Boolean);

      if (dbList.length > 0) {
        if (caseItem?.scheme && !dbList.some(s => s.toLowerCase().includes(caseItem.scheme.toLowerCase()) || caseItem.scheme.toLowerCase().includes(s.toLowerCase()))) {
          dbList.unshift(caseItem.scheme);
        }
        return Array.from(new Set(dbList));
      }
    }

    if (schemes && schemes.length > 0) {
      const list = schemes.map(s => typeof s === 'string' ? s : s.name || s.scheme_name || s.code).filter(Boolean);
      if (caseItem?.scheme && !list.some(s => s.toLowerCase().includes(caseItem.scheme.toLowerCase()))) {
        list.unshift(caseItem.scheme);
      }
      return Array.from(new Set(list));
    }

    const fallbackList = [
      'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)',
      'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
      'Chief Minister Relief Fund (CMRF)',
      'Rashtriya Bal Swasthya Karyakram (RBSK)',
      'MP/MLA Medical Relief Fund',
      'Charitable Trust Assistance'
    ];
    if (caseItem?.scheme && !fallbackList.some(s => s.toLowerCase().includes(caseItem.scheme.toLowerCase()))) {
      fallbackList.unshift(caseItem.scheme);
    }
    return Array.from(new Set(fallbackList));
  }, [dbSchemes, schemes, caseItem?.scheme]);

  // Helper to extract applicant patient care mode / case type
  const getApplicantCareMode = useCallback((item) => {
    const raw = String(
      item?.caseType ||
      item?.type ||
      item?.case_type ||
      item?.caseTypeDesc ||
      item?.patientType ||
      item?.patient_type ||
      item?.admissionType ||
      item?.admission_type ||
      item?.careMode ||
      item?.care_mode ||
      item?.caseMode ||
      ''
    ).toUpperCase();

    if (raw.includes('OPD') || raw.includes('OUT')) return 'OPD (Out-Patient)';
    if (raw.includes('DAY')) return 'Day Care / Day Procedure';
    if (raw.includes('IPD') || raw.includes('IN')) return 'IPD (In-Patient)';
    return 'OPD (Out-Patient)';
  }, []);

  // Step 2: Patient Location & Priority State (Auto-fetched from applicant details & editable)
  const [patientDistrict, setPatientDistrict] = useState(() => caseItem?.district || caseItem?.patientDistrict || 'Pune');
  const [patientTaluka, setPatientTaluka] = useState(() => caseItem?.taluka || caseItem?.patientTaluka || 'Pune City');
  const [patientCity, setPatientCity] = useState(() => caseItem?.city || caseItem?.patientCity || caseItem?.village || caseItem?.address || 'Pune');
  const [patientCaseType, setPatientCaseType] = useState(() => caseItem?.caseType || caseItem?.caseTypeDesc || caseItem?.condition || 'Emergency');
  const [patientCareMode, setPatientCareMode] = useState(() => getApplicantCareMode(caseItem));

  // Keep location and care mode synchronized if applicant case data updates
  useEffect(() => {
    if (caseItem) {
      if (caseItem.district || caseItem.patientDistrict) {
        setPatientDistrict(caseItem.district || caseItem.patientDistrict);
      }
      if (caseItem.taluka || caseItem.patientTaluka) {
        setPatientTaluka(caseItem.taluka || caseItem.patientTaluka);
      }
      if (caseItem.city || caseItem.patientCity || caseItem.village || caseItem.address) {
        setPatientCity(caseItem.city || caseItem.patientCity || caseItem.village || caseItem.address);
      }
      setPatientCareMode(getApplicantCareMode(caseItem));
    }
  }, [caseItem, getApplicantCareMode]);

  // Dynamic Districts & Talukas from Database
  const [dbDistricts, setDbDistricts] = useState([]);
  const [dbTalukas, setDbTalukas] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetch districts from database
  useEffect(() => {
    let isMounted = true;
    async function loadDistricts() {
      try {
        const districtsData = await locationService.getDistricts();
        if (isMounted && Array.isArray(districtsData) && districtsData.length > 0) {
          const names = districtsData.map(d => typeof d === 'string' ? d : d.name || d.district_name || d.district).filter(Boolean);
          if (names.length > 0) {
            setDbDistricts(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
            return;
          }
        }
        // Fallback to directory if DB returns empty
        const fallback = locationDirectoryService.getDistricts();
        if (isMounted) setDbDistricts(fallback);
      } catch (err) {
        console.warn('[ReviewApprove] Failed to load districts from DB:', err);
        const fallback = locationDirectoryService.getDistricts();
        if (isMounted) setDbDistricts(fallback);
      }
    }
    loadDistricts();
    return () => { isMounted = false; };
  }, []);

  // Fetch talukas for currently selected district from database
  useEffect(() => {
    let isMounted = true;
    async function loadTalukas() {
      if (!patientDistrict) return;
      try {
        setLoadingLocations(true);
        const talukasData = await locationService.getTalukas(patientDistrict);
        if (isMounted && Array.isArray(talukasData) && talukasData.length > 0) {
          const names = talukasData.map(t => typeof t === 'string' ? t : t.name || t.taluka_name || t.taluka).filter(Boolean);
          if (names.length > 0) {
            setDbTalukas(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
            return;
          }
        }
        const fallback = locationDirectoryService.getTalukas(patientDistrict);
        if (isMounted) setDbTalukas(fallback.length > 0 ? fallback : ['Headquarters', 'Rural', 'Urban']);
      } catch (err) {
        console.warn(`[ReviewApprove] Failed to load talukas for ${patientDistrict}:`, err);
        const fallback = locationDirectoryService.getTalukas(patientDistrict);
        if (isMounted) setDbTalukas(fallback.length > 0 ? fallback : ['Headquarters', 'Rural', 'Urban']);
      } finally {
        if (isMounted) setLoadingLocations(false);
      }
    }
    loadTalukas();
    return () => { isMounted = false; };
  }, [patientDistrict]);

  // Dynamic Package Master Procedures Map from Database
  const [packageSpecialtyMap, setPackageSpecialtyMap] = useState({});
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [proceduresSearchQuery, setProceduresSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadPackageMap() {
      try {
        setLoadingPackages(true);
        const res = await packageMasterService.getBySpecialtyMap();
        const mapData = res?.data || res || {};
        if (isMounted && typeof mapData === 'object' && Object.keys(mapData).length > 0) {
          setPackageSpecialtyMap(mapData);
        }
      } catch (err) {
        console.warn('[ReviewApprove] Failed to load package master map from DB:', err);
      } finally {
        if (isMounted) setLoadingPackages(false);
      }
    }
    loadPackageMap();
    return () => { isMounted = false; };
  }, []);

  // Detect active specialty unavailable escalation for this case
  const activeSpecialtyEscalation = useMemo(() => {
    return (escalationRequests || []).find(r =>
      (urlEscalationId && (String(r.id) === String(urlEscalationId) || String(r.uuid) === String(urlEscalationId) || String(r.shortId) === String(urlEscalationId))) ||
      ((String(r.caseId) === String(id) || String(r.id) === String(id) || String(r.applicationId) === String(id) || (caseItem?.id && String(r.caseId) === String(caseItem.id)) || (caseItem?.applicationNumber && String(r.caseId) === String(caseItem.applicationNumber))) &&
        r.reasonType === 'specialty_unavailable' &&
        r.status !== 'resolved')
    ) || null;
  }, [escalationRequests, urlEscalationId, id, caseItem?.id, caseItem?.applicationNumber]);

  const requestedSpecialtyName = useMemo(() => {
    return (urlSpecialty || activeSpecialtyEscalation?.requiredSpecialty || '').trim();
  }, [urlSpecialty, activeSpecialtyEscalation]);

  const allAvailableSpecialties = useMemo(() => {
    return SPECIALTY_CATEGORIES.flatMap(c => c.specialties);
  }, []);

  // Step 2: Medical Specialties (Organized in 3 Sections with Checkboxes)
  const [selectedSpecialties, setSelectedSpecialties] = useState(() => {
    if (requestedSpecialtyName) {
      const matched = SPECIALTY_CATEGORIES.flatMap(c => c.specialties).find(spec =>
        spec.toLowerCase().includes(requestedSpecialtyName.toLowerCase()) ||
        requestedSpecialtyName.toLowerCase().includes(spec.toLowerCase().split(/[\s&,/]+/)[0])
      );
      return matched ? [matched] : [requestedSpecialtyName];
    }
    return [];
  });

  // Automatically pre-fill requested specialty from Sevak & switch to Step 2 so nearest hospitals are immediately displayed
  useEffect(() => {
    if (requestedSpecialtyName) {
      const matched = allAvailableSpecialties.find(spec =>
        spec.toLowerCase().includes(requestedSpecialtyName.toLowerCase()) ||
        requestedSpecialtyName.toLowerCase().includes(spec.toLowerCase().split(/[\s&,/]+/)[0])
      );
      const chosen = matched || requestedSpecialtyName;
      setSelectedSpecialties(prev => {
        if (prev.includes(chosen)) return prev;
        return [chosen];
      });
      // When arriving via specialty escalation, ensure Step 2 (Hospital & Sevak Assignment) is active
      setActiveStepTab(2);
    }
  }, [requestedSpecialtyName, allAvailableSpecialties]);

  // Compute procedures available for the selected specialties from Package Master
  const availableProceduresForSelectedSpecialties = useMemo(() => {
    if (!selectedSpecialties || selectedSpecialties.length === 0) return [];

    const result = [];
    selectedSpecialties.forEach(spec => {
      // Find matching key in packageSpecialtyMap
      const matchedKey = Object.keys(packageSpecialtyMap).find(k =>
        k.toLowerCase() === spec.toLowerCase() ||
        k.toLowerCase().includes(spec.toLowerCase()) ||
        spec.toLowerCase().includes(k.toLowerCase())
      );
      const specData = matchedKey ? packageSpecialtyMap[matchedKey] : null;
      if (specData && Array.isArray(specData.procedures) && specData.procedures.length > 0) {
        specData.procedures.forEach(p => {
          const procCode = p.procedure_code || p.package_code || '';
          const procName = p.procedure_name || p.package_name || '';
          const formatted = procCode ? `${procName} (${procCode})` : procName;
          result.push({
            specialty: spec,
            code: procCode,
            name: procName,
            displayName: formatted,
            estimatedCost: p.estimated_cost || 0
          });
        });
      } else {
        // Static fallback for specialty if not yet populated in DB
        const staticProcs = SPECIALTY_PROCEDURES_MAP[spec] || [
          `${spec} - Inpatient Clinical Evaluation`,
          `${spec} - Specialized Medical Management`,
          `${spec} - Surgical / Interventional Package`
        ];
        staticProcs.forEach(p => {
          result.push({
            specialty: spec,
            code: '',
            name: p,
            displayName: p,
            estimatedCost: 0
          });
        });
      }
    });

    return result;
  }, [selectedSpecialties, packageSpecialtyMap]);

  // Group available procedures by specialty for categorized section display
  const proceduresGroupedBySpecialty = useMemo(() => {
    if (!selectedSpecialties || selectedSpecialties.length === 0) return [];

    return selectedSpecialties.map(spec => {
      const items = availableProceduresForSelectedSpecialties.filter(p => p.specialty === spec);
      return {
        specialty: spec,
        items
      };
    }).filter(group => group.items.length > 0);
  }, [selectedSpecialties, availableProceduresForSelectedSpecialties]);

  const [specialtyDropdownOpen, setSpecialtyDropdownOpen] = useState(false);
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState('');

  const selectedSpecialty = useMemo(() => {
    return selectedSpecialties.length > 0 ? selectedSpecialties.join(', ') : '';
  }, [selectedSpecialties]);

  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [proceduresDropdownOpen, setProceduresDropdownOpen] = useState(false);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');

  // Helper to extract initial scheme from applicant / case details
  const getCaseInitialScheme = useCallback((item, schemesList) => {
    if (!item) return '';
    const rawTarget = (
      item.assignedScheme?.name ||
      (typeof item.assignedScheme === 'string' ? item.assignedScheme : '') ||
      item.assigned_scheme ||
      item.citizenSelectedScheme ||
      item.citizen_selected_scheme ||
      item.scheme ||
      item.appliedScheme ||
      item.applied_scheme ||
      item.suggestedScheme?.name ||
      item.suggested_scheme ||
      ''
    ).trim();

    if (!rawTarget) return '';

    const list = schemesList && schemesList.length > 0 ? schemesList : (availableSchemes || []);
    if (list.length > 0) {
      const match = list.find(s => {
        const sLower = s.toLowerCase();
        const tLower = rawTarget.toLowerCase();
        return sLower === tLower || sLower.includes(tLower) || tLower.includes(sLower);
      });
      if (match) return match;
    }
    return rawTarget;
  }, [availableSchemes]);

  // Form selections - start with scheme pre-populated from caseItem
  const [selectedScheme, setSelectedScheme] = useState(() => getCaseInitialScheme(caseItem, availableSchemes));
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSevak, setSelectedSevak] = useState('');
  const [preferredAdmissionDate, setPreferredAdmissionDate] = useState('');

  // Auto-sync selected scheme when available schemes load from database
  useEffect(() => {
    if (caseItem && availableSchemes.length > 0) {
      setSelectedScheme((prev) => {
        if (!prev) {
          return getCaseInitialScheme(caseItem, availableSchemes);
        }
        const match = availableSchemes.find(s =>
          s.toLowerCase() === prev.toLowerCase() ||
          s.toLowerCase().includes(prev.toLowerCase()) ||
          prev.toLowerCase().includes(s.toLowerCase())
        );
        return match || prev;
      });
    }
  }, [caseItem, availableSchemes, getCaseInitialScheme]);
  // Helper to extract initial priority from applicant details
  const getApplicantPriority = useCallback((item) => {
    const raw = String(item?.priority || item?.casePriority || item?.urgency || item?.caseType || item?.caseTypeDesc || '').toLowerCase();
    if (raw.includes('emerg') || raw.includes('crit') || raw.includes('urgent') || raw.includes('तात्काळ') || raw.includes('high')) {
      return 'Emergency';
    }
    return 'Regular';
  }, []);

  const [priority, setPriority] = useState(() => getApplicantPriority(caseItem));

  useEffect(() => {
    if (caseItem) {
      setPriority(getApplicantPriority(caseItem));
    }
  }, [caseItem?.priority, caseItem?.casePriority, caseItem?.urgency, caseItem?.caseType, caseItem?.caseTypeDesc, getApplicantPriority]);

  // Explicit confirmation state for steps
  const [hospitalConfirmed, setHospitalConfirmed] = useState(false);
  const [notesConfirmed, setNotesConfirmed] = useState(false);

  // Format patient address cleanly without redundant duplicates
  const patientLocationStr = useMemo(() => {
    const rawAddr = caseItem.address || caseItem.patientAddress || '';
    const city = (patientCity || caseItem.city || caseItem.village || '').trim();
    const taluka = (patientTaluka || caseItem.taluka || '').trim();
    const district = (patientDistrict || caseItem.district || '').trim();
    const pincode = (caseItem.pincode || '').trim();

    if (city && district && city.toLowerCase() === district.toLowerCase() && (!taluka || taluka.toLowerCase() === district.toLowerCase() || taluka.toLowerCase() === `${district.toLowerCase()} city` || (taluka.toLowerCase() === 'pune city' && district.toLowerCase() !== 'pune'))) {
      const parts = [city];
      if (pincode) parts.push(pincode);
      return parts.join(', ');
    }

    const parts = [];
    if (city) parts.push(city);
    if (taluka && !city.toLowerCase().includes(taluka.toLowerCase()) && taluka.toLowerCase() !== district.toLowerCase() && !(taluka.toLowerCase() === 'pune city' && district.toLowerCase() !== 'pune')) {
      parts.push(`${taluka} Taluka`);
    }
    if (district && !city.toLowerCase().includes(district.toLowerCase())) {
      parts.push(district);
    }
    if (pincode && !parts.some(p => p.includes(pincode))) {
      parts.push(pincode);
    }

    return parts.length > 0 ? parts.join(', ') : (rawAddr || district || 'Satara');
  }, [patientCity, patientTaluka, patientDistrict, caseItem]);

  // Calculate realistic distance and priority score for each hospital
  const proximityHospitals = useMemo(() => {
    const query = (hospitalSearchQuery || '').toLowerCase().trim();
    const hasSchemeFilter = Boolean(selectedScheme && selectedScheme.trim());
    const hasSpecialtyFilter = Boolean(selectedSpecialties && selectedSpecialties.length > 0);
    const hasProceduresFilter = Boolean(selectedProcedures && selectedProcedures.length > 0);

    const cCity = (patientCity || '').toLowerCase().trim();
    const cTaluka = (patientTaluka || '').toLowerCase().trim();
    const cDistrict = (patientDistrict || '').toLowerCase().trim();

    return (hospitals || [])
      .map((h, idx) => {
        const label = h.name.includes(h.location) ? h.name : `${h.name}, ${h.location}`;
        const schemeMatch = checkHospitalMatchesScheme(h, selectedScheme);

        // Strict specialty match with selected specialties
        const rawHospSpecs = Array.isArray(h.specialties) ? h.specialties : (typeof h.specialties === 'string' ? h.specialties.split(/[,|;]/) : []);
        const rawHospSpecsLower = rawHospSpecs.map(s => s.trim().toLowerCase());
        const hospSpecsBlob = rawHospSpecsLower.join(' ');
        const hospProcsBlob = (Array.isArray(h.procedures || h.packages) ? (h.procedures || h.packages).join(' ') : String(h.procedures || h.packages || '')).toLowerCase();

        const specialtyMatch = !hasSpecialtyFilter || selectedSpecialties.some((spec) => {
          const specLower = spec.toLowerCase().trim();
          if (rawHospSpecsLower.some(s => s === specLower || s.includes(specLower) || specLower.includes(s))) {
            return true;
          }
          const keyTerms = specLower.split(/[\s&,/]+/).filter(w => w.length >= 4 && !['management', 'surgery', 'department', 'general', 'vascular', 'medicine', 'care', 'center'].includes(w));
          if (keyTerms.length > 0 && keyTerms.some(t => hospSpecsBlob.includes(t) || hospProcsBlob.includes(t))) {
            return true;
          }
          if ((specLower.includes('general medicine') || specLower.includes('general surgery')) && (hospSpecsBlob.includes('general') || h.type === 'Government')) {
            return true;
          }
          return false;
        });

        // Check procedure / package match
        const procedureMatch = !hasProceduresFilter || selectedProcedures.some((proc) => {
          const procLower = proc.toLowerCase();
          if (hospProcsBlob && hospProcsBlob.includes(procLower)) return true;
          return specialtyMatch;
        });

        // Check proximity & locality hierarchy
        const hospLocStr = `${h.location || ''} ${h.address || ''} ${h.city || ''} ${h.district || ''} ${h.taluka || ''} ${h.areaTaluka || ''}`.toLowerCase();
        const cityMatch = Boolean(cCity && cCity.length > 2 && hospLocStr.includes(cCity));
        const talukaMatch = Boolean(cTaluka && cTaluka.length > 2 && hospLocStr.includes(cTaluka.split(/[\s&,/]+/)[0]));
        const districtMatch = Boolean(cDistrict && cDistrict.length > 2 && hospLocStr.includes(cDistrict));

        // Calculate realistic distance in km based on locality hierarchy & coordinates
        let dist = 5.0;
        const pLat = caseItem?.latitude || caseItem?.lat;
        const pLng = caseItem?.longitude || caseItem?.lng;
        const hLat = h.latitude || h.lat;
        const hLng = h.longitude || h.lng;

        if (pLat && pLng && hLat && hLng) {
          const R = 6371;
          const dLat = ((Number(hLat) - Number(pLat)) * Math.PI) / 180;
          const dLon = ((Number(hLng) - Number(pLng)) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((Number(pLat) * Math.PI) / 180) *
            Math.cos((Number(hLat) * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          dist = Math.round(R * c * 10) / 10;
        } else {
          // Stable geographic offset calculation based on hospital name hash
          const hash = (h.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const offset = Number(((hash % 15) * 0.2 + 0.3).toFixed(1));

          if (cityMatch) {
            dist = Number((1.5 + offset).toFixed(1)); // Same City/Ward: 1.5 - 4.5 km
          } else if (talukaMatch) {
            dist = Number((4.0 + offset * 1.3).toFixed(1)); // Same Taluka: 4.0 - 8.0 km
          } else if (districtMatch) {
            dist = Number((9.0 + offset * 2.5).toFixed(1)); // Same District: 9.0 - 20.0 km
          } else {
            dist = Number((26.0 + offset * 3.5).toFixed(1)); // Adjacent District: 26.0+ km
          }
        }

        // Priority Scoring Algorithm:
        // +10: Same City + Specialty + Scheme
        // +8: Same Taluka + Specialty + Scheme
        // +5: Same District + Specialty + Scheme
        let priorityScore = 0;
        if (cityMatch) priorityScore += 10;
        else if (talukaMatch) priorityScore += 8;
        else if (districtMatch) priorityScore += 5;
        if (specialtyMatch) priorityScore += 4;
        if (schemeMatch) priorityScore += 3;
        if (procedureMatch) priorityScore += 2;

        return {
          ...h,
          label,
          calculatedDistance: dist,
          schemeMatch,
          specialtyMatch,
          procedureMatch,
          cityMatch,
          talukaMatch,
          districtMatch,
          matchedSpecialty: selectedSpecialty,
          priorityScore
        };
      })
      .filter((h) => {
        // Strict filtering by scheme if a scheme is selected
        if (hasSchemeFilter && !h.schemeMatch) return false;

        // Strict filtering by specialty if specialties are selected
        if (hasSpecialtyFilter && !h.specialtyMatch) return false;

        // Strict filtering by procedures/packages if procedures are selected
        if (hasProceduresFilter && !h.procedureMatch) return false;

        // Filter by search query if provided
        if (query) {
          const haystack = `${h.name} ${h.location} ${h.address || ''} ${h.city || ''} ${h.district || ''} ${h.taluka || ''} ${Array.isArray(h.specialties) ? h.specialties.join(' ') : h.specialties || ''}`.toLowerCase();
          return haystack.includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        // Highest priority score first (City/Taluka/District match first), then shortest distance
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return a.calculatedDistance - b.calculatedDistance;
      });
  }, [hospitals, selectedScheme, selectedSpecialties, selectedProcedures, selectedSpecialty, patientCity, patientDistrict, patientTaluka, caseItem?.latitude, caseItem?.lat, caseItem?.longitude, caseItem?.lng, hospitalSearchQuery]);

  // Currently matched hospital
  const matchedHosp = useMemo(() => {
    if (!selectedHospital) return null;
    return (hospitals || []).find(h => {
      const label = h.name.includes(h.location) ? h.name : `${h.name}, ${h.location}`;
      return selectedHospital.includes(h.name) || label === selectedHospital || h.name === selectedHospital;
    }) || null;
  }, [selectedHospital, hospitals]);

  // Dynamic hospital sevaks from backend API
  const [hospitalSpecificSevaks, setHospitalSpecificSevaks] = useState([]);
  const [loadingHospitalSevaks, setLoadingHospitalSevaks] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSevaksForMatchedHosp() {
      if (!matchedHosp || !matchedHosp.id) {
        setHospitalSpecificSevaks([]);
        return;
      }
      try {
        setLoadingHospitalSevaks(true);
        const res = await hospitalService.fetchHospitalSevaks(matchedHosp.id);
        const list = res?.data?.sevaks || (Array.isArray(res?.data) ? res.data : []);
        if (isMounted) {
          setHospitalSpecificSevaks(list.map(s => ({
            id: s.id || s.sevak_id,
            name: s.name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Arogya Sevak',
            phone: s.phone || s.mobile || s.phone_number || '—',
            mobile: s.mobile || s.phone || s.phone_number || '—',
            hospital: matchedHosp.name,
            patients: s.patients || s.active_cases || s.activeCases || 0,
            status: s.status || 'ACTIVE'
          })));
        }
      } catch (err) {
        if (isMounted) setHospitalSpecificSevaks([]);
      } finally {
        if (isMounted) setLoadingHospitalSevaks(false);
      }
    }
    loadSevaksForMatchedHosp();
    return () => { isMounted = false; };
  }, [matchedHosp?.id, matchedHosp?.name]);

  // Dynamic hospital doctors and duty roster for matched hospital
  const [hospitalSpecificDoctors, setHospitalSpecificDoctors] = useState([]);
  const [loadingHospitalDoctors, setLoadingHospitalDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadDoctorsForMatchedHosp() {
      if (!matchedHosp || !matchedHosp.id) {
        setHospitalSpecificDoctors([]);
        return;
      }
      try {
        setLoadingHospitalDoctors(true);
        const docs = await doctorService.getDoctors({ hospitalId: matchedHosp.id });
        let list = Array.isArray(docs) ? docs : (docs?.doctors || []);

        if (list.length === 0) {
          const allCached = doctorService.getCachedDoctors?.() || [];
          list = allCached.filter(d =>
            (d.hospital_id && d.hospital_id === matchedHosp.id) ||
            (d.hospital_name && (d.hospital_name.toLowerCase().includes(matchedHosp.name.toLowerCase()) || matchedHosp.name.toLowerCase().includes(d.hospital_name.toLowerCase())))
          );
        }

        // If no doctors record in DB yet, generate realistic duty specialists based on hospital specialties
        if (list.length === 0) {
          const hospSpecs = Array.isArray(matchedHosp.specialties)
            ? matchedHosp.specialties
            : (typeof matchedHosp.specialties === 'string'
                ? matchedHosp.specialties.split(/[,|;]/).map(s => s.trim()).filter(Boolean)
                : ['General Medicine', 'General Surgery']);

          const activeSpecs = selectedSpecialties.length > 0 ? [...selectedSpecialties, ...hospSpecs] : hospSpecs;
          const distinctSpecs = Array.from(new Set(activeSpecs)).slice(0, 4);

          const sampleNames = ['Dr. Rajesh Kulkarni', 'Dr. Sneha Patil', 'Dr. Anand Shinde', 'Dr. Priya Deshmukh', 'Dr. Vikram Joshi'];
          const sampleQualifications = {
            'Burns Management': 'MBBS, MS (Plastic & Burns Surgery)',
            'Cardio-thoracic & Vascular surgery': 'MBBS, MS, MCh (CTVS)',
            'Interventional Cardiology': 'MBBS, MD, DM (Cardiology)',
            'Orthopedics': 'MBBS, MS (Orthopedics), DNB',
            'Pediatric ICU': 'MBBS, MD (Pediatrics), Fellowship in PICU',
            'Neurology': 'MBBS, MD, DM (Neurology)',
            'Nephrology': 'MBBS, MD, DM (Nephrology)',
            'General Surgery': 'MBBS, MS (General Surgery)',
            'General Medicine': 'MBBS, MD (Internal Medicine)'
          };

          list = distinctSpecs.map((spec, i) => ({
            id: `DOC-HOSP-${matchedHosp.id || 'GEN'}-${i + 1}`,
            name: sampleNames[i % sampleNames.length],
            specialization: spec,
            specialties: [spec],
            qualification: sampleQualifications[spec] || 'MBBS, MS / MD Specialist',
            experience: `${7 + i * 2} Yrs Exp`,
            opd_shift: i % 2 === 0 ? 'Morning Shift' : 'Evening Shift',
            opd_timing: i % 2 === 0 ? 'Morning 8:00 AM - 1:00 PM' : 'Evening 4:00 PM - 8:00 PM',
            availability_status: i === 0 ? 'Available' : (i === 1 ? 'In OPD' : 'Emergency Duty'),
            contact_number: matchedHosp.phone || matchedHosp.contact || '9876543210',
            room_number: `OPD Room ${101 + i}`
          }));
        }

        if (isMounted) {
          setHospitalSpecificDoctors(list);
          if (list.length > 0) {
            setSelectedDoctorId(list[0].id);
          }
        }
      } catch (err) {
        if (isMounted) setHospitalSpecificDoctors([]);
      } finally {
        if (isMounted) setLoadingHospitalDoctors(false);
      }
    }
    loadDoctorsForMatchedHosp();
    return () => { isMounted = false; };
  }, [matchedHosp?.id, matchedHosp?.name, selectedSpecialties]);

  // Filter ArogyaSevaks assigned to the matched hospital
  const allocatedSevaks = useMemo(() => {
    if (!matchedHosp) return [];
    if (hospitalSpecificSevaks && hospitalSpecificSevaks.length > 0) {
      return hospitalSpecificSevaks;
    }
    if (matchedHosp.assigned_sevaks && Array.isArray(matchedHosp.assigned_sevaks) && matchedHosp.assigned_sevaks.length > 0) {
      return matchedHosp.assigned_sevaks.map(s => ({
        id: s.id || s.sevak_id,
        name: s.name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Arogya Sevak',
        phone: s.phone || s.mobile || s.phone_number || '—',
        mobile: s.mobile || s.phone || s.phone_number || '—',
        hospital: matchedHosp.name,
        patients: s.patients || s.active_cases || 0
      }));
    }
    if (arogyaSevaks && arogyaSevaks.length > 0) {
      const matched = arogyaSevaks.filter(s => {
        if (!s.hospital) return false;
        return s.hospital.toLowerCase().trim() === matchedHosp.name.toLowerCase().trim() ||
          (matchedHosp.id && (s.hospital_id === matchedHosp.id || s.hospitalId === matchedHosp.id));
      });
      return matched;
    }
    return [];
  }, [matchedHosp, hospitalSpecificSevaks, arogyaSevaks]);

  const cleanSevakName = useMemo(() => {
    if (selectedSevak) {
      return selectedSevak.includes('—') ? selectedSevak.split('—')[0].trim() : selectedSevak.trim();
    }
    return '';
  }, [selectedSevak]);

  const generateSmsMessage = (schemeName, hospName, sevakName, admDate) => {
    const sName = schemeName || selectedScheme || 'Scheme';
    const hName = hospName || selectedHospital || 'Empanelled Hospital';
    const svName = sevakName || cleanSevakName || 'ArogyaSevak';
    const dDate = admDate || preferredAdmissionDate || 'Scheduled date';
    return `Dear ${caseItem?.patient || caseItem?.applicant || 'Citizen'}, your application ${caseItem?.id || ''} has been approved under ${sName}. Please visit ${hName} on ${dDate}. Assigned ArogyaSevak: ${svName}. Our team will assist you. Call 1800-123-4567 for help.`;
  };

  const generateOperatorNote = (schemeName, hospName, sevakName, admDate) => {
    const sName = schemeName || selectedScheme || 'Scheme';
    const hName = hospName || selectedHospital || 'Empanelled Hospital';
    const svName = sevakName || cleanSevakName || 'ArogyaSevak';
    const dDate = admDate || preferredAdmissionDate || 'Scheduled date';
    return `Review completed for ${caseItem?.patient || caseItem?.applicant || 'Patient'}. Case Type: ${patientCaseType}. Specialty: ${selectedSpecialty}. Assigned Scheme: ${sName}. Assigned Hospital: ${hName}. ArogyaSevak: ${svName}. Preferred Admission: ${dDate}.`;
  };

  const [operatorNote, setOperatorNote] = useState(() =>
    caseItem?.operatorNote || ''
  );

  const [applicantSmsMessage, setApplicantSmsMessage] = useState(() =>
    caseItem?.smsMessage || ''
  );

  useEffect(() => {
    if (caseItem?.id) {
      // Sync patient location and case classification
      if (caseItem.district) setPatientDistrict(caseItem.district);
      if (caseItem.taluka) setPatientTaluka(caseItem.taluka);
      if (caseItem.city || caseItem.village || caseItem.address) {
        setPatientCity(caseItem.city || caseItem.village || caseItem.address);
      }
      if (caseItem.caseType || caseItem.caseTypeDesc || caseItem.condition) {
        setPatientCaseType(caseItem.caseType || caseItem.caseTypeDesc || caseItem.condition);
      }
      const rawMode = String(caseItem.patientType || caseItem.admissionType || caseItem.careMode || caseItem.caseMode || '').toUpperCase();
      if (rawMode.includes('OPD') || rawMode.includes('OUT')) setPatientCareMode('OPD (Out-Patient / बाह्यरुग्ण तपासणी)');
      else if (rawMode.includes('DAY')) setPatientCareMode('Day Care / Day Procedure (डे-केअर उपचार)');
      else setPatientCareMode('IPD (In-Patient / दाखल रुग्ण)');

      // Keep specialties, procedures, hospital, and sevak empty initially, but auto-fill assigned/applied scheme
      setSelectedSpecialties([]);
      setSelectedProcedures([]);
      const defaultScheme = getCaseInitialScheme(caseItem, availableSchemes);
      setSelectedScheme(defaultScheme);
      setSelectedHospital('');
      setSelectedSevak('');
      setPreferredAdmissionDate('');
      setPriority(caseItem.priority || 'High');
      setOperatorNote('');
      setApplicantSmsMessage('');
      setHospitalConfirmed(false);
      setNotesConfirmed(false);
    }
  }, [caseItem?.id]);

  // Keep sevak automatically in sync when hospital is selected
  useEffect(() => {
    if (selectedHospital && matchedHosp && allocatedSevaks.length > 0) {
      const isCurrentSevakValid = allocatedSevaks.some(s =>
        selectedSevak && (selectedSevak.includes(s.name) || s.name === selectedSevak)
      );
      if (!isCurrentSevakValid) {
        const first = allocatedSevaks[0];
        const newSevakStr = `${first.name} — ${matchedHosp.name || first.hospital} (${first.patients || 0} active cases)`;
        setSelectedSevak(newSevakStr);
        if (selectedScheme) {
          setApplicantSmsMessage(generateSmsMessage(selectedScheme, selectedHospital, first.name, preferredAdmissionDate));
          setOperatorNote(generateOperatorNote(selectedScheme, selectedHospital, first.name, preferredAdmissionDate));
        }
      }
    } else if (!selectedHospital) {
      setSelectedSevak('');
    }
  }, [selectedHospital, allocatedSevaks, matchedHosp]);

  const handleSchemeChange = (e) => {
    const schemeVal = e.target.value;
    setSelectedScheme(schemeVal);
    setHospitalConfirmed(false);

    if (selectedHospital) {
      setApplicantSmsMessage(generateSmsMessage(schemeVal, selectedHospital, cleanSevakName, preferredAdmissionDate));
      setOperatorNote(generateOperatorNote(schemeVal, selectedHospital, cleanSevakName, preferredAdmissionDate));
    }
  };

  const handleHospitalChange = (e) => {
    const hospVal = e.target.value;
    setSelectedHospital(hospVal);
    setHospitalConfirmed(false);

    if (!hospVal) {
      setSelectedSevak('');
      setApplicantSmsMessage('');
      setOperatorNote('');
      return;
    }

    // Find hospital object
    const hospObj = (hospitals || []).find(h => {
      const label = h.name.includes(h.location) ? h.name : `${h.name}, ${h.location}`;
      return hospVal.includes(h.name) || label === hospVal || h.name === hospVal;
    });

    // Automatically reflect and select Sevak for the chosen hospital
    let sevaksForHosp = [];
    if (hospObj && arogyaSevaks) {
      sevaksForHosp = arogyaSevaks.filter(s => {
        if (!s.hospital) return false;
        return s.hospital.toLowerCase().trim() === hospObj.name.toLowerCase().trim() ||
          (hospObj.id && (s.hospital_id === hospObj.id || s.hospitalId === hospObj.id));
      });
    }

    const firstSevak = sevaksForHosp[0];
    const newSevakStr = firstSevak
      ? `${firstSevak.name} — ${hospObj?.name || firstSevak.hospital} (${firstSevak.patients || 0} active cases)`
      : '';
    const cleanSv = firstSevak?.name || '';

    setSelectedSevak(newSevakStr);
    if (selectedScheme) {
      setApplicantSmsMessage(generateSmsMessage(selectedScheme, hospVal, cleanSv, preferredAdmissionDate));
      setOperatorNote(generateOperatorNote(selectedScheme, hospVal, cleanSv, preferredAdmissionDate));
    }
  };

  const handleSevakChange = (e) => {
    const sevakVal = e.target.value;
    setSelectedSevak(sevakVal);
    setHospitalConfirmed(false);
    const svClean = sevakVal.includes('—') ? sevakVal.split('—')[0].trim() : sevakVal;
    if (selectedHospital) {
      setApplicantSmsMessage(generateSmsMessage(selectedScheme, selectedHospital, svClean, preferredAdmissionDate));
      setOperatorNote(generateOperatorNote(selectedScheme, selectedHospital, svClean, preferredAdmissionDate));
    }
  };

  const handleDateChange = (formattedDate) => {
    setPreferredAdmissionDate(formattedDate);
    setHospitalConfirmed(false);
    if (selectedHospital) {
      setApplicantSmsMessage(generateSmsMessage(selectedScheme, selectedHospital, cleanSevakName, formattedDate));
      setOperatorNote(generateOperatorNote(selectedScheme, selectedHospital, cleanSevakName, formattedDate));
    }
  };

  // Step Completion States
  const isCaseApproved =
    caseItem.status === 'Treatment Started' ||
    caseItem.status === 'TREATMENT_STARTED' ||
    caseItem.status === 'Active' ||
    caseItem.status === 'Approved' ||
    caseItem.status === 'APPROVED' ||
    caseItem.status === 'Closed' ||
    caseItem.status === 'CLOSED' ||
    (typeof caseItem.status === 'string' && caseItem.status.toLowerCase().includes('approved')) ||
    caseItem.status?.includes('Bill Resolved');

  const hasHospitalSevakAssigned = Boolean(
    caseItem.hospital &&
    caseItem.hospital !== '—' &&
    caseItem.hospital !== '-' &&
    caseItem.hospital !== 'Not assigned' &&
    caseItem.hospital !== 'Government Hospital' &&
    caseItem.hospital !== 'Empanelled Hospital' &&
    caseItem.assignedSevak &&
    caseItem.assignedSevak !== 'Not assigned' &&
    caseItem.assignedSevak !== '—' &&
    caseItem.assignedSevak !== '-'
  );

  const isClosedCase = caseItem.status === 'Closed' || caseItem.status === 'CLOSED' || caseItem.status === 'Closed (Expired)';
  const citizenDocsList = (caseItem.documents || []).filter(d => !isSevakDocument(d));
  const hasCitizenDocs = citizenDocsList.length > 0;
  const isDocVerified = (d) => Boolean(
    d && (
      d.verified === true ||
      d.document_status === 'VERIFIED' ||
      d.status === 'VERIFIED' ||
      (typeof d.statusText === 'string' && d.statusText.toLowerCase().includes('verified'))
    )
  );
  const docsAllVerified = isCaseApproved || (
    hasCitizenDocs
      ? citizenDocsList.every(isDocVerified)
      : true
  );

  const step1Completed = Boolean(docsAllVerified || !hasCitizenDocs);
  const step2Completed = Boolean(hospitalConfirmed || hasHospitalSevakAssigned || isCaseApproved);
  const step3Completed = Boolean(notesConfirmed || isCaseApproved);
  const step4Completed = Boolean(isCaseApproved || isClosedCase);

  const currentAdminName = operator?.name || 'Admin';
  const reviewerName = caseItem.reviewedByAdminName || caseItem.reviewed_by_admin_name;
  const isClaimedByMe = Boolean(
    reviewerName && (
      reviewerName.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
      (operator?.id && (caseItem.reviewedByAdminId === operator.id || caseItem.reviewed_by_admin_id === operator.id))
    )
  );
  const isClaimedByOther = false;
  const isAssignedToOther = Boolean(
    reviewerName && !isClaimedByMe
  );

  const handleVerifyDoc = (doc) => {
    const docTarget = typeof doc === 'object' && doc !== null
      ? (doc.id || doc.docId || doc.file_url || doc.file_name || doc.file || doc.name)
      : doc;

    const docDisplayName = getCleanDocTitle(doc);
    const verificationRemark = `Verified: ${docDisplayName} ✓`;
    const verifierName = currentAdminName || operator?.name || 'Admin';

    // 1. Instant local state update
    setFetchedCase((prev) => {
      const base = prev || contextCase || caseItem || {};
      let matched = false;
      const updatedDocs = (base.documents || []).map((d) => {
        const isMatch = typeof doc === 'object'
          ? (d === doc || (doc.id && d.id && String(d.id) === String(doc.id)) || (doc.docId && d.docId && String(d.docId) === String(doc.docId)) || (doc.file_url && d.file_url && String(d.file_url) === String(doc.file_url)) || (doc.file_name && d.file_name && String(d.file_name) === String(doc.file_name)) || (doc.name && d.name && String(d.name) === String(doc.name)))
          : ((d.id && String(d.id) === String(docTarget)) || (d.docId && String(d.docId) === String(docTarget)) || (d.file_url && String(d.file_url) === String(docTarget)) || (d.file_name && String(d.file_name) === String(docTarget)) || (d.name && String(d.name) === String(docTarget)));

        if (isMatch && !matched) {
          matched = true;
          return {
            ...d,
            verified: true,
            status: 'VERIFIED',
            document_status: 'VERIFIED',
            statusText: 'Verified ✓',
            verificationRemark: verificationRemark,
            verification_remark: verificationRemark,
            verifiedAt: new Date().toISOString(),
            verified_at: new Date().toISOString(),
            verifiedBy: verifierName,
            verified_by: verifierName,
            verified_by_name: verifierName
          };
        }
        return d;
      });

      const updatedTimeline = [
        ...(base.timeline || []).filter(t => !t.current),
        {
          id: `tl-v-${Date.now()}`,
          title: `Verified document "${docDisplayName}" ✓`,
          by: verifierName,
          adminName: verifierName,
          role: 'Admin',
          date: new Date().toISOString(),
          time: 'Just now',
          completed: true,
          current: true
        }
      ];

      return { ...base, documents: updatedDocs, timeline: updatedTimeline };
    });

    // 2. AdminContext immediate update
    verifyDocument(caseItem.id, docTarget, verificationRemark);
    showToast(`✓ Verified: ${docDisplayName}`, 'success');
  };

  const handleProceedToStep2 = async () => {
    if (!docsAllVerified && hasCitizenDocs) {
      showToast('⚠️ Please verify all documents before proceeding to Step 2.', 'warning');
      return;
    }
    if (fetchedCase) {
      setFetchedCase((prev) => prev ? ({ ...prev, status: 'Docs Verified', current_status: 'DOCS_VERIFIED' }) : prev);
    }
    showToast('✓ Documents verified! Proceeding to Scheme, Hospital & Sevak Assignment.', 'success');
    setActiveStepTab(2);

    if (updateCaseStatus) {
      await updateCaseStatus(caseItem.id, 'Docs Verified', 'All documents verified by Admin ✓');
    }
  };

  const handleStepTabClick = (targetStep) => {
    if (targetStep === activeStepTab) return;

    // Moving backward is always allowed
    if (targetStep < activeStepTab) {
      setActiveStepTab(targetStep);
      return;
    }

    // Moving forward requires all prior steps to be completed
    if (targetStep > 1 && !step1Completed) {
      showToast('⚠️ Please verify all citizen documents (Step 1) before proceeding.', 'warning');
      return;
    }
    if (targetStep > 2 && !step2Completed) {
      showToast('⚠️ Please confirm Scheme, Hospital & Sevak Assignment (Step 2) before proceeding.', 'warning');
      return;
    }
    if (targetStep > 3 && !step3Completed) {
      showToast('⚠️ Please save Notes & WhatsApp message (Step 3) before proceeding to Final Approval.', 'warning');
      return;
    }
    setActiveStepTab(targetStep);
  };

  const handleConfirmHospitalSevak = async () => {
    if (!selectedScheme) {
      showToast('⚠️ Please select a scheme to assign.', 'warning');
      return;
    }
    if (!selectedHospital || selectedHospital === '—') {
      showToast('⚠️ Please select an empanelled hospital.', 'warning');
      return;
    }
    if (!preferredAdmissionDate) {
      showToast('⚠️ Please select a preferred admission date.', 'warning');
      return;
    }
    if (!selectedSevak || selectedSevak === 'Not assigned' || allocatedSevaks.length === 0) {
      showToast('⚠️ Please select an ArogyaSevak.', 'warning');
      return;
    }

    const targetHospName = matchedHosp?.name || selectedHospital;
    const targetHospId = matchedHosp?.id;
    const targetSevakObj = allocatedSevaks.find(s => s.name === cleanSevakName || s.name === selectedSevak) || {};
    const targetSevakPhone = targetSevakObj.mobile || targetSevakObj.contact || targetSevakObj.phone || '9823012345';

    setHospitalConfirmed(true);

    if (fetchedCase) {
      setFetchedCase((prev) => prev ? ({
        ...prev,
        status: 'Hospital, Sevak Assigned',
        current_status: 'COORDINATED',
        hospital: targetHospName,
        assignedHospital: targetHospName,
        assigned_hospital: targetHospName,
        assignedSevak: cleanSevakName,
        sevak: cleanSevakName,
        scheme: selectedScheme,
        assignedScheme: { name: selectedScheme },
        district: patientDistrict,
        taluka: patientTaluka,
        city: patientCity,
        caseType: patientCaseType,
        specialty: selectedSpecialty,
        procedures: selectedProcedures
      }) : prev);
    }

    showToast(`✓ Step 2 Confirmed: Scheme (${selectedScheme}), Hospital & Sevak Assigned (${targetHospName})`, 'success');
    setActiveStepTab(3);

    if (updateCaseStatus) {
      await updateCaseStatus(caseItem.id, 'Hospital, Sevak Assigned', `Hospital & Sevak Assigned: ${targetHospName}, ${cleanSevakName}`);
    }

    try {
      await applicationService.assignApplication(caseItem.id, {
        hospitalName: targetHospName,
        hospitalId: targetHospId,
        sevakName: cleanSevakName,
        sevakId: targetSevakObj.id,
        sevakPhone: targetSevakPhone,
        scheme: selectedScheme,
        admissionDate: preferredAdmissionDate,
        assignmentNotes: operatorNote,
        remarks: operatorNote,
        district: patientDistrict,
        taluka: patientTaluka,
        city: patientCity,
        caseType: patientCaseType,
        specialty: selectedSpecialty,
        procedures: selectedProcedures
      });
    } catch (err) {
      console.warn('[ReviewApprove] handleConfirmHospitalSevak assign notice:', err.message);
    }
  };

  const handleConfirmNotesSms = () => {
    if (!operatorNote.trim()) {
      showToast('⚠️ Please provide internal notes for ArogyaSevak.', 'warning');
      return;
    }
    if (!applicantSmsMessage.trim()) {
      showToast('⚠️ Please provide WhatsApp message for applicant.', 'warning');
      return;
    }
    setNotesConfirmed(true);
    showToast('✓ Step 3 Confirmed: Notes & WhatsApp message saved!', 'success');
    setActiveStepTab(4);
  };

  const handleApprove = async () => {
    if (!selectedSevak || allocatedSevaks.length === 0) {
      showToast('⚠️ Please select an ArogyaSevak before approving.', 'warning');
      setActiveStepTab(2);
      return;
    }
    if (fetchedCase) {
      setFetchedCase((prev) => prev ? ({ ...prev, status: 'Approved', current_status: 'APPROVED' }) : prev);
    }

    if (activeSpecialtyEscalation && transferHospitalEscalation) {
      try {
        const escId = activeSpecialtyEscalation.uuid || activeSpecialtyEscalation.id;
        await transferHospitalEscalation(escId, matchedHosp || { name: selectedHospital }, cleanSevakName, {
          notes: `Specialty transfer resolved via case approval: Assigned to ${matchedHosp?.name || selectedHospital} (${cleanSevakName}) for ${selectedSpecialty || requestedSpecialtyName}.`
        });
      } catch (err) {
        console.warn('[ReviewApprove] sync transfer escalation warning:', err.message);
      }
    }

    showToast('✓ Case successfully approved and assigned!', 'success');

    await approveCase(caseItem.id, {
      scheme: selectedScheme,
      hospital: matchedHosp?.name || selectedHospital,
      sevak: cleanSevakName,
      note: operatorNote,
      admissionDate: preferredAdmissionDate,
      smsMessage: applicantSmsMessage,
      status: 'APPROVED',
    });

    navigate(`/admin/cases/${caseItem.id}`);
  };

  const handleReject = () => {
    setActiveModal({
      type: 'reject-case',
      payload: {
        caseId: caseItem.id,
        patientName: caseItem.patient || caseItem.patientName,
        applicantName: caseItem.applicant || caseItem.applicantName,
        onConfirm: async (reason) => {
          await rejectCase(caseItem.id, reason);
          navigate('/admin/cases');
        }
      }
    });
  };

  const handleHold = () => {
    holdCase(caseItem.id, operatorNote);
    navigate('/admin/cases');
  };

  const steps = [
    {
      number: 1,
      title: 'Document Verification',
      sub: step1Completed ? '✓ Completed' : 'Pending verification',
      completed: step1Completed,
      icon: ClipboardCheck
    },
    {
      number: 2,
      title: 'Scheme, Hospital & Sevak',
      sub: step2Completed ? '✓ Completed' : 'Pending selection',
      completed: step2Completed,
      icon: Building2
    },
    {
      number: 3,
      title: 'Notes & WhatsApp Message',
      sub: step3Completed ? '✓ Completed' : 'Pending notes',
      completed: step3Completed,
      icon: MessageSquare
    },
    {
      number: 4,
      title: 'Approve & Assign Case',
      sub: step4Completed ? '✓ Approved' : 'Final step',
      completed: step4Completed,
      icon: CheckSquare
    }
  ];

  const isSelf = Boolean(
    caseItem.isSelf ||
    (caseItem.patient && caseItem.patient.toLowerCase().includes('(self)')) ||
    (caseItem.applicant && caseItem.patient && caseItem.applicant.trim().toLowerCase() === caseItem.patient.replace(/\(self\)/i, '').trim().toLowerCase()) ||
    !caseItem.patient ||
    caseItem.patient === caseItem.applicant
  );

  const isAlreadyAssigned = Boolean(
    caseItem &&
    caseItem.hospital &&
    caseItem.hospital !== '-' &&
    caseItem.hospital !== '—' &&
    caseItem.hospital !== 'Government Hospital' &&
    caseItem.hospital !== 'Empanelled Hospital' &&
    caseItem.hospital !== 'Not assigned' &&
    caseItem.hospital !== 'Unassigned'
  );

  const isSevakAlreadyAssigned = Boolean(
    caseItem &&
    caseItem.assignedSevak &&
    caseItem.assignedSevak !== '-' &&
    caseItem.assignedSevak !== '—' &&
    caseItem.assignedSevak !== 'Not assigned' &&
    caseItem.assignedSevak !== 'Unassigned'
  );

  const displayAssignedScheme = (hospitalConfirmed && selectedScheme)
    ? selectedScheme
    : (isAlreadyAssigned || isCaseApproved)
      ? (caseItem.assignedScheme?.name || caseItem.assignedScheme || caseItem.scheme)
      : null;

  const displayAssignedHospital = hospitalConfirmed
    ? (matchedHosp?.name || selectedHospital)
    : (isAlreadyAssigned ? (caseItem.hospital || caseItem.assignedHospital) : null);

  const displayAssignedSevak = hospitalConfirmed
    ? (cleanSevakName || (typeof selectedSevak === 'string' ? selectedSevak.split(' — ')[0] : (selectedSevak?.name || selectedSevak?.sevak_name || '')))
    : (isSevakAlreadyAssigned ? (typeof caseItem.assignedSevak === 'string' ? caseItem.assignedSevak.split(' — ')[0] : (caseItem.assignedSevak?.sevak_name || caseItem.sevakName || (typeof caseItem.sevak === 'string' ? caseItem.sevak : ''))) : null);

  const hasAssignedHosp = Boolean(displayAssignedHospital && displayAssignedSevak);

  const isOnHold = caseItem?.isOnHold || caseItem?.status === 'ON_HOLD' || caseItem?.status === 'On Hold' || caseItem?.status === 'Docs Required' || (caseItem?.documents || []).some(d => d.requested && !d.verified);
  const isClosedStatus = caseItem?.status === 'CLOSED' || caseItem?.status === 'Closed' || caseItem?.status === 'Closed (Expired)' || Boolean(caseItem?.isClosed);
  const isRejectedStatus = caseItem?.status === 'REJECTED' || caseItem?.status === 'Rejected' || reopenInfo.isRejected;

  let activeTimelineStep = 1;
  if (isClosedStatus || isRejectedStatus) {
    activeTimelineStep = 5;
  } else if (caseItem?.status === 'TREATMENT_STARTED' || caseItem?.status === 'Treatment Started' || caseItem?.status === 'Active') {
    activeTimelineStep = 4;
  } else if (caseItem?.status === 'COORDINATED' || caseItem?.status === 'Coordinated' || hasAssignedHosp || isCaseApproved) {
    activeTimelineStep = 3;
  } else if (caseItem?.status === 'DOCS_VERIFIED' || caseItem?.status === 'Documents Verified' || docsAllVerified) {
    activeTimelineStep = 2;
  } else {
    activeTimelineStep = 1;
  }

  const timelineSteps = [
    { num: 1, label: 'Application Received' },
    {
      num: 2,
      label: isOnHold ? 'Documents (On Hold ⏳)' : 'Documents Verified',
      isOnHold: isOnHold
    },
    { num: 3, label: 'Hospital & Sevak Assigned' },
    { num: 4, label: 'Treatment Started' },
    { num: 5, label: isClosedStatus ? 'Closed / Discharged' : (isRejectedStatus ? 'Case Rejected ✕' : 'Close case') }
  ];

  if (loading && !caseItem?.id) {
    return (
      <Loader
        fullPage
        message="Loading Case for Review & Approval..."
        subtext="Fetching documents, patient condition, and assignment parameters"
      />
    );
  }

  return (
    <div className="review-approve-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link to="/admin/cases" className="back-escalations-btn">
            <ArrowLeft size={15} />
            <span>Back to Case Queue</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Review & Approve — {caseItem.id}
            </h2>
            <span
              className="status-pill badge-status-review"
              style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
            >
              {reopenInfo.displayStatus || caseItem.status || 'Pending Review'}
            </span>

            {/* Admin Assignment Status */}
            {(() => {
              const currentAdminName = operator?.name || 'Admin';
              const reviewerName = caseItem.reviewedByAdminName || caseItem.reviewed_by_admin_name;
              const isClaimedByMe = reviewerName && (
                reviewerName.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
                (operator?.id && (caseItem.reviewedByAdminId === operator.id || caseItem.reviewed_by_admin_id === operator.id))
              );

              if (isClaimedByMe) {
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      👤 Assigned: You ({currentAdminName})
                    </span>
                    {!isClosedCase && (
                      <button
                        type="button"
                        onClick={() => handleUnclaimCase(caseItem.id)}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        title="Unassign case back to unassigned queue"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                );
              }

              if (reviewerName) {
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      👤 Assigned: {reviewerName}
                    </span>
                    {!isClosedCase && (
                      <button
                        type="button"
                        onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
                        style={{
                          border: '1px solid #86efac',
                          background: '#ffffff',
                          color: '#166534',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title={`Reassign this case to you (${currentAdminName})`}
                      >
                        Reassign to Me
                      </button>
                    )}
                  </div>
                );
              }

              if (isClosedCase) {
                return (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    👤 Case Closed
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
                  style={{
                    border: '1.5px solid #0284c7',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  title="Assign this case to yourself"
                >
                  + Assign to Me
                </button>
              );
            })()}
          </div>
        </div>

        {/* Quick Contact & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() =>
              setActiveModal({
                type: 'call',
                payload: {
                  ...caseItem,
                  callTarget: 'applicant',
                  phoneToCall: caseItem.contact || caseItem.applicantPhone || '90765 43210'
                }
              })
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#e6f9ed',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              color: '#15803d',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Phone size={14} /> Call Applicant
          </button>

          {(caseItem.relativeName || caseItem.relativeContact) && (
            <button
              onClick={() =>
                setActiveModal({
                  type: 'call',
                  payload: {
                    ...caseItem,
                    callTarget: 'relative',
                    phoneToCall: caseItem.relativeContact || caseItem.relativePhone || '98765 88990'
                  }
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: '#ccfbf1',
                border: '1px solid #99f6e4',
                borderRadius: '6px',
                color: '#0f766e',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Phone size={14} /> Call Relative
            </button>
          )}
        </div>
      </div>

      {/* Informational Banner if assigned to another Admin */}
      {isAssignedToOther && !isClosedCase && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderLeft: '5px solid #16a34a',
            borderRadius: '8px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#14532d',
            fontSize: '0.85rem',
            marginBottom: '4px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#166534', fontSize: '0.9rem' }}>👤 Assigned to Admin {reviewerName} (Multi-Admin Collaboration Active)</strong>
              <div style={{ marginTop: '2px', color: '#15803d' }}>
                You can verify documents, assign schemes, and make decisions. All actions are logged under your admin account.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#ffffff',
              color: '#166534',
              border: '1.5px solid #86efac',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reassign to Me
          </button>
        </div>
      )}

      {/* Clean & Modern Specialty Unavailable Escalation Alert Banner */}
      {activeSpecialtyEscalation && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef8ee 100%)',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#d97706'
              }}
            >
              <AlertTriangle size={20} />
            </div>

            <div style={{ flex: 1 }}>
              {/* Header line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.925rem', fontWeight: 800, color: '#92400e' }}>
                  Urgent Escalation: Required Specialty Missing
                </span>
                <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                  #{activeSpecialtyEscalation.shortId || activeSpecialtyEscalation.id}
                </span>
              </div>

              {/* Clean Metadata Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.8rem', color: '#78350f' }}>
                <span>
                  <strong>Sevak:</strong> {activeSpecialtyEscalation.submittedBy || 'Assigned Sevak'}
                </span>
                <span>•</span>
                <span>
                  <strong>Hospital:</strong> {activeSpecialtyEscalation.hospitalName || 'Current Hospital'}
                </span>
                {(requestedSpecialtyName || activeSpecialtyEscalation.requiredSpecialty) && (
                  <>
                    <span>•</span>
                    <span style={{ background: '#fde68a', color: '#78350f', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      🩺 {requestedSpecialtyName || activeSpecialtyEscalation.requiredSpecialty}
                    </span>
                  </>
                )}
              </div>

              {/* Sevak Remarks */}
              {activeSpecialtyEscalation.remarks && (
                <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '5px', fontStyle: 'italic' }}>
                  "{activeSpecialtyEscalation.remarks}"
                </div>
              )}
            </div>
          </div>

          {/* Action button to jump to hospital assignment */}
          <button
            type="button"
            onClick={() => {
              setActiveStepTab(2);
              const elem = document.querySelector('.step2-card-section');
              if (elem) elem.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              background: '#f59e0b',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#d97706')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f59e0b')}
          >
            <Building2 size={16} />
            <span>Select Nearest Hospital</span>
          </button>
        </div>
      )}

      {/* SLA Action Required Escalation Alert Banner */}
      {!isCaseApproved && !reopenInfo.isRejected && caseItem.lastReminderSentAt && (
        <div
          style={{
            background: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderLeft: '5px solid #e11d48',
            color: '#881337',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#e11d48" />
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#9f1239' }}>
                🚨 Action Required: Citizen SLA Reminder Received ({caseItem.priority || 'HIGH'} Priority)
              </strong>
              <div style={{ fontSize: '0.8rem', color: '#be123c', marginTop: '2px' }}>
                The applicant sent an urgent reminder on {new Date(caseItem.lastReminderSentAt).toLocaleString('en-IN')}. Please prioritize document verification and approval.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Reopened / 60-Day Notice Banner */}
      {reopenInfo.isRejected && (
        <div
          style={{
            background: reopenInfo.reopenRequested ? '#fefce8' : (reopenInfo.isReopenable ? '#eff6ff' : '#fef2f2'),
            border: `1px solid ${reopenInfo.reopenRequested ? '#fde047' : (reopenInfo.isReopenable ? '#bfdbfe' : '#fecaca')}`,
            color: reopenInfo.reopenRequested ? '#713f12' : (reopenInfo.isReopenable ? '#1e40af' : '#991b1b'),
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <AlertCircle size={18} color={reopenInfo.reopenRequested ? '#ca8a04' : (reopenInfo.isReopenable ? '#1d4ed8' : '#b91c1c')} />
            <div>
              <span>
                <strong>Status: {reopenInfo.displayStatus}</strong>
                {reopenInfo.reopenRequested && (
                  <span style={{ marginLeft: '8px', background: '#ca8a04', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                    🚨 Citizen Reopen Request Pending
                  </span>
                )}
                {' — '}
                {reopenInfo.reopenRequested
                  ? `Reason: "${reopenInfo.reopenRequestReason || caseItem.reopenRequestReason || 'Citizen requested case reopening'}"`
                  : `Case is eligible for reopening (${reopenInfo.daysRemaining} days left).`}
              </span>
            </div>
          </div>
          {reopenInfo.isReopenable && (
            <button
              onClick={() => reopenCase(caseItem.id, operatorNote)}
              style={{
                background: '#1d4ed8',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} style={{ display: 'inline', marginRight: '4px' }} /> {reopenInfo.reopenRequested ? 'Approve & Reopen Case' : 'Reopen Case Now'}
            </button>
          )}
        </div>
      )}

      {/* Case Already Approved Notice Banner */}
      {isCaseApproved && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderLeft: '5px solid #166534',
            color: '#14532d',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} color="#166534" />
            <span>
              <strong>Case Already Approved & Coordinated:</strong> This application has been officially verified and assigned to <strong>{caseItem.assignedSevak || 'ArogyaSevak'}</strong> at <strong>{caseItem.hospital || 'Empanelled Hospital'}</strong> under <strong>{caseItem.scheme || 'MJPJAY'}</strong>.
            </span>
          </div>
          <Link
            to={`/admin/cases/${caseItem.id}`}
            style={{
              background: '#166534',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>View Case Record</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Case Timeline & Review Progress Stepper Card */}
      <div
        className="horizontal-timeline-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Case Timeline & Review Progress
          </h3>
        </div>

        <div className="hz-timeline-stepper">
          {timelineSteps.map((st, idx) => {
            const isFinalStep = activeTimelineStep === timelineSteps.length;
            const isCompleted = st.num < activeTimelineStep || (st.num === activeTimelineStep && (isFinalStep || isClosedStatus));
            const isActive = st.num === activeTimelineStep && !isFinalStep && !isClosedStatus;
            const isLast = idx === timelineSteps.length - 1;
            const isRejectedNode = isRejectedStatus && st.num === activeTimelineStep;

            return (
              <React.Fragment key={st.num}>
                <div className="hz-timeline-step">
                  <div
                    className={`hz-timeline-node ${isRejectedNode
                      ? 'hz-node-rejected'
                      : isCompleted
                        ? 'hz-node-completed'
                        : isActive
                          ? 'hz-node-current'
                          : 'hz-node-pending'
                      }`}
                  >
                    {isRejectedNode ? (
                      <X size={14} />
                    ) : st.isOnHold ? (
                      <span style={{ fontSize: '13px' }}>⏳</span>
                    ) : isCompleted ? (
                      <Check size={14} className="hz-node-check" />
                    ) : (
                      st.num
                    )}
                  </div>
                  <div className="hz-timeline-info">
                    <span
                      className={`hz-timeline-title ${isActive ? 'title-current' : isCompleted ? 'text-green font-bold' : ''
                        }`}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={`hz-timeline-line ${(isCompleted || isActive) ? 'line-completed' : ''
                      }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Admin Action & Activity History Card */}
      {(() => {
        const actionLogs = [];
        const seenKeys = new Set();
        const applicantName = String(caseItem.applicant || caseItem.patientName || caseItem.name || caseItem.applicant_name || '').trim().toLowerCase();

        const isCitizenOrSystem = (name, role, actionTitle = '') => {
          const n = String(name || '').trim().toLowerCase();
          const r = String(role || '').trim().toLowerCase();
          const a = String(actionTitle || '').trim().toLowerCase();

          // Explicit citizen/system role
          if (r === 'citizen' || r === 'patient' || r === 'applicant' || r === 'system') return true;

          // Explicit citizen/system name
          if (n === 'citizen' || n === 'patient' || n === 'applicant' || n === 'system' || n === 'user') return true;
          if (applicantName && (n === applicantName || (applicantName.length > 3 && (n.includes(applicantName) || applicantName.includes(n))))) {
            return true;
          }

          // Initial citizen submission / upload actions
          if (
            a.includes('application submitted') ||
            a.includes('application received') ||
            a.includes('application created') ||
            a.includes('form submitted') ||
            a.includes('citizen upload') ||
            a.includes('documents uploaded') ||
            a.includes('document uploaded') ||
            a.includes('registration complete')
          ) {
            if (!n.includes('admin')) return true;
          }

          return false;
        };

        const seenDetails = new Set();
        const normalizeStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const addAction = (item) => {
          if (!item) return;
          const key = item.id ? `id_${item.id}` : `${item.action || item.title || ''}_${item.detail || ''}_${item.admin || item.by || ''}`;
          if (seenKeys.has(key)) return;

          const dNorm = normalizeStr(item.detail || item.action || '');
          if (dNorm && dNorm.length > 5) {
            for (const seen of seenDetails) {
              if (
                seen === dNorm ||
                (dNorm.includes('alldocument') && seen.includes('alldocument')) ||
                (dNorm.includes('docsverified') && seen.includes('alldocument')) ||
                (seen.includes('docsverified') && dNorm.includes('alldocument')) ||
                (dNorm.length > 15 && seen.length > 15 && (dNorm.includes(seen) || seen.includes(dNorm)))
              ) {
                return;
              }
            }
            seenDetails.add(dNorm);
          }
          seenKeys.add(key);

          // Calculate numeric timestamp for descending sort (newest at top)
          let parsedTime = 0;
          if (item.rawTimestamp) {
            const t = new Date(item.rawTimestamp).getTime();
            if (!isNaN(t)) parsedTime = t;
          } else if (item.date && item.date !== 'Recent' && item.date !== 'Recently') {
            const t = new Date(item.date).getTime();
            if (!isNaN(t)) parsedTime = t;
          } else if (item.time && item.time.includes('/')) {
            const t = new Date(item.time).getTime();
            if (!isNaN(t)) parsedTime = t;
          }

          if (!parsedTime) {
            if (item.time === 'Just now' || item.date === 'Just now') {
              parsedTime = Date.now() + 1000;
            } else if (item.time === 'Recently' || item.date === 'Recently') {
              parsedTime = Date.now();
            }
          }

          actionLogs.push({ ...item, timestamp: parsedTime });
        };

        // 1. From status_history / statusHistory (Admin changes only)
        const rawHistory = caseItem.status_history || caseItem.statusHistory || [];
        if (Array.isArray(rawHistory)) {
          rawHistory.forEach((sh, idx) => {
            const adminName = sh.by || sh.adminName || sh.changed_by_name || sh.author_name;
            const role = sh.role || sh.changed_by_role;
            const rawStatus = sh.new_status || sh.title || 'Updated';
            const actionTitle = rawStatus === 'DOCS_VERIFIED' ? 'Docs Verified' : (rawStatus === 'COORDINATED' ? 'Hospital & Sevak Assigned' : rawStatus);

            if (isCitizenOrSystem(adminName, role, actionTitle)) return;
            const displayAdmin = adminName && !['citizen', 'system', 'user'].includes(String(adminName).toLowerCase()) ? adminName : 'Admin';

            const rawTs = sh.created_at || sh.date;
            const remarkText = sh.description || sh.remark || '';
            let formattedAction = `Status Updated: ${actionTitle}`;
            let formattedDetail = remarkText || `Status changed to ${actionTitle}`;

            if (rawStatus === 'DOCS_VERIFIED' || rawStatus === 'Docs Verified' || remarkText.toLowerCase().includes('all documents verified')) {
              formattedAction = 'All Documents Verified';
              formattedDetail = 'All uploaded citizen documents verified by Admin ✓';
            } else if (remarkText.startsWith('Verified: ') || remarkText.includes('Verified document')) {
              formattedAction = 'Document Verified';
              formattedDetail = remarkText;
            }

            addAction({
              id: sh.id || `sh-${idx}`,
              action: formattedAction,
              detail: formattedDetail,
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: sh.time || (rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently'),
              date: sh.date || (rawTs ? new Date(rawTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'),
            });
          });
        }

        // 2. From timeline (Admin steps only)
        if (Array.isArray(caseItem.timeline)) {
          caseItem.timeline.forEach((t, idx) => {
            const adminName = t.by || t.adminName;
            const role = t.role;
            const actionTitle = t.title || '';

            if (isCitizenOrSystem(adminName, role, actionTitle)) return;
            const displayAdmin = adminName && !['citizen', 'system', 'user'].includes(String(adminName).toLowerCase()) ? adminName : 'Admin';

            const rawTs = t.date || t.created_at;
            addAction({
              id: t.id || `tl-${idx}`,
              action: t.title || 'Action Performed',
              detail: t.description || t.title || '',
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: t.time || (rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently'),
              date: t.date || 'Recent',
            });
          });
        }

        // 3. From adminNotes (Always admin actions, excluding automatic status mirrors)
        if (Array.isArray(caseItem.adminNotes)) {
          caseItem.adminNotes.forEach((an, idx) => {
            const adminName = an.by || an.author_name || 'Admin';
            if (isCitizenOrSystem(adminName, null, 'Admin Note')) return;
            const noteContent = an.text || an.note || '';
            if (noteContent.toLowerCase().includes('all documents verified')) return; // Mirrors status update
            const rawTs = an.created_at || an.date;
            addAction({
              id: an.id || `an-${idx}`,
              action: `Admin Note Added`,
              detail: noteContent,
              admin: adminName,
              rawTimestamp: rawTs,
              time: an.time || an.date || 'Recently',
              date: an.date || 'Recent',
            });
          });
        }

        // 4. From individual verified documents (Shows exact document title)
        (caseItem.documents || []).forEach((doc, idx) => {
          const isDocVerified = Boolean(
            doc && (
              doc.verified === true ||
              doc.document_status === 'VERIFIED' ||
              doc.status === 'VERIFIED' ||
              (typeof doc.statusText === 'string' && doc.statusText.includes('Verified')) ||
              (typeof doc.verification_remark === 'string' && doc.verification_remark.includes('Verified')) ||
              (typeof doc.verificationRemark === 'string' && doc.verificationRemark.includes('Verified'))
            )
          );
          if (isDocVerified) {
            const rawVerifier = doc.verifiedBy || doc.verified_by || doc.verified_by_name || doc.verified_by_admin_name || currentAdminName;
            const displayAdmin = rawVerifier && !['citizen', 'system', 'user', 'applicant'].includes(String(rawVerifier).toLowerCase()) ? rawVerifier : (currentAdminName || 'Admin');

            const rawTs = doc.verifiedAt || doc.verified_at || doc.uploaded_at || doc.uploadedAt;
            const docName = getCleanDocTitle(doc);
            const tsDate = rawTs ? new Date(rawTs) : null;
            const validDate = tsDate && !isNaN(tsDate.getTime());

            addAction({
              id: `doc-v-${doc.id || doc.docId || doc.file_name || doc.name || idx}`,
              action: `Document Verified: ${docName}`,
              detail: doc.verificationRemark || doc.verification_remark || `Verified: ${docName} ✓`,
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: validDate ? tsDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              date: validDate ? tsDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            });
          }
        });

        // 5. From Admin Claim/Ownership
        if (caseItem.claimedByAdmin || caseItem.claimed_by_name) {
          const claimAdmin = caseItem.claimed_by_name || caseItem.claimedByAdmin;
          if (!isCitizenOrSystem(claimAdmin, null, 'Case Claimed')) {
            const rawTs = caseItem.claimedAt || caseItem.claimed_at;
            addAction({
              id: 'claim-log',
              action: 'Case Claimed for Review',
              detail: `Assigned review ownership to ${claimAdmin}`,
              admin: claimAdmin,
              rawTimestamp: rawTs,
              time: rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently',
              date: rawTs ? new Date(rawTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            });
          }
        }

        // Sort descending: Newest actions ALWAYS at top!
        actionLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🛡️</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Admin Action History & Collaborative Activity Log
                </h4>
                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                  {actionLogs.length} admin action{actionLogs.length !== 1 ? 's' : ''} logged
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Recent actions appear at the top · Only admin actions are tracked here
              </div>
            </div>

            {actionLogs.length === 0 ? (
              <div
                style={{
                  padding: '20px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.82rem'
                }}
              >
                <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '6px' }}>🛡️</span>
                <strong style={{ color: '#334155' }}>No administrator actions recorded yet</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Actions performed by administrators (such as status updates, document verifications, assignments, and notes) will be tracked and displayed here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {actionLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '9px 12px',
                      background: idx === 0 ? '#f0fdf4' : '#ffffff',
                      border: idx === 0 ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                      borderRadius: '8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#dcfce7' : '#dbeafe',
                          color: idx === 0 ? '#15803d' : '#1d4ed8',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {log.admin ? log.admin.substring(0, 2).toUpperCase() : 'AD'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                          <span style={{ color: '#475569' }}>by</span>
                          <span style={{ color: '#1e40af', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            👤 {log.admin}
                          </span>
                          {idx === 0 && (
                            <span style={{ background: '#16a34a', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                              Latest
                            </span>
                          )}
                        </div>
                        {log.detail && log.detail !== log.action && (
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.detail}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', flexShrink: 0, textAlign: 'right', fontWeight: idx === 0 ? 700 : 500 }}>
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Structured 3-Column Applicant, Relative, Scheme Details Card + Medical Cause */}
      {(() => {
        const formatAddressDisplay = (data) => {
          if (!data) return '';
          if (typeof data === 'string') {
            data = { addressLine: data };
          }

          const rawLine = (data.addressLine || data.address_line || data.address || '').trim();
          const rawVillage = (data.village || data.villageCity || data.area || '').trim();
          const rawCity = (data.city || '').trim();
          const rawTaluka = (data.taluka || '').trim();
          const rawDistrict = (data.district || '').trim();
          const rawPin = (data.pincode || data.pin || '').trim();

          // Extract any 6-digit pincode
          let extractedPin = rawPin;
          const pinMatch = rawLine.match(/\b(\d{6})\b/);
          if (pinMatch) {
            extractedPin = pinMatch[1];
          }

          // Split rawLine by comma and clean segments
          const rawSegments = rawLine
            ? rawLine.split(',').map(s => s.trim()).filter(Boolean)
            : [];

          const segments = [];
          for (let seg of rawSegments) {
            seg = seg.replace(/\b\d{6}\b/g, '').replace(/pin\s*[-:]?\s*/gi, '').trim();
            if (seg) segments.push(seg);
          }

          // If the first segment starts with the district name (e.g. "Pune Suyog Colony"), clean leading district
          if (rawDistrict && segments.length > 0) {
            const distRegex = new RegExp(`^${rawDistrict}\\s+`, 'i');
            if (distRegex.test(segments[0]) && segments[0].length > rawDistrict.length + 2) {
              segments[0] = segments[0].replace(distRegex, '').trim();
            }
          }

          // Helper to check if a term is already present in segments (case-insensitive substring/word match)
          const containsTerm = (term) => {
            if (!term) return true;
            const clean = term.toLowerCase().replace(/\s*taluka\s*/gi, '').replace(/\s*district\s*/gi, '').trim();
            if (!clean) return true;
            return segments.some(s => {
              const sClean = s.toLowerCase();
              return sClean === clean || sClean.includes(clean) || clean.includes(sClean);
            });
          };

          // Add village / area if not already contained
          if (rawVillage && !containsTerm(rawVillage)) {
            segments.push(rawVillage);
          }

          // Add city if not already contained and not identical to district
          if (rawCity && rawCity.toLowerCase() !== rawDistrict.toLowerCase() && !containsTerm(rawCity)) {
            segments.push(rawCity);
          }

          // Add taluka if not already contained
          if (rawTaluka && !containsTerm(rawTaluka)) {
            const talukaStr = rawTaluka.toLowerCase().endsWith('taluka') ? rawTaluka : `${rawTaluka} Taluka`;
            segments.push(talukaStr);
          }

          // Add district if not already contained
          if (rawDistrict && !containsTerm(rawDistrict)) {
            segments.push(rawDistrict);
          }

          // Deduplicate consecutive or identical segments
          const uniqueSegments = [];
          const seenLower = new Set();
          for (const s of segments) {
            const norm = s.toLowerCase().trim();
            if (!norm) continue;
            if (!seenLower.has(norm)) {
              seenLower.add(norm);
              // Capitalize first letter of segment for clean presentation
              const formattedSeg = s.charAt(0).toUpperCase() + s.slice(1);
              uniqueSegments.push(formattedSeg);
            }
          }

          if (uniqueSegments.length === 0 && rawDistrict) {
            uniqueSegments.push(rawDistrict);
          }

          let formatted = uniqueSegments.join(', ');
          if (extractedPin && !formatted.includes(extractedPin)) {
            formatted = `${formatted} - ${extractedPin}`;
          }

          return formatted || 'Pune';
        };

        const patientDataObj = typeof caseItem.patient === 'object' && caseItem.patient ? caseItem.patient : {};
        const applicantDataObj = typeof caseItem.applicantObj === 'object' && caseItem.applicantObj ? caseItem.applicantObj : (typeof caseItem.applicant === 'object' ? caseItem.applicant : {});
        const relativeDataObj = typeof caseItem.relative === 'object' && caseItem.relative ? caseItem.relative : {};

        const patientFormattedAddress = formatAddressDisplay({
          addressLine: caseItem.addressLine || caseItem.address_line || caseItem.address || patientDataObj.addressLine || patientDataObj.address,
          village: caseItem.village || patientDataObj.village,
          city: caseItem.city || patientDataObj.city || patientCity,
          taluka: caseItem.taluka || patientDataObj.taluka || patientTaluka,
          district: caseItem.district || patientDataObj.district || patientDistrict,
          pincode: caseItem.pincode || patientDataObj.pincode,
        });

        const applicantFormattedAddress = formatAddressDisplay({
          addressLine: applicantDataObj.addressLine || applicantDataObj.address || caseItem.applicantAddress,
          village: applicantDataObj.village,
          city: applicantDataObj.city || caseItem.city,
          taluka: applicantDataObj.taluka || caseItem.taluka,
          district: applicantDataObj.district || caseItem.district,
          pincode: applicantDataObj.pincode || caseItem.pincode,
        }) || patientFormattedAddress;

        const relativeFormattedAddress = formatAddressDisplay({
          addressLine: caseItem.relativeAddress || caseItem.relative_address || relativeDataObj.addressLine || relativeDataObj.address,
          village: caseItem.relativeVillage || relativeDataObj.village,
          city: caseItem.relativeCity || relativeDataObj.city,
          taluka: caseItem.relativeTaluka || relativeDataObj.taluka,
          district: caseItem.relativeDistrict || relativeDataObj.district,
          pincode: caseItem.relativePincode || relativeDataObj.pincode,
        }) || (caseItem.relativeAddress ? formatAddressDisplay(caseItem.relativeAddress) : patientFormattedAddress);

        return (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div className="review-top-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>

              {/* Card 1: Applicant & Patient Details (Self) */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <User size={16} color="#0284c7" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                    {isSelf ? 'Applicant & Patient Details (Self)' : 'Applicant Details'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>{isSelf ? 'Patient Name:' : 'Applicant Name:'}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>
                      {caseItem.applicant || caseItem.patient} {isSelf && !((caseItem.applicant || caseItem.patient || '').includes('(Self)')) ? '(Self)' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>ABHA Number:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', letterSpacing: '0.02em' }}>
                      {caseItem.abhaNumber || caseItem.abha_number || caseItem.abha || caseItem.abhaId || caseItem.patientAbha || caseItem.patient_abha || sevakPatientData?.abhaNumber || sevakPatientData?.abha_number || sevakPatientData?.abha || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Age & Gender:</span>
                    <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>{caseItem.age || 61} yrs · {caseItem.gender || 'Male'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Mobile Number:</span>
                    <span style={{ color: '#0284c7', fontWeight: 700, textAlign: 'right' }}>{caseItem.contact || caseItem.applicantPhone || '96333 44556'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Address:</span>
                    <span style={{ color: '#0369a1', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '3px' }} /> {isSelf ? patientFormattedAddress : applicantFormattedAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Relative / Emergency Contact */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <Phone size={16} color="#0d9488" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Relative / Emergency Contact</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Name:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{caseItem.relativeName || 'Sunita Sharma'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relation:</span>
                    <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>{caseItem.relativeRelation || 'Family'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Mobile:</span>
                    <span style={{ color: '#0d9488', fontWeight: 700, textAlign: 'right' }}>{caseItem.relativeContact || caseItem.relativePhone || '98765 88990'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Address:</span>
                    <span style={{ color: '#0d9488', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '3px' }} /> {relativeFormattedAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Scheme & Hospital Assignment */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <Building2 size={16} color="#166534" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Scheme & Hospital Assignment</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flex: '0 0 38%', fontSize: '0.825rem', lineHeight: '1.35' }}>Scheme Selected by Citizen:</span>
                    <span style={{ color: '#166534', fontWeight: 800, textAlign: 'right', flex: '1', fontSize: '0.825rem', lineHeight: '1.35' }}>{caseItem.citizenSelectedScheme || caseItem.suggestedScheme?.name || caseItem.appliedScheme || caseItem.scheme || 'Mukhyamantri Sahayata Nidhi (CM Relief Fund)'}</span>
                  </div>
                  {displayAssignedScheme && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flex: '0 0 38%', fontSize: '0.825rem', lineHeight: '1.35' }}>Assigned Scheme:</span>
                      <span style={{ color: '#166534', fontWeight: 800, textAlign: 'right', flex: '1', fontSize: '0.825rem', lineHeight: '1.35' }}>{displayAssignedScheme}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Case Type:</span>
                    <span style={{ color: '#475569', fontWeight: 700, textAlign: 'right' }}>
                      {caseItem.type || (caseItem.caseTypeDesc ? caseItem.caseTypeDesc.replace(/\s*\(.*?\)/g, '').trim() : 'OPD') || 'OPD'}
                    </span>
                  </div>
                  {displayAssignedHospital && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Assigned Hospital:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>
                        {displayAssignedHospital}
                      </span>
                    </div>
                  )}
                  {displayAssignedSevak && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Assigned ArogyaSevak:</span>
                      <span style={{ color: '#166534', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '4px' }}>
                        <User size={13} style={{ flexShrink: 0 }} /> {displayAssignedSevak}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Submitted Date:</span>
                    <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>
                      {formatDateDDMMYYYY(caseItem.submittedDate || caseItem.submittedAt || caseItem.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Referred By:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>
                      {caseItem.referredBy || caseItem.referred_by || caseItem.referralName || caseItem.referrer || caseItem.referralSource || 'Direct / Self'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Dedicated Full-Width Medical Cause & Applicant Notes Box */}
            <div style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              borderLeft: '4px solid #ca8a04',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#854d0e" />
                  <span style={{ color: '#854d0e', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Medical Cause & Applicant Notes:
                  </span>
                </div>
                {hospitalConfirmed && (
                  <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                    ✓ Scheme & Hospital Assigned
                  </span>
                )}
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.875rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                "{caseItem.applicantNotes || caseItem.medicalCauseNote || caseItem.condition || caseItem.applicantMedicalCause || caseItem.applicantRemarks || (Array.isArray(caseItem.notes) && caseItem.notes.length > 0 ? caseItem.notes[0] : null) || caseItem.remarks || caseItem.description || 'No specific applicant notes provided.'}"
              </p>
              {(hospitalConfirmed || displayAssignedHospital || displayAssignedSevak) && (
                <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #fde047', display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: '#713f12' }}>
                  <span>🏛️ <strong>Assigned Scheme:</strong> {selectedScheme || caseItem.scheme || 'MJPJAY'}</span>
                  <span>🏥 <strong>Hospital:</strong> {displayAssignedHospital || matchedHosp?.name || selectedHospital}</span>
                  <span>👤 <strong>ArogyaSevak:</strong> {displayAssignedSevak || cleanSevakName}</span>
                  <span>📅 <strong>Preferred Date:</strong> {preferredAdmissionDate}</span>
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* 4-Step Interactive Workflow Bar (Step Tabs) */}
      <div
        id="workflow-steps-bar"
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {steps.map((s) => {
            const Icon = s.icon;
            const isCurrent = activeStepTab === s.number;
            const isDone = s.completed;
            const isAccessible = (
              s.number === 1 ||
              (s.number === 2 && step1Completed) ||
              (s.number === 3 && step1Completed && step2Completed) ||
              (s.number === 4 && step1Completed && step2Completed && step3Completed)
            );

            let tabBg = '#f8fafc';
            let tabBorder = '1px solid #e2e8f0';
            let badgeBg = '#f1f5f9';
            let badgeColor = '#64748b';
            let titleColor = '#334155';

            if (isCurrent) {
              tabBg = '#f0fdf4';
              tabBorder = '2px solid #166534';
              badgeBg = '#166534';
              badgeColor = '#ffffff';
              titleColor = '#166534';
            } else if (isDone) {
              tabBg = '#ffffff';
              tabBorder = '1px solid #86efac';
              badgeBg = '#dcfce7';
              badgeColor = '#166534';
              titleColor = '#0f172a';
            }

            return (
              <div
                key={s.number}
                onClick={() => handleStepTabClick(s.number)}
                style={{
                  background: tabBg,
                  border: tabBorder,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: isAccessible ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  opacity: isAccessible ? 1 : 0.65
                }}
                title={!isAccessible ? `Complete Step ${s.number - 1} first to unlock` : undefined}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: badgeBg,
                    color: badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}
                >
                  {isDone ? <Check size={16} strokeWidth={3} /> : s.number}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: isCurrent ? '800' : '700', color: titleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isDone ? '#166534' : isCurrent ? '#166534' : '#64748b', fontWeight: isDone || isCurrent ? '700' : '500' }}>
                    {isDone ? '✓ Completed' : isCurrent ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Active Step Content Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >

        {/* STEP 1: DOCUMENT VERIFICATION */}
        {activeStepTab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Step 1: Document Verification
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Verify citizen uploaded identification, income, and medical referral slips before allocating Arogya Sevak.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {!isClaimedByOther && (
                  <>

                  </>
                )}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', background: docsAllVerified ? '#dcfce7' : '#eff6ff', color: docsAllVerified ? '#166534' : '#1d4ed8', border: `1px solid ${docsAllVerified ? '#86efac' : '#bfdbfe'}` }}>
                  {docsAllVerified ? '✓ All Documents Verified' : (caseItem.documents || []).length === 0 ? '✓ Ready to Assign' : '⏳ Verification Required'}
                </span>
              </div>
            </div>

            {/* Document Request Banner for Admin */}
            {!isClaimedByOther && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderLeft: '4px solid #d97706',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderPlus size={20} color="#d97706" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#92400e' }}>
                      Need missing, clearer, or additional documents from Citizen?
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '1px' }}>
                      Click below to request documents. Citizen will get a notification in their mobile app to upload via Cloudinary.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal({ type: 'request-docs', payload: caseItem })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    background: '#ffffff',
                    color: '#b45309',
                    border: '1.5px solid #d97706',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <FolderPlus size={13} /> Request Document
                </button>
              </div>
            )}

            {/* Document List */}
            {(() => {
              const allDocs = caseItem.documents || [];
              const citizenDocs = allDocs.filter(d => !isSevakDocument(d));
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {citizenDocs.length === 0 ? (
                    <div style={{ padding: '24px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                      <FileText size={28} color="#94a3b8" style={{ marginBottom: '6px' }} />
                      <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.9rem' }}>No citizen documents uploaded yet</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>You can proceed directly to Hospital & Sevak Assignment. Verification can be completed anytime.</div>
                    </div>
                  ) : (
                    citizenDocs.map((doc, idx) => {
                      const isPending = Boolean(
                        doc.status === 'PENDING_SEVAK_UPLOAD' ||
                        doc.status === 'PENDING_CITIZEN_UPLOAD' ||
                        doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
                        doc.document_status === 'PENDING_CITIZEN_UPLOAD' ||
                        doc.file === 'Pending Upload' ||
                        doc.fileName === 'Pending Upload' ||
                        doc.file === 'Not uploaded' ||
                        doc.requested ||
                        (!doc.uploaded && !doc.file_url && !doc.fileUrl)
                      );
                      const isUploaded = !isPending && Boolean(doc.uploaded !== false && doc.file !== 'Pending Upload' && doc.fileName !== 'Pending Upload' && Boolean(doc.file || doc.file_url || doc.fileUrl));
                      const isVerified = !isPending && Boolean(doc.verified || doc.document_status === 'VERIFIED' || doc.status === 'VERIFIED' || isCaseApproved);
                      const rawName = doc.name || doc.file_name || doc.title || 'Document Record';
                      const docFile = doc.file || doc.file_name || doc.fileName || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
                      const docCategory = doc.category || 'General';
                      const docSize = doc.size || doc.file_size || (isUploaded ? '1.2 MB' : '-');

                      let displayTitle = rawName;
                      if (rawName.startsWith('rn_image_picker_') || rawName.startsWith('doc_record_') || rawName.length > 32) {
                        const cat = String(docCategory).toLowerCase();
                        if (cat.includes('medical') || cat.includes('doctor') || cat.includes('referral') || cat.includes('prescription')) {
                          displayTitle = 'Doctor Medical Referral & Prescription Slip';
                        } else if (cat.includes('identity') || cat.includes('aadhaar') || cat.includes('id')) {
                          displayTitle = 'Citizen Identity Document (Aadhaar / ID Proof)';
                        } else if (cat.includes('income') || cat.includes('ration') || cat.includes('financial')) {
                          displayTitle = 'Income & Ration Card Eligibility Proof';
                        } else if (cat.includes('hospital') || cat.includes('discharge') || cat.includes('bill')) {
                          displayTitle = 'Hospital Record / Clinical Pre-Auth';
                        } else {
                          displayTitle = 'Applicant Uploaded Document';
                        }
                      }

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: isVerified ? '#f0fdf4' : isUploaded ? '#ffffff' : '#fffbeb',
                            border: `1px solid ${isVerified ? '#bbf7d0' : isUploaded ? '#e2e8f0' : '#fef3c7'}`,
                            borderRadius: '10px',
                            gap: '14px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: isVerified ? '#dcfce7' : isUploaded ? '#eff6ff' : '#fef3c7',
                                border: `1px solid ${isVerified ? '#86efac' : isUploaded ? '#dbeafe' : '#fde68a'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <FileText size={18} color={isVerified ? '#166534' : isUploaded ? '#0284c7' : '#d97706'} />
                            </div>

                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '800',
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={displayTitle}
                              >
                                {displayTitle}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: isVerified ? '#166534' : isUploaded ? '#64748b' : '#b45309',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  minWidth: 0,
                                  overflow: 'hidden'
                                }}
                              >
                                <span style={{ background: isUploaded ? '#f1f5f9' : '#fef3c7', color: isUploaded ? '#475569' : '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>
                                  {docCategory}
                                </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }} title={isUploaded ? docFile : 'Pending Citizen Upload'}>
                                  {isUploaded ? docFile : 'Pending Citizen Upload'}
                                </span>
                                <span style={{ flexShrink: 0 }}>· {docSize}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {isVerified ? (
                              <>
                                <button
                                  onClick={() =>
                                    setActiveModal({
                                      type: 'view-doc',
                                      payload: {
                                        caseId: caseItem.id,
                                        patientName: caseItem.patient || caseItem.patientName,
                                        applicantName: caseItem.applicant || caseItem.applicantName,
                                        doc,
                                        isClaimedByOther,
                                        ...doc,
                                        onVerify: (targetDoc) => handleVerifyDoc(targetDoc || doc)
                                      }
                                    })
                                  }
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    color: '#334155',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Eye size={13} /> View
                                </button>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534', background: '#dcfce7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>
                                  ✓ Verified
                                </span>
                              </>
                            ) : isUploaded ? (
                              <>
                                <button
                                  onClick={() =>
                                    setActiveModal({
                                      type: 'view-doc',
                                      payload: {
                                        caseId: caseItem.id,
                                        patientName: caseItem.patient || caseItem.patientName,
                                        applicantName: caseItem.applicant || caseItem.applicantName,
                                        doc,
                                        isClaimedByOther,
                                        ...doc,
                                        onVerify: (targetDoc) => handleVerifyDoc(targetDoc || doc)
                                      }
                                    })
                                  }
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    color: '#334155',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Eye size={13} /> View
                                </button>
                                {isClaimedByOther ? (
                                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', background: '#fef3c7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                    🔒 Read-Only (Claimed)
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyDoc(doc)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 14px',
                                      background: '#166534',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Verify Document ✓
                                  </button>
                                )}
                              </>
                            ) : (
                              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#b45309', background: '#fef3c7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                ⏳ Pending Citizen Upload
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* ArogyaSevak Uploaded Patient Documents */}
            {(() => {
              const hasSevakAssigned = Boolean(
                caseItem.assignedSevak &&
                caseItem.assignedSevak !== '-' &&
                caseItem.assignedSevak !== 'Not assigned' &&
                caseItem.assignedSevak !== 'Unassigned' &&
                caseItem.assignedSevak !== 'Pending'
              );
              const caseDocs = caseItem.documents || [];
              const rawSevakDocs = [
                ...caseDocs.filter(isSevakDocument),
                ...(hasSevakAssigned && Array.isArray(sevakPatientData?.additionalMedicalDocs) ? sevakPatientData.additionalMedicalDocs.filter(isSevakDocument) : []),
                ...(hasSevakAssigned && Array.isArray(sevakPatientData?.documents) ? sevakPatientData.documents.filter(isSevakDocument) : [])
              ];

              const sevakDocs = rawSevakDocs.reduce((acc, current) => {
                const currentTitle = current.title || current.name || current.file_name;
                const existingIdx = acc.findIndex(d =>
                  (d.id && current.id && d.id === current.id) ||
                  (d.title && currentTitle && d.title === currentTitle) ||
                  (d.name && currentTitle && d.name === currentTitle)
                );
                if (existingIdx !== -1) {
                  const currIsUploaded = Boolean(current.uploaded === true || (current.file && current.file !== 'Pending Upload' && current.file !== 'Not uploaded') || current.file_url || current.fileUrl || current.url);
                  const existIsUploaded = Boolean(acc[existingIdx].uploaded === true || (acc[existingIdx].file && acc[existingIdx].file !== 'Pending Upload' && acc[existingIdx].file !== 'Not uploaded') || acc[existingIdx].file_url || acc[existingIdx].fileUrl || acc[existingIdx].url);
                  if (currIsUploaded && !existIsUploaded) {
                    acc[existingIdx] = current;
                  }
                } else {
                  acc.push(current);
                }
                return acc;
              }, []);

              if (sevakDocs.length === 0) return null;

              return (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '4px', border: '1px solid #86efac' }}>
                      🏥 New ArogyaSevak Uploaded Documents ({sevakDocs.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Clinical records & hospital intake charts uploaded by {caseItem.assignedSevak || 'ArogyaSevak'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sevakDocs.map((sDoc, sIdx) => {
                      const docName = sDoc.title || sDoc.name || sDoc.file_name || 'ArogyaSevak Document';
                      const matchedDocInCase = caseDocs.find(d => d.name === docName || d.title === docName || (sDoc.id && d.id === sDoc.id));

                      const isExplicitlyPending = Boolean(
                        sDoc.status === 'PENDING_SEVAK_UPLOAD' ||
                        sDoc.document_status === 'PENDING_SEVAK_UPLOAD' ||
                        matchedDocInCase?.status === 'PENDING_SEVAK_UPLOAD' ||
                        matchedDocInCase?.document_status === 'PENDING_SEVAK_UPLOAD' ||
                        sDoc.file === 'Pending Upload' ||
                        sDoc.fileName === 'Pending Upload' ||
                        matchedDocInCase?.file === 'Pending Upload' ||
                        matchedDocInCase?.fileName === 'Pending Upload' ||
                        sDoc.uploaded === false ||
                        matchedDocInCase?.uploaded === false ||
                        sDoc.requested === true ||
                        matchedDocInCase?.requested === true
                      );

                      const hasValidFile = Boolean(
                        (sDoc.file_url && sDoc.file_url.trim() !== '') ||
                        (sDoc.fileUrl && sDoc.fileUrl.trim() !== '') ||
                        (matchedDocInCase?.file_url && matchedDocInCase.file_url.trim() !== '') ||
                        (matchedDocInCase?.fileUrl && matchedDocInCase.fileUrl.trim() !== '') ||
                        (sDoc.url && sDoc.url.trim() !== '') ||
                        (matchedDocInCase?.url && matchedDocInCase.url.trim() !== '') ||
                        (sDoc.uploaded === true && sDoc.file && sDoc.file !== 'Pending Upload' && sDoc.file !== 'Not uploaded') ||
                        (matchedDocInCase?.uploaded === true && matchedDocInCase.file && matchedDocInCase.file !== 'Pending Upload' && matchedDocInCase.file !== 'Not uploaded')
                      );

                      const isPendingSevakUpload = isExplicitlyPending || !hasValidFile;
                      const isUploaded = !isPendingSevakUpload && hasValidFile;
                      const isVerified = isUploaded && (matchedDocInCase ? Boolean(matchedDocInCase.verified || matchedDocInCase.status === 'VERIFIED' || matchedDocInCase.document_status === 'VERIFIED') : Boolean(sDoc.verified || sDoc.status === 'VERIFIED' || sDoc.document_status === 'VERIFIED'));
                      const assignedSevakName = sDoc.by || caseItem.assignedSevak || 'ArogyaSevak';
                      const docSize = sDoc.size || matchedDocInCase?.size || '1.8 MB';

                      return (
                        <div
                          key={`sdoc-${sIdx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: isVerified ? '#f0fdf4' : (isUploaded ? '#f0f9ff' : '#fffbeb'),
                            border: `1px solid ${isVerified ? '#bbf7d0' : (isUploaded ? '#bae6fd' : '#fde68a')}`,
                            borderRadius: '10px',
                            gap: '14px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: isVerified ? '#dcfce7' : (isUploaded ? '#e0f2fe' : '#fef3c7'),
                                border: `1px solid ${isVerified ? '#86efac' : (isUploaded ? '#7dd3fc' : '#fde68a')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <FileCheck size={18} color={isVerified ? '#166534' : (isUploaded ? '#0284c7' : '#d97706')} />
                            </div>

                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '800',
                                  color: isVerified ? '#14532d' : (isUploaded ? '#0369a1' : '#92400e'),
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {docName}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: isVerified ? '#166534' : (isUploaded ? '#0284c7' : '#b45309'),
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  minWidth: 0,
                                  overflow: 'hidden'
                                }}
                              >
                                {isPendingSevakUpload ? (
                                  <span>⏳ Requested from ArogyaSevak ({assignedSevakName}) · Task Assigned</span>
                                ) : (
                                  <>
                                    <span>Uploaded by {assignedSevakName}</span>
                                    <span>· {sDoc.type || sDoc.category || 'Clinical Chart'} ({docSize})</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {isPendingSevakUpload ? (
                              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#b45309', background: '#fef3c7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                ⏳ Pending ArogyaSevak Upload
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setActiveModal({
                                      type: 'view-doc',
                                      payload: {
                                        caseId: caseItem.id,
                                        patientName: caseItem.patient || caseItem.patientName,
                                        applicantName: caseItem.applicant || caseItem.applicantName,
                                        name: docName,
                                        file: sDoc.file || matchedDocInCase?.file || `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                                        size: docSize,
                                        verified: isVerified,
                                        uploadedBy: assignedSevakName,
                                        uploaderRole: 'ArogyaSevak',
                                        doc: matchedDocInCase || sDoc,
                                        isClaimedByOther,
                                        onVerify: (d) => handleVerifyDoc(d || matchedDocInCase || sDoc),
                                        ...sDoc
                                      }
                                    })
                                  }
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    background: '#ffffff',
                                    border: isVerified ? '1px solid #86efac' : '1px solid #7dd3fc',
                                    borderRadius: '6px',
                                    color: isVerified ? '#166534' : '#0284c7',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Eye size={13} /> View Document
                                </button>

                                {isVerified ? (
                                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534', background: '#dcfce7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>
                                    ✓ Verified
                                  </span>
                                ) : isClaimedByOther ? (
                                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', background: '#fef3c7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                    🔒 Read-Only (Claimed)
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyDoc(matchedDocInCase || sDoc)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 14px',
                                      background: '#166534',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Verify Document ✓
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Step 1 Footer Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                {!isClaimedByOther && (
                  <button
                    type="button"
                    onClick={handleReject}
                    className="btn-reject-action"
                    title="Reject this application (Reopenable within 60 days)"
                  >
                    <XCircle size={15} />
                    <span>Reject Case</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isClaimedByOther ? (
                  <button
                    onClick={() => setActiveStepTab(2)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 20px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>View Step 2: Scheme & Hospital (Read-Only)</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleProceedToStep2}
                    disabled={!docsAllVerified && hasCitizenDocs}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 20px',
                      background: (docsAllVerified || !hasCitizenDocs) ? '#166534' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: (docsAllVerified || !hasCitizenDocs) ? 'pointer' : 'not-allowed',
                      boxShadow: (docsAllVerified || !hasCitizenDocs) ? '0 2px 4px rgba(22, 101, 52, 0.2)' : 'none',
                      opacity: (docsAllVerified || !hasCitizenDocs) ? 1 : 0.7,
                      transition: 'all 0.2s ease'
                    }}
                    title={(docsAllVerified || !hasCitizenDocs) ? 'Proceed to Step 2: Scheme, Hospital & Sevak Assignment' : 'Verify all uploaded documents to enable Step 2'}
                  >
                    <span>Continue to Step 2: Scheme, Hospital & Sevak Assignment</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SCHEME, HOSPITAL & SEVAK ASSIGNMENT */}
        {activeStepTab === 2 && (
          <div className="step2-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header / Subheader */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#0284c7', color: '#fff', fontSize: '0.85rem', fontWeight: 800 }}>2</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Patient Location, Scheme, Specialty & Hospital Selection
                  </h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Verify patient location & case classification, assign eligible scheme, review procedures, and choose empanelled hospital with live bed availability.
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: step2Completed ? '#dcfce7' : '#fef3c7', color: step2Completed ? '#166534' : '#b45309', border: `1px solid ${step2Completed ? '#86efac' : '#fde68a'}`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {step2Completed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {step2Completed ? 'Scheme, Hospital & Sevak Confirmed' : 'Pending Hospital & Sevak Assignment'}
              </span>
            </div>

            {/* SECTION 1: Patient Demographics, Location & Case Type (Auto-fetched & Editable) */}
            <div className="step2-card-section">
              <div className="step2-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    1. Patient Location, Priority & Care Type
                  </h4>
                </div>
                <span className="step2-pill-badge">
                  ✓ Auto-Fetched from Citizen Application (Editable)
                </span>
              </div>

              <div className="step2-grid-5col" style={{ marginTop: '12px' }}>
                {/* District Dropdown */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>District:</span>
                  </label>
                  <select
                    className="custom-select"
                    value={patientDistrict}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      setPatientDistrict(newDist);
                      setHospitalConfirmed(false);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', fontWeight: '600', fontSize: '0.85rem', background: '#fff' }}
                  >
                    {(dbDistricts.length > 0 ? dbDistricts : MAHARASHTRA_DISTRICTS).map((dist) => (
                      <option key={dist} value={dist}>
                        📍 {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Taluka Dropdown */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>
                    <span>Taluka / Tehsil:</span>
                  </label>
                  <select
                    className="custom-select"
                    value={patientTaluka}
                    onChange={(e) => {
                      setPatientTaluka(e.target.value);
                      setHospitalConfirmed(false);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', fontWeight: '600', fontSize: '0.85rem', background: '#fff' }}
                  >
                    {(dbTalukas.length > 0 ? dbTalukas : (TALUKAS_BY_DISTRICT[patientDistrict] || ['Central', 'East', 'West', 'Rural', 'Urban'])).map((tal) => (
                      <option key={tal} value={tal}>
                        🏘️ {tal}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City / Village / Locality Input */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>
                    <span>City / Area:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pune City / Dombivli East"
                    value={patientCity}
                    onChange={(e) => setPatientCity(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', fontWeight: '600', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Case Priority (Editable - Emergency / Regular) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Case Priority:</span>
                    <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700 }}>Editable</span>
                  </label>
                  <select
                    className="custom-select"
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      setPatientCaseType(e.target.value === 'Emergency' ? 'Critical / Emergency' : 'Regular');
                      setHospitalConfirmed(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '7px',
                      border: `1.5px solid ${priority === 'Emergency' ? '#ef4444' : '#0284c7'}`,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      background: priority === 'Emergency' ? '#fef2f2' : '#f0f9ff',
                      color: priority === 'Emergency' ? '#b91c1c' : '#0369a1'
                    }}
                  >
                    <option value="Emergency">🚨 Emergency</option>
                    <option value="Regular">📋 Regular</option>
                  </select>
                </div>

                {/* Patient Care Mode (OPD / IPD) Dropdown */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Case Type:</span>
                    <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700 }}>Editable</span>
                  </label>
                  <select
                    className="custom-select"
                    value={patientCareMode}
                    onChange={(e) => setPatientCareMode(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1.5px solid #0284c7', fontWeight: '700', fontSize: '0.85rem', background: '#f0f9ff', color: '#0369a1' }}
                  >
                    {PATIENT_CARE_MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>
                        🏥 {mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Health Scheme Selection */}
            <div className="step2-card-section">
              <div className="step2-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    2. Health Scheme Assignment
                  </h4>
                </div>
                <span className="step2-pill-badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                  🏛️ Determines Hospital Empanelment & Treatment Packages
                </span>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.825rem', color: '#0f172a', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Select Health Scheme (योजना निवडा): *</span>
                    {selectedScheme && (
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>✓ Scheme Selected: {selectedScheme.split('(')[0]}</span>
                    )}
                  </label>
                  <select
                    className="custom-select"
                    value={selectedScheme}
                    onChange={handleSchemeChange}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #94a3b8', fontWeight: '700', fontSize: '0.875rem', background: selectedScheme ? '#f0fdf4' : '#fff', color: '#0f172a' }}
                  >
                    <option value="">-- Choose Eligible Scheme --</option>
                    {availableSchemes.map((s) => (
                      <option key={s} value={s}>
                        🏛️ {s}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Empanelled hospitals accepting this scheme will receive priority ranking in Section 5 below.
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Required Medical Specialty in 3 Sections with Checkboxes */}
            <div className="step2-card-section">
              <div className="step2-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stethoscope size={18} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    3. Required Medical Specialties (वैद्यकीय विशेष शाखा)
                  </h4>
                </div>
                <span className="step2-pill-badge" style={{ background: selectedSpecialties.length > 0 ? '#dcfce7' : '#fef3c7', color: selectedSpecialties.length > 0 ? '#166534' : '#b45309', borderColor: selectedSpecialties.length > 0 ? '#86efac' : '#fde68a' }}>
                  {selectedSpecialties.length > 0 ? `✓ ${selectedSpecialties.length} Specialty Selected` : '⚠️ Please Select Specialty'}
                </span>
              </div>

              {/* Specialty Dropdown Trigger Header */}
              {activeSpecialtyEscalation && (requestedSpecialtyName || activeSpecialtyEscalation.requiredSpecialty) && (
                <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={15} color="#d97706" />
                  <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                    Auto-applied requested specialty from Sevak ({activeSpecialtyEscalation.submittedBy || 'Arogya Sevak'}): <strong>"{requestedSpecialtyName || activeSpecialtyEscalation.requiredSpecialty}"</strong>
                  </span>
                </div>
              )}
              {/* Multi-Select Dropdown Button Trigger */}
              <div className="specialties-dropdown-wrapper" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className={`specialties-dropdown-btn ${specialtyDropdownOpen ? 'open' : ''}`}
                  onClick={() => setSpecialtyDropdownOpen((prev) => !prev)}
                  aria-expanded={specialtyDropdownOpen}
                >
                  <div className="specialties-btn-left">
                    <Stethoscope size={18} className="specialties-btn-icon" />
                    {selectedSpecialties.length === 0 ? (
                      <span className="specialties-placeholder">
                        Select specialties (e.g. Cardiology, Hemodialysis, ICU)...
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
                          setSelectedSpecialties([]);
                          setHospitalConfirmed(false);
                        }}
                        title="Clear all selected specialties"
                        role="button"
                        tabIndex={0}
                      >
                        <X size={14} />
                      </span>
                    )}
                    {specialtyDropdownOpen ? (
                      <ChevronUp size={18} className="dropdown-chevron text-blue" />
                    ) : (
                      <ChevronDown size={18} className="dropdown-chevron" />
                    )}
                  </div>
                </button>

                {/* Dropdown Menu Popover (Opens on click) */}
                {specialtyDropdownOpen && (
                  <div className="specialties-menu-popover" role="listbox">
                    {/* Search Bar & Quick Actions Toolbar */}
                    <div className="specialties-menu-header">
                      <div className="specialties-search-box">
                        <Search size={15} className="specialties-search-icon" />
                        <input
                          type="text"
                          className="specialties-search-input"
                          placeholder="Search specialties (e.g. Cardiology, Hemodialysis, ICU)..."
                          value={specialtySearchQuery}
                          onChange={(e) => setSpecialtySearchQuery(e.target.value)}
                          autoFocus
                        />
                        {specialtySearchQuery && (
                          <button
                            type="button"
                            className="specialties-search-clear"
                            onClick={() => setSpecialtySearchQuery('')}
                            aria-label="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <div className="specialties-quick-actions">
                        <span className="specialties-quick-info">
                          Showing {ALL_PACKAGE_MASTER_SPECIALTIES.filter(s => !specialtySearchQuery.trim() || s.toLowerCase().includes(specialtySearchQuery.toLowerCase().trim())).length} specialties
                        </span>
                        <div className="specialties-action-btns">
                          <button
                            type="button"
                            className="specialties-action-btn"
                            onClick={() => {
                              const matching = ALL_PACKAGE_MASTER_SPECIALTIES.filter(s => !specialtySearchQuery.trim() || s.toLowerCase().includes(specialtySearchQuery.toLowerCase().trim()));
                              setSelectedSpecialties(Array.from(new Set([...selectedSpecialties, ...matching])));
                              setHospitalConfirmed(false);
                            }}
                          >
                            Select All ({ALL_PACKAGE_MASTER_SPECIALTIES.filter(s => !specialtySearchQuery.trim() || s.toLowerCase().includes(specialtySearchQuery.toLowerCase().trim())).length})
                          </button>
                          {selectedSpecialties.length > 0 && (
                            <button
                              type="button"
                              className="specialties-action-btn clear"
                              onClick={() => {
                                setSelectedSpecialties([]);
                                setHospitalConfirmed(false);
                              }}
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkbox Options List - 3 Columns Grid */}
                    <div className="specialties-options-list">
                      {ALL_PACKAGE_MASTER_SPECIALTIES
                        .filter((spec) => {
                          if (!specialtySearchQuery.trim()) return true;
                          return spec.toLowerCase().includes(specialtySearchQuery.toLowerCase().trim());
                        })
                        .map((specialty) => {
                          const isChecked = selectedSpecialties.includes(specialty);
                          return (
                            <label
                              key={specialty}
                              className={`specialty-checkbox-item ${isChecked ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedSpecialties((prev) =>
                                    isChecked ? prev.filter((s) => s !== specialty) : [...prev, specialty]
                                  );
                                  setHospitalConfirmed(false);
                                }}
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
                        })}
                    </div>

                    {/* Done / Close Footer */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => setSpecialtyDropdownOpen(false)}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 18px',
                          borderRadius: '6px',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={14} /> Close / Done ({selectedSpecialties.length} Selected)
                      </button>
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
                          onClick={() => {
                            setSelectedSpecialties((prev) => prev.filter((s) => s !== spec));
                            setHospitalConfirmed(false);
                          }}
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
            </div>

            {/* SECTION 4: Clinical Procedures for Selected Specialties */}
            {selectedSpecialties.length > 0 && (
              <div className="step2-card-section">
                <div className="step2-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HeartPulse size={18} color="#059669" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      4. Clinical Packages for Selected Specialties
                    </h4>
                  </div>
                  <span className="step2-pill-badge" style={{ background: selectedProcedures.length > 0 ? '#dcfce7' : '#f1f5f9', color: selectedProcedures.length > 0 ? '#166534' : '#64748b', borderColor: selectedProcedures.length > 0 ? '#86efac' : '#cbd5e1' }}>
                    {selectedProcedures.length > 0 ? `✓ ${selectedProcedures.length} Procedure(s) Selected` : 'Select Procedures with Checkboxes'}
                  </span>
                </div>

                {/* Multi-Select Dropdown Button Trigger */}
                <div className="specialties-dropdown-wrapper" style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    className={`specialties-dropdown-btn ${proceduresDropdownOpen ? 'open' : ''}`}
                    onClick={() => setProceduresDropdownOpen((prev) => !prev)}
                    aria-expanded={proceduresDropdownOpen}
                  >
                    <div className="specialties-btn-left">
                      <HeartPulse size={18} className="specialties-btn-icon" style={{ color: '#059669' }} />
                      {selectedProcedures.length === 0 ? (
                        <span className="specialties-placeholder">
                          Select clinical procedures for ({selectedSpecialties.join(', ')})...
                        </span>
                      ) : (
                        <span className="specialties-btn-text">
                          <strong style={{ color: '#059669' }}>{selectedProcedures.length}</strong> Clinical {selectedProcedures.length === 1 ? 'Procedure' : 'Procedures'} Selected
                        </span>
                      )}
                    </div>

                    <div className="specialties-btn-right">
                      {selectedProcedures.length > 0 && (
                        <span
                          className="specialties-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcedures([]);
                            setHospitalConfirmed(false);
                          }}
                          title="Clear all selected procedures"
                          role="button"
                          tabIndex={0}
                        >
                          <X size={14} />
                        </span>
                      )}
                      {proceduresDropdownOpen ? (
                        <ChevronUp size={18} className="dropdown-chevron text-blue" />
                      ) : (
                        <ChevronDown size={18} className="dropdown-chevron" />
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu Popover (Opens on click) */}
                  {proceduresDropdownOpen && (
                    <div className="specialties-menu-popover" role="listbox">
                      {/* Search Bar & Quick Actions Toolbar */}
                      <div className="specialties-menu-header">
                        <div className="specialties-search-box">
                          <Search size={15} className="specialties-search-icon" />
                          <input
                            type="text"
                            className="specialties-search-input"
                            placeholder="Search clinical procedures / packages (e.g. Angioplasty, Valve, ICU)..."
                            value={proceduresSearchQuery}
                            onChange={(e) => setProceduresSearchQuery(e.target.value)}
                            autoFocus
                          />
                          {proceduresSearchQuery && (
                            <button
                              type="button"
                              className="specialties-search-clear"
                              onClick={() => setProceduresSearchQuery('')}
                              aria-label="Clear search"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {/* Quick Actions */}
                        {(() => {
                          const filtered = availableProceduresForSelectedSpecialties.filter(p =>
                            !proceduresSearchQuery.trim() ||
                            p.displayName.toLowerCase().includes(proceduresSearchQuery.toLowerCase().trim()) ||
                            p.specialty.toLowerCase().includes(proceduresSearchQuery.toLowerCase().trim())
                          );

                          return (
                            <div className="specialties-quick-actions">
                              <span className="specialties-quick-info">
                                Showing {filtered.length} {filtered.length === 1 ? 'procedure' : 'procedures'} for {selectedSpecialties.length} {selectedSpecialties.length === 1 ? 'specialty' : 'specialties'}
                              </span>
                              <div className="specialties-action-btns">
                                <button
                                  type="button"
                                  className="specialties-action-btn"
                                  onClick={() => {
                                    const allNames = filtered.map(p => p.displayName);
                                    setSelectedProcedures(Array.from(new Set([...selectedProcedures, ...allNames])));
                                    setHospitalConfirmed(false);
                                  }}
                                >
                                  Select All ({filtered.length})
                                </button>
                                {selectedProcedures.length > 0 && (
                                  <button
                                    type="button"
                                    className="specialties-action-btn clear"
                                    onClick={() => {
                                      setSelectedProcedures([]);
                                      setHospitalConfirmed(false);
                                    }}
                                  >
                                    Clear All
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Specialty-Grouped Checkbox Options List */}
                      <div className="specialties-groups-scrollable" style={{ maxHeight: '420px', overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(() => {
                          const query = (proceduresSearchQuery || '').toLowerCase().trim();

                          // Filter each specialty group
                          const groupsWithFilteredItems = proceduresGroupedBySpecialty.map(group => {
                            const matchingItems = group.items.filter(p =>
                              !query ||
                              p.displayName.toLowerCase().includes(query) ||
                              p.name.toLowerCase().includes(query) ||
                              (p.code && p.code.toLowerCase().includes(query)) ||
                              group.specialty.toLowerCase().includes(query)
                            );
                            return {
                              ...group,
                              items: matchingItems
                            };
                          }).filter(g => g.items.length > 0);

                          if (groupsWithFilteredItems.length === 0) {
                            return (
                              <div style={{ padding: '28px 10px', textAlign: 'center', color: '#64748b' }}>
                                <AlertCircle size={24} style={{ margin: '0 auto 6px', color: '#94a3b8' }} />
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No clinical packages found matching "{proceduresSearchQuery}"</p>
                              </div>
                            );
                          }

                          return groupsWithFilteredItems.map(group => {
                            const groupItemNames = group.items.map(p => p.displayName);
                            const selectedCountInGroup = groupItemNames.filter(name => selectedProcedures.includes(name)).length;
                            const isAllInGroupSelected = group.items.length > 0 && selectedCountInGroup === group.items.length;

                            return (
                              <div key={group.specialty} className="package-specialty-group-box">
                                {/* Specialty Group Header */}
                                <div className="package-specialty-group-header">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1rem' }}>🩺</span>
                                    <strong style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 800 }}>
                                      {group.specialty}
                                    </strong>
                                    <span className="spec-group-badge" style={{ background: selectedCountInGroup > 0 ? '#dcfce7' : '#ffffff', color: selectedCountInGroup > 0 ? '#166534' : '#64748b', borderColor: selectedCountInGroup > 0 ? '#86efac' : '#cbd5e1' }}>
                                      {selectedCountInGroup > 0 ? `${selectedCountInGroup} of ${group.items.length} Selected` : `${group.items.length} packages`}
                                    </span>
                                  </div>

                                  {/* Specialty Group Quick Action Buttons */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="specialties-action-btn"
                                      onClick={() => {
                                        if (isAllInGroupSelected) {
                                          setSelectedProcedures(prev => prev.filter(name => !groupItemNames.includes(name)));
                                        } else {
                                          setSelectedProcedures(prev => Array.from(new Set([...prev, ...groupItemNames])));
                                        }
                                        setHospitalConfirmed(false);
                                      }}
                                      style={{ fontSize: '0.72rem', padding: '3px 8px', background: isAllInGroupSelected ? '#fee2e2' : '#ffffff', color: isAllInGroupSelected ? '#991b1b' : '#047857', borderColor: isAllInGroupSelected ? '#fca5a5' : '#86efac' }}
                                    >
                                      {isAllInGroupSelected ? `Deselect All (${group.items.length})` : `Select All for ${group.specialty.split(/[\s&,/]+/)[0]} (${group.items.length})`}
                                    </button>
                                  </div>
                                </div>

                                {/* Specialty Group 3-Column Items Grid */}
                                <div className="package-group-grid">
                                  {group.items.map(procItem => {
                                    const isChecked = selectedProcedures.includes(procItem.displayName);
                                    return (
                                      <label
                                        key={`${procItem.specialty}-${procItem.displayName}`}
                                        className={`specialty-checkbox-item ${isChecked ? 'selected' : ''}`}
                                        style={isChecked ? { background: '#f0fdf4', borderColor: '#86efac' } : {}}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setSelectedProcedures(prev =>
                                              isChecked
                                                ? prev.filter(p => p !== procItem.displayName)
                                                : [...prev, procItem.displayName]
                                            );
                                            setHospitalConfirmed(false);
                                          }}
                                          className="specialty-native-checkbox"
                                        />
                                        <span
                                          className={`specialty-custom-box ${isChecked ? 'checked' : ''}`}
                                          style={isChecked ? { background: '#059669', borderColor: '#059669' } : {}}
                                        >
                                          {isChecked && <Check size={12} strokeWidth={3} />}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <span className="specialty-item-name" style={isChecked ? { color: '#166534', fontWeight: 700 } : {}}>
                                            {procItem.displayName}
                                          </span>
                                        </div>
                                        {isChecked && (
                                          <span className="specialty-selected-indicator" style={{ background: '#dcfce7', color: '#166534' }}>
                                            Selected
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Done / Close Footer */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={() => setProceduresDropdownOpen(false)}
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px 18px',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check size={14} /> Close / Done ({selectedProcedures.length} Selected)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Procedures Badges / Chips Display Grouped by Specialty */}
                {selectedProcedures.length > 0 && (
                  <div className="selected-specialties-chips-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedSpecialties.map(spec => {
                      const specProcs = selectedProcedures.filter(pName => {
                        const matchedItem = availableProceduresForSelectedSpecialties.find(p => p.displayName === pName);
                        return matchedItem ? matchedItem.specialty === spec : true;
                      });
                      if (specProcs.length === 0) return null;

                      return (
                        <div key={spec} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedSpecialties.length > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: '#065f46' }}>
                              <span>🩺 {spec}</span>
                              <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600 }}>
                                ({specProcs.length} {specProcs.length === 1 ? 'package' : 'packages'})
                              </span>
                            </div>
                          )}
                          <div className="chips-list">
                            {specProcs.map((proc) => (
                              <span
                                key={proc}
                                className="specialty-chip"
                                style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}
                              >
                                <span className="chip-dot" style={{ background: '#059669' }}></span>
                                <span className="chip-text">{proc}</span>
                                <button
                                  type="button"
                                  className="chip-remove-btn"
                                  style={{ color: '#059669' }}
                                  onClick={() => {
                                    setSelectedProcedures((prev) => prev.filter((p) => p !== proc));
                                    setHospitalConfirmed(false);
                                  }}
                                  title={`Remove ${proc}`}
                                  aria-label={`Remove ${proc}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 5: Empanelled Hospitals in Interactive Table Format */}
            <div className="step2-card-section">
              <div className="step2-section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={18} color="#0284c7" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      5. Empanelled Hospitals ({proximityHospitals.length} Matching Criteria)
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Filtered by Scheme ({selectedScheme ? selectedScheme.split('(')[0].trim() : 'All'}), Specialties ({selectedSpecialties.length > 0 ? selectedSpecialties.join(', ') : 'All'}), and Packages ({selectedProcedures.length > 0 ? `${selectedProcedures.length} Selected` : 'All'}), ranked by proximity to {patientTaluka || patientDistrict || 'Patient'}.
                  </span>
                </div>

                {/* Header Actions: Auto-Assign Nearest + Search */}
                {selectedSpecialties.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {proximityHospitals.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nearest = proximityHospitals[0];
                          if (nearest) {
                            handleHospitalChange({ target: { value: nearest.label } });
                            showToast?.(`Nearest hospital assigned: ${nearest.name} (~${nearest.calculatedDistance} km)`, 'success');
                          }
                        }}
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1.5px solid #a7f3d0',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Click to automatically assign the top-ranked nearest empanelled hospital"
                      >
                        ⚡ Assign Nearest ({proximityHospitals[0]?.name?.split(' ')[0]} - ~{proximityHospitals[0]?.calculatedDistance} km)
                      </button>
                    )}

                    <div style={{ position: 'relative', width: '220px' }}>
                      <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search hospital or area..."
                        value={hospitalSearchQuery}
                        onChange={(e) => setHospitalSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px 7px 32px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      />
                      {hospitalSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setHospitalSearchQuery('')}
                          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedSpecialties.length === 0 ? (
                <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#64748b', marginTop: '12px' }}>
                  <Building size={24} color="#94a3b8" style={{ marginBottom: '6px' }} />
                  <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>Please Select Required Medical Specialties Above</h5>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Empanelled hospitals matching the selected specialties and scheme will appear here in table format.
                  </p>
                </div>
              ) : (
                /* Responsive Hospitals Table (Without Radio Button) */
                <div className="step2-table-wrapper" style={{ marginTop: '12px' }}>
                  <table className="step2-hospitals-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '220px' }}>Hospital Name & Type</th>
                        <th style={{ minWidth: '140px' }}>Location & Distance</th>
                        <th style={{ minWidth: '150px' }}>Scheme Status</th>
                        <th style={{ minWidth: '140px' }}>Bed Availability</th>
                        <th style={{ minWidth: '160px' }}>Specialties</th>
                        <th style={{ minWidth: '110px', textAlign: 'center' }}>ArogyaSevaks</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proximityHospitals.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <AlertCircle size={22} color="#94a3b8" />
                              <strong style={{ color: '#334155', fontSize: '0.875rem' }}>No matching empanelled hospitals found</strong>
                              <span style={{ fontSize: '0.78rem' }}>
                                No hospitals match Scheme: <em>{selectedScheme || 'Any'}</em>, Specialties: <em>{selectedSpecialties.join(', ') || 'Any'}</em>
                                {selectedProcedures.length > 0 && <>, Packages: <em>{selectedProcedures.length} selected</em></>}
                                {hospitalSearchQuery && <>, or Search: <em>"{hospitalSearchQuery}"</em></>}.
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '4px' }}>
                                Try choosing alternative specialties, schemes, or clearing the search box.
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        proximityHospitals.map((h, hIdx) => {
                          const isSelected = selectedHospital === h.label || selectedHospital === h.name || (matchedHosp && matchedHosp.id === h.id);
                          const isTopNearest = hIdx === 0;
                          const genBeds = h.bedsAvailable ?? 42;
                          const totGenBeds = h.totalBeds ?? 150;
                          const icuBeds = h.availableIcuBeds ?? 8;
                          const totIcuBeds = h.totalIcuBeds ?? 30;

                          // Sevaks count stationed at this hospital
                          const hospSevaks = (arogyaSevaks || []).filter(s =>
                            s.hospital && (
                              s.hospital.toLowerCase().includes(h.name.toLowerCase()) ||
                              h.name.toLowerCase().includes(s.hospital.toLowerCase())
                            )
                          );

                          return (
                            <tr
                              key={h.id || h.name}
                              onClick={() => handleHospitalChange({ target: { value: h.label } })}
                              className={`step2-hosp-row ${isSelected ? 'selected' : ''}`}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                                      {h.name}
                                    </span>
                                    {isTopNearest && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                        🏆 NEAREST MATCH
                                      </span>
                                    )}
                                    {!isTopNearest && h.priorityScore >= 3 && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                        ⭐ TOP MATCH
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      {h.type || 'NABH Accredited Multi-Specialty'}
                                    </span>
                                    {h.type === 'Government' && (
                                      <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                        Govt / Municipal
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>
                                    📍 {h.location || patientDistrict}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: isTopNearest ? '#166534' : '#0284c7', fontWeight: 700 }}>
                                    ~{h.calculatedDistance} km from {patientCity || patientTaluka || 'patient'}
                                  </span>
                                  {h.cityMatch && (
                                    <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                                      • Same City / Ward
                                    </span>
                                  )}
                                  {!h.cityMatch && h.talukaMatch && (
                                    <span style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 600 }}>
                                      • Same Taluka
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {selectedScheme && h.schemeMatch ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '5px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Check size={12} strokeWidth={3} /> Empanelled
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '5px' }}>
                                    PM-JAY / MJPJAY
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.73rem' }}>
                                    <span style={{ color: '#475569' }}>General:</span>
                                    <strong style={{ color: genBeds > 10 ? '#166534' : '#b45309' }}>{genBeds} / {totGenBeds}</strong>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.73rem' }}>
                                    <span style={{ color: '#475569' }}>ICU:</span>
                                    <strong style={{ color: icuBeds > 2 ? '#0369a1' : '#b91c1c' }}>{icuBeds} / {totIcuBeds}</strong>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.74rem', color: '#334155', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {Array.isArray(h.specialties) ? h.specialties.join(', ') : (h.specialties || 'Multi-Specialty')}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: hospSevaks.length > 0 ? '#eff6ff' : '#f8fafc', color: hospSevaks.length > 0 ? '#1d4ed8' : '#94a3b8', padding: '2px 8px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                                  👤 {hospSevaks.length > 0 ? `${hospSevaks.length} Sevak(s)` : '1 Stationed'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleHospitalChange({ target: { value: h.label } });
                                  }}
                                  className={`step2-select-btn ${isSelected ? 'selected' : ''}`}
                                >
                                  {isSelected ? 'Selected ✓' : 'Select Hospital'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 5: Selected Hospital Overview Card (Telemetry & Bed Capacity) */}
            {selectedHospital && matchedHosp && (
              <div className="step2-hospital-overview-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🏥</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        {matchedHosp.name}
                      </h4>
                      <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #86efac' }}>
                        ✓ ACTIVE EMPANELMENT
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px', display: 'block' }}>
                      📍 {matchedHosp.address || matchedHosp.location || 'Dombivli, Thane District'} • Contact / Helpdesk: <strong>{matchedHosp.phone || matchedHosp.contact || '0251-2489000'}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="step2-tag-badge">
                      🏛️ Schemes: {selectedScheme || 'PM-JAY & MJPJAY'}
                    </span>
                    <span className="step2-tag-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                      🩺 Specialty: {selectedSpecialty}
                    </span>
                  </div>
                </div>

                {/* Live Bed Telemetry Metric Boxes */}
                <div className="step2-telemetry-grid" style={{ marginTop: '14px' }}>
                  <div className="step2-telemetry-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL BED CAPACITY</span>
                      <BedDouble size={16} color="#64748b" />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', display: 'block' }}>
                      {matchedHosp.totalBeds || 180} Beds
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>Multi-Specialty Wards</span>
                  </div>

                  <div className="step2-telemetry-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>GENERAL BEDS AVAILABLE</span>
                      <Activity size={16} color="#166534" />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginTop: '4px', display: 'block' }}>
                      {matchedHosp.bedsAvailable ?? 45} Free
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>Ready for Admission</span>
                  </div>

                  <div className="step2-telemetry-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1' }}>ICU / CICU BEDS AVAILABLE</span>
                      <HeartPulse size={16} color="#0369a1" />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1', marginTop: '4px', display: 'block' }}>
                      {matchedHosp.availableIcuBeds ?? 8} Free / {matchedHosp.totalIcuBeds || 30}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>Critical Care Monitoring</span>
                  </div>

                  <div className="step2-telemetry-box" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce' }}>VENTILATORS & DIALYSIS</span>
                      <Sparkles size={16} color="#7e22ce" />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7e22ce', marginTop: '4px', display: 'block' }}>
                      {matchedHosp.availableVentilators ?? 4} Free
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: 600 }}>Cathlab & Dialysis Active</span>
                  </div>
                </div>

                {/* Available Doctors & Duty Roster for the Selected Specialty */}
                <div className="step2-doctors-roster-section">
                  <div className="step2-doctors-roster-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stethoscope size={18} color="#0284c7" />
                      <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                        Empanelled Doctors & Specialist Availability
                      </h5>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: hospitalSpecificDoctors.length > 0 ? '#eff6ff' : '#f8fafc',
                        color: hospitalSpecificDoctors.length > 0 ? '#1d4ed8' : '#64748b',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {loadingHospitalDoctors
                        ? 'Loading Specialists...'
                        : `Showing ${hospitalSpecificDoctors.length} On-Duty Specialist(s)`}
                    </span>
                  </div>

                  {hospitalSpecificDoctors.length === 0 ? (
                    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                      No doctor duty roster records currently listed for {matchedHosp.name}. Hospital on-call emergency team will be assigned by default.
                    </div>
                  ) : (
                    <div className="step2-doctors-table-wrapper">
                      <table className="step2-doctors-table">
                        <thead>
                          <tr>
                            <th style={{ minWidth: '200px' }}>Doctor Name & Qualification</th>
                            <th style={{ minWidth: '160px' }}>Specialty / Department</th>
                            <th style={{ minWidth: '150px' }}>OPD Shift & Timings</th>
                            <th style={{ minWidth: '100px' }}>Room / Location</th>
                            <th style={{ minWidth: '110px' }}>Availability</th>
                            <th style={{ minWidth: '110px' }}>Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hospitalSpecificDoctors.map((doc) => {
                            const docSpecsStr = String(doc.specialization || (Array.isArray(doc.specialties) ? doc.specialties.join(' ') : doc.specialties) || '').toLowerCase();
                            const isSpecMatch = selectedSpecialties.some(s => docSpecsStr.includes(s.toLowerCase().split(/[\s&,/]+/)[0]));
                            const avail = AVAILABILITY_CONFIG[doc.availability_status] || AVAILABILITY_CONFIG.Available;

                            return (
                              <tr
                                key={doc.id || doc.name}
                                className={isSpecMatch ? 'spec-matched-row' : ''}
                              >
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                                        {doc.name}
                                      </span>
                                      {isSpecMatch && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                          🩺 Specialty Doctor
                                        </span>
                                      )}
                                    </div>
                                    {doc.qualification && (
                                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                        {doc.qualification} {doc.experience ? `• ${doc.experience}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700, color: isSpecMatch ? '#166534' : '#0369a1', fontSize: '0.78rem' }}>
                                    {doc.specialization || 'Clinical Specialist'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                                    ⏰ {doc.opd_timing || doc.opd_shift || 'Shift Duty'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                                    {doc.room_number || 'OPD Ward'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className="step2-doc-pill"
                                    style={{
                                      backgroundColor: avail.bg,
                                      color: avail.text,
                                      borderColor: avail.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid'
                                    }}
                                  >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: avail.dot, display: 'inline-block' }} />
                                    {doc.availability_status || 'Available'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                                    📞 {doc.contact_number || doc.phone || matchedHosp.phone || '9876543210'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 6: Assigned ArogyaSevak at Selected Hospital (Only shown when hospital is selected) */}
            {selectedHospital && (
              <div className="step2-card-section">
                <div className="step2-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="#0284c7" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      6. Assigned ArogyaSevak at {matchedHosp ? matchedHosp.name : selectedHospital}
                    </h4>
                  </div>
                  <span
                    className="step2-pill-badge"
                    style={{
                      background: allocatedSevaks.length > 0 ? '#dcfce7' : '#fef3c7',
                      color: allocatedSevaks.length > 0 ? '#166534' : '#92400e',
                      borderColor: allocatedSevaks.length > 0 ? '#86efac' : '#fde68a'
                    }}
                  >
                    {loadingHospitalSevaks
                      ? 'Checking Sevaks...'
                      : `Showing ${allocatedSevaks.length} On-Ground Sevak(s)`}
                  </span>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allocatedSevaks.length === 0 ? (
                    <div style={{ background: '#fffbeb', border: '1.5px dashed #fcd34d', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.85rem', fontWeight: 700 }}>
                        <AlertTriangle size={18} color="#d97706" />
                        <span>No Arogya Sevak is currently assigned to {matchedHosp ? matchedHosp.name : selectedHospital}.</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#78350f' }}>
                        You can assign an Arogya Sevak to this hospital in Hospital Management, or choose an active on-call Arogya Sevak from the system list below:
                      </p>

                      {/* Fallback Selector for all active Sevaks */}
                      <div className="form-group" style={{ margin: 0, marginTop: '4px' }}>
                        <select
                          className="custom-select"
                          value={selectedSevak}
                          onChange={handleSevakChange}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: '600', fontSize: '0.85rem', background: '#fff' }}
                        >
                          <option value="">-- Assign from All Active Sevaks (Optional) --</option>
                          {(arogyaSevaks || []).map((s) => (
                            <option key={s.id} value={`${s.name} — ${matchedHosp?.name || s.hospital} (${s.patients || 0} active cases)`}>
                              👤 {s.name} — {s.hospital || 'General'} • Phone: {s.mobile || s.phone || '9823012345'} ({s.patients || 0} active cases)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Dropdown Selector */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="input-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>
                          Select Primary ArogyaSevak: *
                        </label>
                        <select
                          className="custom-select"
                          value={selectedSevak}
                          onChange={handleSevakChange}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '7px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '0.875rem', background: '#fff' }}
                        >
                          <option value="">-- Choose ArogyaSevak --</option>
                          {allocatedSevaks.map((s) => (
                            <option key={s.id} value={`${s.name} — ${matchedHosp?.name || s.hospital} (${s.patients || 0} active cases)`}>
                              👤 {s.name} — {matchedHosp?.name || s.hospital} • Phone: {s.mobile || s.phone || '9823012345'} ({s.patients || 0} active cases)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Visual Sevak Cards Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '4px' }}>
                        {allocatedSevaks.map((s) => {
                          const isSevakSelected = selectedSevak && (selectedSevak.includes(s.name) || s.name === selectedSevak);
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                const newStr = `${s.name} — ${matchedHosp?.name || s.hospital} (${s.patients || 0} active cases)`;
                                handleSevakChange({ target: { value: newStr } });
                              }}
                              className={`step2-sevak-card ${isSevakSelected ? 'selected' : ''}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="step2-sevak-avatar">
                                  {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                                      {s.name}
                                    </span>
                                    {isSevakSelected && <CheckCircle2 size={16} color="#166534" />}
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                                    📞 {s.mobile || s.phone || '9823012345'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem' }}>
                                <span style={{ color: '#475569' }}>Active Cases:</span>
                                <span style={{ fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                                  {s.patients || 0} Cases
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 7: Preferred Admission Date & Navigation Footer */}
            <div className="step2-card-section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'center' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ fontWeight: '700', fontSize: '0.825rem', color: '#0f172a', marginBottom: '6px' }}>
                    Preferred Patient Visit Date (भेट देण्याची तारीख): *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Select Visit Date (DD/MM/YYYY)"
                      value={preferredAdmissionDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '7px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '0.875rem', background: '#fff' }}
                    />
                    <input
                      type="date"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [y, m, d] = val.split('-');
                          handleDateChange(`${d}/${m}/${y}`);
                        }
                      }}
                    />
                    <Calendar
                      size={16}
                      color="#64748b"
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                  ℹ️ Once confirmed, patient details, scheme, and hospital assignment will be locked and carried forward to generate internal notes & citizen WhatsApp notification.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStepTab(1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      color: '#334155',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Back to Step 1: Document Review</span>
                  </button>

                  {!isClaimedByOther && (
                    <button
                      type="button"
                      onClick={handleReject}
                      className="btn-reject-action"
                    >
                      <X size={15} />
                      <span>Does Not Fit Scheme / Reject</span>
                    </button>
                  )}
                </div>

                {isClaimedByOther ? (
                  <button
                    type="button"
                    onClick={() => setActiveStepTab(3)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 22px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Next: View Notes & WhatsApp (Read-Only)</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmHospitalSevak}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 24px',
                      background: (!selectedScheme || !selectedHospital || !selectedSevak || !preferredAdmissionDate) ? '#94a3b8' : '#166534',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      cursor: (!selectedScheme || !selectedHospital || !selectedSevak || !preferredAdmissionDate) ? 'not-allowed' : 'pointer',
                      boxShadow: (!selectedScheme || !selectedHospital || !selectedSevak || !preferredAdmissionDate) ? 'none' : '0 2px 6px rgba(22, 101, 52, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Confirm & Continue to Step 3: Notes & WhatsApp</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: NOTES & WHATSAPP MESSAGE */}
        {activeStepTab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Step 3: Notes for Sevak & WhatsApp Message for Applicant
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Set priority, clinical notes for the ArogyaSevak, and WhatsApp / SMS confirmation for the patient.
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: step3Completed ? '#dcfce7' : '#fef3c7', color: step3Completed ? '#166534' : '#b45309', border: `1px solid ${step3Completed ? '#86efac' : '#fde68a'}` }}>
                {step3Completed ? '✓ Notes Confirmed' : '⚠️ Pending Confirmation'}
              </span>
            </div>

            {/* Note for Sevak */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.825rem', color: '#0f172a' }}>
                  Internal Instructions for ArogyaSevak ({cleanSevakName}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Priority:</span>
                  <select
                    value={priority}
                    disabled={isClaimedByOther}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '0.75rem' }}
                  >
                    <option value="Urgent">🚨 Urgent</option>
                    <option value="High">⚡ High</option>
                    <option value="Normal">📌 Normal</option>
                    <option value="Low">🔹 Low</option>
                  </select>
                </div>
              </div>
              <textarea
                rows={3}
                value={operatorNote}
                readOnly={isClaimedByOther}
                onChange={(e) => {
                  setOperatorNote(e.target.value);
                  setNotesConfirmed(false);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: isClaimedByOther ? '#f8fafc' : '#ffffff' }}
              />
            </div>

            {/* WhatsApp Message */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ fontWeight: '700', fontSize: '0.825rem', color: '#0f172a' }}>
                  📱 WhatsApp / SMS Message to Citizen on Approval:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Visible to Citizen
                </span>
              </div>
              <textarea
                rows={3}
                value={applicantSmsMessage}
                readOnly={isClaimedByOther}
                onChange={(e) => {
                  setApplicantSmsMessage(e.target.value);
                  setNotesConfirmed(false);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: isClaimedByOther ? '#f8fafc' : '#ffffff' }}
              />
            </div>

            {/* Step 3 Footer Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setActiveStepTab(2)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontWeight: '700',
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Back to Step 2</span>
                </button>

                {!isClaimedByOther && (
                  <button
                    type="button"
                    onClick={handleReject}
                    className="btn-reject-action"
                    title="Reject this application (Reopenable within 60 days)"
                  >
                    <XCircle size={15} />
                    <span>Reject Case</span>
                  </button>
                )}
              </div>

              {isClaimedByOther ? (
                <button
                  onClick={() => setActiveStepTab(4)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>Next: View Step 4 (Read-Only)</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleConfirmNotesSms}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>Save & Continue to Step 4: Final Approval</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: APPROVE & ASSIGN CASE */}
        {activeStepTab === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Step 4: Final Review & Approval
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Review all prerequisites below and authorize the case for empanelled admission.
                </span>
              </div>
            </div>

            {/* Checklist Summary Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '800', color: '#0f172a' }}>
                Pre-Approval Verification Checklist
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#ffffff', border: `1px solid ${step1Completed ? '#bbf7d0' : '#fecaca'}`, borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Step 1: Documents</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: step1Completed ? '#166534' : '#b91c1c', marginTop: '2px' }}>
                    {step1Completed ? '✓ All Documents Verified' : '⚠️ Pending Document Verification'}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Step 2: Hospital & Sevak</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                    ✓ {matchedHosp.name} ({cleanSevakName})
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Step 3: Notes & WhatsApp</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                    ✓ Notes & SMS Configured ({priority} Priority)
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                onClick={() => setActiveStepTab(3)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  fontWeight: '700',
                  fontSize: '0.825rem',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={16} />
                <span>Back to Step 3</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isClaimedByOther ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '0.85rem'
                    }}
                    title={`This case is claimed and under review by Admin ${reviewerName}. You have read-only access.`}
                  >
                    <ShieldCheck size={18} color="#d97706" />
                    <span>🔒 Read-Only Mode (Claimed by Admin {reviewerName})</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleHold}
                      style={{
                        padding: '9px 16px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        color: '#b45309',
                        fontWeight: '700',
                        fontSize: '0.825rem',
                        cursor: 'pointer'
                      }}
                    >
                      Hold Case
                    </button>

                    <button
                      onClick={handleReject}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '9px 16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontWeight: '700',
                        fontSize: '0.825rem',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={15} />
                      <span>Reject Case</span>
                    </button>

                    {isCaseApproved ? (
                      <button
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '11px 24px',
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #86efac',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Check size={18} strokeWidth={3} />
                        <span>✓ Case Already Approved & Assigned</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleApprove}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '11px 24px',
                          background: '#166534',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(22, 101, 52, 0.25)'
                        }}
                      >
                        <Check size={18} strokeWidth={3} />
                        <span>Approve & Assign Case</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default ReviewApprove;
