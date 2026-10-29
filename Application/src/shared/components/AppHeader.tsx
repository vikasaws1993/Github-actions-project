import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../constants/roles';
import { LogoutConfirmationModal } from './LogoutConfirmationModal';
import { LanguageModal } from './LanguageModal';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const { role, logout } = useAuth();
  const { language } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const isCitizen = role === UserRole.CITIZEN;
  const activeColor = isCitizen ? colors.citizen.primary : colors.sevak.primary;

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topInset + 10,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.titleContainer}>
          <View style={styles.brandRow}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: `${activeColor}15` },
              ]}
            >
              <Text style={[styles.roleBadgeText, { color: activeColor }]}>
                {isCitizen ? 'CITIZEN' : 'SEVAK'}
              </Text>
            </View>
          </View>
          {subtitle && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {rightAction ? (
            rightAction
          ) : (
            <View style={styles.defaultActions}>
              <TouchableOpacity
                style={[
                  styles.langPill,
                  { backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30` },
                ]}
                onPress={() => setShowLanguageModal(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select Language"
              >
                <Ionicons name="globe-outline" size={13} color={activeColor} />
                <Text style={[styles.langPillText, { color: activeColor }]}>
                  {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={activeColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLogoutModal(true)}
                style={styles.logoutButton}
                activeOpacity={0.7}
                accessibilityLabel="Log Out"
              >
                <Ionicons name="log-out-outline" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 6,
  },
});
