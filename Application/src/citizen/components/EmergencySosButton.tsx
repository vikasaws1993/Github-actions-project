import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../shared/theme/colors';
import { spacing, borderRadius } from '../../shared/theme/spacing';
import { typography } from '../../shared/theme/typography';
import { APP_CONFIG } from '../../shared/constants/config';

export const EmergencySosButton: React.FC = () => {
  const handleAmbulanceCall = () => {
    Alert.alert(
      'Emergency Ambulance 108',
      'Are you sure you want to trigger an emergency call to 108 Ambulance service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 108 Now',
          style: 'destructive',
          onPress: () => console.log('Dialing 108...'),
        },
      ]
    );
  };

  const handleHelplineCall = () => {
    Alert.alert('Health Helpline 104', 'Connecting to 24/7 National Health Advice Helpline 104.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.sosCard, styles.ambulanceCard]}
        activeOpacity={0.8}
        onPress={handleAmbulanceCall}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="alert-circle" size={22} color={colors.danger} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.sosTitle}>EMERGENCY 108</Text>
          <Text style={styles.sosSubtitle}>Free Ambulance Dispatch</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sosCard, styles.helplineCard]}
        activeOpacity={0.8}
        onPress={handleHelplineCall}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="call" size={20} color={colors.info} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.sosTitle, { color: colors.info }]}>HELPLINE 104</Text>
          <Text style={styles.sosSubtitle}>24x7 Medical Advice</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sosCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  ambulanceCard: {
    backgroundColor: colors.dangerLight,
    borderColor: '#FECACA',
  },
  helplineCard: {
    backgroundColor: colors.infoLight,
    borderColor: '#BFDBFE',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  sosTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
