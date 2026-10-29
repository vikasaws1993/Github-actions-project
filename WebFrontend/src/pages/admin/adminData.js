// Centralized State Store for ArogyaMitra Admin Panel
// Default clean structure without hardcoded static data; dynamically loaded from APIs

export const initialAdminData = {
  operator: {
    name: 'Admin Officer',
    role: 'Administrator',
    initials: 'AO',
    email: '',
    phone: '',
    department: 'Health Administration',
    avatar: null
  },

  mlaPhoto: '/ravindra_chavan.png',

  currentDate: new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }),

  metrics: {
    totalApplications: 0,
    newCasesToday: 0,
    pendingReview: 0,
    activeCases: 0,
    docsRequired: 0,
    closedThisMonth: 0,
    ipdCases: 0,
    opdCases: 0,
    queueTotal: 0,
    urgentFollowUps: 0
  },

  weeklyTrend: [],

  pendingFollowUps: [],
  cases: [],
  hospitals: [],
  arogyaSevaks: [],
  users: [],
  schemes: [],
  escalationRequests: []
};

export default initialAdminData;