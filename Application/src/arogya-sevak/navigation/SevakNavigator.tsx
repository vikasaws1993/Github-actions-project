import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SevakStackParamList } from './types';
import { SevakTabNavigator } from './SevakTabNavigator';
import { OfflineSyncScreen } from '../screens/sync/OfflineSyncScreen';
import { PatientCaseDetailsScreen } from '../screens/patients/PatientCaseDetailsScreen';
import { HospitalFacilitySurveyScreen } from '../screens/hospital/HospitalFacilitySurveyScreen';
import { DailyHospitalUpdateScreen } from '../screens/hospital/DailyHospitalUpdateScreen';
import { OpdVisitsScreen } from '../screens/visits/OpdVisitsScreen';
import { UrgentRequestsScreen } from '../screens/urgent/UrgentRequestsScreen';
import { DoctorManagementScreen } from '../screens/doctor/DoctorManagementScreen';
import { SevakNotificationsScreen } from '../screens/notifications/SevakNotificationsScreen';
import { SevakDataProvider } from '../context/SevakDataContext';
import { SevakLanguageProvider } from '../../shared/context/LanguageContext';

const Stack = createNativeStackNavigator<SevakStackParamList>();

export const SevakNavigator: React.FC = () => {
  return (
    <SevakLanguageProvider>
      <SevakDataProvider>
        <Stack.Navigator id="SevakStack" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SevakTabs" component={SevakTabNavigator} />
        <Stack.Screen name="OfflineSync" component={OfflineSyncScreen} />
        <Stack.Screen name="PatientCaseDetails" component={PatientCaseDetailsScreen} />
        <Stack.Screen name="HospitalSurvey" component={HospitalFacilitySurveyScreen} />
        <Stack.Screen name="HospitalProfile" component={HospitalFacilitySurveyScreen} />
        <Stack.Screen name="UrgentRequests" component={UrgentRequestsScreen} />
        <Stack.Screen name="DailyHospitalUpdate" component={DailyHospitalUpdateScreen} />
        <Stack.Screen name="OpdVisits" component={OpdVisitsScreen} />
        <Stack.Screen name="DoctorManagement" component={DoctorManagementScreen} />
        <Stack.Screen name="SevakNotifications" component={SevakNotificationsScreen} />
      </Stack.Navigator>
    </SevakDataProvider>
  </SevakLanguageProvider>
  );
};

