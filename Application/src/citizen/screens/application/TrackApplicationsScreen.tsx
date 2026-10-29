import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
  ScrollView,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { applicationStore } from '../../services/applicationStore';
import { SchemeApplication, ApplicationStatus } from '../../types/application.types';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';

type FilterType = 'ALL' | 'REVERTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

const isHospitalAssigned = (hName?: string | null): boolean => {
  if (!hName) return false;
  const clean = hName.trim();
  return clean.length > 0 && clean !== '-' && clean !== '—' && clean !== 'null' && clean !== 'undefined' && clean !== 'None' && clean !== 'Government Hospital';
};

export const TrackApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [applications, setApplications] = useState<SchemeApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20
  );
  const bottomInset = Math.max(insets.bottom, 16);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const data = await applicationStore.getApplications(forceRefresh);
      setApplications(data);
    } catch (err) {
      console.error('[TrackApplicationsScreen] Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const revertedCount = applications.filter(
    (a) => a.status === 'REVERTED' || a.status === 'DOCS_REQUIRED' || a.status === 'ACTION_REQUIRED'
  ).length;

  const inReviewCount = applications.filter(
    (a) => a.status === 'IN_REVIEW' || a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED'
  ).length;

  const approvedCount = applications.filter(
    (a) => a.status === 'APPROVED' || a.status === 'COORDINATED' || a.status === 'TREATMENT_STARTED'
  ).length;

  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  const filteredApplications = applications.filter((app) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      app.id.toLowerCase().includes(query) ||
      (app.caseId && app.caseId.toLowerCase().includes(query)) ||
      (app.patientName && app.patientName.toLowerCase().includes(query)) ||
      (app.schemeName && app.schemeName.toLowerCase().includes(query)) ||
      (app.hospitalName && app.hospitalName.toLowerCase().includes(query)) ||
      (app.contactMobile && app.contactMobile.includes(query));

    if (!matchesSearch) return false;

    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'REVERTED') {
      return app.status === 'REVERTED' || app.status === 'DOCS_REQUIRED' || app.status === 'ACTION_REQUIRED';
    }
    if (selectedFilter === 'IN_REVIEW') {
      return (
        app.status === 'IN_REVIEW' ||
        app.status === 'UNDER_REVIEW' ||
        app.status === 'SUBMITTED'
      );
    }
    if (selectedFilter === 'APPROVED') {
      return (
        app.status === 'APPROVED' ||
        app.status === 'COORDINATED' ||
        app.status === 'TREATMENT_STARTED' ||
        app.status === 'COMPLETED'
      );
    }
    if (selectedFilter === 'REJECTED') {
      return app.status === 'REJECTED';
    }
    return true;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'REVERTED':
      case 'DOCS_REQUIRED':
      case 'ACTION_REQUIRED':
        return {
          bg: '#FEF2F2',
          text: '#DC2626',
          border: '#FECACA',
          label: t('statusActionNeeded') || 'कागदपत्रे हवीत',
          icon: 'alert-circle',
        };
      case 'IN_REVIEW':
      case 'UNDER_REVIEW':
        return {
          bg: '#EFF6FF',
          text: '#2563EB',
          border: '#BFDBFE',
          label: t('statusInReview') || 'पडताळणी सुरू',
          icon: 'time-outline',
        };
      case 'APPROVED':
      case 'COORDINATED':
      case 'TREATMENT_STARTED':
        return {
          bg: '#F0FDF4',
          text: '#16A34A',
          border: '#BBF7D0',
          label: t('statusApproved') || 'मंजूर',
          icon: 'checkmark-circle-outline',
        };
      case 'REJECTED':
        return {
          bg: '#FFF1F2',
          text: '#BE123C',
          border: '#FECDD3',
          label: t('statusRejected') || 'नामंजूर',
          icon: 'close-circle-outline',
        };
      case 'COMPLETED':
      case 'CLOSED':
        return {
          bg: '#F0FDFA',
          text: '#0D9488',
          border: '#99F6E4',
          label: t('statusCompleted') || 'पूर्ण झाले',
          icon: 'shield-checkmark-outline',
        };
      case 'SUBMITTED':
      default:
        return {
          bg: '#FAF5FF',
          text: '#9333EA',
          border: '#E9D5FF',
          label: t('statusSubmitted') || 'दाखल झाला',
          icon: 'paper-plane-outline',
        };
    }
  };

  const renderApplicationCard = ({ item }: { item: SchemeApplication }) => {
    const badge = getStatusBadge(item.status);
    const isReverted =
      item.status === 'REVERTED' ||
      item.status === 'DOCS_REQUIRED' ||
      item.status === 'ACTION_REQUIRED';
    const isApproved =
      item.status === 'APPROVED' ||
      item.status === 'COORDINATED' ||
      item.status === 'TREATMENT_STARTED';
    const isRejected = item.status === 'REJECTED';

    const genderLabel =
      item.gender === 'male' || item.gender === 'Male'
        ? t('genderMale') || 'पुरुष'
        : item.gender === 'female' || item.gender === 'Female'
        ? t('genderFemale') || 'महिला'
        : t('genderOther') || 'इतर';

    const schemeKey = `${item.schemeId || ''} ${item.schemeName || ''}`.toLowerCase();
    const isPmjayScheme = schemeKey.includes('pmjay') || schemeKey.includes('ayushman') || schemeKey.includes('आयुष्मान');
    const isMjpjayScheme = schemeKey.includes('mjpjay') || schemeKey.includes('jyotirao') || schemeKey.includes('jyotiba') || schemeKey.includes('phule') || schemeKey.includes('फुले');

    const localizedSchemeName = isPmjayScheme
      ? t('schemePmjay')
      : isMjpjayScheme
      ? t('schemeMjpjay')
      : item.schemeName || t('govtSchemeLabel') || 'शासकीय आरोग्य योजना';

    const isUnderReview = !isApproved && !isRejected && item.status !== 'COMPLETED' && item.status !== 'CLOSED';
    const priorityStr = (item.priority || 'REGULAR').toUpperCase();
    const isEmergency = priorityStr === 'EMERGENCY' || priorityStr === 'CRITICAL' || priorityStr === 'HIGH';
    const slaThresholdHours = isEmergency ? 1 : 6;
    const intervalMs = slaThresholdHours * 3600 * 1000;

    let submittedTimestamp = currentTime;
    if (item.submittedAt) {
      const d = new Date(item.submittedAt).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    } else if (item.createdAt) {
      const d = new Date(item.createdAt).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    } else if (item.appliedDate) {
      const d = new Date(item.appliedDate).getTime();
      if (!isNaN(d)) submittedTimestamp = d;
    }

    const lastReminderTimestamp = item.lastReminderSentAt
      ? new Date(item.lastReminderSentAt).getTime()
      : null;

    let canNotify = false;
    let remainingMs = 0;

    if (isUnderReview) {
      if (lastReminderTimestamp && !isNaN(lastReminderTimestamp)) {
        const elapsedSinceReminderMs = Math.max(0, currentTime - lastReminderTimestamp);
        remainingMs = Math.max(0, intervalMs - elapsedSinceReminderMs);
        canNotify = remainingMs === 0;
      } else {
        const elapsedSinceSubmissionMs = Math.max(0, currentTime - submittedTimestamp);
        remainingMs = Math.max(0, intervalMs - elapsedSinceSubmissionMs);
        canNotify = remainingMs === 0;
      }
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const pad = (num: number) => String(num).padStart(2, '0');

    let formattedRemaining = '';
    const hUnit = t('hoursShort') || 'तास';
    const mUnit = t('minsShort') || 'मि.';
    const sUnit = t('secsShort') || 'से.';
    if (remainingHours > 0) {
      formattedRemaining = `${remainingHours} ${hUnit} ${pad(remainingMinutes)} ${mUnit} ${pad(remainingSeconds)} ${sUnit}`;
    } else if (remainingMinutes > 0) {
      formattedRemaining = `${remainingMinutes} ${mUnit} ${pad(remainingSeconds)} ${sUnit}`;
    } else {
      formattedRemaining = `${remainingSeconds} ${sUnit}`;
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isReverted && styles.cardReverted,
          isApproved && styles.cardApproved,
          isRejected && styles.cardRejected,
        ]}
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate('CaseDetails', {
            applicationId: item.caseId || item.id,
          })
        }
      >
        {/* Header: Scheme Name & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.schemeName} numberOfLines={1}>
              {localizedSchemeName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              <Text style={styles.caseId}>
                {t('caseId') || 'केस क्र.'}: {item.caseId || item.id}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isEmergency ? '#FEF2F2' : '#F0FDF4',
                  borderColor: isEmergency ? '#FECACA' : '#BBF7D0',
                  borderWidth: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 4,
                  gap: 3,
                }}
              >
                <Ionicons
                  name={isEmergency ? 'flame' : 'shield-checkmark'}
                  size={10}
                  color={isEmergency ? '#DC2626' : '#16A34A'}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isEmergency ? '#DC2626' : '#16A34A',
                  }}
                >
                  {isEmergency ? t('priorityEmergency') : t('priorityRegular')}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Ionicons name={badge.icon as any} size={13} color={badge.text} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Patient and Hospital row */}
        <View style={styles.patientRow}>
          <Text style={styles.patientName}>
            {item.patientName}{' '}
            <Text style={styles.patientMeta}>
              ({item.age ? `${item.age} ${t('years') || 'वर्षे'}, ` : ''}{genderLabel})
            </Text>
          </Text>
          {isHospitalAssigned(item.hospitalName) ? (
            <Text style={styles.hospitalName} numberOfLines={1}>
              🏥 {item.hospitalName}
            </Text>
          ) : null}
        </View>

        {/* Action Required Banner (If Admin requested documents) */}
        {isReverted && (
          <View style={styles.actionNotice}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionNoticeHeader}>
                {t('statusActionNeeded') || 'कागदपत्र पूर्तता आवश्यक'}
              </Text>
              <Text style={styles.actionNoticeText} numberOfLines={2}>
                {item.revertDetails?.requestedDocName
                  ? `${t('requestedDocLabel') || 'मागितलेले कागदपत्र'}: ${item.revertDetails.requestedDocName}`
                  : item.revertDetails?.reason || (t('revertAlertSubtitle') || 'प्रशासनाकडून कागदपत्रांची मागणी करण्यात आली आहे. त्वरित अपलोड करा.')}
              </Text>
            </View>
            <Ionicons name="chevron-forward-circle" size={20} color="#DC2626" />
          </View>
        )}

        {/* Approved Grant Tag */}
        {isApproved && item.sanctionedAmount && (
          <View style={styles.approvedNotice}>
            <Ionicons name="gift" size={15} color="#15803D" style={{ marginRight: 6 }} />
            <Text style={styles.approvedNoticeText}>
              {t('sanctionedAmountLabel') || 'मंजूर रक्कम:'} <Text style={{ fontWeight: '800' }}>{item.sanctionedAmount}</Text> ({t('cashlessTreatment') || 'कॅशलेस उपचार'})
            </Text>
          </View>
        )}

        {/* Rejected Notice */}
        {isRejected && (
          <View>
            <View style={styles.rejectedNotice}>
              <Ionicons name="close-circle" size={16} color="#BE123C" style={{ marginRight: 6 }} />
              <Text style={styles.rejectedNoticeText} numberOfLines={1}>
                {t('rejectionReasonLabel') || 'कारण:'} {item.remarks || item.rejectionReason || (t('rejectionDefaultReason') || 'अटींची पूर्तता न झाल्यामुळे अर्ज नाकारला.')}
              </Text>
            </View>
            {item.reopenRequested && (
              <View style={[styles.rejectedNotice, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: 4 }]}>
                <Ionicons name="time" size={15} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={[styles.rejectedNoticeText, { color: '#1E40AF', fontWeight: '700' }]} numberOfLines={1}>
                  {t('reopenPendingNotice') || '🔄 फेरविचार विनंती पाठवली आहे (प्रशासकीय मंजुरी प्रलंबित)'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Priority SLA Live Countdown / Notify Admin Readiness */}
        {isUnderReview && (
          canNotify ? (
            <View style={styles.cardSlaActionBanner}>
              <Ionicons name="notifications" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.cardSlaActionText} numberOfLines={1}>
                {t('slaReminderReady') || `🔔 मुदत पूर्ण (${slaThresholdHours} तास) • प्रशासकास स्मरणपत्र पाठवा`}
              </Text>
            </View>
          ) : (
            <View style={styles.cardSlaTimerBanner}>
              <Ionicons
                name={item.lastReminderSentAt ? 'checkmark-circle' : 'timer-outline'}
                size={13}
                color="#047857"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.cardSlaTimerText} numberOfLines={1}>
                {item.lastReminderSentAt
                  ? (t('slaReminderSent') || '✓ स्मरणपत्र पाठवले • पुढील स्मरणपत्र ')
                  : `⏱️ मुदत (${slaThresholdHours} ${hUnit} SLA) • `}
                <Text style={styles.cardSlaCountdownBold}>{formattedRemaining}</Text>
                {t('slaReminderLater') || ' नंतर उपलब्ध'}
              </Text>
            </View>
          )
        )}

        {/* Card Footer: Date & View Link */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {t('appliedOn') || 'अर्ज दाखल तारीख'}: {item.appliedDate}
          </Text>
          <View style={styles.viewLink}>
            <Text style={styles.viewLinkText}>{t('viewDetailsBtn') || 'तपशील पहा'}</Text>
            <Ionicons name="chevron-forward" size={14} color="#0A5C53" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBack = useCallback((): boolean => {
    if (showLanguageModal) {
      setShowLanguageModal(false);
      return true;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CitizenTabs', { screen: 'Home' });
    }
    return true;
  }, [showLanguageModal, navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleBack();
    });
    return () => subscription.remove();
  }, [handleBack]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Clean Top Navigation Bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 6 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.pageTitle}>{t('trackAppTitle') || 'माझा अर्ज तपासा'}</Text>
            <Text style={styles.pageSubtitle}>{t('trackAppSubtitle') || 'दाखल केलेल्या अर्जांची सद्यस्थिती पहा'}</Text>
          </View>

          {/* Language Selection Dropdown Button */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select Language"
          >
            <Ionicons name="globe-outline" size={13} color="#0A5C53" style={{ marginRight: 3 }} />
            <Text style={styles.langText}>
              {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#0A5C53" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {applications.length} {t('appCountSuffix') || 'अर्ज'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchAppPlaceholder') || 'केस क्र., रुग्ण किंवा योजना शोधा...'}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'ALL' && styles.filterChipTextActive]}>
              {t('filterAll') || 'सर्व'} ({applications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'REVERTED' && styles.filterChipActiveRed,
              revertedCount > 0 && selectedFilter !== 'REVERTED' && styles.filterChipHighlightRed,
            ]}
            onPress={() => setSelectedFilter('REVERTED')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'REVERTED' && styles.filterChipTextActive,
                revertedCount > 0 && selectedFilter !== 'REVERTED' && { color: '#DC2626', fontWeight: '700' },
              ]}
            >
              {t('filterActionRequired') || 'कागदपत्रे हवीत'}
            </Text>
            {revertedCount > 0 && (
              <View style={[styles.chipCounter, selectedFilter === 'REVERTED' && { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.chipCounterText}>{revertedCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'IN_REVIEW' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('IN_REVIEW')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'IN_REVIEW' && styles.filterChipTextActive]}>
              {t('filterInReview') || 'पडताळणी सुरू'} ({inReviewCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'APPROVED' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('APPROVED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'APPROVED' && styles.filterChipTextActive]}>
              {t('filterApproved') || 'मंजूर'} ({approvedCount})
            </Text>
          </TouchableOpacity>

          {rejectedCount > 0 && (
            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === 'REJECTED' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('REJECTED')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, selectedFilter === 'REJECTED' && styles.filterChipTextActive]}>
                नामंजूर ({rejectedCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Applications List */}
      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.caseId || item.id}
        renderItem={renderApplicationCard}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadData(true)}
            colors={['#0A5C53']}
            tintColor="#0A5C53"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{t('emptyApplications') || 'कोणताही अर्ज सापडला नाही'}</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? t('emptySearchSub') || 'शोध निकषांनुसार निकाल आढळले नाहीत.' : t('emptyNoAppSub') || 'आपण अद्याप कोणताही अर्ज दाखल केलेला नाही.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('NewApplication')}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyActionBtnText}>{t('newAppFab') || 'नवीन अर्ज करा'}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating New Application Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottomInset + 16 }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('NewApplication')}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>{t('newAppFab') || 'नवीन अर्ज करा'}</Text>
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginRight: 6,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
  },
  totalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 4,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#0A5C53',
    borderColor: '#0A5C53',
  },
  filterChipActiveRed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipHighlightRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
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
  chipCounter: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  chipCounterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardReverted: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFAFA',
  },
  cardApproved: {
    borderColor: '#BBF7D0',
  },
  cardRejected: {
    borderColor: '#FECDD3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  schemeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  caseId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  patientRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  hospitalName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    marginTop: 2,
  },
  actionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  actionNoticeHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 1,
  },
  actionNoticeText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  approvedNoticeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  rejectedNoticeText: {
    fontSize: 11,
    color: '#BE123C',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5C53',
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A5C53',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#0A5C53',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardSlaTimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
    marginBottom: 4,
  },
  cardSlaTimerText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  cardSlaCountdownBold: {
    color: '#0A5C53',
    fontWeight: '800',
  },
  cardSlaActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  cardSlaActionText: {
    flex: 1,
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
