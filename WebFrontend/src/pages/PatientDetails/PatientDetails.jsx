import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  FilePlus,
  FileText,
  Eye,
  Download,
  Upload,
  UploadCloud,
  RotateCw,
  Check,
  Circle,
  CheckCircle2,
  X,
  Building2,
  ShieldCheck,
  UserCheck,
  Copy,
  Receipt,
  AlertTriangle,
  Stethoscope,
  Camera,
  Folder,
  Plus,
  Clock,
  Calendar,
  Search,
  Pause,
  ArrowRight,
  MousePointerClick,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import patientService, { getLocalizedPriorityNote, buildOpdCaseProgress, OPD_TREATMENT_STAGES_LIST } from '@/services/patientService';
import opdService from '@/services/opdService';
import { downloadDocFile, downloadRemoteFile, generateDocText } from '@/utils/docUtils';
import { ROUTES } from '@/utils/constants';
import UploadDocumentModal from '@/components/common/UploadDocumentModal/UploadDocumentModal';
import Loader from '@/components/common/Loader/Loader';
import '../OPDLogs/OPDLogs.css';
import './PatientDetails.css';

const BASE_ALLOCATED_CASES = [];

const CLINICAL_TREATMENT_STAGES = [
  { label: 'Admitted', date: 'Today', state: 'active', note: 'Admitted & vitals recorded' },
  { label: 'Diagnostic Stage', date: '', state: 'pending', note: '' },
  { label: 'Under Treatment', date: '', state: 'pending', note: '' },
  { label: 'Surgery Scheduled', date: '', state: 'pending', note: '' },
  { label: 'Post-Op Recovery', date: '', state: 'pending', note: '' },
  { label: 'On Hold', date: '', state: 'pending', note: '' },
  { label: 'Discharged', date: '', state: 'pending', note: '' },
  { label: 'Completed', date: '', state: 'pending', note: '' },
];

const OPD_DOCTORS_LIST = [
  'Dr. Nilesh Bapat (General Physician)',
  'Dr. Arvind Mahadeo Joshi (Cardiothoracic Surgeon)',
  'Dr. Meenal Kulkarni-Deshpande (Interventional Cardiologist)',
  'Dr. Rajesh Vitthalrao Salunkhe (Orthopedics & Trauma)',
  'Dr. Farhan N. Merchant (Nephrologist & Dialysis)',
  'Dr. Sunanda Balkrishna Shinde (Ophthalmologist)',
  'Dr. Ananya Deshmukh (Cardiology)',
  'Dr. Suresh R. Patil (General Medicine)',
  'Dr. Priya Nair (Pediatrician)',
  'Dr. Rahul S. Deshmukh (General Surgeon)',
  'Dr. Anjali Patil (Gynecologist)',
  'Dr. Rohan Kulkarni (Consulting Physician)',
];

const getDefaultFollowUpDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

const VISIT_TYPES = [
  'New Consultation',
  'Follow-Up',
  'Scheme Verification',
  'Diagnostic / Lab Test',
  'Emergency Triage'
];

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Nephrology',
  'Surgery'
];

const getStageStatusMapping = (stageLabel, isOpd = false) => {
  const label = (stageLabel || '').toLowerCase();
  if (label.includes('completed') || label.includes('closed')) {
    return {
      status: isOpd ? 'Closed' : (label.includes('discharged') ? 'Discharged' : 'Completed'),
      statusVariant: 'success',
      category: 'discharged',
      actionType: 'view',
    };
  } else if (label.includes('closure requested') || label.includes('closure_requested')) {
    return {
      status: 'Closure Requested',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('not visited') || label.includes('no show')) {
    return {
      status: 'Not Visited',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('follow-up') || label.includes('followup')) {
    return {
      status: 'Follow-up Scheduled',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('visited')) {
    return {
      status: 'Visited',
      statusVariant: 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('scheduled')) {
    return {
      status: 'Scheduled',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('discharged')) {
    return {
      status: 'Discharged',
      statusVariant: 'discharged',
      category: 'discharged',
      actionType: 'view',
    };
  } else if (label.includes('on hold') || label.includes('hold')) {
    return {
      status: 'On Hold',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('surgery') || label.includes('post-op')) {
    return {
      status: stageLabel || 'Surgery Scheduled',
      statusVariant: 'surgery',
      category: 'surgery',
      actionType: 'update',
    };
  } else if (label.includes('diagnostic') || label.includes('diagnosis') || label.includes('lab')) {
    return {
      status: 'Diagnostic Stage',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('admitted')) {
    return {
      status: 'Admitted',
      statusVariant: 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  } else {
    return {
      status: isOpd ? 'Scheduled' : 'Under Treatment',
      statusVariant: isOpd ? 'opd' : 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  }
};

const getPatientRelativeInfo = (p) => {
  if (!p) return { name: '—', relation: 'Family / Relative', phone: '—' };

  if (p.relativeName) {
    return {
      name: p.relativeName,
      relation: p.relativeRelation || 'Relative',
      phone: p.relativePhone || p.familyPhone || p.relativeContact || p.phone || p.mobile || '—',
    };
  }

  return {
    name: p.relativeName || '—',
    relation: p.relativeRelation || 'Relative / Family',
    phone: p.relativePhone || p.familyPhone || p.relativeContact || p.phone || p.mobile || '—',
  };
};

export const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  // Instant SWR state hydration from memory/cache for 0ms initial render
  const initialCachedPatient = React.useMemo(() => {
    const cached = patientService.getCachedPatientById(id);
    if (cached && cached.name && cached.name !== 'Assigned Patient' && cached.name !== 'Patient' && cached.name !== 'Akanksha Pawashe') {
      return cached;
    }
    return null;
  }, [id]);
  const [patient, setPatient] = useState(initialCachedPatient);
  const [loading, setLoading] = useState(() => !initialCachedPatient);

  // Modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [stepClickModal, setStepClickModal] = useState({
    isOpen: false,
    targetStep: null,
    targetIdx: -1,
    note: '',
  });
  const [showDocModal, setShowDocModal] = useState(false);
  const [prefillDocTitle, setPrefillDocTitle] = useState('');
  const [prefillReqDocId, setPrefillReqDocId] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState({
    title: 'Call Patient',
    name: '',
    relation: 'Patient Primary',
    number: '',
  });
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Bill Form States
  const [billCategory, setBillCategory] = useState('ICU & Ventilator Charges');
  const [billInvoiceNo, setBillInvoiceNo] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [billAmount, setBillAmount] = useState('');
  const [schemeLimit, setSchemeLimit] = useState('150000');
  const [billRemarks, setBillRemarks] = useState('');
  const [billPhotoName, setBillPhotoName] = useState('');
  const [billPhotoPreview, setBillPhotoPreview] = useState('');
  const [billSuccess, setBillSuccess] = useState(false);

  const [newStatus, setNewStatus] = useState(() => initialCachedPatient?.status || 'Admitted');
  const [selectedStage, setSelectedStage] = useState(() => {
    const activeStepObj = initialCachedPatient?.caseProgress?.find((s) => s.state === 'active') ||
      initialCachedPatient?.caseProgress?.filter((s) => s.state === 'completed').slice(-1)[0];
    return activeStepObj?.label || initialCachedPatient?.treatmentStage || 'Admitted';
  });
  const [newNote, setNewNote] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docType, setDocType] = useState('PDF Report');
  const [docFileName, setDocFileName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);

  // OPD Treatment Progress Modal states
  const [opdProgressVisitStatus, setOpdProgressVisitStatus] = useState('visited'); // 'visited' | 'not_visited'
  const [opdProgressConsultationNotes, setOpdProgressConsultationNotes] = useState('');
  const [opdProgressFollowUpRequired, setOpdProgressFollowUpRequired] = useState(false);
  const [opdProgressFollowUpDate, setOpdProgressFollowUpDate] = useState(getDefaultFollowUpDate());
  const [opdProgressFollowUpNotes, setOpdProgressFollowUpNotes] = useState('');
  const [opdProgressRequestClosure, setOpdProgressRequestClosure] = useState(false);
  const [opdProgressClosureReason, setOpdProgressClosureReason] = useState('');
  const [opdProgressNotVisitedAction, setOpdProgressNotVisitedAction] = useState('wait'); // 'wait' | 'request_closure'
  const [opdProgressNotVisitedReason, setOpdProgressNotVisitedReason] = useState('');

  // OPD Log Visit Modal states
  const [showLogOPDModal, setShowLogOPDModal] = useState(false);
  const [opdDoctor, setOpdDoctor] = useState(OPD_DOCTORS_LIST[0]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [opdFollowUpRequired, setOpdFollowUpRequired] = useState(true);
  const [opdFollowUpDate, setOpdFollowUpDate] = useState(getDefaultFollowUpDate());
  const [opdNotes, setOpdNotes] = useState('');
  const [opdAttachedDoc, setOpdAttachedDoc] = useState(null);
  const [opdSuccess, setOpdSuccess] = useState(false);
  const [opdSubmitting, setOpdSubmitting] = useState(false);
  const [resolvingOpdId, setResolvingOpdId] = useState(null);
  const [opdCaseSearch, setOpdCaseSearch] = useState('');
  const [opdSelectedCaseId, setOpdSelectedCaseId] = useState('');

  const filteredDoctors = React.useMemo(() => {
    const q = (opdDoctor || '').toLowerCase().trim();
    if (!q) return OPD_DOCTORS_LIST;
    const exactMatch = OPD_DOCTORS_LIST.some((d) => d.toLowerCase() === q);
    if (exactMatch) return OPD_DOCTORS_LIST;
    return OPD_DOCTORS_LIST.filter((d) => d.toLowerCase().includes(q));
  }, [opdDoctor]);

  const allAllocatedCases = React.useMemo(() => {
    const list = [...BASE_ALLOCATED_CASES];
    if (patient && !list.some((c) => c.id === patient.id)) {
      list.unshift({
        id: patient.id,
        patientName: patient.name,
        age: patient.age || 45,
        gender: patient.gender || 'Male',
        phone: patient.phone || patient.mobile || '+91 98220 54321',
        diagnosis: patient.diagnosis || 'Cardiology Consultation & Follow-Up',
      });
    }
    return list;
  }, [patient]);

  // Translation helpers for Modals
  const getStageLabel = (stage) => {
    switch (stage) {
      case 'Admitted': return t('patientDetails.stageAdmitted', 'Admitted');
      case 'Diagnostic Stage': return t('patientDetails.stageDiagnostic', 'Diagnostic Stage');
      case 'Under Treatment': return t('patientDetails.stageUnderTreatment', 'Under Treatment');
      case 'Surgery Scheduled': return t('patientDetails.stageSurgeryScheduled', 'Surgery Scheduled');
      case 'Post-Op Recovery': return t('patientDetails.stagePostOpRecovery', 'Post-Op Recovery');
      case 'On Hold': return t('patientDetails.stageOnHold', 'On Hold');
      case 'Discharged': return t('patientDetails.stageDischarged', 'Discharged');
      case 'Completed': return t('patientDetails.stageCompleted', 'Completed');
      case 'Scheduled': return t('patientDetails.stageScheduled', 'Scheduled');
      case 'Visited': return t('patientDetails.stageVisited', 'Visited');
      case 'Not Visited': return t('patientDetails.stageNotVisited', 'Not Visited');
      case 'Follow-up':
      case 'Follow-up Scheduled': return t('patientDetails.stageFollowUp', 'Follow-up');
      case 'Closure Requested': return t('patientDetails.stageClosureRequested', 'Closure Requested');
      case 'Closed': return t('patientDetails.stageClosed', 'Closed');
      default: return stage;
    }
  };

  const getOpdVisitTypeLabel = (type) => {
    switch (type) {
      case 'New Consultation': return t('opdModal.newConsultation', 'New Consultation');
      case 'Follow-Up': return t('opdModal.followUp', 'Follow-Up');
      case 'Scheme Verification': return t('opdModal.schemeVerification', 'Scheme Verification');
      case 'Diagnostic / Lab Test': return t('opdModal.diagnosticLabTest', 'Diagnostic / Lab Test');
      case 'Emergency Triage': return t('opdModal.emergencyTriage', 'Emergency Triage');
      default: return type;
    }
  };

  const getOpdDeptLabel = (dept) => {
    switch (dept) {
      case 'General Medicine': return t('opdModal.generalMedicine', 'General Medicine');
      case 'Cardiology': return t('opdModal.cardiology', 'Cardiology');
      case 'Orthopedics': return t('opdModal.orthopedics', 'Orthopedics');
      case 'Pediatrics': return t('opdModal.pediatrics', 'Pediatrics');
      case 'Obstetrics & Gynecology': return t('opdModal.obstetricsGynecology', 'Obstetrics & Gynecology');
      case 'General Surgery':
      case 'Surgery': return t('opdModal.generalSurgery', 'General Surgery');
      case 'Nephrology': return t('doctorModal.nephrologyDialysis', 'Nephrology');
      default: return dept;
    }
  };

  useEffect(() => {
    if (patient && !opdSelectedCaseId) {
      setOpdSelectedCaseId(patient.id);
    }
  }, [patient, opdSelectedCaseId]);

  const filteredAllocatedCases = allAllocatedCases.filter((c) => {
    const query = opdCaseSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      c.patientName.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.diagnosis.toLowerCase().includes(query)
    );
  });

  const fetchPatient = useCallback(async () => {
    if (!id) return;
    try {
      if (!patient) {
        setLoading(true);
      }

      // Parallelize patient details, OPD visits, and documents fetches concurrently
      const [patientRes, opdRes, docsRes] = await Promise.allSettled([
        patientService.getPatientById(id),
        opdService.getOpdVisitsByCaseId(id),
        patientService.getPatientDocuments(id),
      ]);

      const data = patientRes.status === 'fulfilled' && patientRes.value ? patientRes.value : (patient || initialCachedPatient);
      if (!data) return;

      // Sanitize legacy mock progress if present
      if (data.caseProgress && Array.isArray(data.caseProgress)) {
        let changed = false;
        if (data.caseProgress.some(s => s.date === '13 Jun 2026' || s.date === '13 Jun 2025' || s.date === '16 Jun 2026' || s.date === '16 Jun 2025')) {
          data.caseProgress = CLINICAL_TREATMENT_STAGES.map(s => s.label === 'Admitted' ? { ...s, date: data.submittedDate || 'Today' } : s);
          data.status = 'Admitted';
          data.treatmentStage = 'Admitted';
          data.sevakReportedStatus = 'Admitted';
          changed = true;
        }
        if (changed) {
          patientService.updatePatient(data.id, {
            caseProgress: data.caseProgress,
            treatmentStage: 'Admitted',
            sevakReportedStatus: 'Admitted',
            status: 'Admitted'
          });
        }
      }

      // Live OPD visits
      if (opdRes.status === 'fulfilled' && Array.isArray(opdRes.value) && opdRes.value.length > 0) {
        data.opdVisits = opdRes.value;
      }

      // Live documents from application_documents table
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value) && docsRes.value.length > 0) {
        const apiDocs = docsRes.value;
        const apiDocIds = new Set(apiDocs.map((d) => d.id));
        const localOnlyDocs = (data.documents || []).filter((d) => d.id && !apiDocIds.has(d.id));
        data.documents = [...apiDocs, ...localOnlyDocs];
      }

      // Ensure caseProgress matches real treatmentStage and sanitize admin remarks
      const isExcludedNote = (txt) => {
        if (!txt || typeof txt !== 'string') return false;
        const lower = txt.toLowerCase();
        return (
          lower.includes('[critical') ||
          lower.includes('reassigned') ||
          lower.includes('transferred from') ||
          lower.includes('[admin note]') ||
          lower.includes('[escalation') ||
          lower.includes('[decision') ||
          lower.includes('🚨')
        );
      };

      if (data.caseProgress && Array.isArray(data.caseProgress)) {
        data.caseProgress = data.caseProgress.map(s => {
          if (isExcludedNote(s.note)) {
            return {
              ...s,
              note: s.label === 'Admitted' ? 'Admitted & vitals recorded' : (s.label ? `Current Status: ${s.label}` : ''),
            };
          }
          return s;
        });
      }

      const currentStage = data.treatmentStage || data.sevakReportedStatus || data.status || 'Admitted';
      if (Array.isArray(data.caseProgress) && data.caseProgress.length === 8) {
        const activeStep = data.caseProgress.find(s => s.state === 'active') || data.caseProgress.filter(s => s.state === 'completed').slice(-1)[0];
        if (!activeStep || activeStep.label?.toLowerCase() !== currentStage.toLowerCase()) {
          const targetIdx = CLINICAL_TREATMENT_STAGES.findIndex(cs => cs.label.toLowerCase() === currentStage.toLowerCase());
          const activeIdx = targetIdx >= 0 ? targetIdx : 0;
          const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          data.caseProgress = CLINICAL_TREATMENT_STAGES.map((s, idx) => {
            if (idx < activeIdx) {
              return { ...s, state: 'completed', date: idx === 0 ? (data.submittedDate || 'Today') : todayStr, note: idx === 0 ? 'Admitted & vitals recorded' : '' };
            } else if (idx === activeIdx) {
              const isFinal = s.label === 'Discharged' || s.label === 'Completed';
              const isHold = s.label === 'On Hold';
              return { ...s, state: isFinal ? 'completed' : (isHold ? 'hold' : 'active'), date: todayStr, note: (s.label === 'Admitted' ? 'Admitted & vitals recorded' : `Current Status: ${s.label}`) };
            } else {
              return { ...s, state: 'pending', date: '', note: '' };
            }
          });
        }
      }

      setPatient({ ...data });
      setNewStatus(currentStage);
      setSelectedStage(currentStage);
    } catch (err) {
      console.error('Failed to fetch patient details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, patient, initialCachedPatient]);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const handleStepClick = (targetStep, targetIdx) => {
    if (!patient) return;
    setStepClickModal({
      isOpen: true,
      targetStep,
      targetIdx,
      note: targetStep.note === 'Step Skipped' ? '' : (targetStep.note || ''),
    });
  };

  const executeStageUpdate = async (targetStageLabel, noteText) => {
    if (!patient) return;

    const mapped = getStageStatusMapping(targetStageLabel);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const baseProgress = (patient.caseProgress && patient.caseProgress.length === 8)
      ? patient.caseProgress
      : CLINICAL_TREATMENT_STAGES;

    const targetIdx = baseProgress.findIndex((s) => s.label === targetStageLabel);
    if (targetIdx === -1) return;

    const updatedCaseProgress = baseProgress.map((step, idx) => {
      if (idx < targetIdx) {
        // Step 0 (Admitted) is the initial admission milestone and is NEVER canceled/skipped
        if (idx === 0) {
          return {
            ...step,
            state: 'completed',
            date: step.date && step.date !== 'Skipped ✕' ? step.date : todayStr,
            note: (step.note && step.note !== 'Step Skipped') ? step.note : 'Admitted & vitals recorded',
          };
        }

        // If this step was already completed, active, or on-hold in history, it was reached, so keep it completed
        if (step.state === 'completed' || step.state === 'active' || step.state === 'hold') {
          return {
            ...step,
            state: 'completed',
            date: step.date && step.date !== 'Skipped ✕' ? step.date : todayStr,
            note: step.note === 'Step Skipped' ? '' : (step.note || ''),
          };
        }

        // In-between unreached steps are marked as cancel/skipped with no note
        return {
          ...step,
          state: 'skipped',
          date: 'Skipped ✕',
          note: '',
        };
      } else if (idx === targetIdx) {
        const isFinal = targetStageLabel === 'Discharged' || targetStageLabel === 'Completed';
        const isHold = targetStageLabel === 'On Hold';
        return {
          ...step,
          state: isFinal ? 'completed' : (isHold ? 'hold' : 'active'),
          date: todayStr,
          note: noteText.trim() || (step.note === 'Step Skipped' ? '' : (step.note || '')),
        };
      } else {
        return {
          ...step,
          state: 'pending',
          date: '',
          note: '',
        };
      }
    });

    await patientService.updateTreatmentProgress(patient.id, {
      stage: targetStageLabel,
      note: noteText.trim() || `Treatment progress stage updated to "${targetStageLabel}"`,
      caseProgress: updatedCaseProgress,
      status: mapped.status,
      category: mapped.category,
      statusVariant: mapped.statusVariant,
    });

    setSelectedStage(targetStageLabel);
    await fetchPatient();
    setToastMessage(`Treatment progress updated to "${targetStageLabel}"`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleConfirmStepClick = async (e) => {
    e.preventDefault();
    if (!stepClickModal.targetStep) return;
    await executeStageUpdate(stepClickModal.targetStep.label, stepClickModal.note);
    setStepClickModal({ isOpen: false, targetStep: null, targetIdx: -1, note: '' });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!patient || !selectedStage) return;
    await executeStageUpdate(selectedStage, newNote);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowUpdateModal(false);
      setNewNote('');
    }, 600);
  };

  const handleOpdProgressSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return;

    let targetStage = 'Visited';
    let targetStatus = 'Visited';
    let noteText = '';
    let updatedProgress = [];

    if (opdProgressVisitStatus === 'visited') {
      if (opdProgressFollowUpRequired) {
        targetStage = 'Follow-up Scheduled';
        targetStatus = 'Follow-up Scheduled';
        noteText = opdProgressFollowUpNotes.trim() || `Follow-up scheduled for ${opdProgressFollowUpDate || 'upcoming date'}. ${opdProgressConsultationNotes.trim() ? `Note: ${opdProgressConsultationNotes.trim()}` : ''}`;
        updatedProgress = buildOpdCaseProgress({
          stage: 'Follow-up Scheduled',
          visitedDate: 'Today',
          visitedNote: opdProgressConsultationNotes.trim() || 'Patient visited OPD & consultation done',
          followUpRequired: true,
          followUpDate: opdProgressFollowUpDate,
          followUpNote: opdProgressFollowUpNotes.trim() || 'Follow-up consultation prescribed',
          note: noteText,
        });
      } else {
        if (opdProgressRequestClosure) {
          targetStage = 'Closure Requested';
          targetStatus = 'Closure Requested';
          noteText = opdProgressClosureReason.trim() || 'Patient visited, treatment complete, no further follow-up required. Closure requested for Admin approval.';
          updatedProgress = buildOpdCaseProgress({
            stage: 'Closure Requested',
            visitedDate: 'Today',
            visitedNote: opdProgressConsultationNotes.trim() || 'Patient visited OPD & consultation done',
            followUpRequired: false,
            closureRequested: true,
            closureNote: noteText,
            note: noteText,
          });
        } else {
          targetStage = 'Visited';
          targetStatus = 'Visited';
          noteText = opdProgressConsultationNotes.trim() || 'Patient visited OPD & consultation recorded.';
          updatedProgress = buildOpdCaseProgress({
            stage: 'Visited',
            visitedDate: 'Today',
            visitedNote: noteText,
            followUpRequired: false,
            note: noteText,
          });
        }
      }
    } else {
      // Patient did not visit
      if (opdProgressNotVisitedAction === 'request_closure') {
        targetStage = 'Closure Requested';
        targetStatus = 'Closure Requested';
        noteText = opdProgressNotVisitedReason.trim() || 'Patient did not visit on scheduled date and no response after follow-up attempts. Closure requested for Admin approval.';
        updatedProgress = buildOpdCaseProgress({
          stage: 'Closure Requested',
          isNotVisited: true,
          notVisitedNote: 'Patient did not visit / No show',
          closureRequested: true,
          closureNote: noteText,
          note: noteText,
        });
      } else {
        targetStage = 'Not Visited';
        targetStatus = 'Not Visited';
        noteText = opdProgressConsultationNotes.trim() || 'Patient did not visit on scheduled date. Sevak waiting for patient response.';
        updatedProgress = buildOpdCaseProgress({
          stage: 'Not Visited',
          isNotVisited: true,
          notVisitedNote: noteText,
          note: noteText,
        });
      }
    }

    const mapped = getStageStatusMapping(targetStage, true);

    await patientService.updateTreatmentProgress(patient.id, {
      stage: targetStage,
      note: noteText,
      caseProgress: updatedProgress,
      status: targetStatus,
      category: targetStatus === 'Closed' ? 'discharged' : 'ongoing',
      statusVariant: targetStatus === 'Closed' ? 'success' : (targetStatus === 'Closure Requested' ? 'warning' : (targetStatus === 'Not Visited' ? 'warning' : 'opd')),
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowUpdateModal(false);
      fetchPatient();
      setToastMessage(`OPD Treatment Progress updated to "${targetStage}"`);
      setTimeout(() => setToastMessage(''), 3000);
    }, 600);
  };



  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !patient) return;

    await patientService.addPatientDocument(patient.id, {
      title: docTitle.trim(),
      type: docType,
      size: docFileName ? '1.8 MB' : '1.2 MB',
    });

    setDocSuccess(true);
    setTimeout(() => {
      setDocSuccess(false);
      setShowDocModal(false);
      setDocTitle('');
      setDocFileName('');
      fetchPatient();
    }, 800);
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!billAmount || !patient) return;

    await patientService.addPatientBill(patient.id, {
      category: billCategory,
      invoiceNo: billInvoiceNo,
      amount: billAmount,
      limit: schemeLimit,
      remarks: billRemarks,
      billPhoto: billPhotoPreview || null,
      billPhotoName: billPhotoName || (billPhotoPreview ? 'hospital_bill_receipt.jpg' : ''),
    });

    setBillSuccess(true);
    setTimeout(() => {
      setBillSuccess(false);
      setShowBillModal(false);
      setBillAmount('');
      setBillRemarks('');
      setBillPhotoName('');
      setBillPhotoPreview('');
      setBillInvoiceNo(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      fetchPatient();
      setToastMessage('Hospital bill claim submitted successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    }, 600);
  };

  const handleUploadReqDoc = async (docItem, fileObj = null, isPhoto = false) => {
    if (!patient) return;
    const fileName = fileObj
      ? fileObj.name
      : isPhoto
        ? `${docItem.title.toLowerCase().replace(/\s+/g, '_')}_photo.jpg`
        : 'uploaded_document.pdf';

    await patientService.uploadAdminRequestedDoc(patient.id, docItem.id, docItem.title, fileName);

    setToastMessage(`Requested document "${docItem.title}" submitted successfully!`);
    setTimeout(() => setToastMessage(''), 3500);
    fetchPatient();
  };

  const handleResolveOpdFollowUp = async (visitId) => {
    if (!visitId) return;
    try {
      setResolvingOpdId(visitId);
      await opdService.resolveFollowUp(visitId);
      setToastMessage('OPD follow-up marked as Completed!');
      setTimeout(() => setToastMessage(''), 3000);
      await fetchPatient();
    } catch (err) {
      console.error('Error resolving OPD follow-up:', err);
      setToastMessage('Could not update follow-up status');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setResolvingOpdId(null);
    }
  };

  const handleRecordOPDVisitSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return;

    try {
      setOpdSubmitting(true);
      const formattedFollowUpDate = opdFollowUpDate
        ? new Date(opdFollowUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'In 7 Days';

      await opdService.logNewOpdVisit({
        caseId: patient.id,
        patientName: patient.name,
        age: patient.age || 45,
        gender: patient.gender || 'Male',
        contactPhone: patient.phone || patient.mobile || '+91 98220 54321',
        department: 'General Medicine',
        consultingDoctor: opdDoctor,
        visitType: 'Follow-Up',
        schemeEligibility: patient.scheme?.name || patient.scheme || 'MJPJAY Eligible',
        chiefComplaint: opdNotes || `Consultation recorded with ${opdDoctor}.`,
        nextFollowUpRequired: opdFollowUpRequired,
        nextFollowUpTimeline: opdFollowUpRequired ? formattedFollowUpDate : undefined,
        follow_up_date: opdFollowUpRequired ? opdFollowUpDate : undefined,
        prescriptionDoc: opdAttachedDoc || null,
        recordedBy: 'Arogya Sevak',
      });

      // Also persist to patientService
      await patientService.addPatientOPDVisit(patient.id, {
        visitType: 'Follow-Up',
        department: 'General Medicine',
        doctor: opdDoctor,
        followUpRequired: opdFollowUpRequired,
        dueDaysText: formattedFollowUpDate,
        followUpDate: opdFollowUpDate,
        notes: opdNotes || `Consultation recorded with ${opdDoctor}.`,
      });

      setOpdSuccess(true);
      setTimeout(() => {
        setOpdSuccess(false);
        setShowLogOPDModal(false);
        setOpdNotes('');
        setOpdAttachedDoc(null);
        fetchPatient();
        setToastMessage(`Record OPD Visit logged successfully for ${patient.name}!`);
        setTimeout(() => setToastMessage(''), 3500);
      }, 600);
    } catch (err) {
      console.error('Failed to log OPD visit:', err);
      setToastMessage('Failed to record OPD visit');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setOpdSubmitting(false);
    }
  };


  if (loading) {
    return (
      <Loader
        fullPage
        message="Loading Patient Dossier..."
        subtext="Fetching clinical progress, documents, vitals and hospital records"
      />
    );
  }

  if (!patient) {
    return (
      <div className="am-pd-error">
        <p>Patient record not found.</p>
        <button onClick={() => navigate(ROUTES.PATIENTS)} className="am-pd-back-btn">
          <ArrowLeft size={16} /> Back to Patients
        </button>
      </div>
    );
  }

  // Compute current active treatment progress status & variant for top header badge
  const activeProgressStep = patient.caseProgress?.find((s) => s.state === 'active') ||
    patient.caseProgress?.filter((s) => s.state === 'completed').slice(-1)[0];
  const currentProgressStatus = activeProgressStep?.label || patient.status || 'Treatment In Progress';
  const currentProgressVariant = getStageStatusMapping(currentProgressStatus).statusVariant || patient.statusVariant || 'treatment';

  const relativeInfo = getPatientRelativeInfo(patient);

  return (
    <div className="am-patient-details-page">
      {/* Top Header & Actions */}
      <div className="am-pd-header-bar">
        <div className="am-pd-title-group">
          <button className="am-pd-back-link" onClick={() => navigate(ROUTES.PATIENTS)}>
            <ArrowLeft size={18} />
            <span>{t('patientDetails.back', 'Back')}</span>
          </button>
          <h1 className="am-pd-name">
            {patient.name} <span className="am-pd-sep">—</span> {patient.id}
          </h1>
          <span className={`am-status-badge am-status-${currentProgressVariant}`}>
            {getStageLabel(currentProgressStatus)}
          </span>
        </div>

        <div className="am-pd-actions">
          {patient.isTransferredOut ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9', background: '#ede9fe', border: '1px solid #c4b5fd', padding: '6px 14px', borderRadius: '8px' }}>
              🔒 {t('patientDetails.readOnlyTag', 'Read Only Summary')}
            </span>
          ) : (
            <>
              <button
                className="am-pd-btn am-pd-btn-call"
                onClick={() => {
                  setCallTarget({
                    title: t('patientDetails.callPatient', 'Call Patient'),
                    name: patient.name,
                    relation: 'Patient Primary',
                    number: patient.phone || patient.mobile || '+91 98765 43210',
                    isRelative: false,
                  });
                  setShowCallModal(true);
                }}
                title={`Call Patient (${patient.phone || patient.mobile || '+91 98765 43210'})`}
              >
                <Phone size={16} />
                <span>{t('patientDetails.callPatient', 'Call Patient')}</span>
              </button>

              <button
                className="am-pd-btn am-pd-btn-call"
                style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
                onClick={() => {
                  setCallTarget({
                    title: t('patientDetails.callRelative', 'Call Relative'),
                    name: relativeInfo.name,
                    relation: relativeInfo.relation,
                    number: relativeInfo.phone,
                    isRelative: true,
                  });
                  setShowCallModal(true);
                }}
                title={`Call Relative (${relativeInfo.name} - ${relativeInfo.relation})`}
              >
                <UserCheck size={16} />
                <span>{t('patientDetails.callRelative', 'Call Relative')}</span>
              </button>

              <button className="am-pd-btn am-pd-btn-doc" onClick={() => setShowDocModal(true)}>
                <FilePlus size={16} />
                <span>{t('patientDetails.addDocument', 'Add Document')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transferred Out Read-Only Banner */}
      {patient.isTransferredOut && (
        <div
          className="am-transferred-out-banner"
          style={{
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderLeft: '5px solid #7c3aed',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔄</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#6d28d9' }}>
                  {patient.assignedToNewHospital
                    ? `${t('patientDetails.caseTransferredTo', 'Case Transferred to')} ${patient.assignedToNewHospital}`
                    : t('patientDetails.transferredBannerTitle', 'Case Transferred to Another Hospital')}
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#7c3aed' }}>
                  {patient.assignedToNewHospital
                    ? `${t('patientDetails.transferredBannerSubPrefix', 'This case has been transferred to')} ${patient.assignedToNewHospital}. ${t('patientDetails.readOnlyAccess', 'You have Read-Only access.')}`
                    : t('patientDetails.transferredBannerSub', 'This case has been handed over. You have Read-Only access.')}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', background: '#ede9fe', border: '1px solid #c4b5fd', padding: '4px 10px', borderRadius: '12px' }}>
              🔒 {t('patientDetails.readOnlyTag', 'Read Only Mode')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#4c1d95', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ede9fe' }}>
            {patient.assignedToNewHospital && (
              <div>
                <strong>{t('patientDetails.transferredTo', 'Transferred To')}:</strong> {patient.assignedToNewHospital}
              </div>
            )}
            {patient.assignedToNewSevak && (
              <div>
                <strong>{t('patientDetails.newSevak', 'New Arogya Sevak')}:</strong> {patient.assignedToNewSevak.name || patient.assignedToNewSevak} {patient.assignedToNewSevak.phone ? `(📱 ${patient.assignedToNewSevak.phone})` : ''}
              </div>
            )}
            {patient.transferReason && (
              <div>
                <strong>{t('patientDetails.transferReason', 'Reason')}:</strong> {patient.transferReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reassigned Incoming Banner */}
      {patient.isReassigned && !patient.isTransferredOut && (
        <div
          className="am-reassigned-incoming-banner"
          style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderLeft: '5px solid #9333ea',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#7e22ce' }}>
                  {t('patientDetails.reassignedBannerTitle', '🚨 Critical: Re-Assigned Case Assigned to You')}
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#9333ea' }}>
                  {t('patientDetails.reassignedBannerSub', 'Transferred due to lack of resources / facility unavailable at previous hospital')}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce', background: '#f3e8ff', border: '1px solid #d8b4fe', padding: '4px 10px', borderRadius: '12px' }}>
              🔄 {t('patientDetails.reassignedTag', 'Reassigned Case')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#581c87', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
            {patient.transferredFromHospital && (
              <div>
                <strong>{t('patientDetails.transferredFrom', 'Transferred From')}:</strong> {patient.transferredFromHospital}
              </div>
            )}
            {patient.transferReason && (
              <div>
                <strong>{t('patientDetails.transferReason', 'Reason')}:</strong> {patient.transferReason}
              </div>
            )}
            {patient.previousSevak && (
              <div>
                <strong>{t('patientDetails.prevSevak', 'Previous Arogya Sevak')}:</strong> {patient.previousSevak.name || patient.previousSevak} {patient.previousSevak.phone ? `(📱 ${patient.previousSevak.phone})` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Width Treatment Progress Card (Horizontal Stepper) */}
      {(() => {
        const isOPD = (patient.treatmentType || patient.type || '').toUpperCase() === 'OPD';
        const currentProgressSteps = isOPD
          ? (Array.isArray(patient.caseProgress) && patient.caseProgress.length >= 3 && patient.caseProgress.some(s => s.label === 'Scheduled' || s.label === 'Visited' || s.label === 'Not Visited')
              ? patient.caseProgress
              : buildOpdCaseProgress({
                  stage: patient.treatmentStage || patient.status || 'Scheduled',
                  scheduledDate: patient.admittedDateFormatted || patient.admissionDate || 'Today',
                  note: patient.latestWardUpdate || '',
                })
            )
          : ((patient.caseProgress && patient.caseProgress.length === 8)
              ? patient.caseProgress
              : CLINICAL_TREATMENT_STAGES
            );

        return (
          <>
            {/* OPD Closure Requested Banner */}
            {isOPD && (patient.status === 'Closure Requested' || patient.treatmentStage === 'Closure Requested' || patient.status === 'CLOSURE_REQUESTED') && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#92400e', fontSize: '13px' }}>⏳ Case Closure Requested — Pending District Health Admin Approval</strong>
                    <p style={{ margin: '2px 0 0', color: '#b45309', fontSize: '12px' }}>
                      Arogya Sevak submitted closure request: "{patient.latestWardUpdate || patient.notes || 'OPD consultation complete, no further follow-up required'}"
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  Pending Admin Approval
                </span>
              </div>
            )}

            {/* OPD Final Closed Banner */}
            {isOPD && (patient.status === 'Closed' || patient.treatmentStage === 'Closed' || patient.status === 'CLOSED') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#166534', fontSize: '13px' }}>✅ Case Officially Closed by District Health Administrator</strong>
                  <p style={{ margin: '2px 0 0', color: '#15803d', fontSize: '12px' }}>
                    This OPD case consultation and follow-up lifecycle is completed.
                  </p>
                </div>
              </div>
            )}

            <div className="am-pd-card am-pd-case-progress-card" style={{ marginBottom: '16px' }}>
              <div className="am-pd-notes-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="am-pd-card-title" style={{ margin: 0 }}>{t('patientDetails.treatmentProgress', 'Treatment Progress')}</h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: isOPD ? '#e0f2fe' : '#ede9fe', color: isOPD ? '#0369a1' : '#6d28d9', padding: '2px 8px', borderRadius: '10px', border: isOPD ? '1px solid #bae6fd' : '1px solid #ddd6fe' }}>
                      {isOPD ? 'OPD Care Mode' : 'IPD Ward Stepper'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {isOPD 
                      ? 'Track OPD visit status, follow-up scheduling, and admin closure request' 
                      : t('patientDetails.trackMilestones', 'Track clinical milestones, current stage, and progress notes')}
                  </span>
                </div>
                {patient.isTransferredOut ? (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '6px 12px', borderRadius: '6px', border: '1px solid #c4b5fd' }}>
                    🔒 {t('patientDetails.transferredLocked', 'Transferred (Read-Only)')}
                  </span>
                ) : (
                  <button className="am-pd-btn-update-progress-modern" onClick={() => setShowUpdateModal(true)}>
                    <RotateCw size={14} />
                    <span>{isOPD ? 'Update OPD Progress & Visit' : t('patientDetails.updateTreatmentProgress', 'Update Treatment Progress')}</span>
                  </button>
                )}
              </div>

              <div className="am-pd-stepper-horizontal">
                {currentProgressSteps.map((step, idx, arr) => {
                  const isCompleted = step.state === 'completed';
                  const isSkipped = step.state === 'skipped';
                  const isActive = step.state === 'active';
                  const isHold = step.state === 'hold' || (step.label === 'On Hold' && isActive);
                  const isClosureReq = step.label === 'Closure Requested' && isActive;
                  const isNotVisitedStep = step.label === 'Not Visited' && (isActive || isCompleted || isSkipped);
                  const isFollowUpStep = (step.label === 'Follow-up' || step.label === 'Follow-up Scheduled') && isActive;
                  const isFirst = idx === 0;
                  const isLast = idx === arr.length - 1;

                  const prevStep = arr[idx - 1];
                  const leftLineClass = prevStep
                    ? prevStep.state === 'completed' || prevStep.state === 'active' || prevStep.state === 'hold'
                      ? 'am-line-green'
                      : prevStep.state === 'skipped'
                        ? 'am-line-red'
                        : 'am-line-grey'
                    : 'am-line-grey';

                  const rightLineClass = isCompleted || isActive || isHold
                    ? 'am-line-green'
                    : isSkipped
                      ? 'am-line-red'
                      : 'am-line-grey';

                  return (
                    <div
                      key={idx}
                      className={`am-h-step-item ${isCompleted
                          ? 'is-completed'
                          : isHold || isClosureReq
                            ? 'is-hold'
                            : isSkipped || (isNotVisitedStep && !isCompleted)
                              ? 'is-skipped'
                              : isActive
                                ? 'is-active'
                                : 'is-pending'
                        }`}
                      title={isOPD ? `OPD Milestone: ${step.label}` : `Click to set stage to ${step.label}`}
                      onClick={() => isOPD ? setShowUpdateModal(true) : handleStepClick(step, idx)}
                    >
                      <div className="am-h-step-icon-wrap">
                        {!isFirst && <div className={`am-h-step-line-left ${leftLineClass}`} />}
                        {!isLast && <div className={`am-h-step-line-right ${rightLineClass}`} />}
                        {isCompleted ? (
                          <div className="am-h-step-icon am-icon-check" title="Completed">
                            <Check size={14} strokeWidth={2.6} />
                          </div>
                        ) : isClosureReq ? (
                          <div className="am-h-step-icon am-icon-hold" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#d97706' }} title="Closure Requested (Pending Admin)">
                            <Clock size={14} strokeWidth={2.6} />
                          </div>
                        ) : isHold ? (
                          <div className="am-h-step-icon am-icon-hold" title="On Hold">
                            <Pause size={13} strokeWidth={2.6} />
                          </div>
                        ) : isNotVisitedStep ? (
                          <div className="am-h-step-icon am-icon-skipped" style={{ background: '#fef2f2', borderColor: '#ef4444', color: '#dc2626' }} title="Not Visited">
                            <X size={14} strokeWidth={2.6} />
                          </div>
                        ) : isSkipped ? (
                          <div className="am-h-step-icon am-icon-skipped" title="Skipped">
                            <X size={14} strokeWidth={2.6} />
                          </div>
                        ) : isFollowUpStep ? (
                          <div className="am-h-step-icon am-icon-active" style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#2563eb' }} title="Follow-up Scheduled">
                            <Calendar size={13} strokeWidth={2.6} />
                          </div>
                        ) : isActive ? (
                          <div className="am-h-step-icon am-icon-active" title="Active Stage">
                            <div className="am-active-pulse" />
                            <div className="am-target-dot" />
                          </div>
                        ) : (
                          <div className="am-h-step-icon am-icon-empty" title="Pending">
                            <div className="am-empty-dot" />
                          </div>
                        )}
                      </div>

                      <div className="am-h-step-content">
                        <span className="am-h-step-label">{getStageLabel(step.label)}</span>
                        {isSkipped && !isOPD ? (
                          <span className="am-h-step-date" style={{ color: '#ef4444', fontWeight: 600 }}>
                            {t('patientDetails.skipped', 'Skipped')} ✕
                          </span>
                        ) : isClosureReq ? (
                          <span className="am-h-step-date" style={{ color: '#d97706', fontWeight: 700 }}>
                            Pending Admin ⏳
                          </span>
                        ) : isHold ? (
                          <span className="am-h-step-date" style={{ color: '#d97706', fontWeight: 600 }}>
                            {step.date || getStageLabel('On Hold')}
                          </span>
                        ) : step.date ? (
                          <span className="am-h-step-date">
                            {step.date === 'Today' ? t('common.today', 'Today') : step.date}
                          </span>
                        ) : null}

                        {/* Note entered at the time of update progress */}
                        {!isSkipped && step.note && step.note !== 'Step Skipped' && (() => {
                          const lower = (step.note || '').toLowerCase();
                          const isExcluded = (
                            lower.includes('[critical') ||
                            lower.includes('reassigned') ||
                            lower.includes('transferred from') ||
                            lower.includes('[admin note]') ||
                            lower.includes('[escalation') ||
                            lower.includes('[decision') ||
                            lower.includes('🚨')
                          );
                          if (isExcluded) return null;

                          let noteText = step.note;
                          if (noteText === 'Admitted & vitals recorded') {
                            noteText = t('patientDetails.admittedVitalsRecorded', 'Admitted & vitals recorded');
                          } else if (noteText && noteText.startsWith('Current Status:')) {
                            const rawStatus = noteText.replace('Current Status:', '').trim();
                            noteText = `${t('patientDetails.currentStatus', 'Current Status')}: ${getStageLabel(rawStatus)}`;
                          }

                          return (
                            <div className="am-h-step-note" title={noteText}>
                              <span>"{noteText}"</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {/* Direct Instructions & Notes from District Admin */}
      {(() => {
        const rawAdminNotes = Array.isArray(patient.adminNotes) && patient.adminNotes.length > 0
          ? patient.adminNotes
          : (patient.priorityNote?.text ? [{ id: 'p1', text: patient.priorityNote.text, by: patient.priorityNote.by || 'District Health Admin (Rohit Patil)', date: patient.priorityNote.date || 'Direct Instruction' }] : []);

        if (rawAdminNotes.length === 0) return null;

        return (
          <div
            className="am-pd-card am-admin-directives-card"
            style={{
              width: '100%',
              marginBottom: '16px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderLeft: '5px solid #0284c7',
              borderRadius: '10px',
              padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#0284c7', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                  📌
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0369a1' }}>
                    {t('patients.directInstructionTitle', 'Direct Instructions from District Admin')} ({rawAdminNotes.length})
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                    {t('dashboard.priorityInstructions', 'Priority Administrative Directives')}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '3px 10px', borderRadius: '12px' }}>
                {t('patients.criticalBadge', 'Action Required')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rawAdminNotes.map((an, idx) => {
                const locNote = getLocalizedPriorityNote(an, language, t);
                const displayText = locNote?.text || an.text || an.note || '';
                const displayBy = an.by || 'District Health Admin (Rohit Patil)';
                return (
                  <div
                    key={an.id || `an-${idx}`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e0f2fe',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.825rem' }}>
                        👤 {displayBy}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {an.date || t('patientDetails.recently', 'Recently')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#0f172a', lineHeight: '1.5', fontWeight: 500 }}>
                      "{displayText}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 2-Column Section: Patient Information & Relative Information */}
      <div className="am-pd-top-grid" style={{ marginBottom: '16px' }}>
        {/* Left Column: Patient Information */}
        <div className="am-pd-card">
          <h3 className="am-pd-card-title">{t('patientDetails.patientInfoTitle', 'Patient Information')}</h3>
          <div className="am-pd-info-list">
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.fullName', 'Full Name')}</span>
              <span className="am-pd-val am-font-bold">{patient.name}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.ageGender', 'Age / Gender')}</span>
              <span className="am-pd-val">
                {patient.age} {t('patientDetails.years', 'years')} · {patient.gender === 'Male' ? t('patientDetails.male', 'Male') : patient.gender === 'Female' ? t('patientDetails.female', 'Female') : patient.gender}
              </span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.mobile', 'Mobile')}</span>
              <span className="am-pd-val">{patient.mobile || patient.phone || '98765 43210'}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.hospital', 'Hospital')}</span>
              <span className="am-pd-val">{patient.hospital || 'Unassigned Hospital'}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.scheme', 'Scheme')}</span>
              <span className="am-pd-val">{patient.scheme || 'PM-JAY'}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.admittedDate', 'Admitted')}</span>
              <span className="am-pd-val">{patient.admittedDateFormatted || patient.admissionDate || '15 Jun 2025'}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.currentStatus', 'Current Status')}</span>
              <span className="am-pd-val">
                <span className={`am-status-badge am-status-${patient.statusVariant}`}>
                  {getStageLabel(patient.status)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Relative Information */}
        <div className="am-pd-card am-pd-relative-card">
          <div className="am-pd-notes-header" style={{ marginBottom: '10px' }}>
            <h3 className="am-pd-card-title" style={{ margin: 0 }}>{t('patientDetails.relativeInfoTitle', 'Relative Information')}</h3>
            <button
              className="am-pd-btn am-pd-btn-call-sm"
              style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setCallTarget({
                  title: t('patientDetails.callRelative', 'Call Relative'),
                  name: relativeInfo.name,
                  relation: relativeInfo.relation,
                  number: relativeInfo.phone,
                  isRelative: true,
                });
                setShowCallModal(true);
              }}
              title="Click to call relative"
            >
              <Phone size={13} />
              <span>{t('patientDetails.callRelative', 'Call Relative')}</span>
            </button>
          </div>
          <div className="am-pd-info-list">
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.relativeName', 'Relative Name')}</span>
              <span className="am-pd-val am-font-bold">{relativeInfo.name}</span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.relationship', 'Relationship')}</span>
              <span className="am-pd-val">
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {relativeInfo.relation}
                </span>
              </span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.primaryContact', 'Primary Contact')}</span>
              <span className="am-pd-val am-font-bold" style={{ color: '#0f172a' }}>
                {relativeInfo.phone}
              </span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.emergencyAlternate', 'Emergency Alternate')}</span>
              <span className="am-pd-val">
                {patient.relativeAltPhone || '+91 98220 54321'}
              </span>
            </div>
            <div className="am-pd-row">
              <span className="am-pd-label">{t('patientDetails.residenceDistrict', 'Residence / District')}</span>
              <span className="am-pd-val">
                {patient.district || 'Pune - Haveli Taluka'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OPD Visits & Admin Requested Documents Row (BELOW Patient Info & Clinical Notes) */}
      <div className={`am-pd-boxes-row ${patient.adminRequestedDocs && patient.adminRequestedDocs.length > 0 ? 'has-two-boxes' : 'has-one-box'}`}>
        {/* Box 1: OPD Visits & Follow-Up */}
        <div
          className="am-pd-card am-pd-opd-box"
          onClick={() => {
            if (!patient.isTransferredOut) setShowLogOPDModal(true);
          }}
        >
          <div className="am-pd-opd-header">
            <div className="am-pd-opd-header-left">
              <div className="am-pd-opd-icon-badge">
                <Stethoscope size={18} className="am-opd-icon-svg" />
              </div>
              <div>
                <h3 className="am-pd-card-title am-opd-title">{t('patientDetails.opdVisitsTitle', 'OPD Visits & Follow-Up')}</h3>
                <span className="am-pd-card-subtitle am-opd-sub">
                  {patient.opdVisits?.length || 1} {(patient.opdVisits?.length || 1) === 1 ? t('patientDetails.recordedVisitSingle', 'recorded visit') : t('patientDetails.recordedVisits', 'recorded visits')}
                </span>
              </div>
            </div>
            {!patient.isTransferredOut && (
              <button
                className="am-pd-btn am-pd-btn-log-opd"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogOPDModal(true);
                }}
              >
                <Plus size={14} />
                <span>{t('patientDetails.logFollowUp', 'Log Follow-Up')}</span>
              </button>
            )}
          </div>

          {/* Alert Banner for pending follow-up */}
          {(() => {
            const pendingVisit = (patient.opdVisits || []).find((v) => v.followUpStatus === 'PENDING' || v.nextFollowUpRequired);
            if (!pendingVisit) return null;
            return (
              <div className="am-opd-alert-banner">
                <div className="am-opd-alert-icon-wrap">
                  <AlertTriangle size={15} className="am-opd-alert-icon" />
                </div>
                <div className="am-opd-alert-content">
                  <div className="am-opd-alert-title">
                    {t('patientDetails.nextFollowUpDue', 'Next Follow-up Due:')} {pendingVisit.nextFollowUpTimeline || pendingVisit.dueDaysText || pendingVisit.dueText || 'In 7 Days'}
                  </div>
                  <div className="am-opd-alert-sub">
                    {t('patientDetails.markedOn', 'Marked on')} {pendingVisit.timestampFormatted || pendingVisit.date || 'Recent OPD Consultation'}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Visit History Section */}
          <div className="am-opd-visit-history">
            <h4 className="am-opd-history-heading">{t('patientDetails.visitHistoryHeading', 'Visit History & Consultations:')}</h4>
            {(patient.opdVisits && patient.opdVisits.length > 0 ? patient.opdVisits : [
              {
                id: 'opd-101',
                visitType: 'New Consultation',
                date: '10 Sept 2026, 08:45 AM',
                department: 'Cardiology',
                consultingDoctor: 'Dr. Nilesh Bapat',
                followUpStatus: 'NOT_REQUIRED',
                dueText: '',
                notes: 'Pre-surgery consultation for planned CABG, ECG and blood pressure check.'
              }
            ]).map((visit, idx) => {
              const isPending = visit.followUpStatus === 'PENDING' || visit.nextFollowUpRequired;
              const isDone = visit.followUpStatus === 'DONE';

              return (
                <div key={visit.id || idx} className="am-opd-visit-card" onClick={(e) => e.stopPropagation()}>
                  <div className="am-opd-visit-top">
                    <div className="am-opd-badges-row">
                      <span className="am-opd-type-badge">{getOpdVisitTypeLabel(visit.visitType || 'Follow-Up')}</span>
                      {isPending ? (
                        <span className="am-opd-due-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                          {t('patientDetails.due', 'Due:')} {visit.nextFollowUpTimeline || visit.dueDaysText || 'In 7 Days'}
                        </span>
                      ) : isDone ? (
                        <span className="am-opd-due-badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                          {t('patientDetails.followUpDone', '✓ Follow-Up Done')}
                        </span>
                      ) : null}
                    </div>
                    <span className="am-opd-date">{visit.timestampFormatted || visit.timestamp || visit.date}</span>
                  </div>

                  <div className="am-opd-visit-mid">
                    <span className="am-opd-dept">{getOpdDeptLabel(visit.department || 'General Medicine')}</span>
                    {visit.consultingDoctor || visit.doctor ? (
                      <span style={{ fontSize: '11.5px', color: '#475569' }}>
                        • {visit.consultingDoctor || visit.doctor}
                      </span>
                    ) : null}
                  </div>

                  {(visit.chiefComplaint || visit.notes) && (
                    <p className="am-opd-notes-quote">
                      "{(visit.chiefComplaint || visit.notes).replace(/^"|"$/g, '')}"
                    </p>
                  )}

                  {/* Prescription row & Mark Done button if pending */}
                  <div className="opd-card-actions-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    {visit.prescriptionDoc ? (
                      <button
                        type="button"
                        className="opd-action-rx-btn"
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', color: '#0369a1', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => {
                          setDocPreviewLoading(true);
                          setViewDoc({
                            title: visit.prescriptionDoc.name || `Prescription (${token})`,
                            fileUrl: visit.prescriptionDoc.url || visit.prescriptionDoc.data,
                            category: 'Prescription',
                            type: 'Medical Prescription',
                            patientName: patient.name,
                            patientId: patient.id,
                            size: visit.prescriptionDoc.size || '1.2 MB',
                            date: visit.timestampFormatted || 'Today',
                          });
                        }}
                      >
                        <FileText size={12} />
                        <span>{t('patientDetails.viewPrescription', 'View Prescription')}</span>
                      </button>
                    ) : <span />}

                    {isPending && (
                      <button
                        type="button"
                        className="opd-resolve-btn"
                        style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        disabled={resolvingOpdId === visit.id}
                        onClick={() => handleResolveOpdFollowUp(visit.id)}
                      >
                        {resolvingOpdId === visit.id ? (
                          <RotateCw size={12} className="am-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        <span>{resolvingOpdId === visit.id ? t('patientDetails.marking', 'Marking...') : t('patientDetails.markDone', 'Mark Done')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Box 2: Admin Requested Documents (ONLY when admin requested missing documents) */}
        {patient.adminRequestedDocs && patient.adminRequestedDocs.length > 0 && (
          <div className="am-pd-card am-pd-admin-docs-box">
            <div className="am-pd-opd-header">
              <div className="am-pd-opd-header-left">
                <div className="am-pd-admin-doc-icon-badge">
                  <FileText size={18} className="am-admin-doc-icon-svg" />
                </div>
                <div>
                  <h3 className="am-pd-card-title am-admin-doc-title">{t('patientDetails.adminRequestedDocsTitle', 'Admin Requested Documents')}</h3>
                  <span className="am-pd-card-subtitle am-admin-doc-sub">
                    <AlertTriangle size={13} className="am-admin-warn-inline" /> {patient.adminRequestedDocs.length} {t('patientDetails.pendingDocument', 'Pending Document')}
                  </span>
                </div>
              </div>
            </div>

            <div className="am-admin-docs-list">
              {patient.adminRequestedDocs.map((docItem) => (
                <div key={docItem.id} className="am-admin-doc-card">
                  <div className="am-admin-doc-card-header">
                    <h4 className="am-admin-doc-name">
                      {docItem.title} <span className="am-red-star">*</span>
                    </h4>
                    <span className="am-admin-doc-pending-pill">
                      <Clock size={12} /> {docItem.status || t('patientDetails.pendingDocument', 'Pending Document')}
                    </span>
                  </div>
                  <p className="am-admin-doc-desc">{docItem.description}</p>

                  {patient.isTransferredOut ? (
                    <div style={{ fontSize: '0.8rem', color: '#6d28d9', fontStyle: 'italic', marginTop: '6px' }}>
                      🔒 {t('patientDetails.docUploadLockedTransferred', 'Document upload is locked for transferred cases.')}
                    </div>
                  ) : (
                    <div className="am-admin-doc-actions-inline" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="am-pd-btn am-pd-btn-doc-sm"
                        style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => {
                          setPrefillDocTitle(docItem.title);
                          setPrefillReqDocId(docItem.id);
                          setShowDocModal(true);
                        }}
                      >
                        <UploadCloud size={14} />
                        <span>{t('patientDetails.uploadDocumentBtn', 'Upload Document')}</span>
                      </button>
                      <label className="am-admin-act-photo-sm" style={{ cursor: 'pointer' }}>
                        <Camera size={14} />
                        <span>{t('patientDetails.uploadPhotoBtn', 'Upload Photo')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.png,.jpg,.jpeg"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleUploadReqDoc(docItem, file, true);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Medical Records Section */}
      <div className="am-pd-card am-pd-docs-card">
        <div className="am-pd-notes-header">
          <h3 className="am-pd-card-title">{t('patientDetails.additionalMedicalRecords', 'Additional medical records')}</h3>
          {!patient.isTransferredOut && (
            <button className="am-pd-btn am-pd-btn-doc-sm" onClick={() => { setPrefillDocTitle(''); setPrefillReqDocId(null); setShowDocModal(true); }}>
              <FilePlus size={14} />
              <span>{t('patientDetails.addDocument', 'Add Document')}</span>
            </button>
          )}
        </div>

        <div className="am-pd-docs-grid">
          {(() => {
            const rawDocs = patient.documents || [];
            const displayDocs = rawDocs.reduce((acc, doc) => {
              const titleKey = (doc.title || doc.name || doc.fileName || '').trim().toLowerCase();
              const hasUploadedFile = Boolean(
                (doc.fileUrl && doc.fileUrl !== '' && doc.fileUrl !== 'Pending Upload') ||
                (doc.file_url && doc.file_url !== '' && doc.file_url !== 'Pending Upload') ||
                (doc.url && doc.url !== '' && doc.url !== 'Pending Upload') ||
                (doc.uploaded === true && doc.file !== 'Pending Upload' && doc.fileName !== 'Pending Upload')
              );

              const existingIdx = acc.findIndex(
                (d) => (d.title || d.name || d.fileName || '').trim().toLowerCase() === titleKey
              );

              if (existingIdx !== -1) {
                const existing = acc[existingIdx];
                const existingUploaded = Boolean(
                  (existing.fileUrl && existing.fileUrl !== '' && existing.fileUrl !== 'Pending Upload') ||
                  (existing.file_url && existing.file_url !== '' && existing.file_url !== 'Pending Upload') ||
                  (existing.url && existing.url !== '' && existing.url !== 'Pending Upload') ||
                  (existing.uploaded === true && existing.file !== 'Pending Upload' && existing.fileName !== 'Pending Upload')
                );
                if (hasUploadedFile && !existingUploaded) {
                  acc[existingIdx] = doc;
                }
              } else {
                acc.push(doc);
              }
              return acc;
            }, []);

            if (displayDocs.length === 0) {
              return <p className="am-note-empty">{t('patientDetails.noDocsYet', 'No documents uploaded for this patient yet.')}</p>;
            }

            return displayDocs.map((doc, idx) => {
              const hasUploadedFile = Boolean(
                (doc.fileUrl && doc.fileUrl !== '' && doc.fileUrl !== 'Pending Upload') ||
                (doc.file_url && doc.file_url !== '' && doc.file_url !== 'Pending Upload') ||
                (doc.url && doc.url !== '' && doc.url !== 'Pending Upload') ||
                (doc.uploaded === true && doc.file !== 'Pending Upload' && doc.fileName !== 'Pending Upload')
              );
              const isPendingSevak = !hasUploadedFile && (
                doc.isPendingSevakUpload ||
                doc.status === 'PENDING_SEVAK_UPLOAD' ||
                doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
                (doc.is_sevak_upload && (doc.file === 'Pending Upload' || doc.fileName === 'Pending Upload' || doc.uploaded === false))
              );

              if (isPendingSevak) {
                return (
                  <div key={doc.id || idx} className="am-doc-item am-doc-item-pending-sevak" style={{ background: '#fffbeb', border: '1.5px dashed #f59e0b', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#d97706' }}>
                        <Clock size={20} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#92400e' }}>
                            {doc.title || doc.name} <span style={{ color: '#dc2626' }}>*</span>
                          </h4>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px' }}>
                            ⏳ {t('patientDetails.pendingSevakUpload', 'Pending ArogyaSevak Upload')}
                          </span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '0.775rem', color: '#78350f' }}>
                          <span>{t('patientDetails.adminInstructions', 'Admin Instructions:')} {doc.verificationRemark || doc.adminNote || 'Clinical record requested by Admin'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {!patient.isTransferredOut ? (
                        <button
                          type="button"
                          className="am-pd-btn am-pd-btn-doc-sm"
                          style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                          onClick={() => {
                            setPrefillDocTitle(doc.title || doc.name);
                            setPrefillReqDocId(doc.id);
                            setShowDocModal(true);
                          }}
                        >
                          <UploadCloud size={15} />
                          <span>{t('patientDetails.uploadDocumentBtn', 'Upload Document')}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#6d28d9', fontStyle: 'italic' }}>
                          🔒 {t('patientDetails.readOnlyTag', 'Read Only')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={doc.id || idx} className="am-doc-item">
                  <div className="am-doc-item-icon">
                    <FileText size={20} className="am-doc-icon-svg" />
                  </div>
                  <div className="am-doc-item-main">
                    <h4 className="am-doc-item-title">{doc.title || doc.name || doc.fileName || 'Uploaded Medical Document'}</h4>
                    <div className="am-doc-item-meta">
                      <span className="am-doc-type-badge">{doc.type || doc.category || 'Medical Record'}</span>
                      <span className="am-doc-dot">•</span>
                      <span>{doc.date || 'Recently'}</span>
                      <span className="am-doc-dot">•</span>
                      <span>{doc.size || doc.fileSize || '1.2 MB'}</span>
                    </div>
                  </div>
                  <div className="am-doc-item-actions">
                    <button
                      className="am-doc-action-btn"
                      title="View Document"
                      onClick={() => {
                        setDocPreviewLoading(true);
                        setViewDoc({
                          ...doc,
                          patientName: patient.name,
                          patientId: patient.id,
                          patientAge: patient.age,
                          patientGender: patient.gender,
                          hospital: patient.hospital,
                          doctor: patient.doctor,
                          vitals: patient.vitals,
                        });
                      }}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="am-doc-action-btn"
                      title="Download Document"
                      onClick={() => {
                        const fUrl = doc.fileUrl || doc.file_url || doc.url;
                        if (fUrl && fUrl.startsWith('http')) {
                          window.open(fUrl, '_blank');
                        } else {
                          downloadDocFile({
                            ...doc,
                            patientName: patient.name,
                            patientId: patient.id,
                            doctor: patient.doctor,
                          });
                        }
                        setToastMessage(`Opening / Downloading ${doc.title || doc.name || 'document'}`);
                        setTimeout(() => setToastMessage(''), 3000);
                      }}
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Update Case Progress Modal (Dual Mode: OPD vs IPD) */}
      {showUpdateModal && (() => {
        const isOPD = (patient?.treatmentType || patient?.type || '').toUpperCase() === 'OPD';

        return (
          <div className="am-modal-overlay" onClick={() => setShowUpdateModal(false)}>
            <div
              className="am-modal-dialog"
              style={{
                maxWidth: isOPD ? '540px' : '440px',
                width: '95vw',
                maxHeight: 'min(90vh, 720px)',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="am-modal-header" style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div className="am-modal-title-wrap">
                  <h3 className="am-modal-title" style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOPD ? (
                      <>
                        <Stethoscope size={19} style={{ color: '#0284c7' }} />
                        <span>Update OPD Visit & Progress</span>
                      </>
                    ) : (
                      t('patientDetails.updateStageTitle', 'Update Treatment Stage & Status')
                    )}
                  </h3>
                  <span className="am-modal-subtitle" style={{ fontSize: '11.5px', marginTop: '3px', display: 'block', color: '#64748b' }}>
                    {isOPD ? 'Record patient attendance, follow-up, or request case closure' : t('patientDetails.updateStageSub', 'Update live treatment progression in ward')}: <strong>{patient.name}</strong> ({patient.id})
                  </span>
                </div>
                <button
                  className="am-modal-close"
                  onClick={() => setShowUpdateModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {saveSuccess ? (
                <div className="am-success-notice" style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <CheckCircle2 size={36} className="am-success-icon" style={{ color: '#166534', margin: '0 auto 10px' }} />
                  <h4 style={{ fontSize: '15px', color: '#166534', fontWeight: '700' }}>
                    {isOPD ? 'OPD Treatment Progress & Status Saved!' : t('patientDetails.treatmentProgressUpdated', 'Treatment progress updated!')}
                  </h4>
                </div>
              ) : isOPD ? (
                /* OPD Treatment Progress Form */
                <form
                  onSubmit={handleOpdProgressSubmit}
                  className="am-modal-form"
                  style={{
                    padding: '16px 20px 20px',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    minHeight: 0,
                  }}
                >
                  
                  {/* Step 1: Patient Visit Status */}
                  <div className="am-form-field">
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={15} style={{ color: '#0284c7' }} />
                      Patient Visit Status: <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpdProgressVisitStatus('visited');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: opdProgressVisitStatus === 'visited' ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                          background: opdProgressVisitStatus === 'visited' ? '#f0fdf4' : '#ffffff',
                          color: opdProgressVisitStatus === 'visited' ? '#166534' : '#475569',
                          fontWeight: opdProgressVisitStatus === 'visited' ? '700' : '500',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Check size={16} strokeWidth={2.5} style={{ color: opdProgressVisitStatus === 'visited' ? '#16a34a' : '#94a3b8' }} />
                        <span>Patient Visited</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpdProgressVisitStatus('not_visited');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: opdProgressVisitStatus === 'not_visited' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                          background: opdProgressVisitStatus === 'not_visited' ? '#fef2f2' : '#ffffff',
                          color: opdProgressVisitStatus === 'not_visited' ? '#991b1b' : '#475569',
                          fontWeight: opdProgressVisitStatus === 'not_visited' ? '700' : '500',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <X size={16} strokeWidth={2.5} style={{ color: opdProgressVisitStatus === 'not_visited' ? '#ef4444' : '#94a3b8' }} />
                        <span>Not Visited / No Show</span>
                      </button>
                    </div>
                  </div>

                  {/* BRANCH A: Patient Visited */}
                  {opdProgressVisitStatus === 'visited' && (
                    <>
                      {/* Clinical Observations / Consultation Notes */}
                      <div className="am-form-field" style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569', marginBottom: '5px', display: 'block' }}>
                          Consultation / Clinical Remarks / Vitals:
                        </label>
                        <textarea
                          className="am-form-textarea"
                          rows={2}
                          placeholder="e.g. Doctor consultation complete, vitals normal (BP 120/80), advised rest & medication..."
                          value={opdProgressConsultationNotes}
                          onChange={(e) => setOpdProgressConsultationNotes(e.target.value)}
                          style={{ minHeight: '52px', fontSize: '12px', padding: '7px 10px', lineHeight: '1.4' }}
                        />
                      </div>

                      {/* Question: Is Next Follow-up Required? */}
                      <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={15} style={{ color: '#0284c7' }} />
                            Is Next Follow-up Required?
                          </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: opdProgressFollowUpRequired ? '10px' : '0' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setOpdProgressFollowUpRequired(true);
                              setOpdProgressRequestClosure(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: opdProgressFollowUpRequired ? '2px solid #0284c7' : '1px solid #cbd5e1',
                              background: opdProgressFollowUpRequired ? '#f0f9ff' : '#ffffff',
                              color: opdProgressFollowUpRequired ? '#0369a1' : '#475569',
                              fontWeight: opdProgressFollowUpRequired ? '700' : '500',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <Check size={14} /> Yes, Follow-up Required
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpdProgressFollowUpRequired(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: !opdProgressFollowUpRequired ? '2px solid #64748b' : '1px solid #cbd5e1',
                              background: !opdProgressFollowUpRequired ? '#f1f5f9' : '#ffffff',
                              color: !opdProgressFollowUpRequired ? '#1e293b' : '#475569',
                              fontWeight: !opdProgressFollowUpRequired ? '700' : '500',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <X size={14} /> No Follow-up
                          </button>
                        </div>

                        {/* If Follow-up Required = YES */}
                        {opdProgressFollowUpRequired && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Next Follow-up Date: <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input
                                type="date"
                                className="modal-text-input"
                                min={new Date().toISOString().split('T')[0]}
                                value={opdProgressFollowUpDate}
                                onChange={(e) => setOpdProgressFollowUpDate(e.target.value)}
                                required={opdProgressFollowUpRequired}
                                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Follow-up Clinical Purpose / Instructions:
                              </label>
                              <input
                                type="text"
                                className="modal-text-input"
                                placeholder="e.g. Blood sugar check, test review, suture removal..."
                                value={opdProgressFollowUpNotes}
                                onChange={(e) => setOpdProgressFollowUpNotes(e.target.value)}
                                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '6px', background: '#e0f2fe', padding: '4px 8px', borderRadius: '4px' }}>
                              ℹ️ A new <strong>"Follow-up"</strong> stage will be added to the treatment progress bar.
                            </div>
                          </div>
                        )}

                        {/* If Follow-up Required = NO -> Option to Request Closure */}
                        {!opdProgressFollowUpRequired && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                              Do you want to request case closure?
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setOpdProgressRequestClosure(true)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: opdProgressRequestClosure ? '2px solid #d97706' : '1px solid #cbd5e1',
                                  background: opdProgressRequestClosure ? '#fffbeb' : '#ffffff',
                                  color: opdProgressRequestClosure ? '#92400e' : '#475569',
                                  fontWeight: opdProgressRequestClosure ? '700' : '500',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                }}
                              >
                                <Check size={14} /> Yes, Request Closure
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpdProgressRequestClosure(false)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: !opdProgressRequestClosure ? '2px solid #64748b' : '1px solid #cbd5e1',
                                  background: !opdProgressRequestClosure ? '#f1f5f9' : '#ffffff',
                                  color: !opdProgressRequestClosure ? '#1e293b' : '#475569',
                                  fontWeight: !opdProgressRequestClosure ? '700' : '500',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                }}
                              >
                                Keep Case Open
                              </button>
                            </div>

                            {opdProgressRequestClosure && (
                              <div style={{ marginTop: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#92400e', display: 'block', marginBottom: '4px' }}>
                                  Reason for Closure Request (Note to Admin):
                                </label>
                                <textarea
                                  className="am-form-textarea"
                                  rows={2}
                                  placeholder="e.g. OPD consultation complete, medicines provided, patient advised and recovered."
                                  value={opdProgressClosureReason}
                                  onChange={(e) => setOpdProgressClosureReason(e.target.value)}
                                  style={{ minHeight: '48px', fontSize: '11.5px', padding: '6px 8px', lineHeight: '1.4' }}
                                />
                                <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                                  ℹ️ Status will be set to <strong>Closure Requested</strong>. District Admin will perform the final closure approval.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* BRANCH B: Patient Did Not Visit / No Show */}
                  {opdProgressVisitStatus === 'not_visited' && (
                    <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', marginBottom: '8px' }}>
                        <AlertTriangle size={16} />
                        <strong style={{ fontSize: '12.5px' }}>Patient Missed OPD Slot / Did Not Visit</strong>
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#7f1d1d', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        Arogya Sevak can wait for patient response or submit a Closure Request to Admin if the patient remains unreachable.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: opdProgressNotVisitedAction === 'wait' ? '#ffffff' : '#fef2f2',
                            border: opdProgressNotVisitedAction === 'wait' ? '1.5px solid #0284c7' : '1px solid #fca5a5',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#1e293b',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="notVisitedAction"
                            checked={opdProgressNotVisitedAction === 'wait'}
                            onChange={() => setOpdProgressNotVisitedAction('wait')}
                          />
                          <span>⏳ Keep Case Open &amp; Wait for Patient Response</span>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: opdProgressNotVisitedAction === 'request_closure' ? '#ffffff' : '#fef2f2',
                            border: opdProgressNotVisitedAction === 'request_closure' ? '1.5px solid #dc2626' : '1px solid #fca5a5',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#991b1b',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="notVisitedAction"
                            checked={opdProgressNotVisitedAction === 'request_closure'}
                            onChange={() => setOpdProgressNotVisitedAction('request_closure')}
                          />
                          <span>🚫 Request Admin Case Closure (Unreachable / No Show)</span>
                        </label>
                      </div>

                      {opdProgressNotVisitedAction === 'request_closure' ? (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', display: 'block', marginBottom: '4px' }}>
                            Mandatory Closure Note for Admin: <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <textarea
                            className="am-form-textarea"
                            rows={2}
                            placeholder="e.g. Patient did not attend scheduled OPD and did not respond to 3 phone call attempts. Requesting case closure."
                            value={opdProgressNotVisitedReason}
                            onChange={(e) => setOpdProgressNotVisitedReason(e.target.value)}
                            required
                            style={{ minHeight: '50px', fontSize: '11.5px', padding: '6px 8px', border: '1px solid #f87171' }}
                          />
                        </div>
                      ) : (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Follow-up Notes / Remarks (Optional):
                          </label>
                          <input
                            type="text"
                            className="modal-text-input"
                            placeholder="e.g. Called patient, patient requested visit next week..."
                            value={opdProgressConsultationNotes}
                            onChange={(e) => setOpdProgressConsultationNotes(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modal Footer Actions - Always Sticky & Visible */}
                  <div
                    className="am-modal-actions"
                    style={{
                      marginTop: 'auto',
                      paddingTop: '14px',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      background: '#ffffff',
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 10,
                      flexShrink: 0
                    }}
                  >
                    <button
                      type="button"
                      className="am-btn-secondary"
                      onClick={() => setShowUpdateModal(false)}
                      style={{
                        padding: '9px 18px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="am-btn-primary"
                      style={{
                        background: opdProgressRequestClosure || (opdProgressVisitStatus === 'not_visited' && opdProgressNotVisitedAction === 'request_closure')
                          ? '#d97706'
                          : (opdProgressFollowUpRequired ? '#0284c7' : '#16a34a'),
                        borderColor: opdProgressRequestClosure || (opdProgressVisitStatus === 'not_visited' && opdProgressNotVisitedAction === 'request_closure')
                          ? '#d97706'
                          : (opdProgressFollowUpRequired ? '#0284c7' : '#16a34a'),
                        fontWeight: '700',
                        padding: '9px 20px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {opdProgressRequestClosure || (opdProgressVisitStatus === 'not_visited' && opdProgressNotVisitedAction === 'request_closure') ? (
                        <>
                          <Send size={15} />
                          <span>Submit Closure Request to Admin</span>
                        </>
                      ) : opdProgressFollowUpRequired ? (
                        <>
                          <Calendar size={15} />
                          <span>Save &amp; Schedule Follow-up</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          <span>Save OPD Visit Record</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Existing IPD Form */
                <form onSubmit={handleUpdateSubmit} className="am-modal-form" style={{ padding: '12px 18px 16px' }}>
                  <div className="am-form-field">
                    <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569', marginBottom: '5px', display: 'block' }}>
                      {t('patientDetails.selectClinicalStage', 'Select Clinical Stage:')}
                    </label>
                    <div className="am-stage-pills-container">
                      {CLINICAL_TREATMENT_STAGES.map((s) => {
                        const isSelected = selectedStage === s.label;
                        return (
                          <button
                            key={s.label}
                            type="button"
                            className={`am-stage-pill ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => setSelectedStage(s.label)}
                          >
                            <span className="am-stage-pill-radio">
                              {isSelected && <span className="am-radio-dot-selected" />}
                            </span>
                            <span className="am-stage-pill-text">{getStageLabel(s.label)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="am-form-field" style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569', marginBottom: '5px', display: 'block' }}>
                      {t('patientDetails.clinicalNoteRemarks', 'Clinical Progress Note / Remarks (Optional):')}
                    </label>
                    <textarea
                      className="am-form-textarea"
                      rows={2}
                      placeholder="e.g. Transferred from ICU to general ward. Vitals stable."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      style={{ minHeight: '54px', fontSize: '12px', padding: '7px 10px', lineHeight: '1.4' }}
                    />
                  </div>

                  <div className="am-modal-actions" style={{ marginTop: '14px', paddingTop: '10px', gap: '8px' }}>
                    <button
                      type="button"
                      className="am-btn-secondary"
                      onClick={() => setShowUpdateModal(false)}
                      style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="am-btn-primary"
                      style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: '600', padding: '6px 16px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      {t('patientDetails.saveUpdates', 'Save Updates')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* Small Step Click Confirmation / Update Popup */}
      {stepClickModal.isOpen && stepClickModal.targetStep && (
        <div className="am-modal-overlay" onClick={() => setStepClickModal({ isOpen: false, targetStep: null, targetIdx: -1, note: '' })}>
          <div className="am-modal-dialog am-modal-dialog-compact" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header" style={{ padding: '14px 18px 10px' }}>
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title" style={{ fontSize: '15px', margin: 0 }}>
                  {t('patientDetails.updateStageTitle', 'Update Treatment Stage')} &rarr; {getStageLabel(stepClickModal.targetStep.label)}
                </h3>
                <span className="am-modal-subtitle" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  {t('patients.patientCol', 'Patient')}: <strong>{patient.name}</strong> ({patient.id})
                </span>
              </div>
              <button
                className="am-modal-close"
                onClick={() => setStepClickModal({ isOpen: false, targetStep: null, targetIdx: -1, note: '' })}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmStepClick} className="am-modal-form" style={{ padding: '12px 18px 16px' }}>
              {/* If skipping intermediate steps, show cancellation notice */}
              {(() => {
                const baseProgress = (patient.caseProgress && patient.caseProgress.length === 8)
                  ? patient.caseProgress
                  : CLINICAL_TREATMENT_STAGES;
                const skippedSteps = [];
                for (let i = 1; i < stepClickModal.targetIdx; i++) {
                  if (baseProgress[i].state !== 'completed' && baseProgress[i].state !== 'active') {
                    skippedSteps.push(getStageLabel(baseProgress[i].label));
                  }
                }
                if (skippedSteps.length > 0) {
                  return (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                        fontSize: '11.5px',
                        color: '#991b1b',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        lineHeight: '1.4',
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>
                        Intermediate step{skippedSteps.length > 1 ? 's' : ''} (<strong>{skippedSteps.join(', ')}</strong>) will be marked as canceled and skipped.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="am-form-field">
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569', marginBottom: '5px', display: 'block' }}>
                  {t('patientDetails.clinicalNoteRemarks', 'Clinical Progress Note / Remarks (Optional):')}
                </label>
                <textarea
                  className="am-form-textarea"
                  rows="2"
                  placeholder="Enter observation or progress remarks..."
                  value={stepClickModal.note}
                  onChange={(e) => setStepClickModal(prev => ({ ...prev, note: e.target.value }))}
                  style={{ minHeight: '52px', fontSize: '12px', padding: '7px 10px', lineHeight: '1.4' }}
                />
              </div>

              <div className="am-modal-actions" style={{ marginTop: '12px', paddingTop: '10px', gap: '8px' }}>
                <button
                  type="button"
                  className="am-btn-secondary"
                  onClick={() => setStepClickModal({ isOpen: false, targetStep: null, targetIdx: -1, note: '' })}
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="am-btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: '600', padding: '6px 16px', fontSize: '12px', borderRadius: '8px' }}
                >
                  {t('patientDetails.saveStageUpdate', 'Save Stage Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Upload Document Modal Matching Reference Form */}
      <UploadDocumentModal
        isOpen={showDocModal}
        onClose={() => {
          setShowDocModal(false);
          setPrefillDocTitle('');
          setPrefillReqDocId(null);
        }}
        patientId={patient?.id}
        patientName={patient?.name}
        prefillTitle={prefillDocTitle}
        reqDocId={prefillReqDocId}
        onSuccess={() => {
          setPrefillDocTitle('');
          setPrefillReqDocId(null);
          fetchPatient();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="am-doc-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* View Document Modal */}
      {viewDoc && (
        <div className="am-modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="am-doc-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header">
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title">{viewDoc.title}</h3>
                <span className="am-modal-subtitle">
                  Case: {viewDoc.patientId} • {viewDoc.patientName}
                </span>
              </div>
              <button className="am-modal-close" onClick={() => setViewDoc(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="am-doc-modal-body">
              <div className="am-doc-paper">
                <div className="am-paper-header">
                  <div className="am-paper-brand">
                    <div className="am-paper-logo">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2>AROGYA MITRA HEALTHCARE SYSTEM</h2>
                      <p>National Health Authority — ABDM Integrated Network</p>
                      <span className="am-paper-hosp">{viewDoc.hospital || patient?.hospital || 'Unassigned Hospital'}</span>
                    </div>
                  </div>
                  <div className="am-paper-badge">
                    <ShieldCheck size={16} />
                    <span>ABDM VERIFIED RECORD</span>
                  </div>
                </div>

                <div className="am-paper-divider" />

                <div className="am-paper-doc-title">
                  <h3>{viewDoc.title.toUpperCase()}</h3>
                  <span className="am-paper-type">{viewDoc.type}</span>
                </div>

                <div className="am-paper-grid">
                  <div className="am-paper-field">
                    <label>Patient Name</label>
                    <span>{viewDoc.patientName}</span>
                  </div>
                  <div className="am-paper-field">
                    <label>Case ABHA ID</label>
                    <span>{viewDoc.patientId}</span>
                  </div>
                  <div className="am-paper-field">
                    <label>Age / Gender</label>
                    <span>{viewDoc.patientAge ? `${viewDoc.patientAge} Yrs · ${viewDoc.patientGender}` : '32 Yrs · Male'}</span>
                  </div>
                  <div className="am-paper-field">
                    <label>Issue Date</label>
                    <span>{viewDoc.date}</span>
                  </div>
                  <div className="am-paper-field">
                    <label>Attending Physician</label>
                    <span>{viewDoc.doctor || 'Dr. Ananya Deshmukh'}</span>
                  </div>
                  <div className="am-paper-field">
                    <label>Record File Size</label>
                    <span>{viewDoc.size || '1.2 MB'} (Digital Format)</span>
                  </div>
                </div>

                <div className="am-paper-section">
                  <h4 className="am-paper-sec-title">Clinical Vitals Summary</h4>
                  <div className="am-paper-vitals">
                    <div className="am-vital-item">
                      <span className="am-vital-lbl">Blood Pressure</span>
                      <strong className="am-vital-val">{viewDoc.vitals?.bp || '124/82'} mmHg</strong>
                    </div>
                    <div className="am-vital-item">
                      <span className="am-vital-lbl">Pulse Rate</span>
                      <strong className="am-vital-val">{viewDoc.vitals?.pulse || '76 bpm'}</strong>
                    </div>
                    <div className="am-vital-item">
                      <span className="am-vital-lbl">SpO2 Level</span>
                      <strong className="am-vital-val">{viewDoc.vitals?.spO2 || '98%'}</strong>
                    </div>
                    <div className="am-vital-item">
                      <span className="am-vital-lbl">Body Temp</span>
                      <strong className="am-vital-val">{viewDoc.vitals?.temp || '98.4 °F'}</strong>
                    </div>
                  </div>
                </div>

                <div className="am-paper-section">
                  <h4 className="am-paper-sec-title">Diagnostic Findings & Evaluation</h4>
                  <div className="am-paper-text-box">
                    <p>• Patient parameters continuously monitored under clinical protocols.</p>
                    <p>• Laboratory panel clearance confirmed by attending medical specialist.</p>
                    <p>• All health records cryptographically signed and stored in compliance with NHA ABDM guidelines.</p>
                    <p>• Advice: Continue prescribed dosage and routine vitals check in 7 days.</p>
                  </div>
                </div>

                <div className="am-paper-footer">
                  <div className="am-paper-stamp">
                    <UserCheck size={18} />
                    <div>
                      <strong>Electronically Signed</strong>
                      <span>By {viewDoc.by || (user?.name ? `${user.name} (ArogyaSevak)` : 'ArogyaSevak')}</span>
                    </div>
                  </div>
                  <div className="am-paper-hash">
                    <small>SHA256: 7F8A9B2C4D5E6F1A2B3C4D5E6F7A8B9C</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="am-modal-footer">
              <button className="am-pd-modal-btn am-pd-modal-cancel" onClick={() => setViewDoc(null)}>
                Close
              </button>
              <button
                className="am-pd-modal-btn am-pd-modal-submit"
                onClick={() => {
                  downloadDocFile(viewDoc);
                  setToastMessage(`Downloaded ${viewDoc.title}`);
                  setTimeout(() => setToastMessage(''), 3000);
                }}
              >
                <Download size={16} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTI Call Operator Modal */}
      {showCallModal && (
        <div className="am-modal-overlay" onClick={() => setShowCallModal(false)}>
          <div className="am-modal-dialog" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header">
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title">{callTarget.title}</h3>
                <span className="am-modal-subtitle">
                  {patient.id} • {callTarget.isRelative ? `${callTarget.name} (${callTarget.relation || 'Relative'})` : patient.name}
                </span>
              </div>
              <button className="am-modal-close" onClick={() => setShowCallModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="am-modal-form" style={{ textAlign: 'center', padding: '24px 20px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: '#e6f4ea',
                  color: '#137333',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Phone size={26} />
              </div>

              {callTarget.isRelative && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'inline-block',
                    minWidth: '260px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      marginBottom: '4px',
                    }}
                  >
                    Relative Name &amp; Relation
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{callTarget.name}</span>
                    {callTarget.relation && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {callTarget.relation}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <h4
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: '0 0 6px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  fontWeight: '700',
                }}
              >
                {callTarget.isRelative ? 'Relative Contact Phone Number' : `${callTarget.relation || 'Contact'} Phone Number`}
              </h4>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#0f172a',
                  letterSpacing: '0.5px',
                  marginBottom: '20px',
                }}
              >
                {callTarget.number || patient.mobile || patient.phone || '+91 98123 45678'}
              </div>

              <div className="am-modal-actions" style={{ justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="am-btn-secondary"
                  onClick={() => {
                    const num = (callTarget.number || patient.mobile || patient.phone || '9812345678').replace(/\s+/g, '');
                    navigator.clipboard?.writeText(num);
                    setCopiedNumber(true);
                    setTimeout(() => setCopiedNumber(false), 2000);
                  }}
                >
                  {copiedNumber ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  <span>{copiedNumber ? 'Copied!' : 'Copy Number'}</span>
                </button>

                <button
                  type="button"
                  className="am-btn-primary"
                  style={{ background: '#137333', color: '#fff', fontWeight: '600' }}
                  onClick={() => {
                    const num = (callTarget.number || patient.mobile || patient.phone || '9812345678').replace(/\s+/g, '');
                    window.location.href = `tel:${num}`;
                    setShowCallModal(false);
                    setToastMessage(`Call initiated to ${callTarget.name || patient.name}!`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }}
                >
                  <Phone size={15} />
                  <span>Take Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Hospital Bill Modal */}
      {showBillModal && (
        <div className="am-modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="am-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header">
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title">Submit Hospital Bill & Claim</h3>
                <span className="am-modal-subtitle">
                  {patient.id} • {patient.name} ({patient.scheme || 'PM-JAY'})
                </span>
              </div>
              <button className="am-modal-close" onClick={() => setShowBillModal(false)}>
                <X size={20} />
              </button>
            </div>

            {billSuccess ? (
              <div className="am-success-notice">
                <CheckCircle2 size={36} className="am-success-icon" />
                <h4>Hospital Bill Claim Submitted!</h4>
                <p>Record saved and processed successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleAddBill} className="am-modal-form">
                <div className="am-form-grid-2">
                  <div className="am-form-field">
                    <label>Bill Category *</label>
                    <select
                      className="am-form-select"
                      value={billCategory}
                      onChange={(e) => setBillCategory(e.target.value)}
                    >
                      <option value="ICU & Ventilator Charges">ICU & Ventilator Charges</option>
                      <option value="Surgery & OT Charges">Surgery & OT Charges</option>
                      <option value="Medicines & Pharmacy">Medicines & Pharmacy</option>
                      <option value="Diagnostics & Lab Panel">Diagnostics & Lab Panel</option>
                      <option value="General Ward & Nursing">General Ward & Nursing</option>
                    </select>
                  </div>

                  <div className="am-form-field">
                    <label>Invoice / Receipt No *</label>
                    <input
                      type="text"
                      className="am-form-input"
                      value={billInvoiceNo}
                      onChange={(e) => setBillInvoiceNo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="am-form-grid-2">
                  <div className="am-form-field">
                    <label>Billed Amount (₹) *</label>
                    <input
                      type="number"
                      className="am-form-input"
                      placeholder="e.g. 185000"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="am-form-field">
                    <label>Scheme Sanctioned Limit (₹)</label>
                    <input
                      type="number"
                      className="am-form-input"
                      value={schemeLimit}
                      onChange={(e) => setSchemeLimit(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Upload Hospital Bill Photo / Receipt Scan */}
                <div className="am-form-field">
                  <label>Upload Hospital Bill Photo / Receipt Scan *</label>
                  <div className="am-file-upload-box">
                    <Upload size={22} className="am-upload-icon" />
                    <span>Click to attach hospital bill photo or receipt scan</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="am-file-input-hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setBillPhotoName(file.name);
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setBillPhotoPreview(ev.target.result);
                            reader.readAsDataURL(file);
                          } else {
                            setBillPhotoPreview('');
                          }
                        }
                      }}
                    />
                    {billPhotoName && (
                      <span className="am-selected-file">Attached: {billPhotoName}</span>
                    )}
                  </div>

                  {billPhotoPreview && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <img
                        src={billPhotoPreview}
                        alt="Bill Receipt Preview"
                        style={{ maxHeight: '130px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Exceeds Scheme Limit Warning Banner */}
                {billAmount && parseFloat(billAmount) > parseFloat(schemeLimit || 0) && (
                  <div className="am-bill-warning-banner">
                    <AlertTriangle size={20} className="am-warn-banner-icon" />
                    <div>
                      <strong>⚠️ Exceeds Scheme Sanctioned Limit!</strong>
                      <p>
                        Bill amount (₹{parseFloat(billAmount).toLocaleString('en-IN')}) exceeds sanctioned limit (₹{parseFloat(schemeLimit).toLocaleString('en-IN')}) by{' '}
                        <span className="am-warn-excess">
                          ₹{(parseFloat(billAmount) - parseFloat(schemeLimit)).toLocaleString('en-IN')}
                        </span>.
                      </p>
                      <span className="am-warn-subtext">
                        This bill will automatically be flagged and escalated to the <strong>District Health Administrator</strong> for approval decision.
                      </span>
                    </div>
                  </div>
                )}

                <div className="am-form-field">
                  <label>Clinical Justification / Remarks for Admin</label>
                  <textarea
                    className="am-form-textarea"
                    rows="3"
                    placeholder="Provide medical justification if bill exceeds scheme limit (e.g. Emergency ventilator, extended ICU stay)..."
                    value={billRemarks}
                    onChange={(e) => setBillRemarks(e.target.value)}
                  />
                </div>

                <div className="am-modal-actions">
                  <button
                    type="button"
                    className="am-btn-secondary"
                    onClick={() => setShowBillModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="am-btn-primary">
                    <Receipt size={16} />
                    <span>Submit Bill Claim</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Record OPD Visit Modal (Identical compact form as in OPD Logs) */}
      {showLogOPDModal && (
        <div className="web-modal-backdrop" onClick={() => setShowLogOPDModal(false)}>
          <div className="web-modal-dialog compact-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="web-modal-header">
              <div className="modal-title-wrap">
                <FileText size={22} className="icon-blue" />
                <h2>Record OPD Visit</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLogOPDModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            {opdSuccess ? (
              <div className="am-modal-success" style={{ padding: '30px', textAlign: 'center' }}>
                <CheckCircle2 size={40} className="am-success-icon" style={{ color: '#166534', margin: '0 auto 10px' }} />
                <h4>OPD Visit Recorded!</h4>
                <p style={{ color: '#64748b', fontSize: '13px' }}>Follow-up visit record has been updated successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleRecordOPDVisitSubmit} className="web-modal-body">

                {/* Field 1: Select Allocated Patient Case */}
                <div className="modal-form-group">
                  <label className="modal-field-label">
                    Select Allocated Patient Case <span className="req-star">*</span>
                  </label>

                  {/* Case Search Input */}
                  <div className="case-search-box">
                    <Search size={15} className="case-search-icon" />
                    <input
                      type="text"
                      className="case-search-input"
                      placeholder="Search your allocated cases..."
                      value={opdCaseSearch}
                      onChange={(e) => setOpdCaseSearch(e.target.value)}
                    />
                  </div>

                  {/* Allocated Cases Radio List */}
                  <div className="allocated-cases-picker-list">
                    {filteredAllocatedCases.map((c) => {
                      const isSelected = opdSelectedCaseId === c.id;

                      return (
                        <div
                          key={c.id}
                          className={`case-picker-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setOpdSelectedCaseId(c.id)}
                        >
                          <div className="case-picker-info">
                            <strong className="picker-patient-name">{c.patientName}</strong>
                            <span className="picker-patient-meta">
                              {c.id} • {c.diagnosis}
                            </span>
                          </div>

                          <div className="picker-radio-icon">
                            {isSelected ? <Check size={14} /> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field 2: Consulting Doctor (Searchable dropdown with custom typing) */}
                <div className="modal-form-group" style={{ position: 'relative' }}>
                  <label className="modal-field-label">
                    Consulting Doctor <span className="req-star">*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Search size={16} />
                    </div>

                    <input
                      type="text"
                      className="modal-text-input"
                      placeholder="Search doctor or type custom doctor name..."
                      value={opdDoctor}
                      onChange={(e) => {
                        setOpdDoctor(e.target.value);
                        setShowDoctorDropdown(true);
                      }}
                      onFocus={() => setShowDoctorDropdown(true)}
                      required
                      autoComplete="off"
                      style={{
                        padding: '9px 65px 9px 36px',
                        fontSize: '13.5px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        width: '100%',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {opdDoctor && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setOpdDoctor('');
                            setShowDoctorDropdown(true);
                          }}
                          title="Clear search"
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowDoctorDropdown((prev) => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ChevronDown
                          size={18}
                          style={{
                            transform: showDoctorDropdown ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {showDoctorDropdown && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                        onClick={() => setShowDoctorDropdown(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '230px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          border: '1.5px solid #3b82f6',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          marginTop: '4px',
                          zIndex: 999,
                        }}
                      >
                        {opdDoctor.trim() && !OPD_DOCTORS_LIST.includes(opdDoctor.trim()) && (
                          <div
                            onClick={() => setShowDoctorDropdown(false)}
                            style={{
                              padding: '10px 12px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              background: '#f0fdf4',
                              borderBottom: '1px solid #bbf7d0',
                              color: '#166534',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontWeight: 600,
                            }}
                          >
                            <span>➕ Use custom doctor: <strong>"{opdDoctor.trim()}"</strong></span>
                            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>Custom</span>
                          </div>
                        )}

                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map((doc) => {
                            const isSelected = opdDoctor === doc;
                            return (
                              <div
                                key={doc}
                                onClick={() => {
                                  setOpdDoctor(doc);
                                  setShowDoctorDropdown(false);
                                }}
                                style={{
                                  padding: '9px 12px',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  color: isSelected ? '#1d4ed8' : '#1e293b',
                                  fontWeight: isSelected ? 600 : 400,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'background 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = '#ffffff';
                                }}
                              >
                                <span>{doc}</span>
                                {isSelected && <Check size={14} style={{ color: '#2563eb' }} />}
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '12px', fontSize: '12.5px', color: '#64748b', background: '#f8fafc', textAlign: 'center' }}>
                            <div>No matching predefined doctors found.</div>
                            <div style={{ marginTop: '4px', color: '#1e293b', fontWeight: 500 }}>
                              "{opdDoctor}" will be saved as the consulting doctor.
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Field 3: Next Follow-up Required? */}
                <div className="modal-form-group follow-up-toggle-card">
                  <div className="toggle-card-header">
                    <Calendar size={18} className="icon-blue" />
                    <span className="toggle-card-title">Next Follow-up Required?</span>
                  </div>

                  <div className="followup-segmented-switch">
                    <button
                      type="button"
                      className={`seg-switch-btn ${opdFollowUpRequired ? 'active-yes' : ''}`}
                      onClick={() => setOpdFollowUpRequired(true)}
                    >
                      <Check size={14} /> Yes, Follow-up Required
                    </button>

                    <button
                      type="button"
                      className={`seg-switch-btn ${!opdFollowUpRequired ? 'active-no' : ''}`}
                      onClick={() => setOpdFollowUpRequired(false)}
                    >
                      <X size={14} /> No Follow-up
                    </button>
                  </div>

                  {opdFollowUpRequired && (
                    <div className="timeframe-select-wrap" style={{ marginTop: '12px' }}>
                      <label className="sub-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', marginBottom: '6px', fontSize: '12.5px' }}>
                        <Calendar size={15} style={{ color: '#0284c7' }} />
                        Select Follow-up Date: <span className="req-star" style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="modal-text-input"
                        min={new Date().toISOString().split('T')[0]}
                        value={opdFollowUpDate}
                        onChange={(e) => setOpdFollowUpDate(e.target.value)}
                        required={opdFollowUpRequired}
                        style={{
                          padding: '9px 12px',
                          fontSize: '13.5px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          width: '100%',
                          background: '#ffffff',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Field 6: Consultation & Clinical Notes */}
                <div className="modal-form-group">
                  <label className="modal-field-label">
                    Consultation &amp; Clinical Notes / Chief Complaint
                  </label>
                  <textarea
                    className="modal-text-input"
                    rows="2"
                    placeholder="Enter observation notes, vitals or consultation details..."
                    value={opdNotes}
                    onChange={(e) => setOpdNotes(e.target.value)}
                  />
                </div>

                {/* Field 7: Prescription / Doctor Note Upload (Optional) */}
                <div className="modal-form-group">
                  <label className="modal-field-label">
                    Upload Prescription / Doctor Notes (Optional)
                  </label>

                  {opdAttachedDoc ? (
                    <div className="doc-attached-pill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                      <div className="doc-pill-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                        <div>
                          <strong style={{ fontSize: '12px', color: '#166534', display: 'block' }}>{opdAttachedDoc.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{opdAttachedDoc.size}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-doc-view"
                          style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setViewDoc({
                            title: opdAttachedDoc.name || 'Prescription Document',
                            fileName: opdAttachedDoc.name,
                            fileUrl: opdAttachedDoc.data || opdAttachedDoc.url,
                            url: opdAttachedDoc.data || opdAttachedDoc.url,
                            category: 'Prescription',
                            type: 'Medical Prescription',
                            size: opdAttachedDoc.size,
                          })}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn-doc-remove"
                          style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                          onClick={() => setOpdAttachedDoc(null)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="doc-upload-dropzone" style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc' }}>
                      <Upload size={16} style={{ color: '#0284c7' }} />
                      <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '500' }}>Attach Prescription (Image / PDF)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setOpdAttachedDoc({
                                name: file.name,
                                size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                                type: file.type,
                                data: event.target?.result,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="web-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowLogOPDModal(false)}
                    disabled={opdSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modal-submit" disabled={opdSubmitting}>
                    {opdSubmitting ? (
                      <>
                        <RotateCw size={16} className="am-spin" />
                        <span>Saving Record...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Save OPD Visit Record</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Document View & Preview Modal */}
      {viewDoc && (
        <div className="am-modal-overlay" onClick={() => setViewDoc(null)}>
          <div
            className="am-modal-dialog"
            style={{
              maxWidth: '820px',
              width: '94vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '14px',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                  }}
                >
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {viewDoc.title || viewDoc.name || viewDoc.fileName || 'Patient Document'}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {viewDoc.patientName || patient.name} • {viewDoc.patientId || patient.id}
                  </span>
                </div>
              </div>
              <button
                className="am-modal-close"
                onClick={() => setViewDoc(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Document Metadata Strip */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '18px',
                fontSize: '12px',
              }}
            >
              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Document Type
                </strong>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{viewDoc.type || viewDoc.category || 'Medical Record'}</span>
              </div>
              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  File Size
                </strong>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{viewDoc.size || viewDoc.fileSize || '1.2 MB'}</span>
              </div>
              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Upload Date
                </strong>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{viewDoc.date || 'Recently'}</span>
              </div>
              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Uploaded By / Source
                </strong>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{viewDoc.by || viewDoc.source || 'Citizen / Patient'}</span>
              </div>
              {viewDoc.status && (
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <strong style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Verification Status
                  </strong>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: (viewDoc.status === 'VERIFIED' || viewDoc.verified) ? '#dcfce7' : '#fef9c3',
                      color: (viewDoc.status === 'VERIFIED' || viewDoc.verified) ? '#15803d' : '#a16207',
                    }}
                  >
                    {(viewDoc.status === 'VERIFIED' || viewDoc.verified) ? '✓ Verified & Approved' : '⏳ Pending Verification'}
                  </span>
                </div>
              )}
            </div>

            {/* Document Content View Area */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                minHeight: '340px',
                maxHeight: 'calc(85vh - 170px)',
                background: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url) ? (
                (() => {
                  const targetUrl = viewDoc.fileUrl || viewDoc.file_url || viewDoc.url;
                  const isPdf = targetUrl.toLowerCase().endsWith('.pdf') || targetUrl.includes('/raw/') || (viewDoc.fileName && viewDoc.fileName.toLowerCase().endsWith('.pdf'));

                  return (
                    <div style={{ position: 'relative', width: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {docPreviewLoading && (
                        <div className="am-doc-preview-loader">
                          <div className="am-doc-preview-spinner"></div>
                          <p className="am-doc-preview-text">Loading Document Preview...</p>
                          <span className="am-doc-preview-subtext">Fetching secure file from storage</span>
                        </div>
                      )}

                      {isPdf ? (
                        <div style={{ width: '100%', height: '520px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#fff', opacity: docPreviewLoading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                          <iframe
                            src={targetUrl}
                            title={viewDoc.title || 'PDF Document Preview'}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            onLoad={() => setDocPreviewLoading(false)}
                            onError={() => setDocPreviewLoading(false)}
                          />
                        </div>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center', opacity: docPreviewLoading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                          <img
                            src={targetUrl}
                            alt={viewDoc.title || 'Uploaded Document'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '520px',
                              borderRadius: '8px',
                              objectFit: 'contain',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                            }}
                            onLoad={() => setDocPreviewLoading(false)}
                            onError={() => setDocPreviewLoading(false)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div
                  style={{
                    width: '100%',
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    color: '#1e293b',
                    lineHeight: 1.6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {generateDocText(viewDoc)}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                {(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url) && (
                  <button
                    type="button"
                    className="am-btn-secondary"
                    style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => window.open(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url, '_blank')}
                  >
                    <ExternalLink size={14} />
                    <span>Open in New Tab</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="am-btn-secondary"
                  style={{ fontSize: '13px', padding: '7px 16px' }}
                  onClick={() => setViewDoc(null)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="am-btn-primary"
                  style={{ fontSize: '13px', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={async () => {
                    const fUrl = viewDoc.fileUrl || viewDoc.file_url || viewDoc.url;
                    const fName = viewDoc.title || viewDoc.name || viewDoc.fileName || 'document';
                    setToastMessage(`Downloading ${fName}...`);
                    if (fUrl && fUrl.startsWith('http')) {
                      await downloadRemoteFile(fUrl, fName);
                    } else {
                      downloadDocFile(viewDoc);
                    }
                    setToastMessage(`Downloaded ${fName}`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }}
                >
                  <Download size={14} />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
