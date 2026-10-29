import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/context/LanguageContext';
import {
  sevakDailyUpdateService,
  getCurrentShift,
  formatTimeTo12Hour,
} from '../../services/sevakDailyUpdateService';
import {
  sevakHospitalService,
  HospitalFacilityProfile,
  INITIAL_HOSPITAL_PROFILE,
} from '../../services/sevakHospitalService';
import { ShiftType, TodayShiftStatus, OpdDoctorEntry, DailyHospitalUpdate } from '../../types/sevakDailyUpdate.types';
import {
  sevakDraftService,
  DailyHospitalUpdateDraft,
} from '../../services/sevakDraftService';
import { useSevakData } from '../../context/SevakDataContext';

// Helper for formatted today date string (e.g. 01 Oct 2026)
const getFormattedTodayDate = (): string => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
};

const getTodayDateStr = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Default Static Doctor OPD capacity list matching Web
const DEFAULT_STATIC_OPD_DOCTORS: OpdDoctorEntry[] = [
  {
    id: 'opd-doc-1',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'General Medicine',
    opdCount: 45,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-2',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Sneha Patil',
    specialty: 'Pediatrics',
    opdCount: 35,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-3',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Amit Deshmukh',
    specialty: 'Orthopedics',
    opdCount: 25,
    session: 'Full Day (09:00 AM – 04:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-4',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Priya Kulkarni',
    specialty: 'Gynecology & Obstetrics',
    opdCount: 30,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-5',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Anand Joshi',
    specialty: 'Cardiology',
    opdCount: 20,
    session: 'Evening OPD (02:00 PM – 06:00 PM)',
    onDuty: true,
  },
];

export const DailyHospitalUpdateScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { updateLocalShiftStatus, unreadNotifCount: unreadNotificationCount } = useSevakData();
  const scrollViewRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hospital, setHospital] = useState<HospitalFacilityProfile>(INITIAL_HOSPITAL_PROFILE);
  const [todayStatus, setTodayStatus] = useState<TodayShiftStatus>({
    morning: null,
    evening: null,
    activeShift: 'morning',
  });

  // Current active shift from time of day (before 14:00 is morning, 14:00 onwards is evening)
  const currentActiveShift = getCurrentShift();
  const isMorningPeriod = currentActiveShift === 'morning';

  // Selected shift: defaults to param or current active shift
  const [selectedShift, setSelectedShift] = useState<ShiftType>(
    route.params?.initialShift || currentActiveShift
  );

  // Edit Mode state
  const [isEditingShift, setIsEditingShift] = useState<boolean>(false);

  // Hospital Capacity Configured Limits
  const [capacityLimits, setCapacityLimits] = useState({
    noOfWards: 10,
    generalBeds: 85,
    icuUnits: 15,
    nicuBeds: 8,
    picuBeds: 6,
    isolationBeds: 10,
    ventilators: 6,
    dialysisUnits: 6,
    operationTheatres: 4,
  });

  // IPD Capacity Form Fields (Default empty string for clean placeholder="0" rendering)
  const [genAvail, setGenAvail] = useState<string>('');
  const [icuAvail, setIcuAvail] = useState<string>('');
  const [nicuAvail, setNicuAvail] = useState<string>('');
  const [picuAvail, setPicuAvail] = useState<string>('');
  const [isolationAvail, setIsolationAvail] = useState<string>('');

  // OPD Doctor Capacity & Schedule State
  const [opdDoctors, setOpdDoctors] = useState<OpdDoctorEntry[]>(DEFAULT_STATIC_OPD_DOCTORS);

  // Inpatient & Critical Resources
  const [admissionsToday, setAdmissionsToday] = useState<string>('11');
  const [doctorsOnDuty, setDoctorsOnDuty] = useState<string>('10');
  const [ventilatorsAvailable, setVentilatorsAvailable] = useState<string>('4');
  const [oxygenBedsAvailable, setOxygenBedsAvailable] = useState<string>('15');
  const [dialysisMachinesFree, setDialysisMachinesFree] = useState<string>('3');
  const [operationTheatresReady, setOperationTheatresReady] = useState<string>('2');
  const [remarks, setRemarks] = useState<string>('');
  const [hasShiftDraft, setHasShiftDraft] = useState(false);

  // Smart Back Handler
  const handleSmartBack = useCallback((): boolean => {
    if (isEditingShift) {
      setIsEditingShift(false);
      return true;
    }
    navigation.goBack();
    return true;
  }, [isEditingShift, navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleSmartBack();
    });
    return () => subscription.remove();
  }, [handleSmartBack]);

  const checkAndLoadDraft = async (shift: ShiftType): Promise<boolean> => {
    try {
      const today = getTodayDateStr();
      const draftKey = sevakDraftService.keys.dailyHospitalUpdate(shift, today);
      const draft = await sevakDraftService.loadDraft<DailyHospitalUpdateDraft>(draftKey);
      if (draft) {
        if (draft.availableGeneralBeds !== undefined) setGenAvail(draft.availableGeneralBeds);
        if (draft.availableIcuBeds !== undefined) setIcuAvail(draft.availableIcuBeds);
        if (draft.availableNicuBeds !== undefined) setNicuAvail(draft.availableNicuBeds);
        if (draft.availablePicuBeds !== undefined) setPicuAvail(draft.availablePicuBeds);
        if (draft.availableIsolationBeds !== undefined) setIsolationAvail(draft.availableIsolationBeds);
        if (draft.admissionsToday !== undefined) setAdmissionsToday(draft.admissionsToday);
        if (draft.doctorsOnDuty !== undefined) setDoctorsOnDuty(draft.doctorsOnDuty);
        if (draft.ventilatorsAvailable !== undefined) setVentilatorsAvailable(draft.ventilatorsAvailable);
        if (draft.oxygenBedsAvailable !== undefined) setOxygenBedsAvailable(draft.oxygenBedsAvailable);
        if (draft.dialysisMachinesFree !== undefined) setDialysisMachinesFree(draft.dialysisMachinesFree);
        if (draft.operationTheatresReady !== undefined) setOperationTheatresReady(draft.operationTheatresReady);
        if (draft.remarks !== undefined) setRemarks(draft.remarks);
        if (Array.isArray(draft.opdDoctorRecords) && draft.opdDoctorRecords.length > 0) {
          setOpdDoctors(draft.opdDoctorRecords);
        }
        setHasShiftDraft(true);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load shift draft', e);
    }
    setHasShiftDraft(false);
    return false;
  };

  const persistShiftDraft = (overrides?: Partial<DailyHospitalUpdateDraft>) => {
    const today = getTodayDateStr();
    const draftKey = sevakDraftService.keys.dailyHospitalUpdate(selectedShift, today);
    const draft: DailyHospitalUpdateDraft = {
      availableGeneralBeds: genAvail,
      availableIcuBeds: icuAvail,
      availableNicuBeds: nicuAvail,
      availablePicuBeds: picuAvail,
      availableIsolationBeds: isolationAvail,
      admissionsToday,
      doctorsOnDuty,
      ventilatorsAvailable,
      oxygenBedsAvailable,
      dialysisMachinesFree,
      operationTheatresReady,
      opdDoctorRecords: opdDoctors,
      remarks,
      ...overrides,
    };
    sevakDraftService.saveDraft<DailyHospitalUpdateDraft>(draftKey, draft);
    setHasShiftDraft(true);
  };

  const populateFormForShift = (
    shift: ShiftType,
    status: TodayShiftStatus,
    hospProfile: HospitalFacilityProfile
  ) => {
    const shiftReport = shift === 'morning' ? status.morning : status.evening;
    const otherReport = shift === 'morning' ? status.evening : status.morning;

    if (shiftReport) {
      setGenAvail(shiftReport.availableGeneralBeds != null ? String(shiftReport.availableGeneralBeds) : '');
      setIcuAvail(shiftReport.availableIcuBeds != null ? String(shiftReport.availableIcuBeds) : '');
      setNicuAvail(shiftReport.availableNicuBeds != null ? String(shiftReport.availableNicuBeds) : '');
      setPicuAvail(shiftReport.availablePicuBeds != null ? String(shiftReport.availablePicuBeds) : '');
      setIsolationAvail(shiftReport.availableIsolationBeds != null ? String(shiftReport.availableIsolationBeds) : '');
      setAdmissionsToday(String(shiftReport.admissionsToday ?? '11'));
      setDoctorsOnDuty(String(shiftReport.doctorsOnDuty ?? '10'));
      setVentilatorsAvailable(String(shiftReport.ventilatorsAvailable ?? '4'));
      setOxygenBedsAvailable(String(shiftReport.oxygenBedsAvailable ?? '15'));
      setDialysisMachinesFree(String(shiftReport.dialysisMachinesFree ?? '3'));
      setOperationTheatresReady(String(shiftReport.operationTheatresReady ?? '2'));
      setRemarks(shiftReport.remarks || '');
      if (Array.isArray(shiftReport.opdDoctorRecords) && shiftReport.opdDoctorRecords.length > 0) {
        setOpdDoctors(shiftReport.opdDoctorRecords);
      }
    } else if (otherReport) {
      setGenAvail(otherReport.availableGeneralBeds != null ? String(otherReport.availableGeneralBeds) : '');
      setIcuAvail(otherReport.availableIcuBeds != null ? String(otherReport.availableIcuBeds) : '');
      setNicuAvail(otherReport.availableNicuBeds != null ? String(otherReport.availableNicuBeds) : '');
      setPicuAvail(otherReport.availablePicuBeds != null ? String(otherReport.availablePicuBeds) : '');
      setIsolationAvail(otherReport.availableIsolationBeds != null ? String(otherReport.availableIsolationBeds) : '');
      setAdmissionsToday(String(otherReport.admissionsToday ?? '11'));
      setDoctorsOnDuty(String(otherReport.doctorsOnDuty ?? '10'));
      setVentilatorsAvailable(String(otherReport.ventilatorsAvailable ?? '4'));
      setOxygenBedsAvailable(String(otherReport.oxygenBedsAvailable ?? '15'));
      setDialysisMachinesFree(String(otherReport.dialysisMachinesFree ?? '3'));
      setOperationTheatresReady(String(otherReport.operationTheatresReady ?? '2'));
      setRemarks('');
      if (Array.isArray(otherReport.opdDoctorRecords) && otherReport.opdDoctorRecords.length > 0) {
        setOpdDoctors(otherReport.opdDoctorRecords);
      }
    } else {
      setGenAvail('');
      setIcuAvail('');
      setNicuAvail('');
      setPicuAvail('');
      setIsolationAvail('');
      setAdmissionsToday('11');
      setDoctorsOnDuty('10');
      setVentilatorsAvailable(String(hospProfile.criticalResources.ventilators?.available ? 4 : 0));
      setOxygenBedsAvailable('15');
      setDialysisMachinesFree('3');
      setOperationTheatresReady('2');
      setRemarks('');
      if (Array.isArray(hospProfile.doctorsList) && hospProfile.doctorsList.length > 0) {
        setOpdDoctors(
          hospProfile.doctorsList.map((doc, idx) => ({
            id: doc.id || `doc-opd-${idx}`,
            date: getFormattedTodayDate(),
            doctorName: doc.name || 'Dr. Doctor',
            specialty: doc.speciality || 'General Medicine',
            opdCount: 30,
            session: 'Morning OPD (09:00 AM – 01:00 PM)',
            onDuty: true,
          }))
        );
      } else {
        setOpdDoctors(DEFAULT_STATIC_OPD_DOCTORS);
      }
    }
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [hosp, shiftStatus] = await Promise.all([
        sevakHospitalService.getHospitalProfile(),
        sevakDailyUpdateService.getTodayShiftStatus(forceRefresh),
      ]);

      setHospital(hosp);
      setTodayStatus(shiftStatus);

      // Extract limits from profile capacity
      const ipd: any = hosp.capacity?.ipd || (hosp as any).bedAvailability || {};
      const operative: any = hosp.capacity?.operative || {};
      const critical: any = (hosp as any).criticalResources || {};

      const loadedLimits = {
        noOfWards: Number(ipd.noOfWards) || 10,
        generalBeds: Number(ipd.generalBeds || (hosp as any).bedAvailability?.totalHospitalBeds) || 85,
        icuUnits: Number(ipd.icuUnits || (hosp as any).bedAvailability?.totalIcuBeds) || 15,
        nicuBeds: Number(ipd.nicuBeds) || 8,
        picuBeds: Number(ipd.picuBeds) || 6,
        isolationBeds: Number(ipd.isolationBeds) || 10,
        ventilators: Number(critical.ventilators?.total) || 6,
        dialysisUnits: Number(operative.dialysisUnits) || 6,
        operationTheatres: Number(operative.operationTheatres) || 4,
      };
      setCapacityLimits(loadedLimits);

      const draftFound = await checkAndLoadDraft(selectedShift);
      if (!draftFound) {
        populateFormForShift(selectedShift, shiftStatus, hosp);
      }
    } catch (e) {
      console.warn('Failed to load daily update data', e);
    } finally {
      setLoading(false);
    }
  }, [selectedShift]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShiftSelect = async (shift: ShiftType) => {
    setSelectedShift(shift);
    setIsEditingShift(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });

    const draftFound = await checkAndLoadDraft(shift);
    if (!draftFound) {
      populateFormForShift(shift, todayStatus, hospital);
    }
  };

  const handleStartEdit = () => {
    populateFormForShift(selectedShift, todayStatus, hospital);
    setIsEditingShift(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleCancelEdit = () => {
    populateFormForShift(selectedShift, todayStatus, hospital);
    setIsEditingShift(false);
  };

  // OPD Doctor Helpers
  const handleUpdateDoctorOpdCount = (id: string, countText: string) => {
    const num = Math.max(0, parseInt(countText, 10) || 0);
    setOpdDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, opdCount: num } : d))
    );
  };

  const handleToggleDoctorDuty = (id: string) => {
    setOpdDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, onDuty: !d.onDuty } : d))
    );
  };

  const getSpecialtyBadgeStyle = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('general')) return { bg: '#EDE9FE', text: '#6D28D9' };
    if (s.includes('pedia')) return { bg: '#E0F2FE', text: '#0369A1' };
    if (s.includes('ortho')) return { bg: '#E0E7FF', text: '#4338CA' };
    if (s.includes('gynec') || s.includes('obs')) return { bg: '#FCE7F3', text: '#BE185D' };
    if (s.includes('cardio')) return { bg: '#CCFBF1', text: '#0F766E' };
    return { bg: '#F1F5F9', text: '#475569' };
  };

  // Capacity Limits Validation Check
  const validateCapacityLimits = (): string | null => {
    const gNum = parseInt(genAvail, 10) || 0;
    const iNum = parseInt(icuAvail, 10) || 0;
    const nNum = parseInt(nicuAvail, 10) || 0;
    const pNum = parseInt(picuAvail, 10) || 0;
    const isoNum = parseInt(isolationAvail, 10) || 0;

    if (capacityLimits.generalBeds > 0 && gNum > capacityLimits.generalBeds) {
      return `General Beds Available (${gNum}) cannot exceed total hospital capacity (${capacityLimits.generalBeds}).`;
    }
    if (capacityLimits.icuUnits > 0 && iNum > capacityLimits.icuUnits) {
      return `ICU Beds Available (${iNum}) cannot exceed total hospital capacity (${capacityLimits.icuUnits}).`;
    }
    if (capacityLimits.nicuBeds > 0 && nNum > capacityLimits.nicuBeds) {
      return `NICU Beds Available (${nNum}) cannot exceed total hospital capacity (${capacityLimits.nicuBeds}).`;
    }
    if (capacityLimits.picuBeds > 0 && pNum > capacityLimits.picuBeds) {
      return `PICU Beds Available (${pNum}) cannot exceed total hospital capacity (${capacityLimits.picuBeds}).`;
    }
    if (capacityLimits.isolationBeds > 0 && isoNum > capacityLimits.isolationBeds) {
      return `Isolation Beds Available (${isoNum}) cannot exceed total hospital capacity (${capacityLimits.isolationBeds}).`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const errorMsg = validateCapacityLimits();
    if (errorMsg) {
      Alert.alert('Capacity Validation Notice', errorMsg);
      return;
    }

    try {
      setSubmitting(true);
      const officerName = user?.name || (user as any)?.full_name || 'Sai Pallavi';

      const reportPayload = {
        hospitalId: hospital.assignedHospitalId || 'HOSP-PUN-042',
        hospitalName: hospital.hospitalName || 'City Care Hospital',
        date: getTodayDateStr(),
        shift: selectedShift,
        reportingOfficer: officerName,
        availableGeneralBeds: parseInt(genAvail, 10) || 0,
        totalGeneralBeds: capacityLimits.generalBeds,
        availableIcuBeds: parseInt(icuAvail, 10) || 0,
        totalIcuBeds: capacityLimits.icuUnits,
        availableNicuBeds: parseInt(nicuAvail, 10) || 0,
        totalNicuBeds: capacityLimits.nicuBeds,
        availablePicuBeds: parseInt(picuAvail, 10) || 0,
        totalPicuBeds: capacityLimits.picuBeds,
        availableIsolationBeds: parseInt(isolationAvail, 10) || 0,
        totalIsolationBeds: capacityLimits.isolationBeds,
        availableWards: parseInt(capacityLimits.noOfWards.toString(), 10) || 0,
        totalWards: capacityLimits.noOfWards,
        admissionsToday: parseInt(admissionsToday || '0', 10) || 0,
        doctorsOnDuty: opdDoctors.filter((d) => d.onDuty).length || parseInt(doctorsOnDuty || '0', 10) || 0,
        ventilatorsAvailable: parseInt(ventilatorsAvailable || '0', 10) || 0,
        oxygenBedsAvailable: parseInt(oxygenBedsAvailable || '0', 10) || 0,
        dialysisMachinesFree: parseInt(dialysisMachinesFree || '0', 10) || 0,
        operationTheatresReady: parseInt(operationTheatresReady || '0', 10) || 0,
        opdDoctorRecords: opdDoctors,
        remarks: remarks.trim(),
      };

      const saved = await sevakDailyUpdateService.saveDailyUpdate(reportPayload);

      // Clear draft
      const today = getTodayDateStr();
      await sevakDraftService.clearDraft(
        sevakDraftService.keys.dailyHospitalUpdate(selectedShift, today)
      );
      setHasShiftDraft(false);

      // Update in global state & refresh
      const updatedStatus = await sevakDailyUpdateService.getTodayShiftStatus(true);
      updateLocalShiftStatus(updatedStatus);
      setTodayStatus(updatedStatus);
      setIsEditingShift(false);

      Alert.alert('Report Submitted Successfully', `Daily update submitted for ${hospital.hospitalName || 'Assigned Hospital'}.`);
    } catch (e: any) {
      Alert.alert('Submission Error', e?.message || 'Failed to submit daily report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentShiftReport: DailyHospitalUpdate | null = selectedShift === 'morning' ? todayStatus.morning : todayStatus.evening;
  const isSelectedShiftSubmitted = Boolean(currentShiftReport);

  const reportingOfficer = user?.name || (user as any)?.full_name || 'Sai Pallavi';
  const staffId = (user as any)?.badgeNumber || (user as any)?.staffId || 'AS-383484';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0A5C53" />
        <Text style={styles.loadingText}>Loading Daily Updates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Header (Emerald Theme matching Arogya Sevak Branding) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSmartBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerBadgeRow}>
              <Text style={styles.headerTitle}>Daily Updates</Text>
              <View style={styles.sevakBadge}>
                <Text style={styles.sevakBadgeText}>SEVAK</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {reportingOfficer} • Staff ID: {staffId}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('SevakNotifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            {unreadNotificationCount > 0 && (
              <View style={styles.headerNotifBadge}>
                <Text style={styles.headerNotifBadgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => loadData(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. Shift Selector Navigation Cards */}
          <View style={styles.shiftCardsRow}>
            {/* Morning Shift Card */}
            <TouchableOpacity
              style={[
                styles.shiftCard,
                selectedShift === 'morning' && styles.shiftCardActive,
              ]}
              activeOpacity={0.8}
              onPress={() => handleShiftSelect('morning')}
            >
              <View style={styles.shiftCardTop}>
                <View style={[styles.shiftIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="sunny" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.shiftCardTitle}>Morning Update</Text>
                  <Text style={styles.shiftCardTime}>06:00 AM – 02:00 PM</Text>
                </View>
              </View>

              <View style={styles.shiftStatusRow}>
                {todayStatus.morning ? (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusDone]}>
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                    <Text style={styles.shiftStatusDoneText}>Done ({todayStatus.morning.submittedAt || 'Completed'})</Text>
                  </View>
                ) : isMorningPeriod ? (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusOpen]}>
                    <Ionicons name="time-outline" size={13} color="#0284C7" />
                    <Text style={styles.shiftStatusOpenText}>Open (Active)</Text>
                  </View>
                ) : (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusLocked]}>
                    <Ionicons name="lock-closed" size={12} color="#64748B" />
                    <Text style={styles.shiftStatusLockedText}>Window Closed</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Evening Shift Card */}
            <TouchableOpacity
              style={[
                styles.shiftCard,
                selectedShift === 'evening' && styles.shiftCardActive,
              ]}
              activeOpacity={0.8}
              onPress={() => handleShiftSelect('evening')}
            >
              <View style={styles.shiftCardTop}>
                <View style={[styles.shiftIconBox, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="moon" size={18} color="#475569" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.shiftCardTitle}>Evening Update</Text>
                  <Text style={styles.shiftCardTime}>02:00 PM – 10:00 PM</Text>
                </View>
              </View>

              <View style={styles.shiftStatusRow}>
                {todayStatus.evening ? (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusDone]}>
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                    <Text style={styles.shiftStatusDoneText}>Done ({todayStatus.evening.submittedAt || 'Completed'})</Text>
                  </View>
                ) : !isMorningPeriod ? (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusOpen]}>
                    <Ionicons name="time-outline" size={13} color="#0284C7" />
                    <Text style={styles.shiftStatusOpenText}>Open (Active)</Text>
                  </View>
                ) : (
                  <View style={[styles.shiftStatusPill, styles.shiftStatusLocked]}>
                    <Ionicons name="lock-closed" size={12} color="#64748B" />
                    <Text style={styles.shiftStatusLockedText}>Opens 02:00 PM</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* VIEW A: Submitted Summary View (When report submitted & not editing) */}
          {isSelectedShiftSubmitted && !isEditingShift ? (
            <View style={styles.cardContainer}>
              {/* Top Verified Summary Banner */}
              <View style={styles.verifiedBanner}>
                <View style={styles.verifiedBannerLeft}>
                  <View style={styles.verifiedTagRow}>
                    <View style={styles.submittedPill}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={styles.submittedPillText}>SUBMITTED</Text>
                    </View>
                    <Text style={styles.shiftBadgeText}>
                      {selectedShift === 'morning' ? 'Morning Shift' : 'Evening Shift'}
                    </Text>
                  </View>
                  <Text style={styles.verifiedHospTitle}>{hospital.hospitalName || 'City Care Hospital'}</Text>
                  <Text style={styles.verifiedMetaText}>
                    Submitted at {currentShiftReport?.submittedAt || 'Today'} • Officer: {currentShiftReport?.reportingOfficer || reportingOfficer}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editOutlineBtn}
                  onPress={handleStartEdit}
                  activeOpacity={0.75}
                >
                  <Ionicons name="create-outline" size={15} color="#0284C7" />
                  <Text style={styles.editOutlineBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* 1. IPD Capacity Summary Grid */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="bed" size={17} color="#0284C7" />
                    <Text style={styles.sectionHeading}>1. IPD Capacity Availability</Text>
                  </View>
                </View>

                <View style={styles.gridCardsContainer}>
                  <View style={[styles.gridCardBox, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
                    <Text style={styles.gridCardLabel}>General Beds</Text>
                    <Text style={styles.gridCardSummaryVal}>
                      {currentShiftReport?.availableGeneralBeds ?? 0}
                      <Text style={styles.gridCardDenom}> / {capacityLimits.generalBeds}</Text>
                    </Text>
                  </View>

                  <View style={[styles.gridCardBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                    <Text style={styles.gridCardLabel}>ICU Units</Text>
                    <Text style={styles.gridCardSummaryVal}>
                      {currentShiftReport?.availableIcuBeds ?? 0}
                      <Text style={styles.gridCardDenom}> / {capacityLimits.icuUnits}</Text>
                    </Text>
                  </View>

                  <View style={[styles.gridCardBox, { borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' }]}>
                    <Text style={styles.gridCardLabel}>NICU Beds</Text>
                    <Text style={styles.gridCardSummaryVal}>
                      {currentShiftReport?.availableNicuBeds ?? 0}
                      <Text style={styles.gridCardDenom}> / {capacityLimits.nicuBeds}</Text>
                    </Text>
                  </View>

                  <View style={[styles.gridCardBox, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                    <Text style={styles.gridCardLabel}>PICU Beds</Text>
                    <Text style={styles.gridCardSummaryVal}>
                      {currentShiftReport?.availablePicuBeds ?? 0}
                      <Text style={styles.gridCardDenom}> / {capacityLimits.picuBeds}</Text>
                    </Text>
                  </View>

                  <View style={[styles.gridCardBox, { borderColor: '#A5F3FC', backgroundColor: '#ECFEFF' }]}>
                    <Text style={styles.gridCardLabel}>Isolation Beds</Text>
                    <Text style={styles.gridCardSummaryVal}>
                      {currentShiftReport?.availableIsolationBeds ?? 0}
                      <Text style={styles.gridCardDenom}> / {capacityLimits.isolationBeds}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. OPD Doctor Schedule List */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="people" size={17} color="#0F766E" />
                    <Text style={styles.sectionHeading}>2. OPD Doctor Capacity & Daily Patient Allocation</Text>
                  </View>
                </View>

                <View style={styles.opdCardsList}>
                  {(currentShiftReport?.opdDoctorRecords || opdDoctors).map((doc) => {
                    const specStyle = getSpecialtyBadgeStyle(doc.specialty);
                    return (
                      <View key={doc.id} style={styles.opdCardItem}>
                        <View style={styles.opdCardHeaderRow}>
                          <View style={styles.datePill}>
                            <Ionicons name="calendar-outline" size={12} color="#0284C7" />
                            <Text style={styles.datePillText}>{doc.date || getFormattedTodayDate()}</Text>
                          </View>

                          <View style={[styles.dutyBadge, doc.onDuty ? styles.dutyBadgeActive : styles.dutyBadgeOff]}>
                            <Text style={[styles.dutyBadgeText, doc.onDuty ? styles.dutyBadgeTextActive : styles.dutyBadgeTextOff]}>
                              {doc.onDuty ? 'On Duty (Active)' : 'Off Duty'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.opdDoctorIdentityRow}>
                          <Text style={styles.opdDocName}>{doc.doctorName}</Text>
                          <View style={[styles.specBadge, { backgroundColor: specStyle.bg }]}>
                            <Text style={[styles.specBadgeText, { color: specStyle.text }]}>{doc.specialty}</Text>
                          </View>
                        </View>

                        <View style={styles.opdCountRow}>
                          <Text style={styles.opdCountLabel}>OPD Count:</Text>
                          <View style={styles.opdCountSummaryWrap}>
                            <Text style={styles.opdCountValBold}>{doc.opdCount}</Text>
                            <Text style={styles.opdCountUnit}>Patients</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* 3. Remarks Note */}
              {currentShiftReport?.remarks ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionHeading}>3. Shift Remarks & Notes</Text>
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksText}>{currentShiftReport.remarks}</Text>
                  </View>
                </View>
              ) : null}

              {/* Bottom Edit Action */}
              <TouchableOpacity
                style={styles.editShiftBigBtn}
                onPress={handleStartEdit}
                activeOpacity={0.88}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.editShiftBigBtnText}>Edit This Shift Update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* VIEW B: Entry / Edit Form */
            <View style={styles.cardContainer}>
              {/* Form Title & Badge */}
              <View style={styles.formHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formTitle}>
                    {isEditingShift
                      ? `Edit Status Report (${selectedShift === 'morning' ? 'Morning Update' : 'Evening Update'})`
                      : `Daily Status & Critical Resource Report (${selectedShift === 'morning' ? 'Morning Update' : 'Evening Update'})`}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    Enter today's available ICU beds, general beds, critical equipment counts, doctors on-duty, and admissions
                  </Text>
                </View>
                <View style={styles.entryBadge}>
                  <Text style={styles.entryBadgeText}>
                    {isEditingShift ? 'Editing Mode' : 'Daily Entry Form'}
                  </Text>
                </View>
              </View>

              {isEditingShift && (
                <View style={styles.editBanner}>
                  <Ionicons name="create-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.editBannerText}>Editing submitted report. New counts will overwrite current records.</Text>
                  <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditPill}>
                    <Text style={styles.cancelEditPillText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ═════════════════ SECTION 1: IPD Capacity Availability ═════════════════ */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="bed" size={18} color="#0284C7" />
                    <Text style={styles.sectionHeading}>1. IPD (In-Patient Department) Capacity Availability</Text>
                  </View>
                </View>

                <View style={styles.validationNoticeBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#0D9488" />
                  <Text style={styles.validationNoticeText}>Validated against Hospital Facilities Capacity limits</Text>
                </View>

                {/* 5 IPD Bed Cards in Compact 2-Column Grid */}
                <View style={styles.gridCardsContainer}>
                  {/* Card 1: General Beds */}
                  <View style={[styles.gridCardBox, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
                    <Text style={styles.gridCardLabel}>General Beds</Text>
                    <View style={styles.gridCardInputRow}>
                      <TextInput
                        style={[
                          styles.gridCardInput,
                          parseInt(genAvail, 10) > capacityLimits.generalBeds && styles.gridCardInputError,
                        ]}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={genAvail}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setGenAvail(clean);
                          persistShiftDraft({ availableGeneralBeds: clean });
                        }}
                      />
                      <Text style={styles.gridCardDenom}> / {capacityLimits.generalBeds}</Text>
                    </View>
                  </View>

                  {/* Card 2: ICU Units */}
                  <View style={[styles.gridCardBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                    <Text style={styles.gridCardLabel}>ICU Units</Text>
                    <View style={styles.gridCardInputRow}>
                      <TextInput
                        style={[
                          styles.gridCardInput,
                          parseInt(icuAvail, 10) > capacityLimits.icuUnits && styles.gridCardInputError,
                        ]}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={icuAvail}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setIcuAvail(clean);
                          persistShiftDraft({ availableIcuBeds: clean });
                        }}
                      />
                      <Text style={styles.gridCardDenom}> / {capacityLimits.icuUnits}</Text>
                    </View>
                  </View>

                  {/* Card 3: NICU Beds */}
                  <View style={[styles.gridCardBox, { borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' }]}>
                    <Text style={styles.gridCardLabel}>NICU Beds</Text>
                    <View style={styles.gridCardInputRow}>
                      <TextInput
                        style={[
                          styles.gridCardInput,
                          parseInt(nicuAvail, 10) > capacityLimits.nicuBeds && styles.gridCardInputError,
                        ]}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={nicuAvail}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setNicuAvail(clean);
                          persistShiftDraft({ availableNicuBeds: clean });
                        }}
                      />
                      <Text style={styles.gridCardDenom}> / {capacityLimits.nicuBeds}</Text>
                    </View>
                  </View>

                  {/* Card 4: PICU Beds */}
                  <View style={[styles.gridCardBox, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                    <Text style={styles.gridCardLabel}>PICU Beds</Text>
                    <View style={styles.gridCardInputRow}>
                      <TextInput
                        style={[
                          styles.gridCardInput,
                          parseInt(picuAvail, 10) > capacityLimits.picuBeds && styles.gridCardInputError,
                        ]}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={picuAvail}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setPicuAvail(clean);
                          persistShiftDraft({ availablePicuBeds: clean });
                        }}
                      />
                      <Text style={styles.gridCardDenom}> / {capacityLimits.picuBeds}</Text>
                    </View>
                  </View>

                  {/* Card 5: Isolation Beds */}
                  <View style={[styles.gridCardBox, { borderColor: '#A5F3FC', backgroundColor: '#ECFEFF' }]}>
                    <Text style={styles.gridCardLabel}>Isolation Beds</Text>
                    <View style={styles.gridCardInputRow}>
                      <TextInput
                        style={[
                          styles.gridCardInput,
                          parseInt(isolationAvail, 10) > capacityLimits.isolationBeds && styles.gridCardInputError,
                        ]}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={isolationAvail}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setIsolationAvail(clean);
                          persistShiftDraft({ availableIsolationBeds: clean });
                        }}
                      />
                      <Text style={styles.gridCardDenom}> / {capacityLimits.isolationBeds}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ═════════════════ SECTION 2: OPD Doctor Capacity & Daily Patient Allocation ═════════════════ */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="people" size={18} color="#0F766E" />
                    <Text style={styles.sectionHeading}>2. OPD Doctor Capacity & Daily Patient Allocation</Text>
                  </View>
                </View>

                {/* Doctor Cards List */}
                <View style={styles.opdCardsList}>
                  {opdDoctors.map((doc) => {
                    const specStyle = getSpecialtyBadgeStyle(doc.specialty);
                    return (
                      <View key={doc.id} style={styles.opdCardItem}>
                        {/* Header Row: Date Badge on Left, Duty Toggle on Right */}
                        <View style={styles.opdCardHeaderRow}>
                          <View style={styles.datePill}>
                            <Ionicons name="calendar-outline" size={12} color="#0284C7" />
                            <Text style={styles.datePillText}>{doc.date || getFormattedTodayDate()}</Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.dutyToggleBtn, doc.onDuty ? styles.dutyToggleActive : styles.dutyToggleOff]}
                            onPress={() => handleToggleDoctorDuty(doc.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.dutyToggleText, doc.onDuty ? styles.dutyToggleTextActive : styles.dutyToggleTextOff]}>
                              {doc.onDuty ? 'On Duty (Active)' : 'Off Duty'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Doctor Name & Specialty Badge */}
                        <View style={styles.opdDoctorIdentityRow}>
                          <Text style={styles.opdDocName}>{doc.doctorName}</Text>
                          <View style={[styles.specBadge, { backgroundColor: specStyle.bg }]}>
                            <Text style={[styles.specBadgeText, { color: specStyle.text }]}>{doc.specialty}</Text>
                          </View>
                        </View>

                        {/* OPD Count Row */}
                        <View style={styles.opdCountRow}>
                          <Text style={styles.opdCountLabel}>OPD Count:</Text>
                          <View style={styles.opdCountInputWrap}>
                            <TextInput
                              style={styles.opdCountInput}
                              keyboardType="number-pad"
                              value={doc.opdCount ? String(doc.opdCount) : ''}
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              onChangeText={(val) => handleUpdateDoctorOpdCount(doc.id, val)}
                            />
                            <Text style={styles.opdCountUnit}>Patients</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ═════════════════ SECTION 3: Shift Remarks & Ward Handover Notes ═════════════════ */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeading}>3. Shift Remarks & Ward Handover Notes</Text>
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Enter any shift handover remarks, critical supply updates, oxygen plant status, or administrative notices..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={remarks}
                  onChangeText={(val) => {
                    setRemarks(val);
                    persistShiftDraft({ remarks: val });
                  }}
                />
              </View>

              {/* Form Bottom Action Bar */}
              <View style={styles.formBottomBar}>
                <View style={styles.officerInfoRow}>
                  <Ionicons name="person-circle-outline" size={18} color="#475569" />
                  <Text style={styles.officerInfoText}>
                    Officer: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{reportingOfficer}</Text>
                  </Text>
                </View>

                <View style={styles.bottomButtonsRow}>
                  {isEditingShift && (
                    <TouchableOpacity
                      style={styles.cancelEditBtn}
                      onPress={handleCancelEdit}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelEditBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.submitReportBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    activeOpacity={0.88}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.submitReportBtnText}>
                          {isEditingShift ? 'Update Shift Report' : 'Submit Shift Report'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // 1. Header Styles
  header: {
    backgroundColor: '#0A5C53',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  sevakBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sevakBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '400',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerNotifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headerNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Main Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },

  // Shift Selector Navigation Cards
  shiftCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  shiftCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  shiftCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    shadowColor: '#0284C7',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  shiftCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  shiftCardTime: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  shiftStatusRow: {
    marginTop: 4,
  },
  shiftStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  shiftStatusOpen: {
    backgroundColor: '#E0F2FE',
  },
  shiftStatusOpenText: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '700',
  },
  shiftStatusDone: {
    backgroundColor: '#DCFCE7',
  },
  shiftStatusDoneText: {
    fontSize: 10.5,
    color: '#16A34A',
    fontWeight: '700',
  },
  shiftStatusLocked: {
    backgroundColor: '#F1F5F9',
  },
  shiftStatusLockedText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },

  // Main Card Wrapper
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Form Header
  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
    gap: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  formSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  entryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  editBannerText: {
    fontSize: 11.5,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  cancelEditPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D97706',
    marginLeft: 6,
  },
  cancelEditPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },

  // Section Styles
  sectionWrap: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  validationNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 10,
    gap: 5,
  },
  validationNoticeText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },

  // IPD Compact 2-Column Grid
  gridCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCardBox: {
    width: '48.3%',
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    minHeight: 68,
  },
  gridCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  gridCardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridCardInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 42,
    textAlign: 'center',
    marginRight: 4,
  },
  gridCardInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  gridCardDenom: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  gridCardSummaryVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  // OPD Section
  // OPD Cards List
  opdCardsList: {
    gap: 10,
  },
  opdCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  opdCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  opdCardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  datePillText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  dutyToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dutyToggleActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  dutyToggleOff: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  dutyToggleText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dutyToggleTextActive: {
    color: '#16A34A',
  },
  dutyToggleTextOff: {
    color: '#64748B',
  },
  opdDoctorIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  opdDocName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  specBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  specBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  opdCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  opdCountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  opdCountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opdCountInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 54,
    textAlign: 'center',
  },
  opdCountUnit: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  opdCountSummaryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  opdCountValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Remarks
  remarksInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 6,
  },

  // Form Bottom Bar
  formBottomBar: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  officerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  officerInfoText: {
    fontSize: 12,
    color: '#475569',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitReportBtn: {
    flex: 1,
    backgroundColor: '#0A5C53',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReportBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // ═════════════════ SUMMARY VIEW STYLES ═════════════════
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  verifiedBannerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  verifiedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  submittedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  submittedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  shiftBadgeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  verifiedHospTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#14532D',
  },
  verifiedMetaText: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  editOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  editOutlineBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },

  summaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  statBox: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 2,
  },
  statBoxVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statBoxDenom: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  summaryDocRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  summaryDocTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dutyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dutyBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  dutyBadgeOff: {
    backgroundColor: '#F1F5F9',
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dutyBadgeTextActive: {
    color: '#16A34A',
  },
  dutyBadgeTextOff: {
    color: '#64748B',
  },
  summaryDocInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryDocName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDocBottom: {
    marginTop: 2,
  },
  summaryDocCount: {
    fontSize: 11,
    color: '#64748B',
  },

  remarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  remarksText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },

  editShiftBigBtn: {
    backgroundColor: '#0A5C53',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  editShiftBigBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default DailyHospitalUpdateScreen;
