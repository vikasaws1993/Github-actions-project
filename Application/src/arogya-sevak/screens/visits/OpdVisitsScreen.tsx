import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
  ScrollView,
  Linking,
  Platform,
  PermissionsAndroid,
  Image,
  KeyboardAvoidingView,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { launchCamera } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { useAuth } from '../../../shared/hooks/useAuth';
import { sevakOpdService } from '../../services/sevakOpdService';
import { sevakHospitalService, AllocatedPatientCase } from '../../services/sevakHospitalService';
import { sevakDraftService, OpdVisitModalDraft } from '../../services/sevakDraftService';
import {
  OpdVisitEntry,
  OpdStats,
  OpdDepartment,
  OpdVisitType,
  OpdSchemeEligibility,
  OpdPrescriptionDoc,
} from '../../types/sevakOpd.types';

type FilterTab = 'ALL' | 'FOLLOW_UP_REQUIRED' | 'FOLLOW_UP_DONE' | 'TODAY';

const ALL_DEPARTMENTS: OpdDepartment[] = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'General Surgery',
  'ENT',
  'Ophthalmology',
  'Emergency & Trauma',
];

const ALL_VISIT_TYPES: OpdVisitType[] = [
  'New Consultation',
  'Follow-Up',
  'Scheme Verification',
  'Diagnostic / Lab Test',
  'Emergency Triage',
];

const FOLLOW_UP_TIMELINES = [
  'In 3 Days',
  'In 7 Days',
  'In 15 Days',
  'In 1 Month',
];

const DEFAULT_ALLOCATED_CASES: AllocatedPatientCase[] = [];

export const OpdVisitsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [visits, setVisits] = useState<OpdVisitEntry[]>([]);
  const [stats, setStats] = useState<OpdStats>({
    totalVisits: 0,
    todayCount: 0,
    followUpRequiredCount: 0,
    followUpDoneCount: 0,
  });
  const [allocatedCases, setAllocatedCases] = useState<AllocatedPatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // New OPD Modal State
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<AllocatedPatientCase | null>(null);
  const [selectedDept, setSelectedDept] = useState<OpdDepartment>('General Medicine');
  const [consultingDoctor, setConsultingDoctor] = useState('');
  const [visitType, setVisitType] = useState<OpdVisitType>('Follow-Up');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [nextFollowUpRequired, setNextFollowUpRequired] = useState(false);
  const [nextFollowUpTimeline, setNextFollowUpTimeline] = useState('In 7 Days');
  const [saving, setSaving] = useState(false);
  const [hasOpdDraft, setHasOpdDraft] = useState(false);
  const [prescriptionDoc, setPrescriptionDoc] = useState<OpdPrescriptionDoc | null>(null);
  const [previewPrescription, setPreviewPrescription] = useState<OpdPrescriptionDoc | null>(null);

  const effectiveCases = useMemo(() => {
    return allocatedCases;
  }, [allocatedCases]);

  const isFormValid = useMemo(() => {
    return Boolean(selectedCase && selectedDept && visitType);
  }, [selectedCase, selectedDept, visitType]);

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (newModalVisible) {
        if (!saving) {
          setNewModalVisible(false);
        }
        return true;
      }
      if (previewPrescription) {
        setPreviewPrescription(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [newModalVisible, previewPrescription, saving]);

  const loadOpdDraft = async (): Promise<boolean> => {
    try {
      const draft = await sevakDraftService.loadDraft<OpdVisitModalDraft>(
        sevakDraftService.keys.opdVisitModal()
      );
      if (draft) {
        if (draft.caseId && effectiveCases.length > 0) {
          const found = effectiveCases.find((c) => c.id === draft.caseId);
          if (found) setSelectedCase(found);
        }
        if (draft.selectedDept) setSelectedDept(draft.selectedDept as OpdDepartment);
        if (draft.consultingDoctor !== undefined) setConsultingDoctor(draft.consultingDoctor);
        if (draft.visitType) setVisitType(draft.visitType as OpdVisitType);
        if (draft.nextFollowUpRequired !== undefined) setNextFollowUpRequired(draft.nextFollowUpRequired);
        if (draft.nextFollowUpTimeline) setNextFollowUpTimeline(draft.nextFollowUpTimeline);
        setHasOpdDraft(true);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load OPD draft', e);
    }
    setHasOpdDraft(false);
    return false;
  };

  const persistOpdDraft = (overrides?: Partial<OpdVisitModalDraft>) => {
    const draft: OpdVisitModalDraft = {
      caseId: overrides?.caseId !== undefined ? overrides.caseId : selectedCase?.id,
      selectedDept: overrides?.selectedDept !== undefined ? overrides.selectedDept : selectedDept,
      consultingDoctor: overrides?.consultingDoctor !== undefined ? overrides.consultingDoctor : consultingDoctor,
      visitType: overrides?.visitType !== undefined ? overrides.visitType : visitType,
      nextFollowUpRequired: overrides?.nextFollowUpRequired !== undefined ? overrides.nextFollowUpRequired : nextFollowUpRequired,
      nextFollowUpTimeline: overrides?.nextFollowUpTimeline !== undefined ? overrides.nextFollowUpTimeline : nextFollowUpTimeline,
    };

    sevakDraftService.saveDraft<OpdVisitModalDraft>(sevakDraftService.keys.opdVisitModal(), draft);
    setHasOpdDraft(true);
  };

  const handleDiscardOpdDraft = async () => {
    await sevakDraftService.clearDraft(sevakDraftService.keys.opdVisitModal());
    setHasOpdDraft(false);
    setConsultingDoctor('');
    setChiefComplaint('');
    setNextFollowUpRequired(false);
    setNextFollowUpTimeline('In 7 Days');
    setVisitType('Follow-Up');
    if (effectiveCases.length > 0) {
      handleSelectAllocatedCase(effectiveCases[0], false);
    }
  };

  const loadData = async () => {
    try {
      const [allVisits, currentStats, myCases] = await Promise.all([
        sevakOpdService.getAllOpdVisits(),
        sevakOpdService.getOpdStats(),
        sevakHospitalService.getAllocatedCases(),
      ]);
      setVisits(allVisits);
      setStats(currentStats);
      if (myCases && myCases.length > 0) {
        setAllocatedCases(myCases);
      } else {
        setAllocatedCases(DEFAULT_ALLOCATED_CASES);
      }
    } catch (e) {
      console.warn('Failed to load OPD visits', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Handle incoming route params (e.g. from PatientCaseDetailsScreen)
  useEffect(() => {
    if (route.params?.preselectedCaseId && effectiveCases.length > 0) {
      const targetCase = effectiveCases.find((c) => c.id === route.params.preselectedCaseId);
      if (targetCase) {
        setSelectedCase(targetCase);
        const diag = (targetCase.diagnosis || '').toLowerCase();
        if (diag.includes('heart') || diag.includes('coronary') || diag.includes('cardiac')) {
          setSelectedDept('Cardiology');
        } else if (diag.includes('fracture') || diag.includes('femur') || diag.includes('ortho')) {
          setSelectedDept('Orthopedics');
        } else if (diag.includes('pregnan') || diag.includes('lscs') || diag.includes('maternity')) {
          setSelectedDept('Obstetrics & Gynecology');
        }
      }
      if (route.params.initialVisitType) {
        setVisitType(route.params.initialVisitType);
      }
      if (route.params.autoOpenModal) {
        setNewModalVisible(true);
      }
    }
  }, [route.params, effectiveCases]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter and search
  const filteredVisits = visits.filter((v) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (v.patientName || '').toLowerCase().includes(q) ||
      (v.caseId || '').toLowerCase().includes(q) ||
      (v.tokenNumber || '').toLowerCase().includes(q) ||
      (v.contactPhone || '').includes(q) ||
      (v.department || '').toLowerCase().includes(q) ||
      (v.consultingDoctor && v.consultingDoctor.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'FOLLOW_UP_REQUIRED') {
      return v.followUpStatus === 'PENDING';
    }
    if (activeTab === 'FOLLOW_UP_DONE') {
      return v.followUpStatus === 'DONE';
    }
    if (activeTab === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      return v.date === today;
    }
    return true;
  });

  const handleCall = (phone: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Unable to Call', `Could not open dialer for ${phone}`);
    });
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Camera permission is required to photograph the prescription.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (e) {
        console.warn('Camera permission request error', e);
        return false;
      }
    }
    return true;
  };

  const handleCapturePrescriptionCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          t('cameraPermissionDenied') || 'Camera permission is required to capture prescription.'
        );
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newDoc: OpdPrescriptionDoc = {
        id: `rx-${Date.now()}`,
        name: asset.fileName || `Prescription_${Date.now()}.jpg`,
        uri: asset.uri || '',
        type: asset.type || 'image/jpeg',
        size: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : undefined,
        source: 'camera',
        uploadedAt: timeStr,
      };

      setPrescriptionDoc(newDoc);
    } catch (e) {
      console.warn('Camera launch error', e);
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handlePickPrescriptionDevice = async () => {
    try {
      const res = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: false,
      });

      if (!res || res.length === 0) {
        return;
      }

      const file = res[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newDoc: OpdPrescriptionDoc = {
        id: `rx-${Date.now()}`,
        name: file.name || `Prescription_${Date.now()}`,
        uri: file.uri,
        type: file.type || 'application/pdf',
        size: file.size ? `${Math.round(file.size / 1024)} KB` : undefined,
        source: 'device',
        uploadedAt: timeStr,
      };

      setPrescriptionDoc(newDoc);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.warn('File pick error', err);
      Alert.alert('Selection Error', 'Could not select file from device.');
    }
  };

  const handleRemovePrescription = () => {
    setPrescriptionDoc(null);
  };

  const handleOpenLogModal = (preselectedCase?: AllocatedPatientCase) => {
    try {
      setCaseSearchQuery('');
      setPrescriptionDoc(null);

      if (preselectedCase) {
        handleSelectAllocatedCase(preselectedCase, false);
      } else if (!selectedCase && effectiveCases.length > 0) {
        handleSelectAllocatedCase(effectiveCases[0], false);
      }
    } catch (err) {
      console.warn('Error preparing OPD modal case', err);
    } finally {
      setNewModalVisible(true);
      loadOpdDraft();
    }
  };

  const handleSelectAllocatedCase = (c: AllocatedPatientCase, shouldPersist: boolean = true) => {
    if (!c) return;
    setSelectedCase(c);

    let detectedDept: OpdDepartment = 'General Medicine';
    const diag = (c.diagnosis || '').toLowerCase();
    if (diag.includes('coronary') || diag.includes('heart') || diag.includes('cardiac')) {
      detectedDept = 'Cardiology';
    } else if (diag.includes('fracture') || diag.includes('ortho') || diag.includes('joint') || diag.includes('femur')) {
      detectedDept = 'Orthopedics';
    } else if (diag.includes('pregnan') || diag.includes('lscs') || diag.includes('maternity')) {
      detectedDept = 'Obstetrics & Gynecology';
    }
    setSelectedDept(detectedDept);

    if (shouldPersist && c.id) {
      persistOpdDraft({ caseId: c.id, selectedDept: detectedDept });
    }
  };

  const handleResolveFollowUp = async (visit: OpdVisitEntry) => {
    Alert.alert(
      'Resolve Follow-Up',
      `Mark follow-up completed for ${visit.patientName} (${visit.tokenNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          onPress: async () => {
            const success = await sevakOpdService.resolveFollowUp(visit.id);
            if (success) {
              loadData();
            }
          },
        },
      ]
    );
  };

  const handleSaveNewOpd = async () => {
    const targetCase = selectedCase || (effectiveCases.length > 0 ? effectiveCases[0] : null);

    if (!targetCase) {
      Alert.alert('Selection Required', 'Please select an allocated patient case.');
      return;
    }

    setSaving(true);
    try {
      const schemeNameStr = targetCase.schemeName || '';
      const schemeElig: OpdSchemeEligibility = schemeNameStr.includes('PM-JAY')
        ? 'PM-JAY Eligible'
        : 'MJPJAY Eligible';

      await sevakOpdService.logNewOpdVisit({
        caseId: targetCase.id || `CAS-${Date.now()}`,
        patientName: targetCase.patientName || 'Unknown Patient',
        age: targetCase.age || 40,
        gender: targetCase.gender || 'Other',
        contactPhone: targetCase.contactPhone || '+91 98000 00000',
        abhaId: targetCase.abhaId,
        department: selectedDept,
        consultingDoctor: consultingDoctor.trim() || undefined,
        visitType: visitType,
        schemeEligibility: schemeElig,
        chiefComplaint: chiefComplaint.trim() || targetCase.diagnosis || 'Routine Outpatient Consultation',
        nextFollowUpRequired: nextFollowUpRequired,
        nextFollowUpTimeline: nextFollowUpRequired ? nextFollowUpTimeline : undefined,
        recordedBy: user?.name || 'Arogya Sevak',
        prescriptionDoc: prescriptionDoc || undefined,
      });

      // Clear draft on successful submission
      await sevakDraftService.clearDraft(sevakDraftService.keys.opdVisitModal());
      setHasOpdDraft(false);
      setPrescriptionDoc(null);
      setChiefComplaint('');

      setNewModalVisible(false);
      loadData();

      const followUpMsg = nextFollowUpRequired
        ? `\nFollow-up scheduled for: ${nextFollowUpTimeline}`
        : '';
      const resolvedMsg = visitType === 'Follow-Up'
        ? '\nPrevious pending follow-up marked as COMPLETED.'
        : '';

      Alert.alert(
        'OPD Visit Recorded',
        `Token issued for ${targetCase.patientName} (${targetCase.id}).${followUpMsg}${resolvedMsg}`
      );
    } catch {
      Alert.alert('Error', 'Failed to log OPD visit.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered allocated cases inside modal for high case counts
  const filteredModalCases = effectiveCases.filter((c) => {
    const q = (caseSearchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (c.patientName || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      (c.diagnosis || '').toLowerCase().includes(q) ||
      (c.contactPhone || '').includes(q)
    );
  });

  const renderOpdCard = ({ item }: { item: OpdVisitEntry }) => {
    return (
      <View style={styles.card}>
        {/* Top Header: Token & Case Badge & Timestamp */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.tokenPill}>
              <Text style={styles.tokenPillText}>{item.tokenNumber}</Text>
            </View>

            <View style={styles.caseIdBadge}>
              <Ionicons name="folder-outline" size={11} color="#0284C7" />
              <Text style={styles.caseIdBadgeText}>{item.caseId}</Text>
            </View>
          </View>

          <Text style={styles.timestampText}>{item.timestampFormatted}</Text>
        </View>

        {/* Patient Name & Mobile */}
        <View style={styles.patientRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.patientMeta}>
              {item.age} yrs • {item.gender} • {item.contactPhone}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.callCircleBtn}
            onPress={() => handleCall(item.contactPhone)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={14} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* Specialty & Doctor (if specified) */}
        <View style={styles.metaStrip}>
          <View style={styles.metaStripItem}>
            <Ionicons name="medkit-outline" size={13} color="#64748B" />
            <Text style={styles.metaStripText}>
              {item.department}
              {item.consultingDoctor ? ` • Dr. ${item.consultingDoctor.replace(/^Dr\.\s*/i, '')}` : ''}
            </Text>
          </View>

          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.visitType}</Text>
          </View>
        </View>

        {/* Follow-up Status Strip - Clean & Prominent */}
        <View style={styles.cardFooter}>
          {item.followUpStatus === 'PENDING' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <View style={[styles.followUpPendingPill, { flex: 1 }]}>
                <Ionicons name="time" size={13} color="#D97706" />
                <Text style={styles.followUpPendingText}>
                  Follow-up: {item.nextFollowUpTimeline || 'In 7 Days'}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                onPress={() => handleResolveFollowUp(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={13} color="#15803D" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Mark Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.followUpStatus === 'DONE' && (
            <View style={styles.followUpDonePill}>
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
              <Text style={styles.followUpDoneText}>
                Follow-up Completed {item.followUpResolvedAt ? `(${item.followUpResolvedAt})` : ''}
              </Text>
            </View>
          )}

          {item.followUpStatus === 'NOT_REQUIRED' && (
            <View style={styles.noFollowUpPill}>
              <Text style={styles.noFollowUpText}>Routine Visit • No Follow-up</Text>
            </View>
          )}

          {/* Prescription Document Pill on Card */}
          {item.prescriptionDoc && (
            <View style={styles.cardPrescriptionRow}>
              <View style={styles.cardPrescriptionLeft}>
                <Ionicons name="document-attach" size={14} color="#059669" />
                <Text style={styles.cardPrescriptionText} numberOfLines={1}>
                  {item.prescriptionDoc.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cardPrescriptionViewBtn}
                onPress={() => setPreviewPrescription(item.prescriptionDoc || null)}
                activeOpacity={0.7}
              >
                <Ionicons name="eye-outline" size={12} color="#059669" />
                <Text style={styles.cardPrescriptionViewText}>
                  {t('btnViewPrescription')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewCaseBtn}
            onPress={() => navigation.navigate('PatientCaseDetails', { caseId: item.caseId })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewCaseBtnText}>Case Details</Text>
            <Ionicons name="chevron-forward" size={12} color="#0284C7" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle}>OPD Visit Log</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Outpatient visits & follow-up tracking
          </Text>
        </View>

        {/* Premium Prominent Header Action Button */}
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => handleOpenLogModal()}
          activeOpacity={0.8}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.addHeaderBtnText}>Log OPD</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Banner */}
      <View style={styles.statsStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.totalVisits}</Text>
          <Text style={styles.statLbl}>Total Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#0284C7' }]}>{stats.todayCount}</Text>
          <Text style={styles.statLbl}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#D97706' }]}>
            {stats.followUpRequiredCount}
          </Text>
          <Text style={styles.statLbl}>Follow-Up Needed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#059669' }]}>
            {stats.followUpDoneCount}
          </Text>
          <Text style={styles.statLbl}>Follow-Up Done</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient name, Case ID, token..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clean Filter Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'ALL' && styles.tabChipActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabChipText, activeTab === 'ALL' && styles.tabChipTextActive]}>
              All Logs ({visits.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'FOLLOW_UP_REQUIRED' && styles.tabChipActiveAmber,
            ]}
            onPress={() => setActiveTab('FOLLOW_UP_REQUIRED')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeTab === 'FOLLOW_UP_REQUIRED' && styles.tabChipTextActiveAmber,
              ]}
            >
              ⚠️ Follow-up Needed ({stats.followUpRequiredCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'FOLLOW_UP_DONE' && styles.tabChipActiveGreen,
            ]}
            onPress={() => setActiveTab('FOLLOW_UP_DONE')}
          >
            <Text
              style={[
                styles.tabChipText,
                activeTab === 'FOLLOW_UP_DONE' && styles.tabChipTextActiveGreen,
              ]}
            >
              ✓ Follow-up Done ({stats.followUpDoneCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'TODAY' && styles.tabChipActive]}
            onPress={() => setActiveTab('TODAY')}
          >
            <Text style={[styles.tabChipText, activeTab === 'TODAY' && styles.tabChipTextActive]}>
              Today's Visits ({stats.todayCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Visits List or Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Loading OPD records...</Text>
          <Text style={styles.loadingSubText}>Synchronizing outpatient logs with database</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVisits}
          keyExtractor={(item) => item.id}
          renderItem={renderOpdCard}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No OPD records found</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'FOLLOW_UP_REQUIRED'
                  ? 'No patients currently pending a follow-up visit.'
                  : activeTab === 'FOLLOW_UP_DONE'
                  ? 'No completed follow-up records found.'
                  : activeTab === 'TODAY'
                  ? 'No OPD visits recorded today.'
                  : 'No OPD records logged yet in the database.'}
              </Text>
            </View>
          }
        />
      )}

      {/* High-visibility Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fabBtn, { bottom: Math.max(insets.bottom, 16) + 12 }]}
        onPress={() => handleOpenLogModal()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabBtnText}>Record OPD Visit</Text>
      </TouchableOpacity>

      {/* Log OPD Visit In-Tree Overlay (100% Reliable Android Render) */}
      {newModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !saving && setNewModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidWrap}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="medkit" size={18} color="#0284C7" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Record OPD Visit</Text>
                    <Text style={styles.modalSubtitle}>Issue outpatient token & clinical record</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseCircle, saving && { opacity: 0.5 }]}
                  onPress={() => !saving && setNewModalVisible(false)}
                  disabled={saving}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                {/* Draft Restoration Banner */}
                {hasOpdDraft && (
                  <View style={styles.draftNoticeBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="document-text" size={14} color="#0369A1" />
                      <Text style={styles.draftNoticeText}>{t('draftRestoredNotice')}</Text>
                    </View>
                    <TouchableOpacity onPress={handleDiscardOpdDraft}>
                      <Text style={styles.draftDiscardText}>{t('clearDraftBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 1: Select Allocated Patient Case */}
                <Text style={styles.fieldLabel}>Select Allocated Patient Case *</Text>

                <View style={styles.modalSearchBox}>
                  <Ionicons name="search" size={15} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Search case ID, patient name..."
                    placeholderTextColor="#94A3B8"
                    value={caseSearchQuery}
                    onChangeText={setCaseSearchQuery}
                  />
                </View>

                <View style={styles.casesListContainer}>
                  {filteredModalCases.slice(0, 5).map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.compactCaseRow, isSelected && styles.compactCaseRowActive]}
                        onPress={() => handleSelectAllocatedCase(c, true)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.compactCaseName, isSelected && { color: '#0284C7' }]}>
                            {c.patientName}
                          </Text>
                          <Text style={styles.compactCaseMeta}>
                            {c.id} • {c.diagnosis || 'General Outpatient'} • {c.age}y/{c.gender}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                        ) : (
                          <Ionicons name="radio-button-off" size={20} color="#CBD5E1" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Step 2: Visit Type */}
                <Text style={styles.fieldLabel}>Visit Type</Text>
                <View style={styles.presetRow}>
                  {ALL_VISIT_TYPES.map((vt) => (
                    <TouchableOpacity
                      key={vt}
                      style={[styles.presetChip, visitType === vt && styles.presetChipActive]}
                      onPress={() => {
                        setVisitType(vt);
                        persistOpdDraft({ visitType: vt });
                      }}
                    >
                      <Text style={[styles.presetChipText, visitType === vt && styles.presetChipTextActive]}>
                        {vt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Step 3: OPD Department */}
                <Text style={styles.fieldLabel}>Department / Specialty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                  {ALL_DEPARTMENTS.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.presetChip, selectedDept === dept && styles.presetChipActive]}
                      onPress={() => {
                        setSelectedDept(dept);
                        persistOpdDraft({ selectedDept: dept });
                      }}
                    >
                      <Text style={[styles.presetChipText, selectedDept === dept && styles.presetChipTextActive]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Step 4: Consulting Doctor */}
                <Text style={styles.fieldLabel}>Consulting Doctor (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Dr. Nilesh Bapat (Optional)"
                  placeholderTextColor="#94A3B8"
                  value={consultingDoctor}
                  onChangeText={(val) => {
                    setConsultingDoctor(val);
                    persistOpdDraft({ consultingDoctor: val });
                  }}
                />

                {/* Step 5: Chief Complaint / Clinical Notes */}
                <Text style={styles.fieldLabel}>Chief Complaint / Visit Reason</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. Regular outpatient checkup, ECG review, prescription refill"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  value={chiefComplaint}
                  onChangeText={setChiefComplaint}
                />

                {/* Step 6: Follow-Up Required */}
                <View style={styles.followUpQuestionCard}>
                  <View style={styles.questionHeader}>
                    <Ionicons name="calendar" size={17} color="#0284C7" />
                    <Text style={styles.questionTitle}>Next Follow-up Required?</Text>
                  </View>

                  <View style={styles.yesNoRow}>
                    <TouchableOpacity
                      style={[
                        styles.yesNoBtn,
                        nextFollowUpRequired && styles.yesBtnActive,
                      ]}
                      onPress={() => {
                        setNextFollowUpRequired(true);
                        persistOpdDraft({ nextFollowUpRequired: true });
                      }}
                    >
                      <Ionicons
                        name={nextFollowUpRequired ? 'checkmark-circle' : 'radio-button-off'}
                        size={16}
                        color={nextFollowUpRequired ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.yesNoBtnText,
                          nextFollowUpRequired && styles.yesNoBtnTextActive,
                        ]}
                      >
                        Yes, Follow-up
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.yesNoBtn,
                        !nextFollowUpRequired && styles.noBtnActive,
                      ]}
                      onPress={() => {
                        setNextFollowUpRequired(false);
                        persistOpdDraft({ nextFollowUpRequired: false });
                      }}
                    >
                      <Ionicons
                        name={!nextFollowUpRequired ? 'close-circle' : 'radio-button-off'}
                        size={16}
                        color={!nextFollowUpRequired ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.yesNoBtnText,
                          !nextFollowUpRequired && styles.yesNoBtnTextActive,
                        ]}
                      >
                        No Follow-up
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {nextFollowUpRequired && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.timelinePickerLabel}>Follow-up Timeline:</Text>
                      <View style={styles.presetRow}>
                        {FOLLOW_UP_TIMELINES.map((tl) => (
                          <TouchableOpacity
                            key={tl}
                            style={[
                              styles.timelineChip,
                              nextFollowUpTimeline === tl && styles.timelineChipActive,
                            ]}
                            onPress={() => {
                              setNextFollowUpTimeline(tl);
                              persistOpdDraft({ nextFollowUpTimeline: tl });
                            }}
                          >
                            <Text
                              style={[
                                styles.timelineChipText,
                                nextFollowUpTimeline === tl && styles.timelineChipTextActive,
                              ]}
                            >
                              {tl}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Step 7: Prescription Upload */}
                <View style={styles.formSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionIconBadge}>
                      <Ionicons name="document-text" size={15} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitleText}>
                        {t('prescriptionSectionTitle') || 'Prescription Document'}
                      </Text>
                      <Text style={styles.sectionSubText}>
                        {t('prescriptionSectionSub') || 'Photograph doctor slip or upload file'}
                      </Text>
                    </View>
                  </View>

                  {prescriptionDoc ? (
                    <View style={styles.prescriptionUploadedCard}>
                      <View style={styles.prescriptionCardLeft}>
                        <View style={styles.prescriptionIconCircle}>
                          <Ionicons
                            name={
                              prescriptionDoc.type?.includes('pdf')
                                ? 'document-text'
                                : 'image'
                            }
                            size={20}
                            color="#0284C7"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.prescriptionFileName} numberOfLines={1}>
                            {prescriptionDoc.name}
                          </Text>
                          <View style={styles.prescriptionMetaRow}>
                            <View style={styles.prescriptionSourceBadge}>
                              <Ionicons
                                name={
                                  prescriptionDoc.source === 'camera'
                                    ? 'camera'
                                    : 'phone-portrait'
                                }
                                size={10}
                                color="#475569"
                              />
                              <Text style={styles.prescriptionSourceBadgeText}>
                                {prescriptionDoc.source === 'camera'
                                  ? 'Camera Photo'
                                  : 'Device File'}
                              </Text>
                            </View>
                            {prescriptionDoc.size ? (
                              <Text style={styles.prescriptionSizeText}>
                                {prescriptionDoc.size}
                              </Text>
                            ) : null}
                            <Text style={styles.prescriptionTimeText}>
                              {prescriptionDoc.uploadedAt}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.prescriptionCardActions}>
                        {prescriptionDoc.uri ? (
                          <TouchableOpacity
                            style={styles.prescriptionViewBtn}
                            onPress={async () => {
                              const url =
                                prescriptionDoc.uri ||
                                (prescriptionDoc as any).file_url ||
                                (prescriptionDoc as any).url;
                              const isPdf =
                                prescriptionDoc.name?.toLowerCase().endsWith('.pdf') ||
                                prescriptionDoc.type?.includes('pdf') ||
                                (typeof url === 'string' && url.toLowerCase().includes('.pdf'));

                              if (
                                isPdf &&
                                url &&
                                (url.startsWith('http://') ||
                                  url.startsWith('https://') ||
                                  url.startsWith('content://') ||
                                  url.startsWith('file://'))
                              ) {
                                try {
                                  await Linking.openURL(url);
                                  return;
                                } catch (_) {
                                  // Fallback to in-tree preview modal
                                }
                              }
                              setPreviewPrescription(prescriptionDoc);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={15} color="#0284C7" />
                            <Text style={styles.prescriptionViewBtnText}>
                              {t('btnViewPrescription') || 'View'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={styles.prescriptionRemoveBtn}
                          onPress={handleRemovePrescription}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.prescriptionUploadButtonsRow}>
                      <TouchableOpacity
                        style={styles.uploadOptionBtn}
                        onPress={handleCapturePrescriptionCamera}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.uploadIconCircle, { backgroundColor: '#E0F2FE' }]}>
                          <Ionicons name="camera" size={18} color="#0284C7" />
                        </View>
                        <Text style={styles.uploadOptionBtnText}>
                          {t('btnTakePhoto') || 'Camera'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.uploadOptionBtn}
                        onPress={handlePickPrescriptionDevice}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.uploadIconCircle, { backgroundColor: '#EDE9FE' }]}>
                          <Ionicons name="folder-open" size={18} color="#7C3AED" />
                        </View>
                        <Text style={styles.uploadOptionBtnText}>
                          {t('btnChooseFromDevice') || 'Upload File'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Submit Buttons */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, saving && { opacity: 0.5 }]}
                    onPress={() => !saving && setNewModalVisible(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      (!isFormValid || saving) && styles.confirmBtnDisabled,
                    ]}
                    onPress={handleSaveNewOpd}
                    disabled={!isFormValid || saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmBtnText}>Recording OPD Visit...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmBtnText}>Record OPD Visit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Prescription Preview In-Tree Overlay */}
      {!!previewPrescription && (
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPreviewPrescription(null)}
          />
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

            {previewPrescription?.uri && !previewPrescription.type?.includes('pdf') && !previewPrescription.name?.toLowerCase().endsWith('.pdf') ? (
              <Image
                source={{ uri: previewPrescription.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.pdfPreviewPlaceholder}>
                <Ionicons name="document-text-outline" size={54} color="#0284C7" />
                <Text style={styles.pdfPreviewName}>{previewPrescription?.name}</Text>
                <Text style={styles.pdfPreviewSub}>Document attached to this OPD record</Text>
                {previewPrescription?.uri ? (
                  <TouchableOpacity
                    style={styles.openPdfBtn}
                    onPress={() => {
                      const url =
                        previewPrescription.uri ||
                        (previewPrescription as any).file_url ||
                        (previewPrescription as any).url;
                      if (url) {
                        Linking.openURL(url).catch(() => {
                          Alert.alert('Notice', 'Unable to open file viewer.');
                        });
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.openPdfBtnText}>Open & View Full PDF</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
    fontWeight: '500',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  addIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  tabsRow: {
    paddingBottom: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  tabChipActiveAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  tabChipActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabChipTextActiveAmber: {
    color: '#B45309',
    fontWeight: '700',
  },
  tabChipTextActiveGreen: {
    color: '#047857',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tokenPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tokenPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  caseIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caseIdBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  metaStripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    paddingRight: 6,
  },
  metaStripText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'column',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  followUpPendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  followUpPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  followUpDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  followUpDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  noFollowUpPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  noFollowUpText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardPrescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardPrescriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  cardPrescriptionText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  cardPrescriptionViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardPrescriptionViewText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
  },
  viewCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignSelf: 'flex-end',
  },
  viewCaseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  fabBtn: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 999,
  },
  keyboardAvoidWrap: {
    width: '100%',
    maxHeight: '92%',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '100%',
    width: '100%',
  },
  modalScrollBody: {
    maxHeight: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  draftNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  draftDiscardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  casesListContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  compactCaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compactCaseRowActive: {
    backgroundColor: '#F0F9FF',
  },
  compactCaseName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  compactCaseMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  followUpQuestionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yesNoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  yesBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  noBtnActive: {
    backgroundColor: '#64748B',
    borderColor: '#64748B',
  },
  yesNoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  yesNoBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timelinePickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  timelineChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  timelineChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timelineChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  prescriptionUploadedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  prescriptionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prescriptionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prescriptionFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  prescriptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  prescriptionSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prescriptionSourceBadgeText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  prescriptionSizeText: {
    fontSize: 10,
    color: '#64748B',
  },
  prescriptionTimeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  prescriptionCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  prescriptionViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  prescriptionViewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  prescriptionRemoveBtn: {
    padding: 4,
  },
  prescriptionUploadButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
  },
  uploadIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999999,
    elevation: 1000,
  },
  previewCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  previewImage: {
    width: '100%',
    height: 350,
  },
  pdfPreviewPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPreviewName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  pdfPreviewSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 16,
  },
  openPdfBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
