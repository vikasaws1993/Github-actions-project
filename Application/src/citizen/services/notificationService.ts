import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { ArogyaNotificationModule } = NativeModules;

export interface PushNotificationPayload {
  id?: number;
  title: string;
  message: string;
  tag?: string;
}

class NotificationService {
  private notifiedIds = new Set<string>();
  private activeUserId: string | null = null;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  public setActiveUser(userIdentifier: string | null) {
    if (this.activeUserId !== userIdentifier) {
      this.activeUserId = userIdentifier;
      this.notifiedIds.clear();
      this.isLoaded = false;
      this.loadPromise = null;
      this.init();
    }
  }

  public clearCache() {
    this.notifiedIds.clear();
    this.activeUserId = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  private getStorageKey(): string {
    if (!this.activeUserId) return '@arogyamitra_notified_alerts_guest';
    const cleanId = String(this.activeUserId).replace(/[^\w-]/g, '');
    return `@arogyamitra_notified_alerts_${cleanId}`;
  }

  private async init(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(this.getStorageKey());
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.notifiedIds = new Set(parsed);
          }
        }
      } catch (e) {
        console.warn('[NotificationService] Error loading notified alerts cache:', e);
      } finally {
        this.isLoaded = true;
      }
    })();
    return this.loadPromise;
  }

  private async persistNotifiedIds(): Promise<void> {
    try {
      const idsArray = Array.from(this.notifiedIds).slice(-500);
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(idsArray));
    } catch (e) {
      console.warn('[NotificationService] Error persisting notified alerts:', e);
    }
  }

  /**
   * Request Android 13+ (API 33+) POST_NOTIFICATIONS permission
   */
  public async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'आरोग्यमित्र सूचना परवानगी / ArogyaMitra Notifications',
            message:
              'प्रशासनाकडून अर्जाचे अपडेट्स आणि महत्त्वाच्या आरोग्य सूचना मिळवण्यासाठी परवानगी द्या.\nAllow notifications to receive real-time admin updates and document requests.',
            buttonNeutral: 'नंतर विचारा / Later',
            buttonNegative: 'नाकारू नका / Cancel',
            buttonPositive: 'परवानगी द्या / Allow',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }

  /**
   * Display a high-priority system tray notification in Android status bar
   */
  public async showLocalNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[NotificationService] Non-Android notification mock:', payload);
      return true;
    }

    try {
      if (ArogyaNotificationModule && ArogyaNotificationModule.showNotification) {
        const notificationId = payload.id ?? Math.floor(Math.random() * 1000000);
        await ArogyaNotificationModule.showNotification(
          payload.title,
          payload.message,
          notificationId,
          payload.tag || 'arogya_alert',
        );
        return true;
      } else {
        console.warn('ArogyaNotificationModule is not available in NativeModules');
        return false;
      }
    } catch (error) {
      console.error('[NotificationService] Failed to show system tray notification:', error);
      return false;
    }
  }

  /**
   * Show notification only once per alert ID or distinct event so citizen is not spammed with duplicate notifications
   */
  public async showNewAlertNotification(
    alertId: string,
    title: string,
    message: string,
    caseId?: string,
    type?: string
  ) {
    if (!this.isLoaded) {
      await this.init();
    }

    // Normalized signature to catch identical notifications even if IDs differ
    const normTitle = (title || '').trim().replace(/\s+/g, ' ');
    const normMsgSnippet = (message || '').trim().slice(0, 40);
    const dedupeSignature = `sig_${caseId || 'gen'}_${type || 'alert'}_${normTitle}_${normMsgSnippet}`;

    if (this.notifiedIds.has(alertId) || this.notifiedIds.has(dedupeSignature)) {
      return;
    }
    this.notifiedIds.add(alertId);
    this.notifiedIds.add(dedupeSignature);
    await this.persistNotifiedIds();

    // Generate stable 32-bit positive integer hash for Android notification ID based on dedupeSignature
    let hash = 0;
    for (let i = 0; i < dedupeSignature.length; i++) {
      hash = (hash << 5) - hash + dedupeSignature.charCodeAt(i);
      hash |= 0;
    }
    const safeId = Math.abs(hash) % 1000000;

    await this.showLocalNotification({
      id: safeId,
      title,
      message,
      tag: dedupeSignature,
    });
  }
}

export const notificationService = new NotificationService();
