import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SevakTabParamList } from './types';
import { SevakDashboardScreen } from '../screens/dashboard/SevakDashboardScreen';
import { AllocatedPatientsScreen } from '../screens/patients/AllocatedPatientsScreen';
import { UrgentRequestsScreen } from '../screens/urgent/UrgentRequestsScreen';
import { CaseDocumentsScreen } from '../screens/documents/CaseDocumentsScreen';
import { SevakProfileScreen } from '../screens/profile/SevakProfileScreen';
import { useLanguage } from '../../shared/context/LanguageContext';
import { colors } from '../../shared/theme/colors';

const Tab = createBottomTabNavigator<SevakTabParamList>();

export const SevakTabNavigator: React.FC = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <Tab.Navigator
      id="SevakTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sevak.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'grid-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AllocatedPatients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'UrgentRequests') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'CaseDocuments') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          const iconColor = color;
          return <Ionicons name={iconName} size={size} color={iconColor} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SevakDashboardScreen} options={{ tabBarLabel: t('sevakTabDashboard'), title: t('sevakTabDashboard') }} />
      <Tab.Screen name="AllocatedPatients" component={AllocatedPatientsScreen} options={{ tabBarLabel: t('sevakTabPatients'), title: t('sevakTabPatients') }} />
      <Tab.Screen
        name="UrgentRequests"
        component={UrgentRequestsScreen}
        options={{
          tabBarLabel: t('sevakTabUrgent'),
          title: t('sevakTabUrgent'),
        }}
      />
      <Tab.Screen name="CaseDocuments" component={CaseDocumentsScreen} options={{ tabBarLabel: t('sevakTabDocuments'), title: t('sevakTabDocuments') }} />
      <Tab.Screen name="Profile" component={SevakProfileScreen} options={{ tabBarLabel: t('sevakTabProfile'), title: t('sevakTabProfile') }} />
    </Tab.Navigator>
  );
};


