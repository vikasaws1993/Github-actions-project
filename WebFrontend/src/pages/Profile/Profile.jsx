import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  IdCard,
  UserCheck,
  X,
  CheckCircle2,
  Building2,
  Navigation,
  Home,
  Save,
  Edit,
  RefreshCw,
  Hospital,
  ShieldCheck,
  Calendar,
  Layers,
  Key,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import authService from '@/services/authService';
import Loader from '@/components/common/Loader/Loader';
import './Profile.css';

export const Profile = () => {
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formatRole = (role) => {
    if (!role) return 'ArogyaSevak';
    if (role === 'SEVAK' || role === 'arogyasevak' || role === 'sevak') return 'ArogyaSevak';
    if (role === 'ADMIN' || role === 'admin') return 'Admin';
    return role;
  };

  const getInitialProfile = () => {
    let cached = null;
    try {
      const raw = localStorage.getItem('ward_arogya_user') || localStorage.getItem('arogyamitra_profile_cache');
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}

    const cleanName = (cached?.full_name || cached?.name || user?.full_name || user?.name || '').replace(/^Dr\.\s*/i, '');
    const cleanMail = cached?.email || user?.email || '';
    const cleanPhone = cached?.mobile || cached?.phone || user?.mobile || user?.phone || '';
    const cleanEmp = cached?.employee_code || cached?.empId || user?.employee_code || user?.empId || '';
    const cleanRole = formatRole(cached?.role || user?.role);

    return {
      id: cached?.id || cached?.sevakId || user?.sevakId || user?.id || '',
      userId: cached?.user_id || cached?.userId || user?.user_id || user?.id || '',
      empId: cleanEmp,
      name: cleanName,
      phone: cleanPhone,
      email: cleanMail,
      designation: cached?.designation || user?.designation || 'Arogya Mitra Coordinator',
      district: cached?.district || user?.district || '',
      taluka: cached?.taluka || user?.taluka || '',
      city: cached?.city || user?.city || '',
      landmark: cached?.landmark || user?.landmark || '',
      pincode: cached?.pincode || user?.pincode || '',
      address: cached?.address || user?.address || '',
      role: cleanRole,
      status: cached?.status || user?.status || 'ACTIVE',
      joiningDate: cached?.joining_date || cached?.joiningDate || user?.joiningDate || '',
      hospital: {
        name: cached?.hospital?.name || cached?.hospital?.hospital_name || user?.hospital || '',
        code: cached?.hospital?.code || cached?.hospital?.hospital_code || user?.hospitalCode || '',
        contact: cached?.hospital?.contact || cached?.hospital?.hospital_contact || user?.hospitalContact || '',
        address: cached?.hospital?.address || cached?.hospital?.hospital_address || user?.hospitalAddress || '',
        assignmentId: cached?.hospital?.assignmentId || '',
        status: 'ACTIVE',
      },
      assignedHospitals: cached?.assignedHospitals || cached?.assigned_hospitals || user?.assignedHospitals || [],
    };
  };

  // Profile data state matching API response structure
  const [profileData, setProfileData] = useState(getInitialProfile);

  // Modal Form States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTaluka, setEditTaluka] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLandmark, setEditLandmark] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Helper to parse and apply API response data
  const applyApiData = useCallback((data) => {
    if (!data) return;

    const assignedHosp = data.hospital || (Array.isArray(data.assigned_hospitals) && data.assigned_hospitals[0]) || null;
    const cleanFullName = (data.full_name || data.name || profileData.name || '').replace(/^Dr\.\s*/i, '');
    const cleanMail = (data.email || profileData.email || '').replace(/^dr\./i, 'akanksha.');
    const cleanContact = data.mobile || data.phone || profileData.phone;
    const cleanEmpCode = data.employee_code || data.employee_id || data.empId || profileData.empId;

    const updated = {
      id: data.id || profileData.id,
      userId: data.user_id || profileData.userId,
      empId: cleanEmpCode,
      name: cleanFullName,
      phone: cleanContact,
      email: cleanMail,
      designation: data.designation || 'Arogya Mitra Coordinator',
      district: data.district || profileData.district,
      taluka: data.taluka || profileData.taluka,
      city: data.city || profileData.city,
      landmark: data.landmark || profileData.landmark,
      pincode: data.pincode || profileData.pincode,
      address: data.address || profileData.address,
      role: formatRole(data.role),
      status: data.status || 'ACTIVE',
      joiningDate: data.joining_date || profileData.joiningDate,
      hospital: {
        name: assignedHosp?.hospital_name || assignedHosp?.name || profileData.hospital.name,
        code: assignedHosp?.hospital_code || profileData.hospital.code,
        contact: assignedHosp?.hospital_contact || assignedHosp?.contact_number || profileData.hospital.contact,
        address: assignedHosp?.hospital_address || assignedHosp?.address || profileData.hospital.address,
        assignmentId: assignedHosp?.assignment_id || '',
        status: assignedHosp?.status || 'ACTIVE',
      },
      assignedHospitals: Array.isArray(data.assigned_hospitals) ? data.assigned_hospitals : [],
    };

    setProfileData(updated);
    try {
      localStorage.setItem('arogyamitra_profile_cache', JSON.stringify(updated));
    } catch (e) {}

    // Sync with Auth Context
    if (updateUser) {
      updateUser({
        name: cleanFullName,
        email: cleanMail,
        phone: cleanContact,
        mobile: cleanContact,
        empId: cleanEmpCode,
        employee_code: cleanEmpCode,
        role: updated.role,
        district: updated.district,
        taluka: updated.taluka,
        city: updated.city,
        address: updated.address,
        hospital: updated.hospital.name,
        hospitalCode: updated.hospital.code,
        hospitalContact: updated.hospital.contact,
        hospitalAddress: updated.hospital.address,
      });
    }
  }, [profileData, updateUser]);

  // Fetch full profile from API on mount
  const fetchProfile = useCallback(async () => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.systemRole === 'admin') {
      return;
    }
    setLoading(true);
    try {
      // 1. Try /api/arogya-sevaks/profile or /me
      let res = null;
      try {
        res = await api.get('/arogya-sevaks/profile');
      } catch (e1) {
        try {
          res = await api.get('/arogya-sevaks/me');
        } catch (e2) {
          const targetId = user?.sevakId || user?.id || '2ae3d935-a233-464b-b694-863149d95a99';
          try {
            res = await api.get(`/arogya-sevaks/${targetId}`);
          } catch (e3) {
            res = await api.get(`/admins/arogya-sevaks/${targetId}`);
          }
        }
      }

      if (res?.data) {
        applyApiData(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch remote profile API, utilizing cached session data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, applyApiData]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const openEditModal = () => {
    setEditName(profileData.name);
    setEditPhone(profileData.phone);
    setEditEmail(profileData.email);
    setEditDistrict(profileData.district);
    setEditTaluka(profileData.taluka);
    setEditCity(profileData.city);
    setEditLandmark(profileData.landmark);
    setEditAddress(profileData.address);
    setShowEditModal(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      const updatePayload = {
        full_name: editName.trim(),
        mobile: editPhone.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        district: editDistrict.trim(),
        taluka: editTaluka.trim(),
        city: editCity.trim(),
        landmark: editLandmark.trim(),
        address: editAddress.trim(),
      };

      const targetId = profileData.id || user?.sevakId || user?.id || 'profile';

      let updateRes = null;
      try {
        updateRes = await api.put(`/arogya-sevaks/${targetId}`, updatePayload);
      } catch (e1) {
        try {
          updateRes = await api.put('/arogya-sevaks/profile', updatePayload);
        } catch (e2) {
          updateRes = await api.put(`/admins/arogya-sevaks/${targetId}`, updatePayload);
        }
      }

      if (updateRes?.data) {
        applyApiData(updateRes.data);
      } else {
        // Fallback local update
        setProfileData((prev) => ({
          ...prev,
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          district: editDistrict.trim(),
          taluka: editTaluka.trim(),
          city: editCity.trim(),
          landmark: editLandmark.trim(),
          address: editAddress.trim(),
        }));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditModal(false);
        setToastMessage('Profile details updated successfully!');
        setTimeout(() => setToastMessage(''), 3000);
      }, 500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setToastMessage(err.message || 'Failed to update profile');
      setTimeout(() => setToastMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setToastMessage('Account password updated successfully!');
      setTimeout(() => setToastMessage(''), 3500);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePasswordModal(false);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to change password. Please verify your current password.';
      setPasswordError(errorMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = profileData.name
    ? profileData.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AP';

  const formattedCompleteAddress =
    profileData.address ||
    [
      profileData.city,
      profileData.taluka ? `Tal. ${profileData.taluka}` : '',
      profileData.district ? `Dist. ${profileData.district}` : '',
      profileData.pincode ? `- ${profileData.pincode}` : '',
    ]
      .filter(Boolean)
      .join(', ');

  if (loading && !profileData.name && !profileData.email) {
    return (
      <Loader
        fullPage
        message="Loading User Profile..."
        subtext="Fetching employee information and assigned hospital"
      />
    );
  }

  return (
    <div className="am-profile-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="am-profile-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="am-profile-card">
        {/* Profile Hero Header */}
        <div className="am-profile-hero">
          <div className="am-profile-hero-left">
            <div className="am-profile-avatar-large">
              {initials}
            </div>

            <div className="am-profile-info">
              <h2 className="am-profile-title">{profileData.name}</h2>
              <div className="am-profile-tag-row">
                <span className="am-profile-tag">{profileData.role}</span>
                <span className="am-profile-subtag">
                  {profileData.hospital?.name || 'No Hospital Assigned'}
                </span>
              </div>
            </div>
          </div>

          <div className="am-profile-hero-actions">
            <button
              type="button"
              className="am-btn-refresh-profile"
              onClick={fetchProfile}
              title="Refresh Profile"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'am-spin' : ''} />
            </button>
            <button
              type="button"
              className="am-btn-change-password-hero"
              onClick={() => {
                setPasswordError('');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setShowChangePasswordModal(true);
              }}
              title="Change Account Password"
            >
              <Key size={14} />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              className="am-btn-update-profile"
              onClick={openEditModal}
              id="btn-update-profile"
            >
              <Edit size={15} />
              <span>Update Profile</span>
            </button>
          </div>
        </div>

        {/* Section: ArogyaSevak Details */}
        <div className="am-profile-details-wrapper">
          <div className="am-profile-section-header">
            <h3 className="am-profile-section-title">ArogyaSevak Details</h3>
            <span className="am-profile-status-badge">
              <ShieldCheck size={13} />
              {profileData.status}
            </span>
          </div>

          <div className="am-profile-fields-grid">
            {/* Emp ID */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <IdCard size={15} className="am-p-icon" />
                <span className="am-p-label">EMP ID</span>
              </div>
              <span className="am-p-val am-p-empid">{profileData.empId || '—'}</span>
            </div>

            {/* Role / Designation */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <UserCheck size={15} className="am-p-icon" />
                <span className="am-p-label">ROLE / DESIGNATION</span>
              </div>
              <span className="am-p-val">{profileData.role}</span>
            </div>

            {/* Email */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <Mail size={15} className="am-p-icon" />
                <span className="am-p-label">EMAIL ADDRESS</span>
              </div>
              <span className="am-p-val">{profileData.email || '—'}</span>
            </div>

            {/* Mobile / Contact */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <Phone size={15} className="am-p-icon" />
                <span className="am-p-label">MOBILE NUMBER</span>
              </div>
              <span className="am-p-val">{profileData.phone || '—'}</span>
            </div>

            {/* District */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <Building2 size={15} className="am-p-icon" />
                <span className="am-p-label">ASSIGNED DISTRICT</span>
              </div>
              <span className="am-p-val">{profileData.district || '—'}</span>
            </div>

            {/* Taluka */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <Navigation size={15} className="am-p-icon" />
                <span className="am-p-label">TALUKA</span>
              </div>
              <span className="am-p-val">{profileData.taluka || '—'}</span>
            </div>

            {/* Village / City */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <Home size={15} className="am-p-icon" />
                <span className="am-p-label">VILLAGE / CITY</span>
              </div>
              <span className="am-p-val">{profileData.city || '—'}</span>
            </div>

            {/* Pincode / Landmark */}
            <div className="am-p-field-box">
              <div className="am-p-label-group">
                <MapPin size={15} className="am-p-icon" />
                <span className="am-p-label">PINCODE</span>
              </div>
              <span className="am-p-val">{profileData.pincode || '—'}</span>
            </div>

            {/* Complete Address spanning full width */}
            <div className="am-p-field-box am-field-full">
              <div className="am-p-label-group">
                <MapPin size={15} className="am-p-icon" />
                <span className="am-p-label">COMPLETE ADDRESS (CITY, TAL, DIS)</span>
              </div>
              <span className="am-p-val">{formattedCompleteAddress || '—'}</span>
            </div>
          </div>
        </div>

        {/* Section: Assigned Hospital Details */}
        {profileData.hospital?.name && (
          <div className="am-profile-details-wrapper am-hosp-section">
            <div className="am-profile-section-header">
              <h3 className="am-profile-section-title">Assigned Hospital Information</h3>
              <span className="am-hosp-code-badge">
                <Hospital size={13} />
                {profileData.hospital.code || 'HOSP'}
              </span>
            </div>

            <div className="am-profile-fields-grid">
              {/* Hospital Name */}
              <div className="am-p-field-box">
                <div className="am-p-label-group">
                  <Hospital size={15} className="am-p-icon" />
                  <span className="am-p-label">HOSPITAL NAME</span>
                </div>
                <span className="am-p-val am-hosp-name-val">{profileData.hospital.name}</span>
              </div>

              {/* Hospital Contact */}
              <div className="am-p-field-box">
                <div className="am-p-label-group">
                  <Phone size={15} className="am-p-icon" />
                  <span className="am-p-label">HOSPITAL HELPLINE / CONTACT</span>
                </div>
                <span className="am-p-val">{profileData.hospital.contact || '—'}</span>
              </div>

              {/* Hospital Address */}
              <div className="am-p-field-box am-field-full">
                <div className="am-p-label-group">
                  <MapPin size={15} className="am-p-icon" />
                  <span className="am-p-label">HOSPITAL ADDRESS</span>
                </div>
                <span className="am-p-val">{profileData.hospital.address || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          Update Profile Compact Modal Dialog
          ========================================================================= */}
      {showEditModal && (
        <div className="am-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div
            className="am-modal-dialog am-profile-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="am-modal-header am-profile-modal-header">
              <div className="am-modal-title-wrap">
                <UserCheck size={18} className="am-modal-icon-blue" />
                <h3 className="am-modal-title">Update Profile Details</h3>
              </div>
              <button
                type="button"
                className="am-modal-close"
                onClick={() => setShowEditModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {saveSuccess ? (
              <div className="am-success-notice">
                <CheckCircle2 size={32} className="am-success-icon" />
                <h4>Profile details updated successfully!</h4>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="am-modal-form am-profile-modal-form">
                <div className="am-profile-modal-scrollable">
                  {/* Row 1: Emp ID & Email */}
                  <div className="am-form-2col">
                    <div className="am-form-field">
                      <label>Emp ID (System Assigned)</label>
                      <input
                        type="text"
                        className="am-form-input am-input-disabled"
                        value={profileData.empId}
                        disabled
                      />
                    </div>

                    <div className="am-form-field">
                      <label>
                        Email Address<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="email"
                        className="am-form-input"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="akankshapawashe@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2: Full Name & Mobile */}
                  <div className="am-form-2col">
                    <div className="am-form-field">
                      <label>
                        Full Name<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="am-form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="AKANKSHA PAWASHE"
                        required
                      />
                    </div>

                    <div className="am-form-field">
                      <label>
                        Mobile Number<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="tel"
                        className="am-form-input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="8857920000"
                        required
                      />
                    </div>
                  </div>

                  {/* Address Section Subheading */}
                  <div className="am-modal-subheading">
                    <Home size={13} />
                    <span>Residential Address (Dis • Tal • City • Address)</span>
                  </div>

                  {/* Row 3: District & Taluka */}
                  <div className="am-form-2col">
                    <div className="am-form-field">
                      <label>
                        District (Dis)<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="am-form-input"
                        value={editDistrict}
                        onChange={(e) => setEditDistrict(e.target.value)}
                        placeholder="fddfg"
                        required
                      />
                    </div>

                    <div className="am-form-field">
                      <label>
                        Taluka (Tal)<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="am-form-input"
                        value={editTaluka}
                        onChange={(e) => setEditTaluka(e.target.value)}
                        placeholder="sdfg"
                        required
                      />
                    </div>
                  </div>

                  {/* Row 4: Village/City & Landmark */}
                  <div className="am-form-2col">
                    <div className="am-form-field">
                      <label>
                        Village / City<span className="am-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="am-form-input"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="sdfg"
                        required
                      />
                    </div>

                    <div className="am-form-field">
                      <label>Landmark</label>
                      <input
                        type="text"
                        className="am-form-input"
                        value={editLandmark}
                        onChange={(e) => setEditLandmark(e.target.value)}
                        placeholder="dfg"
                      />
                    </div>
                  </div>

                  {/* Row 5: Full Address */}
                  <div className="am-form-field">
                    <label>Complete Address</label>
                    <input
                      type="text"
                      className="am-form-input"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Abhinav College Road, Nahre Pune"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="am-modal-actions am-profile-modal-actions">
                  <button
                    type="button"
                    className="am-btn-secondary"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="am-btn-primary" disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw size={14} className="am-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="am-modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="am-modal-box am-pw-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header am-pw-modal-header">
              <div className="am-pw-modal-title-group">
                <div className="am-pw-modal-icon-badge">
                  <Key size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 className="am-modal-title">Change Account Password</h3>
                  <p className="am-modal-subtitle">Update your system login credentials securely</p>
                </div>
              </div>
              <button
                type="button"
                className="am-modal-close"
                onClick={() => setShowChangePasswordModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="am-pw-form-body">
                {passwordError && (
                  <div className="am-pw-error-alert">
                    <AlertCircle size={16} />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="am-pw-form-field">
                  <label className="am-pw-form-label">Current Password</label>
                  <div className="am-pw-input-wrap">
                    <Lock size={16} className="am-pw-input-icon" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="am-pw-form-input"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="am-pw-eye-btn"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="am-pw-form-field">
                  <label className="am-pw-form-label">New Password</label>
                  <div className="am-pw-input-wrap">
                    <Key size={16} className="am-pw-input-icon" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="am-pw-form-input"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Enter new password (min. 6 chars)"
                      required
                    />
                    <button
                      type="button"
                      className="am-pw-eye-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="am-pw-form-field">
                  <label className="am-pw-form-label">Confirm New Password</label>
                  <div className="am-pw-input-wrap">
                    <ShieldCheck size={16} className="am-pw-input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="am-pw-form-input"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="am-pw-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="am-modal-actions am-pw-modal-actions">
                <button
                  type="button"
                  className="am-btn-pw-cancel"
                  onClick={() => setShowChangePasswordModal(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="am-btn-pw-submit"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <RefreshCw size={15} className="am-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
