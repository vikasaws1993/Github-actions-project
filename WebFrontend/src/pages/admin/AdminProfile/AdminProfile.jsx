import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Shield,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  Activity,
  Award,
  Calendar,
  Lock,
  Edit2,
  X,
  Save,
  Briefcase,
  TrendingUp,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import authService from '@/services/authService';
import './AdminProfile.css';
import '../components/AdminModals.css';

export const AdminProfile = () => {
  const {
    operator,
    metrics,
    applicationStats,
    adminNotifications,
    cases,
    updateOperatorProfile,
    showToast
  } = useAdmin();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPasswordLoading, setChangingPasswordLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState({
    name: operator.name || '',
    email: operator.email || '',
    phone: operator.phone || operator.mobile || '',
    department: operator.department || '',
    role: operator.role || operator.designation || '',
    streetAddress: operator.streetAddress || operator.address || '',
    city: operator.city || '',
    taluka: operator.taluka || '',
    district: operator.district || '',
    landmark: operator.landmark || '',
    avatar: operator.avatar || null
  });

  useEffect(() => {
    if (operator) {
      setFormData({
        name: operator.name || '',
        email: operator.email || '',
        phone: operator.phone || operator.mobile || '',
        department: operator.department || 'Health Administration',
        role: operator.role || operator.designation || 'Administrator',
        streetAddress: operator.streetAddress || operator.address || '',
        city: operator.city || '',
        taluka: operator.taluka || '',
        district: operator.district || 'Pune',
        landmark: operator.landmark || '',
        avatar: operator.avatar || localStorage.getItem('arogya_admin_avatar') || null
      });
    }
  }, [operator]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setChangingPasswordLoading(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      if (showToast) {
        showToast('Account password updated successfully!', 'success');
      }
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to change password. Please check your current password.';
      setPasswordError(errorMsg);
    } finally {
      setChangingPasswordLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setFormData((prev) => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, avatar: null }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!formData.name?.trim()) {
      setEditError('Full Name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      setEditError('Mobile contact is required.');
      return;
    }

    setSaving(true);
    try {
      await updateOperatorProfile({
        name: formData.name.trim(),
        full_name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        department: formData.department?.trim() || 'Health Administration',
        designation: formData.role?.trim() || 'Administrator',
        role: formData.role?.trim() || 'Administrator',
        address: formData.streetAddress?.trim() || '',
        streetAddress: formData.streetAddress?.trim() || '',
        city: formData.city?.trim() || '',
        taluka: formData.taluka?.trim() || '',
        district: formData.district?.trim() || '',
        landmark: formData.landmark?.trim() || '',
        avatar: formData.avatar || null,
      });
      setIsEditing(false);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update profile. Please try again.';
      setEditError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Audit Activity Stream derived from live cases and notifications
  const recentActivities = useMemo(() => {
    const stream = [];

    // Add recent claimed/reviewed cases by this operator
    if (Array.isArray(cases) && cases.length > 0) {
      const currentAdminName = operator?.name || 'Admin';
      const myClaimed = cases.filter(
        (c) =>
          c.reviewedByAdminName?.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
          c.reviewed_by_admin_name?.toLowerCase().trim() === currentAdminName.toLowerCase().trim()
      );

      myClaimed.slice(0, 3).forEach((c, idx) => {
        const caseNum = c.applicationNumber || c.application_number || c.id;
        const patName = c.patientName || c.patient_name || 'Patient';
        stream.push({
          id: `case-act-${idx}`,
          title: `Claimed & Reviewing Case #${caseNum} (${patName})`,
          time: c.claimedAt ? new Date(c.claimedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently',
          type: 'blue',
        });
      });
    }

    // Add live admin notifications
    if (Array.isArray(adminNotifications) && adminNotifications.length > 0) {
      adminNotifications.slice(0, 4).forEach((notif, idx) => {
        let type = 'green';
        if (notif.type === 'SLA_REMINDER' || notif.priority === 'CRITICAL') type = 'amber';
        if (notif.type === 'STATUS_CHANGE') type = 'blue';

        stream.push({
          id: `notif-act-${idx}`,
          title: notif.title || notif.message || 'System Notification',
          time: notif.created_at ? new Date(notif.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently',
          type,
        });
      });
    }

    // Fallback baseline items if system is brand new
    if (stream.length === 0) {
      return [
        { id: 1, title: 'Super Administrator Session Authenticated', time: 'Today', type: 'green' },
        { id: 2, title: 'Queue telemetry synchronized with Health Department', time: 'Today', type: 'blue' },
        { id: 3, title: 'Portal security protocols active (256-bit encryption)', time: 'Active', type: 'green' },
      ];
    }

    return stream.slice(0, 5);
  }, [cases, adminNotifications, operator]);

  // Derived display values
  const closedCount = metrics?.closedThisMonth || applicationStats?.closedCount || 0;
  const activeCount = metrics?.activeCases || applicationStats?.inReviewCount || (Array.isArray(cases) ? cases.filter(c => c.status !== 'CLOSED' && c.status !== 'REJECTED').length : 0);
  const totalCount = metrics?.totalApplications || applicationStats?.totalApplications || (Array.isArray(cases) ? cases.length : 0);
  const operatorInitials = operator.initials || (operator.name ? operator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD');
  const avatarUrl = operator.avatar || localStorage.getItem('arogya_admin_avatar') || null;

  return (
    <div className="admin-profile-page">
      {/* Sleek Hero Profile Banner */}
      <div className="profile-banner-card">
        <div className="profile-identity-wrap">
          <div className="profile-avatar-container">
            <div className="profile-avatar-large">
              {avatarUrl ? (
                <img src={avatarUrl} alt={operator.name} className="profile-avatar-img" />
              ) : (
                operatorInitials
              )}
            </div>
            <label className="profile-avatar-badge" title="Upload / Edit Profile Picture">
              <Camera size={14} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      updateOperatorProfile({ avatar: ev.target.result });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div className="profile-meta-info">
            <h1 className="profile-full-name">
              {operator.name || 'Admin Officer'}
            </h1>
            <div className="profile-subtitle-row">
              <span className="profile-role-title">
                <Shield size={15} color="#60a5fa" />
                {operator.role || operator.designation || 'Administrator'}
              </span>
              <span className="profile-id-badge">
                ID: {operator.operatorId || (operator.id ? `OP-${String(operator.id).substring(0, 4).toUpperCase()}` : 'OP-ADMIN')}
              </span>
              {avatarUrl && (
                <button
                  type="button"
                  className="btn-remove-hero-avatar"
                  onClick={() => updateOperatorProfile({ avatar: null })}
                  title="Remove Profile Picture"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="profile-banner-right-actions">
          <div className="profile-status-pill">
            <span className="pulse-dot" />
            {operator.status || 'Active Duty'}
          </div>
          <button
            className="btn-change-password-action"
            onClick={() => {
              setPasswordError('');
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setIsChangingPassword(true);
            }}
          >
            <Key size={15} /> Change Password
          </button>
          <button
            className="btn-edit-profile-action"
            onClick={() => {
              setEditError('');
              setFormData({
                name: operator.name || '',
                email: operator.email || '',
                phone: operator.phone || operator.mobile || '',
                department: operator.department || 'Health Administration',
                role: operator.role || operator.designation || 'Administrator',
                streetAddress: operator.streetAddress || operator.address || '',
                city: operator.city || '',
                taluka: operator.taluka || '',
                district: operator.district || 'Pune',
                landmark: operator.landmark || '',
                avatar: avatarUrl
              });
              setIsEditing(true);
            }}
          >
            <Edit2 size={15} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Modern 4-Card Performance Stats Grid */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="stat-card-icon green">
            <CheckCircle size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{closedCount}</span>
            <span className="stat-card-label">Cases Closed / Sanctioned</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon blue">
            <TrendingUp size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">99.2%</span>
            <span className="stat-card-label">SLA Compliance Rate</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon purple">
            <Briefcase size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{activeCount}</span>
            <span className="stat-card-label">Active Cases Under Review</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon amber">
            <Clock size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{totalCount}</span>
            <span className="stat-card-label">Total Applications Queue</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Recent Activity */}
      <div className="profile-content-grid">
        {/* Left Column: Official Credentials */}
        <div className="profile-card-section">
          <h3 className="profile-section-title">
            <User size={18} color="#2563eb" />
            Official Credentials & Contact
          </h3>

          <div className="profile-detail-list">
            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <Mail size={15} />
                Email Address
              </div>
              <span className="detail-value-text">{operator.email || 'Not configured'}</span>
            </div>

            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <Phone size={15} />
                Mobile Contact
              </div>
              <span className="detail-value-text">{operator.phone || operator.mobile || 'Not configured'}</span>
            </div>

            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <MapPin size={15} />
                Jurisdiction & Location
              </div>
              <span className="detail-value-text">
                {[operator.city, operator.taluka ? `${operator.taluka} Taluka` : null, operator.district].filter(Boolean).join(', ') || operator.district || 'Pune'}
              </span>
            </div>

            {operator.address && (
              <div className="detail-item-row">
                <div className="detail-label-wrap">
                  <MapPin size={15} />
                  Office Address
                </div>
                <span className="detail-value-text">{operator.address}</span>
              </div>
            )}

            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <Building2 size={15} />
                Department
              </div>
              <span className="detail-value-text">{operator.department || 'Health Administration'}</span>
            </div>

            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <Lock size={15} />
                Portal Access Level
              </div>
              <span className="detail-access-pill">
                Super Admin (Level 3)
              </span>
            </div>

            <div className="detail-item-row">
              <div className="detail-label-wrap">
                <Calendar size={15} />
                Account Registered
              </div>
              <span className="detail-value-text">{operator.registeredDate || 'Active System User'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Audit Stream */}
        <div className="profile-card-section">
          <h3 className="profile-section-title">
            <Activity size={18} color="#059669" />
            Recent Operator Audit Stream
          </h3>

          <div className="profile-activity-stream">
            {recentActivities.map((act) => (
              <div key={act.id} className="activity-log-item">
                <div className={`activity-icon-pill ${act.type}`}>
                  <CheckCircle size={15} />
                </div>
                <div className="activity-text-wrap">
                  <span className="activity-title">{act.title}</span>
                  <span className="activity-time">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="admin-modal-backdrop" onClick={() => setIsEditing(false)}>
          <div className="admin-modal-card profile-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header modal-header-styled">
              <div className="admin-modal-title-wrap">
                <div className="modal-title-icon-box">
                  <Edit2 size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 className="admin-modal-title">Edit Administrator Profile</h3>
                  <span className="admin-modal-subtitle">Update your personal details, designation & profile picture</span>
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setIsEditing(false)} title="Close Modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="profile-edit-form-grid">
                {editError && (
                  <div className="password-error-alert" style={{ marginBottom: '12px' }}>
                    <AlertCircle size={16} />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Profile Photo Upload Field */}
                <div className="admin-photo-upload-section">
                  <label className="form-label-stylish">Profile Photo</label>
                  <div className="admin-photo-upload-card">
                    <div className="admin-photo-preview-circle">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt="Profile Preview" className="admin-photo-img" />
                      ) : (
                        <span className="admin-photo-initials">{operatorInitials}</span>
                      )}
                    </div>

                    <div className="admin-photo-upload-controls">
                      <div className="admin-photo-btn-row">
                        <label className="btn-upload-admin-photo">
                          <Upload size={14} />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {formData.avatar && (
                          <button
                            type="button"
                            className="btn-remove-admin-photo"
                            onClick={handleRemoveImage}
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <span className="admin-photo-hint">Supported formats: JPG, PNG or WebP.</span>
                    </div>
                  </div>
                </div>

                {/* Row 1: Full Name & Mobile Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field-stylish">
                    <label className="form-label-stylish">Full Name *</label>
                    <div className="input-with-icon-wrap">
                      <User size={15} className="input-icon-left" />
                      <input
                        type="text"
                        className="form-input-stylish"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field-stylish">
                    <label className="form-label-stylish">Mobile Contact *</label>
                    <div className="input-with-icon-wrap">
                      <Phone size={15} className="input-icon-left" />
                      <input
                        type="tel"
                        className="form-input-stylish"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Email Address & Department */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field-stylish">
                    <label className="form-label-stylish">Official Email</label>
                    <div className="input-with-icon-wrap">
                      <Mail size={15} className="input-icon-left" />
                      <input
                        type="email"
                        className="form-input-stylish"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. admin@arogyamitra.gov.in"
                      />
                    </div>
                  </div>

                  <div className="form-field-stylish">
                    <label className="form-label-stylish">Department</label>
                    <div className="input-with-icon-wrap">
                      <Building2 size={15} className="input-icon-left" />
                      <input
                        type="text"
                        className="form-input-stylish"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. Health Administration"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Role / Designation */}
                <div className="form-field-stylish">
                  <label className="form-label-stylish">Role / Designation</label>
                  <div className="input-with-icon-wrap">
                    <Shield size={15} className="input-icon-left" />
                    <input
                      type="text"
                      className="form-input-stylish"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g. Administrator / District Officer"
                    />
                  </div>
                </div>

                {/* Row 4: Street Address */}
                <div className="form-field-stylish">
                  <label className="form-label-stylish">Office / Street Address</label>
                  <div className="input-with-icon-wrap">
                    <MapPin size={15} className="input-icon-left" />
                    <input
                      type="text"
                      className="form-input-stylish"
                      value={formData.streetAddress}
                      onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                      placeholder="e.g. Health Department Office, Collectorate"
                    />
                  </div>
                </div>

                {/* Row 5: City, Taluka, District */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-field-stylish">
                    <label className="form-label-stylish">City</label>
                    <input
                      type="text"
                      className="form-input-stylish"
                      style={{ paddingLeft: '12px' }}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Pune"
                    />
                  </div>
                  <div className="form-field-stylish">
                    <label className="form-label-stylish">Taluka</label>
                    <input
                      type="text"
                      className="form-input-stylish"
                      style={{ paddingLeft: '12px' }}
                      value={formData.taluka}
                      onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                      placeholder="e.g. Haveli"
                    />
                  </div>
                  <div className="form-field-stylish">
                    <label className="form-label-stylish">District</label>
                    <input
                      type="text"
                      className="form-input-stylish"
                      style={{ paddingLeft: '12px' }}
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g. Pune"
                    />
                  </div>
                </div>

                {/* Row 6: Nearest Landmark */}
                <div className="form-field-stylish">
                  <label className="form-label-stylish">Nearest Landmark</label>
                  <input
                    type="text"
                    className="form-input-stylish"
                    style={{ paddingLeft: '12px' }}
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g. Near District Court / Central Building"
                  />
                </div>
              </div>

              <div className="profile-edit-modal-footer">
                <button
                  type="button"
                  className="btn-profile-modal-cancel"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-profile-modal-save"
                  disabled={saving}
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="admin-modal-backdrop" onClick={() => setIsChangingPassword(false)}>
          <div className="admin-modal-card profile-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header modal-header-styled">
              <div className="admin-modal-title-wrap">
                <div className="modal-title-icon-box password-icon-box">
                  <Key size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 className="admin-modal-title">Change Account Password</h3>
                  <span className="admin-modal-subtitle">Update your administrator login password securely</span>
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setIsChangingPassword(false)} title="Close Modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="profile-edit-form-grid">
                {passwordError && (
                  <div className="password-error-alert">
                    <AlertCircle size={16} />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="form-field-stylish">
                  <label className="form-label-stylish">Current Password *</label>
                  <div className="input-with-icon-wrap">
                    <Lock size={16} className="input-icon-left" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="form-input-stylish"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-field-stylish">
                  <label className="form-label-stylish">New Password *</label>
                  <div className="input-with-icon-wrap">
                    <Key size={16} className="input-icon-left" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input-stylish"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password (min. 6 characters)"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-field-stylish">
                  <label className="form-label-stylish">Confirm New Password *</label>
                  <div className="input-with-icon-wrap">
                    <ShieldCheck size={16} className="input-icon-left" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input-stylish"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="profile-edit-modal-footer">
                <button
                  type="button"
                  className="btn-profile-modal-cancel"
                  onClick={() => setIsChangingPassword(false)}
                  disabled={changingPasswordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-profile-modal-save btn-pwd-submit"
                  disabled={changingPasswordLoading}
                >
                  <Save size={16} /> {changingPasswordLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
