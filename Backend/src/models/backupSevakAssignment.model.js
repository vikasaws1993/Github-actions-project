import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * SQL DDL for backup_sevak_assignments table:
 *
 * backup_sevak_assignments
 * ----------------------------------------------------
 * id (PK)                 UUID
 * primary_sevak_id (FK)   UUID (references public.arogya_sevaks or public.users)
 * hospital_id             VARCHAR(100) / UUID
 * backup_name             VARCHAR(255) NOT NULL
 * backup_mobile           VARCHAR(15) NOT NULL
 * reason                  TEXT
 * is_active               BOOLEAN DEFAULT TRUE
 * assigned_by             UUID
 * created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 */
export const CREATE_BACKUP_SEVAK_ASSIGNMENTS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.backup_sevak_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_sevak_id VARCHAR(100) NOT NULL,
    hospital_id VARCHAR(100),
    backup_name VARCHAR(255) NOT NULL,
    backup_mobile VARCHAR(15) NOT NULL,
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_backup_sevak_primary ON public.backup_sevak_assignments(primary_sevak_id);
  CREATE INDEX IF NOT EXISTS idx_backup_sevak_mobile ON public.backup_sevak_assignments(backup_mobile);
  CREATE INDEX IF NOT EXISTS idx_backup_sevak_active ON public.backup_sevak_assignments(is_active);
`;

// In-memory fallback store for offline development / local mock
const inMemoryBackupSevaks = new Map();

export const BackupSevakAssignmentModel = {
  /**
   * Ensure table exists
   */
  async createTable() {
    try {
      return await query(CREATE_BACKUP_SEVAK_ASSIGNMENTS_TABLE_SQL);
    } catch (err) {
      console.warn('Could not create backup_sevak_assignments table in DB, using fallback:', err?.message);
    }
  },

  /**
   * Assign or update a backup temporary Sevak
   */
  async assignBackup({
    primary_sevak_id,
    hospital_id = null,
    backup_name,
    backup_mobile,
    reason = '',
    assigned_by = null,
  }) {
    const cleanMobile = String(backup_mobile).replace(/\D/g, '').slice(-10);
    const primaryIdStr = String(primary_sevak_id);

    try {
      // First deactivate any currently active backup assignment for this primary sevak
      await query(
        `UPDATE public.backup_sevak_assignments 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
         WHERE primary_sevak_id = $1 AND is_active = TRUE`,
        [primaryIdStr]
      );

      const insertSQL = `
        INSERT INTO public.backup_sevak_assignments (
          primary_sevak_id,
          hospital_id,
          backup_name,
          backup_mobile,
          reason,
          is_active,
          assigned_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      const result = await query(insertSQL, [
        primaryIdStr,
        hospital_id,
        backup_name,
        cleanMobile,
        reason,
        assigned_by,
      ]);

      const saved = result?.rows?.[0];
      if (saved) {
        inMemoryBackupSevaks.set(primaryIdStr, saved);
        return saved;
      }
    } catch (err) {
      console.warn('DB error assigning backup sevak, using fallback:', err?.message);
    }

    // In-memory fallback
    const mockRecord = {
      id: crypto.randomUUID(),
      primary_sevak_id: primaryIdStr,
      hospital_id,
      backup_name,
      backup_mobile: cleanMobile,
      reason,
      is_active: true,
      assigned_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryBackupSevaks.set(primaryIdStr, mockRecord);
    return mockRecord;
  },

  /**
   * Get active backup assignment for a primary Sevak
   */
  async getActiveByPrimarySevakId(primary_sevak_id) {
    const primaryIdStr = String(primary_sevak_id);
    try {
      const selectSQL = `
        SELECT * FROM public.backup_sevak_assignments 
        WHERE primary_sevak_id = $1 AND is_active = TRUE 
        ORDER BY created_at DESC LIMIT 1;
      `;
      const result = await query(selectSQL, [primaryIdStr]);
      if (result?.rows?.length) {
        return result.rows[0];
      }
    } catch (err) {
      console.warn('DB error fetching backup sevak:', err?.message);
    }

    const mem = inMemoryBackupSevaks.get(primaryIdStr);
    return mem && mem.is_active ? mem : null;
  },

  /**
   * Find active backup assignment by mobile number (for login & verification)
   */
  async getActiveByMobile(mobile) {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    try {
      const selectSQL = `
        SELECT * FROM public.backup_sevak_assignments 
        WHERE backup_mobile = $1 AND is_active = TRUE 
        ORDER BY created_at DESC LIMIT 1;
      `;
      const result = await query(selectSQL, [cleanMobile]);
      if (result?.rows?.length) {
        return result.rows[0];
      }
    } catch (err) {
      console.warn('DB error checking backup sevak by mobile:', err?.message);
    }

    for (const record of inMemoryBackupSevaks.values()) {
      if (record.is_active && record.backup_mobile === cleanMobile) {
        return record;
      }
    }
    return null;
  },

  /**
   * Deactivate / Remove backup Sevak assignment
   */
  async removeBackup(primary_sevak_id) {
    const primaryIdStr = String(primary_sevak_id).trim();
    try {
      const updateSQL = `
        UPDATE public.backup_sevak_assignments 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
        WHERE (
          primary_sevak_id = $1 
          OR LOWER(primary_sevak_id) = LOWER($1)
          OR primary_sevak_id IN (
            SELECT id::text FROM public.arogya_sevaks WHERE employee_code ILIKE $1 OR user_id::text = $1
            UNION
            SELECT user_id::text FROM public.arogya_sevaks WHERE employee_code ILIKE $1 OR id::text = $1
            UNION
            SELECT id::text FROM public.users WHERE full_name ILIKE $1 OR mobile = $1
          )
        )
        AND is_active = TRUE
        RETURNING *;
      `;
      const result = await query(updateSQL, [primaryIdStr]);
      inMemoryBackupSevaks.delete(primaryIdStr);
      for (const [key, val] of inMemoryBackupSevaks.entries()) {
        if (val.primary_sevak_id === primaryIdStr || key === primaryIdStr) {
          val.is_active = false;
          inMemoryBackupSevaks.delete(key);
        }
      }
      return result?.rows || [];
    } catch (err) {
      console.warn('DB error removing backup sevak:', err?.message);
      inMemoryBackupSevaks.delete(primaryIdStr);
      return [];
    }
  },
};
