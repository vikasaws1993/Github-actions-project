import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';   // import icon
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../shared/theme/colors';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { useAuth } from '../../../shared/hooks/useAuth';
import { LogoutConfirmationModal } from '../../../shared/components/LogoutConfirmationModal';
import { LanguageModal } from '../../../shared/components/LanguageModal';
import { alertsStore } from '../../services/alertsStore';
import { notificationService } from '../../services/notificationService';
import { APP_CONFIG } from '../../../shared/constants/config';

import { useMlaProfile } from '../../../shared/hooks/useMlaProfile';

export const CitizenHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  const { profile: mlaProfile, refetch: fetchMlaProfile } = useMlaProfile();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshAlerts = useCallback(() => {
    alertsStore.getAlerts(true).then(() => {
      alertsStore.getUnreadCount().then(setUnreadCount);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAlerts();
      fetchMlaProfile();
    }, [refreshAlerts, fetchMlaProfile])
  );

  useEffect(() => {
    fetchMlaProfile();

    // Request Android 13+ POST_NOTIFICATIONS permission
    notificationService.requestPermission();

    const unsubscribe = alertsStore.subscribe(() => {
      alertsStore.getUnreadCount().then(setUnreadCount);
    });

    // Background interval poll for live updates
    const interval = setInterval(() => {
      refreshAlerts();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshAlerts, fetchMlaProfile]);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Deep Teal Header with Safe Area Insets */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../../../assets/arogya_mitra_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>{t('appName')}</Text>
          </View>

          <View style={styles.headerRightActions}>
            {/* Notification Bell Icon */}
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => navigation.navigate('CitizenTabs', { screen: 'Schemes' })}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Alerts"
            >
              <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
              {unreadCount > 0 && <View style={styles.bellBadgeDot} />}
            </TouchableOpacity>

            {/* Language Selection Dropdown Pill */}
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => setShowLanguageModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Select Language"
            >
              <Ionicons name="globe-outline" size={13} color="#FFFFFF" />
              <Text style={styles.langText}>
                {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
              </Text>
              <Ionicons name="chevron-down" size={12} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting Banner */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>{t('greeting')}</Text>
          <Text style={styles.greetingSubtitle}>
            {t('greetingSubtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Leader/Dignitary Card (मा. रवींद्र चव्हाण) */}
        <View style={styles.leaderCard}>
          <View style={styles.badgeContainer}>
            <View style={styles.initiativeBadge}>
              <Text style={styles.initiativeBadgeText}>
                {language === 'mr'
                  ? (mlaProfile?.initiativeTitleMr || t('initiative') || 'विशेष पुढाकार')
                  : language === 'hi'
                  ? (mlaProfile?.initiativeTitleHi || 'विशेष पहल')
                  : (mlaProfile?.initiativeTitle || 'Special Initiative')}
              </Text>
            </View>
          </View>

          {/* Photo of Leader */}
          <View style={styles.leaderImageWrapper}>
            <Image
              source={
                mlaProfile?.photoUrl?.startsWith('http')
                  ? { uri: mlaProfile.photoUrl }
                  : require('../../../../assets/ravindra_chavan.jpg')
              }
              style={styles.leaderPhoto}
              resizeMode="contain"
            />
          </View>

          <View style={styles.leaderInfo}>
            <Text style={styles.leaderName}>
              {language === 'mr'
                ? (mlaProfile?.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण')
                : language === 'hi'
                ? (mlaProfile?.nameHi || mlaProfile?.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण')
                : (mlaProfile?.name || 'Hon. Ravindra Dattatray Chavan')}
            </Text>
            <Text style={styles.leaderTitle}>
              {language === 'mr'
                ? (mlaProfile?.partyTitleMr || mlaProfile?.partyTitle || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा')
                : language === 'hi'
                ? (mlaProfile?.partyTitleHi || mlaProfile?.partyTitleMr || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा')
                : (mlaProfile?.partyTitle || 'State President of BJP Maharashtra | Dombivli Assembly Constituency')}
            </Text>
          </View>
        </View>

        {/* Action 1: नवीन अर्ज करा (Apply New) */}
        <TouchableOpacity
          style={styles.primaryActionCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('NewApplication')}
        >
          <View style={styles.actionIconBoxTeal}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.primaryActionTitle}>{t('newApplicationTitle')}</Text>
            <Text style={styles.primaryActionSubtitle}>{t('newApplicationSub')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Action 2: माझा अर्ज तपासा (Check My Application) */}
        <TouchableOpacity
          style={styles.secondaryActionCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TrackApplications')}
        >
          <View style={styles.actionIconCircleTeal}>
            <Ionicons name="menu-outline" size={22} color={colors.citizen.primary} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.secondaryActionTitle}>{t('checkApplicationTitle')}</Text>
            <Text style={styles.secondaryActionSubtitle}>{t('checkApplicationSub')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#8AA09B" />
        </TouchableOpacity>

        {/* Action 3: आरोग्य सेवकाशी संपर्क (Contact Arogya Sevak) */}
        <TouchableOpacity
          style={styles.secondaryActionCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Appointments')}
        >
          <View style={styles.actionIconCircleTeal}>
            <Ionicons name="disc-outline" size={22} color={colors.citizen.primary} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.secondaryActionTitle}>{t('contactSevakTitle')}</Text>
            <Text style={styles.secondaryActionSubtitle}>{t('contactSevakSub')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#8AA09B" />
        </TouchableOpacity>

        {/* Action 4: Helpline Banner */}
        <View style={styles.helplineCard}>
          <View style={styles.helplinePhoneCircle}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.helplineTextCol}>
            <Text style={styles.helplineTitle}>{t('helpline')}</Text>
            <Text style={styles.helplineSub}>{t('helplineHours')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

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
    backgroundColor: '#F4F8F7',
  },
  header: {
    backgroundColor: colors.citizen.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: colors.citizen.primary,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  langText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingContainer: {
    marginTop: 18,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  leaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 4,
  },
  badgeContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
  initiativeBadge: {
    borderWidth: 1,
    borderColor: '#0A5C53',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#E8F4F2',
  },
  initiativeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A5C53',
  },
  leaderImageWrapper: {
    marginTop: 4,
    marginBottom: 10,
    width: '100%',
    maxHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderPhoto: {
    width: '100%',
    height: 190,
  },
  leaderInfo: {
    alignItems: 'center',
  },
  leaderName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  leaderTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  primaryActionCard: {
    backgroundColor: colors.citizen.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBoxTeal: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.citizen.logoBox,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextCol: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  secondaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2ECE9',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconCircleTeal: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  secondaryActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  secondaryActionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.citizen.helplineBg,
    borderWidth: 1.5,
    borderColor: colors.citizen.helplineBorder,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  helplinePhoneCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.citizen.helplinePhoneCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineTextCol: {
    flex: 1,
  },
  helplineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
  },
  helplineNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
  },
  helplineSub: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
});
