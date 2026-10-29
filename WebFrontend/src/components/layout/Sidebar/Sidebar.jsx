import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users, 
  BellRing, 
  FileText, 
  ClipboardList, 
  User,
  HeartPulse,
  LogOut,
  Building2,
  Zap,
  AlertTriangle,
  Stethoscope,
  Clock,
  X
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import sevakNotificationService from '@/services/sevakNotificationService';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    isActive: (pathname) =>
      pathname === ROUTES.DASHBOARD ||
      pathname === '/arogyasevak' ||
      pathname === '/arogyasevak/' ||
      pathname === '/portal' ||
      pathname === '/arogyasevak/dashboard',
  },
  {
    key: 'myCases',
    label: 'My Cases',
    path: ROUTES.PATIENTS,
    icon: Users,
    isActive: (pathname) =>
      pathname === ROUTES.PATIENTS ||
      pathname.startsWith('/arogyasevak/patient') ||
      pathname.startsWith('/patient') ||
      pathname.startsWith('/arogyasevak/cases') ||
      pathname.startsWith('/arogyasevak/appointments') ||
      pathname.startsWith('/arogyasevak/ward-monitoring'),
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: ROUTES.NOTIFICATIONS,
    icon: BellRing,
    isNotificationItem: true,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.NOTIFICATIONS) || pathname.startsWith('/notifications'),
  },
  {
    key: 'priorityRequest',
    label: 'Priority Request',
    path: ROUTES.URGENT_REQUEST,
    icon: Zap,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.URGENT_REQUEST) || pathname.startsWith('/urgent-request'),
  },
  {
    key: 'dailyUpdates',
    label: 'Daily Updates',
    path: ROUTES.UPDATES,
    icon: Clock,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.UPDATES) || pathname.startsWith('/updates'),
  },
  {
    key: 'documents',
    label: 'Documents',
    path: ROUTES.DOCUMENTS,
    icon: FileText,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.DOCUMENTS) || pathname.startsWith('/documents'),
  },
  {
    key: 'opdLogs',
    label: 'OPD Logs',
    path: ROUTES.OPD_LOGS,
    icon: ClipboardList,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.OPD_LOGS) || pathname.startsWith('/opd-logs'),
  },
  {
    key: 'doctorsRoster',
    label: 'Doctors & Roster',
    path: ROUTES.DOCTORS,
    icon: Stethoscope,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.DOCTORS) || pathname.startsWith('/arogyasevak/doctors') || pathname.startsWith('/doctors'),
  },
  {
    key: 'hospitalFacilities',
    label: 'Hospital Facilities',
    path: ROUTES.INFRASTRUCTURE_INFO,
    icon: Building2,
    isActive: (pathname) =>
      pathname.startsWith(ROUTES.INFRASTRUCTURE_INFO) || pathname.startsWith('/infrastructure-info'),
  },
];

export const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await sevakNotificationService.fetchUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 45000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleNavClick = () => {
    if (onClose && window.innerWidth <= 900) {
      onClose();
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      <aside className={`am-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="am-sidebar-brand">
          <div className="am-brand-logo">
            <HeartPulse size={22} className="am-brand-icon" />
          </div>
          <div className="am-brand-text">
            <span className="am-brand-title">ArogyaMitra</span>
            <span className="am-brand-subtitle">ArogyaSevak</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="am-sidebar-nav">
          <ul className="am-nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isItemActive = item.isActive
                ? item.isActive(location.pathname)
                : location.pathname.startsWith(item.path);

              const badgeCount = item.isNotificationItem && unreadCount > 0 ? unreadCount : item.badge;
              const badgeColor = item.isNotificationItem ? 'red' : item.badgeColor;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`am-nav-link ${isItemActive ? 'is-active' : ''}`}
                    aria-current={isItemActive ? 'page' : undefined}
                    onClick={handleNavClick}
                  >
                    <Icon size={20} className="am-nav-icon" />
                    <span className="am-nav-text">{t(`sevakNav.${item.key}`, item.label)}</span>
                    {badgeCount !== undefined && (
                      <span className={`am-nav-badge am-badge-${badgeColor || 'primary'}`}>
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="am-sidebar-footer">
          <NavLink
            to={ROUTES.PROFILE}
            className={({ isActive }) => `am-profile-footer-btn ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            title="View My Profile"
          >
            <User size={18} />
            <span>{t('sevakNav.profile', 'My Profile')}</span>
          </NavLink>

          <button onClick={() => setShowLogoutConfirm(true)} className="am-logout-btn" title="Sign Out">
            <LogOut size={18} />
            <span>{t('sevakNav.logOut', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
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
              <p>Are you sure you want to log out of your <strong>ArogyaMitra</strong> account?</p>
            </div>
            <div className="am-logout-modal-actions">
              <button className="am-btn-logout-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="am-btn-logout-confirm" onClick={handleConfirmLogout}>
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
