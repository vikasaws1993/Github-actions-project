import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '@/services/authService';
import { clearPatientsCache } from '@/services/patientService';
import api from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ward_arogya_user');

    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'SEVAK' || parsed.role === 'sevak' || parsed.role === 'arogyasevak') {
          parsed.role = 'ArogyaSevak';
        }
        if (!parsed.empId && parsed.employee_code) {
          parsed.empId = parsed.employee_code;
        }
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Failed to parse saved user:', error);
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('ward_arogya_token'));
  });

  const [loading, setLoading] = useState(false);

  // Synchronize live profile from backend when authenticated
  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem('ward_arogya_token');
    if (!token) return;

    let savedUser = null;
    try {
      const savedUserStr = localStorage.getItem('ward_arogya_user');
      if (savedUserStr) savedUser = JSON.parse(savedUserStr);
    } catch (_) {}

    const isAdmin = savedUser && (
      savedUser.role === 'ADMIN' ||
      savedUser.role === 'SUPER_ADMIN' ||
      savedUser.systemRole === 'admin'
    );

    try {
      if (isAdmin) {
        // Admin profile sync
        try {
          const res = await api.get('/admins/profile');
          if (res && res.data) {
            const d = res.data;
            const cleanName = (d.full_name || d.name || 'Admin User').trim();
            const liveAdmin = {
              ...(savedUser || {}),
              id: d.id || d.user_id,
              userId: d.user_id || d.id,
              name: cleanName,
              full_name: cleanName,
              email: d.email || '',
              phone: d.mobile || d.phone || '',
              mobile: d.mobile || d.phone || '',
              role: 'ADMIN',
              systemRole: 'admin',
            };
            setUser(liveAdmin);
            localStorage.setItem('ward_arogya_user', JSON.stringify(liveAdmin));
          }
        } catch (_) {}
        return;
      }

      // Arogya Sevak profile sync
      let res = null;
      try {
        res = await api.get('/arogya-sevaks/me');
      } catch (e1) {
        try {
          res = await api.get('/arogya-sevaks/profile');
        } catch (e2) {}
      }

      if (res && res.data) {
        const d = res.data;
        const assignedHosp = d.hospital || (Array.isArray(d.assigned_hospitals) && d.assigned_hospitals[0]) || null;
        const cleanName = (d.full_name || d.name || '').trim();
        const initials = cleanName
          .split(' ')
          .filter(Boolean)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'AS';

        const liveUser = {
          ...(savedUser || {}),
          id: d.id || d.user_id || savedUser?.id,
          userId: d.user_id || d.id || savedUser?.userId,
          sevakId: d.id || savedUser?.sevakId,
          name: cleanName || savedUser?.name,
          full_name: cleanName || savedUser?.full_name,
          email: d.email || savedUser?.email || '',
          phone: d.mobile || d.phone || savedUser?.phone || '',
          mobile: d.mobile || d.phone || savedUser?.mobile || '',
          empId: d.employee_code || d.employee_id || d.empId || savedUser?.empId || '',
          employee_code: d.employee_code || d.employee_id || d.empId || savedUser?.employee_code || '',
          role: 'ArogyaSevak',
          systemRole: 'sevak',
          initials,
          isBackup: Boolean(d.is_backup || d.isBackup || savedUser?.isBackup || savedUser?.is_backup),
          is_backup: Boolean(d.is_backup || d.isBackup || savedUser?.isBackup || savedUser?.is_backup),
          coveringFor: d.covering_for_name || d.coveringFor || savedUser?.coveringFor || savedUser?.primarySevakName || null,
          primarySevakName: d.covering_for_name || d.primarySevakName || savedUser?.primarySevakName || savedUser?.coveringFor || null,
          coveringForSevakId: d.covering_for_sevak_id || d.coveringForSevakId || savedUser?.coveringForSevakId || null,
          district: d.district || savedUser?.district || '',
          taluka: d.taluka || savedUser?.taluka || '',
          city: d.city || savedUser?.city || '',
          address: d.address || savedUser?.address || '',
          landmark: d.landmark || savedUser?.landmark || '',
          pincode: d.pincode || savedUser?.pincode || '',
          joiningDate: d.joining_date || savedUser?.joiningDate || '',
          status: d.status || savedUser?.status || 'ACTIVE',
          hospital: assignedHosp?.hospital_name || assignedHosp?.name || savedUser?.hospital || '',
          hospitalCode: assignedHosp?.hospital_code || savedUser?.hospitalCode || '',
          hospitalContact: assignedHosp?.hospital_contact || assignedHosp?.contact_number || savedUser?.hospitalContact || '',
          hospitalAddress: assignedHosp?.hospital_address || assignedHosp?.address || savedUser?.hospitalAddress || '',
          assignedHospitals: Array.isArray(d.assigned_hospitals) && d.assigned_hospitals.length > 0 ? d.assigned_hospitals : (savedUser?.assignedHospitals || []),
        };

        setUser(liveUser);
        localStorage.setItem('ward_arogya_user', JSON.stringify(liveUser));
      }
    } catch (err) {
      console.warn('[AuthContext] Could not fetch live user profile from backend:', err?.message);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshUserProfile();
    }
  }, [isAuthenticated, refreshUserProfile]);

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...(prev || {}), ...updatedFields };

      if (updatedFields.name) {
        const clean = updatedFields.name.trim();
        updated.name = clean;
        updated.initials =
          clean
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'AS';
      }

      if (updated.role === 'SEVAK' || updated.role === 'sevak' || updated.role === 'arogyasevak') {
        updated.role = 'ArogyaSevak';
      }

      localStorage.setItem('ward_arogya_user', JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (credentials) => {
    setLoading(true);

    try {
      const response = await authService.login(credentials);

      localStorage.setItem('ward_arogya_token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('ward_arogya_refresh_token', response.refreshToken);
      }
      localStorage.setItem(
        'ward_arogya_user',
        JSON.stringify(response.user)
      );

      setUser(response.user);
      setIsAuthenticated(true);

      return response;
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.setPassword(payload);
      localStorage.setItem('ward_arogya_token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('ward_arogya_refresh_token', response.refreshToken);
      }
      localStorage.setItem('ward_arogya_user', JSON.stringify(response.user));
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const registerWithPassword = async (payload) => {
    setLoading(true);
    try {
      const response = await authService.registerWithPassword(payload);
      localStorage.setItem('ward_arogya_token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('ward_arogya_refresh_token', response.refreshToken);
      }
      localStorage.setItem('ward_arogya_user', JSON.stringify(response.user));
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      clearPatientsCache();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('ward_arogya_token');
      localStorage.removeItem('ward_arogya_refresh_token');
      localStorage.removeItem('ward_arogya_user');
      localStorage.removeItem('arogyamitra_profile_cache');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        setPassword,
        logout,
        registerWithPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;