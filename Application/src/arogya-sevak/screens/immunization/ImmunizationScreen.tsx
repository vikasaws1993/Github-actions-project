import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { VaccineScheduleCard } from '../../components/VaccineScheduleCard';
import { sevakApi } from '../../services/sevakApi';
import { offlineSyncService } from '../../services/offlineSyncService';
import { VaccineSchedule } from '../../types/sevak.types';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/spacing';
import { typography } from '../../../shared/theme/typography';

export const ImmunizationScreen: React.FC = () => {
  const [schedules, setSchedules] = useState<VaccineSchedule[]>([]);

  useEffect(() => {
    sevakApi.getVaccineSchedules().then(setSchedules);
  }, []);

  const handleRecordDose = (vaccine: VaccineSchedule) => {
    Alert.alert(
      'Record Vaccine Dose',
      `Confirm administration of ${vaccine.vaccineName} for ${vaccine.beneficiaryName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Save',
          onPress: async () => {
            await offlineSyncService.enqueue({
              type: 'VACCINE_ADMINISTERED',
              payload: {
                vaccineId: vaccine.id,
                vaccineName: vaccine.vaccineName,
                beneficiaryId: vaccine.beneficiaryId,
              },
            });
            Alert.alert('Recorded', 'Vaccination logged in offline queue.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Immunization Session" subtitle="RI Session & Vaccine Administration" />

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => (
          <VaccineScheduleCard
            schedule={item}
            onAdministerPress={() => handleRecordDose(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
});
