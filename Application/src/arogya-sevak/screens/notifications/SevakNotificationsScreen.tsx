import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { sevakNotificationService } from '../../services/sevakNotificationService';
import {
  SevakNotification,
  SevakNotificationPriority,
} from '../../types/sevakNotification.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterTabKey = 'PENDING' | 'URGENT' | 'ADMIN_ALERTS' | 'DUTY_CAMP' | 'SEEN_HISTORY';

export const SevakNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const isMarathi = language === 'mr';
  const isHindi = language === 'hi';

  const [notifications, setNotifications] = useState<SevakNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTabKey>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<SevakNotification | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  const fetchNotifications = async (isPullRefresh = false) => {
    if (!isPullRefresh) setLoading(true);
    try {
      const data = await sevakNotificationService.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.warn('Error loading Sevak notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkAsRead = async (id: string, e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      await sevakNotificationService.markAsRead(id);
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      await sevakNotificationService.markAllAsRead();
    } catch (err) {
      console.warn('Error marking all read:', err);
    }
  };

  const handleClearAllRead = async () => {
    setShowClearConfirmModal(false);
    try {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      await sevakNotificationService.clearSeenNotifications();
      if (activeTab === 'SEEN_HISTORY') {
        setActiveTab('PENDING');
      }
    } catch (err) {
      console.warn('Error clearing read notifications:', err);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const seenCount = useMemo(() => {
    return notifications.filter((n) => n.is_read).length;
  }, [notifications]);

  const criticalPendingCount = useMemo(() => {
    return notifications.filter((n) => ['CRITICAL', 'HIGH'].includes(n.priority) && !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let list: SevakNotification[] = [];

    // Main / Pending view only shows new & pending notifications
    if (activeTab === 'PENDING') {
      list = notifications.filter((n) => !n.is_read);
    } else if (activeTab === 'URGENT') {
      list = notifications.filter((n) => !n.is_read && ['CRITICAL', 'HIGH'].includes(n.priority));
    } else if (activeTab === 'ADMIN_ALERTS') {
      list = notifications.filter(
        (n) => !n.is_read && ['ADMIN_ALERT', 'DOC_REQUEST', 'ANNOUNCEMENT', 'CUSTOM', 'CASE_ASSIGNED', 'SEVAK_ASSIGNED', 'URGENT_CASE', 'SEVAK_TASK'].includes(n.type)
      );
    } else if (activeTab === 'DUTY_CAMP') {
      list = notifications.filter(
        (n) => !n.is_read && ['CAMP_SCHEDULE', 'DUTY_UPDATE', 'HOSPITAL_ALERT', 'TRANSFER'].includes(n.type)
      );
    } else if (activeTab === 'SEEN_HISTORY') {
      list = notifications.filter((n) => n.is_read);
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const titleMatch =
          (n.title || '').toLowerCase().includes(q) ||
          (n.title_en || '').toLowerCase().includes(q) ||
          (n.title_hi || '').toLowerCase().includes(q);
        const msgMatch = (n.message || '').toLowerCase().includes(q) || (n.message_en || '').toLowerCase().includes(q);
        const senderMatch = (n.sender || '').toLowerCase().includes(q);
        const caseMatch = (n.case_id || '').toLowerCase().includes(q);
        const hospMatch = (n.hospital_name || '').toLowerCase().includes(q);
        return titleMatch || msgMatch || senderMatch || caseMatch || hospMatch;
      });
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

  const getLocalizedTitle = (n: SevakNotification) => {
    if (isMarathi) return n.title || n.title_en || n.title_hi || '';
    if (isHindi) return n.title_hi || n.title || n.title_en || '';
    return n.title_en || n.title || n.title_hi || '';
  };

  const getLocalizedMessage = (n: SevakNotification) => {
    if (isMarathi) return n.message || n.message_en || n.message_hi || '';
    if (isHindi) return n.message_hi || n.message || n.message_en || '';
    return n.message_en || n.message || n.message_hi || '';
  };

  const getLocalizedSender = (n: SevakNotification) => {
    if (isMarathi) return n.sender || n.sender_en || n.sender_hi || 'प्रशासक / Admin';
    if (isHindi) return n.sender_hi || n.sender || n.sender_en || 'प्रशासन / Admin';
    return n.sender_en || n.sender || 'Admin Office';
  };

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return isMarathi ? 'आत्ताच' : isHindi ? 'अभी' : 'Just now';
      if (diffMins < 60) return isMarathi ? `${diffMins} मि. पूर्वी` : isHindi ? `${diffMins} मि. पहले` : `${diffMins}m ago`;
      if (diffHours < 24) return isMarathi ? `${diffHours} तासांपूर्वी` : isHindi ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
      if (diffDays === 1) return isMarathi ? 'काल' : isHindi ? 'कल' : 'Yesterday';
      if (diffDays < 7) return isMarathi ? `${diffDays} दिवसांपूर्वी` : isHindi ? `${diffDays} दिन पहले` : `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return '';
    }
  };

  const getPriorityTheme = (priority: SevakNotificationPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          badgeBg: '#FEE2E2',
          badgeText: '#991B1B',
          badgeBorder: '#FECACA',
          dotColor: '#DC2626',
          icon: 'flame',
          label: isMarathi ? 'अति तात्काळ' : isHindi ? 'अति आवश्यक' : 'CRITICAL',
        };
      case 'HIGH':
        return {
          badgeBg: '#FFEDD5',
          badgeText: '#9A3412',
          badgeBorder: '#FED7AA',
          dotColor: '#EA580C',
          icon: 'alert-circle',
          label: isMarathi ? 'महत्त्वाचे' : isHindi ? 'महत्वपूर्ण' : 'HIGH PRIORITY',
        };
      case 'MEDIUM':
        return {
          badgeBg: '#E0F2FE',
          badgeText: '#0369A1',
          badgeBorder: '#BAE6FD',
          dotColor: '#0284C7',
          icon: 'information-circle',
          label: isMarathi ? 'सूचना' : isHindi ? 'सूचना' : 'NOTICE',
        };
      default:
        return {
          badgeBg: '#F1F5F9',
          badgeText: '#475569',
          badgeBorder: '#E2E8F0',
          dotColor: '#64748B',
          icon: 'notifications',
          label: isMarathi ? 'सामान्य' : isHindi ? 'सामान्य' : 'INFO',
        };
    }
  };

  const tabs: { key: FilterTabKey; label: string; icon: string; count?: number }[] = [
    {
      key: 'PENDING',
      label: isMarathi ? `नवीन (${unreadCount})` : isHindi ? `नई (${unreadCount})` : `New (${unreadCount})`,
      icon: 'mail-unread-outline',
    },
    {
      key: 'URGENT',
      label: isMarathi ? 'तातडीचे' : isHindi ? 'अति आवश्यक' : 'Urgent',
      icon: 'alert-circle-outline',
    },
    {
      key: 'ADMIN_ALERTS',
      label: isMarathi ? 'प्रशासन' : isHindi ? 'प्रशासन' : 'Admin',
      icon: 'shield-checkmark-outline',
    },
    {
      key: 'DUTY_CAMP',
      label: isMarathi ? 'शिबिरे/ड्युटी' : isHindi ? 'शिविर/ड्यूटी' : 'Camps',
      icon: 'calendar-outline',
    },
    {
      key: 'SEEN_HISTORY',
      label: isMarathi ? `वाचलेल्या (${seenCount})` : isHindi ? `देखी गई (${seenCount})` : `History (${seenCount})`,
      icon: 'archive-outline',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.headerTitle}>
                {isMarathi ? 'सूचना केंद्र' : isHindi ? 'सूचना केंद्र' : 'Alerts & Notices'}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.headerCountBadge}>
                  <Text style={styles.headerCountBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              {isMarathi
                ? 'प्रलंबित आणि नवीन प्रशासकीय सूचना'
                : isHindi
                ? 'लंबित और नई प्रशासनिक सूचनाएं'
                : 'Pending & active administrative notices'}
            </Text>
          </View>

          <View style={styles.headerActionIcons}>
            {/* Mark All Read action */}
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllReadHeaderBtn}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
                accessibilityLabel="Mark all as read"
              >
                <Ionicons name="checkmark-done-outline" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.markAllReadHeaderText}>
                  {isMarathi ? 'सर्व वाचा' : isHindi ? 'सब पढ़ें' : 'Mark All'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Clear Seen action */}
            {seenCount > 0 && (
              <TouchableOpacity
                style={styles.clearSeenHeaderBtn}
                onPress={() => setShowClearConfirmModal(true)}
                activeOpacity={0.7}
                accessibilityLabel="Clear seen notifications"
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onRefresh()}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="rgba(255, 255, 255, 0.8)" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isMarathi
                ? 'सूचना, केस आयडी किंवा विषय शोधा...'
                : isHindi
                ? 'सूचना, केस आईडी या विषय खोजें...'
                : 'Search notices, case ID, keywords...'
            }
            placeholderTextColor="rgba(255, 255, 255, 0.65)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.85)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tab Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const iconColor = isActive ? '#047857' : 'rgba(255, 255, 255, 0.9)';
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  isActive && styles.activeTabChip,
                  tab.key === 'SEEN_HISTORY' && styles.historyTabChip,
                  tab.key === 'SEEN_HISTORY' && isActive && styles.activeHistoryTabChip,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={iconColor}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    isActive && styles.activeTabChipText,
                    tab.key === 'SEEN_HISTORY' && !isActive && styles.historyTabChipText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Critical Alert Quick Banner (if any unread critical/high) */}
      {criticalPendingCount > 0 && activeTab === 'PENDING' && (
        <View style={styles.criticalAlertBanner}>
          <View style={styles.criticalBannerIconWrap}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.criticalBannerTitle}>
              {isMarathi
                ? `${criticalPendingCount} तातडीच्या प्रशासकीय सूचना प्रलंबित`
                : isHindi
                ? `${criticalPendingCount} अति आवश्यक सूचनाएं लंबित`
                : `${criticalPendingCount} Urgent Directives Pending`}
            </Text>
            <Text style={styles.criticalBannerSubtitle}>
              {isMarathi
                ? 'कृपया त्वरित लक्ष द्या व आवश्यक कार्यवाही करा.'
                : isHindi
                ? 'कृपया तुरंत ध्यान दें और आवश्यक कार्यवाही करें।'
                : 'Please take immediate action.'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.criticalBannerAction}
            onPress={() => setActiveTab('URGENT')}
          >
            <Text style={styles.criticalBannerActionText}>
              {isMarathi ? 'पहा' : isHindi ? 'देखें' : 'View'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History Clear Banner when on SEEN_HISTORY tab */}
      {activeTab === 'SEEN_HISTORY' && seenCount > 0 && (
        <View style={styles.historyClearBanner}>
          <Ionicons name="archive-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <Text style={styles.historyClearBannerText}>
            {isMarathi
              ? `${seenCount} वाचलेल्या सूचना संग्रहित आहेत`
              : isHindi
              ? `${seenCount} देखी गई सूचनाएं संग्रहीत हैं`
              : `${seenCount} seen notifications in history`}
          </Text>
          <TouchableOpacity
            style={styles.historyClearBtn}
            onPress={() => setShowClearConfirmModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={13} color="#DC2626" style={{ marginRight: 3 }} />
            <Text style={styles.historyClearBtnText}>
              {isMarathi ? 'सर्व हटवा' : isHindi ? 'हटाएं' : 'Clear All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content Scroll View */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          filteredNotifications.length === 0 && styles.emptyScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#047857']}
            tintColor="#047857"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#047857" />
            <Text style={styles.loaderText}>
              {isMarathi ? 'सूचना लोड होत आहेत...' : isHindi ? 'सूचनाएं लोड हो रही हैं...' : 'Loading notifications...'}
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={
                  activeTab === 'SEEN_HISTORY'
                    ? 'archive-outline'
                    : 'checkmark-done-circle-outline'
                }
                size={44}
                color={activeTab === 'SEEN_HISTORY' ? '#94A3B8' : '#10B981'}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'SEEN_HISTORY'
                ? isMarathi
                  ? 'कोणतीही जुनी सूचना नाही'
                  : isHindi
                  ? 'कोई पुरानी सूचना नहीं है'
                  : 'No Seen Notifications'
                : isMarathi
                ? 'सर्व सूचना वाचल्या गेल्या आहेत!'
                : isHindi
                ? 'सभी सूचनाएं पढ़ी जा चुकी हैं!'
                : 'All Caught Up!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? isMarathi
                  ? `"${searchQuery}" साठी कोणतेही परिणाम सापडले नाहीत.`
                  : isHindi
                  ? `"${searchQuery}" के लिए कोई परिणाम नहीं मिला।`
                  : `No matches found for "${searchQuery}".`
                : activeTab === 'SEEN_HISTORY'
                ? isMarathi
                  ? 'वाचलेल्या किंवा क्लिअर केलेल्या सूचना येथे दिसतील.'
                  : isHindi
                  ? 'देखी गई सूचनाएं यहाँ दिखाई देंगी।'
                  : 'Previously read notifications will appear here.'
                : isMarathi
                ? 'सध्या कोणतीही प्रलंबित सूचना नाही. नवीन सूचना आल्यानंतर येथे दिसतील.'
                : isHindi
                ? 'वर्तमान में कोई लंबित सूचना नहीं है। नई सूचना आने पर यहाँ दिखाई देगी।'
                : 'No pending notifications. You are all up to date.'}
            </Text>
            {seenCount > 0 && activeTab === 'PENDING' && (
              <TouchableOpacity
                style={styles.viewHistoryBtn}
                onPress={() => setActiveTab('SEEN_HISTORY')}
              >
                <Ionicons name="time-outline" size={15} color="#047857" style={{ marginRight: 5 }} />
                <Text style={styles.viewHistoryBtnText}>
                  {isMarathi
                    ? `वाचलेल्या सूचना पहा (${seenCount})`
                    : isHindi
                    ? `देखी गई सूचनाएं देखें (${seenCount})`
                    : `View History (${seenCount})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notif) => {
              const theme = getPriorityTheme(notif.priority);
              const isUnread = !notif.is_read;

              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifCard, isUnread ? styles.notifCardUnread : styles.notifCardSeen]}
                  onPress={() => {
                    setSelectedNotification(notif);
                    if (isUnread) handleMarkAsRead(notif.id);
                  }}
                  activeOpacity={0.88}
                >
                  {/* Unread Indicator Ribbon */}
                  {isUnread && <View style={styles.unreadRibbon} />}

                  {/* Card Header: Priority Pill + Timestamp */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor: theme.badgeBg,
                          borderColor: theme.badgeBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name={theme.icon as any}
                        size={12}
                        color={theme.badgeText}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.priorityPillText, { color: theme.badgeText }]}>
                        {notif.badge || theme.label}
                      </Text>
                    </View>

                    <View style={styles.timeAndDotRow}>
                      <Text style={styles.relativeTimeText}>
                        {formatRelativeTime(notif.created_at || notif.createdAt)}
                      </Text>
                      {isUnread ? (
                        <View style={[styles.unreadDot, { backgroundColor: theme.dotColor }]} />
                      ) : (
                        <Ionicons
                          name="checkmark-done"
                          size={14}
                          color="#94A3B8"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={2}>
                    {getLocalizedTitle(notif)}
                  </Text>

                  {/* Message Snippet */}
                  <Text style={styles.notifMessage} numberOfLines={3}>
                    {getLocalizedMessage(notif)}
                  </Text>

                  {/* Metadata Chips / Tags */}
                  <View style={styles.metaChipsRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="person-circle-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                      <Text style={styles.metaChipText} numberOfLines={1}>
                        {getLocalizedSender(notif)}
                      </Text>
                    </View>

                    {notif.case_id && (
                      <View style={[styles.metaChip, styles.metaChipCase]}>
                        <Ionicons name="folder-outline" size={12} color="#0369A1" style={{ marginRight: 4 }} />
                        <Text style={[styles.metaChipText, { color: '#0369A1', fontWeight: '600' }]}>
                          #{notif.case_id}
                        </Text>
                      </View>
                    )}

                    {notif.requested_doc_name && (
                      <View style={[styles.metaChip, styles.metaChipDoc]}>
                        <Ionicons name="document-text-outline" size={12} color="#B45309" style={{ marginRight: 4 }} />
                        <Text style={[styles.metaChipText, { color: '#B45309' }]} numberOfLines={1}>
                          {notif.requested_doc_name}
                        </Text>
                      </View>
                    )}
                  </View>

                    {/* Quick Card Action Footer */}
                    <View style={styles.cardFooterRow}>
                      <TouchableOpacity
                        style={styles.viewDetailLink}
                        onPress={() => {
                          setSelectedNotification(notif);
                          if (isUnread) handleMarkAsRead(notif.id);
                        }}
                      >
                        <Text style={styles.viewDetailLinkText}>
                          {isMarathi ? 'सविस्तर वाचा' : isHindi ? 'विस्तार से पढ़ें' : 'Read Full Notice'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#047857" />
                      </TouchableOpacity>

                      <View style={styles.cardFooterRight}>
                        {notif.case_id && (notif.requested_doc_name || notif.type === 'DOC_REQUEST') && (
                          <TouchableOpacity
                            style={styles.uploadDocBtn}
                            onPress={() => {
                              if (isUnread) handleMarkAsRead(notif.id);
                              navigation.navigate('PatientCaseDetails', {
                                caseId: notif.case_id,
                                requestedDocName: notif.requested_doc_name,
                              });
                            }}
                          >
                            <Ionicons name="cloud-upload" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.uploadDocBtnText}>
                              {isMarathi ? 'कागदपत्र अपलोड' : isHindi ? 'दस्तावेज़ अपलोड' : 'Upload Doc'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {notif.case_id && (
                          <TouchableOpacity
                            style={styles.quickCaseBtn}
                            onPress={() => {
                              if (isUnread) handleMarkAsRead(notif.id);
                              navigation.navigate('PatientCaseDetails', {
                                caseId: notif.case_id,
                                requestedDocName: notif.requested_doc_name,
                              });
                            }}
                          >
                            <Ionicons name="open-outline" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                            <Text style={styles.quickCaseBtnText}>
                              {isMarathi ? 'केस उघडा' : isHindi ? 'केस खोलें' : 'Open Case'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isUnread && (
                          <TouchableOpacity
                            style={styles.markReadBtn}
                            onPress={(e) => handleMarkAsRead(notif.id, e)}
                            accessibilityLabel="Mark as read"
                          >
                            <Ionicons name="checkmark" size={14} color="#047857" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal for Clearing Read Notifications */}
      <Modal
        visible={showClearConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowClearConfirmModal(false)}
          />
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>
              {isMarathi
                ? 'वाचलेल्या सूचना हटवायच्या आहेत का?'
                : isHindi
                ? 'क्या आप देखी गई सूचनाएं हटाना चाहते हैं?'
                : 'Clear Seen Notifications?'}
            </Text>
            <Text style={styles.confirmMsg}>
              {isMarathi
                ? 'सर्व वाचलेल्या सूचना कायमच्या हटवल्या जातील. नवीन/प्रलंबित सूचना सुरक्षित राहतील.'
                : isHindi
                ? 'सभी देखी गई सूचनाएं हटा दी जाएंगी। नई/लंबित सूचनाएं सुरक्षित रहेंगी।'
                : 'All read notifications will be permanently removed. Pending and unread notifications will remain safe.'}
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowClearConfirmModal(false)}
              >
                <Text style={styles.confirmCancelText}>
                  {isMarathi ? 'रद्द करा' : isHindi ? 'रद्द करें' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleClearAllRead}
              >
                <Text style={styles.confirmDeleteText}>
                  {isMarathi ? 'हटवा' : isHindi ? 'हटाएं' : 'Clear All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Detail Modal Bottom Sheet */}
      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedNotification(null)}
          />

          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.modalDragHandle} />

            {selectedNotification && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Priority and Timestamp */}
                <View style={styles.modalHeaderRow}>
                  {(() => {
                    const theme = getPriorityTheme(selectedNotification.priority);
                    return (
                      <View
                        style={[
                          styles.priorityPill,
                          { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
                        ]}
                      >
                        <Ionicons
                          name={theme.icon as any}
                          size={13}
                          color={theme.badgeText}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.priorityPillText, { color: theme.badgeText, fontSize: 12 }]}>
                          {selectedNotification.badge || theme.label}
                        </Text>
                      </View>
                    );
                  })()}

                  <Text style={styles.modalDateText}>
                    {new Date(
                      selectedNotification.created_at || selectedNotification.createdAt || Date.now()
                    ).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Main Title */}
                <Text style={styles.modalTitle}>{getLocalizedTitle(selectedNotification)}</Text>

                {/* Sender Info Block */}
                <View style={styles.modalSenderBlock}>
                  <Ionicons name="shield-checkmark" size={18} color="#047857" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSenderLabel}>
                      {isMarathi ? 'प्रेषक / जारीकर्ता:' : isHindi ? 'प्रेषक:' : 'Issued By:'}
                    </Text>
                    <Text style={styles.modalSenderVal}>
                      {getLocalizedSender(selectedNotification)}
                    </Text>
                  </View>
                </View>

                {/* Case & Hospital Metadata if present */}
                {(selectedNotification.case_id || selectedNotification.hospital_name || selectedNotification.requested_doc_name) && (
                  <View style={styles.modalMetaCard}>
                    {selectedNotification.case_id && (
                      <View style={styles.modalMetaRow}>
                        <Text style={styles.modalMetaKey}>
                          {isMarathi ? 'रुग्ण केस क्रमांक:' : isHindi ? 'केस नंबर:' : 'Case ID:'}
                        </Text>
                        <Text style={[styles.modalMetaVal, { color: '#0284C7', fontWeight: '700' }]}>
                          #{selectedNotification.case_id}
                        </Text>
                      </View>
                    )}

                    {selectedNotification.hospital_name && (
                      <View style={styles.modalMetaRow}>
                        <Text style={styles.modalMetaKey}>
                          {isMarathi ? 'रुग्णालय:' : isHindi ? 'अस्पताल:' : 'Hospital:'}
                        </Text>
                        <Text style={styles.modalMetaVal}>{selectedNotification.hospital_name}</Text>
                      </View>
                    )}

                    {selectedNotification.requested_doc_name && (
                      <View style={styles.modalMetaRow}>
                        <Text style={styles.modalMetaKey}>
                          {isMarathi ? 'आवश्यक कागदपत्र:' : isHindi ? 'आवश्यक दस्तावेज़:' : 'Required Document:'}
                        </Text>
                        <Text style={[styles.modalMetaVal, { color: '#DC2626' }]}>
                          {selectedNotification.requested_doc_name}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Notification Full Message Body */}
                <View style={styles.modalMessageCard}>
                  <Text style={styles.modalMessageText}>
                    {getLocalizedMessage(selectedNotification)}
                  </Text>
                </View>

                {/* Action Buttons inside modal */}
                <View style={styles.modalActionButtons}>
                  {selectedNotification.case_id && (selectedNotification.requested_doc_name || selectedNotification.type === 'DOC_REQUEST') && (
                    <TouchableOpacity
                      style={styles.modalUploadActionBtn}
                      onPress={() => {
                        const cId = selectedNotification.case_id;
                        const reqDoc = selectedNotification.requested_doc_name;
                        setSelectedNotification(null);
                        if (cId) {
                          navigation.navigate('PatientCaseDetails', {
                            caseId: cId,
                            requestedDocName: reqDoc,
                          });
                        }
                      }}
                    >
                      <Ionicons name="cloud-upload" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalUploadActionBtnText}>
                        {isMarathi ? 'कागदपत्र त्वरित अपलोड करा' : isHindi ? 'दस्तावेज़ तुरंत अपलोड करें' : 'Upload Requested Document'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedNotification.case_id && (
                    <TouchableOpacity
                      style={styles.modalPrimaryActionBtn}
                      onPress={() => {
                        const cId = selectedNotification.case_id;
                        const reqDoc = selectedNotification.requested_doc_name;
                        setSelectedNotification(null);
                        if (cId) {
                          navigation.navigate('PatientCaseDetails', {
                            caseId: cId,
                            requestedDocName: reqDoc,
                          });
                        }
                      }}
                    >
                      <Ionicons name="folder-open" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalPrimaryActionBtnText}>
                        {isMarathi ? 'रुग्ण केस उघडा' : isHindi ? 'केस विवरण देखें' : 'View Patient Case'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedNotification(null)}
                  >
                    <Text style={styles.modalCloseBtnText}>
                      {isMarathi ? 'बंद करा' : isHindi ? 'बंद करें' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
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
  header: {
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#047857',
  },
  headerCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllReadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  markAllReadHeaderText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  clearSeenHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  activeTabChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTabChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeHistoryTabChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tabChipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabChipText: {
    color: '#047857',
    fontWeight: '800',
  },
  historyTabChipText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  criticalAlertBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  criticalBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  criticalBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  criticalBannerSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  criticalBannerAction: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  criticalBannerActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  historyClearBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyClearBannerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  historyClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  historyClearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loaderContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  viewHistoryBtnText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationsList: {
    gap: 12,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  notifCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#A7F3D0',
    borderLeftWidth: 4,
    borderLeftColor: '#047857',
  },
  notifCardSeen: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    opacity: 0.9,
  },
  unreadRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderTopColor: '#047857',
    borderLeftWidth: 18,
    borderLeftColor: 'transparent',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeAndDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relativeTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 21,
    marginBottom: 6,
  },
  notifTitleUnread: {
    color: '#0F172A',
    fontWeight: '800',
  },
  notifMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  metaChipCase: {
    backgroundColor: '#E0F2FE',
  },
  metaChipDoc: {
    backgroundColor: '#FEF3C7',
  },
  metaChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginRight: 2,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickCaseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  uploadDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markReadBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    elevation: 20,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalSenderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  modalSenderLabel: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalSenderVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  modalMetaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalMetaKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modalMetaVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  modalMessageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalMessageText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  modalActionButtons: {
    gap: 10,
  },
  modalUploadActionBtn: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalUploadActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalPrimaryActionBtn: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    padding: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMsg: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
export default SevakNotificationsScreen;
