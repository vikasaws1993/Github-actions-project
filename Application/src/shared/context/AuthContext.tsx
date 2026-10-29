import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../constants/roles';
import { UserProfile, CitizenRegistrationInput } from '../types/common.types';
import { storage } from '../services/storage/storage';
import { APP_CONFIG } from '../constants/config';
import { authApi } from '../../api/authApi';
import { apiClient } from '../../api/client';
import { applicationStore } from '../../citizen/services/applicationStore';
import { alertsStore } from '../../citizen/services/alertsStore';
import { notificationService } from '../../citizen/services/notificationService';

export type UserResolutionResult =
  | { status: 'SEVAK'; user: UserProfile }
  | { status: 'EXISTING_CITIZEN'; user: UserProfile }
  | { status: 'NEW_CITIZEN'; phoneNumber: string };

// Arogya Sevak table
export const MOCK_AROGYA_SEVAKS: UserProfile[] = [];

// Registered citizen table
export const DEFAULT_CITIZENS: UserProfile[] = [];

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '').slice(-10);
};

export interface SendOtpResult {
  success: boolean;
  message: string;
  isRegistered: boolean;
  role: 'CITIZEN' | 'AROGYA_SEVAK' | 'ADMIN' | null;
  isAllowedOnMobile: boolean;
  otpSent: boolean;
  otp?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registeredCitizens: UserProfile[];
  login: (role: UserRole, customUser?: Partial<UserProfile>) => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<SendOtpResult>;
  verifyOtpAndResolve: (phoneNumber: string, otp: string) => Promise<UserResolutionResult>;
  registerCitizen: (data: CitizenRegistrationInput) => Promise<UserProfile>;
  updateUserProfile: (updatedFields: Partial<Omit<UserProfile, 'id' | 'role' | 'phoneNumber'>>) => Promise<UserProfile>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  registeredCitizens: DEFAULT_CITIZENS,
  login: async () => {},
  sendOtp: async () => ({
    success: false,
    message: '',
    isRegistered: false,
    role: null,
    isAllowedOnMobile: true,
    otpSent: false,
  }),
  verifyOtpAndResolve: async () => ({ status: 'NEW_CITIZEN', phoneNumber: '' }),
  registerCitizen: async () => DEFAULT_CITIZENS[0],
  updateUserProfile: async () => DEFAULT_CITIZENS[0],
  switchRole: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [registeredCitizens, setRegisteredCitizens] = useState<UserProfile[]>(DEFAULT_CITIZENS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      // 1. Load persisted registered citizens if any
      const savedCitizens = await storage.getItem<UserProfile[]>(APP_CONFIG.STORAGE_KEYS.REGISTERED_CITIZENS);
      if (savedCitizens && Array.isArray(savedCitizens)) {
        setRegisteredCitizens(savedCitizens);
      } else {
        setRegisteredCitizens([]);
      }

      // 2. Load active auth session
      const savedRole = await storage.getItem<UserRole>(APP_CONFIG.STORAGE_KEYS.USER_ROLE);
      const savedUser = await storage.getItem<UserProfile>(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);

      if (savedRole && savedUser) {
        setRole(savedRole);
        setUser(savedUser);
        const userIdentifier = normalizePhone(savedUser.phoneNumber) || savedUser.id;
        applicationStore.setActiveUser(userIdentifier);
        alertsStore.setActiveUser(userIdentifier);
        notificationService.setActiveUser(userIdentifier);
        notificationService.requestPermission();

        // If logged in as Sevak, refresh profile from backend API to ensure identical data across Web & Mobile
        if (savedRole === UserRole.AROGYA_SEVAK) {
          (async () => {
            try {
              const res = await authApi.checkSession();
              const profileRes = await apiClient.get('/arogya-sevaks/me');
              if (profileRes?.success && profileRes?.data) {
                const p = profileRes.data;
                const refreshedUser: UserProfile = {
                  ...savedUser,
                  id: p.id || p.user_id || savedUser.id,
                  name: p.full_name || p.name || savedUser.name,
                  phoneNumber: p.mobile || p.phone || savedUser.phoneNumber,
                  email: p.email || savedUser.email,
                  assignedWard: p.ward || (p.assigned_hospitals?.[0]?.hospital_name ? `${p.assigned_hospitals[0].hospital_name}` : savedUser.assignedWard),
                  badgeNumber: p.employee_code || p.employee_id || savedUser.badgeNumber,
                  address: p.address || savedUser.address,
                  district: p.district || savedUser.district,
                  taluka: p.taluka || savedUser.taluka,
                };
                setUser(refreshedUser);
                await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE, refreshedUser);
              }
            } catch (_) {}
          })();
        }
      }
    } catch (err) {
      console.error('[AuthContext] Session load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (selectedRole: UserRole, customUser?: Partial<UserProfile>) => {
    setIsLoading(true);
    try {
      const userProfile: UserProfile = {
        id: customUser?.id || `usr-${Date.now()}`,
        name: customUser?.name || '',
        phoneNumber: customUser?.phoneNumber || '',
        role: selectedRole,
        abhaId: customUser?.abhaId,
        assignedWard: customUser?.assignedWard,
        badgeNumber: customUser?.badgeNumber,
        dob: customUser?.dob,
        gender: customUser?.gender,
        address: customUser?.address,
        state: customUser?.state,
        district: customUser?.district,
        taluka: customUser?.taluka,
        pincode: customUser?.pincode,
        email: customUser?.email,
      };

      await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_ROLE, selectedRole);
      await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE, userProfile);

      const userIdentifier = normalizePhone(userProfile.phoneNumber) || userProfile.id;
      applicationStore.setActiveUser(userIdentifier);
      alertsStore.setActiveUser(userIdentifier);
      notificationService.setActiveUser(userIdentifier);
      notificationService.requestPermission();

      setRole(selectedRole);
      setUser(userProfile);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Request OTP from backend /mob/send-otp API
   */
  const sendOtp = async (phoneNumber: string): Promise<SendOtpResult> => {
    const cleanNumber = normalizePhone(phoneNumber);
    try {
      const json = await authApi.sendOtp(cleanNumber);
      const isStatusForbidden = json?.statusCode === 403;

      if (isStatusForbidden || json?.isAllowedOnMobile === false) {
        return {
          success: false,
          message: json?.message || 'Admin login is not allowed on Mobile App / अॅडमिन ला मोबाईल अॅपवर लॉगिन करण्याची परवानगी नाही.',
          isRegistered: true,
          role: 'ADMIN',
          isAllowedOnMobile: false,
          otpSent: false,
        };
      }

      if (json?.success) {
        const rawRole = json?.role || json?.data?.role;
        const role = rawRole === 'AROGYA_SEVAK' || rawRole === 'SEVAK'
          ? 'AROGYA_SEVAK'
          : rawRole === 'CITIZEN'
          ? 'CITIZEN'
          : rawRole === 'ADMIN'
          ? 'ADMIN'
          : null;

        return {
          success: true,
          message: json?.message || 'OTP sent successfully',
          isRegistered: Boolean(json?.isRegistered ?? json?.isMobileRegistered),
          role,
          isAllowedOnMobile: true,
          otpSent: true,
          otp: json?.otp || json?.data?.otp || undefined,
        };
      }

      // If backend returned network error or unreachable, fallback to offline/demo mode
      if (json?.isNetworkError || json?.statusCode === 500 || json?.statusCode === 408) {
        console.warn('[AuthContext] Backend unreachable, proceeding in offline/local mode for:', cleanNumber);
        const isCitizen = registeredCitizens.some((c) => normalizePhone(c.phoneNumber) === cleanNumber);
        const isSevak = cleanNumber === '2222222222' || cleanNumber === '8381053553';
        const role = isSevak ? 'AROGYA_SEVAK' : isCitizen ? 'CITIZEN' : null;

        return {
          success: true,
          message: 'OTP sent (Offline Mode)',
          isRegistered: isCitizen || isSevak,
          role,
          isAllowedOnMobile: true,
          otpSent: true,
          otp: '123456',
        };
      }

      return {
        success: false,
        message: json?.message || 'Failed to send OTP',
        isRegistered: false,
        role: null,
        isAllowedOnMobile: true,
        otpSent: false,
      };
    } catch (err) {
      console.warn('[AuthContext] Backend API unreachable:', err);
      const isCitizen = registeredCitizens.some((c) => normalizePhone(c.phoneNumber) === cleanNumber);
      const isSevak = cleanNumber === '2222222222' || cleanNumber === '8381053553';
      const role = isSevak ? 'AROGYA_SEVAK' : isCitizen ? 'CITIZEN' : null;

      return {
        success: true,
        message: 'OTP sent (Offline Mode)',
        isRegistered: isCitizen || isSevak,
        role,
        isAllowedOnMobile: true,
        otpSent: true,
        otp: '123456',
      };
    }
  };

  /**
   * Evaluates the entered phone number upon OTP verification via backend API:
   */
  const verifyOtpAndResolve = async (
    phoneNumber: string,
    otpCode: string
  ): Promise<UserResolutionResult> => {
    const cleanNumber = normalizePhone(phoneNumber);
    const cleanOtp = otpCode.trim();

    try {
      const json = await authApi.verifyOtp(cleanNumber, cleanOtp);
      const payload = json?.data || json;
      const isStatusForbidden = json?.statusCode === 403;

      if (isStatusForbidden || payload?.status === 'ADMIN_PROHIBITED') {
        throw new Error(json?.message || 'Admin login is not allowed on Mobile App / अॅडमिन ला मोबाईल अॅपवर लॉगिन करण्याची परवानगी नाही.');
      }

      // Check explicit OTP failures from backend
      if (json?.success === false || payload?.isOtpValid === false || payload?.otpVerified === false) {
        throw new Error(json?.message || 'Invalid OTP code. Please enter correct 6-digit OTP / अमान्य OTP. कृपया बरोबर ६ अंकी OTP टाका.');
      }

      // Check if registration is required for new citizen
      const isRegisteredUser = Boolean(json?.isRegistered ?? payload?.isRegistered ?? payload?.user?.isRegistered);
      if (payload?.status === 'REGISTRATION_REQUIRED' || !isRegisteredUser) {
        return { status: 'NEW_CITIZEN', phoneNumber: cleanNumber };
      }

      if (payload?.status === 'LOGIN_SUCCESS' || isRegisteredUser) {
        const resolvedRole = (payload?.role || json?.role) === 'AROGYA_SEVAK'
          ? UserRole.AROGYA_SEVAK
          : UserRole.CITIZEN;

        const profileData = resolvedRole === UserRole.AROGYA_SEVAK
          ? (payload?.sevakProfile || payload?.user || {})
          : (payload?.citizenProfile || payload?.user || {});

        const userProfile: UserProfile = {
          id: String(profileData?.id || payload?.user?.id || `usr-${cleanNumber}`),
          name: profileData?.name || profileData?.full_name || payload?.user?.full_name || payload?.user?.name || '',
          phoneNumber: cleanNumber,
          role: resolvedRole,
          assignedWard: profileData?.assignedWard || profileData?.assigned_ward || profileData?.ward,
          badgeNumber: profileData?.badgeNumber || profileData?.employee_code || profileData?.employee_id,
          dob: profileData?.dob,
          gender: profileData?.gender,
          address: profileData?.address,
          state: profileData?.state || 'Maharashtra',
          district: profileData?.district,
          taluka: profileData?.taluka,
          pincode: profileData?.pincode,
          email: profileData?.email || payload?.user?.email,
        };

        if (payload?.token || payload?.accessToken) {
          await storage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, payload?.token || payload?.accessToken);
        }

        await login(resolvedRole, userProfile);
        return resolvedRole === UserRole.AROGYA_SEVAK
          ? { status: 'SEVAK', user: userProfile }
          : { status: 'EXISTING_CITIZEN', user: userProfile };
      }

      throw new Error(json?.message || 'Invalid OTP code / अमान्य OTP.');
    } catch (err: any) {
      if (err.message) {
        throw err;
      }
      console.warn('[AuthContext] Backend OTP verify error:', err);
      if (!cleanOtp || cleanOtp.length !== 6) {
        throw new Error('Invalid OTP code. Please enter 6-digit OTP / अमान्य OTP. कृपया ६ अंकी OTP टाका.');
      }

      const matchedCitizen = registeredCitizens.find((c) => normalizePhone(c.phoneNumber) === cleanNumber);
      if (matchedCitizen) {
        await login(UserRole.CITIZEN, matchedCitizen);
        return { status: 'EXISTING_CITIZEN', user: matchedCitizen };
      }

      return { status: 'NEW_CITIZEN', phoneNumber: cleanNumber };
    }
  };

  /**
   * Registers a new citizen via backend API and sets session.
   */
  const registerCitizen = async (data: CitizenRegistrationInput): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const cleanNumber = normalizePhone(data.phoneNumber);

      const reqBody = {
        phoneNumber: cleanNumber,
        mobileNumber: cleanNumber,
        name: data.name.trim(),
        full_name: data.name.trim(),
        dob: data.dob.trim(),
        gender: data.gender,
        address: data.address.trim(),
        state: data.state.trim() || 'Maharashtra',
        district: data.district.trim(),
        dist: data.district.trim(),
        taluka: data.taluka.trim(),
        tal: data.taluka.trim(),
        pincode: data.pincode.trim(),
        email: data.email?.trim() || undefined,
      };

      let authToken: string | null = null;
      try {
        const json = await authApi.registerCitizen(data);
        if (!json?.success) {
          throw new Error(json?.message || 'Citizen registration failed');
        }
        authToken = json?.token || json?.accessToken || json?.data?.token || json?.data?.accessToken || null;
        if (authToken) {
          await storage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, authToken);
        }
      } catch (apiErr) {
        console.warn('[AuthContext] Backend register call skipped/offline fallback:', apiErr);
      }

      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const newCitizen: UserProfile = {
        id: `ctz-${uniqueSuffix}`,
        name: data.name.trim(),
        phoneNumber: cleanNumber,
        role: UserRole.CITIZEN,
        abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${uniqueSuffix}`,
        dob: data.dob.trim(),
        gender: data.gender,
        address: data.address.trim(),
        state: data.state.trim() || 'Maharashtra',
        district: data.district.trim(),
        taluka: data.taluka.trim(),
        pincode: data.pincode.trim(),
        email: data.email?.trim() || undefined,
      };

      // Update in-memory and persisted citizens
      const updatedList = [...registeredCitizens.filter((c) => normalizePhone(c.phoneNumber) !== cleanNumber), newCitizen];
      setRegisteredCitizens(updatedList);
      await storage.setItem(APP_CONFIG.STORAGE_KEYS.REGISTERED_CITIZENS, updatedList);

      // Log in as this newly registered citizen
      await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_ROLE, UserRole.CITIZEN);
      await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE, newCitizen);

      applicationStore.setActiveUser(cleanNumber);
      alertsStore.setActiveUser(cleanNumber);

      setRole(UserRole.CITIZEN);
      setUser(newCitizen);

      return newCitizen;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Updates an existing user profile (name, dob, gender, address, etc.)
   * explicitly preserving their mobile number and role.
   */
  const updateUserProfile = async (
    updatedFields: Partial<Omit<UserProfile, 'id' | 'role' | 'phoneNumber'>>
  ): Promise<UserProfile> => {
    if (!user) {
      throw new Error('No user currently logged in');
    }

    const updatedUser: UserProfile = {
      ...user,
      ...updatedFields,
      // Identity fields cannot be changed
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    setUser(updatedUser);
    await storage.setItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE, updatedUser);

    // If Arogya Sevak, sync with backend
    if (user.role === UserRole.AROGYA_SEVAK) {
      try {
        const { apiClient } = require('../../api/client');
        await apiClient.put('/arogya-sevaks/me', {
          full_name: updatedFields.name || user.name,
          email: updatedFields.email || user.email,
          address: updatedFields.address || user.address,
        });
      } catch (err) {
        console.warn('[AuthContext] Arogya Sevak backend profile sync skipped:', err);
      }
    }

    // If citizen, also persist in registered citizens list
    if (user.role === UserRole.CITIZEN) {
      const cleanNumber = normalizePhone(user.phoneNumber);
      const updatedList = registeredCitizens.map((c) =>
        normalizePhone(c.phoneNumber) === cleanNumber ? updatedUser : c
      );
      setRegisteredCitizens(updatedList);
      await storage.setItem(APP_CONFIG.STORAGE_KEYS.REGISTERED_CITIZENS, updatedList);
    }

    return updatedUser;
  };

  const switchRole = async (newRole: UserRole) => {
    await login(newRole);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      applicationStore.clearCache();
      alertsStore.clearCache();

      // Clear all Sevak specific local caches
      try {
        const { sevakDailyUpdateService } = require('../../arogya-sevak/services/sevakDailyUpdateService');
        await sevakDailyUpdateService.clearCache();
      } catch (_) {}
      try {
        const { sevakHospitalService } = require('../../arogya-sevak/services/sevakHospitalService');
        await sevakHospitalService.clearCache();
      } catch (_) {}
      try {
        const { sevakDraftService } = require('../../arogya-sevak/services/sevakDraftService');
        await sevakDraftService.clearAllDrafts();
      } catch (_) {}

      await storage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_ROLE);
      await storage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
      await storage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!role && !!user,
        isLoading,
        registeredCitizens,
        login,
        sendOtp,
        verifyOtpAndResolve,
        registerCitizen,
        updateUserProfile,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
