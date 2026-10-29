import { query } from '../config/db.js';
import crypto from 'crypto';

let tableEnsured = false;

/**
 * Ensure `public.notifications` table and required columns exist
 */
async function ensureNotificationsTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_type VARCHAR(30) DEFAULT 'CITIZEN',
        recipient_id UUID,
        recipient_user_id UUID,
        citizen_id UUID,
        mobile VARCHAR(20),
        recipient_mobile VARCHAR(20),
        application_id UUID,
        case_id VARCHAR(100),
        type VARCHAR(50) DEFAULT 'CUSTOM',
        priority VARCHAR(30) DEFAULT 'MEDIUM',
        title TEXT NOT NULL,
        title_en TEXT,
        title_hi TEXT,
        message TEXT NOT NULL,
        message_en TEXT,
        message_hi TEXT,
        sender VARCHAR(150) DEFAULT 'प्रशासक / Admin Desk',
        sender_en VARCHAR(150) DEFAULT 'Administration',
        sender_hi VARCHAR(150) DEFAULT 'प्रशासन',
        requested_doc_name TEXT,
        requested_doc_type VARCHAR(100),
        revert_reason TEXT,
        deadline_days INTEGER DEFAULT 3,
        sevak_name VARCHAR(255),
        sevak_phone VARCHAR(50),
        hospital_name VARCHAR(255),
        scheme_id VARCHAR(100),
        scheme_name VARCHAR(255),
        approved_amount NUMERIC(12, 2),
        action_type VARCHAR(50) DEFAULT 'ANNOUNCEMENT',
        badge VARCHAR(100),
        badge_en VARCHAR(100),
        badge_hi VARCHAR(100),
        is_broadcast BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by_admin_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(30) DEFAULT 'CITIZEN';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS citizen_id UUID;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_mobile VARCHAR(20);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS application_id UUID;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS case_id VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'CUSTOM';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'MEDIUM';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title_en TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title_hi TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message_en TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message_hi TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender VARCHAR(150) DEFAULT 'प्रशासक / Admin Desk';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_en VARCHAR(150) DEFAULT 'Administration';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_hi VARCHAR(150) DEFAULT 'प्रशासन';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS requested_doc_name TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS requested_doc_type VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS revert_reason TEXT;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deadline_days INTEGER DEFAULT 3;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sevak_name VARCHAR(255);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sevak_phone VARCHAR(50);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheme_id VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheme_name VARCHAR(255);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(12, 2);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'ANNOUNCEMENT';
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS badge VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS badge_en VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS badge_hi VARCHAR(100);
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_by_admin_id UUID;
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON public.notifications(recipient_user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_mobile ON public.notifications(mobile);
      CREATE INDEX IF NOT EXISTS idx_notifications_case_id ON public.notifications(case_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_broadcast ON public.notifications(is_broadcast);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
    `);
    tableEnsured = true;
  } catch (e) {
    console.warn('[NotificationModel] Table init warning:', e.message);
  }
}

// In-memory fallback cache
const memoryNotifications = [];

/**
 * Notification Data Access Object
 */
export const NotificationModel = {
  /**
   * Create a new notification
   */
  async create(data) {
    await ensureNotificationsTable();
    const id = data.id || crypto.randomUUID();
    const now = new Date();

    const recipientUserId = data.recipient_user_id || data.recipientUserId || data.recipient_id || data.recipientId || null;
    const citizenId = data.citizen_id || data.citizenId || null;
    const mobile = data.mobile || data.recipient_mobile || data.recipientMobile || null;
    let recipientType = (data.recipient_type || data.recipientType || (data.target_audience || 'CITIZEN')).toUpperCase();
    let isBroadcast = Boolean(data.is_broadcast);

    if (recipientType === 'ALL' || recipientType === 'BROADCAST' || recipientType === 'ALL_CITIZENS' || recipientType === 'ALL_SEVAKS') {
      isBroadcast = true;
    }

    const record = {
      id,
      recipient_type: recipientType,
      recipient_id: recipientUserId,
      recipient_user_id: recipientUserId,
      citizen_id: citizenId,
      mobile,
      recipient_mobile: mobile,
      application_id: data.application_id || data.applicationId || null,
      case_id: data.case_id || data.caseId || null,
      type: (data.type || 'ANNOUNCEMENT').toUpperCase(),
      priority: (data.priority || 'MEDIUM').toUpperCase(),
      title: data.title,
      title_en: data.title_en || data.titleEn || data.title,
      title_hi: data.title_hi || data.titleHi || data.title,
      message: data.message,
      message_en: data.message_en || data.messageEn || data.message,
      message_hi: data.message_hi || data.messageHi || data.message,
      sender: data.sender || 'प्रशासक / Admin Desk',
      sender_en: data.sender_en || data.senderEn || 'Administration',
      sender_hi: data.sender_hi || data.senderHi || 'प्रशासन',
      requested_doc_name: data.requested_doc_name || data.requestedDocName || null,
      requested_doc_type: data.requested_doc_type || data.requestedDocType || null,
      revert_reason: data.revert_reason || data.revertReason || null,
      deadline_days: data.deadline_days || data.deadlineDays || 3,
      sevak_name: data.sevak_name || data.sevakName || null,
      sevak_phone: data.sevak_phone || data.sevakPhone || null,
      hospital_name: data.hospital_name || data.hospitalName || null,
      scheme_id: data.scheme_id || data.schemeId || null,
      scheme_name: data.scheme_name || data.schemeName || null,
      approved_amount: data.approved_amount != null ? Number(data.approved_amount) : (data.approvedAmount != null ? Number(data.approvedAmount) : null),
      action_type: data.action_type || data.actionType || 'ANNOUNCEMENT',
      badge: data.badge || null,
      badge_en: data.badge_en || data.badgeEn || null,
      badge_hi: data.badge_hi || data.badgeHi || null,
      is_broadcast: isBroadcast,
      is_read: Boolean(data.is_read || data.isRead),
      metadata: data.metadata || {},
      created_by_admin_id: data.created_by_admin_id || null,
      created_at: now,
      updated_at: now,
    };

    try {
      // Check for recent duplicate to avoid double-inserting identical notifications
      if (record.case_id && record.title) {
        try {
          const dupCheck = await query(
            `SELECT * FROM public.notifications 
             WHERE case_id = $1 AND type = $2 AND title = $3 
             ORDER BY created_at DESC LIMIT 1`,
            [record.case_id, record.type, record.title]
          );
          if (dupCheck.rows[0]) {
            const diffMs = Date.now() - new Date(dupCheck.rows[0].created_at).getTime();
            // If created within the last 10 minutes and identical message, return existing
            if (diffMs < 10 * 60 * 1000 && dupCheck.rows[0].message === record.message) {
              return dupCheck.rows[0];
            }
          }
        } catch (_) {}
      }

      const insertSql = `
        INSERT INTO public.notifications (
          id, recipient_type, recipient_id, recipient_user_id, citizen_id,
          mobile, recipient_mobile, application_id, case_id, type,
          priority, title, title_en, title_hi, message,
          message_en, message_hi, sender, sender_en, sender_hi,
          requested_doc_name, requested_doc_type, revert_reason, deadline_days,
          sevak_name, sevak_phone, hospital_name, scheme_id, scheme_name,
          approved_amount, action_type, badge, badge_en, badge_hi,
          is_broadcast, is_read, metadata, created_by_admin_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
        )
        RETURNING *;
      `;

      const values = [
        record.id,
        record.recipient_type,
        record.recipient_id,
        record.recipient_user_id,
        record.citizen_id,
        record.mobile,
        record.recipient_mobile,
        record.application_id,
        record.case_id,
        record.type,
        record.priority,
        record.title,
        record.title_en,
        record.title_hi,
        record.message,
        record.message_en,
        record.message_hi,
        record.sender,
        record.sender_en,
        record.sender_hi,
        record.requested_doc_name,
        record.requested_doc_type,
        record.revert_reason,
        record.deadline_days,
        record.sevak_name,
        record.sevak_phone,
        record.hospital_name,
        record.scheme_id,
        record.scheme_name,
        record.approved_amount,
        record.action_type,
        record.badge,
        record.badge_en,
        record.badge_hi,
        record.is_broadcast,
        record.is_read,
        JSON.stringify(record.metadata),
        record.created_by_admin_id,
        record.created_at,
        record.updated_at,
      ];

      const res = await query(insertSql, values);
      if (res?.rows?.[0]) return res.rows[0];
    } catch (dbErr) {
      console.warn('[NotificationModel] Database insert fallback:', dbErr.message);
    }

    memoryNotifications.unshift(record);
    return record;
  },

  /**
   * Find notification by ID
   */
  async findById(id) {
    await ensureNotificationsTable();
    try {
      const result = await query(
        'SELECT * FROM public.notifications WHERE id = $1',
        [id]
      );
      if (result.rows[0]) return result.rows[0];
    } catch (_) {}

    return memoryNotifications.find((n) => n.id === id) || null;
  },

  /**
   * List all notifications for Admin with optional filters
   */
  async findAll(filters = {}) {
    await ensureNotificationsTable();
    const { type, priority, case_id, mobile, is_broadcast, scope, limit = 50, offset = 0 } = filters;

    try {
      const conditions = [];
      const params = [];
      let pIdx = 1;

      // Scope separation:
      // 'inbox' (default for admin header bell): ONLY incoming alerts for the admin (SLA reminder, doc resubmitted, etc.)
      // 'sent' (for send-notifications history log): Outgoing alerts sent to citizens / sevaks / broadcast
      if (scope === 'sent' || scope === 'outbox') {
        conditions.push(`(
          recipient_type IN ('CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST')
          OR (is_broadcast = true AND recipient_type != 'ADMIN')
        )`);
      } else if (filters.recipient_type && filters.recipient_type !== 'ADMIN') {
        conditions.push(`recipient_type = $${pIdx++}`);
        params.push(filters.recipient_type.toUpperCase());
      } else {
        // Default Admin Inbox: ONLY incoming alerts targeted to ADMIN
        conditions.push(`recipient_type = 'ADMIN'`);
        conditions.push(`(is_broadcast IS NOT TRUE OR is_broadcast IS NULL)`);
        conditions.push(`COALESCE(recipient_type, '') NOT IN ('CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST')`);
      }

      if (type) {
        conditions.push(`type = $${pIdx++}`);
        params.push(type.toUpperCase());
      }

      if (priority) {
        conditions.push(`priority = $${pIdx++}`);
        params.push(priority.toUpperCase());
      }

      if (case_id) {
        conditions.push(`case_id ILIKE $${pIdx++}`);
        params.push(`%${case_id}%`);
      }

      if (mobile) {
        conditions.push(`(mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx})`);
        pIdx++;
        params.push(`%${mobile}%`);
      }

      if (is_broadcast !== undefined && is_broadcast !== null) {
        conditions.push(`is_broadcast = $${pIdx++}`);
        params.push(Boolean(is_broadcast));
      }

      if (filters.is_read !== undefined && filters.is_read !== null && filters.is_read !== '') {
        conditions.push(`is_read = $${pIdx++}`);
        params.push(filters.is_read === true || filters.is_read === 'true');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) AS total FROM public.notifications ${whereClause}`;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const listSql = `
        SELECT *
        FROM public.notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(Math.min(parseInt(limit, 10) || 50, 100));
      params.push(Math.max(parseInt(offset, 10) || 0, 0));

      const listRes = await query(listSql, params);
      return {
        total,
        notifications: listRes.rows,
      };
    } catch (dbErr) {
      console.warn('[NotificationModel] findAll fallback to memory:', dbErr.message);
      const filtered = memoryNotifications.filter((n) => {
        const isSentToUser =
          n.recipient_type === 'CITIZEN' ||
          n.recipient_type === 'ALL_CITIZENS' ||
          n.recipient_type === 'SEVAK' ||
          n.recipient_type === 'ALL_SEVAKS' ||
          (n.is_broadcast && n.recipient_type !== 'ADMIN');

        if (scope === 'sent' || scope === 'outbox') {
          return isSentToUser;
        }
        if (scope === 'inbox' || filters.recipient_type === 'ADMIN' || !filters.recipient_type) {
          if (isSentToUser) return false;
          return (
            n.recipient_type === 'ADMIN' ||
            ['SLA_REMINDER', 'DOCS_RESUBMITTED', 'REOPEN_REQUEST', 'ACTION_REQUIRED', 'EMERGENCY_ESCALATION'].includes(n.type)
          );
        }
        return true;
      });
      return {
        total: filtered.length,
        notifications: filtered.slice(offset, offset + limit),
      };
    }
  },

  /**
   * Find notifications for a Citizen
   * Supports: findForCitizen(userId, mobile) OR findForCitizen({ userId, citizenId, mobile, limit, offset })
   */
  async findForCitizen(arg1, arg2) {
    await ensureNotificationsTable();

    let userId = null;
    let citizenId = null;
    let mobile = null;
    let limit = 50;
    let offset = 0;

    if (arg1 && typeof arg1 === 'object') {
      userId = arg1.userId || arg1.user_id || null;
      citizenId = arg1.citizenId || arg1.citizen_id || null;
      mobile = arg1.mobile || null;
      limit = arg1.limit || 50;
      offset = arg1.offset || 0;
    } else {
      userId = arg1 || null;
      mobile = arg2 || null;
    }

    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'ALL_CITIZENS'",
        "recipient_type = 'BROADCAST'",
        "(is_broadcast = true AND recipient_type NOT IN ('SEVAK', 'ALL_SEVAKS', 'ADMIN'))",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`(recipient_type = 'CITIZEN' AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(userId);
      }

      if (citizenId) {
        orClauses.push(`(recipient_type = 'CITIZEN' AND citizen_id = $${pIdx++})`);
        params.push(citizenId);
      }

      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`(recipient_type = 'CITIZEN' AND (mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx}))`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }

      // Exclude admin-only and sevak-only alerts
      const whereSql = `WHERE COALESCE(recipient_type, '') NOT IN ('ADMIN', 'SEVAK', 'ALL_SEVAKS') AND (${orClauses.join(' OR ')})`;

      const countSql = `SELECT COUNT(*) AS total FROM public.notifications ${whereSql}`;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const listSql = `
        SELECT *
        FROM public.notifications
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(Math.min(parseInt(limit, 10) || 50, 100));
      params.push(Math.max(parseInt(offset, 10) || 0, 0));

      const listRes = await query(listSql, params);

      return {
        total,
        notifications: listRes.rows,
      };
    } catch (dbErr) {
      console.warn('[NotificationModel] findForCitizen fallback to memory:', dbErr.message);
      const cleanMob = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null;
      const filtered = memoryNotifications.filter((n) => {
        if (n.recipient_type === 'ADMIN' || n.recipient_type === 'SEVAK' || n.recipient_type === 'ALL_SEVAKS') return false;
        if (n.recipient_type === 'ALL' || n.recipient_type === 'ALL_CITIZENS' || n.recipient_type === 'BROADCAST') return true;
        if (n.is_broadcast && n.recipient_type !== 'SEVAK' && n.recipient_type !== 'ALL_SEVAKS') return true;
        if (n.recipient_type === 'CITIZEN') {
          if (userId && (n.recipient_id === userId || n.recipient_user_id === userId)) return true;
          if (citizenId && n.citizen_id === citizenId) return true;
          if (cleanMob && n.mobile && String(n.mobile).includes(cleanMob)) return true;
        }
        return false;
      });
      return {
        total: filtered.length,
        notifications: filtered.slice(offset, offset + limit),
      };
    }
  },

  /**
   * Find notifications for Arogya Sevak
   */
  async findForSevak({ sevakId, userId, mobile, name, limit = 50, offset = 0 } = {}) {
    await ensureNotificationsTable();
    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'ALL_SEVAKS'",
        "recipient_type = 'BROADCAST'",
        "(is_broadcast = true AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS'))",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(userId);
      }
      if (sevakId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(sevakId);
      }
      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx} OR sevak_phone LIKE $${pIdx}))`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }
      if (name) {
        const cleanName = String(name).trim();
        if (cleanName.length >= 2) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND sevak_name ILIKE $${pIdx})`);
          pIdx++;
          params.push(`%${cleanName}%`);
        }
      }
      if (sevakId || userId) {
        orClauses.push(`(
          recipient_type = 'SEVAK' AND (
            application_id IN (
              SELECT application_id FROM public.application_assignments 
              WHERE (arogya_sevak_id = $${pIdx} OR arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND assignment_status = 'ASSIGNED'
            )
            OR
            case_id IN (
              SELECT a.application_number FROM public.applications a
              JOIN public.application_assignments aa ON a.id = aa.application_id
              WHERE (aa.arogya_sevak_id = $${pIdx} OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND aa.assignment_status = 'ASSIGNED'
            )
          )
        )`);
        pIdx++;
        params.push(sevakId || userId);
      }

      const whereSql = `WHERE COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS') AND (${orClauses.join(' OR ')})`;

      const countSql = `SELECT COUNT(*) AS total FROM public.notifications ${whereSql}`;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const listSql = `
        SELECT *
        FROM public.notifications
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(Math.min(parseInt(limit, 10) || 50, 100));
      params.push(Math.max(parseInt(offset, 10) || 0, 0));

      const listRes = await query(listSql, params);

      return {
        total,
        notifications: listRes.rows,
      };
    } catch (dbErr) {
      console.warn('[NotificationModel] findForSevak fallback to memory:', dbErr.message);
      const filtered = memoryNotifications.filter((n) => {
        if (n.recipient_type === 'ADMIN' || n.recipient_type === 'CITIZEN' || n.recipient_type === 'ALL_CITIZENS') return false;
        if (n.recipient_type === 'ALL' || n.recipient_type === 'ALL_SEVAKS' || n.recipient_type === 'BROADCAST') return true;
        if (n.recipient_type === 'SEVAK' || n.recipient_type === 'INDIVIDUAL_SEVAK') return true;
        return false;
      });
      return {
        total: filtered.length,
        notifications: filtered.slice(offset, offset + limit),
      };
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id) {
    await ensureNotificationsTable();
    try {
      const result = await query(
        `UPDATE public.notifications
         SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows[0]) return result.rows[0];
    } catch (_) {}

    const memoryItem = memoryNotifications.find((n) => n.id === id);
    if (memoryItem) {
      memoryItem.is_read = true;
      memoryItem.read_at = new Date();
      return memoryItem;
    }
    return null;
  },

  /**
   * Get unread count for citizen
   */
  async getUnreadCount({ userId = null, citizenId = null, mobile = null } = {}) {
    await ensureNotificationsTable();

    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'BROADCAST'",
        "is_broadcast = true",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`recipient_id = $${pIdx}`);
        orClauses.push(`recipient_user_id = $${pIdx}`);
        pIdx++;
        params.push(userId);
      }

      if (citizenId) {
        orClauses.push(`citizen_id = $${pIdx++}`);
        params.push(citizenId);
      }

      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`mobile LIKE $${pIdx}`);
          orClauses.push(`recipient_mobile LIKE $${pIdx}`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }

      const sql = `
        SELECT COUNT(*) AS unread_count
        FROM public.notifications
        WHERE is_read = false AND COALESCE(recipient_type, '') != 'ADMIN' AND (${orClauses.join(' OR ')})
      `;
      const res = await query(sql, params);
      return parseInt(res.rows[0]?.unread_count || '0', 10);
    } catch (_) {
      return 0;
    }
  },

  /**
   * Get unread count for Sevak
   */
  async getUnreadCountForSevak({ sevakId = null, userId = null, mobile = null, name = null } = {}) {
    await ensureNotificationsTable();
    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'ALL_SEVAKS'",
        "recipient_type = 'BROADCAST'",
        "(is_broadcast = true AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS'))",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(userId);
      }
      if (sevakId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(sevakId);
      }
      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx} OR sevak_phone LIKE $${pIdx}))`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }
      if (name) {
        const cleanName = String(name).trim();
        if (cleanName.length >= 2) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND sevak_name ILIKE $${pIdx})`);
          pIdx++;
          params.push(`%${cleanName}%`);
        }
      }
      if (sevakId || userId) {
        orClauses.push(`(
          recipient_type = 'SEVAK' AND (
            application_id IN (
              SELECT application_id FROM public.application_assignments 
              WHERE (arogya_sevak_id = $${pIdx} OR arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND assignment_status = 'ASSIGNED'
            )
            OR
            case_id IN (
              SELECT a.application_number FROM public.applications a
              JOIN public.application_assignments aa ON a.id = aa.application_id
              WHERE (aa.arogya_sevak_id = $${pIdx} OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND aa.assignment_status = 'ASSIGNED'
            )
          )
        )`);
        pIdx++;
        params.push(sevakId || userId);
      }

      const sql = `
        SELECT COUNT(*) AS unread_count
        FROM public.notifications
        WHERE is_read = false
          AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS')
          AND (${orClauses.join(' OR ')})
      `;
      const res = await query(sql, params);
      return parseInt(res.rows[0]?.unread_count || '0', 10);
    } catch (_) {
      return 0;
    }
  },

  /**
   * Mark all notifications as read for Sevak
   */
  async markAllAsReadForSevak({ sevakId = null, userId = null, mobile = null, name = null } = {}) {
    await ensureNotificationsTable();
    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'ALL_SEVAKS'",
        "recipient_type = 'BROADCAST'",
        "(is_broadcast = true AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS'))",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(userId);
      }
      if (sevakId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(sevakId);
      }
      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx} OR sevak_phone LIKE $${pIdx}))`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }
      if (name) {
        const cleanName = String(name).trim();
        if (cleanName.length >= 2) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND sevak_name ILIKE $${pIdx})`);
          pIdx++;
          params.push(`%${cleanName}%`);
        }
      }
      if (sevakId || userId) {
        orClauses.push(`(
          recipient_type = 'SEVAK' AND (
            application_id IN (
              SELECT application_id FROM public.application_assignments 
              WHERE (arogya_sevak_id = $${pIdx} OR arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND assignment_status = 'ASSIGNED'
            )
            OR
            case_id IN (
              SELECT a.application_number FROM public.applications a
              JOIN public.application_assignments aa ON a.id = aa.application_id
              WHERE (aa.arogya_sevak_id = $${pIdx} OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND aa.assignment_status = 'ASSIGNED'
            )
          )
        )`);
        pIdx++;
        params.push(sevakId || userId);
      }

      const sql = `
        UPDATE public.notifications
        SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE is_read = false
          AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS')
          AND (${orClauses.join(' OR ')})
      `;
      await query(sql, params);
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Delete / clear all seen (read) notifications for Sevak
   */
  async clearSeenNotificationsForSevak({ sevakId = null, userId = null, mobile = null, name = null } = {}) {
    await ensureNotificationsTable();
    try {
      const orClauses = [
        "recipient_type = 'ALL'",
        "recipient_type = 'ALL_SEVAKS'",
        "recipient_type = 'BROADCAST'",
        "(is_broadcast = true AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS'))",
      ];
      const params = [];
      let pIdx = 1;

      if (userId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(userId);
      }
      if (sevakId) {
        orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (recipient_id = $${pIdx} OR recipient_user_id = $${pIdx}))`);
        pIdx++;
        params.push(sevakId);
      }
      if (mobile) {
        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length >= 7) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND (mobile LIKE $${pIdx} OR recipient_mobile LIKE $${pIdx} OR sevak_phone LIKE $${pIdx}))`);
          pIdx++;
          params.push(`%${cleanMobile}%`);
        }
      }
      if (name) {
        const cleanName = String(name).trim();
        if (cleanName.length >= 2) {
          orClauses.push(`((recipient_type = 'SEVAK' OR recipient_type = 'INDIVIDUAL_SEVAK') AND sevak_name ILIKE $${pIdx})`);
          pIdx++;
          params.push(`%${cleanName}%`);
        }
      }
      if (sevakId || userId) {
        orClauses.push(`(
          recipient_type = 'SEVAK' AND (
            application_id IN (
              SELECT application_id FROM public.application_assignments 
              WHERE (arogya_sevak_id = $${pIdx} OR arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND assignment_status = 'ASSIGNED'
            )
            OR
            case_id IN (
              SELECT a.application_number FROM public.applications a
              JOIN public.application_assignments aa ON a.id = aa.application_id
              WHERE (aa.arogya_sevak_id = $${pIdx} OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${pIdx}))
              AND aa.assignment_status = 'ASSIGNED'
            )
          )
        )`);
        pIdx++;
        params.push(sevakId || userId);
      }

      const sql = `
        DELETE FROM public.notifications
        WHERE is_read = true
          AND COALESCE(recipient_type, '') NOT IN ('ADMIN', 'CITIZEN', 'ALL_CITIZENS')
          AND (${orClauses.join(' OR ')})
      `;
      await query(sql, params);
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Mark all admin notifications as read (Only incoming admin inbox alerts)
   */
  async markAllAsReadForAdmin() {
    await ensureNotificationsTable();
    try {
      await query(`
        UPDATE public.notifications
        SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE is_read = false
          AND recipient_type = 'ADMIN'
          AND (is_broadcast IS NOT TRUE OR is_broadcast IS NULL)
          AND COALESCE(recipient_type, '') NOT IN ('CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST')
      `);
      return true;
    } catch (_) {
      memoryNotifications.forEach((n) => {
        if (n.recipient_type === 'ADMIN' && !n.is_broadcast) {
          n.is_read = true;
          n.read_at = new Date();
        }
      });
      return true;
    }
  },

  /**
   * Get unread notifications count for admin inbox only
   */
  async getAdminUnreadCount() {
    await ensureNotificationsTable();
    try {
      const res = await query(`
        SELECT COUNT(*)::int AS unread_count
        FROM public.notifications
        WHERE is_read = false
          AND recipient_type = 'ADMIN'
          AND (is_broadcast IS NOT TRUE OR is_broadcast IS NULL)
          AND COALESCE(recipient_type, '') NOT IN ('CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST')
      `);
      return parseInt(res.rows[0]?.unread_count || '0', 10);
    } catch (_) {
      return memoryNotifications.filter((n) => !n.is_read && n.recipient_type === 'ADMIN' && !n.is_broadcast).length;
    }
  },

  /**
   * Delete / clear all seen (read) notifications in Admin Inbox
   */
  async clearSeenNotifications() {
    await ensureNotificationsTable();
    try {
      await query(`
        DELETE FROM public.notifications
        WHERE is_read = true
          AND recipient_type = 'ADMIN'
          AND (is_broadcast IS NOT TRUE OR is_broadcast IS NULL)
      `);
      return true;
    } catch (_) {
      for (let i = memoryNotifications.length - 1; i >= 0; i--) {
        if (memoryNotifications[i].is_read && memoryNotifications[i].recipient_type === 'ADMIN' && !memoryNotifications[i].is_broadcast) {
          memoryNotifications.splice(i, 1);
        }
      }
      return true;
    }
  },

  /**
   * Delete / clear all admin inbox notifications
   */
  async clearAllNotifications() {
    await ensureNotificationsTable();
    try {
      await query(`
        DELETE FROM public.notifications
        WHERE recipient_type = 'ADMIN'
          AND (is_broadcast IS NOT TRUE OR is_broadcast IS NULL)
      `);
      return true;
    } catch (_) {
      for (let i = memoryNotifications.length - 1; i >= 0; i--) {
        if (memoryNotifications[i].recipient_type === 'ADMIN' && !memoryNotifications[i].is_broadcast) {
          memoryNotifications.splice(i, 1);
        }
      }
      return true;
    }
  },

  /**
   * Delete single notification by ID
   */
  async deleteNotification(id) {
    await ensureNotificationsTable();
    try {
      await query(`DELETE FROM public.notifications WHERE id = $1`, [id]);
      return true;
    } catch (_) {
      const idx = memoryNotifications.findIndex((n) => n.id === id);
      if (idx >= 0) memoryNotifications.splice(idx, 1);
      return true;
    }
  },
};

export default NotificationModel;
