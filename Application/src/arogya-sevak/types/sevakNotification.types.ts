export type SevakNotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO' | 'LOW';

export type SevakNotificationType =
  | 'CUSTOM'
  | 'ANNOUNCEMENT'
  | 'DUTY_UPDATE'
  | 'URGENT_CASE'
  | 'HOSPITAL_ALERT'
  | 'DOC_REQUEST'
  | 'CAMP_SCHEDULE'
  | 'TRANSFER'
  | 'SCHEME_UPDATE'
  | 'GENERAL';

export interface SevakNotification {
  id: string;
  recipient_type?: string;
  recipient_id?: string | null;
  recipient_user_id?: string | null;
  type: SevakNotificationType | string;
  priority: SevakNotificationPriority;
  title: string;
  title_en?: string;
  title_mr?: string;
  title_hi?: string;
  message: string;
  message_en?: string;
  message_mr?: string;
  message_hi?: string;
  sender?: string;
  sender_en?: string;
  sender_mr?: string;
  sender_hi?: string;
  sevak_name?: string;
  sevak_phone?: string;
  hospital_name?: string;
  case_id?: string | null;
  application_id?: string | null;
  requested_doc_name?: string | null;
  requested_doc_type?: string | null;
  revert_reason?: string | null;
  deadline_days?: number | null;
  scheme_id?: string | null;
  scheme_name?: string | null;
  approved_amount?: number | null;
  badge?: string | null;
  badge_en?: string | null;
  badge_hi?: string | null;
  is_broadcast?: boolean;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface SevakNotificationFilter {
  tab: 'ALL' | 'UNREAD' | 'HIGH_PRIORITY' | 'ADMIN_ALERTS' | 'DUTY_CAMP';
  searchQuery?: string;
}

export interface SevakNotificationStats {
  total: number;
  unreadCount: number;
  criticalCount: number;
}
