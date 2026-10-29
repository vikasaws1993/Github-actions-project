import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { clinicalDataTranslator } from '../../../shared/services/clinicalDataTranslator';
import {
  AllocatedPatientCase,
  HospitalFacilityProfile,
  EMPTY_HOSPITAL_SURVEY_PROFILE,
  RequestedDocument,
  sevakHospitalService,
  getCompletedSurveySections,
} from '../../services/sevakHospitalService';
import {
  sevakDailyUpdateService,
  getCurrentShift,
} from '../../services/sevakDailyUpdateService';
import { TodayShiftStatus } from '../../types/sevakDailyUpdate.types';
import { sevakOpdService } from '../../services/sevakOpdService';
import { OpdStats } from '../../types/sevakOpd.types';
import { sevakDoctorService } from '../../services/sevakDoctorService';
import { DoctorStats } from '../../types/sevakDoctor.types';
import { sevakDraftService } from '../../services/sevakDraftService';
import { sevakNotificationService } from '../../services/sevakNotificationService';
import { notificationService } from '../../../citizen/services/notificationService';
import { SevakNotification } from '../../types/sevakNotification.types';
import { LogoutConfirmationModal } from '../../../shared/components/LogoutConfirmationModal';
import { LanguageModal } from '../../../shared/components/LanguageModal';

import { useSevakData } from '../../context/SevakDataContext';

export const SevakDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();

  const isMarathi = language === 'mr';
  const isHindi = language === 'hi';

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Global Real-Time Context (0ms latency, automatic live synchronization)
  const {
    allocatedCases,
    hospitalProfile: contextHospital,
    todayShiftStatus: dailyShiftStatus,
    opdStats,
    doctorStats,
    unreadNotifCount: unreadNotificationCount,
    urgentNotification,
    refreshAll,
  } = useSevakData();

  const [hospital, setHospital] = useState<HospitalFacilityProfile>(contextHospital);

  useEffect(() => {
    let isMounted = true;
    const computeEffectiveHospital = async () => {
      let effectiveHospital = contextHospital;
      const userId = user?.id || (user as any)?._id || user?.phoneNumber || 'guest';
      const hospId = contextHospital.assignedHospitalId || 'HOSP-PUN-042';

      try {
        const draft = await sevakDraftService.loadDraft<{
          profile: HospitalFacilityProfile;
          completedSections?: number[];
        }>(sevakDraftService.keys.hospitalSurvey(userId, hospId));

        if (
          draft &&
          draft.profile &&
          !contextHospital.currentStatus?.verifiedBySevak &&
          getCompletedSurveySections(contextHospital).length < 7
        ) {
          effectiveHospital = {
            ...contextHospital,
            ...draft.profile,
            currentStatus: {
              ...contextHospital.currentStatus,
              ...draft.profile.currentStatus,
              verifiedBySevak: false,
            },
          };
        }
      } catch (_) {}

      if (isMounted) {
        setHospital(effectiveHospital);
      }
    };

    computeEffectiveHospital();
    return () => {
      isMounted = false;
    };
  }, [contextHospital, user]);

  useFocusEffect(
    useCallback(() => {
      notificationService.requestPermission();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll(true);
    setRefreshing(false);
  };

  const activeCases = allocatedCases.filter(
    (c) => !['Discharged', 'Completed'].includes(c.treatmentStatus)
  );

  const getPriorityWeight = (level?: string) => {
    if (level === 'CRITICAL') return 1;
    if (level === 'URGENT') return 2;
    if (level === 'HIGH') return 3;
    return 99;
  };

  const dashboardPriorityCases = activeCases
    .filter(
      (c) =>
        c.priorityNote &&
        ['CRITICAL', 'HIGH', 'URGENT'].includes(c.priorityNote.level)
    )
    .sort(
      (a, b) =>
        getPriorityWeight(a.priorityNote?.level) -
        getPriorityWeight(b.priorityNote?.level)
    );

  const pendingDocsCount = activeCases.reduce(
    (acc, curr) =>
      acc +
      (curr.requestedDocuments || []).filter(
        (d: RequestedDocument) => d.status === 'pending'
      ).length,
    0
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Branded Sevak Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <View style={styles.headerLeftProfile}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerRoleTitle} numberOfLines={1}>
              {user?.name || (isMarathi ? 'आरोग्य सेवक' : isHindi ? 'आरोग्य सेवक' : 'Arogya Sevak')}
            </Text>
            <Text style={styles.wardSubtitle} numberOfLines={1}>
              {user?.badgeNumber || 'AS-MH-2024-884'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Language Switch Option (Commented out for Arogya Sevak - English only)
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select Language"
          >
            <Ionicons name="globe-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.langText}>
              {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255, 255, 255, 0.9)" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
          */}

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigation.navigate('SevakNotifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            {unreadNotificationCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.7}
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Urgent Admin Notice Banner */}
        {urgentNotification && !urgentNotification.is_read && (
          <TouchableOpacity
            style={styles.dashboardNoticeBanner}
            onPress={() => navigation.navigate('SevakNotifications')}
            activeOpacity={0.88}
          >
            <View style={styles.noticeBannerIconWrap}>
              <Ionicons name="megaphone" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <View style={styles.noticeBannerHeader}>
                <Text style={styles.noticeBannerBadge}>
                  {urgentNotification.badge || 'प्रशासकीय सूचना / ADMIN DIRECTIVE'}
                </Text>
              </View>
              <Text style={styles.noticeBannerTitle} numberOfLines={1}>
                {urgentNotification.title || urgentNotification.title_en || 'तातडीची प्रशासकीय सूचना'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        )}

        {/* Hospital Card - Minimal & Elegant */}
        <View style={styles.hospitalCard}>
          <View style={styles.hospitalHeaderRow}>
            <View style={styles.hospitalTitleBlock}>
              <View style={styles.facilityTypeRow}>
                <Ionicons name="business" size={14} color="#0284C7" />
                <Text style={styles.facilityTypeLabel}>{t('assignedHospitalCardTitle')}</Text>
              </View>
              <Text style={styles.hospitalName} numberOfLines={1}>
                {hospital.hospitalName || 'Assigned Hospital'}
              </Text>
              <Text style={styles.hospitalAddress} numberOfLines={1}>
                {hospital.fullAddress || hospital.city || 'District Facility'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editFacilityBtn}
              onPress={() => navigation.navigate('HospitalProfile')}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#0284C7" />
              <Text style={styles.editFacilityText}>
                {hospital.currentStatus?.verifiedBySevak || getCompletedSurveySections(hospital).length >= 7
                  ? `${t('surveyProgressBtn')} (7/7)`
                  : getCompletedSurveySections(hospital).length === 0
                  ? `${t('surveyProgressBtn')} (Pending)`
                  : `${t('surveyProgressBtn')} (${getCompletedSurveySections(hospital).length}/7)`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Clean Bed & Capacity Pill Strip */}
          <View style={styles.capacityStrip}>
            <View style={styles.capacityCol}>
              <Text style={styles.capacityVal}>
                {hospital.bedAvailability?.availableHospitalBeds ?? 0}
                <Text style={styles.capacitySub}>/{hospital.bedAvailability?.totalHospitalBeds ?? 0}</Text>
              </Text>
              <Text style={styles.capacityLbl}>{t('generalBedsFree')}</Text>
            </View>

            <View style={styles.stripDivider} />

            <View style={styles.capacityCol}>
              <Text style={[styles.capacityVal, { color: '#DC2626' }]}>
                {hospital.bedAvailability?.availableIcuBeds ?? 0}
                <Text style={styles.capacitySub}>/{hospital.bedAvailability?.totalIcuBeds ?? 0}</Text>
              </Text>
              <Text style={styles.capacityLbl}>{t('icuBedsFree')}</Text>
            </View>

            <View style={styles.stripDivider} />

            <View style={styles.capacityCol}>
              <Text style={styles.capacityVal}>{hospital.specializations?.length ?? 0}</Text>
              <Text style={styles.capacityLbl}>{t('deptCount')}</Text>
            </View>
          </View>
        </View>

        {/* Daily 2x Updates Card (Morning & Evening) */}
        <View style={styles.dailyUpdateBannerCard}>
          <View style={styles.dailyUpdateBannerHeader}>
            <View style={styles.dailyUpdateTitleRow}>
              <View style={styles.dailyUpdateIconBadge}>
                <Ionicons name="time-outline" size={16} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyUpdateBannerTitle}>{t('dailyUpdatesTitle')}</Text>
                <Text style={styles.dailyUpdateBannerSub}>{t('twoTimesDailyNotice')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.dailyUpdateActionBtn}
              onPress={() => navigation.navigate('DailyHospitalUpdate')}
              activeOpacity={0.7}
            >
              <Text style={styles.dailyUpdateActionText}>{t('updateBtn')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#EA580C" />
            </TouchableOpacity>
          </View>

          {/* Morning and Evening Status Capsules */}
          {(() => {
            const currentShift = getCurrentShift();
            const isMorning = currentShift === 'morning';
            return (
              <View style={styles.shiftCapsulesRow}>
                {/* Morning Shift */}
                <TouchableOpacity
                  style={[
                    styles.shiftCapsule,
                    dailyShiftStatus?.morning
                      ? styles.shiftCapsuleDone
                      : isMorning
                      ? styles.shiftCapsulePending
                      : { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
                  ]}
                  onPress={() => navigation.navigate('DailyHospitalUpdate', { initialShift: 'morning' })}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={
                      dailyShiftStatus?.morning
                        ? 'checkmark-circle'
                        : isMorning
                        ? 'sunny-outline'
                        : 'lock-closed-outline'
                    }
                    size={16}
                    color={
                      dailyShiftStatus?.morning
                        ? '#059669'
                        : isMorning
                        ? '#D97706'
                        : '#64748B'
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftCapsuleLabel}>{t('morningShift')}</Text>
                    <Text
                      style={[
                        styles.shiftCapsuleStatus,
                        dailyShiftStatus?.morning
                          ? { color: '#059669' }
                          : isMorning
                          ? { color: '#D97706' }
                          : { color: '#64748B' },
                      ]}
                      numberOfLines={1}
                    >
                      {dailyShiftStatus?.morning
                        ? `${t('shiftSubmitted')} (${dailyShiftStatus.morning.submittedAt})`
                        : isMorning
                        ? t('shiftPending')
                        : `${t('shiftClosed') || 'Closed'} (02:00 PM)`}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Evening Shift */}
                <TouchableOpacity
                  style={[
                    styles.shiftCapsule,
                    dailyShiftStatus?.evening
                      ? styles.shiftCapsuleDone
                      : !isMorning
                      ? styles.shiftCapsulePending
                      : { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
                  ]}
                  onPress={() => navigation.navigate('DailyHospitalUpdate', { initialShift: 'evening' })}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={
                      dailyShiftStatus?.evening
                        ? 'checkmark-circle'
                        : !isMorning
                        ? 'moon-outline'
                        : 'lock-closed-outline'
                    }
                    size={16}
                    color={
                      dailyShiftStatus?.evening
                        ? '#059669'
                        : !isMorning
                        ? '#7C3AED'
                        : '#64748B'
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftCapsuleLabel}>{t('eveningShift')}</Text>
                    <Text
                      style={[
                        styles.shiftCapsuleStatus,
                        dailyShiftStatus?.evening
                          ? { color: '#059669' }
                          : !isMorning
                          ? { color: '#7C3AED' }
                          : { color: '#64748B' },
                      ]}
                      numberOfLines={1}
                    >
                      {dailyShiftStatus?.evening
                        ? `${t('shiftSubmitted')} (${dailyShiftStatus.evening.submittedAt})`
                        : isMorning
                        ? t('opensEveningPeriod')
                        : t('shiftPending')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>

        {/* OPD Outpatient Desk Card */}
        <TouchableOpacity
          style={styles.visitorBannerCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('OpdVisits')}
        >
          <View style={styles.visitorBannerHeader}>
            <View style={styles.visitorTitleRow}>
              <View style={styles.visitorIconBadge}>
                <Ionicons name="ticket" size={17} color="#0284C7" />
                {opdStats && opdStats.followUpRequiredCount > 0 && (
                  <View style={styles.iconMiniBadge}>
                    <Text style={styles.iconMiniBadgeText}>
                      {opdStats.followUpRequiredCount}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.visitorTitleTextCol}>
                <Text
                  style={styles.visitorBannerTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('opdDeskTitle')}
                </Text>
                <Text
                  style={styles.visitorBannerSub}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {opdStats
                    ? `${opdStats.todayCount} Today • ${
                        opdStats.followUpRequiredCount > 0
                          ? `${opdStats.followUpRequiredCount} Follow-ups Pending • `
                          : ''
                      }${opdStats.totalVisits} Total`
                    : t('opdDeskSub')}
                </Text>
              </View>
            </View>

            <View style={styles.visitorActionBtn}>
              <Text style={styles.visitorActionText}>{t('openOpdBtn')}</Text>
              <Ionicons name="chevron-forward" size={13} color="#0284C7" />
            </View>
          </View>

          {/* Quick Metrics Bar for OPD */}
          {opdStats && (
            <View style={styles.visitorMiniStatsRow}>
              <View style={styles.visitorMiniStat}>
                <Text style={styles.visitorMiniVal}>{opdStats.todayCount}</Text>
                <Text style={styles.visitorMiniLbl}>{t('todaysOpd')}</Text>
              </View>
              <View style={styles.visitorMiniDivider} />
              <View style={styles.visitorMiniStat}>
                <Text style={[styles.visitorMiniVal, { color: '#D97706' }]}>
                  {opdStats.followUpRequiredCount}
                </Text>
                <Text style={styles.visitorMiniLbl}>{t('followUpDue')}</Text>
              </View>
              <View style={styles.visitorMiniDivider} />
              <View style={styles.visitorMiniStat}>
                <Text style={[styles.visitorMiniVal, { color: '#16A34A' }]}>
                  {opdStats.followUpDoneCount}
                </Text>
                <Text style={styles.visitorMiniLbl}>{t('resolved')}</Text>
              </View>
              <View style={styles.visitorMiniDivider} />
              <View style={styles.visitorMiniStat}>
                <Text style={[styles.visitorMiniVal, { color: '#0284C7' }]}>
                  {opdStats.totalVisits}
                </Text>
                <Text style={styles.visitorMiniLbl}>{t('totalLogs')}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Doctors Directory & Availability Card */}
        <TouchableOpacity
          style={styles.doctorBannerCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DoctorManagement')}
        >
          <View style={styles.doctorBannerHeader}>
            <View style={styles.doctorTitleRow}>
              <View style={styles.doctorIconBadge}>
                <Ionicons name="people" size={17} color="#059669" />
              </View>

              <View style={styles.doctorTitleTextCol}>
                <Text
                  style={styles.doctorBannerTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('dashboardDoctorCardTitle')}
                </Text>
                <Text
                  style={styles.doctorBannerSub}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {doctorStats
                    ? `${doctorStats.active} Active • ${doctorStats.availableNow} Available Now • ${doctorStats.opdCount} OPD`
                    : t('dashboardDoctorCardSub')}
                </Text>
              </View>
            </View>

            <View style={styles.doctorActionBtn}>
              <Text style={styles.doctorActionText}>{t('dashboardManageRosterBtn')}</Text>
              <Ionicons name="chevron-forward" size={13} color="#059669" />
            </View>
          </View>

          {/* Quick Metrics Bar for Doctors */}
          {doctorStats && (
            <View style={styles.doctorMiniStatsRow}>
              <View style={styles.doctorMiniStat}>
                <Text style={styles.doctorMiniVal}>{doctorStats.active}</Text>
                <Text style={styles.doctorMiniLbl}>{t('totalDoctorsCount')}</Text>
              </View>
              <View style={styles.doctorMiniDivider} />
              <View style={styles.doctorMiniStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={styles.greenMiniDot} />
                  <Text style={[styles.doctorMiniVal, { color: '#16A34A' }]}>
                    {doctorStats.availableNow}
                  </Text>
                </View>
                <Text style={styles.doctorMiniLbl}>{t('availableNowCount')}</Text>
              </View>
              <View style={styles.doctorMiniDivider} />
              <View style={styles.doctorMiniStat}>
                <Text style={[styles.doctorMiniVal, { color: '#0284C7' }]}>
                  {doctorStats.opdCount}
                </Text>
                <Text style={styles.doctorMiniLbl}>{t('opdDoctorsCount')}</Text>
              </View>
              <View style={styles.doctorMiniDivider} />
              <View style={styles.doctorMiniStat}>
                <Text style={[styles.doctorMiniVal, { color: '#7C3AED' }]}>
                  {doctorStats.ipdCount}
                </Text>
                <Text style={styles.doctorMiniLbl}>{t('ipdDoctorsCount')}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* 3 Overview Quick Stats - Simple, Clean, Non-intrusive */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AllocatedPatients')}
          >
            <Text style={styles.statNumber}>{activeCases.length}</Text>
            <Text style={styles.statLabel}>{t('activePatientsTab')}</Text>
          </TouchableOpacity>

          <View style={styles.statVerticalDivider} />

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AllocatedPatients')}
          >
            <Text style={[styles.statNumber, dashboardPriorityCases.length > 0 && { color: '#DC2626' }]}>
              {dashboardPriorityCases.length}
            </Text>
            <Text style={styles.statLabel}>{t('statPriorityNotes')}</Text>
          </TouchableOpacity>

          <View style={styles.statVerticalDivider} />

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AllocatedPatients')}
          >
            <Text style={[styles.statNumber, pendingDocsCount > 0 && { color: '#D97706' }]}>
              {pendingDocsCount}
            </Text>
            <Text style={styles.statLabel}>{t('statDocsNeeded')}</Text>
          </TouchableOpacity>
        </View>

        {/* Priority Allocated Patients Section (Active Critical & High Cases Only) */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.sectionTitle}>
              {t('priorityActionCases')} ({dashboardPriorityCases.length})
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AllocatedPatients')}>
            <Text style={styles.viewAllLink}>
              {t('viewAllPatients')} ({activeCases.length}) →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Priority Cases List */}
        {dashboardPriorityCases.length === 0 ? (
          <View style={styles.emptyPriorityCard}>
            <View style={styles.emptyPriorityIconWrap}>
              <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyPriorityTitle}>{t('noPriorityCases')}</Text>
              <Text style={styles.emptyPrioritySub}>{t('allRoutineActive')}</Text>
            </View>
            <TouchableOpacity
              style={styles.emptyPriorityBtn}
              onPress={() => navigation.navigate('AllocatedPatients')}
            >
              <Text style={styles.emptyPriorityBtnText}>{t('viewAllPatients')} →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dashboardPriorityCases.map((item) => {
            const isCritical = item.priorityNote?.level === 'CRITICAL';
            const pendingDocs = item.requestedDocuments.filter((d: RequestedDocument) => d.status === 'pending');

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.patientCard,
                  isCritical ? styles.priorityBorderCritical : styles.priorityBorderHigh,
                ]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('PatientCaseDetails', { caseId: item.id, patient: item })}
              >
                <View style={styles.patientCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.patientNameLine}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <View style={styles.schemeTag}>
                        <Text style={styles.schemeTagText}>{item.schemeName}</Text>
                      </View>
                      <View
                        style={[
                          styles.priorityBadgePill,
                          isCritical ? styles.priorityBadgeCritical : styles.priorityBadgeHigh,
                        ]}
                      >
                        <Text style={styles.priorityBadgePillText}>
                          {isCritical ? t('criticalPriorityBadge') : t('highPriorityBadge')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.patientSub}>
                      {clinicalDataTranslator.formatAgeGender(item.age, item.gender, language)} • {clinicalDataTranslator.translateWard(item.assignedWard, language)} ({t('bedNumberLabel')} {item.bedNumber})
                    </Text>
                  </View>

                  {/* Status Pill */}
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{clinicalDataTranslator.translateTreatmentStatus(item.treatmentStatus, language)}</Text>
                  </View>
                </View>

                {/* Priority Note - Prominent Row */}
                {item.priorityNote && (
                  <View style={[styles.priorityRow, isCritical && styles.priorityRowCritical]}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={isCritical ? '#DC2626' : '#D97706'}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        isCritical && { color: '#DC2626' },
                      ]}
                      numberOfLines={2}
                    >
                      {item.priorityNote.text}
                    </Text>
                  </View>
                )}

                {/* Pending Docs Tag - Clean and subtle */}
                {pendingDocs.length > 0 && (
                  <View style={styles.docReqRow}>
                    <Ionicons name="document-text-outline" size={13} color="#B45309" />
                    <Text style={styles.docReqText}>
                      {pendingDocs.length} {t('pendingDocsTag')}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#B45309" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Language Selection Modal (Commented out for Arogya Sevak - English only)
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
      */}

      {/* Custom Logout Confirmation Popup */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 20,
    paddingTop: 12,
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
  headerLeftProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    flexShrink: 0,
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerRoleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  wardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 1,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#047857',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dashboardNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  noticeBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  noticeBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  noticeBannerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.3,
  },
  noticeBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hospital Card
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 14,
  },
  hospitalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  hospitalTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  facilityTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  facilityTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#64748B',
  },
  editFacilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editFacilityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  capacityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  capacityCol: {
    flex: 1,
    alignItems: 'center',
  },
  capacityVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  capacitySub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  capacityLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  stripDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },

  // 3 Stats Strip
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statVerticalDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Patient Card
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  schemeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schemeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 10,
  },
  priorityRowCritical: {
    backgroundColor: '#FEF2F2',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    flex: 1,
  },
  docReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  docReqText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },

  // Daily 2x Updates Banner Card
  dailyUpdateBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#EA580C',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dailyUpdateBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyUpdateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  dailyUpdateIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  dailyUpdateBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dailyUpdateBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  dailyUpdateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  dailyUpdateActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  shiftCapsulesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  shiftCapsuleDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  shiftCapsulePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  shiftCapsuleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  shiftCapsuleStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },

  // Priority Card Highlights
  priorityBorderCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFFFF',
  },
  priorityBorderHigh: {
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    backgroundColor: '#FFFFFF',
  },
  priorityBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  priorityBadgeHigh: {
    backgroundColor: '#FEF3C7',
  },
  priorityBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },

  // Empty Priority Card
  emptyPriorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  emptyPriorityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPriorityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  emptyPrioritySub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  emptyPriorityBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
  },
  emptyPriorityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },

  // Visitors Log Banner Card
  visitorBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visitorBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  visitorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  visitorIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  iconMiniBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D97706',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  iconMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  visitorTitleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  visitorBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  visitorBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  insideLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  insideLiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  visitorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    flexShrink: 0,
  },
  visitorActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  visitorMiniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  visitorMiniStat: {
    flex: 1,
    alignItems: 'center',
  },
  visitorMiniVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  visitorMiniLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  visitorMiniDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  doctorBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  doctorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  doctorIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doctorTitleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  doctorBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  doctorBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  doctorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    flexShrink: 0,
  },
  doctorActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  doctorMiniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doctorMiniStat: {
    flex: 1,
    alignItems: 'center',
  },
  doctorMiniVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  doctorMiniLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  doctorMiniDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  greenMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
});
