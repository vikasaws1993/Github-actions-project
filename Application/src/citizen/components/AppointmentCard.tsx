import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Appointment } from '../types/citizen.types';
import { AppCard } from '../../shared/components/AppCard';
import { AppBadge } from '../../shared/components/AppBadge';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';

interface Props {
  appointment: Appointment;
}

export const AppointmentCard: React.FC<Props> = ({ appointment }) => {
  const isTele = appointment.type === 'Tele-Consultation';

  return (
    <AppCard accentBorderColor={colors.citizen.primary}>
      <View style={styles.topRow}>
        <View style={styles.doctorInfo}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {appointment.doctorName}
          </Text>
          <Text style={[typography.caption, { color: colors.citizen.primary }]}>
            {appointment.specialty}
          </Text>
        </View>
        <AppBadge
          label={appointment.status}
          variant={appointment.status === 'Confirmed' ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{appointment.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{appointment.timeSlot}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons
            name={isTele ? 'videocam-outline' : 'location-outline'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.detailText}>{appointment.type}</Text>
        </View>
      </View>

      <View style={styles.facilityRow}>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Facility: {appointment.facility}
        </Text>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  doctorInfo: {
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  facilityRow: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
});
