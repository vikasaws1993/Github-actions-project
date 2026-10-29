import AsyncStorage from '@react-native-async-storage/async-storage';
import { EscalationType } from '../types/sevakHospital.types';
import { OpdDepartment, OpdVisitType } from '../types/sevakOpd.types';
import { ShiftType } from '../types/sevakDailyUpdate.types';

const DRAFT_PREFIX = '@ArogyaMitra:sevak_draft:';

export interface StagedFileAttachment {
  name: string;
  uri: string;
  size: string;
  timestamp: string;
  type: string;
}

export interface AdditionalDocModalDraft {
  title: string;
  stagedFile?: StagedFileAttachment | null;
  savedAt: string;
}

export interface TreatmentStatusModalDraft {
  status: string;
  note: string;
  savedAt: string;
}

export interface CaseEscalationDraft {
  type: EscalationType;
  approxBillAmount: string;
  requiredSpecialty: string;
  sevakNote: string;
  holdCase: boolean;
  attachedDoc?: StagedFileAttachment | null;
  savedAt: string;
}

export interface CaseDocsUploadModalDraft {
  caseId?: string;
  title?: string;
  note?: string;
  docTitle?: string;
  docNote?: string;
  selectedFile?: {
    name: string;
    uri: string;
    size: string;
    type: string;
  } | null;
  savedAt?: string;
}

export interface OpdVisitModalDraft {
  caseId?: string;
  department?: OpdDepartment;
  selectedDept?: string;
  consultingDoctor?: string;
  visitType?: OpdVisitType;
  nextFollowUpRequired?: boolean;
  nextFollowUpTimeline?: string;
  savedAt?: string;
}

export interface DailyHospitalUpdateDraft {
  shift?: ShiftType;
  availableGeneralBeds?: string;
  availableIcuBeds?: string;
  availableNicuBeds?: string;
  availablePicuBeds?: string;
  availableIsolationBeds?: string;
  availableWards?: string;
  admissionsToday?: string;
  doctorsOnDuty?: string;
  ventilatorsAvailable?: string;
  oxygenBedsAvailable?: string;
  dialysisMachinesFree?: string;
  operationTheatresReady?: string;
  opdDoctorRecords?: any[];
  remarks?: string;
  savedAt?: string;
}

class SevakDraftService {
  private formatKey(key: string): string {
    return `${DRAFT_PREFIX}${key}`;
  }

  // Generic draft save
  async saveDraft<T>(key: string, data: T): Promise<void> {
    try {
      const fullKey = this.formatKey(key);
      const json = JSON.stringify(data);
      await AsyncStorage.setItem(fullKey, json);
    } catch (e) {
      console.warn(`[SevakDraftService] Failed to save draft for ${key}:`, e);
    }
  }

  // Generic draft load
  async loadDraft<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.formatKey(key);
      const json = await AsyncStorage.getItem(fullKey);
      if (!json) return null;
      return JSON.parse(json) as T;
    } catch (e) {
      console.warn(`[SevakDraftService] Failed to load draft for ${key}:`, e);
      return null;
    }
  }

  // Generic draft clear
  async clearDraft(key: string): Promise<void> {
    try {
      const fullKey = this.formatKey(key);
      await AsyncStorage.removeItem(fullKey);
    } catch (e) {
      console.warn(`[SevakDraftService] Failed to clear draft for ${key}:`, e);
    }
  }

  // Clear all drafts
  async clearAllDrafts(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const draftKeys = allKeys.filter((k) => k.startsWith(DRAFT_PREFIX));
      if (draftKeys.length > 0) {
        await AsyncStorage.multiRemove(draftKeys);
      }
    } catch (e) {
      console.warn('[SevakDraftService] Failed to clear all drafts:', e);
    }
  }

  // Check if draft exists
  async hasDraft(key: string): Promise<boolean> {
    try {
      const fullKey = this.formatKey(key);
      const item = await AsyncStorage.getItem(fullKey);
      return item !== null;
    } catch {
      return false;
    }
  }

  // Standard Key Generators
  keys = {
    caseReqDocs: (caseId: string) => `case_req_docs_${caseId}`,
    additionalDocModal: (caseId: string) => `case_add_doc_${caseId}`,
    treatmentStatusModal: (caseId: string) => `case_status_update_${caseId}`,
    caseEscalation: (caseId: string) => `case_escalation_${caseId}`,
    caseDocsUploadModal: (caseId?: string) => (caseId ? `case_docs_upload_${caseId}` : 'case_docs_upload_modal'),
    opdVisitModal: () => 'opd_visit_modal',
    dailyHospitalUpdate: (shift: string, dateStr: string) => `daily_update_${shift}_${dateStr}`,
    hospitalSurvey: (userIdOrHospId: string, hospitalId?: string) =>
      hospitalId ? `hospital_facility_survey_${userIdOrHospId}_${hospitalId}` : `hospital_facility_survey_${userIdOrHospId}`,
  };
}

export const sevakDraftService = new SevakDraftService();
