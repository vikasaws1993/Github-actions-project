import { Platform } from 'react-native';

declare const process: { env: Record<string, string | undefined> };
declare const __DEV__: boolean;

const getLocalApiBaseUrl = () => {
  // 1. Custom environment variable override if defined
  const envUrl = (typeof process !== 'undefined' && process.env)
    ? (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL)
    : undefined;

  if (envUrl && !envUrl.includes('onrender.com')) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && !clean.endsWith('/api/v1')) {
      clean = `${clean}/api`;
    }
    // On Android emulator, replace localhost with 10.0.2.2 to access host machine
    if (Platform.OS === 'android' && clean.includes('localhost')) {
      clean = clean.replace('localhost', '10.0.2.2');
    }
    return clean;
  }

  // 2. Production Deployed Cloud Backend endpoint (AWS)
  return 'http://13.206.169.104/api';
};

export const APP_CONFIG = {
  APP_NAME: 'ArogyaMitra',
  APP_NAME_HINDI: 'आरोग्य मित्र',
  VERSION: '1.5.0',
  API_BASE_URL: getLocalApiBaseUrl(),
  MOBILE_API_BASE_URL: `${getLocalApiBaseUrl()}/mob`,
  DEFAULT_LANGUAGE: 'en',
  EMERGENCY_AMBULANCE_NUMBER: '108',
  HEALTH_HELPLINE_NUMBER: '104',
  STORAGE_KEYS: {
    AUTH_TOKEN: '@arogya_auth_token',
    USER_PROFILE: '@arogya_user_profile',
    USER_ROLE: '@arogya_user_role',
    OFFLINE_QUEUE: '@arogya_offline_queue',
    REGISTERED_CITIZENS: '@arogya_registered_citizens',
    APPLICATION_DRAFT: '@arogya_application_draft',
    SCHEMES_CACHE: '@arogya_cached_schemes',
  },
} as const;
