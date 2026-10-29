import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Beneficiary } from '../types/sevak.types';
import { AppCard } from '../../shared/components/AppCard';
import { AppBadge } from '../../shared/components/AppBadge';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  beneficiary: Beneficiary;
  onPressSurvey?: () => void;
}

export const BeneficiaryCard: React.FC<Props> = ({ beneficiary, onPressSurvey }) => {
  const isHighRisk = beneficiary.riskLevel === 'High Risk';

  return (
    <AppCard accentBorderColor={isHighRisk ? colors.danger : colors.sevak.primary}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View style={styles.nameRow}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {beneficiary.name}
            </Text>
            {beneficiary.nameHindi && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                ({beneficiary.nameHindi})
              </Text>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.sevak.primary, fontWeight: '600' }]}>
            {beneficiary.category} • {beneficiary.age} yrs • {beneficiary.gender}
          </Text>
        </View>
        <AppBadge
          label={beneficiary.riskLevel}
          variant={isHighRisk ? 'danger' : beneficiary.riskLevel === 'Moderate' ? 'warning' : 'success'}
        />
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.detailItem}>
          <Ionicons name="home-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>{beneficiary.householdId}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{beneficiary.address}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Last Survey: {beneficiary.lastSurveyDate}
        </Text>
        <TouchableOpacity style={styles.actionBtn} onPress={onPressSurvey}>
          <Ionicons name="clipboard-outline" size={14} color={colors.sevak.primary} />
          <Text style={styles.actionBtnText}>Survey / Update</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  detailsBox: {
    marginVertical: spacing.xs,
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sevak.primary,
  },
});
