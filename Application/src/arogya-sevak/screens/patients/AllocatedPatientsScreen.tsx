import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { clinicalDataTranslator } from '../../../shared/services/clinicalDataTranslator';
import {
  AllocatedPatientCase,
  RequestedDocument,
  sevakHospitalService,
} from '../../services/sevakHospitalService';


import { useSevakData } from '../../context/SevakDataContext';

type MainTabType = 'ACTIVE' | 'TRANSFERRED' | 'CLOSED';
type ActiveSubFilter = 'ALL' | 'CRITICAL' | 'PENDING_DOCS';

export const AllocatedPatientsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const { allocatedCases: cases, refreshCases } = useSevakData();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mainTab, setMainTab] = useState<MainTabType>('ACTIVE');
  const [activeSubFilter, setActiveSubFilter] = useState<ActiveSubFilter>('ALL');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCases(true);
    setRefreshing(false);
  };

  // Helper checks
  const isTransferredCase = (c: AllocatedPatientCase) =>
    Boolean(c.isTransferredOut || c.treatmentStatus === 'Transferred');

  const isClosedCase = (c: AllocatedPatientCase) =>
    !isTransferredCase(c) && ['Discharged', 'Completed'].includes(c.treatmentStatus);

  // Active vs Transferred vs Closed cases (order of arrival preserved)
  const activeCases = cases.filter(
    (c) => !isTransferredCase(c) && !isClosedCase(c)
  );
  const transferredCases = cases.filter((c) => isTransferredCase(c));
  const closedCases = cases.filter((c) => isClosedCase(c));

  const activeCriticalCount = activeCases.filter(
    (c) =>
      c.priorityNote &&
      ['CRITICAL', 'HIGH', 'URGENT'].includes(c.priorityNote.level)
  ).length;

  const activePendingDocsCount = activeCases.filter((c) =>
    c.requestedDocuments.some((d: RequestedDocument) => d.status === 'pending')
  ).length;

  const baseCases =
    mainTab === 'ACTIVE'
      ? activeCases
      : mainTab === 'TRANSFERRED'
      ? transferredCases
      : closedCases;

  const displayedCases = baseCases.filter((c) => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.abhaId.includes(searchQuery);

    if (!matchesSearch) return false;

    if (mainTab === 'ACTIVE') {
      if (activeSubFilter === 'CRITICAL') {
        return Boolean(
          c.priorityNote &&
            ['CRITICAL', 'HIGH', 'URGENT'].includes(c.priorityNote.level)
        );
      }
      if (activeSubFilter === 'PENDING_DOCS') {
        return c.requestedDocuments.some(
          (d: RequestedDocument) => d.status === 'pending'
        );
      }
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Transferred':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'Admitted':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
      case 'Diagnostic Stage':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'Under Treatment':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'Surgery Scheduled':
        return { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' };
      case 'Post-Op Recovery':
        return { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE' };
      case 'On Hold':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'Discharged':
      case 'Completed':
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('allocatedPatientsHeader')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            City Care Hospital • {activeCases.length} {t('activePatientsTab')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.hospitalButton}
          onPress={() => navigation.navigate('HospitalProfile')}
          activeOpacity={0.8}
        >
          <Ionicons name="business" size={15} color="#FFFFFF" />
          <Text style={styles.hospitalButtonText}>{t('sevakTabHospital')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchAllocatedPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3-Tab Segment Control: Active vs Transferred vs Closed */}
      <View style={styles.mainTabSegment}>
        <TouchableOpacity
          style={[
            styles.mainTabBtn,
            mainTab === 'ACTIVE' && styles.mainTabBtnActive,
          ]}
          onPress={() => setMainTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={14}
            color={mainTab === 'ACTIVE' ? '#0284C7' : '#64748B'}
          />
          <Text
            style={[
              styles.mainTabBtnText,
              mainTab === 'ACTIVE' && styles.mainTabBtnTextActive,
            ]}
            numberOfLines={1}
          >
            {t('activePatientsTab')} ({activeCases.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTabBtn,
            mainTab === 'TRANSFERRED' && styles.mainTabBtnTransferredActive,
          ]}
          onPress={() => setMainTab('TRANSFERRED')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="repeat"
            size={14}
            color={mainTab === 'TRANSFERRED' ? '#7C3AED' : '#64748B'}
          />
          <Text
            style={[
              styles.mainTabBtnText,
              mainTab === 'TRANSFERRED' && styles.mainTabBtnTextTransferredActive,
            ]}
            numberOfLines={1}
          >
            {t('transferredCasesTab')} ({transferredCases.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTabBtn,
            mainTab === 'CLOSED' && styles.mainTabBtnActive,
          ]}
          onPress={() => setMainTab('CLOSED')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="archive-outline"
            size={14}
            color={mainTab === 'CLOSED' ? '#0284C7' : '#64748B'}
          />
          <Text
            style={[
              styles.mainTabBtnText,
              mainTab === 'CLOSED' && styles.mainTabBtnTextActive,
            ]}
            numberOfLines={1}
          >
            {t('closedCasesTab')} ({closedCases.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Filters / Notices */}
      {mainTab === 'ACTIVE' ? (
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeSubFilter === 'ALL' && styles.filterChipActive,
              ]}
              onPress={() => setActiveSubFilter('ALL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeSubFilter === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                {t('filterAll')} ({activeCases.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeSubFilter === 'CRITICAL' && styles.filterChipActive,
              ]}
              onPress={() => setActiveSubFilter('CRITICAL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeSubFilter === 'CRITICAL' && styles.filterChipTextActive,
                ]}
              >
                🚨 {t('filterCritical')} ({activeCriticalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeSubFilter === 'PENDING_DOCS' && styles.filterChipActive,
              ]}
              onPress={() => setActiveSubFilter('PENDING_DOCS')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeSubFilter === 'PENDING_DOCS' &&
                    styles.filterChipTextActive,
                ]}
              >
                📄 {t('filterNeedsDocs')} ({activePendingDocsCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : mainTab === 'TRANSFERRED' ? (
        <View style={styles.transferredNoticeBox}>
          <Ionicons name="repeat" size={15} color="#7C3AED" />
          <Text style={styles.transferredNoticeText}>
            {t('transferredCasesNotice')} ({transferredCases.length})
          </Text>
        </View>
      ) : (
        <View style={styles.closedArchiveNotice}>
          <Ionicons name="archive" size={15} color="#64748B" />
          <Text style={styles.closedArchiveNoticeText}>
            {t('closedCasesNotice')} ({closedCases.length})
          </Text>
        </View>
      )}

      {/* Patient Cards List (Arrival sequence preserved) */}
      <FlatList
        data={displayedCases}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>{t('noPatientsMatch')}</Text>
            <Text style={styles.emptyStateDesc}>
              {t('emptySearchSub')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusColor(item.treatmentStatus);
          const pendingDocs = item.requestedDocuments.filter((d: RequestedDocument) => d.status === 'pending');
          const isCritical = item.priorityNote?.level === 'CRITICAL';
          const isHighOrUrgent = item.priorityNote?.level === 'HIGH' || item.priorityNote?.level === 'URGENT';
          const isClosed = ['Discharged', 'Completed'].includes(item.treatmentStatus);

          return (
            <TouchableOpacity
              style={[
                styles.patientCard,
                isClosed
                  ? styles.patientCardClosed
                  : isCritical
                  ? styles.patientCardCritical
                  : isHighOrUrgent
                  ? styles.patientCardHigh
                  : null,
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PatientCaseDetails', { caseId: item.id, patient: item })}
            >
              {/* Top Row: Scheme badge, Priority Pill & Case ID */}
              <View style={styles.cardTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View style={styles.schemeBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#0284C7" />
                    <Text style={styles.schemeBadgeText}>{item.schemeName}</Text>
                  </View>

                  {(item.isReassigned || item.priorityNote?.badge === 'Reassigned Case') && (
                    <View style={styles.reassignedBadgePill}>
                      <Ionicons name="repeat" size={11} color="#7C3AED" />
                      <Text style={styles.reassignedBadgePillText}>🔄 {t('reassignedCaseBadge')}</Text>
                    </View>
                  )}

                  {!isClosed && (isCritical || isHighOrUrgent) && (
                    <View
                      style={[
                        styles.priorityBadgePill,
                        isCritical ? styles.priorityBadgeCritical : styles.priorityBadgeHigh,
                      ]}
                    >
                      <Text style={styles.priorityBadgePillText}>
                        {isCritical ? `🚨 ${t('criticalPriorityBadge')}` : `⚠️ ${t('highPriorityBadge')}`}
                      </Text>
                    </View>
                  )}

                  {!isClosed && item.activeEscalation?.status === 'PENDING_ADMIN_REVIEW' && (
                    <View style={styles.escalationTopBadge}>
                      <Ionicons name="flash" size={10} color="#DC2626" />
                      <Text style={styles.escalationTopBadgeText}>
                        {item.activeEscalation.holdCase ? `⏸️ ${t('onHoldBadge')}` : `⚡ ${t('escalatedBadge')}`}
                      </Text>
                    </View>
                  )}

                  {isClosed && (
                    <View style={styles.closedBadgePill}>
                      <Text style={styles.closedBadgePillText}>{t('closedBadgeText')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.caseIdText}>{item.id}</Text>
              </View>

              {/* Patient Name */}
              <View style={styles.nameRow}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>

              {/* Priority Note Callout Banner (Prominent Alert!) */}
              {item.priorityNote && !item.isTransferredOut && (
                <View
                  style={[
                    styles.priorityBanner,
                    item.priorityNote.level === 'CRITICAL'
                      ? styles.priorityCritical
                      : styles.priorityHigh,
                  ]}
                >
                  <View style={styles.priorityHeaderRow}>
                    <Ionicons
                      name="alert-circle"
                      size={15}
                      color={item.priorityNote.level === 'CRITICAL' ? '#DC2626' : '#D97706'}
                    />
                    <Text
                      style={[
                        styles.priorityLevelText,
                        {
                          color:
                            item.priorityNote.level === 'CRITICAL' ? '#DC2626' : '#D97706',
                        },
                      ]}
                    >
                      {t('adminPriorityNoteHeader')} ({clinicalDataTranslator.translatePriorityLevel(item.priorityNote.level, language)})
                    </Text>
                  </View>
                  <Text style={styles.priorityContent} numberOfLines={2}>
                    {clinicalDataTranslator.translateAdminNote(item.priorityNote.text, language)}
                  </Text>
                </View>
              )}

              {/* Transferred Banner for Transferred Out Cases */}
              {(item.isTransferredOut || item.treatmentStatus === 'Transferred') && (
                <View style={styles.transferredCardBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="swap-horizontal" size={14} color="#7C3AED" />
                    <Text style={styles.transferredCardBannerTitle} numberOfLines={1}>
                      {t('transferredToHospitalLabel')}: {item.assignedToNewHospital || t('newAssignedHospital')}
                    </Text>
                  </View>
                  {item.assignedToNewSevak && (
                    <Text style={styles.transferredCardBannerSub} numberOfLines={1}>
                      {t('sevakLabel')}: {item.assignedToNewSevak.name} {item.assignedToNewSevak.phone ? `(📱 ${item.assignedToNewSevak.phone})` : ''}
                    </Text>
                  )}
                  <View style={styles.dispatchPillRow}>
                    <View
                      style={[
                        styles.dispatchPill,
                        item.patientMovedStatus === 'MOVED'
                          ? styles.dispatchPillMoved
                          : styles.dispatchPillPending,
                      ]}
                    >
                      <Ionicons
                        name={item.patientMovedStatus === 'MOVED' ? 'checkmark-circle' : 'time'}
                        size={12}
                        color={item.patientMovedStatus === 'MOVED' ? '#15803D' : '#B45309'}
                      />
                      <Text
                        style={[
                          styles.dispatchPillText,
                          {
                            color: item.patientMovedStatus === 'MOVED' ? '#15803D' : '#B45309',
                          },
                        ]}
                      >
                        {item.patientMovedStatus === 'MOVED'
                          ? `✓ ${t('patientMovedDone')} (${item.patientMovedAt || t('dispatchedStatus')})`
                          : `⏳ ${t('patientMovedPending')}`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Diagnosis and Ward */}
              <Text style={styles.diagnosisText} numberOfLines={2}>
                {clinicalDataTranslator.translateDiagnosis(item.diagnosis, language)}
              </Text>

              <View style={styles.wardRow}>
                <Ionicons name="bed-outline" size={13} color="#64748B" />
                <Text style={styles.wardText}>
                  {clinicalDataTranslator.translateWard(item.assignedWard, language)} ({item.bedNumber})
                </Text>
              </View>

              {/* Document Request Badge */}
              {pendingDocs.length > 0 && !item.isTransferredOut && (
                <View style={styles.pendingDocsBadge}>
                  <Ionicons name="document-text" size={14} color="#B45309" />
                  <Text style={styles.pendingDocsText}>
                    {pendingDocs.length} {t('docsRequestedByAdmin')}
                  </Text>
                  <Text style={styles.actionPrompt}>{t('uploadNow')}</Text>
                </View>
              )}

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: statusStyle.bg,
                      borderColor: statusStyle.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: statusStyle.text }]}
                  />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {item.isTransferredOut
                      ? clinicalDataTranslator.translateTreatmentStatus('Transferred', language)
                      : clinicalDataTranslator.translateTreatmentStatus(item.treatmentStatus, language)}
                  </Text>
                </View>

                <View style={styles.viewCaseLink}>
                  <Text style={styles.viewCaseText}>{t('viewDetailsAction')}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </View>
              </View>
            </TouchableOpacity>
          );
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 20,
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
  hospitalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  hospitalButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 8,
    paddingVertical: 0,
  },
  mainTabSegment: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mainTabBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  mainTabBtnTransferredActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  mainTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  mainTabBtnTextActive: {
    color: '#047857',
  },
  mainTabBtnTextTransferredActive: {
    color: '#7C3AED',
  },
  transferredNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  transferredNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
    flex: 1,
  },
  transferredCardBanner: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    padding: 9,
    marginBottom: 8,
  },
  transferredCardBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
    flex: 1,
  },
  transferredCardBannerSub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 3,
  },
  dispatchPillRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  dispatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  dispatchPillMoved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  dispatchPillPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  dispatchPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closedArchiveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closedArchiveNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  filtersWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  filterList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    padding: 14,
    paddingBottom: 60,
    gap: 12,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  patientCardCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFFFF',
  },
  patientCardHigh: {
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    backgroundColor: '#FFFFFF',
  },
  patientCardClosed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderLeftWidth: 4,
    borderLeftColor: '#94A3B8',
  },
  reassignedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reassignedBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
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
    letterSpacing: 0.3,
  },
  closedBadgePill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },
  escalationTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  escalationTopBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  schemeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  caseIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  patientMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  diagnosisText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  wardText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  priorityBanner: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  priorityCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  priorityHigh: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  priorityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  priorityLevelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  priorityContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  pendingDocsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  pendingDocsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewCaseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewCaseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
});
