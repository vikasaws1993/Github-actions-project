import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CitizenStackParamList } from './types';
import { CitizenTabNavigator } from './CitizenTabNavigator';
import { NewApplicationScreen } from '../screens/application/NewApplicationScreen';
import { TrackApplicationsScreen } from '../screens/application/TrackApplicationsScreen';
import { CaseDetailsScreen } from '../screens/application/CaseDetailsScreen';
import { ContactSevakScreen } from '../screens/sevak/ContactSevakScreen';
import { AlertsScreen } from '../screens/alerts/AlertsScreen';

const Stack = createNativeStackNavigator<CitizenStackParamList>();

const ContactSevakTabRedirect: React.FC<any> = ({ navigation, route }) => {
  React.useEffect(() => {
    navigation.replace('CitizenTabs', { screen: 'Appointments', params: route.params });
  }, [navigation, route]);
  return null;
};

export const CitizenNavigator: React.FC = () => {
  return (
    <Stack.Navigator id="CitizenStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabNavigator} />
      <Stack.Screen name="NewApplication" component={NewApplicationScreen} />
      <Stack.Screen name="TrackApplications" component={TrackApplicationsScreen} />
      <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
      <Stack.Screen name="ContactSevak" component={ContactSevakTabRedirect} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
    </Stack.Navigator>
  );
};
