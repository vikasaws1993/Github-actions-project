import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SevakDashboardStats } from '../types/sevak.types';
import { colors } from '../../shared/theme/colors';
import { spacing, borderRadius } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  stats: SevakDashboardStats | null;
}

export const FieldTargetGauge: React.FC<Props> = ({ stats }) => {
  const completed = stats?.todaySurveysCompleted || 0;
  const target = stats?.todaySurveyTarget || 20;
  const percentage = Math.min(100, Math.round((completed / target) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.wardLabel}>{stats?.assignedWard || 'Field Area'}</Text>
          <Text style={styles.titleText}>Today's Survey Target</Text>
        </View>
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{percentage}% Completed</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>

      {/* Stats Summary Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>{completed}/{target}</Text>
          <Text style={styles.statLabel}>Household Surveys</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNumber, { color: '#FEE2E2' }]}>
            {stats?.highRiskBeneficiariesCount || 0}
          </Text>
          <Text style={styles.statLabel}>High-Risk Flags</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNumber, { color: '#FEF3C7' }]}>
            {stats?.pendingVaccinesCount || 0}
          </Text>
          <Text style={styles.statLabel}>Vaccines Due</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.sevak.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: colors.sevak.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  wardLabel: {
    color: colors.sevak.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  titleText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  targetBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  targetBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.sevak.primaryLight,
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
  },
});
