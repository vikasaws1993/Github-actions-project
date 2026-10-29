import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CitizenTabParamList } from './types';
import { CitizenHomeScreen } from '../screens/home/CitizenHomeScreen';
import { TrackApplicationsScreen } from '../screens/application/TrackApplicationsScreen';
import { ContactSevakScreen } from '../screens/sevak/ContactSevakScreen';
import { AlertsScreen } from '../screens/alerts/AlertsScreen';
import { CitizenProfileScreen } from '../screens/profile/CitizenProfileScreen';
import { colors } from '../../shared/theme/colors';
import { useLanguage } from '../../shared/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alertsStore } from '../services/alertsStore';

const Tab = createBottomTabNavigator<CitizenTabParamList>();

export const CitizenTabNavigator: React.FC = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    alertsStore.getUnreadCount().then(setUnreadCount);
    const unsubscribe = alertsStore.subscribe(() => {
      alertsStore.getUnreadCount().then(setUnreadCount);
    });
    return unsubscribe;
  }, []);

  return (
    <Tab.Navigator
      id="CitizenTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.citizen.primary,
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
          let iconName = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Schemes') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CitizenHomeScreen} options={{ title: t('tabHome') }} />
      <Tab.Screen name="Records" component={TrackApplicationsScreen} options={{ title: t('tabStatus') }} />
      <Tab.Screen name="Appointments" component={ContactSevakScreen} options={{ title: t('tabSevak') }} />
      <Tab.Screen
        name="Schemes"
        component={AlertsScreen}
        options={{
          title: t('tabAlerts'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            lineHeight: 15,
          },
        }}
      />
      <Tab.Screen name="Profile" component={CitizenProfileScreen} options={{ title: t('tabProfile') }} />
    </Tab.Navigator>
  );
};


