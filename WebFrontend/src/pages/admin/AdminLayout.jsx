import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  PhoneCall,
  Building2,
  UserCheck,
  Users,
  Shield,
  Award,
  BarChart3,
  Bell,
  HeartHandshake,
  LogOut,
  Plus,
  UserPlus,
  FileText,
  Menu,
  FolderKanban,
  Share2,
  Zap,
  AlertTriangle,
  X,
  User,
  CheckCheck,
  Check,
  Clock,
  ArrowRight,
  Inbox,
  AlertCircle,
  ExternalLink,
  Trash2,
  Eye,
  RotateCw,
  Radio,
  Layers
} from 'lucide-react';
import { useAdmin } from './AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSelector } from '@/components/common/LanguageSelector/LanguageSelector';
import AdminModals from './components/AdminModals';
import './AdminLayout.css';

// Page header configuration keyed by route path
const PAGE_HEADERS = {
  '/admin': {
    title: 'Operations Dashboard',
    subtitle: 'Real-time overview of cases, follow-ups & system health',
  },
  '/admin/cases': {
    title: 'Case Queue Management',
    subtitle: 'All submitted patient cases — track, review & coordinate',
  },
  '/admin/escalations': {
    title: 'Urgent Administrative Escalations',
    subtitle: 'Budget ceiling increase & super-specialty transfer cases',
  },
  '/admin/follow-ups': {
    title: 'Case Follow-Ups & Priority Triage',
    subtitle: 'All registered cases sorted priority-wise for immediate operator action',
  },

  '/admin/documents': {
    title: 'Case Documents Repository',
    subtitle: 'Centralized document vault for Citizen & ArogyaSevak uploaded records',
  },
  '/admin/referrals': {
    title: 'Referral Advocate Performance Directory',
    subtitle: 'Track citizen application referral sources, referrer case volume & performance metrics',
  },
  '/admin/hospitals': {
    title: 'Hospital Management',
    subtitle: 'Empanelled hospitals directory & sevak assignment overview',
  },
  '/admin/hospitals/assign-sevaks': {
    title: 'Assign ArogyaSevaks to Hospital',
    subtitle: 'Assign nearest ArogyaSevaks based on real-time location proximity matching',
  },
  '/admin/hospitals/add': {
    title: 'Add New Hospital',
    subtitle: 'Register a new empanelled hospital to the network',
  },
  '/admin/sevaks': {
    title: 'ArogyaSevak Management',
    subtitle: 'Field representatives registry & assignment tracker',
  },
  '/admin/schemes': {
    title: 'Government Scheme Management',
    subtitle: 'Configure empanelled healthcare schemes, coverage parameters & eligibility criteria',
  },
  '/admin/schemes/add': {
    title: 'Register New Scheme',
    subtitle: 'Add a new empanelled government healthcare scheme to the portal',
  },
  '/admin/admins': {
    title: 'System Admins Management',
    subtitle: 'Authorized Portal Administrators Directory & Management',
  },
  '/admin/package-master': {
    title: 'Package Master & Clinical Procedures',
    subtitle: 'Specialties, procedure packages, tariff schedules & CSV import management',
  },
  '/admin/packages': {
    title: 'Package Master & Clinical Procedures',
    subtitle: 'Specialties, procedure packages, tariff schedules & CSV import management',
  },
  '/admin/users': {
    title: 'Patients History & Beneficiary Registry',
    subtitle: 'Comprehensive record directory of registered patient beneficiaries',
  },
  '/admin/mla-profile': {
    title: 'Hon. MLA Leadership Profile',
    subtitle: 'Official patron profile & health welfare initiative records',
  },
  '/admin/send-notifications': {
    title: 'Direct Push Notifications & Broadcasts',
    subtitle: 'Directly dispatch notifications to Citizen and Arogya Sevak mobile applications',
  },
  '/admin/notifications': {
    title: 'Direct Push Notifications & Broadcasts',
    subtitle: 'Directly dispatch notifications to Citizen and Arogya Sevak mobile applications',
  },
  '/admin/reports': {
    title: 'Analytics & Operations Reports',
    subtitle: 'Hospital performance, sevak telemetry & operational intelligence',
  },
  '/admin/profile': {
    title: 'Administrator Profile & Credentials',
    subtitle: 'System operator details, access role & activity metrics',
  },
};

export const AdminLayout = () => {
  const {
    operator,
    metrics,
    currentDate,
    setActiveModal,
    cases,
    pendingFollowUps,
    escalationRequests,
    adminNotifications = [],
    unreadNotificationsCount = 0,
    fetchAdminNotifications,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    clearSeenAdminNotifications,
    clearAllAdminNotifications,
    deleteAdminNotification,
  } = useAdmin();
  const { logout } = useAuth();
  const { t, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure Admin Portal is strictly English only
  useEffect(() => {
    if (typeof setLanguage === 'function') {
      setLanguage('en');
    }
  }, [setLanguage]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState('unread'); // 'unread' | 'sla' | 'seen'
  const notifRef = useRef(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    if (notifDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifDropdownOpen]);

  const handleAdminLogout = () => {
    setShowLogoutConfirm(false);
    if (logout) logout();
    navigate('/');
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read && markAdminNotificationRead) {
      markAdminNotificationRead(notif.id);
    }
    const targetCaseId =
      notif.case_id ||
      notif.application_id ||
      notif.metadata?.caseId ||
      notif.metadata?.applicationId;
    if (targetCaseId) {
      setNotifDropdownOpen(false);
      navigate(`/admin/cases/${targetCaseId}`);
    }
  };

  const handleDeleteNotification = (e, notifId) => {
    e.stopPropagation();
    if (deleteAdminNotification) {
      deleteAdminNotification(notifId);
    }
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter notifications by tab — strictly ensuring only incoming admin alerts appear
  const safeAdminNotifications = (Array.isArray(adminNotifications) ? adminNotifications : []).filter((n) => {
    const rType = String(n?.recipient_type || '').toUpperCase();
    if (['CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST'].includes(rType)) {
      return false;
    }
    if (n?.is_broadcast && rType !== 'ADMIN') return false;
    return true;
  });
  const unreadNotifications = safeAdminNotifications.filter((n) => !n?.is_read);
  const seenNotifications = safeAdminNotifications.filter((n) => n?.is_read);
  const unreadBadgeCount = unreadNotifications.length;
  const slaNotifications = unreadNotifications.filter(
    (n) =>
      n?.type === 'SLA_REMINDER' ||
      n?.type === 'ESCALATION' ||
      n?.priority === 'CRITICAL' ||
      n?.priority === 'HIGH' ||
      n?.action_type === 'VIEW_CASE'
  );

  const displayedNotifications =
    activeNotifTab === 'unread'
      ? unreadNotifications
      : activeNotifTab === 'sla'
        ? slaNotifications
        : seenNotifications;

  // Find the best matching header for the current route
  const defaultHeader = PAGE_HEADERS[location.pathname] || {
    title: 'Admin Panel',
    subtitle: 'ArogyaMitra administration portal',
  };

  const pageTitle = (location.pathname === '/admin' && t('dashboard.title')) ||
                    (location.pathname === '/admin/reports' && t('reports.title')) ||
                    (location.pathname === '/admin/schemes' && t('schemes.title')) ||
                    defaultHeader.title;

  const pageSubtitle = (location.pathname === '/admin' && t('dashboard.subtitle')) ||
                       (location.pathname === '/admin/reports' && t('reports.subtitle')) ||
                       (location.pathname === '/admin/schemes' && t('schemes.subtitle')) ||
                       defaultHeader.subtitle;

  const closeSidebarMobile = () => {
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  const caseQueueCount = (cases || []).length;
  const escalationsCount = (escalationRequests || []).filter(r => r.status === 'on_hold').length;
  const followUpCount = (pendingFollowUps || []).filter((f) => {
    const targetCase = (cases || []).find((c) => c.id === f.caseId);
    if (targetCase) {
      const st = (targetCase.status || '').toLowerCase();
      if (st === 'closed' || st === 'case closed' || st === 'resolved') return false;
    }
    return true;
  }).length;
  const totalDocsCount = (cases || []).reduce((acc, c) => acc + ((c.documents || []).length), 0);

  return (
    <div className="admin-app-shell">
      {/* Mobile Sidebar Backdrop Overlay */}
      <div
        className={`admin-sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Dark Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-brand-header">
          <div className="admin-brand-logo-box">
            <HeartHandshake size={22} className="admin-brand-icon" />
          </div>
          <div className="admin-brand-text">
            <h1 className="admin-brand-title">ArogyaMitra</h1>
            <span className="admin-brand-subtitle">Admin Panel</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="admin-nav">
          {/* MAIN */}
          <div className="admin-nav-group">
            <span className="admin-nav-heading">{t('nav.main', 'MAIN')}</span>
            <ul className="admin-nav-items">
              <li>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <LayoutDashboard size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.dashboard', 'Dashboard')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/cases"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Files size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.caseQueue', 'Case Queue')}</span>
                  <span className="admin-badge-count">{caseQueueCount}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/escalations"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Zap size={17} className="nav-icon" style={{ color: '#ef4444' }} />
                  <span className="nav-label">{t('nav.priorityRequests', 'Priority Requests')}</span>
                  <span className="admin-badge-count" style={{ backgroundColor: '#ef4444' }}>{escalationsCount}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/documents"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <FolderKanban size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.caseDocuments', 'Case Documents')}</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* COMMUNICATION & BROADCASTS */}
          <div className="admin-nav-group">
            <span className="admin-nav-heading">{t('nav.communication', 'COMMUNICATION')}</span>
            <ul className="admin-nav-items">
              <li>
                <NavLink
                  to="/admin/send-notifications"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Radio size={17} className="nav-icon" style={{ color: '#10B981' }} />
                  <span className="nav-label">{t('nav.sendNotification', 'Send Notification')}</span>
                  <span className="admin-badge-count" style={{ backgroundColor: '#0A5C53', color: '#FFFFFF', fontSize: '9.5px', padding: '1px 6px' }}>{t('nav.directBadge', 'DIRECT')}</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* MANAGEMENT */}
          <div className="admin-nav-group">
            <span className="admin-nav-heading">{t('nav.management', 'MANAGEMENT')}</span>
            <ul className="admin-nav-items">
              <li>
                <NavLink
                  to="/admin/hospitals"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.hospitals', 'Hospitals')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/sevaks"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <UserCheck size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.arogyaSevaks', 'ArogyaSevaks')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/admins"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Shield size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.admins', 'Admins')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/schemes"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <FileText size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.schemes', 'Schemes')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/package-master"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Layers size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.packageMaster', 'Package Master')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/hospitals/assign-sevaks"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <UserPlus size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.assignSevaks', 'Assign Sevaks')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Users size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.patientsHistory', 'Patients History')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/referrals"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Share2 size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.referrals', 'Referrals')}</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/mla-profile"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Award size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.mlaProfile', 'Hon. MLA Profile')}</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* REPORTS */}
          <div className="admin-nav-group">
            <span className="admin-nav-heading">{t('nav.reportsGroup', 'REPORTS')}</span>
            <ul className="admin-nav-items">
              <li>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BarChart3 size={17} className="nav-icon" />
                  <span className="nav-label">{t('nav.reports', 'Reports')}</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        {/* Bottom Switcher / Sign Out */}
        <div className="admin-sidebar-footer">
          <NavLink
            to="/admin/profile"
            className={({ isActive }) => `admin-profile-footer-btn ${isActive ? 'active' : ''}`}
            onClick={closeSidebarMobile}
            title="View My Profile"
          >
            <User size={16} />
            <span>{t('nav.myProfile', 'My Profile')}</span>
          </NavLink>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="admin-switch-btn"
            title="Log Out of Admin Portal"
          >
            <LogOut size={16} />
            <span>{t('nav.logOut', 'Log Out')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-viewport">
        {/* Universal Page Header — visible on every screen */}
        <header className="admin-page-header">
          <div className="admin-page-header-left">
            <div className="admin-page-title-row">
              <button
                className="admin-mobile-toggle-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Toggle Sidebar Menu"
                aria-label="Toggle Sidebar Menu"
              >
                <Menu size={20} />
              </button>
              <h2 className="admin-page-title">{pageTitle}</h2>
              <span className="admin-portal-badge">
                <Shield size={12} />
                {t('header.adminPortalActive', 'Admin Portal Active')}
              </span>
            </div>
            <span className="admin-page-subtitle">{pageSubtitle}</span>
          </div>
          <div className="admin-header-right" ref={notifRef}>
            {/* Language Selector Dropdown (Disabled / Commented out for now) */}
            {/* <LanguageSelector /> */}

            {/* Notification Bell Dropdown Button */}
            <div className="admin-notif-btn-wrapper">
              <button
                type="button"
                className={`admin-notif-bell-btn ${unreadBadgeCount > 0 ? 'has-unread' : ''} ${notifDropdownOpen ? 'active' : ''}`}
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                title="View Admin Notifications & SLA Alerts"
                aria-label="Notifications"
              >
                <Bell size={18} className="bell-icon" />
                {unreadBadgeCount > 0 && (
                  <span className="admin-notif-badge-count">
                    {unreadBadgeCount > 99 ? '99+' : unreadBadgeCount}
                  </span>
                )}
                {unreadBadgeCount > 0 && <span className="bell-pulse-ring"></span>}
              </button>

              {/* Dropdown Panel */}
              {notifDropdownOpen && (
                <div className="admin-notif-dropdown">
                  <div className="admin-notif-header">
                    <div className="admin-notif-header-title">
                      <div className="admin-notif-header-icon">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4>Notifications & Alerts</h4>
                        <span className="admin-notif-subtext">
                          {unreadNotifications.length > 0
                            ? `${unreadNotifications.length} fresh pending`
                            : 'All caught up'}
                        </span>
                      </div>
                    </div>
                    <div className="admin-notif-header-actions">
                      {activeNotifTab === 'seen' ? (
                        seenNotifications.length > 0 && (
                          <button
                            type="button"
                            className="admin-notif-clear-seen-btn"
                            onClick={clearSeenAdminNotifications}
                            title="Clear all seen notifications"
                          >
                            <Trash2 size={13} />
                            <span>Clear Seen</span>
                          </button>
                        )
                      ) : (
                        <>
                          {unreadBadgeCount > 0 && (
                            <button
                              type="button"
                              className="admin-notif-mark-all-btn"
                              onClick={markAllAdminNotificationsRead}
                              title="Mark all fresh as read"
                            >
                              <CheckCheck size={13} />
                              <span>Mark read</span>
                            </button>
                          )}
                          {safeAdminNotifications.length > 0 && (
                            <button
                              type="button"
                              className="admin-notif-clear-all-btn"
                              onClick={clearAllAdminNotifications}
                              title="Clear all notifications"
                            >
                              <Trash2 size={13} />
                              <span>Clear All</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="admin-notif-tabs">
                    <button
                      type="button"
                      className={`admin-notif-tab ${activeNotifTab === 'unread' ? 'active' : ''}`}
                      onClick={() => setActiveNotifTab('unread')}
                    >
                      <Inbox size={13} />
                      <span>Fresh / Pending</span>
                      {unreadNotifications.length > 0 && (
                        <span className="notif-tab-count fresh">{unreadNotifications.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`admin-notif-tab ${activeNotifTab === 'sla' ? 'active' : ''}`}
                      onClick={() => setActiveNotifTab('sla')}
                    >
                      <AlertTriangle size={13} />
                      <span>SLA Action</span>
                      {slaNotifications.length > 0 && (
                        <span className="notif-tab-count sla">{slaNotifications.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`admin-notif-tab ${activeNotifTab === 'seen' ? 'active' : ''}`}
                      onClick={() => setActiveNotifTab('seen')}
                    >
                      <Eye size={13} />
                      <span>Seen History</span>
                      {seenNotifications.length > 0 && (
                        <span className="notif-tab-count seen">{seenNotifications.length}</span>
                      )}
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="admin-notif-list">
                    {displayedNotifications.length === 0 ? (
                      <div className="admin-notif-empty">
                        <div className="admin-notif-empty-icon">
                          {activeNotifTab === 'sla' ? (
                            <AlertCircle size={28} />
                          ) : activeNotifTab === 'seen' ? (
                            <Check size={28} />
                          ) : (
                            <Inbox size={28} />
                          )}
                        </div>
                        <p className="admin-notif-empty-title">
                          {activeNotifTab === 'sla'
                            ? 'No SLA Alerts'
                            : activeNotifTab === 'seen'
                              ? 'No Seen Notifications'
                              : 'All Caught Up!'}
                        </p>
                        <p className="admin-notif-empty-desc">
                          {activeNotifTab === 'sla'
                            ? 'No urgent SLA reminders or pending escalations right now.'
                            : activeNotifTab === 'seen'
                              ? 'Notifications you read or click will be moved here.'
                              : 'No fresh pending notifications. New updates will appear here.'}
                        </p>
                      </div>
                    ) : (
                      displayedNotifications.map((notif) => {
                        const isSlaReminder =
                          notif.type === 'SLA_REMINDER' ||
                          notif.type === 'ESCALATION' ||
                          notif.priority === 'CRITICAL' ||
                          notif.priority === 'HIGH';
                        const caseId =
                          notif.case_id ||
                          notif.application_id ||
                          notif.metadata?.caseId ||
                          notif.metadata?.applicationId;

                        return (
                          <div
                            key={notif.id}
                            className={`admin-notif-item ${!notif.is_read ? 'unread' : 'seen-item'} ${isSlaReminder && !notif.is_read ? 'sla-breach-item' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="admin-notif-item-left">
                              <div
                                className={`admin-notif-type-icon ${notif.is_read
                                    ? 'read-icon'
                                    : isSlaReminder
                                      ? notif.priority === 'CRITICAL'
                                        ? 'critical'
                                        : 'high'
                                      : 'general'
                                  }`}
                              >
                                {isSlaReminder ? (
                                  <AlertTriangle size={15} />
                                ) : notif.is_read ? (
                                  <Check size={15} />
                                ) : (
                                  <Zap size={15} />
                                )}
                              </div>
                            </div>
                            <div className="admin-notif-item-body">
                              <div className="admin-notif-top-meta">
                                {isSlaReminder && !notif.is_read && (
                                  <span
                                    className={`admin-notif-prio-tag ${notif.priority === 'CRITICAL' ? 'prio-critical' : 'prio-high'}`}
                                  >
                                    {notif.priority === 'CRITICAL'
                                      ? '🚨 1 Hr SLA'
                                      : '⚠️ 6 Hr SLA'}
                                  </span>
                                )}
                                {caseId && (
                                  <span className="admin-notif-case-tag">
                                    #{caseId}
                                  </span>
                                )}
                                <span className="admin-notif-time">
                                  <Clock size={11} style={{ marginRight: 3 }} />
                                  {formatNotifTime(notif.created_at)}
                                </span>
                                <button
                                  type="button"
                                  className="admin-notif-delete-single-btn"
                                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                                  title="Dismiss notification"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <h5 className="admin-notif-item-title">{notif.title}</h5>
                              <p className="admin-notif-item-message">{notif.message}</p>

                              <div className="admin-notif-footer-actions">
                                <span className="admin-notif-sender">
                                  From: <strong>{notif.sender || 'Citizen'}</strong>
                                </span>
                                {caseId && (
                                  <button
                                    type="button"
                                    className="admin-notif-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationClick(notif);
                                    }}
                                  >
                                    <span>Review Case</span>
                                    <ArrowRight size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {!notif.is_read && (
                              <span className="admin-notif-unread-dot" title="Fresh unread"></span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="admin-notif-footer">
                    <span className="admin-notif-footer-note">
                      ⚡ Live updates
                    </span>
                    <div className="admin-notif-footer-btns">
                      <button
                        type="button"
                        className="admin-notif-refresh-btn"
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          navigate('/admin/send-notifications');
                        }}
                        style={{
                          background: '#0A5C53',
                          color: '#FFFFFF',
                          borderColor: '#0A5C53',
                          fontWeight: '700'
                        }}
                        title="Open Direct Notification Dispatcher"
                      >
                        <Radio size={12} style={{ marginRight: 4 }} />
                        Send Notification
                      </button>
                      {activeNotifTab === 'seen' && seenNotifications.length > 0 && (
                        <button
                          type="button"
                          className="admin-notif-footer-clear-btn"
                          onClick={clearSeenAdminNotifications}
                          title="Clear seen notifications"
                        >
                          <Trash2 size={12} /> Clear Seen
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-notif-refresh-btn"
                        onClick={() => fetchAdminNotifications && fetchAdminNotifications()}
                        title="Refresh notifications"
                      >
                        <RotateCw size={12} style={{ marginRight: 3 }} />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-date-pill">
              <span className="admin-date-text">{currentDate}</span>
            </div>
          </div>
        </header>

        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>

      {/* Central Admin Modals */}
      <AdminModals />

      {/* Admin Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="am-logout-modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="am-logout-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="am-logout-modal-header">
              <div className="am-logout-icon-wrap">
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <button className="am-logout-close-btn" onClick={() => setShowLogoutConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="am-logout-modal-body">
              <h3>Confirm Log Out</h3>
              <p>Are you sure you want to log out of the <strong>Admin Portal</strong>?</p>
            </div>
            <div className="am-logout-modal-actions">
              <button className="am-btn-logout-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="am-btn-logout-confirm" onClick={handleAdminLogout}>
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;

