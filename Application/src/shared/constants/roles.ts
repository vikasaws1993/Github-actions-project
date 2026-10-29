export enum UserRole {
  CITIZEN = 'CITIZEN',
  AROGYA_SEVAK = 'AROGYA_SEVAK',
}

export const ROLE_METADATA = {
  [UserRole.CITIZEN]: {
    id: UserRole.CITIZEN,
    title: 'Citizen',
    titleHindi: 'नागरिक',
    description: 'Access personal health records, book appointments, track health schemes, and emergency services.',
    badgeColor: '#0284C7',
    primaryColor: '#0284C7',
    icon: 'heart-outline',
  },
  [UserRole.AROGYA_SEVAK]: {
    id: UserRole.AROGYA_SEVAK,
    title: 'Arogya Sevak',
    titleHindi: 'आरोग्य सेवक',
    description: 'Manage beneficiary surveys, field visits, immunization records, medicine stocks, and offline sync.',
    badgeColor: '#059669',
    primaryColor: '#059669',
    icon: 'medical-outline',
  },
} as const;
