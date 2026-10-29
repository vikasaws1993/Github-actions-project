import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Clock,
  Filter,
  RefreshCw,
  AlertTriangle,
  Radio,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Stethoscope,
  Tent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSelector } from '@/components/common/LanguageSelector/LanguageSelector';
import { LogOut } from 'lucide-react';
import sevakNotificationService from '@/services/sevakNotificationService';
import Loader from '@/components/common/Loader/Loader';
import './Notifications.css';

let _cachedNotifications = null;
let _cachedUnreadCount = 0;

export const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fullName = user?.name || user?.full_name || 'akanksha pawashe';
  const staffId = user?.employee_code || user?.empId || user?.employeeCode || user?.staffId || user?.id || 'AS-290838';

  const [notifications, setNotifications] = useState(() => _cachedNotifications || []);
  const [unreadCount, setUnreadCount] = useState(() => _cachedUnreadCount || 0);
  const [loading, setLoading] = useState(() => !_cachedNotifications);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'ALL'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'DUTY_UPDATE' | 'HEALTH_CAMP' | 'SCHEME'
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadNotifications = useCallback(async (mode = 'initial') => {
    if (mode === 'manual') setRefreshing(true);
    else if (mode === 'initial' && !_cachedNotifications) setLoading(true);

    try {
      const [resList, count] = await Promise.allSettled([
        sevakNotificationService.fetchNotifications({ limit: 100, offset: 0 }),
        sevakNotificationService.fetchUnreadCount()
      ]);

      let list = [];
      if (resList.status === 'fulfilled' && resList.value) {
        const val = resList.value;
        if (Array.isArray(val)) list = val;
        else if (Array.isArray(val.notifications)) list = val.notifications;
        else if (Array.isArray(val.data?.notifications)) list = val.data.notifications;
        else if (Array.isArray(val.data)) list = val.data;
      }

      setNotifications(list);
      _cachedNotifications = list;

      const finalCount = count.status === 'fulfilled' && typeof count.value === 'number'
        ? count.value
        : list.filter((n) => !n.is_read && !n.isRead).length;

      setUnreadCount(finalCount);
      _cachedUnreadCount = finalCount;
    } catch (err) {
      console.error('[Notifications] Failed to load notifications:', err);
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'manual') setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications('initial');

    // Auto-refresh notifications every 15 seconds silently in background
    const interval = setInterval(() => {
      loadNotifications('silent');
    }, 15000);

    // Refresh immediately when window regains focus
    const handleFocus = () => {
      loadNotifications('silent');
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications('silent');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await sevakNotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => {
          const itemId = item.id || item.notification_id || item.uuid;
          if (itemId === id) {
            return { ...item, is_read: true, isRead: true };
          }
          return item;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showToast('Notification marked as read', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      showToast('No unread notifications remaining', 'info');
      return;
    }
    setActionLoading(true);
    try {
      await sevakNotificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true, isRead: true }))
      );
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearSeenNotifications = async () => {
    const hasSeen = notifications.some((n) => n.is_read || n.isRead);
    if (!hasSeen) {
      showToast('No read notifications to clear', 'info');
      return;
    }
    if (!window.confirm('Are you sure you want to clear all read notification history?')) {
      return;
    }
    setActionLoading(true);
    try {
      await sevakNotificationService.clearSeenNotifications();
      setNotifications((prev) => prev.filter((item) => !item.is_read && !item.isRead));
      showToast('Read notification history cleared', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Notifications List
  const displayedNotifications = useMemo(() => {
    let list = notifications;

    // Tab Filter
    if (activeTab === 'PENDING') {
      list = list.filter((n) => !n.is_read && !n.isRead);
    }

    // Type / Priority Filter
    if (filterType === 'CRITICAL') {
      list = list.filter((n) => String(n.priority).toUpperCase() === 'CRITICAL');
    } else if (filterType === 'DUTY_UPDATE') {
      list = list.filter((n) => [
        'DUTY_UPDATE', 'ALERT', 'DIRECTIVE', 'TASK', 'CASE_ASSIGNED',
        'PATIENT_ASSIGNED', 'SEVAK_ASSIGNED', 'ASSIGNMENT', 'URGENT_CASE', 'TRANSFER'
      ].includes(String(n.type || '').toUpperCase()));
    } else if (filterType === 'HEALTH_CAMP') {
      list = list.filter((n) => ['HEALTH_CAMP', 'CAMP', 'SURVEY'].includes(String(n.type || '').toUpperCase()));
    } else if (filterType === 'SCHEME') {
      list = list.filter((n) => ['SCHEME_UPDATE', 'SCHEME', 'MJPJAY', 'PMJAY', 'POLICY'].includes(String(n.type || '').toUpperCase()));
    }

    return list;
  }, [notifications, activeTab, filterType]);

  const pendingCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read && !n.isRead).length;
  }, [notifications]);

  const seenCount = useMemo(() => {
    return notifications.filter((n) => n.is_read || n.isRead).length;
  }, [notifications]);

  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="as-notif-page-container">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`as-notif-toast ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ═════════ HEADER HERO CARD (MATCHING UNIVERSAL SIZE & STYLE) ═════════ */}
      <div className="as-welcome-banner as-notif-hero-banner">
        <div className="as-welcome-left">
          <div className="as-welcome-heading">
            <h1 className="as-welcome-title">{t('sevakNav.notifications', 'Notification Center')}</h1>
            <span className="as-sevak-pill">SEVAK</span>
          </div>
          <div className="as-welcome-subtext">
            <span>{fullName}</span>
            <span className="as-dot-divider">•</span>
            <span>Staff ID: {staffId}</span>
            {unreadCount > 0 && (
              <>
                <span className="as-dot-divider">•</span>
                <span className="as-notif-unread-tag">{unreadCount} {t('notifications.pending', 'Pending')}</span>
              </>
            )}
          </div>
        </div>

        <div className="as-welcome-actions">
          {/* <LanguageSelector variant="banner" /> */}

          <button
            type="button"
            className="as-action-icon-btn"
            onClick={() => loadNotifications('manual')}
            disabled={refreshing}
            title="Refresh notifications"
          >
            <RefreshCw size={16} className={refreshing ? 'as-spin' : ''} />
          </button>

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

      {/* ═════════ CONTROLS & TABS TOOLBAR ═════════ */}
      <div className="as-notif-toolbar-card">
        {/* Left: Tab Switcher (Pending vs All) */}
        <div className="as-notif-tabs">
          <button
            type="button"
            className={`as-notif-tab ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            <span className="tab-label">{t('notifications.pendingAndNew', 'Pending & New')}</span>
            <span className={`tab-badge ${pendingCount > 0 ? 'unread' : 'empty'}`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            className={`as-notif-tab ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <span className="tab-label">{t('notifications.allAndHistory', 'All & History')}</span>
            <span className="tab-badge">{notifications.length}</span>
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="as-notif-toolbar-actions">
          {pendingCount > 0 && (
            <button
              type="button"
              className="as-btn-mark-all"
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              title="Mark all notifications as read"
            >
              <CheckCheck size={14} />
              <span>{t('notifications.markAllAsRead', 'Mark All as Read')} ({pendingCount})</span>
            </button>
          )}

          {activeTab === 'ALL' && seenCount > 0 && (
            <button
              type="button"
              className="as-btn-clear-seen"
              onClick={handleClearSeenNotifications}
              disabled={actionLoading}
              title="Clear read history"
            >
              <Trash2 size={13} />
              <span>{t('notifications.clearHistory', 'Clear History')} ({seenCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ═════════ CATEGORY FILTER CHIPS ═════════ */}
      <div className="as-notif-chips-row">
        <button
          type="button"
          className={`as-filter-chip ${filterType === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterType('ALL')}
        >
          <Layers size={13} />
          <span>{t('notifications.all', 'All')}</span>
        </button>

        <button
          type="button"
          className={`as-filter-chip chip-critical ${filterType === 'CRITICAL' ? 'active' : ''}`}
          onClick={() => setFilterType('CRITICAL')}
        >
          <ShieldAlert size={13} color="#ef4444" />
          <span>{t('notifications.criticalAlerts', 'Critical Alerts')}</span>
        </button>

        <button
          type="button"
          className={`as-filter-chip chip-duty ${filterType === 'DUTY_UPDATE' ? 'active' : ''}`}
          onClick={() => setFilterType('DUTY_UPDATE')}
        >
          <Stethoscope size={13} color="#0284c7" />
          <span>{t('notifications.dutyUpdates', 'Duty Updates')}</span>
        </button>

        <button
          type="button"
          className={`as-filter-chip chip-camp ${filterType === 'HEALTH_CAMP' ? 'active' : ''}`}
          onClick={() => setFilterType('HEALTH_CAMP')}
        >
          <Tent size={13} color="#10b981" />
          <span>{t('notifications.healthCamps', 'Health Camps')}</span>
        </button>

        <button
          type="button"
          className={`as-filter-chip chip-scheme ${filterType === 'SCHEME' ? 'active' : ''}`}
          onClick={() => setFilterType('SCHEME')}
        >
          <FileText size={13} color="#8b5cf6" />
          <span>{t('notifications.schemeUpdates', 'Scheme Updates')}</span>
        </button>
      </div>

      {/* ═════════ NOTIFICATIONS LIST ═════════ */}
      <div className="as-notif-list-container">
        {loading ? (
          <Loader
            card
            message={t('notifications.loadingNotifications', 'Loading Notifications...')}
            subtext={t('notifications.loadingSubtext', 'Fetching priority alerts, administrative duties, and directives')}
          />
        ) : displayedNotifications.length === 0 ? (
          <div className="as-notif-empty-state">
            <div className="as-empty-icon-circle">
              {activeTab === 'PENDING' ? <CheckCircle2 size={36} color="#16a34a" /> : <Bell size={36} color="#94a3b8" />}
            </div>
            <h3>
              {activeTab === 'PENDING'
                ? t('notifications.allCaughtUp', 'All caught up! No pending notifications.')
                : t('notifications.noNotificationsFound', 'No notifications found.')}
            </h3>
            <p>
              {activeTab === 'PENDING'
                ? t('notifications.allCaughtUpSub', 'New administrative tasks, alerts, or guidelines will appear here immediately.')
                : t('notifications.adjustFiltersSub', 'Try adjusting your filters above to see past notifications.')}
            </p>
            {activeTab === 'PENDING' && notifications.length > 0 && (
              <button
                type="button"
                className="as-btn-view-history"
                onClick={() => setActiveTab('ALL')}
              >
                <span>{t('notifications.viewReadHistory', 'View Read History')} ({notifications.length})</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ) : (
          <div className="as-notif-cards-grid">
            {displayedNotifications.map((notif) => {
              const isUnread = !notif.is_read && !notif.isRead;
              const notifId = notif.id || notif.notification_id || notif.uuid;
              const priority = String(notif.priority || 'NORMAL').toUpperCase();
              const isCritical = priority === 'CRITICAL';
              const isHigh = priority === 'HIGH';

              return (
                <div
                  key={notifId}
                  className={`as-notif-card ${isUnread ? 'is-unread' : 'is-read'} ${
                    isCritical ? 'priority-critical' : isHigh ? 'priority-high' : 'priority-normal'
                  }`}
                >
                  {/* Card Header */}
                  <div className="as-card-top-row">
                    <div className="as-card-badge-group">
                      <span className={`as-priority-pill ${priority.toLowerCase()}`}>
                        {priority}
                      </span>
                      {notif.badge && <span className="as-badge-tag">{notif.badge}</span>}
                    </div>

                    <div className="as-card-time-group">
                      <Clock size={12} />
                      <span>{formatNotificationTime(notif.created_at || notif.createdAt)}</span>
                      {isUnread && <span className="as-unread-dot" title="New notification" />}
                    </div>
                  </div>

                  {/* Card Title & Content */}
                  <h3 className="as-notif-title">
                    {notif.title_en || notif.title || 'Administrative Notification'}
                  </h3>

                  {notif.title && notif.title_en && notif.title !== notif.title_en && (
                    <div className="as-notif-sub-title">{notif.title}</div>
                  )}

                  <p className="as-notif-message">
                    {notif.message_en || notif.message || ''}
                  </p>

                  {notif.message && notif.message_en && notif.message !== notif.message_en && (
                    <p className="as-notif-message-en">{notif.message}</p>
                  )}

                  {/* Case / Reference Tag if associated */}
                  {notif.case_id && (
                    <div className="as-case-ref-tag" onClick={() => navigate(`/arogyasevak/patient/${notif.case_id}`)}>
                      <FileText size={12} />
                      <span>{t('notifications.caseReference', 'Case Reference:')} <strong>{notif.case_id}</strong> {t('notifications.viewDetails', '(View Details)')}</span>
                      <ChevronRight size={12} />
                    </div>
                  )}

                  {/* Card Footer: Sender & Action */}
                  <div className="as-card-bottom-row">
                    <div className="as-sender-meta">
                      <span className="as-sender-label">{t('notifications.sender', 'Sender:')}</span>
                      <span className="as-sender-val">{notif.sender || notif.sender_name || 'Health Mission / Admin Desk'}</span>
                    </div>

                    <div className="as-card-actions">
                      {isUnread ? (
                        <button
                          type="button"
                          className="as-btn-mark-read"
                          onClick={(e) => handleMarkAsRead(notifId, e)}
                          title="Mark as read"
                        >
                          <CheckCircle2 size={13} />
                          <span>{t('notifications.markRead', 'Mark Read')}</span>
                        </button>
                      ) : (
                        <span className="as-read-indicator">
                          <CheckCheck size={13} color="#16a34a" />
                          <span>{t('notifications.read', 'Read')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
