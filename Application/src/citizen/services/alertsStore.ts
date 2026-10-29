import AsyncStorage from '@react-native-async-storage/async-storage';
import { applicationStore } from './applicationStore';
import { APP_CONFIG } from '../../shared/constants/config';
import { SchemeApplication } from '../types/application.types';
import { notificationService } from './notificationService';

export type AlertType =
  | 'DOC_REQUEST'
  | 'APPROVED'
  | 'IN_REVIEW'
  | 'SEVAK_ASSIGNED'
  | 'ANNOUNCEMENT'
  | 'SCHEME_UPDATE'
  | 'ADVISORY';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface AdminAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  titleEn?: string;
  titleHi?: string;
  message: string;
  messageEn?: string;
  messageHi?: string;
  sender: string;
  senderEn?: string;
  senderHi?: string;
  date: string;
  dateEn?: string;
  timestamp?: string;
  applicationId?: string;
  caseId?: string;
  patientName?: string;
  schemeName?: string;
  requestedDocName?: string;
  requestedDocType?: string;
  revertReason?: string;
  sevakName?: string;
  sevakPhone?: string;
  hospitalName?: string;
  badge?: string;
  badgeEn?: string;
  badgeHi?: string;
  isRead: boolean;
  actionType: 'UPLOAD_DOC' | 'VIEW_CASE' | 'CALL_SEVAK' | 'ANNOUNCEMENT' | 'SCHEME_UPDATE' | 'ADVISORY';
}

import { apiClient } from '../../api/client';

class AlertsStore {
  private listeners: Set<() => void> = new Set();
  private readIds: Set<string> = new Set();
  private dismissedIds: Set<string> = new Set();
  private isLoaded: boolean = false;
  private activeUserId: string | null = null;

  constructor() {
    this.init();
  }

  public setActiveUser(userIdentifier: string | null) {
    if (this.activeUserId !== userIdentifier) {
      this.activeUserId = userIdentifier;
      this.readIds.clear();
      this.dismissedIds.clear();
      this.isLoaded = false;
      this.init();
      notificationService.setActiveUser(userIdentifier);
    }
  }

  public clearCache() {
    this.readIds.clear();
    this.dismissedIds.clear();
    this.activeUserId = null;
    this.isLoaded = false;
    notificationService.clearCache();
  }

  private getReadStorageKey(): string {
    if (!this.activeUserId) return '@arogyamitra_citizen_read_alerts_guest';
    const cleanId = String(this.activeUserId).replace(/[^\w-]/g, '');
    return `@arogyamitra_citizen_read_alerts_${cleanId}`;
  }

  private getDismissedStorageKey(): string {
    if (!this.activeUserId) return '@arogyamitra_citizen_dismissed_alerts_guest';
    const cleanId = String(this.activeUserId).replace(/[^\w-]/g, '');
    return `@arogyamitra_citizen_dismissed_alerts_${cleanId}`;
  }

  private async init() {
    try {
      const [storedRead, storedDismissed] = await Promise.all([
        AsyncStorage.getItem(this.getReadStorageKey()),
        AsyncStorage.getItem(this.getDismissedStorageKey()),
      ]);

      if (storedRead) {
        const parsed = JSON.parse(storedRead);
        if (Array.isArray(parsed)) {
          this.readIds = new Set(parsed);
        }
      }

      if (storedDismissed) {
        const parsed = JSON.parse(storedDismissed);
        if (Array.isArray(parsed)) {
          this.dismissedIds = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('[AlertsStore] Error loading alerts cache:', e);
    } finally {
      this.isLoaded = true;
    }
  }

  private async persistReadIds() {
    try {
      await AsyncStorage.setItem(
        this.getReadStorageKey(),
        JSON.stringify(Array.from(this.readIds))
      );
    } catch (e) {
      console.warn('[AlertsStore] Error persisting read alerts:', e);
    }
  }

  private async persistDismissedIds() {
    try {
      await AsyncStorage.setItem(
        this.getDismissedStorageKey(),
        JSON.stringify(Array.from(this.dismissedIds))
      );
    } catch (e) {
      console.warn('[AlertsStore] Error persisting dismissed alerts:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[AlertsStore] Listener error:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Derive active alerts from live applications in applicationStore
   */
  private deriveAlertsFromApplications(applications: SchemeApplication[]): AdminAlert[] {
    const alerts: AdminAlert[] = [];

    applications.forEach((app) => {
      const hasRevert =
        (app.status === 'REVERTED' || (app.revertDetails && !app.revertDetails.isResolved));

      // 1. Document Required / Revert Alert (Highest Priority)
      if (hasRevert && app.revertDetails) {
        const alertId = `alert-revert-${app.id || app.caseId}`;
        alerts.push({
          id: alertId,
          type: 'DOC_REQUEST',
          priority: 'CRITICAL',
          title: `कागदपत्र पूर्तता आवश्यक: ${app.revertDetails.requestedDocName || 'कागदपत्रे हवीत'}`,
          titleEn: `Document Required: ${app.revertDetails.requestedDocName || 'Requested Document'}`,
          titleHi: `दस्तावेज़ पूर्तता आवश्यक: ${app.revertDetails.requestedDocName || 'दस्तावेज़ चाहिए'}`,
          message: `प्रशासनाकडून केस क्र. ${app.caseId} (रुग्ण: ${app.patientName}) साठी सूचना: "${app.revertDetails.reason || 'कृपया विचारलेले कागदपत्र त्वरित अपलोड करा.'}"`,
          messageEn: `Admin notice for Case ID ${app.caseId} (${app.patientName}): "${app.revertDetails.reason || 'Please upload the requested document immediately.'}"`,
          messageHi: `केस सं. ${app.caseId} (${app.patientName}) के लिए प्रशासन की सूचना: "${app.revertDetails.reason || 'कृपया मांगा गया दस्तावेज़ तुरंत अपलोड करें।'}"`,
          sender: 'प्रशासकीय पडताळणी कक्ष',
          senderEn: 'Administration / Verification Cell',
          senderHi: 'प्रशासन / सत्यापन प्रकोष्ठ',
          date: app.revertDetails.requestedDate || app.appliedDate || 'अलीकडेच',
          dateEn: app.revertDetails.requestedDate || app.appliedDate || 'Recent',
          timestamp: '०२:३० PM',
          applicationId: app.id || app.caseId,
          caseId: app.caseId,
          patientName: app.patientName,
          schemeName: app.schemeName,
          requestedDocName: app.revertDetails.requestedDocName,
          requestedDocType: app.revertDetails.requestedDocType,
          revertReason: app.revertDetails.reason,
          badge: 'तातडीचे',
          badgeEn: 'Action Required',
          badgeHi: 'कार्रवाई आवश्यक',
          isRead: this.readIds.has(alertId),
          actionType: 'UPLOAD_DOC',
        });
      }

      // 2. Application Approved Alert
      if (app.status === 'APPROVED') {
        const alertId = `alert-approved-${app.id || app.caseId}`;
        const schemeKey = `${app.schemeId || ''} ${app.schemeName || ''}`.toLowerCase();
        const isPmjay = schemeKey.includes('pmjay') || schemeKey.includes('ayushman') || schemeKey.includes('आयुष्मान');
        const isMjpjay = schemeKey.includes('mjpjay') || schemeKey.includes('jyotirao') || schemeKey.includes('jyotiba') || schemeKey.includes('phule') || schemeKey.includes('फुले');

        const schemeNameMr = isPmjay ? 'आयुष्मान भारत (PM-JAY)' : isMjpjay ? 'महात्मा ज्योतिराव फुले जन आरोग्य योजना' : (app.schemeName || 'शासकीय योजना');
        const schemeNameHi = isPmjay ? 'आयुष्मान भारत (PM-JAY)' : isMjpjay ? 'महात्मा ज्योतिराव फुले जन आरोग्य योजना' : (app.schemeName || 'सरकारी योजना');
        const schemeNameEn = isPmjay ? 'Ayushman Bharat (PM-JAY)' : isMjpjay ? 'Mahatma Jyotirao Phule Jan Arogya Yojana' : (app.schemeName || 'Health Scheme');

        alerts.push({
          id: alertId,
          type: 'APPROVED',
          priority: 'HIGH',
          title: `🎉 अर्ज मंजूर झाला आहे: ${schemeNameMr}`,
          titleEn: `🎉 Application Approved: ${schemeNameEn}`,
          titleHi: `🎉 आवेदन स्वीकृत हुआ: ${schemeNameHi}`,
          message: `अभिनंदन! केस क्र. ${app.caseId} (रुग्ण: ${app.patientName}) साठी शासकीय योजनेचा लाभ प्रशासनाने मंजूर केला आहे. रुग्णालयात कॅशलेस उपचार सुरू करता येतील.`,
          messageEn: `Congratulations! Case ID ${app.caseId} (${app.patientName}) has been officially sanctioned by administration. Cashless hospital care is now active.`,
          messageHi: `बधाई हो! केस सं. ${app.caseId} (${app.patientName}) के लिए शासकीय स्वास्थ्य लाभ स्वीकृत हो गया है।`,
          sender: 'प्रशासकीय योजना मंजुरी कक्ष',
          senderEn: 'Administration / Scheme Approval Cell',
          senderHi: 'प्रशासन / योजना स्वीकृति प्रकोष्ठ',
          date: app.appliedDate || '०८ मार्च २०२६',
          dateEn: app.appliedDate || '08 Mar 2026',
          timestamp: '११:४५ AM',
          applicationId: app.id || app.caseId,
          caseId: app.caseId,
          patientName: app.patientName,
          schemeName: app.schemeName,
          hospitalName: app.hospitalName,
          badge: 'मंजूर',
          badgeEn: 'Approved',
          badgeHi: 'स्वीकृत',
          isRead: this.readIds.has(alertId),
          actionType: 'VIEW_CASE',
        });
      }

      // 3. Arogya Sevak Assigned Alert
      if (app.assignedSevak && app.assignedSevak.name && app.assignedSevak.name !== 'Unassigned') {
        const alertId = `alert-sevak-${app.id || app.caseId}-${app.assignedSevak.name}`;
        alerts.push({
          id: alertId,
          type: 'SEVAK_ASSIGNED',
          priority: 'MEDIUM',
          title: `आरोग्य मित्र / सेवक नियुक्त: ${app.assignedSevak.name}`,
          titleEn: `Arogya Sevak Assigned: ${app.assignedSevak.name}`,
          titleHi: `आरोग्य सेवक नियुक्त: ${app.assignedSevak.name}`,
          message: `केस क्र. ${app.caseId} साठी आपल्या मदतीस स्थानिक आरोग्य मित्र/सेवक (${app.assignedSevak.name}, मो.: ${app.assignedSevak.phone}) नियुक्त करण्यात आले आहेत. हॉस्पिटलमध्ये आवश्यक मार्गदर्शनासाठी संपर्क करा.`,
          messageEn: `Arogya Sevak ${app.assignedSevak.name} (${app.assignedSevak.phone}) has been assigned to assist you with Case ${app.caseId} at the hospital.`,
          messageHi: `केस सं. ${app.caseId} के लिए आरोग्य मित्र (${app.assignedSevak.name}, मो.: ${app.assignedSevak.phone}) नियुक्त किए गए हैं।`,
          sender: 'प्रशासकीय समन्वय कक्ष',
          senderEn: 'Administrative Coordination Cell',
          senderHi: 'प्रशासनिक समन्वय प्रकोष्ठ',
          date: app.appliedDate || '०४ मार्च २०२६',
          dateEn: app.appliedDate || '04 Mar 2026',
          timestamp: '०३:२० PM',
          applicationId: app.id || app.caseId,
          caseId: app.caseId,
          patientName: app.patientName,
          sevakName: app.assignedSevak.name,
          sevakPhone: app.assignedSevak.phone,
          hospitalName: app.hospitalName,
          badge: 'सेवक मदत',
          badgeEn: 'Sevak Support',
          badgeHi: 'सेवक सहायता',
          isRead: this.readIds.has(alertId),
          actionType: 'CALL_SEVAK',
        });
      }

      // 4. Application Under Review
      if (app.status === 'IN_REVIEW' || app.status === 'UNDER_REVIEW') {
        const alertId = `alert-review-${app.id || app.caseId}`;
        alerts.push({
          id: alertId,
          type: 'IN_REVIEW',
          priority: 'INFO',
          title: `अर्ज पडताळणी सुरू: केस क्र. ${app.caseId}`,
          titleEn: `Application Under Review: Case ID ${app.caseId}`,
          titleHi: `आवेदन समीक्षाधीन: केस सं. ${app.caseId}`,
          message: `रुग्ण ${app.patientName} यांच्या अर्जाची कागदपत्रे प्रशासकीय तपासणी कक्षात तपासली जात आहेत. लवकरच निर्णय कळवला जाईल.`,
          messageEn: `Documents for patient ${app.patientName} are currently being verified by the review team. You will receive updates shortly.`,
          messageHi: `रोगी ${app.patientName} के दस्तावेज़ों की जांच जारी है। शीघ्र ही निर्णय की सूचना दी जाएगी।`,
          sender: 'प्रशासकीय तपासणी कक्ष',
          senderEn: 'Administration / Review Cell',
          senderHi: 'प्रशासन / समीक्षा प्रकोष्ठ',
          date: app.appliedDate || '०४ मार्च २०२६',
          dateEn: app.appliedDate || '04 Mar 2026',
          timestamp: '१२:०० PM',
          applicationId: app.id || app.caseId,
          caseId: app.caseId,
          patientName: app.patientName,
          schemeName: app.schemeName,
          badge: 'पडताळणी सुरू',
          badgeEn: 'In Review',
          badgeHi: 'समीक्षाधीन',
          isRead: this.readIds.has(alertId),
          actionType: 'VIEW_CASE',
        });
      }
    });

    return alerts;
  }

  /**
   * Fetch all alerts from backend + live applicationStore + broadcasts
   */
  public async getAlerts(forceRefresh: boolean = false): Promise<AdminAlert[]> {
    if (!this.isLoaded) {
      await this.init();
    }

    // 1. Fetch live applications to derive real-time status alerts
    const applications = await applicationStore.getApplications(forceRefresh);
    const dynamicCaseAlerts = this.deriveAlertsFromApplications(applications);

    // 2. Fetch server broadcast & citizen direct alerts using authenticated apiClient
    let serverAlerts: AdminAlert[] = [];
    try {
      const response = await apiClient.get('/mob/notifications');
      if (response && response.success && response.data) {
        const rawAlerts = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.notifications)
          ? response.data.notifications
          : [];
        if (Array.isArray(rawAlerts) && rawAlerts.length > 0) {
          serverAlerts = rawAlerts.map((a: any) => ({
            id: a.id || a.notification_id,
            type: a.type || 'ANNOUNCEMENT',
            priority: a.priority || 'MEDIUM',
            title: a.title,
            titleEn: a.title_en || a.titleEn || a.title,
            titleHi: a.title_hi || a.titleHi || a.title,
            message: a.message,
            messageEn: a.message_en || a.messageEn || a.message,
            messageHi: a.message_hi || a.messageHi || a.message,
            sender: a.sender || 'प्रशासक / Admin Desk',
            senderEn: a.sender_en || a.senderEn || 'Administration',
            senderHi: a.sender_hi || a.senderHi || 'प्रशासन',
            date: a.date || (a.created_at ? new Date(a.created_at).toLocaleDateString('mr-IN') : 'अलीकडेच'),
            dateEn: a.dateEn || 'Recent',
            timestamp: a.timestamp || '',
            category: a.category,
            badge: a.badge || 'प्रशासकीय संदेश',
            badgeEn: a.badge_en || a.badgeEn || 'Admin Notice',
            badgeHi: a.badge_hi || a.badgeHi || 'प्रशासनिक सूचना',
            isRead: this.readIds.has(a.id) || Boolean(a.is_read || a.isRead),
            actionType: a.action_type || a.actionType || 'ANNOUNCEMENT',
            applicationId: a.application_id || a.case_id,
            caseId: a.case_id,
            patientName: a.patient_name,
            requestedDocName: a.requested_doc_name,
            sevakName: a.sevak_name,
            sevakPhone: a.sevak_phone,
            hospitalName: a.hospital_name,
          }));
        }
      }
    } catch (err) {
      console.warn('[AlertsStore] Network error fetching server alerts, using fallback broadcasts:', err);
    }

    // 3. If no server alerts, keep empty array without mock data

    // 4. Combine and deduplicate alerts: Prioritize server alerts over synthetic fallback alerts
    const serverCaseTypeSet = new Set<string>();
    serverAlerts.forEach((sa) => {
      if (sa.caseId && sa.type) {
        serverCaseTypeSet.add(`${sa.caseId}_${sa.type}`);
      }
    });

    // Only keep synthetic dynamic case alerts if the server hasn't already provided an alert for that case & event
    const nonDuplicatedDynamicAlerts = dynamicCaseAlerts.filter((da) => {
      if (da.caseId && da.type && serverCaseTypeSet.has(`${da.caseId}_${da.type}`)) {
        return false;
      }
      return true;
    });

    const allAlerts = [...serverAlerts, ...nonDuplicatedDynamicAlerts];

    // Deduplicate by content signature as well as ID and filter out dismissed alerts
    const seenContentSignatures = new Set<string>();
    const map = new Map<string, AdminAlert>();

    allAlerts.forEach((a) => {
      if (this.dismissedIds.has(a.id)) return;

      const normTitle = (a.title || '').trim().replace(/\s+/g, ' ');
      const normMsgSnippet = (a.message || '').trim().slice(0, 40);
      const sigKey = `${a.caseId || 'gen'}_${a.type}_${normTitle}_${normMsgSnippet}`;

      if (seenContentSignatures.has(sigKey)) {
        return; // Skip duplicate notification
      }
      seenContentSignatures.add(sigKey);

      a.isRead = this.readIds.has(a.id) || a.isRead;
      map.set(a.id, a);
    });

    const list = Array.from(map.values());

    // Sort order: Action Required (DOC_REQUEST) first, then unread, then by priority
    const priorityWeight: Record<AlertPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      INFO: 1,
    };

    list.sort((a, b) => {
      if (a.type === 'DOC_REQUEST' && b.type !== 'DOC_REQUEST') return -1;
      if (b.type === 'DOC_REQUEST' && a.type !== 'DOC_REQUEST') return 1;
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    });

    // Fire Android system tray notification for unread alerts without repeating
    list.forEach((alert) => {
      if (!alert.isRead) {
        notificationService.showNewAlertNotification(
          alert.id,
          alert.title,
          alert.message,
          alert.caseId,
          alert.type
        );
      }
    });

    return list;
  }

  public async markAsRead(id: string): Promise<void> {
    if (!this.isLoaded) await this.init();
    if (!this.readIds.has(id)) {
      this.readIds.add(id);
      await this.persistReadIds();
      this.notify();
    }
  }

  public async markAsSeen(id: string): Promise<void> {
    await this.markAsRead(id);
  }

  public async markAllAsRead(): Promise<void> {
    const alerts = await this.getAlerts();
    alerts.forEach((a) => this.readIds.add(a.id));
    await this.persistReadIds();
    this.notify();
  }

  /**
   * Dismiss / Clear a single notification
   */
  public async clearAlert(id: string): Promise<void> {
    if (!this.isLoaded) await this.init();
    if (!this.dismissedIds.has(id)) {
      this.dismissedIds.add(id);
      await this.persistDismissedIds();
      this.notify();
    }
  }

  /**
   * Clear ONLY the seen / read notifications.
   * Unread notifications remain safe in the citizen inbox!
   */
  public async clearSeenAlerts(): Promise<number> {
    if (!this.isLoaded) await this.init();
    const alerts = await this.getAlerts();
    const seenAlerts = alerts.filter((a) => a.isRead);

    if (seenAlerts.length === 0) return 0;

    seenAlerts.forEach((a) => {
      this.dismissedIds.add(a.id);
    });

    await this.persistDismissedIds();
    this.notify();
    return seenAlerts.length;
  }

  public async getUnreadCount(): Promise<number> {
    const alerts = await this.getAlerts();
    return alerts.filter((a) => !a.isRead).length;
  }

  public async getSeenCount(): Promise<number> {
    const alerts = await this.getAlerts();
    return alerts.filter((a) => a.isRead).length;
  }
}

export const alertsStore = new AlertsStore();

