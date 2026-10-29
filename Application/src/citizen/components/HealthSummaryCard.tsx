import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CitizenVitals } from '../types/citizen.types';
import { colors } from '../../shared/theme/colors';
import { spacing, borderRadius } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  vitals: CitizenVitals | null;
  abhaId?: string;
}

export const HealthSummaryCard: React.FC<Props> = ({ vitals, abhaId }) => {
  return (
    <View style={styles.card}>
      {/* ABHA Badge Header */}
      <View style={styles.headerRow}>
        <View style={styles.abhaInfo}>
          <Text style={styles.abhaLabel}>ABHA Number (आयुष्मान भारत)</Text>
          <Text style={styles.abhaIdText}>{abhaId || '--'}</Text>
        </View>
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.white} />
          <Text style={styles.verifiedText}>Active</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Vitals Grid */}
      <View style={styles.vitalsRow}>
        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Blood Pressure</Text>
          <Text style={styles.vitalVal}>{vitals?.bloodPressure || '--'}</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Heart Rate</Text>
          <Text style={styles.vitalVal}>{vitals?.heartRate ? `${vitals.heartRate} bpm` : '--'}</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Blood Group</Text>
          <Text style={styles.vitalVal}>{vitals?.bloodGroup || '--'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.citizen.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: colors.citizen.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  abhaInfo: {
    flex: 1,
  },
  abhaLabel: {
    color: colors.citizen.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  abhaIdText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  verifiedText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.md,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalItem: {
    flex: 1,
    alignItems: 'center',
  },
  vitalLabel: {
    color: colors.citizen.primaryLight,
    fontSize: 11,
    marginBottom: 2,
  },
  vitalVal: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
  },
});
