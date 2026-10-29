import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform,
  Linking,
  Image,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { LanguageModal } from '../../../shared/components/LanguageModal';
import { alertsStore, AdminAlert, AlertType } from '../../services/alertsStore';

type FilterCategory =
  | 'ALL'
  | 'UNSEEN'
  | 'SEEN'
  | 'ACTION_NEEDED'
  | 'APPROVED'
  | 'SEVAK'
  | 'BROADCASTS';

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);

  // Confirmation Modals State
  const [showClearSeenModal, setShowClearSeenModal] = useState<boolean>(false);
  const [alertToDismiss, setAlertToDismiss] = useState<AdminAlert | null>(null);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const loadAlerts = useCallback(async (isRefresh: boolean = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await alertsStore.getAlerts(isRefresh);
      setAlerts(data);
    } catch (err) {
      console.warn('[AlertsScreen] Error loading alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts(true);
    }, [loadAlerts])
  );

  useEffect(() => {
    const unsubscribe = alertsStore.subscribe(() => {
      alertsStore.getAlerts().then(setAlerts);
    });
    return unsubscribe;
  }, []);

  const handleMarkAllAsRead = async () => {
    await alertsStore.markAllAsRead();
    const updated = await alertsStore.getAlerts();
    setAlerts(updated);
  };

  const handleAlertPress = async (alert: AdminAlert) => {
    // When seen/clicked, mark as seen
    await alertsStore.markAsSeen(alert.id);

    if (alert.actionType === 'UPLOAD_DOC' && alert.applicationId) {
      navigation.navigate('CaseDetails', { applicationId: alert.applicationId });
    } else if (alert.actionType === 'VIEW_CASE' && alert.applicationId) {
      navigation.navigate('CaseDetails', { applicationId: alert.applicationId });
    } else if (alert.actionType === 'CALL_SEVAK' && alert.sevakPhone) {
      Linking.openURL(`tel:${alert.sevakPhone}`);
    }
  };

  const handleActionPress = async (alert: AdminAlert) => {
    await alertsStore.markAsSeen(alert.id);
    if (alert.actionType === 'UPLOAD_DOC' && alert.applicationId) {
      navigation.navigate('CaseDetails', { applicationId: alert.applicationId });
    } else if (alert.actionType === 'VIEW_CASE' && alert.applicationId) {
      navigation.navigate('CaseDetails', { applicationId: alert.applicationId });
    } else if (alert.actionType === 'CALL_SEVAK' && alert.sevakPhone) {
      Linking.openURL(`tel:${alert.sevakPhone}`);
    } else if (alert.applicationId) {
      navigation.navigate('CaseDetails', { applicationId: alert.applicationId });
    }
  };

  const handleClearSingleAlert = async () => {
    if (alertToDismiss) {
      await alertsStore.clearAlert(alertToDismiss.id);
      setAlertToDismiss(null);
      const updated = await alertsStore.getAlerts();
      setAlerts(updated);
    }
  };

  const handleClearSeenConfirmed = async () => {
    setShowClearSeenModal(false);
    await alertsStore.clearSeenAlerts();
    const updated = await alertsStore.getAlerts();
    setAlerts(updated);
  };

  // Filter & Search Logic
  const filteredAlerts = alerts.filter((item) => {
    // 1. Seen / Unseen / Category Filters
    if (selectedFilter === 'UNSEEN' && item.isRead) {
      return false;
    }
    if (selectedFilter === 'SEEN' && !item.isRead) {
      return false;
    }
    if (selectedFilter === 'ACTION_NEEDED' && item.type !== 'DOC_REQUEST') {
      return false;
    }
    if (selectedFilter === 'APPROVED' && item.type !== 'APPROVED') {
      return false;
    }
    if (selectedFilter === 'SEVAK' && item.type !== 'SEVAK_ASSIGNED') {
      return false;
    }
    if (
      selectedFilter === 'BROADCASTS' &&
      !['ANNOUNCEMENT', 'SCHEME_UPDATE', 'ADVISORY'].includes(item.type)
    ) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title?.toLowerCase().includes(q) || item.titleEn?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q) || item.messageEn?.toLowerCase().includes(q);
      const matchCase = item.caseId?.toLowerCase().includes(q);
      const matchPatient = item.patientName?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchCase || matchPatient;
    }

    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const seenCount = alerts.filter((a) => a.isRead).length;
  const actionRequiredCount = alerts.filter((a) => a.type === 'DOC_REQUEST').length;

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'DOC_REQUEST':
        return { name: 'alert-circle', color: '#DC2626', bg: '#FEE2E2' };
      case 'APPROVED':
        return { name: 'checkmark-circle', color: '#059669', bg: '#D1FAE5' };
      case 'SEVAK_ASSIGNED':
        return { name: 'person', color: '#0A5C53', bg: '#E8F4F2' };
      case 'IN_REVIEW':
        return { name: 'time', color: '#0284C7', bg: '#E0F2FE' };
      case 'SCHEME_UPDATE':
        return { name: 'shield-checkmark', color: '#7C3AED', bg: '#EDE9FE' };
      case 'ANNOUNCEMENT':
      case 'ADVISORY':
      default:
        return { name: 'megaphone', color: '#D97706', bg: '#FEF3C7' };
    }
  };

  const getLocalizedTitle = (item: AdminAlert) => {
    if (language === 'en' && item.titleEn) return item.titleEn;
    if (language === 'hi' && item.titleHi) return item.titleHi;
    return item.title;
  };

  const getLocalizedMessage = (item: AdminAlert) => {
    if (language === 'en' && item.messageEn) return item.messageEn;
    if (language === 'hi' && item.messageHi) return item.messageHi;
    return item.message;
  };

  const getLocalizedSender = (item: AdminAlert) => {
    if (language === 'en' && item.senderEn) return item.senderEn;
    if (language === 'hi' && item.senderHi) return item.senderHi;
    return item.sender;
  };

  const getLocalizedBadge = (item: AdminAlert) => {
    if (language === 'en' && item.badgeEn) return item.badgeEn;
    if (language === 'hi' && item.badgeHi) return item.badgeHi;
    return item.badge;
  };

  const getLocalizedDate = (item: AdminAlert) => {
    if (language === 'en' && item.dateEn) return item.dateEn;
    return item.date;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../../../assets/arogya_mitra_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>{t('alertsTitle')}</Text>
              <Text style={styles.headerSubtitle}>{t('alertsSubtitle')}</Text>
            </View>
          </View>

          {/* Language Selection Dropdown */}
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
        </View>

        {/* Unread, Seen & Action Controls */}
        <View style={styles.statsBar}>
          <View style={styles.statsLeft}>
            {/* Unread / Unseen Counter */}
            <View style={styles.unreadPill}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>
                {unreadCount} {t('unreadNotificationsCount')}
              </Text>
            </View>

            {/* Seen Counter */}
            {seenCount > 0 && (
              <View style={styles.seenPill}>
                <Ionicons name="checkmark-done" size={13} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.seenPillText}>
                  {seenCount} {t('seenNotificationsCount')}
                </Text>
              </View>
            )}

            {/* Urgent / Action Needed Counter */}
            {actionRequiredCount > 0 && (
              <View style={styles.actionPill}>
                <Ionicons name="warning" size={13} color="#DC2626" />
                <Text style={styles.actionPillText}>
                  {actionRequiredCount} {t('filterActionNeeded')}
                </Text>
              </View>
            )}
          </View>

          {/* Right Action Controls: Clear Seen Button */}
          <View style={styles.statsRight}>
            {seenCount > 0 ? (
              <TouchableOpacity
                style={styles.clearSeenBtn}
                onPress={() => setShowClearSeenModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                <Text style={styles.clearSeenBtnText}>{t('clearSeen')}</Text>
              </TouchableOpacity>
            ) : unreadCount > 0 ? (
              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                <Text style={styles.markAllText}>{t('markAllRead')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Action Required Alert Banner */}
      {actionRequiredCount > 0 && (
        <View style={styles.actionBanner}>
          <View style={styles.actionBannerIconCircle}>
            <Ionicons name="alert" size={18} color="#B45309" />
          </View>
          <View style={styles.actionBannerTextCol}>
            <Text style={styles.actionBannerTitle}>{t('pendingActionAlertHeader')}</Text>
            <Text style={styles.actionBannerSub}>{t('pendingActionAlertDesc')}</Text>
          </View>
          <TouchableOpacity
            style={styles.actionBannerBtn}
            onPress={() => setSelectedFilter('ACTION_NEEDED')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBannerBtnText}>{t('viewDetailsBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchAlertsPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category & Status Filter Chips */}
      <View style={styles.filterScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          data={[
            { id: 'ALL', label: t('filterAllAlerts'), count: alerts.length },
            { id: 'UNSEEN', label: t('filterUnseen'), count: unreadCount },
            { id: 'SEEN', label: t('filterSeen'), count: seenCount },
            { id: 'ACTION_NEEDED', label: t('filterActionNeeded'), count: actionRequiredCount, isAlert: actionRequiredCount > 0 },
            { id: 'APPROVED', label: t('filterApprovals'), count: alerts.filter((a) => a.type === 'APPROVED').length },
            { id: 'SEVAK', label: t('filterSevakUpdates'), count: alerts.filter((a) => a.type === 'SEVAK_ASSIGNED').length },
            { id: 'BROADCASTS', label: t('filterBroadcasts'), count: alerts.filter((a) => ['ANNOUNCEMENT', 'SCHEME_UPDATE', 'ADVISORY'].includes(a.type)).length },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  item.isAlert && !isSelected && styles.filterChipAlert,
                ]}
                onPress={() => setSelectedFilter(item.id as FilterCategory)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
                {item.count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      isSelected && styles.filterBadgeActive,
                      item.isAlert && !isSelected && styles.filterBadgeAlert,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        isSelected && styles.filterBadgeTextActive,
                        item.isAlert && !isSelected && styles.filterBadgeTextAlert,
                      ]}
                    >
                      {item.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Notification Cards List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAlerts(true)}
            colors={[colors.citizen.primary]}
            tintColor={colors.citizen.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={38} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>{t('noAlertsTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('noAlertsSub')}</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const iconConfig = getAlertIcon(item.type);
          const isDocRequest = item.type === 'DOC_REQUEST';
          const isApproved = item.type === 'APPROVED';
          const isSevak = item.type === 'SEVAK_ASSIGNED';

          return (
            <TouchableOpacity
              style={[
                styles.alertCard,
                !item.isRead && styles.alertCardUnread,
                isDocRequest && styles.alertCardCritical,
              ]}
              activeOpacity={0.9}
              onPress={() => handleAlertPress(item)}
            >
              {/* Top Meta Row */}
              <View style={styles.cardHeader}>
                <View style={styles.senderCol}>
                  <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.senderNameRow}>
                      <Text style={styles.senderText} numberOfLines={1}>
                        {getLocalizedSender(item)}
                      </Text>
                      <Ionicons name="shield-checkmark" size={13} color={colors.citizen.primary} />
                    </View>
                    <Text style={styles.dateText}>
                      {getLocalizedDate(item)} {item.timestamp ? `• ${item.timestamp}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Priority / Status Badge + Clear Close Button */}
                <View style={styles.badgeCol}>
                  {item.badge && (
                    <View
                      style={[
                        styles.tagBadge,
                        isDocRequest && styles.tagBadgeCritical,
                        isApproved && styles.tagBadgeSuccess,
                        isSevak && styles.tagBadgeSevak,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagBadgeText,
                          isDocRequest && styles.tagBadgeTextCritical,
                          isApproved && styles.tagBadgeTextSuccess,
                          isSevak && styles.tagBadgeTextSevak,
                        ]}
                      >
                        {getLocalizedBadge(item)}
                      </Text>
                    </View>
                  )}

                  {/* Seen vs New Status Indicator */}
                  {!item.isRead ? (
                    <View style={styles.cardUnreadDot} />
                  ) : (
                    <View style={styles.seenBadgeMini}>
                      <Ionicons name="checkmark" size={11} color="#10B981" />
                    </View>
                  )}

                  {/* Individual Notification Clear/Delete Option */}
                  <TouchableOpacity
                    style={styles.cardCloseBtn}
                    onPress={() => setAlertToDismiss(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={t('clearNotification')}
                  >
                    <Ionicons name="close" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title & Body */}
              <Text style={[styles.alertTitle, !item.isRead && styles.alertTitleUnread]}>
                {getLocalizedTitle(item)}
              </Text>
              <Text style={styles.alertBody}>{getLocalizedMessage(item)}</Text>

              {/* Revert Specific Highlight */}
              {isDocRequest && item.requestedDocName && (
                <View style={styles.revertBox}>
                  <Ionicons name="document-attach-outline" size={16} color="#DC2626" />
                  <View style={styles.revertTextCol}>
                    <Text style={styles.revertLabel}>{t('requestedDocLabel')}:</Text>
                    <Text style={styles.revertDocName}>{item.requestedDocName}</Text>
                  </View>
                </View>
              )}

              {/* Case ID / Patient Pill */}
              {item.caseId && (
                <View style={styles.metaPillRow}>
                  <View style={styles.caseIdPill}>
                    <Ionicons name="folder-open-outline" size={12} color="#0A5C53" />
                    <Text style={styles.caseIdPillText}>
                      {t('caseId')}: {item.caseId}
                    </Text>
                  </View>
                  {item.patientName && (
                    <View style={styles.patientPill}>
                      <Ionicons name="person-outline" size={12} color="#64748B" />
                      <Text style={styles.patientPillText}>{item.patientName}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isDocRequest ? (
                  <TouchableOpacity
                    style={styles.ctaButtonPrimary}
                    onPress={() => handleActionPress(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.ctaButtonPrimaryText}>{t('uploadDocCta')}</Text>
                  </TouchableOpacity>
                ) : isApproved ? (
                  <TouchableOpacity
                    style={styles.ctaButtonOutline}
                    onPress={() => handleActionPress(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.citizen.primary} />
                    <Text style={styles.ctaButtonOutlineText}>{t('viewCaseCta')}</Text>
                  </TouchableOpacity>
                ) : isSevak ? (
                  <View style={styles.sevakActions}>
                    {item.sevakPhone && (
                      <TouchableOpacity
                        style={styles.ctaButtonCall}
                        onPress={() => Linking.openURL(`tel:${item.sevakPhone}`)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                        <Text style={styles.ctaButtonCallText}>{t('callSevakCta')}</Text>
                      </TouchableOpacity>
                    )}
                    {item.applicationId && (
                      <TouchableOpacity
                        style={styles.ctaButtonOutline}
                        onPress={() => handleActionPress(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.ctaButtonOutlineText}>{t('viewCaseCta')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : item.applicationId ? (
                  <TouchableOpacity
                    style={styles.ctaButtonOutline}
                    onPress={() => handleActionPress(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaButtonOutlineText}>{t('viewCaseCta')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Confirmation Modal: Clear Seen Notifications */}
      <Modal
        visible={showClearSeenModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearSeenModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash" size={26} color="#D97706" />
            </View>
            <Text style={styles.modalTitle}>{t('confirmClearSeenTitle')}</Text>
            <Text style={styles.modalMsg}>{t('confirmClearSeenMsg')}</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowClearSeenModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleClearSeenConfirmed}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>{t('confirmClearBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal: Delete Individual Notification */}
      <Modal
        visible={Boolean(alertToDismiss)}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertToDismiss(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapRed}>
              <Ionicons name="trash-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>{t('confirmClearNotificationTitle')}</Text>
            <Text style={styles.modalMsg} numberOfLines={2}>
              {alertToDismiss ? getLocalizedTitle(alertToDismiss) : ''}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAlertToDismiss(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={handleClearSingleAlert}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDeleteText}>{t('confirmClearBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#F4F8F7',
  },
  header: {
    backgroundColor: colors.citizen.primary,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  logoImage: {
    width: 34,
    height: 34,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 3,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seenPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearSeenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  clearSeenBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  markAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBannerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBannerTextCol: {
    flex: 1,
  },
  actionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  actionBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  actionBannerBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBannerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E293B',
    padding: 0,
  },
  filterScrollWrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.citizen.primary,
    borderColor: colors.citizen.primary,
  },
  filterChipAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeAlert: {
    backgroundColor: '#FEE2E2',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  filterBadgeTextAlert: {
    color: '#DC2626',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 12,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2ECE9',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  alertCardUnread: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FBFFFD',
  },
  alertCardCritical: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFDFD',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  senderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  badgeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  tagBadgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  tagBadgeSevak: {
    backgroundColor: '#E8F4F2',
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  tagBadgeTextCritical: {
    color: '#DC2626',
  },
  tagBadgeTextSuccess: {
    color: '#059669',
  },
  tagBadgeTextSevak: {
    color: '#0A5C53',
  },
  cardUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.citizen.primary,
  },
  seenBadgeMini: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E8FDF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCloseBtn: {
    padding: 2,
    marginLeft: 2,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 21,
    marginBottom: 6,
  },
  alertTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  alertBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 8,
  },
  revertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  revertTextCol: {
    flex: 1,
  },
  revertLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  revertDocName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 1,
  },
  metaPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  caseIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caseIdPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0A5C53',
  },
  patientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  patientPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  ctaButtonPrimary: {
    backgroundColor: colors.citizen.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaButtonPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ctaButtonOutlineText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.citizen.primary,
  },
  sevakActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonCall: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ctaButtonCallText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },

  /* Confirmation Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconWrapRed: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
