import { z } from 'zod';

/**
 * Validation schema for direct admin notifications to citizen / case
 */
export const sendNotificationSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };

      // Normalization of recipient identifiers
      if (!copy.recipient_id && copy.recipientId) copy.recipient_id = copy.recipientId;
      if (!copy.recipient_user_id && copy.recipientUserId) copy.recipient_user_id = copy.recipientUserId;
      if (!copy.citizen_id && copy.citizenId) copy.citizen_id = copy.citizenId;
      if (!copy.sevak_id && copy.sevakId) copy.sevak_id = copy.sevakId;
      if (!copy.recipient_id && copy.sevak_id) copy.recipient_id = copy.sevak_id;
      if (!copy.case_id && copy.caseId) copy.case_id = copy.caseId;
      if (!copy.application_id && copy.applicationId) copy.application_id = copy.applicationId;

      // Normalization of multilingual fields
      if (!copy.title && (copy.title_en || copy.title_hi)) {
        copy.title = copy.title_en || copy.title_hi;
      }
      if (!copy.message && (copy.message_en || copy.message_hi)) {
        copy.message = copy.message_en || copy.message_hi;
      }

      // Priority normalization
      if (copy.priority) {
        copy.priority = String(copy.priority).toUpperCase();
      }

      // Type normalization
      if (copy.type) {
        copy.type = String(copy.type).toUpperCase();
      }

      // Amount normalization
      if (copy.approved_amount !== undefined && copy.approvedAmount === undefined) {
        copy.approved_amount = Number(copy.approved_amount);
      }

      return copy;
    }
    return data;
  },
  z.object({
    recipient_id: z.string().optional().nullable(),
    recipient_user_id: z.string().optional().nullable(),
    citizen_id: z.string().optional().nullable(),
    mobile: z.string().trim().max(20).optional().nullable(),
    case_id: z.string().trim().optional().nullable(),
    application_id: z.string().trim().optional().nullable(),

    recipient_type: z.string().trim().optional().default('CITIZEN'),
    target_audience: z.string().trim().optional().nullable(),

    type: z.string().trim().optional().default('ANNOUNCEMENT'),

    priority: z
      .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'INFO', 'LOW'])
      .optional()
      .default('MEDIUM'),

    title: z.string({ required_error: 'Notification title is required / सूचना शीर्षक आवश्यक आहे' }).trim().min(1),
    title_en: z.string().trim().optional().nullable(),
    title_hi: z.string().trim().optional().nullable(),

    message: z.string({ required_error: 'Notification message is required / सूचना मजकूर आवश्यक आहे' }).trim().min(1),
    message_en: z.string().trim().optional().nullable(),
    message_hi: z.string().trim().optional().nullable(),

    requested_doc_name: z.string().trim().optional().nullable(),
    requested_doc_type: z.string().trim().optional().nullable(),
    revert_reason: z.string().trim().optional().nullable(),
    deadline_days: z.number().int().optional().nullable(),

    sevak_name: z.string().trim().optional().nullable(),
    sevak_phone: z.string().trim().optional().nullable(),
    hospital_name: z.string().trim().optional().nullable(),
    scheme_id: z.string().trim().optional().nullable(),
    scheme_name: z.string().trim().optional().nullable(),
    approved_amount: z.number().nonnegative().optional().nullable(),

    badge: z.string().trim().optional().nullable(),
    badge_en: z.string().trim().optional().nullable(),
    badge_hi: z.string().trim().optional().nullable(),
  }).passthrough()
);

/**
 * Validation schema for broadcast announcement to all citizens
 */
export const broadcastNotificationSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.title && (copy.title_en || copy.title_hi)) {
        copy.title = copy.title_en || copy.title_hi;
      }
      if (!copy.message && (copy.message_en || copy.message_hi)) {
        copy.message = copy.message_en || copy.message_hi;
      }
      if (copy.priority) {
        copy.priority = String(copy.priority).toUpperCase();
      }
      return copy;
    }
    return data;
  },
  z.object({
    title: z.string({ required_error: 'Broadcast title is required / ब्रॉडकास्ट शीर्षक आवश्यक आहे' }).trim().min(1),
    title_en: z.string().trim().optional().nullable(),
    title_hi: z.string().trim().optional().nullable(),

    message: z.string({ required_error: 'Broadcast message is required / ब्रॉडकास्ट संदेश आवश्यक आहे' }).trim().min(1),
    message_en: z.string().trim().optional().nullable(),
    message_hi: z.string().trim().optional().nullable(),

    priority: z
      .enum(['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'])
      .optional()
      .default('HIGH'),

    badge: z.string().trim().optional().nullable(),
    badge_en: z.string().trim().optional().nullable(),
    badge_hi: z.string().trim().optional().nullable(),

    type: z.string().trim().optional().default('ANNOUNCEMENT'),
  }).passthrough()
);

export const validateSendNotification = (data) => {
  const result = sendNotificationSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateBroadcastNotification = (data) => {
  const result = broadcastNotificationSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export default {
  sendNotificationSchema,
  broadcastNotificationSchema,
  validateSendNotification,
  validateBroadcastNotification,
};
