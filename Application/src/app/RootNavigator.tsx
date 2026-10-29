import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../shared/hooks/useAuth';
import { UserRole } from '../shared/constants/roles';
import { AuthNavigator } from '../auth/navigation/AuthNavigator';
import { CitizenNavigator } from '../citizen/navigation/CitizenNavigator';
import { SevakNavigator } from '../arogya-sevak/navigation/SevakNavigator';
import { WelcomeScreen } from '../auth/screens/WelcomeScreen';
import { colors } from '../shared/theme/colors';

export const RootNavigator: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.citizen.primary} />
      </View>
    );
  }

  // Show Welcome / Leader screen when application opens
  if (!hasStarted) {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  if (!isAuthenticated || !role) {
    return <AuthNavigator />;
  }

  if (role === UserRole.CITIZEN) {
    return <CitizenNavigator />;
  }

  if (role === UserRole.AROGYA_SEVAK) {
    return <SevakNavigator />;
  }

  return <AuthNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
