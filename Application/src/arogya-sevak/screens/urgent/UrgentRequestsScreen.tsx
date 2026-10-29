import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { clinicalDataTranslator } from '../../../shared/services/clinicalDataTranslator';
import {
  AllocatedPatientCase,
  sevakHospitalService,
} from '../../services/sevakHospitalService';
import {
  sevakEscalationService,
  DynamicEscalationItem,
  EscalationStats,
} from '../../services/sevakEscalationService';
import { CaseAdminEscalationModal } from '../../components/CaseAdminEscalationModal';

type FilterTab = 'ALL' | 'ON_HOLD' | 'RESOLVED';

export const UrgentRequestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCases, setAllCases] = useState<AllocatedPatientCase[]>([]);
  const [escalations, setEscalations] = useState<DynamicEscalationItem[]>([]);
  const [stats, setStats] = useState<EscalationStats>({
    all: 0,
    onHold: 0,
    resolved: 0,
    billExceeded: 0,
    specialtyUnavailable: 0,
  });
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Patient Picker & Escalation Modal State
  const [patientPickerVisible, setPatientPickerVisible] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedCaseForEscalation, setSelectedCaseForEscalation] = useState<AllocatedPatientCase | null>(null);
  const [escalationModalVisible, setEscalationModalVisible] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [escData, cases] = await Promise.all([
        sevakEscalationService.getEscalations(),
        sevakHospitalService.getAllocatedCases().catch(() => []),
      ]);

      setEscalations(escData.requests || []);
      setStats(escData.stats);
      setAllCases(cases || []);
    } catch (e) {
      console.warn('Failed to load dynamic escalations from DB', e);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Filtered list by Tab and Search from DB records
  const filteredEscalations = useMemo(() => {
    return escalations.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.patientName.toLowerCase().includes(q) ||
        c.caseId.toLowerCase().includes(q) ||
        (c.reasonTitle && c.reasonTitle.toLowerCase().includes(q)) ||
        (c.remarks && c.remarks.toLowerCase().includes(q)) ||
        (c.requiredSpecialty && c.requiredSpecialty.toLowerCase().includes(q)) ||
        (c.ward && c.ward.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeTab === 'ON_HOLD') {
        return c.status === 'on_hold' || c.putOnHold;
      }
      if (activeTab === 'RESOLVED') {
        return c.status === 'resolved' || Boolean(c.resolutionNotes);
      }

      return true;
    });
  }, [escalations, activeTab, searchQuery]);

  // Patients available for selection in Picker
  const selectablePatients = useMemo(() => {
    return allCases.filter((c) => {
      const q = patientSearchQuery.toLowerCase();
      return (
        !patientSearchQuery ||
        c.patientName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.diagnosis.toLowerCase().includes(q) ||
        c.assignedWard.toLowerCase().includes(q)
      );
    });
  }, [allCases, patientSearchQuery]);

  const handleSelectPatient = (patient: AllocatedPatientCase) => {
    setSelectedCaseForEscalation(patient);
    setPatientPickerVisible(false);
    setEscalationModalVisible(true);
  };

  const handleOpenAttachment = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Open Link', 'The document link could not be opened.');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Screen Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerInfo}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="flash" size={15} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {t('urgentRequestsTitle')}
            </Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
            {t('urgentRequestsSubtitle')}
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={styles.refreshHeaderBtn}
            activeOpacity={0.75}
            onPress={onRefresh}
            disabled={refreshing || loading}
            accessibilityLabel="Refresh priority requests"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createEscalationBtn}
            activeOpacity={0.85}
            onPress={() => {
              setPatientSearchQuery('');
              setPatientPickerVisible(true);
            }}
          >
            <Ionicons name="add" size={16} color="#047857" />
            <Text style={styles.createEscalationBtnText}>
              {t('createUrgentRequestBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchUrgentPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Unified Filter Tabs with Live Status Badges */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {/* ALL */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeTab === 'ALL' && styles.filterChipActiveAll,
            ]}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="layers-outline"
              size={14}
              color={activeTab === 'ALL' ? '#047857' : '#64748B'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeTab === 'ALL' && styles.filterChipTextActiveAll,
              ]}
            >
              {t('filterAll')}
            </Text>
            <View
              style={[
                styles.chipBadge,
                activeTab === 'ALL' ? styles.chipBadgeActiveAll : styles.chipBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.chipBadgeText,
                  activeTab === 'ALL' ? styles.chipBadgeTextActiveAll : styles.chipBadgeTextInactive,
                ]}
              >
                {stats.all}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ON_HOLD */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeTab === 'ON_HOLD' && styles.filterChipActiveHold,
            ]}
            onPress={() => setActiveTab('ON_HOLD')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="pause-circle"
              size={14}
              color={activeTab === 'ON_HOLD' ? '#B45309' : '#D97706'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeTab === 'ON_HOLD' && styles.filterChipTextActiveHold,
              ]}
            >
              {t('onHoldBadge')}
            </Text>
            <View
              style={[
                styles.chipBadge,
                activeTab === 'ON_HOLD' ? styles.chipBadgeActiveHold : styles.chipBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.chipBadgeText,
                  activeTab === 'ON_HOLD' ? styles.chipBadgeTextActiveHold : styles.chipBadgeTextInactive,
                ]}
              >
                {stats.onHold}
              </Text>
            </View>
          </TouchableOpacity>

          {/* RESOLVED */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeTab === 'RESOLVED' && styles.filterChipActiveResolved,
            ]}
            onPress={() => setActiveTab('RESOLVED')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={activeTab === 'RESOLVED' ? '#15803D' : '#16A34A'}
            />
            <Text
              style={[
                styles.filterChipText,
                activeTab === 'RESOLVED' && styles.filterChipTextActiveResolved,
              ]}
            >
              {t('filterResolved')}
            </Text>
            <View
              style={[
                styles.chipBadge,
                activeTab === 'RESOLVED' ? styles.chipBadgeActiveResolved : styles.chipBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.chipBadgeText,
                  activeTab === 'RESOLVED' ? styles.chipBadgeTextActiveResolved : styles.chipBadgeTextInactive,
                ]}
              >
                {stats.resolved}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading priority requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEscalations}
          keyExtractor={(item) => item.uuid || item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#047857']}
              tintColor="#047857"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="flash-outline" size={32} color="#047857" />
              </View>
              <Text style={styles.emptyTitle}>{t('noUrgentRequestsYet')}</Text>
              <Text style={styles.emptySub}>{t('noUrgentRequestsSub')}</Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setPatientSearchQuery('');
                  setPatientPickerVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCreateBtnText}>{t('createUrgentRequestBtn')}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isOnHold = item.status === 'on_hold' || item.putOnHold;
            const isResolved = item.status === 'resolved' || Boolean(item.resolutionNotes);
            const isBill = item.reasonType === 'bill_exceeded';

            return (
              <View
                style={[
                  styles.caseCard,
                  isOnHold ? styles.caseCardOnHold : isResolved ? styles.caseCardResolved : null,
                ]}
              >
                {/* Top Row: Patient Info & Case ID */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      {isOnHold && (
                        <View style={styles.onHoldTag}>
                          <Ionicons name="pause" size={10} color="#D97706" />
                          <Text style={styles.onHoldTagText}>{t('onHoldBadge')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.patientSub}>
                      {item.ageGender} • {item.ward}
                    </Text>
                  </View>

                  <View style={styles.caseIdBadge}>
                    <Text style={styles.caseIdBadgeText}>#{item.caseId}</Text>
                  </View>
                </View>

                {/* Escalation Type Badge & Live Status */}
                <View style={styles.escalationTypeBar}>
                  <View style={styles.escalationTypeBadge}>
                    <Ionicons
                      name={isBill ? 'receipt' : 'medical'}
                      size={16}
                      color={isBill ? '#D97706' : '#7C3AED'}
                    />
                    <Text
                      style={[
                        styles.escalationTypeBarText,
                        { color: isBill ? '#DC2626' : '#7C3AED' },
                      ]}
                      numberOfLines={2}
                    >
                      {item.reasonTitle || (isBill ? 'Hospital Bill Exceeded' : 'Specialty Unavailable')}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isOnHold ? styles.statusPillPending : styles.statusPillResolved,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isOnHold ? '#B45309' : '#15803D' },
                      ]}
                      numberOfLines={1}
                    >
                      {isOnHold ? `⏳ ${item.statusLabel || 'ON HOLD'}` : `✓ ${item.statusLabel || 'RESOLVED'}`}
                    </Text>
                  </View>
                </View>

                {/* Overrun or Missing Specialty Details */}
                {item.estimatedBill ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('approxBillLabel')}:</Text>
                    <Text style={[styles.detailValue, { color: '#DC2626', fontWeight: '700' }]}>
                      ₹{item.estimatedBill}
                    </Text>
                  </View>
                ) : null}

                {item.requiredSpecialty ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('requiredSpecialtyLabel')}:</Text>
                    <Text style={[styles.detailValue, { color: '#7C3AED', fontWeight: '700' }]}>
                      {item.requiredSpecialty}
                    </Text>
                  </View>
                ) : null}

                {/* Sevak Note */}
                {item.remarks ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>"{item.remarks}"</Text>
                  </View>
                ) : null}

                {/* Attached Document Indicator with Open Link */}
                {(item.attachment || item.attachmentUrl) && (
                  <TouchableOpacity
                    style={styles.docAttachmentPill}
                    activeOpacity={item.attachmentUrl ? 0.7 : 1}
                    onPress={() => handleOpenAttachment(item.attachmentUrl)}
                  >
                    <Ionicons name="document-attach" size={14} color="#0284C7" />
                    <Text style={[styles.docAttachmentText, { flex: 1 }]} numberOfLines={1}>
                      {item.attachment || 'Supportive Document'}
                    </Text>
                    {item.attachmentUrl ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>Open</Text>
                        <Ionicons name="open-outline" size={12} color="#0284C7" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                )}

                {/* Timestamp & Sevak Attribution */}
                <Text style={styles.submittedAtText}>
                  Submitted: {item.submittedAt} by {item.submittedBy}
                </Text>

                {/* Admin Resolution Box (When Resolved) */}
                {item.resolutionNotes ? (
                  <View style={styles.adminResolutionCard}>
                    <View style={styles.adminResHeader}>
                      <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                      <Text style={styles.adminResTitle}>{t('adminDecisionTitle')}:</Text>
                      <View style={styles.decisionBadge}>
                        <Text style={styles.decisionBadgeText}>
                          {item.sanctionedScheme || 'APPROVED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.adminResNote}>
                      "{item.resolutionNotes}"
                    </Text>
                    {item.resolvedAt ? (
                      <Text style={styles.adminResMeta}>
                        Resolved: {new Date(item.resolvedAt).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Card Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewCaseBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('PatientCaseDetails', { caseId: item.applicationId || item.caseId })}
                  >
                    <Text style={styles.viewCaseBtnText}>{t('viewCaseAndUploads')}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Patient Picker Modal */}
      <Modal
        visible={patientPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPatientPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.pickerTitle}>{t('selectPatientForEscalation')}</Text>
                <Text style={styles.pickerSubtitle}>
                  {t('selectPatientSub')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPatientPickerVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={t('searchUrgentPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
              />
            </View>

            <FlatList
              data={selectablePatients}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.patientItemCard}
                  activeOpacity={0.75}
                  onPress={() => handleSelectPatient(item)}
                >
                  <View style={styles.patientItemAvatar}>
                    <Ionicons name="person" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.patientItemName}>{item.patientName}</Text>
                      <Text style={styles.patientItemId}>#{item.id}</Text>
                    </View>
                    <Text style={styles.patientItemMeta}>
                      {clinicalDataTranslator.formatAgeGender(item.age, item.gender, language)} •{' '}
                      {clinicalDataTranslator.translateWard(item.assignedWard, language)} (Bed {item.bedNumber})
                    </Text>
                    <Text style={styles.patientItemDiag} numberOfLines={1}>
                      {clinicalDataTranslator.translateDiagnosis(item.diagnosis, language)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPatientPickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Direct Escalation Modal */}
      <CaseAdminEscalationModal
        visible={escalationModalVisible}
        patientCase={selectedCaseForEscalation}
        onClose={() => {
          setEscalationModalVisible(false);
          setSelectedCaseForEscalation(null);
        }}
        onSuccess={async () => {
          setEscalationModalVisible(false);
          setSelectedCaseForEscalation(null);
          await loadData();
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    paddingLeft: 36,
    fontWeight: '500',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createEscalationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  createEscalationBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
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
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chipBadgeTextInactive: {
    color: '#64748B',
  },

  // Active styles per category
  filterChipActiveAll: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  filterChipTextActiveAll: {
    color: '#047857',
    fontWeight: '700',
  },
  chipBadgeActiveAll: {
    backgroundColor: '#047857',
  },
  chipBadgeTextActiveAll: {
    color: '#FFFFFF',
  },

  filterChipActiveHold: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  filterChipTextActiveHold: {
    color: '#B45309',
    fontWeight: '700',
  },
  chipBadgeActiveHold: {
    backgroundColor: '#B45309',
  },
  chipBadgeTextActiveHold: {
    color: '#FFFFFF',
  },

  filterChipActivePending: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  filterChipTextActivePending: {
    color: '#0284C7',
    fontWeight: '700',
  },
  chipBadgeActivePending: {
    backgroundColor: '#0284C7',
  },
  chipBadgeTextActivePending: {
    color: '#FFFFFF',
  },

  filterChipActiveResolved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  filterChipTextActiveResolved: {
    color: '#15803D',
    fontWeight: '700',
  },
  chipBadgeActiveResolved: {
    backgroundColor: '#15803D',
  },
  chipBadgeTextActiveResolved: {
    color: '#FFFFFF',
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#047857',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  caseCardOnHold: {
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF7',
  },
  caseCardResolved: {
    borderLeftWidth: 4,
    borderLeftColor: '#15803D',
    borderColor: '#BBF7D0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  onHoldTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onHoldTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  patientSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  caseIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseIdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  escalationTypeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  escalationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 140,
  },
  escalationTypeBarText: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  docAttachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  docAttachmentText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  submittedAtText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  adminResolutionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  adminResHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminResTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  decisionBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  decisionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  adminResNote: {
    fontSize: 12,
    color: '#0F172A',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  adminResMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  simulateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  viewCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewCaseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 6,
    paddingVertical: 0,
  },
  patientItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  patientItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientItemId: {
    fontSize: 11,
    color: '#64748B',
  },
  patientItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  patientItemDiag: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 1,
  },
  pickerCancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  pickerCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
