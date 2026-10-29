import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppHeader } from '../../../shared/components/AppHeader';
import { AppointmentCard } from '../../components/AppointmentCard';
import { useAppointments } from '../../hooks/useAppointments';
import { AppButton } from '../../../shared/components/AppButton';
import { colors } from '../../../shared/theme/colors';
import { spacing, borderRadius } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';
import { useLanguage } from '../../../shared/context/LanguageContext';

export const AppointmentsScreen: React.FC = () => {
  const { appointments, loading } = useAppointments();
  const { t } = useLanguage();

  const handleBookConsultation = () => {
    Alert.alert(
      'Book e-Sanjeevani Consultation',
      'Select consultation mode:\n\n1. Video Tele-OPD with Specialist\n2. Primary Health Centre (PHC) Walk-in Token',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => console.log('Booking initiated') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('appointmentsTitle')} subtitle={t('appointmentsSubtitle')} />

      {/* Book New Consultation Action Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerTextCol}>
          <Text style={[typography.h3, { color: colors.white }]}>
            {t('needDoctorConsult')}
          </Text>
          <Text style={[typography.caption, { color: colors.citizen.primaryLight, marginTop: 2 }]}>
            {t('needDoctorConsultSub')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bookActionBtn}
          activeOpacity={0.8}
          onPress={handleBookConsultation}
        >
          <Text style={styles.bookActionBtnText}>{t('bookNew')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t('scheduledAppointments')}
        </Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.borderStrong} />
            <Text style={[typography.body, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              {t('noAppointments')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerContainer: {
    backgroundColor: colors.citizen.primary,
    margin: spacing.base,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.citizen.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  bookActionBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bookActionBtnText: {
    color: colors.citizen.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  listHeader: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});
