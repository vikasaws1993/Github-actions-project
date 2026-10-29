import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, CheckCircle2, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import sevakNotificationService from '@/services/sevakNotificationService';
import { LanguageSelector } from '@/components/common/LanguageSelector/LanguageSelector';
import './Navbar.css';

export const Navbar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = (user?.name || user?.full_name || 'akanksha').trim().split(' ')[0];
  const fullName = user?.name || user?.full_name || 'akanksha pawashe';
  const staffId = user?.employee_code || user?.empId || user?.employeeCode || user?.staffId || user?.id || 'AS-290838';

  // For notification page, we remove this top bar so the notification page uses its own matching top bar
  const isNotifications = location.pathname.includes('/notifications');

  const isDashboard =
    location.pathname === '/arogyasevak/portal' ||
    location.pathname === '/arogyasevak' ||
    location.pathname === '/portal' ||
    location.pathname === '/arogyasevak/dashboard';

  const getPageTitle = () => {
    const path = location.pathname;
    if (isDashboard) {
      return `Welcome! ${displayName}`;
    }
    if (path.includes('/urgent-request')) {
      return t('sevakNav.priorityRequest', 'Priority Request');
    }
    if (path.includes('/updates')) {
      return t('sevakNav.dailyUpdates', 'Daily Updates');
    }
    if (path.includes('/documents')) {
      return t('sevakNav.documents', 'Patient Documents');
    }
    if (path.includes('/opd-logs')) {
      return t('sevakNav.opdLogs', 'OPD Logs');
    }
    if (path.includes('/doctors')) {
      return t('sevakNav.doctorsRoster', 'Hospital Doctors & Duty Roster');
    }
    if (path.includes('/infrastructure-info')) {
      return t('sevakNav.hospitalFacilities', 'Hospital Facilities');
    }
    if (path.includes('/appointments')) {
      return t('sevakNav.appointments', 'Patient Appointments');
    }
    if (path.includes('/profile')) {
      return t('sevakNav.profile', 'My Profile');
    }
    if (path.includes('/patients') || path.includes('/cases')) {
      return t('sevakNav.myCases', 'My Cases');
    }
    if (path.includes('/patient/') || path.endsWith('/patient')) {
      return t('sevakNav.patientDetails', 'Patient Details');
    }
    return t('sevakNav.myCases', 'My Cases');
  };

  const loadUnreadStatus = useCallback(async () => {
    try {
      const count = await sevakNotificationService.fetchUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      console.warn('[Navbar] Unread count fetch warning:', err.message);
    }
  }, []);

  const loadRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sevakNotificationService.fetchNotifications({ limit: 5, offset: 0, is_read: false });
      let list = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.notifications)) list = res.notifications;
      else if (Array.isArray(res?.data?.notifications)) list = res.data.notifications;
      else if (Array.isArray(res?.data)) list = res.data;
      setRecentNotifs(list.slice(0, 4));
    } catch (err) {
      console.warn('[Navbar] Recent notifications fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isNotifications) return;
    loadUnreadStatus();
    // Poll unread count every 15 seconds
    const interval = setInterval(loadUnreadStatus, 15000);

    const handleFocus = () => loadUnreadStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadUnreadStatus, isNotifications]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const handleToggleDropdown = () => {
    if (!dropdownOpen) {
      loadRecentNotifications();
      loadUnreadStatus();
    }
    setDropdownOpen((prev) => !prev);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadUnreadStatus();
      window.dispatchEvent(new CustomEvent('arogyamitra:refresh'));
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await sevakNotificationService.markAsRead(id);
      setRecentNotifs((prev) => prev.filter((n) => (n.id || n.notification_id || n.uuid) !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    try {
      await sevakNotificationService.markAllAsRead();
      setRecentNotifs([]);
      setUnreadCount(0);
      setDropdownOpen(false);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const [facilitiesSummaryActive, setFacilitiesSummaryActive] = useState(() => {
    if (!location.pathname.includes('/infrastructure-info')) return false;
    try {
      const isSum = sessionStorage.getItem('arogya_facilities_summary_active');
      if (isSum !== null) return isSum === 'true';

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('arogya_facilities_draft_')) {
          const d = JSON.parse(localStorage.getItem(key) || '{}');
          if (d.isFinalSubmitted) return true;
        }
      }
    } catch (_) {}
    return false;
  });

  useEffect(() => {
    const handleFacilitiesChange = (e) => {
      if (location.pathname.includes('/infrastructure-info')) {
        setFacilitiesSummaryActive(Boolean(e?.detail?.showSummary));
      } else {
        setFacilitiesSummaryActive(false);
      }
    };
    window.addEventListener('arogyamitra:facilities-view-change', handleFacilitiesChange);
    return () => window.removeEventListener('arogyamitra:facilities-view-change', handleFacilitiesChange);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.includes('/infrastructure-info')) {
      const isSum = sessionStorage.getItem('arogya_facilities_summary_active');
      if (isSum !== null) {
        setFacilitiesSummaryActive(isSum === 'true');
      }
    } else {
      setFacilitiesSummaryActive(false);
    }
  }, [location.pathname]);

  if (isNotifications || (location.pathname.includes('/infrastructure-info') && facilitiesSummaryActive)) {
    return null;
  }

  return (
    <header className="am-navbar-banner-wrapper">
      <div className="as-welcome-banner">
        <div className="as-welcome-left">
          <div className="as-welcome-heading">
            <button
              type="button"
              className="am-mobile-toggle-btn banner-mobile-btn"
              onClick={onToggleSidebar}
              title="Toggle Menu"
              aria-label="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="as-welcome-title">{getPageTitle()}</h1>
            <span className={`as-sevak-pill ${user?.isBackup || user?.is_backup ? 'as-relief-pill' : ''}`}>
              {user?.isBackup || user?.is_backup ? 'RELIEF SEVAK' : 'SEVAK'}
            </span>
          </div>
          <div className="as-welcome-subtext">
            <span>{fullName}</span>
            {Boolean(user?.isBackup || user?.is_backup) && (
              <>
                <span className="as-dot-divider">•</span>
                <span className="as-relief-coverage-text">
                  Covering for: {user.coveringFor || user.primarySevakName || 'Primary Sevak'}
                </span>
              </>
            )}
            <span className="as-dot-divider">•</span>
            <span>Staff ID: {staffId}</span>
          </div>
        </div>

        <div className="as-welcome-actions" ref={dropdownRef}>
          {/* Language Selector (Disabled / Commented out for now) */}
          {/* <LanguageSelector variant="banner" /> */}

          {/* Notification Bell */}
          <div className="am-notif-bell-container">
            <button
              type="button"
              className={`as-action-icon-btn ${unreadCount > 0 ? 'as-has-badge' : ''}`}
              onClick={handleToggleDropdown}
              title="Notification Center"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="as-badge-dot">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Quick Dropdown Popover */}
            {dropdownOpen && (
              <div className="am-notif-dropdown-menu">
                <div className="am-notif-dd-header">
                  <div className="am-notif-dd-title-wrap">
                    <Bell size={16} className="text-sky-600" />
                    <span className="am-notif-dd-title">Notification Center</span>
                    {unreadCount > 0 && <span className="am-notif-dd-count-pill">{unreadCount} New</span>}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="am-notif-dd-mark-all-btn"
                      onClick={handleMarkAllRead}
                      title="Mark all as read"
                    >
                      Mark All Read
                    </button>
                  )}
                </div>

                <div className="am-notif-dd-list">
                  {loading ? (
                    <div className="am-notif-dd-loading">Loading notifications...</div>
                  ) : recentNotifs.length === 0 ? (
                    <div className="am-notif-dd-empty">
                      <CheckCircle2 size={24} color="#16a34a" />
                      <span>No pending notifications (All caught up!)</span>
                    </div>
                  ) : (
                    recentNotifs.map((item) => {
                      const id = item.id || item.notification_id || item.uuid;
                      const priority = String(item.priority || 'NORMAL').toUpperCase();
                      return (
                        <div
                          key={id}
                          className={`am-notif-dd-item ${priority === 'CRITICAL' ? 'critical' : priority === 'HIGH' ? 'high' : ''}`}
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate('/arogyasevak/notifications');
                          }}
                        >
                          <div className="am-notif-dd-item-top">
                            <span className={`am-notif-dd-priority ${priority.toLowerCase()}`}>
                              {priority === 'CRITICAL' ? '🔴 Critical' : priority === 'HIGH' ? '🟠 Important' : '🔵 Alert'}
                            </span>
                            <button
                              type="button"
                              className="am-notif-dd-quick-read"
                              onClick={(e) => handleMarkAsRead(id, e)}
                              title="Mark as read"
                            >
                              Mark Read ✓
                            </button>
                          </div>
                          <h4 className="am-notif-dd-item-title">{item.title_en || item.title}</h4>
                          <p className="am-notif-dd-item-desc">{item.message_en || item.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="am-notif-dd-footer">
                  <button
                    type="button"
                    className="am-notif-dd-view-all-btn"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/arogyasevak/notifications');
                    }}
                  >
                    <span>View All in Notification Center</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="as-action-icon-btn"
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'as-spin' : ''} />
          </button>

          {/* Profile / Logout Button */}
          <button
            type="button"
            className="as-action-icon-btn"
            onClick={() => navigate('/arogyasevak/profile')}
            title="My Profile"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
