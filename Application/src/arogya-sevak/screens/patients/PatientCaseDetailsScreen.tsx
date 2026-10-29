import React, { useState, useEffect, useCallback } from 'react';
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
  PermissionsAndroid,
  Modal,
  Linking,
  Image,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { launchCamera } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { clinicalDataTranslator } from '../../../shared/services/clinicalDataTranslator';
import {
  AllocatedPatientCase,
  TreatmentStatus,
  RequestedDocument,
  AdditionalMedicalDocument,
  TreatmentTimelineItem,
  CaseAdminEscalation,
  sevakHospitalService,
} from '../../services/sevakHospitalService';
import { sevakOpdService } from '../../services/sevakOpdService';
import { OpdVisitEntry, OpdPrescriptionDoc } from '../../types/sevakOpd.types';
import { CaseAdminEscalationModal } from '../../components/CaseAdminEscalationModal';
import {
  sevakDraftService,
  StagedFileAttachment,
} from '../../services/sevakDraftService';
import { useSevakData } from '../../context/SevakDataContext';

const ALL_TREATMENT_STATUSES: TreatmentStatus[] = [
  'Admitted',
  'Diagnostic Stage',
  'Under Treatment',
  'Surgery Scheduled',
  'Post-Op Recovery',
  'On Hold',
  'Discharged',
  'Completed',
];

const parseTimestamp = (str?: string): number => {
  if (!str) return 0;
  const direct = Date.parse(str);
  if (!isNaN(direct)) return direct;
  const match = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,\s*(\d{1,2}):(\d{1,2})\s*([APap][Mm])?)?/);
  if (match) {
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const ampm = match[6]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]} ${hours}:${minutes}:00`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
};

export const PatientCaseDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const caseId = route.params?.caseId;

  const { getCaseById, updateLocalCase } = useSevakData();
  const initialParamCase: AllocatedPatientCase | null =
    route.params?.patient || route.params?.caseData || (caseId ? getCaseById(caseId) : null) || null;

  const isCompleteCase = (c: AllocatedPatientCase | null): boolean => {
    if (!c) return false;
    return Boolean(c.patientName && c.patientName !== 'Patient' && c.patientName !== 'Assigned Patient' && c.admissionDate);
  };

  const [patientCase, setPatientCase] = useState<AllocatedPatientCase | null>(initialParamCase);
  const [opdVisits, setOpdVisits] = useState<OpdVisitEntry[]>([]);
  const [loading, setLoading] = useState(!isCompleteCase(initialParamCase));
  const [refreshing, setRefreshing] = useState(false);

  // Staged unsubmitted documents for Admin Document Requests (keyed by docRequestId)
  const [stagedDocs, setStagedDocs] = useState<
    Record<
      string,
      {
        name: string;
        uri: string;
        size: string;
        timestamp: string;
        type: string;
      }
    >
  >({});
  const [submittingDocId, setSubmittingDocId] = useState<string | null>(null);

  // Chronologically sorted treatment history (oldest first at top, newest at bottom)
  const sortedTreatmentHistory = React.useMemo(() => {
    if (!patientCase?.treatmentHistory) return [];
    return [...patientCase.treatmentHistory].sort((a, b) => {
      const tA = parseTimestamp(a.timestamp);
      const tB = parseTimestamp(b.timestamp);
      return tA - tB;
    });
  }, [patientCase?.treatmentHistory]);

  // Treatment Status Modal State
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TreatmentStatus>('Admitted');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Additional Document Upload State
  const [addDocModalVisible, setAddDocModalVisible] = useState(false);
  const [addDocTitle, setAddDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Quick Admin Escalation State
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);

  // OPD Prescription Preview Modal State
  const [previewPrescription, setPreviewPrescription] = useState<OpdPrescriptionDoc | null>(null);

  // Transferred Case Handover (Patient Moved) Modal State
  const [patientMovedModalVisible, setPatientMovedModalVisible] = useState(false);
  const [patientMovedRemark, setPatientMovedRemark] = useState('');
  const [savingPatientMoved, setSavingPatientMoved] = useState(false);

  // Incoming Reassigned Case Intake (Patient Admitted Here) Modal State
  const [patientAdmitModalVisible, setPatientAdmitModalVisible] = useState(false);
  const [admitWard, setAdmitWard] = useState('');
  const [admitBed, setAdmitBed] = useState('');
  const [admitDoctor, setAdmitDoctor] = useState('');
  const [admitNote, setAdmitNote] = useState('');
  const [savingPatientAdmit, setSavingPatientAdmit] = useState(false);

  const loadCaseData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else if (!patientCase) {
        setLoading(true);
      }

      const [data, visits] = await Promise.all([
        sevakHospitalService.getCaseById(caseId, forceRefresh),
        sevakOpdService.getVisitsByCaseId(caseId),
      ]);
      if (data) {
        let finalData = data;
        const requestedDocFromParam = route.params?.requestedDocName;
        if (requestedDocFromParam) {
          const matchDoc = (finalData.requestedDocuments || []).find(
            (d) => d.title.toLowerCase() === requestedDocFromParam.toLowerCase()
          );
          if (!matchDoc) {
            // Check if there is an uploaded requested document with temp picker name
            const uploadedWithoutCanonicalTitle = (finalData.requestedDocuments || []).find(
              (d) => (d.status === 'uploaded' || d.uploadedDoc) && (d.title.startsWith('rn_image_picker') || d.title.startsWith('image_picker') || d.title === 'Requested Document')
            );
            if (uploadedWithoutCanonicalTitle) {
              uploadedWithoutCanonicalTitle.title = requestedDocFromParam;
            } else {
              const hasAnyUploaded = (finalData.requestedDocuments || []).some((d) => d.status === 'uploaded' || d.uploadedDoc);
              finalData = {
                ...finalData,
                requestedDocuments: [
                  {
                    id: `req-param-${Date.now()}`,
                    title: requestedDocFromParam,
                    description: 'Clinical document requested by Admin',
                    isRequired: true,
                    status: hasAnyUploaded ? 'uploaded' : 'pending',
                  },
                  ...(finalData.requestedDocuments || []),
                ],
              };
            }
          }
        }

        // Filter out pending requested documents from additional medical docs list
        const pendingReqTitles = new Set(
          (finalData.requestedDocuments || [])
            .filter((r) => r.status === 'pending')
            .map((r) => r.title.toLowerCase().trim())
        );
        const cleanAdditionalDocs = (finalData.additionalMedicalDocs || []).filter((doc) => {
          const hasValidUri = Boolean(doc.uri && doc.uri !== '' && doc.uri !== 'Pending Upload' && !doc.uri.startsWith('undefined'));
          const isPending = pendingReqTitles.has((doc.title || doc.name || '').toLowerCase().trim());
          return hasValidUri && !isPending;
        });

        finalData = {
          ...finalData,
          additionalMedicalDocs: cleanAdditionalDocs,
        };

        setPatientCase(finalData);
        setSelectedStatus(finalData.treatmentStatus);
        setAdmitWard(finalData.assignedWard || '');
        setAdmitBed(finalData.bedNumber || '');
        setAdmitDoctor(finalData.treatingDoctor || '');

        // Auto-load staged requested documents draft
        try {
          const stagedDraft = await sevakDraftService.loadDraft<Record<string, StagedFileAttachment>>(
            sevakDraftService.keys.caseReqDocs(finalData.id)
          );
          if (stagedDraft) {
            const validStaged: Record<string, StagedFileAttachment> = {};
            finalData.requestedDocuments.forEach((d) => {
              if (d.status === 'pending' && stagedDraft[d.id]) {
                validStaged[d.id] = stagedDraft[d.id];
              }
            });
            setStagedDocs(validStaged);
          }
        } catch {}

        // Auto-load additional document draft
        try {
          const addDocDraft = await sevakDraftService.loadDraft<{ title: string }>(
            sevakDraftService.keys.additionalDocModal(data.id)
          );
          if (addDocDraft?.title) {
            setAddDocTitle(addDocDraft.title);
          }
        } catch {}

        // Auto-load status update note draft
        try {
          const statusDraft = await sevakDraftService.loadDraft<{ note: string }>(
            sevakDraftService.keys.treatmentStatusModal(data.id)
          );
          if (statusDraft?.note) {
            setStatusNote(statusDraft.note);
          }
        } catch {}
      }
      setOpdVisits(visits || []);
    } catch (e) {
      console.warn('Failed to load patient case', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (caseId) {
        loadCaseData();
      }
    }, [caseId])
  );

  const handleCall = (phoneNumber: string, recipientName?: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            recipientName || t('callPatient'),
            `Dialing: ${phoneNumber}\n(Direct calling simulated on emulator)`
          );
        }
      })
      .catch(() => {
        Linking.openURL(url).catch(() => {
          Alert.alert('Phone Call', `Number: ${phoneNumber}`);
        });
      });
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Required',
          message: 'ArogyaMitra needs camera access to capture clinical documents for the Admin.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // Pick / Capture handler for Admin Requested Document (stages file for preview & review)
  const handlePickRequestedDoc = async (
    docRequestId: string,
    source: 'camera' | 'device'
  ) => {
    const timeStr = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      if (source === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert(t('permissionDeniedTitle'), t('cameraPermissionMsg'));
          return;
        }

        const result = await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          saveToPhotos: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];
        const fileSizeMB = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';

        const nextStaged = {
          ...stagedDocs,
          [docRequestId]: {
            name: asset.fileName || 'Doc_Photo.jpg',
            uri: asset.uri || '',
            size: fileSizeMB,
            timestamp: timeStr,
            type: asset.type || 'image/jpeg',
          },
        };
        setStagedDocs(nextStaged);
        await sevakDraftService.saveDraft(sevakDraftService.keys.caseReqDocs(caseId), nextStaged);
      } else {
        // Document picker from device
        const res = await pick({
          type: [types.pdf, types.images, '*/*'],
          allowMultiSelection: false,
        });

        if (!res || res.length === 0) return;
        const picked = res[0];
        const fileSizeMB = picked.size ? `${(picked.size / (1024 * 1024)).toFixed(1)} MB` : '2.1 MB';

        const nextStaged = {
          ...stagedDocs,
          [docRequestId]: {
            name: picked.name || 'Document_Attachment.pdf',
            uri: picked.uri,
            size: fileSizeMB,
            timestamp: timeStr,
            type: picked.type || 'application/pdf',
          },
        };
        setStagedDocs(nextStaged);
        await sevakDraftService.saveDraft(sevakDraftService.keys.caseReqDocs(caseId), nextStaged);
      }
    } catch (e: any) {
      if (e?.message !== 'User canceled document picker') {
        Alert.alert(t('selectionErrorTitle'), t('filePickerErrorMsg'));
      }
    }
  };

  // Discard a staged document draft
  const handleDiscardStagedDoc = async (docRequestId: string) => {
    const nextStaged = { ...stagedDocs };
    delete nextStaged[docRequestId];
    setStagedDocs(nextStaged);
    if (Object.keys(nextStaged).length > 0) {
      await sevakDraftService.saveDraft(sevakDraftService.keys.caseReqDocs(caseId), nextStaged);
    } else {
      await sevakDraftService.clearDraft(sevakDraftService.keys.caseReqDocs(caseId));
    }
  };

  // Officially submit the staged document to Admin
  const handleSubmitRequestedDoc = async (docRequestId: string) => {
    const staged = stagedDocs[docRequestId];
    if (!staged) return;

    try {
      setSubmittingDocId(docRequestId);
      const updated = await sevakHospitalService.fulfillRequestedDocument(caseId, docRequestId, {
        name: staged.name,
        uri: staged.uri,
        size: staged.size,
        timestamp: staged.timestamp,
        type: staged.type,
      });

      if (updated) {
        setPatientCase(updated);
        updateLocalCase(updated);
        const nextStaged = { ...stagedDocs };
        delete nextStaged[docRequestId];
        setStagedDocs(nextStaged);

        if (Object.keys(nextStaged).length > 0) {
          await sevakDraftService.saveDraft(sevakDraftService.keys.caseReqDocs(caseId), nextStaged);
        } else {
          await sevakDraftService.clearDraft(sevakDraftService.keys.caseReqDocs(caseId));
        }
        Alert.alert(
          language === 'mr' ? 'कागदपत्र सबमिट झाले' : language === 'hi' ? 'दस्तावेज़ सबमिट हुआ' : 'Document Submitted',
          language === 'mr'
            ? 'कागदपत्र यशस्वीरीत्या सबमिट करण्यात आले आहे व प्रशासकास पाठवले आहे.'
            : language === 'hi'
            ? 'दस्तावेज़ सफलतापूर्वक सबमिट किया गया और प्रशासक को भेजा गया।'
            : 'Requested document uploaded successfully and sent to Admin.'
        );
      }
    } catch (e: any) {
      Alert.alert(t('uploadErrorTitle'), t('uploadErrorMsg'));
    } finally {
      setSubmittingDocId(null);
    }
  };

  // Upload handler for Additional Medical Documents
  const handleUploadAdditionalDoc = async (source: 'camera' | 'device') => {
    if (!addDocTitle.trim()) {
      Alert.alert(t('docTitleRequiredTitle'), t('docTitleRequiredMsg'));
      return;
    }

    const timeStr = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      setUploadingDoc(true);

      if (source === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert(t('permissionDeniedTitle'), t('cameraPermissionMsg'));
          return;
        }

        const result = await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) return;
        const asset = result.assets[0];
        const fileSizeMB = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB';

        const updated = await sevakHospitalService.addAdditionalMedicalDocument(caseId, {
          id: `med-${Date.now()}`,
          title: addDocTitle.trim(),
          name: asset.fileName || `${addDocTitle.replace(/\s+/g, '_')}.jpg`,
          uri: asset.uri || '',
          size: fileSizeMB,
          timestamp: timeStr,
          type: asset.type || 'image/jpeg',
        });

        if (updated) {
          setPatientCase(updated);
          updateLocalCase(updated);
          setAddDocModalVisible(false);
          setAddDocTitle('');
          await sevakDraftService.clearDraft(sevakDraftService.keys.additionalDocModal(caseId));
          Alert.alert(t('docUploadedSuccessTitle'), t('docUploadedSuccessMsg'));
        }
      } else {
        const res = await pick({
          type: [types.pdf, types.images, '*/*'],
          allowMultiSelection: false,
        });

        if (!res || res.length === 0) return;
        const picked = res[0];
        const fileSizeMB = picked.size ? `${(picked.size / (1024 * 1024)).toFixed(1)} MB` : '2.5 MB';

        const updated = await sevakHospitalService.addAdditionalMedicalDocument(caseId, {
          id: `med-${Date.now()}`,
          title: addDocTitle.trim(),
          name: picked.name || `${addDocTitle.replace(/\s+/g, '_')}.pdf`,
          uri: picked.uri,
          size: fileSizeMB,
          timestamp: timeStr,
          type: picked.type || 'application/pdf',
        });

        if (updated) {
          setPatientCase(updated);
          updateLocalCase(updated);
          setAddDocModalVisible(false);
          setAddDocTitle('');
          await sevakDraftService.clearDraft(sevakDraftService.keys.additionalDocModal(caseId));
          Alert.alert(t('docUploadedSuccessTitle'), t('docUploadedSuccessMsg'));
        }
      }
    } catch (e: any) {
      if (e?.message !== 'User canceled document picker') {
        Alert.alert(t('uploadErrorTitle'), t('uploadErrorMsg'));
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddDocTitleChange = (text: string) => {
    setAddDocTitle(text);
    if (caseId) {
      sevakDraftService.saveDraft(sevakDraftService.keys.additionalDocModal(caseId), {
        title: text,
        savedAt: new Date().toISOString(),
      });
    }
  };

  // Submit Treatment Status update
  const handleSubmitStatusUpdate = async () => {
    if (!patientCase) return;
    try {
      setUpdatingStatus(true);
      const updated = await sevakHospitalService.updateTreatmentStatus(
        patientCase.id,
        selectedStatus,
        statusNote.trim() || undefined,
        'Arogya Sevak (Hospital Desk)'
      );
      if (updated) {
        setPatientCase(updated);
        updateLocalCase(updated);
        setStatusModalVisible(false);
        setStatusNote('');
        await sevakDraftService.clearDraft(sevakDraftService.keys.treatmentStatusModal(caseId));
        Alert.alert(t('statusUpdatedTitle'), `${t('statusUpdatedMsg')} ${clinicalDataTranslator.translateTreatmentStatus(selectedStatus, language)}`);
      }
    } catch {
      Alert.alert(t('uploadErrorTitle'), t('statusUpdateErrorMsg'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusNoteChange = (text: string) => {
    setStatusNote(text);
    if (caseId) {
      sevakDraftService.saveDraft(sevakDraftService.keys.treatmentStatusModal(caseId), {
        status: selectedStatus,
        note: text,
        savedAt: new Date().toISOString(),
      });
    }
  };

  const handleConfirmPatientMoved = async () => {
    if (!patientCase) return;
    try {
      setSavingPatientMoved(true);
      const updated = await sevakHospitalService.markPatientMoved(
        patientCase.id,
        patientMovedRemark.trim()
      );
      if (updated) {
        setPatientCase(updated);
        updateLocalCase(updated);
        setPatientMovedModalVisible(false);
        setPatientMovedRemark('');
        Alert.alert(
          language === 'mr' ? 'यशस्वी' : language === 'hi' ? 'सफल' : 'Success',
          t('patientMovedSuccess')
        );
      }
    } catch {
      Alert.alert(t('uploadErrorTitle'), t('patientMovedErrorMsg'));
    } finally {
      setSavingPatientMoved(false);
    }
  };

  const handleConfirmPatientAdmitted = async () => {
    if (!patientCase) return;
    try {
      setSavingPatientAdmit(true);
      const updated = await sevakHospitalService.confirmPatientAdmitted(patientCase.id, {
        assignedWard: admitWard.trim() || patientCase.assignedWard,
        bedNumber: admitBed.trim() || patientCase.bedNumber,
        treatingDoctor: admitDoctor.trim() || patientCase.treatingDoctor,
        note: admitNote.trim(),
      });
      if (updated) {
        setPatientCase(updated);
        updateLocalCase(updated);
        setSelectedStatus(updated.treatmentStatus);
        setPatientAdmitModalVisible(false);
        Alert.alert(
          language === 'mr' ? 'यशस्वी' : language === 'hi' ? 'सफल' : 'Success',
          t('patientAdmitSuccess')
        );
      }
    } catch {
      Alert.alert(t('uploadErrorTitle'), t('patientAdmitErrorMsg'));
    } finally {
      setSavingPatientAdmit(false);
    }
  };

  // Field simulation for Admin response
  const handleSimulateAdminResponse = () => {
    if (!patientCase) return;
    Alert.alert(
      'Admin Decision Simulation (प्रशासक निर्णय चाचणी)',
      'Choose an administrative decision to test how the Sevak receives the resolution note & status:',
      [
        {
          text: 'Approve Extension (₹75,000 Grant)',
          onPress: async () => {
            const updated = await sevakHospitalService.resolveAdminEscalation(patientCase.id, {
              decision: 'APPROVE_ENHANCEMENT',
              note: 'Scheme package extension approved for ₹75,000 under emergency secondary grant pool. Hold released. Continue treatment.',
              adminName: 'Dr. R. Sharma',
              designation: 'Medical Superintendent',
            });
            if (updated) {
              setPatientCase(updated);
              setSelectedStatus(updated.treatmentStatus);
            }
          },
        },
        {
          text: 'Authorize Transfer (सुपर-स्पेशालिटी)',
          onPress: async () => {
            const updated = await sevakHospitalService.resolveAdminEscalation(patientCase.id, {
              decision: 'TRANSFER_AUTHORIZED',
              note: 'Inter-hospital transfer authorized. Patient moved to tertiary super-specialty hospital for advanced treatment.',
              adminName: 'District Scheme Administrator',
              designation: 'District Incharge',
            });
            if (updated) {
              setPatientCase(updated);
              setSelectedStatus(updated.treatmentStatus);
            }
          },
        },
        {
          text: 'Close Case (प्रकरण बंद)',
          onPress: async () => {
            const updated = await sevakHospitalService.resolveAdminEscalation(patientCase.id, {
              decision: 'CLOSE',
              note: 'Administrative clearance finalized. Case closed in scheme records.',
              adminName: 'District Scheme Administrator',
              designation: 'District Incharge',
            });
            if (updated) {
              setPatientCase(updated);
              setSelectedStatus(updated.treatmentStatus);
            }
          },
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  if (loading || !patientCase) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.sevak.primary} />
        <Text style={styles.loadingText}>{t('loadingCaseDetails')}</Text>
      </View>
    );
  }

  const pendingDocsCount = patientCase.requestedDocuments.filter((d: RequestedDocument) => d.status === 'pending').length;
  const patientPhone = patientCase.contactPhone || '+91 98220 54321';
  const relativePhone = patientCase.relativePhone || '+91 98220 98765';
  const relativeLabel = patientCase.relativeName
    ? `${patientCase.relativeName}${patientCase.relativeRelation ? ` (${patientCase.relativeRelation})` : ''}`
    : patientCase.relativeRelation || 'नातेवाईक (Relative)';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top App Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('caseDetailsHeading')}</Text>
          <Text style={styles.headerSubtitle}>{t('caseNumberLabel')} #{patientCase.id}</Text>
        </View>

        <View style={styles.headerActionsWrap}>
          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.headerRefreshBtn}
            onPress={() => loadCaseData(true)}
            activeOpacity={0.7}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.headerRefreshText}>
              {language === 'mr' ? 'रिफ्रेश' : language === 'hi' ? 'रिफ्रेश' : 'Refresh'}
            </Text>
          </TouchableOpacity>

          {/* Escalate to Admin Button */}
          <TouchableOpacity
            style={styles.headerEscalateBtn}
            onPress={() => setEscalateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={13} color="#FFFFFF" />
            <Text style={styles.headerEscalateText}>{t('escalateToAdminBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCaseData(true)}
            colors={[colors.sevak.primary, '#0284C7']}
            tintColor={colors.sevak.primary}
          />
        }
      >
        {/* ============================================================ */}
        {/* ADMINISTRATIVE ESCALATION / CONTACT ADMIN BANNER */}
        {/* ============================================================ */}
        {patientCase.activeEscalation ? (
          <View
            style={[
              styles.escalationCard,
              patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW'
                ? styles.escalationCardPending
                : styles.escalationCardResolved,
            ]}
          >
            <View style={styles.escalationCardTop}>
              <View style={styles.escalationTypeBadge}>
                <Ionicons
                  name={patientCase.activeEscalation.type === 'BILL_EXCEEDED' ? 'receipt' : 'medical'}
                  size={15}
                  color={patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW' ? '#DC2626' : '#15803D'}
                />
                <Text
                  style={[
                    styles.escalationTypeBadgeText,
                    { color: patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW' ? '#DC2626' : '#15803D' },
                  ]}
                  numberOfLines={2}
                >
                  {clinicalDataTranslator.translateEscalationType(patientCase.activeEscalation.type, language)}
                </Text>
              </View>

              <View
                style={[
                  styles.escalationStatusPill,
                  patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW'
                    ? styles.escalationStatusPillPending
                    : styles.escalationStatusPillResolved,
                ]}
              >
                <Text
                  style={[
                    styles.escalationStatusPillText,
                    { color: patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW' ? '#B45309' : '#15803D' },
                  ]}
                  numberOfLines={1}
                >
                  {patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW'
                    ? `⏳ ${clinicalDataTranslator.translateEscalationStatus(patientCase.activeEscalation.status, language)}`
                    : `✓ ${clinicalDataTranslator.translateEscalationStatus(patientCase.activeEscalation.status, language)}`}
                </Text>
              </View>
            </View>

            {patientCase.activeEscalation.holdCase && patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW' && (
              <View style={styles.holdBannerAlert}>
                <Ionicons name="pause-circle" size={16} color="#DC2626" />
                <Text style={styles.holdBannerAlertText}>
                  ⏸️ {t('onHoldBadge')} • {t('holdCaseBannerNotice')}
                </Text>
              </View>
            )}

            <View style={styles.escalationInfoBox}>
              {patientCase.activeEscalation.approxBillAmount ? (
                <View style={styles.escalationInfoRow}>
                  <Text style={styles.escalationInfoLabel}>{t('approxBillLabel')}:</Text>
                  <Text style={styles.escalationInfoValue}>{patientCase.activeEscalation.approxBillAmount}</Text>
                </View>
              ) : null}

              {patientCase.activeEscalation.requiredSpecialty ? (
                <View style={styles.escalationInfoRow}>
                  <Text style={styles.escalationInfoLabel}>{t('requiredSpecialtyLabel')}:</Text>
                  <Text style={styles.escalationInfoValue}>{patientCase.activeEscalation.requiredSpecialty}</Text>
                </View>
              ) : null}

              <Text style={styles.escalationSevakNote}>
                "{patientCase.activeEscalation.sevakNote}"
              </Text>

              {patientCase.activeEscalation.supportiveDoc && (
                <View style={styles.escalationDocPill}>
                  <Ionicons name="attach" size={15} color="#0284C7" />
                  <Text style={styles.escalationDocName} numberOfLines={1}>
                    {patientCase.activeEscalation.supportiveDoc.name} ({patientCase.activeEscalation.supportiveDoc.size})
                  </Text>
                </View>
              )}

              <Text style={styles.escalationMetaDate}>
                Escalated on {patientCase.activeEscalation.submittedAt} by {patientCase.activeEscalation.submittedBy}
              </Text>
            </View>

            {/* Admin Response Note when resolved */}
            {patientCase.activeEscalation.status === 'ADMIN_RESOLVED' && patientCase.activeEscalation.adminResponse && (
              <View style={styles.adminResolvedContainer}>
                <View style={styles.adminResolvedTitleRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                  <Text style={styles.adminResolvedTitleText}>{t('adminDecisionTitle')}:</Text>
                </View>
                <Text style={styles.adminDecisionPillText}>
                  Action: <Text style={{ fontWeight: '700' }}>{patientCase.activeEscalation.adminResponse.decision}</Text>
                </Text>
                <Text style={styles.adminResponseNoteText}>
                  "{clinicalDataTranslator.translateAdminNote(patientCase.activeEscalation.adminResponse.note, language)}"
                </Text>
                <Text style={styles.adminResolvedMetaText}>
                  Resolved by {patientCase.activeEscalation.adminResponse.adminName} ({patientCase.activeEscalation.adminResponse.designation}) on {patientCase.activeEscalation.adminResponse.resolvedAt}
                </Text>
              </View>
            )}

            {/* Bottom action row */}
            <View style={styles.escalationFooterRow}>
              {patientCase.activeEscalation.status === 'PENDING_ADMIN_REVIEW' ? (
                <TouchableOpacity
                  style={styles.simulateAdminActionBtn}
                  onPress={handleSimulateAdminResponse}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={15} color="#0284C7" />
                  <Text style={styles.simulateAdminActionBtnText}>
                    {t('simulateAdminResponseBtn')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.reEscalateBtn}
                  onPress={() => setEscalateModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash-outline" size={14} color="#0284C7" />
                  <Text style={styles.reEscalateBtnText}>{t('escalateAnotherIssueBtn')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : !(patientCase.isTransferredOut || patientCase.treatmentStatus === 'Transferred') ? (
          <TouchableOpacity
            style={styles.quickEscalateCard}
            onPress={() => setEscalateModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.quickEscalateLeft}>
              <View style={styles.quickEscalateIconBadge}>
                <Ionicons name="flash" size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickEscalateTitle}>{t('escalateToAdminBtn')}</Text>
                <Text style={styles.quickEscalateSubtitle} numberOfLines={1}>
                  {t('scenarioBillExceeded')} • {t('scenarioSpecialtyUnavailable')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
        {/* ============================================================ */}
        {/* CRITICAL / HIGH PRIORITY ADMIN NOTE BANNER (CANNOT BE MISSED) */}
        {/* ============================================================ */}
        {patientCase.priorityNote && (
          <View
            style={[
              styles.adminNoteCard,
              patientCase.priorityNote.level === 'CRITICAL'
                ? styles.adminNoteCardCritical
                : styles.adminNoteCardHigh,
            ]}
          >
            <View style={styles.noteTopBar}>
              <View style={styles.noteIconPill}>
                <Ionicons
                  name="warning"
                  size={16}
                  color={patientCase.priorityNote.level === 'CRITICAL' ? '#DC2626' : '#D97706'}
                />
                <Text
                  style={[
                    styles.notePillTitle,
                    {
                      color:
                        patientCase.priorityNote.level === 'CRITICAL'
                          ? '#DC2626'
                          : '#B45309',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t('adminPriorityNoteHeader')} ({clinicalDataTranslator.translatePriorityLevel(patientCase.priorityNote.level, language)})
                </Text>
              </View>
              <Text style={styles.noteDate}>{patientCase.priorityNote.date}</Text>
            </View>


            <Text style={styles.noteTextContent}>
              "{clinicalDataTranslator.translateAdminNote(patientCase.priorityNote.text, language)}"
            </Text>

            <View style={styles.noteAuthorRow}>
              <Ionicons name="person-circle-outline" size={16} color="#64748B" />
              <Text style={styles.noteAuthorText}>
                {t('referredBy')}: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{patientCase.priorityNote.adminName}</Text> ({patientCase.priorityNote.designation})
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TRANSFERRED OUT CASE (FOR PREVIOUS AROGYA SEVAK - READ ONLY) */}
        {/* ============================================================ */}
        {(patientCase.isTransferredOut || patientCase.treatmentStatus === 'Transferred') && (
          <View style={styles.transferredOutCard}>
            <View style={styles.transferredOutHeaderRow}>
              <View style={styles.transferredTagPill}>
                <Ionicons name="swap-horizontal" size={14} color="#7C3AED" />
                <Text style={styles.transferredTagPillText}>🔄 {t('transferredCaseTag')}</Text>
              </View>
              <View style={styles.transferredStatusBadgePill}>
                <Text style={styles.transferredStatusBadgePillText}>{t('readOnlyBadge')}</Text>
              </View>
            </View>

            {Boolean(patientCase.assignedToNewHospital) && (
              <View style={styles.reassignedDetailRow}>
                <Ionicons name="business" size={15} color="#6D28D9" />
                <Text style={styles.reassignedDetailLabel}>{t('destinationHospitalLabel')}:</Text>
                <Text style={styles.reassignedDetailValue}>{patientCase.assignedToNewHospital}</Text>
              </View>
            )}

            {Boolean(patientCase.assignedToNewSevak) && (
              <View style={styles.newSevakContactCard}>
                <View style={styles.prevSevakHeader}>
                  <Ionicons name="person-circle" size={24} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prevSevakTitle}>{t('newSevakCardTitle')}</Text>
                    <Text style={styles.prevSevakName}>{patientCase.assignedToNewSevak?.name || 'New Assigned Sevak'}</Text>
                  </View>
                  {Boolean(patientCase.assignedToNewSevak?.phone) && (
                    <TouchableOpacity
                      style={styles.callPrevSevakBtn}
                      onPress={() => handleCall(patientCase.assignedToNewSevak!.phone!, patientCase.assignedToNewSevak!.name)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={13} color="#FFFFFF" />
                      <Text style={styles.callPrevSevakBtnText}>{t('callSevak')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {Boolean(patientCase.assignedToNewSevak?.phone) && (
                  <Text style={styles.prevSevakPhoneText}>
                    📞 {patientCase.assignedToNewSevak?.phone}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.transferredLockNoticeBox}>
              <Ionicons name="lock-closed" size={15} color="#6D28D9" />
              <Text style={styles.transferredLockNoticeText}>
                {t('transferredOutLockNotice')}
              </Text>
            </View>

            {/* Single Allowed Action for Previous Sevak: Confirm Patient Has Moved */}
            <View style={styles.patientMovedActionArea}>
              {patientCase.patientMovedStatus === 'MOVED' ? (
                <View style={styles.patientMovedDoneBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientMovedDoneTitle}>
                      ✓ {t('patientMovedDoneTitle')}
                    </Text>
                    <Text style={styles.patientMovedDoneSub}>
                      {t('dispatchDateTimeLabel')}: {patientCase.patientMovedAt || t('recordCompleted')}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.confirmMovedActionBtn}
                  onPress={() => setPatientMovedModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="car" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmMovedActionBtnText}>
                    {t('confirmPatientMovedBtn')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* REASSIGNED INCOMING CASE (FOR NEW AROGYA SEVAK) */}
        {/* ============================================================ */}
        {Boolean(patientCase.isReassigned && !patientCase.isTransferredOut) && (
          <View style={styles.reassignedInfoCard}>
            <View style={styles.reassignedHeaderRow}>
              <View style={styles.reassignedTagPill}>
                <Ionicons name="repeat" size={14} color="#7C3AED" />
                <Text style={styles.reassignedTagPillText}>🔄 {t('reassignedCaseBadge')}</Text>
              </View>
              <View style={styles.reassignedPriorityPill}>
                <Text style={styles.reassignedPriorityPillText}>{t('criticalPriorityBadge')}</Text>
              </View>
            </View>

            {Boolean(patientCase.transferredFromHospital) && (
              <View style={styles.reassignedDetailRow}>
                <Ionicons name="business" size={15} color="#6D28D9" />
                <Text style={styles.reassignedDetailLabel}>{t('transferredFromLabel')}:</Text>
                <Text style={styles.reassignedDetailValue}>{patientCase.transferredFromHospital}</Text>
              </View>
            )}

            {Boolean(patientCase.transferReason) && (
              <View style={styles.reassignedDetailRow}>
                <Ionicons name="medical" size={15} color="#DC2626" />
                <Text style={styles.reassignedDetailLabel}>{t('transferReasonLabel')}:</Text>
                <Text style={styles.reassignedDetailValue}>{patientCase.transferReason}</Text>
              </View>
            )}

            {Boolean(patientCase.previousSevak) && (
              <View style={styles.prevSevakCard}>
                <View style={styles.prevSevakHeader}>
                  <Ionicons name="person-circle" size={24} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prevSevakTitle}>{t('previousSevakLabel')}</Text>
                    <Text style={styles.prevSevakName}>{patientCase.previousSevak?.name || 'Assigned Sevak'}</Text>
                  </View>
                  {Boolean(patientCase.previousSevak?.phone) && (
                    <TouchableOpacity
                      style={styles.callPrevSevakBtn}
                      onPress={() => handleCall(patientCase.previousSevak!.phone!, patientCase.previousSevak!.name)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={13} color="#FFFFFF" />
                      <Text style={styles.callPrevSevakBtnText}>{t('callSevak')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {Boolean(patientCase.previousSevak?.phone) && (
                  <Text style={styles.prevSevakPhoneText}>
                    📞 {patientCase.previousSevak?.phone}
                  </Text>
                )}
              </View>
            )}

            {/* Action for New Sevak: Confirm Patient Arrival & Admit Here */}
            <View style={styles.patientAdmitActionArea}>
              {patientCase.patientAdmittedStatus === 'ADMITTED' ? (
                <View style={styles.patientAdmitDoneBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientAdmitDoneTitle}>
                      ✓ {t('patientAdmittedHereTitle')}
                    </Text>
                    <Text style={styles.patientAdmitDoneSub}>
                      {t('admissionDateLabel')}: {patientCase.patientAdmittedAt || patientCase.admissionDate} • {t('wardLabel')} {clinicalDataTranslator.translateWard(patientCase.assignedWard, language)} ({patientCase.bedNumber})
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.patientIntakePendingBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={17} color="#B45309" />
                    <Text style={styles.patientIntakePendingTitle}>
                      {t('intakePendingTitle')}
                    </Text>
                  </View>
                  <Text style={styles.patientIntakePendingSub}>
                    {t('intakePendingSub')}
                  </Text>
                  <TouchableOpacity
                    style={styles.confirmAdmitActionBtn}
                    onPress={() => setPatientAdmitModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmAdmitActionBtnText}>
                      {t('confirmPatientAdmitBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* PATIENT & ADMISSION SUMMARY CARD */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.patientMainRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={26} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{patientCase.patientName}</Text>
              <Text style={styles.patientDemographics}>
                {clinicalDataTranslator.formatAgeGender(patientCase.age, patientCase.gender, language)} • {patientCase.contactPhone}
              </Text>
              <Text style={styles.abhaIdText}>
                ABHA ID: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{patientCase.abhaId}</Text>
              </Text>
            </View>
          </View>

          {/* Quick Call Actions: Patient & Relative */}
          <View style={styles.callActionsRow}>
            <TouchableOpacity
              style={styles.callPatientBtn}
              onPress={() => handleCall(patientPhone, patientCase.patientName)}
              activeOpacity={0.8}
            >
              <View style={styles.callBtnIconWrapBlue}>
                <Ionicons name="call" size={15} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callBtnTitle}>{t('callPatient')}</Text>
                <Text style={styles.callBtnPhone} numberOfLines={1}>{patientPhone}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callRelativeBtn}
              onPress={() => handleCall(relativePhone, relativeLabel)}
              activeOpacity={0.8}
            >
              <View style={styles.callBtnIconWrapGreen}>
                <Ionicons name="people" size={15} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callBtnTitle}>{t('callRelative')}</Text>
                <Text style={styles.callBtnPhone} numberOfLines={1}>
                  {relativeLabel}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailItemHeaderRow}>
                <Ionicons name="bed-outline" size={14} color="#0284C7" />
                <Text style={styles.detailLabel}>{t('assignedWardBed')}</Text>
              </View>
              <Text style={styles.detailValue}>
                {clinicalDataTranslator.translateWard(patientCase.assignedWard, language)} ({patientCase.bedNumber})
              </Text>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailItemHeaderRow}>
                <Ionicons name="calendar-outline" size={14} color="#0284C7" />
                <Text style={styles.detailLabel}>{t('admissionDate')}</Text>
              </View>
              <Text style={styles.detailValue}>{patientCase.admissionDate}</Text>
            </View>

            <View style={styles.detailItemFull}>
              <View style={styles.detailItemHeaderRow}>
                <Ionicons name="medical-outline" size={14} color="#DC2626" />
                <Text style={styles.detailLabel}>{t('diagnosisAndComplaint')}</Text>
              </View>
              <Text style={[styles.detailValue, { color: '#0F172A', fontWeight: '700' }]}>
                {clinicalDataTranslator.translateDiagnosis(patientCase.diagnosis, language)}
              </Text>
            </View>

            <View style={styles.detailItemFull}>
              <View style={styles.detailItemHeaderRow}>
                <Ionicons name="person-circle-outline" size={14} color="#059669" />
                <Text style={styles.detailLabel}>{t('treatingDoctor')}</Text>
              </View>
              <Text style={styles.detailValue}>{patientCase.treatingDoctor}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* CURRENT TREATMENT STATUS & QUICK UPDATER */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="fitness" size={18} color="#15803D" />
              </View>
              <Text style={styles.cardSectionTitle}>{t('treatmentStatusCardTitle')}</Text>
            </View>
            {patientCase.isTransferredOut || patientCase.treatmentStatus === 'Transferred' ? (
              <View style={styles.lockedSectionBadge}>
                <Ionicons name="lock-closed" size={12} color="#6D28D9" />
                <Text style={styles.lockedSectionBadgeText}>वर्ग केस (Locked)</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.updateStatusButton}
                onPress={() => setStatusModalVisible(true)}
              >
                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                <Text style={styles.updateStatusButtonText}>{t('updateTreatmentStatusBtn')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.currentStatusDisplay}>
            <View style={styles.statusPillActive}>
              <View style={styles.statusPulseDot} />
              <Text style={styles.statusPillActiveText}>
                {patientCase.isTransferredOut
                  ? 'वर्ग (Transferred)'
                  : clinicalDataTranslator.translateTreatmentStatus(patientCase.treatmentStatus, language)}
              </Text>
            </View>
            <Text style={styles.statusHospitalText}>
              at {patientCase.hospitalName}
            </Text>
          </View>

          {/* Timeline History - Chronological (Oldest at Top, Newest at Bottom) */}
          <Text style={styles.timelineHeader}>{t('statusHistoryHeading')}:</Text>
          {sortedTreatmentHistory.map((item: TreatmentTimelineItem, idx: number) => {
            const isLatest = idx === sortedTreatmentHistory.length - 1;
            return (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineLeftTrack}>
                  <View style={[styles.timelineNode, isLatest && styles.timelineNodeLatest]} />
                  {idx < sortedTreatmentHistory.length - 1 && (
                    <View style={styles.timelineBar} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTimeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.timelineStatusTitle, isLatest && { color: '#15803D', fontWeight: '800' }]}>
                        {clinicalDataTranslator.translateTreatmentStatus(item.status, language)}
                      </Text>
                      {isLatest && (
                        <View style={styles.latestStatusBadge}>
                          <Text style={styles.latestStatusBadgeText}>{t('latestStatusBadge')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timelineTimestamp}>{item.timestamp}</Text>
                  </View>
                  {item.note ? (
                    <View style={[styles.timelineNoteBox, isLatest && styles.timelineNoteBoxLatest]}>
                      <Text style={styles.timelineNote}>"{item.note}"</Text>
                    </View>
                  ) : null}
                  <Text style={styles.timelineBy}>{t('updatedByLabel')}: {item.updatedBy}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ============================================================ */}
        {/* OPD VISITS & FOLLOW-UP RECORD */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="ticket" size={18} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>{t('opdVisitsTitle')}</Text>
                <Text style={styles.cardSectionSub}>
                  {opdVisits.length === 0
                    ? t('noOpdVisitsYet')
                    : `${opdVisits.length} recorded visit${opdVisits.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>

            {!patientCase.isTransferredOut && (
              <TouchableOpacity
                style={[styles.updateStatusButton, { backgroundColor: '#0284C7' }]}
                onPress={() =>
                  navigation.navigate('OpdVisits', {
                    preselectedCaseId: patientCase.id,
                    initialVisitType: opdVisits.some((v) => v.followUpStatus === 'PENDING')
                      ? 'Follow-Up'
                      : 'New Consultation',
                    autoOpenModal: true,
                  })
                }
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.updateStatusButtonText}>
                  {opdVisits.some((v) => v.followUpStatus === 'PENDING')
                    ? t('logFollowUpBtn')
                    : t('logOpdBtn')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Real-time Follow-up Status Alert Banner */}
          {(() => {
            const pending = opdVisits.find((v) => v.followUpStatus === 'PENDING');
            const done = opdVisits.find((v) => v.followUpStatus === 'DONE');

            if (pending) {
              return (
                <View style={styles.opdPendingBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alert-circle" size={18} color="#B45309" />
                    <Text style={styles.opdPendingBannerTitle}>
                      {t('nextFollowUpDue')}: {pending.nextFollowUpTimeline || 'Scheduled'}
                    </Text>
                  </View>
                  <Text style={styles.opdPendingBannerSub}>
                    Marked on {pending.timestampFormatted || pending.date} ({pending.tokenNumber})
                  </Text>
                </View>
              );
            }

            if (done) {
              return (
                <View style={styles.opdDoneBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                    <Text style={styles.opdDoneBannerTitle}>{t('followUpResolved')}</Text>
                  </View>
                  <Text style={styles.opdDoneBannerSub}>
                    Resolved on {done.followUpResolvedAt || done.timestampFormatted || done.date}
                  </Text>
                </View>
              );
            }

            return (
              <View style={styles.opdRoutineBanner}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
                <Text style={styles.opdRoutineBannerText}>
                  {t('routineCare')}
                </Text>
              </View>
            );
          })()}

          {/* List of Visits */}
          <Text style={[styles.timelineHeader, { marginTop: 14 }]}>{t('visitHistory')}</Text>
          {opdVisits.length === 0 ? (
            <View style={styles.opdEmptyBox}>
              <Ionicons name="reader-outline" size={24} color="#94A3B8" />
              <Text style={styles.opdEmptyText}>
                {t('noOpdVisitsYet')}
              </Text>
            </View>
          ) : (
            opdVisits.map((visit, index) => (
              <View
                key={visit.id}
                style={[
                  styles.opdVisitItem,
                  index === opdVisits.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                ]}
              >
                <View style={styles.opdVisitTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.opdTokenBadge}>
                      <Text style={styles.opdTokenText}>{visit.tokenNumber}</Text>
                    </View>
                    <View style={styles.opdTypeBadge}>
                      <Text style={styles.opdTypeText}>
                        {clinicalDataTranslator.translateVisitType(visit.visitType, language)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.opdVisitTime}>
                    {visit.timestampFormatted || `${visit.date}, ${visit.entryTime}`}
                  </Text>
                </View>

                <View style={styles.opdVisitDetailsRow}>
                  <Text style={styles.opdDeptText}>
                    {clinicalDataTranslator.translateOpdDept(visit.department, language)}
                    {visit.consultingDoctor ? ` • ${visit.consultingDoctor}` : ''}
                  </Text>

                  {visit.followUpStatus === 'PENDING' && (
                    <View style={styles.opdFollowUpPendingChip}>
                      <Text style={styles.opdFollowUpPendingChipText}>
                        Due: {visit.nextFollowUpTimeline || 'Pending'}
                      </Text>
                    </View>
                  )}
                  {visit.followUpStatus === 'DONE' && (
                    <View style={styles.opdFollowUpDoneChip}>
                      <Text style={styles.opdFollowUpDoneChipText}>✓ {t('followUpResolved')}</Text>
                    </View>
                  )}
                </View>

                {visit.chiefComplaint ? (
                  <Text style={styles.opdComplaintText} numberOfLines={2}>
                    "{visit.chiefComplaint}"
                  </Text>
                ) : null}

                {/* Attached Prescription Document */}
                {visit.prescriptionDoc && (
                  <View style={styles.opdPrescriptionRow}>
                    <View style={styles.opdPrescriptionLeft}>
                      <Ionicons name="document-attach" size={14} color="#059669" />
                      <Text style={styles.opdPrescriptionName} numberOfLines={1}>
                        {visit.prescriptionDoc.name}
                      </Text>
                      <View style={styles.opdPrescriptionSourceBadge}>
                        <Ionicons
                          name={visit.prescriptionDoc.source === 'camera' ? 'camera' : 'phone-portrait'}
                          size={9}
                          color="#475569"
                        />
                        <Text style={styles.opdPrescriptionSourceText}>
                          {visit.prescriptionDoc.source === 'camera' ? 'Camera' : 'Device'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.opdPrescriptionViewBtn}
                      onPress={async () => {
                        const targetDoc = visit.prescriptionDoc;
                        const url = targetDoc?.url || targetDoc?.file_url || targetDoc?.fileUrl || targetDoc?.uri;
                        const isPdf =
                          targetDoc?.name?.toLowerCase().endsWith('.pdf') ||
                          targetDoc?.type?.includes('pdf') ||
                          (typeof url === 'string' && url.toLowerCase().includes('.pdf'));

                        if (isPdf && url && (url.startsWith('http://') || url.startsWith('https://'))) {
                          try {
                            await Linking.openURL(url);
                            return;
                          } catch (_) {
                            // Fallback to modal if external handler fails
                          }
                        }
                        setPreviewPrescription(visit.prescriptionDoc || null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={12} color="#059669" />
                      <Text style={styles.opdPrescriptionViewText}>{t('btnViewPrescription')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* ============================================================ */}
        {/* ADMIN REQUESTED DOCUMENTS (WITH DIRECT CAMERA & FILE UPLOAD) */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionTitle}>{t('requestedDocsSectionTitle')}</Text>
                <Text style={styles.cardSectionSub}>
                  {patientCase.requestedDocuments.length === 0
                    ? (language === 'mr' ? 'कोणतीही प्रलंबित कागदपत्रे नाहीत' : language === 'hi' ? 'कोई लंबित दस्तावेज़ नहीं' : 'No pending document requests')
                    : pendingDocsCount > 0
                    ? `⚠️ ${pendingDocsCount} ${t('pendingDocsTag')}`
                    : `✓ ${t('uploadedStatusBadge')}`}
                </Text>
              </View>
            </View>
          </View>

          {patientCase.requestedDocuments.length === 0 ? (
            <Text style={styles.emptyNotice}>{t('noDocRequestsPending')}</Text>
          ) : (
            patientCase.requestedDocuments.map((req: RequestedDocument) => {
              const isUploaded = req.status === 'uploaded';
              const stagedDoc = stagedDocs[req.id];
              const isStaged = !isUploaded && !!stagedDoc;

              return (
                <View
                  key={req.id}
                  style={[
                    styles.reqDocItem,
                    isUploaded
                      ? styles.reqDocUploaded
                      : isStaged
                      ? styles.reqDocStaged
                      : styles.reqDocPending,
                  ]}
                >
                  <View style={styles.reqDocTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.reqDocTitle}>
                        {clinicalDataTranslator.translateDocumentTitle(req.title, language)}{' '}
                        {req.isRequired && <Text style={{ color: '#DC2626' }}>*</Text>}
                      </Text>
                      <Text style={styles.reqDocDesc}>{req.description}</Text>
                    </View>

                    {/* Status Tag */}
                    <View
                      style={[
                        styles.reqStatusTag,
                        isUploaded
                          ? styles.reqStatusUploaded
                          : isStaged
                          ? styles.reqStatusStaged
                          : styles.reqStatusPending,
                      ]}
                    >
                      <Ionicons
                        name={
                          isUploaded
                            ? 'checkmark-circle'
                            : isStaged
                            ? 'document-attach'
                            : 'time'
                        }
                        size={12}
                        color={
                          isUploaded
                            ? '#15803D'
                            : isStaged
                            ? '#0284C7'
                            : '#D97706'
                        }
                      />
                      <Text
                        style={[
                          styles.reqStatusTagText,
                          {
                            color: isUploaded
                              ? '#15803D'
                              : isStaged
                              ? '#0284C7'
                              : '#B45309',
                          },
                        ]}
                      >
                        {isUploaded
                          ? t('uploadedStatusBadge')
                          : isStaged
                          ? t('stagedStatusBadge')
                          : t('pendingDocsTag')}
                      </Text>
                    </View>
                  </View>

                  {/* -------------------------------------------------- */}
                  {/* CASE 1: ALREADY UPLOADED -> SUMMARY + DISABLED RETAKE */}
                  {/* -------------------------------------------------- */}
                  {isUploaded && req.uploadedDoc && (
                    <>
                      <View style={styles.uploadedFileBadge}>
                        <Ionicons name="attach" size={16} color="#059669" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.uploadedFileName} numberOfLines={1}>
                            {req.uploadedDoc.name}
                          </Text>
                          <Text style={styles.uploadedFileMeta}>
                            {req.uploadedDoc.size} • {req.uploadedDoc.timestamp}
                          </Text>
                        </View>
                        <View style={styles.uploadedCheckCircle}>
                          <Ionicons name="checkmark" size={13} color="#15803D" />
                        </View>
                      </View>

                      {/* Retake and Replace are DISABLED after submit */}
                      <View style={styles.actionBtnRow}>
                        <View style={[styles.cameraBtn, styles.disabledActionBtn]}>
                          <Ionicons name="camera" size={16} color="#94A3B8" />
                          <Text style={styles.disabledActionBtnText}>{t('retakePhoto')}</Text>
                        </View>
                        <View style={[styles.deviceBtn, styles.disabledActionBtn]}>
                          <Ionicons name="folder-open-outline" size={16} color="#94A3B8" />
                          <Text style={styles.disabledActionBtnText}>{t('replaceFile')}</Text>
                        </View>
                      </View>

                      <View style={styles.lockedNoticeRow}>
                        <Ionicons name="lock-closed" size={12} color="#15803D" />
                        <Text style={styles.lockedNoticeText}>{t('retakeDisabledNotice')}</Text>
                      </View>
                    </>
                  )}

                  {/* -------------------------------------------------- */}
                  {/* CASE 2: FILE STAGED -> PREVIEW + RETAKE/REPLACE + SUBMIT */}
                  {/* -------------------------------------------------- */}
                  {isStaged && stagedDoc && (
                    <>
                      <View style={styles.stagedFileBadge}>
                        {stagedDoc.type.startsWith('image') && stagedDoc.uri ? (
                          <Image
                            source={{ uri: stagedDoc.uri }}
                            style={styles.stagedThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.stagedThumbnailFallback}>
                            <Ionicons name="document-text" size={20} color="#0284C7" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stagedFileName} numberOfLines={1}>
                            {stagedDoc.name}
                          </Text>
                          <Text style={styles.stagedFileMeta}>
                            {stagedDoc.size} • {stagedDoc.timestamp}
                          </Text>
                          <Text style={styles.stagedFileBadgeSub}>
                            📝 {t('draftSavedNotice')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.discardDraftBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => handleDiscardStagedDoc(req.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>

                      {/* Active Retake and Replace Buttons */}
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.cameraBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickRequestedDoc(req.id, 'camera')}
                        >
                          <Ionicons name="camera" size={16} color="#0284C7" />
                          <Text style={styles.cameraBtnText}>{t('retakePhoto')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deviceBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickRequestedDoc(req.id, 'device')}
                        >
                          <Ionicons name="folder-open-outline" size={16} color="#475569" />
                          <Text style={styles.deviceBtnText}>{t('replaceFile')}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Upload / Submit Document Button */}
                      <TouchableOpacity
                        style={styles.submitDocBtn}
                        activeOpacity={0.8}
                        onPress={() => handleSubmitRequestedDoc(req.id)}
                        disabled={submittingDocId === req.id}
                      >
                        {submittingDocId === req.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                            <Text style={styles.submitDocBtnText}>{t('uploadAndSubmitDoc')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {/* -------------------------------------------------- */}
                  {/* CASE 3: PENDING -> INITIAL TAKE PHOTO / CHOOSE FILE */}
                  {/* -------------------------------------------------- */}
                  {!isUploaded && !isStaged && (
                    patientCase.isTransferredOut ? (
                      <View style={styles.transferredReqDocNotice}>
                        <Ionicons name="lock-closed" size={12} color="#6D28D9" />
                        <Text style={styles.transferredReqDocNoticeText}>
                          {t('transferredDocUploadNotice')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.cameraBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickRequestedDoc(req.id, 'camera')}
                        >
                          <Ionicons name="camera" size={16} color="#0284C7" />
                          <Text style={styles.cameraBtnText}>{t('takePhotoCamera')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deviceBtn}
                          activeOpacity={0.8}
                          onPress={() => handlePickRequestedDoc(req.id, 'device')}
                        >
                          <Ionicons name="folder-open-outline" size={16} color="#475569" />
                          <Text style={styles.deviceBtnText}>{t('chooseFromFiles')}</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ============================================================ */}
        {/* ADDITIONAL MEDICAL DOCUMENTS (UPLOAD EXTRA RECORDS TO ADMIN) */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="cloud-upload" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionTitle}>{t('additionalMedicalDocsTitle')}</Text>
                <Text style={styles.cardSectionSub}>
                  {t('additionalMedicalDocsSub')}
                </Text>
              </View>
            </View>
          </View>

          {/* List of already uploaded additional docs */}
          {patientCase.additionalMedicalDocs.length > 0 ? (
            patientCase.additionalMedicalDocs.map((doc: any) => (
              <View key={doc.id} style={styles.additionalDocItem}>
                <View style={styles.additionalDocIcon}>
                  <Ionicons name="document-attach" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.additionalDocTitle}>{doc.title}</Text>
                  <Text style={styles.additionalDocName} numberOfLines={1}>
                    {doc.fileName} ({doc.fileSize})
                  </Text>
                  <Text style={styles.additionalDocDate}>
                    {t('uploadedStatusBadge')} {doc.uploadedAt} • {doc.uploadedBy}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNotice}>
              {t('noAdditionalDocsYet')}
            </Text>
          )}

          {/* Upload Button */}
          {!patientCase.isTransferredOut && (
            <TouchableOpacity
              style={styles.addDocButton}
              activeOpacity={0.8}
              onPress={() => setAddDocModalVisible(true)}
            >
              <Ionicons name="add-circle" size={18} color="#7C3AED" />
              <Text style={styles.addDocButtonText}>
                {t('attachDocBtnText')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: UPDATE TREATMENT STATUS */}
      {/* ============================================================ */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '100%' }}
          >
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('modalUpdateTitle')}</Text>
                  <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSub}>
                  {t('selectCurrentStagePrompt')} {patientCase.patientName}:
                </Text>

                <View style={styles.statusChipsContainer}>
                  {ALL_TREATMENT_STATUSES.map((status) => {
                    const isSelected = selectedStatus === status;
                    const translated = clinicalDataTranslator.translateTreatmentStatus(status, language);
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusModalChip,
                          isSelected && styles.statusModalChipSelected,
                        ]}
                        onPress={() => setSelectedStatus(status)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? '#FFFFFF' : '#64748B'}
                        />
                        <View>
                          <Text
                            style={[
                              styles.statusModalChipText,
                              isSelected && styles.statusModalChipTextSelected,
                            ]}
                          >
                            {translated}
                          </Text>
                          {language !== 'en' && translated !== status && (
                            <Text
                              style={[
                                styles.statusModalChipSub,
                                isSelected && styles.statusModalChipSubSelected,
                              ]}
                            >
                              {status}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  {t('clinicalProgressNoteLabel')}
                </Text>
                <TextInput
                  style={styles.statusNoteInput}
                  multiline
                  numberOfLines={3}
                  placeholder={t('clinicalProgressNotePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={statusNote}
                  onChangeText={handleStatusNoteChange}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setStatusModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleSubmitStatusUpdate}
                    disabled={updatingStatus}
                  >
                    <Text style={styles.modalConfirmText}>
                      {updatingStatus ? '...' : t('saveStatusBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: UPLOAD ADDITIONAL MEDICAL DOCUMENT */}
      {/* ============================================================ */}
      <Modal
        visible={addDocModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('uploadMedicalDocModalTitle')}</Text>
              <TouchableOpacity onPress={() => setAddDocModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {t('uploadMedicalDocModalSub')}
            </Text>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('docTitleAndDescLabel')} *</Text>
            <TextInput
              style={styles.docTitleInput}
              placeholder={t('docTitlePlaceholder')}
              placeholderTextColor="#94A3B8"
              value={addDocTitle}
              onChangeText={handleAddDocTitleChange}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>{t('selectDocSourceLabel')}</Text>
            <View style={styles.sourceButtonsRow}>
              <TouchableOpacity
                style={styles.sourceChoiceBtn}
                onPress={() => handleUploadAdditionalDoc('camera')}
                disabled={uploadingDoc}
              >
                <View style={[styles.sourceIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="camera" size={24} color="#0284C7" />
                </View>
                <Text style={styles.sourceChoiceTitle}>{t('takePhotoFromCamera')}</Text>
                <Text style={styles.sourceChoiceSub}>{t('fromCameraSub')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sourceChoiceBtn}
                onPress={() => handleUploadAdditionalDoc('device')}
                disabled={uploadingDoc}
              >
                <View style={[styles.sourceIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="document-attach" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.sourceChoiceTitle}>{t('browseFiles')}</Text>
                <Text style={styles.sourceChoiceSub}>{t('pdfJpgPng')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 16 }]}
              onPress={() => setAddDocModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: QUICK ADMIN ESCALATION */}
      {/* ============================================================ */}
      <CaseAdminEscalationModal
        visible={escalateModalVisible}
        patientCase={patientCase}
        onClose={() => setEscalateModalVisible(false)}
        onSuccess={(updated) => {
          setPatientCase(updated);
          setSelectedStatus(updated.treatmentStatus);
        }}
      />

      {/* ============================================================ */}
      {/* MODAL: OPD PRESCRIPTION PREVIEW */}
      {/* ============================================================ */}
      <Modal
        visible={!!previewPrescription}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewPrescription(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewPrescription?.name || 'Prescription Document'}
                </Text>
                <Text style={styles.previewSub}>
                  {previewPrescription?.source === 'camera' ? 'Camera Photo' : 'Device File'}{' '}
                  {previewPrescription?.size ? `• ${previewPrescription.size}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewPrescription(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {previewPrescription?.uri &&
            !previewPrescription.type?.includes('pdf') &&
            !previewPrescription.name?.toLowerCase().endsWith('.pdf') ? (
              <View style={styles.previewImageWrap}>
                <Image
                  source={{ uri: previewPrescription.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.previewDocPlaceholder}>
                <View style={styles.pdfDocEmblemBadge}>
                  <Ionicons name="document-text" size={44} color="#DC2626" />
                </View>
                <Text style={styles.previewDocName} numberOfLines={2}>
                  {previewPrescription?.name || 'Prescription Document'}
                </Text>
                <Text style={styles.previewDocSub}>
                  {previewPrescription?.size ? `${previewPrescription.size} • ` : ''}PDF Document attached to OPD log
                </Text>

                {/* Direct Action to Open and View the Real PDF */}
                <TouchableOpacity
                  style={styles.previewOpenPdfBtn}
                  activeOpacity={0.85}
                  onPress={async () => {
                    const target =
                      previewPrescription?.url ||
                      previewPrescription?.file_url ||
                      previewPrescription?.fileUrl ||
                      previewPrescription?.uri;
                    if (target) {
                      try {
                        await Linking.openURL(target);
                      } catch (err: any) {
                        Alert.alert(
                          'PDF Viewer',
                          'Opening PDF in system document reader: ' + (err?.message || 'Please check device viewers.')
                        );
                      }
                    } else {
                      Alert.alert('Notice', 'No file URL available to open');
                    }
                  }}
                >
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.previewOpenPdfBtnText}>
                    📄 Open & View Full PDF / संपूर्ण PDF पहा
                  </Text>
                </TouchableOpacity>

                {Boolean(
                  previewPrescription?.uri?.startsWith('http://') ||
                  previewPrescription?.uri?.startsWith('https://') ||
                  previewPrescription?.file_url
                ) && (
                  <Text style={styles.previewS3DirectLink} numberOfLines={1}>
                    S3 Link: {previewPrescription?.file_url || previewPrescription?.uri}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewPrescription(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.previewCloseBtnText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: CONFIRM PATIENT DISPATCHED / MOVED (HANDOVER) */}
      {/* ============================================================ */}
      <Modal
        visible={patientMovedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPatientMovedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '100%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="car" size={20} color="#7C3AED" />
                  <Text style={styles.modalTitle}>{t('handoverModalTitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => setPatientMovedModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                {t('handoverModalSub')} {patientCase.patientName} → {patientCase.assignedToNewHospital || t('newAssignedHospital')}
              </Text>

              {patientCase.assignedToNewSevak && (
                <View style={styles.modalSevakInfoBox}>
                  <Ionicons name="person-circle" size={20} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSevakInfoName}>
                      {t('receivingSevakLabel')}: {patientCase.assignedToNewSevak.name}
                    </Text>
                    {patientCase.assignedToNewSevak.phone && (
                      <Text style={styles.modalSevakInfoPhone}>
                        {t('contactLabel')}: {patientCase.assignedToNewSevak.phone}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                {t('ambulanceRemarksLabel')}
              </Text>
              <TextInput
                style={styles.statusNoteInput}
                multiline
                numberOfLines={3}
                placeholder={t('ambulanceRemarksPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={patientMovedRemark}
                onChangeText={setPatientMovedRemark}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setPatientMovedModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#7C3AED' }]}
                  onPress={handleConfirmPatientMoved}
                  disabled={savingPatientMoved}
                >
                  {savingPatientMoved ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {t('confirmMovedBtnText')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: CONFIRM PATIENT ARRIVAL & ADMIT HERE (INTAKE) */}
      {/* ============================================================ */}
      <Modal
        visible={patientAdmitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPatientAdmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '100%' }}
          >
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-done-circle" size={22} color="#15803D" />
                    <Text style={styles.modalTitle}>{t('intakeModalTitle')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPatientAdmitModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSub}>
                  {t('intakeModalSub')} ({patientCase.patientName})
                </Text>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('assignedWardLabel')} *</Text>
                <TextInput
                  style={styles.docTitleInput}
                  placeholder={t('assignedWardPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={admitWard}
                  onChangeText={setAdmitWard}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('bedNumberLabel')} *</Text>
                <TextInput
                  style={styles.docTitleInput}
                  placeholder={t('bedNumberPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={admitBed}
                  onChangeText={setAdmitBed}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('treatingDoctorLabel')}</Text>
                <TextInput
                  style={styles.docTitleInput}
                  placeholder={t('treatingDoctorPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={admitDoctor}
                  onChangeText={setAdmitDoctor}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('intakeNoteLabel')}</Text>
                <TextInput
                  style={styles.statusNoteInput}
                  multiline
                  numberOfLines={2}
                  placeholder={t('intakeNotePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={admitNote}
                  onChangeText={setAdmitNote}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setPatientAdmitModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: '#15803D' }]}
                    onPress={handleConfirmPatientAdmitted}
                    disabled={savingPatientAdmit}
                  >
                    {savingPatientAdmit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>
                        📥 दाखल करा व सुरू करा (Admit)
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
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
    marginTop: 1,
    fontWeight: '500',
  },
  schemeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  schemeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  headerActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerEscalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerEscalateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickEscalateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#DC2626',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  quickEscalateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickEscalateIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickEscalateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  quickEscalateSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  escalationCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  escalationCardPending: {
    backgroundColor: '#FFFBFB',
    borderColor: '#FCA5A5',
  },
  escalationCardResolved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  escalationCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  escalationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 140,
  },
  escalationTypeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  escalationStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  escalationStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  escalationStatusPillResolved: {
    backgroundColor: '#DCFCE7',
  },
  escalationStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  holdBannerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  holdBannerAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    flex: 1,
  },
  escalationInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  escalationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  escalationInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  escalationInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  escalationSevakNote: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  escalationDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  escalationDocName: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  escalationMetaDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
  },
  adminResolvedContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  adminResolvedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminResolvedTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  adminDecisionPillText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  adminResponseNoteText: {
    fontSize: 13,
    color: '#0F172A',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 6,
  },
  adminResolvedMetaText: {
    fontSize: 10,
    color: '#64748B',
  },
  escalationFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  simulateAdminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  simulateAdminActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  reEscalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  reEscalateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 14,
  },

  // Priority Note Banner
  adminNoteCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  adminNoteCardCritical: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  adminNoteCardHigh: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noteTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 6,
  },

  notePillTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  noteDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  noteTextContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 10,
  },
  noteAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  noteAuthorText: {
    fontSize: 11,
    color: '#475569',
  },

  // General Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  patientMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  patientName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientDemographics: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  abhaIdText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  callActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callPatientBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  callRelativeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  callBtnIconWrapBlue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnIconWrapGreen: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  callBtnPhone: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailItemFull: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Section Headers
  cardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  updateStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateStatusButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Treatment Status & Timeline
  currentStatusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  statusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusPillActiveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  statusHospitalText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  timelineHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineLeftTrack: {
    width: 22,
    alignItems: 'center',
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
    marginTop: 4,
  },
  timelineNodeLatest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  timelineBar: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  timelineTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  latestStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  latestStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  timelineTimestamp: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  timelineNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  timelineNoteBoxLatest: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderLeftColor: '#16A34A',
  },
  timelineNote: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  timelineBy: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Requested Docs
  emptyNotice: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  reqDocItem: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  reqDocPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  reqDocUploaded: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  reqDocStaged: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  reqDocTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reqDocTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  reqDocDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  reqStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reqStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  reqStatusUploaded: {
    backgroundColor: '#DCFCE7',
  },
  reqStatusStaged: {
    backgroundColor: '#E0F2FE',
  },
  reqStatusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  uploadedFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  uploadedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  uploadedFileMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  deviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 8,
  },
  deviceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stagedFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 8,
  },
  stagedThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  stagedThumbnailFallback: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  stagedFileMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  stagedFileBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  discardDraftBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
    elevation: 1,
  },
  submitDocBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledActionBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  disabledActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  lockedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  lockedNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },

  // Additional Docs
  additionalDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  additionalDocIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalDocTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  additionalDocName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  additionalDocDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  sentToAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sentToAdminText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  addDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  addDocButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusModalChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  statusModalChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  statusModalChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusModalChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  statusModalChipSubSelected: {
    color: '#E0F2FE',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  statusNoteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docTitleInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  sourceButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  sourceChoiceBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sourceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sourceChoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  sourceChoiceSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // OPD Visits & Follow-Up Card Styles
  opdPendingBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
    marginBottom: 4,
  },
  opdPendingBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  opdPendingBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    marginLeft: 26,
  },
  opdDoneBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 6,
    marginBottom: 4,
  },
  opdDoneBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  opdDoneBannerSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    marginLeft: 26,
  },
  opdRoutineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 4,
  },
  opdRoutineBannerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  opdEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
    marginTop: 4,
  },
  opdEmptyText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: '85%',
  },
  opdVisitItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  opdVisitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opdTokenBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  opdTokenText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  opdTypeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  opdTypeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
  },
  opdVisitTime: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  opdVisitDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  opdDeptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  opdFollowUpPendingChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  opdFollowUpPendingChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  opdFollowUpDoneChip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  opdFollowUpDoneChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  opdComplaintText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 4,
  },
  opdPrescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  opdPrescriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  opdPrescriptionName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  opdPrescriptionSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  opdPrescriptionSourceText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#15803D',
  },
  opdPrescriptionViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  opdPrescriptionViewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewImageWrap: {
    width: '100%',
    height: 320,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewDocPlaceholder: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pdfDocEmblemBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  previewDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
  },
  previewDocSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  previewOpenPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    width: '100%',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  previewOpenPdfBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  previewS3DirectLink: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewCloseBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  previewCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reassignedInfoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderLeftWidth: 5,
    borderLeftColor: '#7C3AED',
  },
  reassignedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  reassignedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reassignedTagPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  reassignedPriorityPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reassignedPriorityPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  reassignedDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  reassignedDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  reassignedDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  prevSevakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  prevSevakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prevSevakTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prevSevakName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  callPrevSevakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callPrevSevakBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  prevSevakPhoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    marginLeft: 32,
  },

  // Transferred Out Styles
  transferredOutCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderLeftWidth: 5,
    borderLeftColor: '#7C3AED',
  },
  transferredOutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  transferredTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transferredTagPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  transferredStatusBadgePill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  transferredStatusBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },
  newSevakContactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  transferredLockNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  transferredLockNoticeText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  patientMovedActionArea: {
    marginTop: 12,
  },
  patientMovedDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  patientMovedDoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  patientMovedDoneSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  confirmMovedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  confirmMovedActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  patientAdmitActionArea: {
    marginTop: 12,
  },
  patientAdmitDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  patientAdmitDoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  patientAdmitDoneSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  patientIntakePendingBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  patientIntakePendingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  patientIntakePendingSub: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  confirmAdmitActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#15803D',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  confirmAdmitActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  lockedSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  lockedSectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  transferredReqDocNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  transferredReqDocNoticeText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
    flex: 1,
  },
  modalSevakInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  modalSevakInfoName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C1D95',
  },
  modalSevakInfoPhone: {
    fontSize: 11,
    color: '#6D28D9',
    marginTop: 2,
  },
});

