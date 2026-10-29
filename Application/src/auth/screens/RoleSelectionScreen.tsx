import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthStackParamList } from '../types/auth.types';
import { UserRole, ROLE_METADATA } from '../../shared/constants/roles';
import { colors } from '../../shared/theme/colors';
import { spacing, borderRadius } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';
import { useAuth } from '../../shared/hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

export const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();

  const handleSelectRole = (role: UserRole) => {
    // Quick entry into the role for immediate evaluation or navigate to Login
    login(role);
  };

  const citizenMeta = ROLE_METADATA[UserRole.CITIZEN];
  const sevakMeta = ROLE_METADATA[UserRole.AROGYA_SEVAK];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={36} color={colors.citizen.primary} />
          </View>
          <Text style={[typography.h1, styles.title]}>ArogyaMitra</Text>
          <Text style={[typography.h3, styles.titleHindi]}>आरोग्य मित्र</Text>
          <Text style={[typography.body, styles.subtitle]}>
            National Digital Health Mission & Community Health Portal
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[typography.bodyLarge, styles.sectionTitle]}>
            Select Your Role / आपली भूमिका निवडा
          </Text>
          <Text style={[typography.caption, styles.sectionSubtitle]}>
            Separate dedicated interfaces tailored for Citizens and Health Workers
          </Text>
        </View>

        {/* Citizen Role Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.roleCard, styles.citizenCard]}
          onPress={() => handleSelectRole(UserRole.CITIZEN)}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.citizen.primaryLight },
              ]}
            >
              <Ionicons
                name="person-circle"
                size={34}
                color={colors.citizen.primary}
              />
            </View>
            <View style={styles.roleHeaderInfo}>
              <View style={styles.roleTitleRow}>
                <Text style={[typography.h2, { color: colors.citizen.primaryDark }]}>
                  {citizenMeta.title}
                </Text>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: colors.citizen.primaryLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: colors.citizen.primaryDark },
                    ]}
                  >
                    {citizenMeta.titleHindi}
                  </Text>
                </View>
              </View>
              <Text style={[typography.caption, { color: colors.citizen.primary }]}>
                For Individuals & Families
              </Text>
            </View>
          </View>

          <Text style={[typography.body, styles.cardDesc]}>
            {citizenMeta.description}
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.citizen.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                ABHA Health Records & Prescriptions
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.citizen.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                Doctor Appointments & Teleconsultation
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.citizen.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                Govt Schemes (PM-JAY, Ayushman Bharat) & SOS
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.actionButton,
              { backgroundColor: colors.citizen.primary },
            ]}
          >
            <Text style={styles.actionButtonText}>Enter Citizen Portal</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Arogya Sevak Role Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.roleCard, styles.sevakCard]}
          onPress={() => handleSelectRole(UserRole.AROGYA_SEVAK)}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.sevak.primaryLight },
              ]}
            >
              <Ionicons
                name="medkit"
                size={32}
                color={colors.sevak.primary}
              />
            </View>
            <View style={styles.roleHeaderInfo}>
              <View style={styles.roleTitleRow}>
                <Text style={[typography.h2, { color: colors.sevak.primaryDark }]}>
                  {sevakMeta.title}
                </Text>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: colors.sevak.primaryLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: colors.sevak.primaryDark },
                    ]}
                  >
                    {sevakMeta.titleHindi}
                  </Text>
                </View>
              </View>
              <Text style={[typography.caption, { color: colors.sevak.primary }]}>
                For ASHA, ANM & Community Health Workers
              </Text>
            </View>
          </View>

          <Text style={[typography.body, styles.cardDesc]}>
            {sevakMeta.description}
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sevak.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                Household Registry & Beneficiary Surveys
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sevak.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                Maternal & Child Immunization Tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sevak.primary} />
              <Text style={[typography.bodySmall, styles.featureText]}>
                Field Visits, Stock Management & Offline Sync
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.actionButton,
              { backgroundColor: colors.sevak.primary },
            ]}
          >
            <Text style={styles.actionButtonText}>Enter Arogya Sevak Portal</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Secure & Isolated • ABHA & ABDM Compliant
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.citizen.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleHindi: {
    color: colors.citizen.primary,
    marginTop: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: colors.textTertiary,
    marginTop: 2,
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  citizenCard: {
    borderColor: colors.citizen.primaryLight,
  },
  sevakCard: {
    borderColor: colors.sevak.primaryLight,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleHeaderInfo: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  featureList: {
    gap: spacing.xs,
    marginBottom: spacing.base,
    paddingLeft: spacing.xxs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
});
