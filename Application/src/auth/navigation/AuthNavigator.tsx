import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/auth.types';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { CitizenRegisterScreen } from '../screens/CitizenRegisterScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id="AuthStack"
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="CitizenRegister" component={CitizenRegisterScreen} />
    </Stack.Navigator>
  );
};

