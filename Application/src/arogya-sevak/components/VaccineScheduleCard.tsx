import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { VaccineSchedule } from '../types/sevak.types';
import { AppCard } from '../../shared/components/AppCard';
import { AppBadge } from '../../shared/components/AppBadge';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  schedule: VaccineSchedule;
  onAdministerPress?: () => void;
}

export const VaccineScheduleCard: React.FC<Props> = ({ schedule, onAdministerPress }) => {
  const isOverdue = schedule.status === 'Overdue';

  return (
    <AppCard accentBorderColor={isOverdue ? colors.danger : colors.sevak.primary}>
      <View style={styles.topRow}>
        <View style={styles.infoCol}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {schedule.vaccineName}
          </Text>
          <Text style={[typography.caption, { color: colors.sevak.primary, fontWeight: '700' }]}>
            {schedule.beneficiaryName} ({schedule.beneficiaryCategory})
          </Text>
        </View>
        <AppBadge
          label={schedule.status}
          variant={isOverdue ? 'danger' : 'warning'}
        />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.dueInfo}>
          <Ionicons
            name="time-outline"
            size={14}
            color={isOverdue ? colors.danger : colors.textSecondary}
          />
          <Text
            style={[
              styles.dueText,
              isOverdue && { color: colors.danger, fontWeight: '700' },
            ]}
          >
            Due: {schedule.dueDate}
          </Text>
        </View>

        <TouchableOpacity style={styles.administerBtn} onPress={onAdministerPress}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.white} />
          <Text style={styles.administerText}>Record Dose</Text>
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
  infoCol: {
    flex: 1,
    paddingRight: spacing.xs,
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
  dueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  administerBtn: {
    backgroundColor: colors.sevak.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  administerText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
