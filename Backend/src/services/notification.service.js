import { query } from '../config/db.js';
import { NotificationModel } from '../models/notification.model.js';
import { ApplicationModel } from '../models/application.model.js';
import { CitizenModel } from '../models/citizen.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { UserModel } from '../models/user.model.js';
import { AdminModel } from '../models/admin.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Format notification for clean API response
 */
export const formatNotificationResponse = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    notification_id: row.id,
    recipient_id: row.recipient_id || row.recipient_user_id || row.citizen_id || null,
    recipient_user_id: row.recipient_user_id || null,
    citizen_id: row.citizen_id || null,
    mobile: row.mobile || null,
    case_id: row.case_id || null,
    application_id: row.application_id || null,
    type: row.type || 'ANNOUNCEMENT',
    priority: row.priority || 'INFO',
    title: row.title,
    title_en: row.title_en || row.title,
    title_hi: row.title_hi || row.title,
    message: row.message,
    message_en: row.message_en || row.message,
    message_hi: row.message_hi || row.message,
    requested_doc_name: row.requested_doc_name || null,
    requested_doc_type: row.requested_doc_type || null,
    revert_reason: row.revert_reason || null,
    deadline_days: row.deadline_days || null,
    sevak_name: row.sevak_name || null,
    sevak_phone: row.sevak_phone || null,
    hospital_name: row.hospital_name || null,
    scheme_id: row.scheme_id || null,
    scheme_name: row.scheme_name || null,
    approved_amount: row.approved_amount != null ? Number(row.approved_amount) : null,
    badge: row.badge || null,
    badge_en: row.badge_en || null,
    badge_hi: row.badge_hi || null,
    is_broadcast: Boolean(row.is_broadcast),
    is_read: Boolean(row.is_read),
    read_at: row.read_at || null,
    created_at: row.created_at,
    createdAt: row.created_at,
  };
};

/**
 * Notification Service Layer
 */
export const notificationService = {
  /**
   * Admin sends direct notification to citizen, application case, or arogya sevak
   */
  async sendDirectNotification(payload, adminUserId) {
    let adminRecordId = null;
    if (adminUserId) {
      const admin = await AdminModel.findByUserId(adminUserId);
      adminRecordId = admin?.id || null;
    }

    let recipientUserId = payload.recipient_user_id || null;
    let citizenId = payload.citizen_id || payload.recipient_id || null;
    let mobile = payload.mobile || null;
    let applicationId = payload.application_id || null;
    let caseId = payload.case_id || null;
    let sevakId = payload.sevak_id || payload.sevakId || null;
    let sevakName = payload.sevak_name || payload.sevakName || null;
    let sevakPhone = payload.sevak_phone || payload.sevakPhone || null;

    const rawTarget = payload.target_audience || payload.targetAudience || payload.recipient_type || payload.recipientType || (sevakId ? 'SEVAK' : 'CITIZEN');
    const targetAudience = String(rawTarget).toUpperCase();

    // If target is SEVAK or sevakId/employee_code provided, resolve Sevak details
    if (targetAudience === 'SEVAK' || sevakId || payload.employee_code || payload.sevak_code) {
      try {
        let sevak = null;
        if (sevakId) {
          sevak = await ArogyaSevakModel.findById(sevakId);
          if (!sevak) sevak = await ArogyaSevakModel.findByUserId(sevakId);
        } else if (payload.employee_code || payload.sevak_code) {
          sevak = await ArogyaSevakModel.findByEmployeeCode(payload.employee_code || payload.sevak_code);
        } else if (mobile) {
          const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
          sevak = await ArogyaSevakModel.findByMobile(cleanMobile);
        } else if (sevakName && !sevakName.includes('आरोग्य सेवक')) {
          const cleanName = sevakName.includes('—') ? sevakName.split('—')[0].trim() : (sevakName.includes('(') ? sevakName.split('(')[0].trim() : sevakName.trim());
          sevak = await ArogyaSevakModel.findByNameOrCode(cleanName);
        }

        if (sevak) {
          sevakId = sevak.id;
          recipientUserId = sevak.user_id || recipientUserId;
          sevakName = sevak.full_name || sevakName;
          sevakPhone = sevak.phone_number || sevak.mobile || sevakPhone;
          mobile = sevak.phone_number || sevak.mobile || mobile;
        }
      } catch (err) {
        logger.warn(`[notificationService] Lookup sevak warning: ${err.message}`);
      }
    }

    // If case_id / application_id provided, resolve application and citizen details ONLY when targeting citizen
    if (caseId || applicationId) {
      try {
        const app = await ApplicationModel.findById(caseId || applicationId);
        if (app) {
          applicationId = app.id;
          caseId = app.application_number || app.id;
          if (targetAudience !== 'SEVAK' && targetAudience !== 'INDIVIDUAL_SEVAK' && targetAudience !== 'ALL_SEVAKS') {
            if (app.submitted_by_citizen_id) {
              citizenId = app.submitted_by_citizen_id;
              const cit = await CitizenModel.findById(app.submitted_by_citizen_id);
              if (cit && !recipientUserId) {
                recipientUserId = cit.user_id;
              }
            }
            if (app.contact_mobile && !mobile) {
              mobile = app.contact_mobile;
            }
          }
        }
      } catch (err) {
        logger.warn(`[notificationService] Could not resolve application for case_id ${caseId}: ${err.message}`);
      }
    }

    // If mobile provided but recipient_user_id not resolved, lookup user by mobile
    if (!recipientUserId && mobile) {
      try {
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        const user = await UserModel.findByMobile(cleanMobile);
        if (user) {
          recipientUserId = user.id;
        }
      } catch (err) {
        logger.warn(`[notificationService] Lookup user by mobile warning: ${err.message}`);
      }
    }

    const isBroadcast = targetAudience === 'ALL_CITIZENS' || targetAudience === 'ALL_SEVAKS' || targetAudience === 'ALL' || targetAudience === 'BROADCAST';

    const created = await NotificationModel.create({
      recipient_type: targetAudience,
      recipient_id: targetAudience === 'SEVAK' ? (sevakId || recipientUserId) : (citizenId || recipientUserId),
      recipient_user_id: recipientUserId,
      citizen_id: citizenId,
      sevak_id: sevakId,
      mobile,
      application_id: applicationId,
      case_id: caseId,
      type: payload.type || 'ANNOUNCEMENT',
      priority: payload.priority || 'MEDIUM',
      title: payload.title,
      title_en: payload.title_en,
      title_hi: payload.title_hi,
      message: payload.message,
      message_en: payload.message_en,
      message_hi: payload.message_hi,
      requested_doc_name: payload.requested_doc_name,
      requested_doc_type: payload.requested_doc_type,
      revert_reason: payload.revert_reason,
      deadline_days: payload.deadline_days,
      sevak_name: sevakName,
      sevak_phone: sevakPhone,
      hospital_name: payload.hospital_name,
      scheme_id: payload.scheme_id,
      scheme_name: payload.scheme_name,
      approved_amount: payload.approved_amount,
      badge: payload.badge,
      badge_en: payload.badge_en,
      badge_hi: payload.badge_hi,
      is_broadcast: isBroadcast,
      metadata: payload.metadata || {},
      created_by_admin_id: adminRecordId,
    });

    logger.info(`[notificationService] Sent direct notification ${created.id} (Target: ${targetAudience}) to ${sevakName ? `Sevak ${sevakName}` : `mobile: ${mobile || 'N/A'}`}`);
    return formatNotificationResponse(created);
  },

  /**
   * Admin broadcasts announcement/health camp alert to all citizens
   */
  async broadcastNotification(payload, adminUserId) {
    let adminRecordId = null;
    if (adminUserId) {
      const admin = await AdminModel.findByUserId(adminUserId);
      adminRecordId = admin?.id || null;
    }

    const created = await NotificationModel.create({
      type: payload.type || 'ANNOUNCEMENT',
      priority: payload.priority || 'HIGH',
      title: payload.title,
      title_en: payload.title_en,
      title_hi: payload.title_hi,
      message: payload.message,
      message_en: payload.message_en,
      message_hi: payload.message_hi,
      badge: payload.badge,
      badge_en: payload.badge_en,
      badge_hi: payload.badge_hi,
      is_broadcast: true,
      metadata: payload.metadata || {},
      created_by_admin_id: adminRecordId,
    });

    logger.info(`[notificationService] Created broadcast notification ${created.id}: ${payload.title}`);
    return formatNotificationResponse(created);
  },

  /**
   * List all sent notifications for Admin with filters & pagination
   */
  async listAdminNotifications(query = {}) {
    const { total, notifications } = await NotificationModel.findAll(query);
    return {
      total,
      count: notifications.length,
      notifications: notifications.map(formatNotificationResponse),
    };
  },

  /**
   * Citizen / Mobile App retrieves their notifications + broadcasts
   */
  async getCitizenNotifications(userContext = {}, query = {}) {
    let citizenId = userContext.citizen_id || null;
    let userId = userContext.id || userContext.user_id || null;
    let mobile = userContext.mobile || query.mobile || null;

    if (userId && !citizenId) {
      try {
        const cit = await CitizenModel.findByUserId(userId);
        if (cit) citizenId = cit.id;
      } catch (_) { }
    }

    const { total, notifications } = await NotificationModel.findForCitizen({
      userId,
      citizenId,
      mobile,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    const unreadCount = await NotificationModel.getUnreadCount({
      userId,
      citizenId,
      mobile,
    });

    return {
      total,
      unreadCount,
      count: notifications.length,
      notifications: notifications.map(formatNotificationResponse),
    };
  },

  /**
   * Arogya Sevak retrieves their notifications + broadcasts
   */
  async getSevakNotifications(userContext = {}, query = {}) {
    let userId = userContext.id || userContext.user_id || null;
    let sevakId = userContext.sevak_id || userContext.sevakId || null;
    let mobile = userContext.mobile || userContext.phoneNumber || query.mobile || null;
    let name = userContext.name || userContext.full_name || null;

    if (userId && !sevakId) {
      try {
        const sevak = await ArogyaSevakModel.findByUserId(userId);
        if (sevak) {
          sevakId = sevak.id;
          if (!name) name = sevak.full_name;
          if (!mobile && (sevak.phone_number || sevak.mobile)) {
            mobile = sevak.phone_number || sevak.mobile;
          }
        }
      } catch (_) { }
    }

    if (!sevakId && mobile) {
      try {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        const sevak = await ArogyaSevakModel.findByMobile(cleanMobile);
        if (sevak) {
          sevakId = sevak.id;
          userId = userId || sevak.user_id;
          if (!name) name = sevak.full_name;
        }
      } catch (_) { }
    }

    // Auto-sync missing case assignment notifications for active cases
    if (sevakId || userId) {
      try {
        const activeAssignments = await query(
          `SELECT aa.*, a.application_number, a.patient_name, a.beneficiary_name, a.hospital_name as app_hospital, a.assigned_scheme_name
           FROM public.application_assignments aa
           JOIN public.applications a ON aa.application_id = a.id
           WHERE (aa.arogya_sevak_id = $1 OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $1))
             AND aa.assignment_status = 'ASSIGNED'
           ORDER BY aa.created_at DESC
           LIMIT 10;`,
          [sevakId || userId]
        );

        for (const row of activeAssignments.rows) {
          const caseNo = row.application_number || row.application_id;
          const patientName = row.patient_name || row.beneficiary_name || 'रुग्ण';
          const hospName = row.hospital_name || row.app_hospital || 'नियुक्त रुग्णालय';
          const schemeName = row.scheme_name || row.assigned_scheme_name || 'MJPJAY';

          const existing = await query(
            `SELECT id FROM public.notifications 
             WHERE case_id = $1 AND recipient_type = 'SEVAK' AND type IN ('URGENT_CASE', 'CASE_ASSIGNED', 'SEVAK_ASSIGNED')
             LIMIT 1`,
            [caseNo]
          );

          if (!existing.rows[0]) {
            await NotificationModel.create({
              recipient_type: 'SEVAK',
              recipient_id: userId || sevakId,
              recipient_user_id: userId,
              sevak_id: sevakId,
              mobile: mobile || row.sevak_phone,
              application_id: row.application_id,
              case_id: caseNo,
              type: 'URGENT_CASE',
              priority: 'HIGH',
              title: `नवीन केस सोपवली आहे (केस #${caseNo}) 📋`,
              title_en: `New Patient Case Assigned (Case #${caseNo}) 📋`,
              title_hi: `नया मरीज केस सौंपा गया (केस #${caseNo}) 📋`,
              message: `प्रशासनाकडून तुम्हाला रुग्ण "${patientName}" (केस #${caseNo}) ची केस सोपवण्यात आली आहे. रुग्णालय: "${hospName}". योजना: ${schemeName}. कृपया रुग्णाशी समन्वय साधून पुढील वैद्यकीय प्रक्रिया सुरू करा.`,
              message_en: `You have been assigned a new case for patient "${patientName}" (Case #${caseNo}) at "${hospName}". Scheme: ${schemeName}. Please coordinate with patient and initiate hospital workflow.`,
              message_hi: `प्रशासन द्वारा आपको मरीज "${patientName}" (केस #${caseNo}) का नया केस सौंपा गया है। अस्पताल: "${hospName}"। योजना: ${schemeName}। कृपया मरीज से संपर्क कर अस्पताल प्रक्रिया शुरू करें।`,
              sevak_name: row.sevak_name,
              sevak_phone: row.sevak_phone || mobile,
              hospital_name: hospName,
              scheme_name: schemeName,
              badge: 'नवीन केस',
              badge_en: 'New Case',
              badge_hi: 'नया केस',
              created_at: row.created_at || new Date(),
            });
          }
        }
      } catch (syncErr) {
        logger.warn(`[notificationService] Auto-sync assigned case notifications warning: ${syncErr.message}`);
      }
    }

    const { total, notifications } = await NotificationModel.findForSevak({
      sevakId,
      userId,
      mobile,
      name,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    const unreadCount = await NotificationModel.getUnreadCountForSevak({
      sevakId,
      userId,
      mobile,
      name,
    });

    return {
      total,
      unreadCount,
      count: notifications.length,
      notifications: notifications.map(formatNotificationResponse),
    };
  },

  /**
   * Get unread count for Sevak
   */
  async getSevakUnreadCount(userContext = {}) {
    let userId = userContext.id || userContext.user_id || null;
    let sevakId = userContext.sevak_id || userContext.sevakId || null;
    let mobile = userContext.mobile || userContext.phoneNumber || null;
    let name = userContext.name || userContext.full_name || null;

    if (userId && !sevakId) {
      try {
        const sevak = await ArogyaSevakModel.findByUserId(userId);
        if (sevak) {
          sevakId = sevak.id;
          if (!name) name = sevak.full_name;
          if (!mobile && (sevak.phone_number || sevak.mobile)) {
            mobile = sevak.phone_number || sevak.mobile;
          }
        }
      } catch (_) { }
    }

    if (!sevakId && mobile) {
      try {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        const sevak = await ArogyaSevakModel.findByMobile(cleanMobile);
        if (sevak) {
          sevakId = sevak.id;
          userId = userId || sevak.user_id;
          if (!name) name = sevak.full_name;
        }
      } catch (_) { }
    }

    const unreadCount = await NotificationModel.getUnreadCountForSevak({
      sevakId,
      userId,
      mobile,
      name,
    });

    return { unreadCount };
  },

  /**
   * Mark all notifications as read for Sevak
   */
  async markAllAsReadForSevak(userContext = {}) {
    let userId = userContext.id || userContext.user_id || null;
    let sevakId = userContext.sevak_id || userContext.sevakId || null;
    let mobile = userContext.mobile || userContext.phoneNumber || null;
    let name = userContext.name || userContext.full_name || null;

    if (userId && !sevakId) {
      try {
        const sevak = await ArogyaSevakModel.findByUserId(userId);
        if (sevak) {
          sevakId = sevak.id;
          if (!name) name = sevak.full_name;
          if (!mobile && (sevak.phone_number || sevak.mobile)) {
            mobile = sevak.phone_number || sevak.mobile;
          }
        }
      } catch (_) { }
    }

    await NotificationModel.markAllAsReadForSevak({
      sevakId,
      userId,
      mobile,
      name,
    });

    return { success: true };
  },

  /**
   * Clear all seen (read) notifications for Sevak
   */
  async clearSeenNotificationsForSevak(userContext = {}) {
    let userId = userContext.id || userContext.user_id || null;
    let sevakId = userContext.sevak_id || userContext.sevakId || null;
    let mobile = userContext.mobile || userContext.phoneNumber || null;
    let name = userContext.name || userContext.full_name || null;

    if (userId && !sevakId) {
      try {
        const sevak = await ArogyaSevakModel.findByUserId(userId);
        if (sevak) {
          sevakId = sevak.id;
          if (!name) name = sevak.full_name;
          if (!mobile && (sevak.phone_number || sevak.mobile)) {
            mobile = sevak.phone_number || sevak.mobile;
          }
        }
      } catch (_) { }
    }

    await NotificationModel.clearSeenNotificationsForSevak({
      sevakId,
      userId,
      mobile,
      name,
    });

    return { success: true };
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId) {
    const updated = await NotificationModel.markAsRead(notificationId);
    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Notification '${notificationId}' not found.`);
    }
    return formatNotificationResponse(updated);
  },

  /**
   * Trigger automatic notification when Admin requests a document (Reverts case)
   */
  async notifyDocRequested(app, revertDetails, adminUserId) {
    try {
      const docName = revertDetails.requestedDocName || revertDetails.requested_doc_name || 'आवश्यक कागदपत्र';
      const reason = revertDetails.reason || 'अस्पष्ट किंवा अपूर्ण कागदपत्र';
      const caseNumber = app.application_number || app.id;
      const currentStatus = String(app.current_status || '').toUpperCase().replace(/[-\s/]+/g, '_');
      const isSevakTarget = revertDetails.requestedFrom === 'sevak' || ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED'].includes(currentStatus);

      if (isSevakTarget) {
        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.active_assignment?.sevak_phone || null,
            recipient_user_id: app.active_assignment?.sevak_user_id || null,
            target_audience: 'SEVAK',
            recipient_type: 'SEVAK',
            type: 'SEVAK_TASK',
            priority: 'HIGH',
            title: 'आरोग्यसेवक: नवीन कागदपत्र विनंती कार्य',
            title_en: `ArogyaSevak Task: Document Required (${docName})`,
            title_hi: `आरोग्यसेवक कार्य: दस्तावेज़ आवश्यकता (${docName})`,
            message: `मंजूर केस (${caseNumber}) साठी रुग्णालयाकडून "${docName}" त्वरित अपलोड करा. टीप: ${reason}`,
            message_en: `Please upload hospital/clinical document "${docName}" for approved Case ${caseNumber}. Note: ${reason}`,
            message_hi: `कृपया स्वीकृत केस ${caseNumber} के लिए "${docName}" अस्पताल रिकॉर्ड अपलोड करें। विवरण: ${reason}`,
            requested_doc_name: docName,
            requested_doc_type: revertDetails.requestedDocType || 'other',
            revert_reason: reason,
            deadline_days: revertDetails.deadlineDays || 3,
          },
          adminUserId
        );
        return;
      }

      await this.sendDirectNotification(
        {
          application_id: app.id,
          case_id: caseNumber,
          mobile: app.contact_mobile,
          recipient_user_id: app.submitted_by_user_id || app.user_id,
          citizen_id: app.submitted_by_citizen_id,
          type: 'DOC_REQUEST',
          priority: 'CRITICAL',
          title: 'कागदपत्र पूर्तता आवश्यक',
          title_en: `Document Required: ${docName}`,
          title_hi: `दस्तावेज़ पूर्तता आवश्यक: ${docName}`,
          message: `आपल्या अर्ज (${caseNumber}) साठी "${docName}" पुन्हा अपलोड करणे आवश्यक आहे. कारण: ${reason}`,
          message_en: `Please re-upload "${docName}" for Application ${caseNumber}. Reason: ${reason}`,
          message_hi: `कृपया आवेदन ${caseNumber} के लिए "${docName}" पुनः अपलोड करें। कारण: ${reason}`,
          requested_doc_name: docName,
          requested_doc_type: revertDetails.requestedDocType || revertDetails.requested_doc_type || 'other',
          revert_reason: reason,
          deadline_days: revertDetails.deadlineDays || revertDetails.deadline_days || 3,
        },
        adminUserId
      );
    } catch (err) {
      logger.warn(`[notificationService] notifyDocRequested failed: ${err.message}`);
    }
  },

  /**
   * Trigger automatic notification to Admin desk when Citizen resubmits a requested document
   */
  async notifyAdminDocResubmitted(app, newDoc, citizenRemark, citizenUserId) {
    try {
      const caseNumber = app.application_number || app.id;
      const patientName = app.patient_name || app.patientName || 'रुग्ण';
      const docName = newDoc.file_name || newDoc.name || 'कागदपत्र';

      await NotificationModel.create({
        recipient_type: 'ADMIN',
        application_id: app.id,
        case_id: caseNumber,
        type: 'DOC_SUBMITTED',
        priority: 'HIGH',
        title: `📄 कागदपत्र प्राप्त: ${caseNumber}`,
        title_en: `Document Received: Case ${caseNumber} (${patientName})`,
        title_hi: `दस्तावेज़ प्राप्त: केस ${caseNumber} (${patientName})`,
        message: `केस क्र. ${caseNumber} (${patientName}) साठी नागरिकाने "${docName}" कागदपत्र यशस्वीरित्या अपलोड केले आहे.${citizenRemark ? ` अभिप्राय: "${citizenRemark}"` : ''}`,
        message_en: `Citizen has uploaded "${docName}" for Case ${caseNumber} (${patientName}). Ready for admin verification.${citizenRemark ? ` Note: "${citizenRemark}"` : ''}`,
        message_hi: `केस सं. ${caseNumber} (${patientName}) के लिए नागरिक ने "${docName}" दस्तावेज़ अपलोड किया है।${citizenRemark ? ` टिप्पणी: "${citizenRemark}"` : ''}`,
        sender: `नागरिक (${patientName})`,
        sender_en: `Citizen (${patientName})`,
        sender_hi: `नागरिक (${patientName})`,
        requested_doc_name: docName,
        badge: 'कागदपत्र प्राप्त',
        badge_en: 'Doc Received',
        badge_hi: 'दस्तावेज़ प्राप्त',
        is_broadcast: false,
        metadata: {
          action: 'DOC_RESUBMITTED',
          document_id: newDoc.id,
          file_url: newDoc.file_url,
          patient_name: patientName,
          citizen_remark: citizenRemark,
        },
      });

      logger.info(`[notificationService] Dispatched admin notification for doc resubmission on Case ${caseNumber}`);
    } catch (err) {
      logger.warn(`[notificationService] notifyAdminDocResubmitted warning: ${err.message}`);
    }
  },

  /**
   * Trigger automatic notification when Admin updates status (APPROVED, REJECTED, IN_REVIEW)
   */
  async notifyStatusUpdated(app, status, details = {}, adminUserId) {
    try {
      const caseNumber = app.application_number || app.id;
      const upperStatus = String(status).toUpperCase();

      if (upperStatus === 'APPROVED') {
        const schemeName = details.assigned_scheme_name || details.scheme_name || details.schemeName || app.assigned_scheme_name || 'MJPJAY';
        const amount = details.sanctioned_amount || details.approved_amount || app.sanctioned_amount || 0;
        const amountStr = amount > 0 ? `₹${Number(amount).toLocaleString('en-IN')}` : '';

        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'APPROVED',
            priority: 'HIGH',
            title: 'योजनेचा लाभ मंजूर!',
            title_en: 'Health Scheme Application Approved!',
            title_hi: 'स्वास्थ्य योजना आवेदन स्वीकृत!',
            message: `अभिनंदन! आपला अर्ज (${caseNumber}) मंजूर झाला आहे. योजना: ${schemeName}${amountStr ? ` | मंजूर रक्कम: ${amountStr}` : ''}`,
            message_en: `Congratulations! Your scheme application ${caseNumber} has been approved under ${schemeName}.${amountStr ? ` Approved Amount: ${amountStr}` : ''}`,
            message_hi: `बधाई हो! आपका आवेदन ${caseNumber} योजना ${schemeName} के तहत स्वीकृत हो गया है।`,
            scheme_id: details.assigned_scheme_id || details.scheme_id || app.assigned_scheme_id,
            scheme_name: schemeName,
            approved_amount: amount,
          },
          adminUserId
        );

        const sevakName = details.sevak || details.sevak_name || details.sevakName || app.active_assignment?.sevak_name || null;
        const sevakId = details.sevak_id || details.sevakId || app.active_assignment?.arogya_sevak_id || null;
        const sevakPhone = details.sevak_phone || details.sevakPhone || app.active_assignment?.sevak_phone || null;
        const hospitalName = details.hospital || details.hospital_name || details.hospitalName || app.hospital_name || 'Assigned Hospital';

        if (sevakName || sevakId || sevakPhone) {
          this.notifySevakAssigned(app, {
            sevak_id: sevakId,
            sevak_name: sevakName,
            sevak_phone: sevakPhone,
            hospital_name: hospitalName,
            scheme_name: schemeName,
            admission_date: details.admissionDate || details.admission_date,
          }, adminUserId).catch(() => { });
        }
      } else if (['COORDINATED', 'HOSPITAL_SEVAK_ASSIGNED', 'SEVAK_ASSIGNED', 'ASSIGNED'].includes(upperStatus)) {
        const sevakName = details.sevak || details.sevak_name || details.sevakName || app.active_assignment?.sevak_name || null;
        const sevakId = details.sevak_id || details.sevakId || app.active_assignment?.arogya_sevak_id || null;
        const sevakPhone = details.sevak_phone || details.sevakPhone || app.active_assignment?.sevak_phone || null;
        const hospitalName = details.hospital || details.hospital_name || details.hospitalName || app.hospital_name || 'Assigned Hospital';
        const schemeName = details.assigned_scheme_name || details.scheme_name || details.schemeName || app.assigned_scheme_name || 'MJPJAY';

        this.notifySevakAssigned(app, {
          sevak_id: sevakId,
          sevak_name: sevakName,
          sevak_phone: sevakPhone,
          hospital_name: hospitalName,
          scheme_name: schemeName,
          admission_date: details.admissionDate || details.admission_date,
        }, adminUserId).catch(() => { });
      } else if (upperStatus === 'REJECTED') {
        const reason = details.reason || details.remarks || 'कागदपत्रे निकषात बसत नसल्यामुळे';

        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'REJECTED',
            priority: 'HIGH',
            title: 'अर्जाबाबत माहिती (नाकारला)',
            title_en: 'Application Status: Rejected',
            title_hi: 'आवेदन स्थिति: अस्वीकृत',
            message: `आपला अर्ज (${caseNumber}) नाकारण्यात आला आहे. कारण: ${reason}`,
            message_en: `Your scheme application ${caseNumber} has been rejected. Reason: ${reason}`,
            message_hi: `आपका आवेदन ${caseNumber} अस्वीकृत कर दिया गया है। कारण: ${reason}`,
            revert_reason: reason,
          },
          adminUserId
        );
      } else if (['REOPENED'].includes(upperStatus)) {
        const reopenReason = details.remarks || details.reason || '६० दिवसांच्या मुदतीमध्ये फेरविचार';

        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'IN_REVIEW',
            priority: 'HIGH',
            title: 'अर्ज पुन्हा उघडण्यात आला आहे 🔄',
            title_en: 'Application Reopened for Re-Review',
            title_hi: 'आवेदन पुनः समीक्षा हेतु खोला गया',
            message: `आपला अर्ज (${caseNumber}) ६० दिवसांच्या मुदतीमध्ये फेरविचारासाठी पुन्हा उघडण्यात आला आहे. लवकरच पुढील निर्णय कळवला जाईल.`,
            message_en: `Your application ${caseNumber} has been reopened within the 60-day eligibility window and is back under review. Reason: ${reopenReason}`,
            message_hi: `आपका आवेदन ${caseNumber} 60 दिनों की समय सीमा में पुनः समीक्षा हेतु खोल दिया गया है।`,
            badge: 'पुनरावलोकन सुरू',
            badge_en: 'Reopened',
            badge_hi: 'पुनः खुला',
          },
          adminUserId
        );
      } else if (['IN_REVIEW', 'UNDER_REVIEW'].includes(upperStatus)) {
        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'IN_REVIEW',
            priority: 'MEDIUM',
            title: 'अर्ज पुनरावलोकनात आहे',
            title_en: 'Application Under Review',
            title_hi: 'आवेदन समीक्षाधीन है',
            message: `आपला अर्ज (${caseNumber}) प्रशासकीय पडताळणी अंतर्गत आहे. लवकरच निर्णय कळवला जाईल.`,
            message_en: `Your application ${caseNumber} is currently under administrative verification.`,
            message_hi: `आपका आवेदन ${caseNumber} वर्तमान में प्रशासनिक सत्यापन के अधीन है।`,
          },
          adminUserId
        );
      } else if (['TREATMENT_STARTED', 'IN_TREATMENT', 'COORDINATED'].includes(upperStatus)) {
        const schemeName = details.assigned_scheme_name || details.scheme_name || details.schemeName || app.assigned_scheme_name || 'MJPJAY';
        const hospitalName = details.hospital_name || details.hospitalName || app.hospital_name || 'Empanelled Hospital';

        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'APPROVED',
            priority: 'HIGH',
            title: 'उपचार सुरू / Treatment in Progress 🏥',
            title_en: 'Treatment in Progress (Cashless Care Active)',
            title_hi: 'उपचार शुरू (कैशलेस इलाज सक्रिय)',
            message: `आपल्या अर्ज (${caseNumber}) अंतर्गत ${hospitalName} येथे ${schemeName} द्वारे कॅशलेस उपचार सुरू झाले आहेत.`,
            message_en: `Cashless treatment is now in progress for Application ${caseNumber} at ${hospitalName} under ${schemeName}.`,
            message_hi: `आवेदन ${caseNumber} के तहत ${hospitalName} में ${schemeName} योजना के अंतर्गत कैशलेस उपचार शुरू हो गया है।`,
            scheme_name: schemeName,
            hospital_name: hospitalName,
            badge: 'उपचार सुरू',
            badge_en: 'In Treatment',
            badge_hi: 'उपचार शुरू',
          },
          adminUserId
        );
      } else if (['CLOSED', 'COMPLETED'].includes(upperStatus)) {
        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'APPROVED',
            priority: 'HIGH',
            title: 'योजना लाभ व उपचार पूर्ण 🎉',
            title_en: 'Scheme Benefit Availed & Treatment Completed',
            title_hi: 'योजना लाभ एवं उपचार पूर्ण',
            message: `आपल्या अर्ज (${caseNumber}) अंतर्गत उपचार यशस्वीरित्या पूर्ण झाले आहेत आणि योजनेचा लाभ मिळाला आहे.`,
            message_en: `Treatment has been successfully completed for application ${caseNumber}, and government health scheme benefits have been availed.`,
            message_hi: `आवेदन ${caseNumber} के अंतर्गत उपचार सफलतापूर्वक पूर्ण हो गया है तथा योजना का लाभ मिल गया है।`,
            badge: 'पूर्ण / Completed',
            badge_en: 'Completed',
            badge_hi: 'पूर्ण',
          },
          adminUserId
        );
      } else if (['DOCS_VERIFIED'].includes(upperStatus)) {
        await this.sendDirectNotification(
          {
            application_id: app.id,
            case_id: caseNumber,
            mobile: app.contact_mobile,
            recipient_user_id: app.submitted_by_user_id || app.user_id,
            citizen_id: app.submitted_by_citizen_id,
            type: 'IN_REVIEW',
            priority: 'MEDIUM',
            title: 'कागदपत्रे पडताळली ✓',
            title_en: 'Documents Verified by Admin',
            title_hi: 'दस्तावेज़ सत्यापित हुए',
            message: `आपल्या अर्ज (${caseNumber}) ची कागदपत्रे प्रशासनाने तपासली असून मंजूर करण्यात आली आहेत. पुढील टप्प्यात आरोग्य सेवक संपर्क करतील.`,
            message_en: `Documents for application ${caseNumber} have been verified successfully by administration.`,
            message_hi: `आवेदन ${caseNumber} के दस्तावेज़ों का सफलतापूर्वक सत्यापन हो गया है।`,
            badge: 'कागदपत्रे पडताळली',
            badge_en: 'Docs Verified',
            badge_hi: 'दस्तावेज़ सत्यापित',
          },
          adminUserId
        );
      }
    } catch (err) {
      logger.warn(`[notificationService] notifyStatusUpdated failed: ${err.message}`);
    }
  },

  /**
   * Trigger notification when a single document or all documents are verified
   */
  async notifyDocVerified(app, docDetails = {}, adminUserId) {
    try {
      const caseNumber = app.application_number || app.id;
      const docName = docDetails.name || docDetails.file_name || 'कागदपत्र';

      await this.sendDirectNotification(
        {
          application_id: app.id,
          case_id: caseNumber,
          mobile: app.contact_mobile,
          recipient_user_id: app.submitted_by_user_id || app.user_id,
          citizen_id: app.submitted_by_citizen_id,
          type: 'IN_REVIEW',
          priority: 'MEDIUM',
          title: 'कागदपत्र पडताळले: ' + docName,
          title_en: `Document Verified: ${docName}`,
          title_hi: `दस्तावेज़ सत्यापित: ${docName}`,
          message: `आपल्या अर्जातील "${docName}" कागदपत्र प्रशासनाने तपासले असून वैध ठरवले आहे.`,
          message_en: `Document "${docName}" has been verified and approved by the review team.`,
          message_hi: `आवेदन का दस्तावेज़ "${docName}" जांच के बाद सही पाया गया है।`,
          badge: 'पडताळणी पूर्ण',
          badge_en: 'Verified',
          badge_hi: 'सत्यापित',
        },
        adminUserId
      );
    } catch (err) {
      logger.warn(`[notificationService] notifyDocVerified warning: ${err.message}`);
    }
  },

  /**
   * Trigger automatic notification when Arogya Sevak & Hospital are assigned
   */
  async notifySevakAssigned(app, assignmentDetails = {}, adminUserId) {
    try {
      const caseNumber = app.application_number || app.id;
      const patientName = app.patient_name || app.beneficiary_name || assignmentDetails.patient_name || 'रुग्ण';
      const sevakName = assignmentDetails.sevak_name || assignmentDetails.sevakName || 'आरोग्य सेवक';
      const sevakPhone = assignmentDetails.sevak_phone || assignmentDetails.sevakPhone || assignmentDetails.sevakMobile || '';
      const hospitalName = assignmentDetails.hospital_name || assignmentDetails.hospitalName || app.hospital_name || 'नियुक्त रुग्णालय';
      const schemeName = assignmentDetails.scheme_name || app.assigned_scheme_name || app.suggested_scheme_name || 'MJPJAY';
      const rawVisitDate = assignmentDetails.admission_date || assignmentDetails.admissionDate || assignmentDetails.visit_date || assignmentDetails.visitDate || '';
      const visitDateStr = rawVisitDate ? new Date(rawVisitDate).toLocaleDateString('mr-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
      const visitDateStrEn = rawVisitDate ? new Date(rawVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

      // 1. Send Direct Notification to Citizen
      await this.sendDirectNotification(
        {
          application_id: app.id,
          case_id: caseNumber,
          mobile: app.contact_mobile,
          recipient_user_id: app.submitted_by_user_id || app.user_id,
          citizen_id: app.submitted_by_citizen_id,
          target_audience: 'CITIZEN',
          recipient_type: 'CITIZEN',
          type: 'SEVAK_ASSIGNED',
          priority: 'HIGH',
          title: 'आरोग्य सेवक व रुग्णालय नियुक्त 👤🏥',
          title_en: 'Arogya Sevak & Hospital Assigned',
          title_hi: 'आरोग्य सेवक एवं अस्पताल नियुक्त',
          message: `आपल्या अर्जासाठी (${caseNumber}) आरोग्य सेवक ${sevakName}${sevakPhone ? ` (${sevakPhone})` : ''} व रुग्णालय "${hospitalName}" नियुक्त केले आहे.${visitDateStr ? ` रुग्णालय भेट/तपासणी तारीख: ${visitDateStr}.` : ''}`,
          message_en: `Arogya Sevak ${sevakName}${sevakPhone ? ` (${sevakPhone})` : ''} & Hospital "${hospitalName}" assigned for case ${caseNumber}.${visitDateStrEn ? ` Scheduled Visit Date: ${visitDateStrEn}.` : ''}`,
          message_hi: `आवेदन ${caseNumber} हेतु आरोग्य सेवक ${sevakName}${sevakPhone ? ` (${sevakPhone})` : ''} तथा अस्पताल "${hospitalName}" नियुक्त किए गए हैं।${visitDateStr ? ` अस्पताल विजिट तिथि: ${visitDateStr}.` : ''}`,
          sevak_name: sevakName,
          sevak_phone: sevakPhone,
          hospital_name: hospitalName,
          scheme_name: schemeName,
          admission_date: rawVisitDate || null,
          visit_date: rawVisitDate || null,
          badge: 'सेवक नियुक्त',
          badge_en: 'Assigned',
          badge_hi: 'नियुक्त',
        },
        adminUserId
      );

      // 2. Resolve Arogya Sevak and send Direct Notification to Arogya Sevak
      let targetSevak = null;
      const rawSevakId = assignmentDetails.sevak_id || assignmentDetails.sevakId || assignmentDetails.arogya_sevak_id || app.active_assignment?.sevak_id;
      if (rawSevakId) {
        try {
          targetSevak = await ArogyaSevakModel.findById(rawSevakId);
          if (!targetSevak) targetSevak = await ArogyaSevakModel.findByUserId(rawSevakId);
        } catch (_) { }
      }
      if (!targetSevak && sevakPhone) {
        try {
          const cleanPhone = String(sevakPhone).replace(/\D/g, '').slice(-10);
          if (cleanPhone.length >= 7) {
            targetSevak = await ArogyaSevakModel.findByMobile(cleanPhone);
          }
        } catch (_) { }
      }
      if (!targetSevak && sevakName && !sevakName.includes('आरोग्य सेवक')) {
        try {
          const cleanName = sevakName.includes('—') ? sevakName.split('—')[0].trim() : (sevakName.includes('(') ? sevakName.split('(')[0].trim() : sevakName.trim());
          targetSevak = await ArogyaSevakModel.findByNameOrCode(cleanName);
        } catch (_) { }
      }

      const finalSevakUserId = targetSevak?.user_id || assignmentDetails.sevak_user_id || app.active_assignment?.sevak_user_id || null;
      const finalSevakRecordId = targetSevak?.id || rawSevakId || null;
      const finalTargetMobile = targetSevak?.phone_number || targetSevak?.mobile || sevakPhone || null;
      const finalTargetName = targetSevak?.full_name || sevakName;

      await this.sendDirectNotification(
        {
          target_audience: 'SEVAK',
          recipient_type: 'SEVAK',
          recipient_user_id: finalSevakUserId,
          sevak_id: finalSevakRecordId,
          mobile: finalTargetMobile,
          application_id: app.id,
          case_id: caseNumber,
          type: 'URGENT_CASE',
          priority: 'HIGH',
          title: `नवीन केस सोपवली आहे (केस #${caseNumber}) 📋`,
          title_en: `New Patient Case Assigned (Case #${caseNumber}) 📋`,
          title_hi: `नया मरीज केस सौंपा गया (केस #${caseNumber}) 📋`,
          message: `प्रशासनाकडून तुम्हाला रुग्ण "${patientName}" (केस #${caseNumber}) ची केस सोपवण्यात आली आहे. रुग्णालय: "${hospitalName}". योजना: ${schemeName}.${visitDateStr ? ` नियोजित भेट तारीख: ${visitDateStr}.` : ''} कृपया रुग्णाशी समन्वय साधून पुढील वैद्यकीय प्रक्रिया सुरू करा.`,
          message_en: `You have been assigned a new case for patient "${patientName}" (Case #${caseNumber}) at "${hospitalName}". Scheme: ${schemeName}.${visitDateStrEn ? ` Scheduled Visit Date: ${visitDateStrEn}.` : ''} Please coordinate with patient and initiate hospital workflow.`,
          message_hi: `प्रशासन द्वारा आपको मरीज "${patientName}" (केस #${caseNumber}) का नया केस सौंपा गया है। अस्पताल: "${hospitalName}"। योजना: ${schemeName}।${visitDateStr ? ` निर्धारित तिथि: ${visitDateStr}।` : ''} कृपया मरीज से संपर्क कर अस्पताल प्रक्रिया शुरू करें।`,
          sevak_name: finalTargetName,
          sevak_phone: finalTargetMobile,
          hospital_name: hospitalName,
          scheme_name: schemeName,
          admission_date: rawVisitDate || null,
          visit_date: rawVisitDate || null,
          badge: 'नवीन केस',
          badge_en: 'New Case',
          badge_hi: 'नया केस',
          metadata: {
            isNewCaseAssignment: true,
            patientName,
            caseId: caseNumber,
            applicationId: app.id,
            hospitalName,
            schemeName,
            admissionDate: rawVisitDate || null,
          },
        },
        adminUserId
      );
    } catch (err) {
      logger.warn(`[notificationService] notifySevakAssigned failed: ${err.message}`);
    }
  },
};

export default notificationService;
