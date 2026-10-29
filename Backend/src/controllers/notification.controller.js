import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { notificationService } from '../services/notification.service.js';
import {
  validateSendNotification,
  validateBroadcastNotification,
} from '../validations/notification.validation.js';

/**
 * Admin sends direct notification to citizen or application case
 * POST /api/admins/notifications/send
 * POST /api/mob/notifications/send
 */
export const sendDirectNotification = asyncHandler(async (req, res) => {
  const validation = validateSendNotification(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const result = await notificationService.sendDirectNotification(validation.data, adminUserId);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Notification sent successfully to citizen / नागरिकाला सूचना यशस्वीरीत्या पाठवली गेली'
    )
  );
});

/**
 * Admin broadcasts notification / health camp alert to all citizens
 * POST /api/admins/notifications/broadcast
 * POST /api/mob/notifications/broadcast
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
  const validation = validateBroadcastNotification(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const result = await notificationService.broadcastNotification(validation.data, adminUserId);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Broadcast notification published successfully / ब्रॉडकास्ट सूचना सर्व नागरिकांपर्यंत पोहोचवली'
    )
  );
});

/**
 * Admin lists all sent notifications with query filters
 * GET /api/admins/notifications
 */
export const getAdminNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listAdminNotifications(req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Notifications retrieved successfully'));
});

/**
 * Citizen / Mobile App gets their notifications + broadcasts
 * GET /api/mob/notifications
 * GET /api/mob/notifications/my
 */
export const getCitizenNotifications = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.getCitizenNotifications(userContext, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Citizen alerts retrieved successfully'));
});

/**
 * Citizen / Mobile App marks notification as read
 * PATCH /api/mob/notifications/:id/read
 * POST /api/mob/notifications/:id/read
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await notificationService.markAsRead(id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Notification marked as read'));
});

/**
 * Citizen gets unread notification count
 * GET /api/mob/notifications/unread-count
 */
export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.getCitizenNotifications(userContext, { limit: 1 });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      { unreadCount: result.unreadCount || 0 },
      'Unread count retrieved'
    )
  );
});

/**
 * Arogya Sevak gets their assigned notifications + broadcasts
 * GET /api/arogya-sevaks/notifications
 * GET /api/sevak/notifications
 */
export const getSevakNotifications = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.getSevakNotifications(userContext, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevak alerts retrieved successfully'));
});

/**
 * Arogya Sevak gets unread notification count
 * GET /api/arogya-sevaks/notifications/unread-count
 */
export const getSevakUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.getSevakUnreadCount(userContext);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      { unreadCount: result.unreadCount || 0 },
      'Sevak unread count retrieved successfully'
    )
  );
});

/**
 * Arogya Sevak marks all their notifications as read
 * PATCH /api/arogya-sevaks/notifications/read-all
 * POST /api/arogya-sevaks/notifications/read-all
 */
export const markAllSevakNotificationsRead = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.markAllAsReadForSevak(userContext);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'All Sevak notifications marked as read'));
});

/**
 * Arogya Sevak clears all seen (read) notifications
 * DELETE /api/arogya-sevaks/notifications/seen
 * POST /api/arogya-sevaks/notifications/clear-seen
 */
export const clearSeenSevakNotifications = asyncHandler(async (req, res) => {
  const userContext = req.user || {};
  const result = await notificationService.clearSeenNotificationsForSevak(userContext);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Seen notifications cleared successfully'));
});

export default {
  sendDirectNotification,
  broadcastNotification,
  getAdminNotifications,
  getCitizenNotifications,
  getSevakNotifications,
  getSevakUnreadNotificationCount,
  markAllSevakNotificationsRead,
  clearSeenSevakNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
};
