import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Clock, 
  Ticket, 
  Users, 
  ChevronRight, 
  ArrowRight, 
  AlertCircle, 
  FileText, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertTriangle, 
  Stethoscope, 
  Phone, 
  X, 
  RefreshCw,
  Upload,
  Plus,
  LogOut,
  Activity,
  ShieldCheck,
  Bell,
  Eye
} from 'lucide-react';
import { LanguageSelector } from '@/components/common/LanguageSelector/LanguageSelector';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import patientService, { getLocalizedPriorityNote } from '@/services/patientService';
import dailyUpdateService from '@/services/dailyUpdateService';
import hospitalFacilityService from '@/services/hospitalFacilityService';
import sevakNotificationService from '@/services/sevakNotificationService';
import doctorService from '@/services/doctorService';
import opdService from '@/services/opdService';
import api from '@/services/api';
import UploadDocumentModal from '@/components/common/UploadDocumentModal/UploadDocumentModal';
import './Dashboard.css';

const getCachedFacilityBeds = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('arogya_facilities_draft_') || key.includes('facilities_draft'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const beds = parsed.beds || parsed.bedAvailability;
            const resources = parsed.resources || parsed.criticalResources;
            const totalBeds = beds?.totalBeds !== undefined && beds?.totalBeds !== '' ? Number(beds.totalBeds) : null;
            const totalIcuBeds = beds?.totalIcuBeds !== undefined && beds?.totalIcuBeds !== '' ? Number(beds.totalIcuBeds) : null;
            const totalEmergencyBeds = beds?.totalEmergencyBeds !== undefined && beds?.totalEmergencyBeds !== '' ? Number(beds.totalEmergencyBeds) : null;
            const totalVentilators = (resources?.ventilator?.total !== undefined && resources?.ventilator?.total !== '')
              ? Number(resources.ventilator.total)
              : ((resources?.ventilator?.available !== undefined && resources?.ventilator?.available !== '') ? Number(resources.ventilator.available) : null);

            if (totalBeds || totalIcuBeds || totalVentilators) {
              return {
                beds,
                resources,
                totalBeds: totalBeds || 0,
                totalIcuBeds: totalIcuBeds || 0,
                totalEmergencyBeds: totalEmergencyBeds || 0,
                totalVentilators: totalVentilators || 0,
              };
            }
          } catch (_) {}
        }
      }
    }
  } catch (e) {}
  return null;
};

const isReportFromToday = (r) => {
  if (!r) return false;
  if (r.isToday === true) return true;
  if (r.createdAt) {
    const d = new Date(r.createdAt);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }
  if (r.reportDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    return String(r.reportDate).startsWith(todayStr);
  }
  if (r.date) {
    const now = new Date();
    const todayNum = now.getDate();
    const monthShort = now.toLocaleString('en-GB', { month: 'short' });
    const yearNum = now.getFullYear();
    if (r.date.includes(monthShort) && r.date.includes(String(yearNum))) {
      const dayPrefix = todayNum < 10 ? `0${todayNum}` : `${todayNum}`;
      if (r.date.includes(dayPrefix) || r.date.includes(String(todayNum))) {
        return true;
      }
    }
  }
  return false;
};

// Initial Doctors Roster Data (Loaded dynamically from API)
const INITIAL_DOCTORS = [];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const cachedUpdates = dailyUpdateService.getCachedDailyUpdates();
  const cachedReports = Array.isArray(cachedUpdates?.reports) ? cachedUpdates.reports : [];
  const cachedStats = cachedUpdates?.stats || null;
  const cachedSurveyBeds = getCachedFacilityBeds();
  const initTotalGeneralBeds = cachedSurveyBeds?.totalBeds !== undefined && cachedSurveyBeds.totalBeds !== '' ? Number(cachedSurveyBeds.totalBeds) : (cachedStats?.generalTotal ?? 0);
  const initTotalIcuBeds = cachedSurveyBeds?.totalIcuBeds !== undefined && cachedSurveyBeds.totalIcuBeds !== '' ? Number(cachedSurveyBeds.totalIcuBeds) : (cachedStats?.icuTotal ?? 0);
  const initTotalEmergencyBeds = cachedSurveyBeds?.totalEmergencyBeds !== undefined && cachedSurveyBeds.totalEmergencyBeds !== '' ? Number(cachedSurveyBeds.totalEmergencyBeds) : 0;
  const initTotalVentilators = cachedSurveyBeds?.totalVentilators !== undefined && cachedSurveyBeds.totalVentilators !== '' ? Number(cachedSurveyBeds.totalVentilators) : (cachedStats?.ventilatorsTotal ?? 0);
  const cachedLatestReport = cachedUpdates?.latestReport || (cachedReports[0] || null);
  const initIcuTotal = initTotalIcuBeds || cachedStats?.icuTotal || cachedLatestReport?.icuTotal || 0;
  const initGeneralTotal = initTotalGeneralBeds || cachedStats?.generalTotal || cachedLatestReport?.generalTotal || 0;
  const initVentilatorsTotal = initTotalVentilators || cachedStats?.ventilatorsTotal || cachedLatestReport?.ventilatorsTotal || 0;

  // State Management: Hospital Facilities section bed counts
  const [hospitalStats, setHospitalStats] = useState(() => ({
    totalBeds: initTotalGeneralBeds,
    totalIcuBeds: initTotalIcuBeds,
    totalEmergencyBeds: initTotalEmergencyBeds,
    totalVentilators: initTotalVentilators,
    departments: 0,
  }));
  const [assignedHospital, setAssignedHospital] = useState(() => {
    if (user?.hospital) {
      return {
        name: typeof user.hospital === 'string' ? user.hospital : (user.hospital.name || user.hospital.hospital_name || 'Assigned Hospital'),
        id: user.hospitalId || (typeof user.hospital === 'object' ? user.hospital.id : user.hospital),
        address: user.hospitalAddress || (typeof user.hospital === 'object' ? user.hospital.address : '') || '',
        code: user.hospitalCode || (typeof user.hospital === 'object' ? user.hospital.code : '') || '',
        contact: user.hospitalContact || (typeof user.hospital === 'object' ? user.hospital.contact : '') || '',
      };
    }
    try {
      const cached = localStorage.getItem('ward_arogya_assigned_hospital');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name && parsed?.id) return parsed;
      }
    } catch (e) {}
    return null;
  });
  const [sevakDetails, setSevakDetails] = useState(() => ({
    fullName: user?.name || user?.full_name || 'Arogya Sevak',
    displayName: (user?.name || user?.full_name || 'Arogya Sevak').split(' ')[0],
    employeeCode: user?.empId || user?.employee_code || user?.id || '',
    id: user?.sevakId || user?.id || '',
  }));
  const [dailyReports, setDailyReports] = useState(() => cachedReports);
  const [dailyUpdateData, setDailyUpdateData] = useState(() => ({
    admissionsMadeToday: cachedStats?.admissionsMadeToday ?? cachedLatestReport?.myAdmissions ?? 0,
    doctorsOnDuty: cachedStats?.doctorsOnDuty ?? cachedLatestReport?.doctorsOnDuty ?? 0,
    icuAvailable: cachedStats?.icuAvailable ?? cachedLatestReport?.icuAvailable ?? 0,
    icuTotal: initIcuTotal,
    generalAvailable: cachedStats?.generalAvailable ?? cachedLatestReport?.generalAvailable ?? 0,
    generalTotal: initGeneralTotal,
    ventilators: cachedStats?.ventilators ?? cachedStats?.ventilatorsAvailable ?? cachedLatestReport?.ventilators ?? 0,
    ventilatorsTotal: initVentilatorsTotal,
    oxygenBeds: cachedStats?.oxygenBeds ?? cachedLatestReport?.oxygenBeds ?? 0,
    dialysisUnits: cachedStats?.dialysisUnits ?? cachedLatestReport?.dialysisUnits ?? 0,
    operationTheatres: cachedStats?.operationTheatres ?? cachedLatestReport?.operationTheatres ?? 0,
    reportsCount: cachedReports.length,
    latestReport: cachedLatestReport,
    reports: cachedReports,
  }));
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState(() => doctorService.getCachedDoctors() || []);
  const [opdStats, setOpdStats] = useState(() => opdService.getCachedOpdStats() || {
    todayCount: 0,
    followUpRequiredCount: 0,
    followUpDoneCount: 0,
    totalVisits: 0,
  });

  // Modal State
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [docModalCase, setDocModalCase] = useState(null);
  const [uploadModalData, setUploadModalData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [urgentNotice, setUrgentNotice] = useState(null);

  // Load dynamic data from services in parallel
  const loadDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dailyRes, hospRes, patientsRes, facilityRes, notifRes, docList, opdRes] = await Promise.allSettled([
        dailyUpdateService.getDailyUpdates(),
        api.get('/arogya-sevaks/assigned-hospitals'),
        patientService.getPatients(),
        hospitalFacilityService.getHospitalFacilities(),
        sevakNotificationService.fetchNotifications({ limit: 10, offset: 0, is_read: false }),
        doctorService.getDoctors(),
        opdService.getOpdStats()
      ]);

      if (opdRes.status === 'fulfilled' && opdRes.value) {
        setOpdStats({
          todayCount: opdRes.value.todayCount || 0,
          followUpRequiredCount: opdRes.value.followUpRequiredCount || 0,
          followUpDoneCount: opdRes.value.followUpDoneCount || 0,
          totalVisits: opdRes.value.totalVisits || 0,
        });
      }

      if (patientsRes.status === 'fulfilled' && patientsRes.value) {
        setPatients(patientsRes.value || []);
      }

      if (docList.status === 'fulfilled') {
        const list = Array.isArray(docList.value)
          ? docList.value
          : (Array.isArray(docList.value?.doctors) ? docList.value.doctors : []);
        if (list.length > 0) {
          setDoctors(list);
        }
      }

      if (notifRes.status === 'fulfilled' && notifRes.value) {
        let nList = [];
        const nVal = notifRes.value;
        if (Array.isArray(nVal)) nList = nVal;
        else if (Array.isArray(nVal.notifications)) nList = nVal.notifications;
        else if (Array.isArray(nVal.data?.notifications)) nList = nVal.data.notifications;
        else if (Array.isArray(nVal.data)) nList = nVal.data;

        const unread = nList.filter((n) => !n.is_read && !n.isRead);
        setUnreadNotifCount(unread.length);
        const topUrgent = unread.find((n) => String(n.priority).toUpperCase() === 'CRITICAL' || String(n.priority).toUpperCase() === 'HIGH') || unread[0] || null;
        setUrgentNotice(topUrgent);
      }

      if (hospRes.status === 'fulfilled' && hospRes.value?.data) {
        const activeList = hospRes.value.data.active_hospitals;
        const sevakData = hospRes.value.data.sevak;

        if (sevakData) {
          setSevakDetails({
            fullName: sevakData.full_name || user?.name || user?.full_name || 'Arogya Sevak',
            displayName: (sevakData.full_name || user?.name || user?.full_name || 'Arogya Sevak').split(' ')[0],
            employeeCode: sevakData.employee_code || user?.empId || user?.employee_code || user?.id || '',
            id: sevakData.id || user?.id || '',
          });
        }

        if (Array.isArray(activeList) && activeList.length > 0) {
          const firstHosp = activeList[0];
          const hospObj = {
            name: firstHosp.hospital_name || firstHosp.name || 'Assigned Hospital',
            address: firstHosp.hospital_address || firstHosp.address || '',
            code: firstHosp.hospital_code || firstHosp.code || '',
            contact: firstHosp.hospital_contact || firstHosp.contact || '',
            id: firstHosp.hospital_id || firstHosp.id,
          };
          setAssignedHospital(hospObj);
          try {
            localStorage.setItem('ward_arogya_assigned_hospital', JSON.stringify(hospObj));
          } catch (e) {}
        } else if (dailyRes.status === 'fulfilled' && dailyRes.value?.data?.hospitalName) {
          const dData = dailyRes.value.data;
          setAssignedHospital((prev) => prev || {
            name: dData.hospitalName || 'Assigned Hospital',
            id: dData.hospitalId || '',
            address: '',
            code: '',
            contact: '',
          });
        }
      } else if (hospRes.status === 'rejected') {
        if (dailyRes.status === 'fulfilled' && dailyRes.value?.data?.hospitalName) {
          const dData = dailyRes.value.data;
          setAssignedHospital((prev) => prev || {
            name: dData.hospitalName || 'Assigned Hospital',
            id: dData.hospitalId || '',
            address: '',
            code: '',
            contact: '',
          });
        }
      }

      if (facilityRes.status === 'fulfilled' && facilityRes.value?.data) {
        const fData = facilityRes.value.data;
        const fBeds = fData.bedAvailability || {};
        const fResources = fData.criticalResources || {};
        const totalBeds = fBeds.totalBeds !== '' && fBeds.totalBeds !== undefined ? Number(fBeds.totalBeds) : null;
        const totalIcuBeds = fBeds.totalIcuBeds !== '' && fBeds.totalIcuBeds !== undefined ? Number(fBeds.totalIcuBeds) : null;
        const totalEmergencyBeds = fBeds.totalEmergencyBeds !== '' && fBeds.totalEmergencyBeds !== undefined ? Number(fBeds.totalEmergencyBeds) : null;
        const totalVentilators = (fResources.ventilator?.total !== '' && fResources.ventilator?.total !== undefined)
          ? Number(fResources.ventilator?.total)
          : ((fResources.ventilator?.available !== '' && fResources.ventilator?.available !== undefined)
              ? Number(fResources.ventilator?.available)
              : null);

        setHospitalStats((prev) => ({
          ...prev,
          totalBeds: totalBeds !== null && !isNaN(totalBeds) && totalBeds > 0 ? totalBeds : prev.totalBeds,
          totalIcuBeds: totalIcuBeds !== null && !isNaN(totalIcuBeds) && totalIcuBeds > 0 ? totalIcuBeds : prev.totalIcuBeds,
          totalEmergencyBeds: totalEmergencyBeds !== null && !isNaN(totalEmergencyBeds) && totalEmergencyBeds > 0 ? totalEmergencyBeds : prev.totalEmergencyBeds,
          totalVentilators: totalVentilators !== null && !isNaN(totalVentilators) && totalVentilators > 0 ? totalVentilators : prev.totalVentilators,
        }));
      }

      if (dailyRes.status === 'fulfilled' && dailyRes.value?.data) {
        const dData = dailyRes.value.data;
        const stats = dData.stats || {};
        const latestRep = dData.latestReport || (Array.isArray(dData.reports) && dData.reports.length > 0 ? dData.reports[0] : null);

        setDailyUpdateData({
          admissionsMadeToday: stats.admissionsMadeToday ?? latestRep?.myAdmissions ?? 0,
          doctorsOnDuty: stats.doctorsOnDuty ?? latestRep?.doctorsOnDuty ?? 0,
          icuAvailable: stats.icuAvailable ?? latestRep?.icuAvailable ?? 0,
          icuTotal: stats.icuTotal ?? latestRep?.icuTotal ?? 0,
          generalAvailable: stats.generalAvailable ?? latestRep?.generalAvailable ?? 0,
          generalTotal: stats.generalTotal ?? latestRep?.generalTotal ?? 0,
          ventilators: stats.ventilatorsAvailable ?? latestRep?.ventilators ?? latestRep?.ventilatorsAvailable ?? 0,
          ventilatorsTotal: stats.ventilatorsTotal ?? latestRep?.ventilatorsTotal ?? 0,
          oxygenBeds: stats.oxygenBeds ?? latestRep?.oxygenBeds ?? 0,
          dialysisUnits: stats.dialysisUnits ?? latestRep?.dialysisUnits ?? 0,
          operationTheatres: stats.operationTheatres ?? latestRep?.operationTheatres ?? 0,
          reportsCount: Array.isArray(dData.reports) ? dData.reports.length : 0,
          latestReport: latestRep,
          reports: Array.isArray(dData.reports) ? dData.reports : [],
        });

        if (Array.isArray(dData.reports)) {
          setDailyReports(dData.reports);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('arogyamitra:refresh', handleRefresh);
    return () => window.removeEventListener('arogyamitra:refresh', handleRefresh);
  }, [loadDashboardData]);

  useEffect(() => {
    if (user?.hospital) {
      const hospName = typeof user.hospital === 'string' ? user.hospital : (user.hospital.name || user.hospital.hospital_name);
      if (hospName) {
        setAssignedHospital((prev) => {
          if (!prev || (prev.name !== hospName && (!prev.id || prev.name === 'Assigned Hospital' || prev.name === 'Krutikalpa hospital'))) {
            return {
              name: hospName,
              id: user.hospitalId || (typeof user.hospital === 'object' ? user.hospital.id : hospName),
              address: user.hospitalAddress || (typeof user.hospital === 'object' ? user.hospital.address : '') || '',
              code: user.hospitalCode || (typeof user.hospital === 'object' ? user.hospital.code : '') || '',
              contact: user.hospitalContact || (typeof user.hospital === 'object' ? user.hospital.contact : '') || '',
            };
          }
          return prev;
        });
      }
    }
  }, [user]);

  // Derived counts for Doctors
  const safeDoctorsList = Array.isArray(doctors) ? doctors : [];
  const totalDoctors = safeDoctorsList.length;
  const availableDoctors = safeDoctorsList.filter((d) => d && (d.status === 'available' || (d.availabilityStatus || '').toLowerCase() === 'available')).length;

  const opdDoctors = safeDoctorsList.filter((d) => {
    if (!d) return false;
    const type = String(d.doctorType || d.type || d.doctor_type || '').toUpperCase().trim();
    return type === 'OPD' || type === 'BOTH' || type.includes('OPD') || type.includes('BOTH') || (!type || type === 'ALL' || type === 'GENERAL' || type === 'ACTIVE');
  }).length;

  const ipdDoctors = safeDoctorsList.filter((d) => {
    if (!d) return false;
    const type = String(d.doctorType || d.type || d.doctor_type || '').toUpperCase().trim();
    return type === 'IPD' || type === 'BOTH' || type.includes('IPD') || type.includes('BOTH');
  }).length;

  // Derived shift status for TODAY only
  const todayDailyReports = dailyReports.filter(isReportFromToday);
  const morningReport = todayDailyReports.find(
    (r) => (r.shift || '').toLowerCase().includes('morning')
  );
  const eveningReport = todayDailyReports.find(
    (r) => (r.shift || '').toLowerCase().includes('night') || (r.shift || '').toLowerCase().includes('evening')
  );

  // Quick summary counts (100% dynamic from live patient records)
  const activePatientsCount = patients.filter((p) => p.category !== 'discharged').length;
  const priorityNotesCount = patients.filter((p) => p.priorityNote && p.priorityNote.text).length;
  const docsRequiredCount = patients.reduce((sum, p) => sum + (p.adminRequestedDocs?.length || 0), 0);

  // Toggle Doctor availability status in Roster modal
  const handleToggleDocStatus = async (docId) => {
    const targetDoc = doctors.find((d) => d.id === docId);
    if (!targetDoc) return;
    const isAvail = targetDoc.status === 'available' || (targetDoc.availabilityStatus || '').toLowerCase() === 'available';
    const nextStatus = isAvail ? 'In Surgery' : 'Available';

    const updated = doctors.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: nextStatus === 'Available' ? 'available' : 'in_surgery',
          availabilityStatus: nextStatus,
          statusLabel: nextStatus === 'Available' ? 'Available Now' : 'In Surgery / Busy',
        };
      }
      return d;
    });
    setDoctors(updated);

    try {
      await doctorService.setDoctorAvailability(docId, nextStatus);
    } catch (e) {
      console.warn('Doctor availability update API note:', e.message);
    }
  };

  const displayName = sevakDetails.displayName || (user?.name ? user.name.split(' ')[0] : 'Arogya');
  const fullName = sevakDetails.fullName || user?.name || user?.full_name || 'Arogya Sevak';
  const staffId = sevakDetails.employeeCode || user?.empId || user?.employee_code || user?.id || '—';

  // Hospital Capacity & Occupancy calculations
  const totalGeneralBeds = Number(hospitalStats.totalBeds) || 0;
  const totalIcuBeds = Number(hospitalStats.totalIcuBeds) || 0;
  const totalHospitalBeds = totalGeneralBeds + totalIcuBeds;
  const availGen = Number(dailyUpdateData.generalAvailable) || 0;
  const availIcu = Number(dailyUpdateData.icuAvailable) || 0;
  const totalAvailBeds = availGen + availIcu;
  const totalOccupiedBeds = Math.max(0, totalHospitalBeds - totalAvailBeds);
  const occupancyPercentage = totalHospitalBeds > 0 ? Math.min(100, Math.round((totalOccupiedBeds / totalHospitalBeds) * 100)) : 0;

  return (
    <div className="as-dashboard-wrapper">
      {/* =========================================================================
          URGENT ADMINISTRATIVE DIRECTIVE BANNER (If any critical notice exists)
          ========================================================================= */}
      {urgentNotice && (
        <div className="as-dash-urgent-banner" onClick={() => navigate('/arogyasevak/notifications')}>
          <div className="as-dub-left">
            <div className="as-dub-icon">
              <Bell size={17} />
            </div>
            <div className="as-dub-content">
              <div className="as-dub-header-line">
                <span className="as-dub-badge">{urgentNotice.badge || 'URGENT'}</span>
                <span className="as-dub-title">{urgentNotice.title_en || urgentNotice.title}</span>
              </div>
              <p className="as-dub-msg">{urgentNotice.message_en || urgentNotice.message}</p>
            </div>
          </div>
          <button type="button" className="as-dub-btn">
            <span>Read / View Details ›</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          2. DASHBOARD CARDS GRID (Hospital, Updates, OPD, Doctors)
          ========================================================================= */}
      <div className="as-cards-grid">
        {/* CARD 1: Assigned Hospital Details */}
        <div className="as-dash-card as-card-hospital">
          <div className="as-card-header">
            <div 
              className="as-card-title-group"
              style={{ cursor: assignedHospital?.id || assignedHospital?.name ? 'pointer' : 'default' }}
              onClick={() => {
                const hId = assignedHospital?.id || assignedHospital?.code || assignedHospital?.name;
                if (hId) {
                  navigate(`/arogyasevak/hospital/${encodeURIComponent(hId)}`);
                }
              }}
              title="Click to view full Hospital Details"
            >
              <div className="as-icon-badge as-badge-blue">
                <Building2 size={20} />
              </div>
              <div className="as-header-text">
                <div className="as-card-sub-row">
                  <span className="as-card-subtitle">{t('sevakDashboard.assignedHospital', 'Assigned Hospital')}</span>
                  {assignedHospital?.name ? (
                    <span className="as-hosp-status-pill">
                      <span className="as-live-dot-green" /> {t('sevakDashboard.activeEmpanelled', 'Active Empanelled')}
                    </span>
                  ) : (
                    <span className="as-hosp-status-pill" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                      <span className="as-live-dot-amber" style={{ background: '#d97706' }} /> {t('sevakDashboard.unassigned', 'Unassigned')}
                    </span>
                  )}
                </div>
                <h3 
                  className="as-card-title as-hover-underline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{assignedHospital?.name || t('sevakDashboard.noHospitalAssigned', 'No Hospital Assigned')}</span>
                  {assignedHospital?.name && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
                </h3>
                <p className="as-card-meta">
                  {assignedHospital?.address || t('sevakDashboard.noHospitalDesc', 'No hospital currently assigned by district health administration')}
                </p>

                {/* Hospital Code and Helpline contact row */}
                {assignedHospital && (
                  <div className="as-hosp-tags-row">
                    {assignedHospital.code && (
                      <span className="as-hosp-code-badge" title="Hospital Registration Code">
                        {assignedHospital.code}
                      </span>
                    )}
                    {assignedHospital.contact && (
                      <a
                        href={`tel:${assignedHospital.contact.replace(/\s+/g, '')}`}
                        className="as-hosp-contact-pill"
                        title="Hospital Emergency Contact / Helpline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={11} />
                        <span>{assignedHospital.contact}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {assignedHospital && (
              <div className="as-card-actions-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="as-card-badge-btn as-badge-btn-green"
                  onClick={() => {
                    const hId = assignedHospital?.id || assignedHospital?.code || assignedHospital?.name;
                    if (hId) {
                      navigate(`/arogyasevak/hospital/${encodeURIComponent(hId)}`);
                    }
                  }}
                  title="View Complete Hospital Profile & Doctors Roster"
                >
                  <Eye size={13} />
                  <span>Details</span>
                </button>
                <button 
                  type="button" 
                  className="as-card-badge-btn as-badge-btn-blue"
                  onClick={() => navigate('/arogyasevak/infrastructure-info')}
                  title="View Hospital Infrastructure Assessment Survey"
                >
                  <FileText size={13} />
                  <span>{t('sevakDashboard.survey', 'Survey')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Bed & Equipment Metrics */}
          {assignedHospital ? (() => {
            const genAvail = dailyUpdateData.generalAvailable ?? dailyUpdateData.latestReport?.generalAvailable ?? 0;
            const genTotal = (hospitalStats.totalBeds > 0 ? hospitalStats.totalBeds : null) || dailyUpdateData.generalTotal || dailyUpdateData.latestReport?.generalTotal || 0;
            
            const icuAvail = dailyUpdateData.icuAvailable ?? dailyUpdateData.latestReport?.icuAvailable ?? 0;
            const icuTot = (hospitalStats.totalIcuBeds > 0 ? hospitalStats.totalIcuBeds : null) || dailyUpdateData.icuTotal || dailyUpdateData.latestReport?.icuTotal || 0;
            
            const ventAvail = dailyUpdateData.ventilators ?? dailyUpdateData.latestReport?.ventilators ?? dailyUpdateData.latestReport?.ventilatorsAvailable ?? 0;
            const ventTot = (hospitalStats.totalVentilators > 0 ? hospitalStats.totalVentilators : null) || dailyUpdateData.ventilatorsTotal || dailyUpdateData.latestReport?.ventilatorsTotal || (hospitalStats.totalEmergencyBeds > 0 ? hospitalStats.totalEmergencyBeds : null) || (ventAvail > 0 ? ventAvail : 0);

            return (
              <div className="as-metrics-row as-metrics-3col">
                <div className="as-metric-col">
                  <div className="as-metric-val">
                    <span style={{ color: (genAvail > 0) ? '#16a34a' : '#64748b' }}>
                      {genAvail}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
                      {genTotal > 0 ? ` / ${genTotal}` : ' / 0'}
                    </span>
                  </div>
                  <div className="as-metric-lbl">{t('sevakDashboard.generalBedsAvailable', 'General Beds Available')}</div>
                </div>
                <div className="as-metric-col">
                  <div className="as-metric-val">
                    <span style={{ color: (icuAvail > 0) ? '#dc2626' : '#64748b' }}>
                      {icuAvail}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
                      {icuTot > 0 ? ` / ${icuTot}` : ' / 0'}
                    </span>
                  </div>
                  <div className="as-metric-lbl">{t('sevakDashboard.icuBedsAvailable', 'ICU Beds Available')}</div>
                </div>
                <div className="as-metric-col">
                  <div className="as-metric-val">
                    <span style={{ color: (ventAvail > 0) ? '#ea580c' : '#64748b' }}>
                      {ventAvail}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
                      {ventTot > 0 ? ` / ${ventTot}` : ' / 0'}
                    </span>
                  </div>
                  <div className="as-metric-lbl">{t('sevakDashboard.ventilatorsAvailable', 'Ventilators Available')}</div>
                </div>
              </div>
            );
          })() : (
            <div className="as-metrics-row as-metrics-3col as-metrics-unassigned">
              <div className="as-metric-col">
                <div className="as-metric-val">
                  <span style={{ color: '#94a3b8' }}>—</span>
                </div>
                <div className="as-metric-lbl">{t('sevakDashboard.generalBedsAvailable', 'General Beds')}</div>
              </div>
              <div className="as-metric-col">
                <div className="as-metric-val">
                  <span style={{ color: '#94a3b8' }}>—</span>
                </div>
                <div className="as-metric-lbl">{t('sevakDashboard.icuBedsAvailable', 'ICU Beds')}</div>
              </div>
              <div className="as-metric-col">
                <div className="as-metric-val">
                  <span style={{ color: '#94a3b8' }}>—</span>
                </div>
                <div className="as-metric-lbl">{t('sevakDashboard.ventilatorsAvailable', 'Ventilators')}</div>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Daily Updates & Alerts */}
        <div 
          className="as-dash-card as-card-updates as-card-clickable"
          onClick={() => navigate(ROUTES.UPDATES || '/arogyasevak/updates')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate(ROUTES.UPDATES || '/arogyasevak/updates');
            }
          }}
          title="Go to Daily Updates & Alerts"
        >
          <div className="as-card-header">
            <div className="as-card-title-group">
              <div className="as-icon-badge as-badge-orange">
                <Clock size={20} />
              </div>
              <div className="as-header-text">
                <h3 className="as-card-title">{t('sevakDashboard.dailyUpdatesAlerts', 'Daily Updates & Alerts')}</h3>
                <span className="as-card-subtitle">{t('sevakDashboard.twoDailyUpdates', '2x Daily Updates (Morning & Evening)')}</span>
              </div>
            </div>

            <button 
              type="button" 
              className="as-action-link-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTES.UPDATES || '/arogyasevak/updates');
              }}
              title="Submit or view daily shift updates"
            >
              <span>{t('sevakDashboard.updateBtn', 'Update')}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Equipment Counts placed in-between header and shift status */}
          <div className="as-metrics-row as-metrics-3col">
            <div className="as-metric-col">
              <div className="as-metric-val" style={{ color: '#d97706' }}>{dailyUpdateData.oxygenBeds}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.oxygenBeds', 'Oxygen Beds')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val" style={{ color: '#9333ea' }}>{dailyUpdateData.dialysisUnits}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.dialysisFree', 'Dialysis Free')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val" style={{ color: '#16a34a' }}>{dailyUpdateData.operationTheatres}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.otAvailable', 'OT Available')}</div>
            </div>
          </div>

          <div className="as-shift-cards-row">
            <div className="as-shift-box">
              <div className="as-shift-box-header">
                <Sun size={17} className="as-shift-icon-sun" />
                <span className="as-shift-name">{t('sevakDashboard.morningShift', 'Morning Shift')}</span>
              </div>
              <div className={`as-shift-status-pill ${morningReport ? 'as-status-completed' : 'as-status-pending'}`}>
                {morningReport ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                <span>{morningReport ? (morningReport.date && morningReport.date.includes(',') ? morningReport.date.split(',')[1]?.trim() : t('sevakDashboard.completed', 'Completed')) : t('sevakDashboard.pending', 'Pending')}</span>
              </div>
            </div>

            <div className="as-shift-box">
              <div className="as-shift-box-header">
                <Moon size={17} className="as-shift-icon-moon" />
                <span className="as-shift-name">{t('sevakDashboard.eveningShift', 'Evening Shift')}</span>
              </div>
              <div className={`as-shift-status-pill ${eveningReport ? 'as-status-completed' : 'as-status-pending'}`}>
                {eveningReport ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                <span>{eveningReport ? (eveningReport.date && eveningReport.date.includes(',') ? eveningReport.date.split(',')[1]?.trim() : t('sevakDashboard.completed', 'Completed')) : t('sevakDashboard.pending', 'Pending')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: OPD Outpatient Desk */}
        <div 
          className="as-dash-card as-card-opd as-card-clickable"
          onClick={() => navigate(ROUTES.OPD_LOGS || '/arogyasevak/opd-logs')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate(ROUTES.OPD_LOGS || '/arogyasevak/opd-logs');
            }
          }}
          title="Go to OPD Consultation Logs"
        >
          <div className="as-card-header">
            <div className="as-card-title-group">
              <div className="as-icon-badge as-badge-cyan as-relative">
                <Ticket size={20} />
                {opdStats.followUpRequiredCount > 0 && (
                  <span className="as-floating-dot-badge">{opdStats.followUpRequiredCount}</span>
                )}
              </div>
              <div className="as-header-text">
                <h3 className="as-card-title">{t('sevakDashboard.opdDesk', 'OPD Outpatient Desk')}</h3>
                <span className="as-card-subtitle">
                  {opdStats.todayCount} {t('common.today', 'Today')} • {opdStats.followUpRequiredCount} {t('sevakDashboard.followUpDue', 'Follow-up Due')}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="as-action-link-btn as-btn-sky"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTES.OPD_LOGS || '/arogyasevak/opd-logs');
              }}
              title="Open OPD consultation logs and registrations"
            >
              <span>{t('sevakDashboard.openOpd', 'Open OPD')}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="as-metrics-row as-metrics-4col">
            <div className="as-metric-col">
              <div className="as-metric-val">{opdStats.todayCount}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.todaysOpd', "Today's OPD")}</div>
            </div>
            <div className="as-metric-col">
              <div className={`as-metric-val ${opdStats.followUpRequiredCount > 0 ? 'as-metric-warning' : ''}`}>
                {opdStats.followUpRequiredCount}
              </div>
              <div className="as-metric-lbl">{t('sevakDashboard.followUpDue', 'Follow-up Due')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val">{opdStats.followUpDoneCount}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.resolved', 'Resolved')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val">{opdStats.totalVisits}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.totalLogs', 'Total Logs')}</div>
            </div>
          </div>
        </div>

        {/* CARD 4: Doctors & Availability */}
        <div 
          className="as-dash-card as-card-doctors as-card-clickable"
          onClick={() => navigate(ROUTES.DOCTORS || '/arogyasevak/doctors')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate(ROUTES.DOCTORS || '/arogyasevak/doctors');
            }
          }}
          title="Go to Doctors Management"
        >
          <div className="as-card-header">
            <div className="as-card-title-group">
              <div className="as-icon-badge as-badge-green">
                <Users size={20} />
              </div>
              <div className="as-header-text">
                <h3 className="as-card-title">{t('sevakDashboard.doctorsAvailability', 'Doctors & Availability')}</h3>
                <span className="as-card-subtitle">
                  {totalDoctors} {t('sevakDashboard.active', 'Active')} • {availableDoctors} {t('sevakDashboard.availableNow', 'Available Now')}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="as-action-link-btn as-btn-emerald"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTES.DOCTORS || '/arogyasevak/doctors');
              }}
              title="View and manage active doctor duty roster"
            >
              <span>{t('sevakDashboard.manageRoster', 'Manage Roster')}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="as-metrics-row as-metrics-4col">
            <div className="as-metric-col">
              <div className="as-metric-val">{totalDoctors}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.totalDoctors', 'Total Doctors')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val as-metric-success">
                <span className="as-pulse-dot"></span>
                {availableDoctors}
              </div>
              <div className="as-metric-lbl">{t('sevakDashboard.availableNow', 'Available Now')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val">{opdDoctors}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.opdDoctors', 'OPD Doctors')}</div>
            </div>
            <div className="as-metric-col">
              <div className="as-metric-val">{ipdDoctors}</div>
              <div className="as-metric-lbl">{t('sevakDashboard.ipdDoctors', 'IPD Doctors')}</div>
            </div>
          </div>
        </div>
      </div>


      {/* =========================================================================
          4. PRIORITY ACTION CASES SECTION
          ========================================================================= */}
      <div className="as-priority-section">
        <div className="as-priority-header">
          <div className="as-priority-title-wrap">
            <span className="as-priority-red-dot">!</span>
            <h2 className="as-priority-title">{t('sevakDashboard.priorityActionCases', 'Priority Action Cases')}</h2>
          </div>
          <button 
            type="button" 
            className="as-view-all-link"
            onClick={() => navigate('/arogyasevak/patients')}
          >
            <span>{t('sevakDashboard.viewAll', 'View All')} ({patients.length})</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="as-priority-cases-grid">
          {patients.length === 0 ? (
            <div className="as-no-cases-card" style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <CheckCircle2 size={32} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{t('sevakDashboard.noPriorityCases', 'No active priority cases assigned')}</p>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{t('sevakDashboard.noPriorityCasesSub', 'Assigned citizen cases will appear here for monitoring and action.')}</span>
            </div>
          ) : (
            patients.slice(0, 4).map((p, idx) => {
              const isUrgent = p.priority === 'CRITICAL' || p.priority === 'HIGH' || p.isUrgent;
              const cardClass = isUrgent ? (idx % 2 === 0 ? 'as-case-critical' : 'as-case-amber') : 'as-case-normal';
              const pId = p.id || p.caseId || p.applicationNumber;
              const pendingDocsCount = Array.isArray(p.pendingDocuments) ? p.pendingDocuments.length : (Array.isArray(p.documents) ? p.documents.filter(d => !d.verified && !d.isVerified).length : 0);

              return (
                <div key={pId || idx} className={`as-case-card ${cardClass}`}>
                  <div className="as-case-top-row">
                    <h3 
                      className="as-patient-title" 
                      onClick={() => navigate(`/arogyasevak/patient/${pId}`)}
                      title="Click to view patient file"
                    >
                      {p.name || p.patientName || 'Assigned Patient'}
                    </h3>
                    <div className="as-case-badges">
                      <span className="as-badge-scheme">{p.scheme || p.assignedScheme?.scheme_code || 'MJPJAY'}</span>
                      <span className="as-badge-status-treatment">{p.status || t('sevakDashboard.active', 'Active')}</span>
                    </div>
                  </div>

                  <p className="as-case-demographics">
                    {[p.age ? `${p.age} ${t('patients.yrs', 'yrs')}` : null, p.gender, p.ward || p.diagnosis || 'Hospital Care'].filter(Boolean).join(' • ')}
                  </p>

                  {p.priorityNote ? (
                    (() => {
                      const localizedNote = getLocalizedPriorityNote(p.priorityNote, language, t);
                      if (!localizedNote || !localizedNote.text) return null;
                      return (
                        <div className={`as-urgent-alert-box ${isUrgent ? 'as-alert-urgent' : 'as-alert-amber'}`}>
                          <div className="as-alert-icon-wrap as-icon-urgent">
                            <AlertCircle size={17} />
                          </div>
                          <p className="as-alert-text">
                            <strong>{t('patients.alertLabel', 'Alert:')}</strong> {localizedNote.text}
                          </p>
                        </div>
                      );
                    })()
                  ) : null}

                  <div className="as-case-footer">
                    {pendingDocsCount > 0 ? (
                      <button 
                        type="button" 
                        className="as-docs-link-btn"
                        onClick={() => setDocModalCase({
                          patientName: p.name || p.patientName,
                          caseId: pId,
                          docs: p.pendingDocuments || p.documents || []
                        })}
                      >
                        <div className="as-docs-btn-left">
                          <FileText size={16} />
                          <span>{pendingDocsCount} {t('sevakDashboard.pendingDocuments', 'Pending Documents')}</span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> {t('sevakDashboard.documentsInOrder', 'Documents In Order')}
                      </span>
                    )}

                    <button 
                      type="button" 
                      className="as-case-view-link"
                      onClick={() => navigate(`/arogyasevak/patient/${pId}`)}
                    >
                      {t('sevakDashboard.profileVitals', 'Profile & Vitals →')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          5. DOCTORS ROSTER MODAL
          ========================================================================= */}
      {rosterModalOpen && (
        <div className="as-modal-backdrop" onClick={() => setRosterModalOpen(false)}>
          <div className="as-modal-card as-roster-modal" onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <div className="as-modal-title-wrap">
                <div className="as-icon-badge as-badge-green">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="as-modal-title">Doctors & Availability Roster</h3>
                  <p className="as-modal-desc">{assignedHospital?.name || 'Assigned Hospital'} • Active Duty Shift</p>
                </div>
              </div>
              <button 
                type="button" 
                className="as-modal-close" 
                onClick={() => setRosterModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="as-modal-body">
              <div className="as-roster-summary-bar">
                <span><strong>{availableDoctors}</strong> of {totalDoctors} Doctors Available Now</span>
                <span className="as-roster-sub">{opdDoctors} OPD Specialists • {ipdDoctors} IPD Consultants</span>
              </div>

              <div className="as-roster-list">
                {doctors.map((doc) => (
                  <div key={doc.id} className="as-roster-item">
                    <div className="as-roster-info">
                      <div className="as-doc-header">
                        <span className="as-doc-name">{doc.name}</span>
                        <span className={`as-doc-badge as-doc-status-${doc.status}`}>
                          {doc.status === 'available' && <span className="as-pulse-dot"></span>}
                          {doc.statusLabel}
                        </span>
                      </div>
                      <div className="as-doc-specialty">{doc.specialty}</div>
                      <div className="as-doc-meta">
                        <span>{doc.department}</span>
                        <span>•</span>
                        <span>{doc.shift}</span>
                      </div>
                    </div>

                    <div className="as-roster-actions">
                      <a href={`tel:${doc.contact}`} className="as-doc-call-btn" title="Call Doctor">
                        <Phone size={14} />
                        <span>{doc.contact}</span>
                      </a>
                      <button 
                        type="button" 
                        className={`as-toggle-status-btn ${doc.status === 'available' ? 'is-active' : ''}`}
                        onClick={() => handleToggleDocStatus(doc.id)}
                        title="Toggle duty availability"
                      >
                        {doc.status === 'available' ? 'Mark Busy' : 'Mark Available'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="as-modal-footer">
              <button 
                type="button" 
                className="as-btn-cancel" 
                onClick={() => setRosterModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                }}
                onClick={() => {
                  setRosterModalOpen(false);
                  navigate(ROUTES.DOCTORS);
                }}
              >
                <Plus size={16} />
                <span>Open Full Directory & Add Doctor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. PENDING DOCUMENTS QUICK MODAL
          ========================================================================= */}
      {docModalCase && (
        <div className="as-modal-backdrop" onClick={() => setDocModalCase(null)}>
          <div className="as-modal-card as-docs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <div className="as-modal-title-wrap">
                <div className="as-icon-badge as-badge-orange">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="as-modal-title">Pending Documents Required</h3>
                  <p className="as-modal-desc">{docModalCase.patientName} • {docModalCase.caseId}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="as-modal-close" 
                onClick={() => setDocModalCase(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="as-modal-body">
              <p className="as-docs-instruction">
                Please collect and upload the following verified documentation for administrative pre-authorization and government scheme clearance.
              </p>

              <div className="as-pending-docs-list">
                {docModalCase.docs.map((doc, idx) => (
                  <div key={idx} className="as-pending-doc-card">
                    <div className="as-pending-doc-info">
                      <div className="as-pending-doc-title">{doc.title}</div>
                      <div className="as-pending-doc-type">{doc.type} • Status: <span className="as-text-danger font-semibold">{doc.status}</span></div>
                    </div>
                    <button 
                      type="button" 
                      className="as-doc-upload-btn"
                      onClick={() => {
                        setUploadModalData({
                          patientId: docModalCase.patientId || docModalCase.caseId || '',
                          patientName: docModalCase.patientName,
                          prefillTitle: doc.title,
                        });
                      }}
                    >
                      <Upload size={14} />
                      <span>Upload</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="as-modal-footer">
              <button 
                type="button" 
                className="as-btn-cancel" 
                onClick={() => setDocModalCase(null)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="as-btn-primary" 
                onClick={() => {
                  setDocModalCase(null);
                  navigate('/arogyasevak/documents');
                }}
              >
                Open Full Documents Hub →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal Matching Reference Form */}
      {uploadModalData && (
        <UploadDocumentModal
          isOpen={Boolean(uploadModalData)}
          onClose={() => setUploadModalData(null)}
          patientId={uploadModalData.patientId}
          patientName={uploadModalData.patientName}
          prefillTitle={uploadModalData.prefillTitle}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
