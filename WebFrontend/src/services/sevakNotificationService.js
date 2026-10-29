import api from './api';

export const sevakNotificationService = {
  /**
   * Fetch paginated notifications for the logged-in Sevak
   * GET /api/arogya-sevaks/notifications
   */
  async fetchNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.limit !== undefined && params.limit !== null) query.append('limit', String(params.limit));
    if (params.offset !== undefined && params.offset !== null) query.append('offset', String(params.offset));
    if (params.is_read !== undefined && params.is_read !== null) query.append('is_read', String(params.is_read));
    if (params.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params.type && params.type !== 'ALL') query.append('type', params.type);

    const qs = query.toString();
    const endpoint = `/arogya-sevaks/notifications${qs ? `?${qs}` : ''}`;
    try {
      const res = await api.get(endpoint);
      return res?.data || res;
    } catch (err) {
      console.warn('[SevakNotificationService] fetchNotifications error:', err.message);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  },

  /**
   * Fetch unread notification count
   * GET /api/arogya-sevaks/notifications/unread-count
   */
  async fetchUnreadCount() {
    try {
      const res = await api.get('/arogya-sevaks/notifications/unread-count');
      const data = res?.data || res;
      return typeof data?.unreadCount === 'number' ? data.unreadCount : (data?.unread_count || 0);
    } catch (err) {
      console.warn('[SevakNotificationService] fetchUnreadCount error:', err.message);
      return 0;
    }
  },

  /**
   * Mark single notification as read
   * PATCH /api/arogya-sevaks/notifications/:id/read
   */
  async markAsRead(notificationId) {
    try {
      const res = await api.patch(`/arogya-sevaks/notifications/${encodeURIComponent(notificationId)}/read`);
      return res?.data || res;
    } catch (err) {
      console.error('[SevakNotificationService] markAsRead error:', err.message);
      throw err;
    }
  },

  /**
   * Mark all notifications as read
   * PATCH /api/arogya-sevaks/notifications/read-all
   */
  async markAllAsRead() {
    try {
      const res = await api.patch('/arogya-sevaks/notifications/read-all');
      return res?.data || res;
    } catch (err) {
      console.error('[SevakNotificationService] markAllAsRead error:', err.message);
      throw err;
    }
  },

  /**
   * Clear all seen/read notifications
   * DELETE /api/arogya-sevaks/notifications/seen
   */
  async clearSeenNotifications() {
    try {
      const res = await api.delete('/arogya-sevaks/notifications/seen');
      return res?.data || res;
    } catch (err) {
      console.error('[SevakNotificationService] clearSeenNotifications error:', err.message);
      throw err;
    }
  }
};

export default sevakNotificationService;
