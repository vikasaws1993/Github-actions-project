import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../shared/context/AuthContext';
import { LanguageProvider } from '../shared/context/LanguageContext';
import { SchemeProvider } from '../shared/context/SchemeContext';
import { RootNavigator } from './RootNavigator';
import { permissionService } from '../shared/services/permissionService';

export default function App() {
  useEffect(() => {
    // Request all required runtime permissions on first install / first launch
    permissionService.requestInitialAppPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <SchemeProvider>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" />
              <RootNavigator />
            </NavigationContainer>
          </SchemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
