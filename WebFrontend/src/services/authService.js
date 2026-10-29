import api from './api';
import { clearPatientsCache } from './patientService';

function formatUserData(rawUser, token, refreshToken) {
  const name = rawUser?.full_name || rawUser?.name || 'User';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const role =
    rawUser?.role === 'SEVAK' || rawUser?.role === 'sevak' || rawUser?.role === 'arogyasevak'
      ? 'ArogyaSevak'
      : (rawUser?.role || 'ArogyaSevak');

  const empId =
    rawUser?.sevak?.employee_code ||
    rawUser?.employee_code ||
    rawUser?.empId ||
    rawUser?.employee_id ||
    rawUser?.id ||
    '';

  const user = {
    ...rawUser,
    empId,
    employee_code: empId,
    name,
    initials: rawUser?.initials || initials,
    role,
    systemRole: (rawUser?.role || '').toLowerCase(),
    department: rawUser?.admin?.department || (role === 'ArogyaSevak' ? 'Ward Support' : 'Health Administration'),
    hospital: rawUser?.sevak?.hospital_name || rawUser?.hospital || '',
    ward: rawUser?.sevak?.ward || '',
  };

  return {
    token,
    refreshToken,
    user,
  };
}

export const authService = {
  /**
   * Initiate web portal auth: verifies user role (Admin/Arogya Sevak).
   * Returns:
   *  - { status: 'PASSWORD_REQUIRED', name, role } for returning users with password set.
   *  - { status: 'FIRST_TIME_OTP', name, role, otp } for first-time allocated users without password.
   * Throws 404 if not found or unauthorized citizen.
   */
  async initiateAuth({ mobileNumber }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const res = await api.post('/auth/initiate', { mobileNumber: cleanMobile });
    return res?.data || res;
  },

  async login(credentials) {
    const cleanMobile =
      credentials.mobileNumber?.replace(/\D/g, '') ||
      credentials.mobile ||
      '';

    const payload = {
      mobileNumber: cleanMobile,
      password: credentials.password,
    };

    const res = await api.post('/auth/login', payload);

    const authData = res?.data || res;

    const token = authData?.token || authData?.accessToken;
    const refreshToken = authData?.refreshToken;
    const rawUser = authData?.user || {};

    if (refreshToken) {
      localStorage.setItem('ward_arogya_refresh_token', refreshToken);
    }

    return formatUserData(rawUser, token, refreshToken);
  },

  async sendOtp({ mobileNumber }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const res = await api.post('/auth/send-otp', { mobileNumber: cleanMobile });
    return res?.data || res;
  },

  async verifyOtp({ mobileNumber, otp }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const res = await api.post('/auth/verify-otp', { mobileNumber: cleanMobile, otp: String(otp).trim() });
    return res?.data || res;
  },

  /**
   * First-time allocated user sets their permanent password (re-pass verified on frontend)
   * Automatically completes login and returns auth token and user.
   */
  async setPassword({ mobileNumber, password }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const res = await api.post('/auth/set-password', {
      mobileNumber: cleanMobile,
      password,
    });
    const authData = res?.data || res;
    const token = authData?.token || authData?.accessToken;
    const refreshToken = authData?.refreshToken;
    const rawUser = authData?.user || {};

    if (refreshToken) {
      localStorage.setItem('ward_arogya_refresh_token', refreshToken);
    }

    return formatUserData(rawUser, token, refreshToken);
  },

  /**
   * Reset password for user after OTP verification in Forgot Password flow
   */
  async resetPassword({ mobileNumber, password }) {
    return this.setPassword({ mobileNumber, password });
  },

  async registerWithPassword({ mobileNumber, password, full_name }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const res = await api.post('/auth/register-password', {
      mobileNumber: cleanMobile,
      password,
      full_name,
    });
    const authData = res?.data || res;
    const token = authData?.token || authData?.accessToken;
    const refreshToken = authData?.refreshToken;
    const rawUser = authData?.user || {};

    if (refreshToken) {
      localStorage.setItem('ward_arogya_refresh_token', refreshToken);
    }

    return formatUserData(rawUser, token, refreshToken);
  },

  /**
   * Refresh session using stored refresh token
   */
  async refreshSession() {
    const refreshToken = localStorage.getItem('ward_arogya_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const res = await api.post('/auth/refresh', { refreshToken });
    const authData = res?.data || res;
    const token = authData?.token || authData?.accessToken;
    const newRefreshToken = authData?.refreshToken || refreshToken;

    if (token) {
      localStorage.setItem('ward_arogya_token', token);
    }
    if (newRefreshToken) {
      localStorage.setItem('ward_arogya_refresh_token', newRefreshToken);
    }

    return { token, refreshToken: newRefreshToken };
  },

  /**
   * Logout user: notifies backend to invalidate refresh token and clears client storage
   */
  async logout() {
    const refreshToken = localStorage.getItem('ward_arogya_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Logout server notification failed:', err.message);
    } finally {
      clearPatientsCache();
      localStorage.removeItem('ward_arogya_token');
      localStorage.removeItem('ward_arogya_refresh_token');
      localStorage.removeItem('ward_arogya_user');
      localStorage.removeItem('arogyamitra_daily_updates_cache');
      localStorage.removeItem('arogyamitra_hospital_stats');
      localStorage.removeItem('ward_arogya_assigned_hospital');
      localStorage.removeItem('arogya_sevak_info');
    }
  },


  /**
   * Change password for currently authenticated user
   */
  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    const res = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res?.data || res;
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('ward_arogya_user');

    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem('ward_arogya_user');
      return null;
    }
  },
};

export default authService;