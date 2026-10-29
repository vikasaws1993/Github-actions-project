import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BedDouble, 
  Stethoscope, 
  ClipboardCheck, 
  CheckCircle2, 
  Send,
  UserCheck,
  Wind,
  ShieldAlert,
  Zap,
  HeartPulse,
  Clock,
  Sun,
  Moon,
  Lock,
  Edit3,
  Info,
  X,
  AlertCircle,
  Calendar,
  Users,
  Plus,
  Trash2,
  Building2,
  Check
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import dailyUpdateService from '@/services/dailyUpdateService';
import hospitalFacilityService from '@/services/hospitalFacilityService';
import './Updates.css';

// Helper to extract cached facility capacity from localStorage (matching v3 draft format)
const getCachedFacilityCapacity = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key && 
        (key.startsWith('arogya_facilities_v3_') || key.startsWith('arogya_facilities_draft_') || key.includes('facilities_draft') || key.includes('arogya_facilities'))
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const ipd = parsed.capacity?.ipd || parsed.beds || parsed.bedAvailability || {};
            const operative = parsed.capacity?.operative || {};
            const critical = parsed.resources || parsed.criticalResources || {};
            const doctorsList = Array.isArray(parsed.doctorsList) ? parsed.doctorsList : [];

            const totalWards = ipd.noOfWards !== undefined && ipd.noOfWards !== '' ? Number(ipd.noOfWards) : null;
            const totalGenBeds = ipd.generalBeds !== undefined && ipd.generalBeds !== '' ? Number(ipd.generalBeds) : (ipd.totalBeds ? Number(ipd.totalBeds) : null);
            const totalIcuBeds = ipd.icuUnits !== undefined && ipd.icuUnits !== '' ? Number(ipd.icuUnits) : (ipd.totalIcuBeds ? Number(ipd.totalIcuBeds) : null);
            const totalNicuBeds = ipd.nicuBeds !== undefined && ipd.nicuBeds !== '' ? Number(ipd.nicuBeds) : null;
            const totalPicuBeds = ipd.picuBeds !== undefined && ipd.picuBeds !== '' ? Number(ipd.picuBeds) : null;
            const totalIsolationBeds = ipd.isolationBeds !== undefined && ipd.isolationBeds !== '' ? Number(ipd.isolationBeds) : null;

            const totalVentilators = critical?.ventilator?.total !== undefined && critical?.ventilator?.total !== '' 
              ? Number(critical.ventilator.total) 
              : null;
            const totalDialysis = operative.dialysisUnits !== undefined && operative.dialysisUnits !== ''
              ? Number(operative.dialysisUnits)
              : null;
            const totalOt = operative.operationTheatres !== undefined && operative.operationTheatres !== ''
              ? Number(operative.operationTheatres)
              : null;

            if (totalGenBeds || totalIcuBeds || totalWards || totalNicuBeds) {
              return {
                ipd: {
                  noOfWards: totalWards || 0,
                  generalBeds: totalGenBeds || 0,
                  icuUnits: totalIcuBeds || 0,
                  nicuBeds: totalNicuBeds || 0,
                  picuBeds: totalPicuBeds || 0,
                  isolationBeds: totalIsolationBeds || 0,
                },
                totalVentilators: totalVentilators || 0,
                totalDialysis: totalDialysis || 0,
                totalOt: totalOt || 0,
                doctorsList,
              };
            }
          } catch (_) {}
        }
      }
    }
  } catch (e) {}
  return null;
};

// Check if report belongs to today (local calendar day)
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

// Shift time-window helper: Morning (06:00 to 14:00), Evening (14:00 to 06:00 next day)
const getShiftScheduleInfo = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const isMorningPeriod = currentHour >= 6 && currentHour < 14;
  return {
    isMorningPeriod,
    activeShift: isMorningPeriod ? 'Morning Shift' : 'Evening Shift',
    activePeriodLabel: isMorningPeriod 
      ? 'Morning Period (06:00 AM – 02:00 PM)' 
      : 'Evening Period (02:00 PM – 10:00 PM)',
  };
};

// Helper for formatted today date string
const getFormattedTodayDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getISOTodayDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Default Static Doctor OPD capacity list
const DEFAULT_STATIC_OPD_DOCTORS = [
  {
    id: 'opd-doc-1',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'General Medicine',
    opdCount: 45,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-2',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Sneha Patil',
    specialty: 'Pediatrics',
    opdCount: 35,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-3',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Amit Deshmukh',
    specialty: 'Orthopedics',
    opdCount: 25,
    session: 'Full Day (09:00 AM – 04:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-4',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Priya Kulkarni',
    specialty: 'Gynecology & Obstetrics',
    opdCount: 30,
    session: 'Morning OPD (09:00 AM – 01:00 PM)',
    onDuty: true,
  },
  {
    id: 'opd-doc-5',
    date: getFormattedTodayDate(),
    doctorName: 'Dr. Anand Joshi',
    specialty: 'Cardiology',
    opdCount: 20,
    session: 'Evening OPD (02:00 PM – 06:00 PM)',
    onDuty: true,
  },
];

export const Updates = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const cachedData = dailyUpdateService.getCachedDailyUpdates();
  const cachedReports = Array.isArray(cachedData?.reports) ? cachedData.reports : [];
  const cachedTodayReports = cachedReports.filter(isReportFromToday);
  const cachedLatest = cachedTodayReports[0] || null;
  const cachedMorningReport = cachedTodayReports.find((r) => (r.shift || '').toLowerCase().includes('morning')) || null;
  
  const cachedFacility = getCachedFacilityCapacity();

  // Hospital Capacity Configured Limits (From Step 2 Capacity in Hospital Facilities)
  const [capacityLimits, setCapacityLimits] = useState(() => ({
    noOfWards: cachedFacility?.ipd?.noOfWards || 10,
    generalBeds: cachedFacility?.ipd?.generalBeds || (cachedData?.stats?.generalTotal || 85),
    icuUnits: cachedFacility?.ipd?.icuUnits || (cachedData?.stats?.icuTotal || 15),
    nicuBeds: cachedFacility?.ipd?.nicuBeds || 8,
    picuBeds: cachedFacility?.ipd?.picuBeds || 6,
    isolationBeds: cachedFacility?.ipd?.isolationBeds || 10,
    ventilators: cachedFacility?.totalVentilators || (cachedData?.stats?.ventilatorsTotal || 6),
    dialysisUnits: cachedFacility?.totalDialysis || 6,
    operationTheatres: cachedFacility?.totalOt || 4,
  }));

  const shiftInfo = getShiftScheduleInfo();

  const [stats, setStats] = useState(() => ({
    icuAvailable: cachedData?.stats?.icuAvailable ?? cachedLatest?.icuAvailable ?? 0,
    icuTotal: capacityLimits.icuUnits,
    generalAvailable: cachedData?.stats?.generalAvailable ?? cachedLatest?.generalAvailable ?? 0,
    generalTotal: capacityLimits.generalBeds,
    doctorsOnDuty: cachedData?.stats?.doctorsOnDuty ?? cachedLatest?.doctorsOnDuty ?? 0,
    opdAdmissionsToday: cachedData?.stats?.admissionsMadeToday ?? cachedLatest?.myAdmissions ?? 0,
  }));

  const [reportsHistory, setReportsHistory] = useState(() => cachedReports);
  const [reportingOfficer, setReportingOfficer] = useState(() => cachedData?.reportingOfficer || user?.name || user?.full_name || 'ArogyaSevak');
  const [hospitalName, setHospitalName] = useState(() => cachedData?.hospitalName || 'Assigned Hospital');

  // Shift & Form State
  const [selectedShift, setSelectedShift] = useState(shiftInfo.activeShift);
  const [isEditingShift, setIsEditingShift] = useState(false);

  // IPD Capacity Form Fields
  const [wardsAvail, setWardsAvail] = useState(() => (cachedMorningReport?.wardsAvailable !== undefined && cachedMorningReport?.wardsAvailable !== null ? cachedMorningReport.wardsAvailable : ''));
  const [genAvail, setGenAvail] = useState(() => (cachedMorningReport?.generalAvailable !== undefined && cachedMorningReport?.generalAvailable !== null ? cachedMorningReport.generalAvailable : ''));
  const [icuAvail, setIcuAvail] = useState(() => (cachedMorningReport?.icuAvailable !== undefined && cachedMorningReport?.icuAvailable !== null ? cachedMorningReport.icuAvailable : ''));
  const [nicuAvail, setNicuAvail] = useState(() => (cachedMorningReport?.nicuAvailable !== undefined && cachedMorningReport?.nicuAvailable !== null ? cachedMorningReport.nicuAvailable : ''));
  const [picuAvail, setPicuAvail] = useState(() => (cachedMorningReport?.picuAvailable !== undefined && cachedMorningReport?.picuAvailable !== null ? cachedMorningReport.picuAvailable : ''));
  const [isolationAvail, setIsolationAvail] = useState(() => (cachedMorningReport?.isolationAvailable !== undefined && cachedMorningReport?.isolationAvailable !== null ? cachedMorningReport.isolationAvailable : ''));

  // Inpatient & Critical Resources
  const [myAdmissions, setMyAdmissions] = useState(() => (cachedMorningReport?.myAdmissions !== undefined && cachedMorningReport?.myAdmissions !== null ? cachedMorningReport.myAdmissions : ''));
  const [doctorsCount, setDoctorsCount] = useState(() => (cachedMorningReport?.doctorsOnDuty !== undefined && cachedMorningReport?.doctorsOnDuty !== null ? cachedMorningReport.doctorsOnDuty : ''));
  const [ventilatorsAvail, setVentilatorsAvail] = useState(() => (cachedMorningReport?.ventilators !== undefined && cachedMorningReport?.ventilators !== null ? cachedMorningReport.ventilators : ''));
  const [oxygenBedsAvail, setOxygenBedsAvail] = useState(() => (cachedMorningReport?.oxygenBeds !== undefined && cachedMorningReport?.oxygenBeds !== null ? cachedMorningReport.oxygenBeds : ''));
  const [dialysisAvail, setDialysisAvail] = useState(() => (cachedMorningReport?.dialysisUnits !== undefined && cachedMorningReport?.dialysisUnits !== null ? cachedMorningReport.dialysisUnits : ''));
  const [otAvail, setOtAvail] = useState(() => (cachedMorningReport?.operationTheatres !== undefined && cachedMorningReport?.operationTheatres !== null ? cachedMorningReport.operationTheatres : ''));
  const [remarks, setRemarks] = useState('');

  // OPD Doctor Capacity State (Date, Doctor Name, OPD Count)
  const [opdDoctors, setOpdDoctors] = useState(() => {
    if (cachedMorningReport?.opdDoctorRecords && Array.isArray(cachedMorningReport.opdDoctorRecords) && cachedMorningReport.opdDoctorRecords.length > 0) {
      return cachedMorningReport.opdDoctorRecords;
    }
    if (cachedFacility?.doctorsList && cachedFacility.doctorsList.length > 0) {
      return cachedFacility.doctorsList.map((doc, idx) => ({
        id: doc.id || `doc-opd-${idx}`,
        date: getFormattedTodayDate(),
        doctorName: doc.name || `Dr. ${doc.fullName || 'Doctor'}`,
        specialty: doc.speciality || doc.department || 'General Medicine',
        opdCount: 30,
        session: 'Morning OPD (09:00 AM – 01:00 PM)',
        onDuty: true,
      }));
    }
    return DEFAULT_STATIC_OPD_DOCTORS;
  });

  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [formErrorNotice, setFormErrorNotice] = useState('');

  const applyShiftDefaults = (shiftName, reportsList = []) => {
    const isMorn = (shiftName || '').toLowerCase().includes('morning');
    const todayList = reportsList.filter(isReportFromToday);
    const existing = todayList.find((r) => {
      const s = (r.shift || '').toLowerCase();
      return isMorn ? s.includes('morning') : (s.includes('evening') || s.includes('night'));
    });

    if (existing) {
      setWardsAvail(existing.wardsAvailable !== undefined && existing.wardsAvailable !== null ? existing.wardsAvailable : '');
      setGenAvail(existing.generalAvailable !== undefined && existing.generalAvailable !== null ? existing.generalAvailable : '');
      setIcuAvail(existing.icuAvailable !== undefined && existing.icuAvailable !== null ? existing.icuAvailable : '');
      setNicuAvail(existing.nicuAvailable !== undefined && existing.nicuAvailable !== null ? existing.nicuAvailable : '');
      setPicuAvail(existing.picuAvailable !== undefined && existing.picuAvailable !== null ? existing.picuAvailable : (existing.picuAvail ?? ''));
      setIsolationAvail(existing.isolationAvailable !== undefined && existing.isolationAvailable !== null ? existing.isolationAvailable : '');
      setMyAdmissions(existing.myAdmissions !== undefined && existing.myAdmissions !== null ? existing.myAdmissions : '');
      setDoctorsCount(existing.doctorsOnDuty !== undefined && existing.doctorsOnDuty !== null ? existing.doctorsOnDuty : '');
      setVentilatorsAvail(existing.ventilators !== undefined && existing.ventilators !== null ? existing.ventilators : '');
      setOxygenBedsAvail(existing.oxygenBeds !== undefined && existing.oxygenBeds !== null ? existing.oxygenBeds : '');
      setDialysisAvail(existing.dialysisUnits !== undefined && existing.dialysisUnits !== null ? existing.dialysisUnits : '');
      setOtAvail(existing.operationTheatres !== undefined && existing.operationTheatres !== null ? existing.operationTheatres : '');
      setRemarks(existing.remarks || '');
      if (Array.isArray(existing.opdDoctorRecords) && existing.opdDoctorRecords.length > 0) {
        setOpdDoctors(existing.opdDoctorRecords);
      }
    } else {
      setWardsAvail('');
      setGenAvail('');
      setIcuAvail('');
      setNicuAvail('');
      setPicuAvail('');
      setIsolationAvail('');
      setMyAdmissions('');
      setDoctorsCount('');
      setVentilatorsAvail('');
      setOxygenBedsAvail('');
      setDialysisAvail('');
      setOtAvail('');
      setRemarks('');
    }
  };

  const handleShiftSelect = (shiftName) => {
    setSelectedShift(shiftName);
    setIsEditingShift(false);
    setFormErrorNotice('');
    applyShiftDefaults(shiftName, reportsHistory);
  };

  const handleStartEdit = () => {
    applyShiftDefaults(selectedShift, reportsHistory);
    setIsEditingShift(true);
    setFormErrorNotice('');
  };

  const handleCancelEdit = () => {
    setIsEditingShift(false);
    setFormErrorNotice('');
  };

  const loadData = async () => {
    try {
      const [res, facilityRes] = await Promise.allSettled([
        dailyUpdateService.getDailyUpdates(),
        hospitalFacilityService.getHospitalFacilities(),
      ]);

      let loadedLimits = { ...capacityLimits };
      let loadedDoctors = [];

      if (facilityRes.status === 'fulfilled' && facilityRes.value?.data) {
        const fData = facilityRes.value.data;
        const fCap = fData.capacity || {};
        const fIpd = fCap.ipd || {};
        const fBeds = fData.bedAvailability || {};
        const fOperative = fCap.operative || {};
        const fCritical = fData.criticalResources || {};

        const totalWards = fIpd.noOfWards ? Number(fIpd.noOfWards) : loadedLimits.noOfWards;
        const totalGen = fIpd.generalBeds ? Number(fIpd.generalBeds) : (fBeds.totalBeds ? Number(fBeds.totalBeds) : loadedLimits.generalBeds);
        const totalIcu = fIpd.icuUnits ? Number(fIpd.icuUnits) : (fBeds.totalIcuBeds ? Number(fBeds.totalIcuBeds) : loadedLimits.icuUnits);
        const totalNicu = fIpd.nicuBeds ? Number(fIpd.nicuBeds) : loadedLimits.nicuBeds;
        const totalPicu = fIpd.picuBeds ? Number(fIpd.picuBeds) : loadedLimits.picuBeds;
        const totalIso = fIpd.isolationBeds ? Number(fIpd.isolationBeds) : loadedLimits.isolationBeds;
        const totalVent = fCritical.ventilator?.total ? Number(fCritical.ventilator.total) : loadedLimits.ventilators;
        const totalDial = fOperative.dialysisUnits ? Number(fOperative.dialysisUnits) : loadedLimits.dialysisUnits;
        const totalOt = fOperative.operationTheatres ? Number(fOperative.operationTheatres) : loadedLimits.operationTheatres;

        loadedLimits = {
          noOfWards: totalWards || 10,
          generalBeds: totalGen || 85,
          icuUnits: totalIcu || 15,
          nicuBeds: totalNicu || 8,
          picuBeds: totalPicu || 6,
          isolationBeds: totalIso || 10,
          ventilators: totalVent || 6,
          dialysisUnits: totalDial || 6,
          operationTheatres: totalOt || 4,
        };
        setCapacityLimits(loadedLimits);

        if (Array.isArray(fData.doctorsList) && fData.doctorsList.length > 0) {
          loadedDoctors = fData.doctorsList;
          setOpdDoctors((prev) => {
            if (prev && prev.length > 0 && prev !== DEFAULT_STATIC_OPD_DOCTORS) return prev;
            return loadedDoctors.map((doc, idx) => ({
              id: doc.id || `doc-opd-${idx}`,
              date: getFormattedTodayDate(),
              doctorName: doc.name || `Dr. ${doc.fullName || 'Doctor'}`,
              specialty: doc.speciality || doc.department || 'General Medicine',
              opdCount: 30,
              session: 'Morning OPD (09:00 AM – 01:00 PM)',
              onDuty: true,
            }));
          });
        }
      }

      if (res.status === 'fulfilled' && res.value?.data) {
        const data = res.value.data;
        if (data.stats) {
          setStats({
            icuAvailable: data.stats.icuAvailable,
            icuTotal: loadedLimits.icuUnits,
            generalAvailable: data.stats.generalAvailable,
            generalTotal: loadedLimits.generalBeds,
            doctorsOnDuty: data.stats.doctorsOnDuty,
            opdAdmissionsToday: data.stats.admissionsMadeToday,
          });
        }
        if (data.hospitalName) {
          setHospitalName(data.hospitalName);
        }
        if (data.reportingOfficer) {
          setReportingOfficer(data.reportingOfficer);
        }
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          setReportsHistory(data.reports);
          applyShiftDefaults(selectedShift, data.reports);
        }
      }
    } catch (err) {
      console.warn('Daily updates API notice:', err?.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // OPD Doctor management helpers
  const handleUpdateDoctorOpdCount = (id, count) => {
    const num = Math.max(0, parseInt(count, 10) || 0);
    setOpdDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, opdCount: num } : d))
    );
  };

  const handleToggleDoctorDuty = (id) => {
    setOpdDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, onDuty: !d.onDuty } : d))
    );
  };

  // Validation Check: IPD fields must NOT exceed total capacity in hospital facilities
  const validateCapacityLimits = () => {
    const errors = [];
    const gNum = parseInt(genAvail, 10) || 0;
    const iNum = parseInt(icuAvail, 10) || 0;
    const nNum = parseInt(nicuAvail, 10) || 0;
    const pNum = parseInt(picuAvail, 10) || 0;
    const isoNum = parseInt(isolationAvail, 10) || 0;

    if (capacityLimits.generalBeds > 0 && gNum > capacityLimits.generalBeds) {
      errors.push(`General Beds Available (${gNum}) cannot exceed total hospital capacity (${capacityLimits.generalBeds}).`);
    }
    if (capacityLimits.icuUnits > 0 && iNum > capacityLimits.icuUnits) {
      errors.push(`ICU Beds Available (${iNum}) cannot exceed total hospital capacity (${capacityLimits.icuUnits}).`);
    }
    if (capacityLimits.nicuBeds > 0 && nNum > capacityLimits.nicuBeds) {
      errors.push(`NICU Beds Available (${nNum}) cannot exceed total hospital capacity (${capacityLimits.nicuBeds}).`);
    }
    if (capacityLimits.picuBeds > 0 && pNum > capacityLimits.picuBeds) {
      errors.push(`PICU Beds Available (${pNum}) cannot exceed total hospital capacity (${capacityLimits.picuBeds}).`);
    }
    if (capacityLimits.isolationBeds > 0 && isoNum > capacityLimits.isolationBeds) {
      errors.push(`Isolation Beds Available (${isoNum}) cannot exceed total hospital capacity (${capacityLimits.isolationBeds}).`);
    }

    return errors;
  };

  const handleSubmitDailyReport = async (e) => {
    e.preventDefault();
    setFormErrorNotice('');

    // Run capacity validation
    const validationErrors = validateCapacityLimits();
    if (validationErrors.length > 0) {
      setFormErrorNotice(validationErrors[0]);
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        shift: selectedShift,
        wardsAvailable: parseInt(wardsAvail, 10) || 0,
        wardsTotal: capacityLimits.noOfWards || 0,
        generalAvailable: parseInt(genAvail, 10) || 0,
        generalTotal: capacityLimits.generalBeds || 0,
        icuAvailable: parseInt(icuAvail, 10) || 0,
        icuTotal: capacityLimits.icuUnits || 0,
        nicuAvailable: parseInt(nicuAvail, 10) || 0,
        nicuTotal: capacityLimits.nicuBeds || 0,
        picuAvailable: parseInt(picuAvail, 10) || 0,
        picuTotal: capacityLimits.picuBeds || 0,
        isolationAvailable: parseInt(isolationAvail, 10) || 0,
        isolationTotal: capacityLimits.isolationBeds || 0,

        myAdmissions: parseInt(myAdmissions, 10) || 0,
        doctorsOnDuty: parseInt(doctorsCount, 10) || 0,
        ventilators: parseInt(ventilatorsAvail, 10) || 0,
        oxygenBeds: parseInt(oxygenBedsAvail, 10) || 0,
        dialysisUnits: parseInt(dialysisAvail, 10) || 0,
        operationTheatres: parseInt(otAvail, 10) || 0,
        opdDoctorRecords: opdDoctors,
        remarks: remarks,
        reportingOfficerName: reportingOfficer,
      };

      await dailyUpdateService.submitDailyReport(payload);

      setStats((prev) => ({
        ...prev,
        icuAvailable: payload.icuAvailable,
        generalAvailable: payload.generalAvailable,
        doctorsOnDuty: payload.doctorsOnDuty,
        opdAdmissionsToday: payload.myAdmissions,
      }));

      setSuccessNotice(true);
      setIsEditingShift(false);

      try {
        window.dispatchEvent(new CustomEvent('arogyamitra:refresh'));
      } catch (_) {}

      await loadData();

      setTimeout(() => {
        setSuccessNotice(false);
      }, 4000);
    } catch (err) {
      console.error('Error submitting daily report:', err);
      setFormErrorNotice(err?.response?.data?.message || 'Failed to submit daily report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Derived shift reports for TODAY only
  const todayReports = reportsHistory.filter(isReportFromToday);
  const morningReport = todayReports.find(
    (r) => (r.shift || '').toLowerCase().includes('morning')
  );
  const eveningReport = todayReports.find(
    (r) => (r.shift || '').toLowerCase().includes('evening') || (r.shift || '').toLowerCase().includes('night')
  );

  const getReportTimeString = (rep) => {
    if (!rep) return null;
    if (rep.date) {
      if (rep.date.includes(',')) {
        return rep.date.split(',')[1]?.trim();
      }
      if (rep.date.includes('·')) {
        return rep.date.split('·')[1]?.trim();
      }
      return rep.date;
    }
    return t('updates.completed', 'Completed');
  };

  const morningTime = getReportTimeString(morningReport);
  const eveningTime = getReportTimeString(eveningReport);

  const currentShiftReport = selectedShift === 'Morning Shift' ? morningReport : eveningReport;

  // Determine if the selected shift is time-locked
  const isSelectedShiftLocked = 
    (selectedShift === 'Evening Shift' && shiftInfo.isMorningPeriod && !eveningReport) ||
    (selectedShift === 'Morning Shift' && !shiftInfo.isMorningPeriod && !morningReport);

  const shiftLabel = selectedShift === 'Morning Shift' 
    ? t('updates.morningUpdate', 'Morning Update') 
    : t('updates.eveningUpdate', 'Evening Update');

  return (
    <div className="am-updates-page">
      {/* 1. Top Shift Selector Navigation Tabs */}
      <div className="am-shift-nav-row">
        {/* Tab 1: Morning Update */}
        <button
          type="button"
          onClick={() => handleShiftSelect('Morning Shift')}
          className={`am-shift-tab-btn ${selectedShift === 'Morning Shift' ? 'am-shift-tab-selected' : ''}`}
        >
          <div className="am-shift-tab-left">
            <div className="am-shift-tab-icon-wrap am-icon-wrap-sun">
              <Sun size={20} />
            </div>
            <div>
              <div className="am-shift-tab-title">{t('updates.morningUpdate', 'Morning Update')}</div>
              <div className="am-shift-tab-time-hint">{t('updates.morningTimeHint', '06:00 AM – 02:00 PM')}</div>
            </div>
          </div>
          <div className="am-shift-tab-right">
            {morningReport ? (
              <span className="am-shift-tab-status-pill am-tab-status-done">
                <CheckCircle2 size={13} />
                <span>{t('updates.done', 'Done')} ({morningTime || t('updates.completed', 'Completed')})</span>
              </span>
            ) : shiftInfo.isMorningPeriod ? (
              <span className="am-shift-tab-status-pill am-tab-status-open">
                <Clock size={13} />
                <span>{t('updates.openActive', 'Open (Active)')}</span>
              </span>
            ) : (
              <span className="am-shift-tab-status-pill am-tab-status-locked">
                <Clock size={13} />
                <span>{t('updates.windowClosed', 'Window Closed')}</span>
              </span>
            )}
          </div>
        </button>

        {/* Tab 2: Evening Update */}
        <button
          type="button"
          onClick={() => handleShiftSelect('Evening Shift')}
          className={`am-shift-tab-btn ${selectedShift === 'Evening Shift' ? 'am-shift-tab-selected' : ''}`}
        >
          <div className="am-shift-tab-left">
            <div className="am-shift-tab-icon-wrap am-icon-wrap-moon">
              <Moon size={20} />
            </div>
            <div>
              <div className="am-shift-tab-title">{t('updates.eveningUpdate', 'Evening Update')}</div>
              <div className="am-shift-tab-time-hint">{t('updates.eveningTimeHint', '02:00 PM – 10:00 PM')}</div>
            </div>
          </div>
          <div className="am-shift-tab-right">
            {eveningReport ? (
              <span className="am-shift-tab-status-pill am-tab-status-done">
                <CheckCircle2 size={13} />
                <span>{t('updates.done', 'Done')} ({eveningTime || t('updates.completed', 'Completed')})</span>
              </span>
            ) : !shiftInfo.isMorningPeriod ? (
              <span className="am-shift-tab-status-pill am-tab-status-open">
                <Clock size={13} />
                <span>{t('updates.openActive', 'Open (Active)')}</span>
              </span>
            ) : (
              <span className="am-shift-tab-status-pill am-tab-status-locked">
                <Lock size={13} />
                <span>{t('updates.opensAtTwo', 'Opens 02:00 PM')}</span>
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="am-form-success-banner">
          <CheckCircle2 size={22} className="am-success-icon" />
          <div>
            <h4>{t('updates.successTitle', 'Daily Update Submitted Successfully!')}</h4>
            <p>{t('updates.successDesc', 'Resource counts and availability metrics updated for')} {hospitalName}.</p>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {formErrorNotice && (
        <div className="am-form-error-banner">
          <AlertCircle size={22} className="am-error-icon" />
          <div>
            <h4>Capacity Validation Notice</h4>
            <p>{formErrorNotice}</p>
          </div>
          <button type="button" className="am-error-close-btn" onClick={() => setFormErrorNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. Main Body View: (A) Locked View, (B) Submitted Shift Summary View, or (C) Form View */}

      {/* VIEW A: Shift is Locked */}
      {isSelectedShiftLocked ? (
        <div className="am-locked-card">
          <div className="am-locked-icon-circle">
            <Clock size={36} />
          </div>
          <h2 className="am-locked-title">
            {selectedShift === 'Evening Shift' 
              ? t('updates.eveningLockedTitle', 'Evening Shift Update Locked') 
              : t('updates.morningClosedTitle', 'Morning Shift Reporting Closed')}
          </h2>
          <p className="am-locked-subtitle">
            {selectedShift === 'Evening Shift'
              ? t('updates.eveningLockedDesc', 'Evening shift reporting opens at 02:00 PM (14:00). You are currently in the morning shift time period.')
              : t('updates.morningClosedDesc', 'Morning shift reporting window (06:00 AM – 02:00 PM) has concluded. You are currently in the evening shift period.')}
          </p>

          <div className="am-locked-info-box">
            <Info size={20} style={{ flexShrink: 0 }} />
            <span>
              {selectedShift === 'Evening Shift'
                ? t('updates.eveningLockedDesc', 'Please complete or check the Morning Shift update for current hospital status.')
                : t('updates.morningClosedDesc', 'Please complete or check the Evening Shift update for current hospital status.')}
            </span>
          </div>

          <button
            type="button"
            className="am-btn-switch-shift"
            onClick={() => handleShiftSelect(shiftInfo.activeShift)}
          >
            {shiftInfo.isMorningPeriod ? <Sun size={17} /> : <Moon size={17} />}
            <span>{t('updates.switchToShift', 'Switch to')} {shiftInfo.activeShift === 'Morning Shift' ? t('updates.morningUpdate', 'Morning Shift') : t('updates.eveningUpdate', 'Evening Shift')}</span>
          </button>
        </div>
      ) : currentShiftReport && !isEditingShift ? (
        /* VIEW B: Shift Already Submitted -> Render Web Summary Card */
        <div className="am-summary-card">
          {/* Summary Header Banner */}
          <div className="am-summary-top-banner">
            <div className="am-summary-banner-left">
              <div className="am-summary-badge-row">
                <span className="am-shift-status-tag">
                  {selectedShift === 'Morning Shift' ? <Sun size={16} color="#d97706" /> : <Moon size={16} color="#475569" />}
                  <span>{selectedShift === 'Morning Shift' ? t('updates.morningShiftStatus', 'Morning Shift Status') : t('updates.eveningShiftStatus', 'Evening Shift Status')}</span>
                </span>
                <span className="am-submitted-tag">
                  <CheckCircle2 size={13} />
                  <span>{t('updates.submitted', 'Submitted')}</span>
                </span>
              </div>
              <h3 className="am-summary-hosp-title">{hospitalName}</h3>
              <div className="am-summary-meta-row">
                <span className="am-summary-meta-item">
                  <Clock size={14} color="#0284c7" />
                  <span>{t('updates.time', 'Time:')} <strong>{getReportTimeString(currentShiftReport) || currentShiftReport.date || t('common.today', 'Today')}</strong></span>
                </span>
                <span className="am-summary-meta-item">
                  <UserCheck size={14} color="#16a34a" />
                  <span>{t('updates.officer', 'Officer:')} <strong>{currentShiftReport.submittedBy || reportingOfficer}</strong></span>
                </span>
              </div>
            </div>

            <button
              type="button"
              className="am-btn-edit-outline"
              onClick={handleStartEdit}
              title="Edit shift values"
            >
              <Edit3 size={15} />
              <span>{t('updates.editShiftUpdate', 'Edit Shift Update')}</span>
            </button>
          </div>

          {/* Section 1: IPD Capacity & Bed Availability */}
          <div className="am-summary-section-block">
            <div className="am-summary-section-title">
              <BedDouble size={17} color="#0284c7" />
              <span>1. IPD (In-Patient Department) Capacity Availability</span>
            </div>
            <div className="am-summary-grid-6col">
              {/* Stat 1: General Ward Beds */}
              <div className="am-stat-box am-stat-box-accent-blue">
                <div className="am-stat-box-top">
                  <span className="am-stat-label">General Beds</span>
                  <div className="am-stat-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <BedDouble size={16} />
                  </div>
                </div>
                <div className="am-stat-val-row">
                  <span className="am-stat-big-val">{currentShiftReport.generalAvailable ?? 0}</span>
                  <span className="am-stat-denom">/ {capacityLimits.generalBeds} Total</span>
                </div>
              </div>

              {/* Stat 2: ICU Beds */}
              <div className="am-stat-box am-stat-box-accent-red">
                <div className="am-stat-box-top">
                  <span className="am-stat-label">ICU Units</span>
                  <div className="am-stat-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <Activity size={16} />
                  </div>
                </div>
                <div className="am-stat-val-row">
                  <span className="am-stat-big-val">{currentShiftReport.icuAvailable ?? 0}</span>
                  <span className="am-stat-denom">/ {capacityLimits.icuUnits} Total</span>
                </div>
              </div>

              {/* Stat 3: NICU Beds */}
              <div className="am-stat-box am-stat-box-accent-purple">
                <div className="am-stat-box-top">
                  <span className="am-stat-label">NICU Beds</span>
                  <div className="am-stat-icon-wrap" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                    <HeartPulse size={16} />
                  </div>
                </div>
                <div className="am-stat-val-row">
                  <span className="am-stat-big-val">{currentShiftReport.nicuAvailable ?? 0}</span>
                  <span className="am-stat-denom">/ {capacityLimits.nicuBeds} Total</span>
                </div>
              </div>

              {/* Stat 4: PICU Beds */}
              <div className="am-stat-box am-stat-box-accent-amber">
                <div className="am-stat-box-top">
                  <span className="am-stat-label">PICU Beds</span>
                  <div className="am-stat-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
                    <HeartPulse size={16} />
                  </div>
                </div>
                <div className="am-stat-val-row">
                  <span className="am-stat-big-val">{currentShiftReport.picuAvailable ?? 0}</span>
                  <span className="am-stat-denom">/ {capacityLimits.picuBeds} Total</span>
                </div>
              </div>

              {/* Stat 5: Isolation Beds */}
              <div className="am-stat-box am-stat-box-accent-cyan">
                <div className="am-stat-box-top">
                  <span className="am-stat-label">Isolation Beds</span>
                  <div className="am-stat-icon-wrap" style={{ background: '#ecfeff', color: '#0891b2' }}>
                    <ShieldAlert size={16} />
                  </div>
                </div>
                <div className="am-stat-val-row">
                  <span className="am-stat-big-val">{currentShiftReport.isolationAvailable ?? 0}</span>
                  <span className="am-stat-denom">/ {capacityLimits.isolationBeds} Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: OPD Doctor Capacity & Schedule */}
          <div className="am-summary-section-block">
            <div className="am-summary-section-title">
              <Users size={17} color="#0f766e" />
              <span>2. OPD Doctor Capacity & Patient Allocation</span>
            </div>
            
            <div className="am-opd-table-card">
              <table className="am-opd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor Name</th>
                    <th>Specialization</th>
                    <th>OPD Patient Capacity</th>
                    <th>Duty Session</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentShiftReport.opdDoctorRecords && currentShiftReport.opdDoctorRecords.length > 0 
                    ? currentShiftReport.opdDoctorRecords 
                    : opdDoctors
                  ).map((doc, idx) => (
                    <tr key={doc.id || idx}>
                      <td>
                        <span className="am-opd-date-pill">
                          <Calendar size={12} />
                          <span>{doc.date || getFormattedTodayDate()}</span>
                        </span>
                      </td>
                      <td className="am-doc-name-cell">
                        <strong>{doc.doctorName}</strong>
                      </td>
                      <td>
                        <span className="am-doc-spec-badge">{doc.specialty || 'General OPD'}</span>
                      </td>
                      <td>
                        <span className="am-opd-count-badge">
                          <strong>{doc.opdCount ?? 30}</strong> Patients
                        </span>
                      </td>
                      <td className="am-opd-session-text">
                        {doc.session || 'Morning Shift (09:00 AM – 01:00 PM)'}
                      </td>
                      <td>
                        {doc.onDuty !== false ? (
                          <span className="am-duty-pill am-duty-active">
                            <Check size={11} /> On Duty
                          </span>
                        ) : (
                          <span className="am-duty-pill am-duty-off">Off Duty</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Shift Remarks if present */}
          {currentShiftReport.remarks && (
            <div className="am-summary-section-block">
              <div className="am-summary-section-title">
                <Info size={16} color="#64748b" />
                <span>3. Shift Remarks & Handover Notes</span>
              </div>
              <div className="am-remarks-display-box">
                {currentShiftReport.remarks}
              </div>
            </div>
          )}

          {/* Summary Footer Action */}
          <div className="am-summary-footer-actions">
            <button
              type="button"
              className="am-btn-primary-action"
              onClick={handleStartEdit}
            >
              <Edit3 size={16} />
              <span>{t('updates.editThisShift', 'Edit This Shift Update')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW C: Entry / Edit Form */
        <div className="am-table-card am-form-card">
          <div className="am-form-card-header">
            <div className="am-form-title-group">
              <h2>
                {isEditingShift 
                  ? `${t('updates.editReportTitle', 'Edit Status Report')} (${shiftLabel})` 
                  : `${t('updates.dailyReportTitle', 'Daily Status & Critical Resource Report')} (${shiftLabel})`}
              </h2>
              <p>{t('updates.formSubtitle', "Enter today's available IPD capacity counts and OPD doctor patient allocations")}</p>
            </div>
            <span className="am-form-badge">
              {isEditingShift ? t('updates.editingMode', 'Editing Mode') : t('updates.dailyEntryForm', 'Daily Entry Form')}
            </span>
          </div>

          {isEditingShift && (
            <div className="am-form-edit-banner">
              <div className="am-edit-banner-text">
                <Edit3 size={16} />
                <span>{t('updates.editThisShift', 'Editing previously submitted update. Changes will overwrite current counts.')}</span>
              </div>
              <button
                type="button"
                className="am-btn-cancel-edit"
                onClick={handleCancelEdit}
              >
                <X size={14} />
                <span>{t('updates.cancelBtn', 'Cancel')}</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitDailyReport} className="am-daily-update-form">
            {/* SECTION 1: All IPD Capacity Options with Strict Max Validation in Compact Grid */}
            <div className="am-form-section-header">
              <div className="am-form-section-title">
                <BedDouble size={16} className="am-icon-blue" />
                <span>1. IPD (In-Patient Department) Capacity Availability</span>
              </div>
              <span className="am-section-helper-badge">
                Validated against Hospital Facilities Capacity limits
              </span>
            </div>

            <div className="am-ipd-form-grid-compact">
              {/* Field 1: General Ward Beds */}
              <div className="am-compact-stat-card am-card-blue">
                <div className="am-compact-stat-label">General Beds</div>
                <div className="am-compact-stat-input-row">
                  <input
                    type="number"
                    className={`am-compact-input ${capacityLimits.generalBeds > 0 && genAvail !== '' && Number(genAvail) > capacityLimits.generalBeds ? 'am-input-error' : ''}`}
                    placeholder="0"
                    value={genAvail}
                    onChange={(e) => setGenAvail(e.target.value)}
                    min="0"
                    max={capacityLimits.generalBeds || 9999}
                  />
                  <span className="am-compact-stat-denom">/ {capacityLimits.generalBeds}</span>
                </div>
              </div>

              {/* Field 2: Available ICU Beds */}
              <div className="am-compact-stat-card am-card-red">
                <div className="am-compact-stat-label">ICU Units</div>
                <div className="am-compact-stat-input-row">
                  <input
                    type="number"
                    className={`am-compact-input ${capacityLimits.icuUnits > 0 && icuAvail !== '' && Number(icuAvail) > capacityLimits.icuUnits ? 'am-input-error' : ''}`}
                    placeholder="0"
                    value={icuAvail}
                    onChange={(e) => setIcuAvail(e.target.value)}
                    min="0"
                    max={capacityLimits.icuUnits || 9999}
                  />
                  <span className="am-compact-stat-denom">/ {capacityLimits.icuUnits}</span>
                </div>
              </div>

              {/* Field 3: Available NICU Beds */}
              <div className="am-compact-stat-card am-card-purple">
                <div className="am-compact-stat-label">NICU Beds</div>
                <div className="am-compact-stat-input-row">
                  <input
                    type="number"
                    className={`am-compact-input ${capacityLimits.nicuBeds > 0 && nicuAvail !== '' && Number(nicuAvail) > capacityLimits.nicuBeds ? 'am-input-error' : ''}`}
                    placeholder="0"
                    value={nicuAvail}
                    onChange={(e) => setNicuAvail(e.target.value)}
                    min="0"
                    max={capacityLimits.nicuBeds || 9999}
                  />
                  <span className="am-compact-stat-denom">/ {capacityLimits.nicuBeds}</span>
                </div>
              </div>

              {/* Field 4: Available PICU Beds */}
              <div className="am-compact-stat-card am-card-amber">
                <div className="am-compact-stat-label">PICU Beds</div>
                <div className="am-compact-stat-input-row">
                  <input
                    type="number"
                    className={`am-compact-input ${capacityLimits.picuBeds > 0 && picuAvail !== '' && Number(picuAvail) > capacityLimits.picuBeds ? 'am-input-error' : ''}`}
                    placeholder="0"
                    value={picuAvail}
                    onChange={(e) => setPicuAvail(e.target.value)}
                    min="0"
                    max={capacityLimits.picuBeds || 9999}
                  />
                  <span className="am-compact-stat-denom">/ {capacityLimits.picuBeds}</span>
                </div>
              </div>

              {/* Field 5: Isolation Beds */}
              <div className="am-compact-stat-card am-card-cyan">
                <div className="am-compact-stat-label">Isolation Beds</div>
                <div className="am-compact-stat-input-row">
                  <input
                    type="number"
                    className={`am-compact-input ${capacityLimits.isolationBeds > 0 && isolationAvail !== '' && Number(isolationAvail) > capacityLimits.isolationBeds ? 'am-input-error' : ''}`}
                    placeholder="0"
                    value={isolationAvail}
                    onChange={(e) => setIsolationAvail(e.target.value)}
                    min="0"
                    max={capacityLimits.isolationBeds || 9999}
                  />
                  <span className="am-compact-stat-denom">/ {capacityLimits.isolationBeds}</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: OPD Doctor Capacity & Allocation */}
            <div className="am-form-section-header am-mt-20">
              <div className="am-form-section-title">
                <Users size={16} className="am-icon-teal" />
                <span>2. OPD Doctor Capacity & Daily Patient Allocation</span>
              </div>
            </div>

            {/* OPD Doctor Capacity Table */}
            <div className="am-opd-table-card">
              <table className="am-opd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor Name</th>
                    <th>Speciality</th>
                    <th style={{ width: '180px' }}>OPD Count (Patients)</th>
                    <th>Session Duty</th>
                  </tr>
                </thead>
                <tbody>
                  {opdDoctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <span className="am-opd-date-pill">
                          <Calendar size={12} />
                          <span>{doc.date || getFormattedTodayDate()}</span>
                        </span>
                      </td>
                      <td className="am-doc-name-cell">
                        <strong>{doc.doctorName}</strong>
                      </td>
                      <td>
                        <span className="am-doc-spec-badge">{doc.specialty || 'General OPD'}</span>
                      </td>
                      <td>
                        <div className="am-opd-count-input-wrap">
                          <input
                            type="number"
                            className="am-form-input am-opd-input-mini"
                            value={doc.opdCount}
                            onChange={(e) => handleUpdateDoctorOpdCount(doc.id, e.target.value)}
                            min="0"
                          />
                          <span className="am-opd-unit-label">Patients</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`am-duty-toggle-btn ${doc.onDuty !== false ? 'is-duty-on' : 'is-duty-off'}`}
                          onClick={() => handleToggleDoctorDuty(doc.id)}
                          title="Toggle Doctor duty status"
                        >
                          {doc.onDuty !== false ? 'On Duty (Active)' : 'Off Duty'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SECTION 3: Shift Remarks & Ward Notes */}
            <div className="am-form-field am-mt-18">
              <label className="am-form-label">
                <span>3. Shift Remarks & Ward Handover Notes</span>
              </label>
              <textarea
                className="am-form-textarea"
                rows="2"
                placeholder={t('updates.shiftRemarksPlaceholder', 'Enter any shift observations, handovers, or critical notes...')}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Form Action Bar */}
            <div className="am-form-actions-bar">
              <div className="am-reporter-info">
                <UserCheck size={16} />
                <span>{t('updates.officer', 'Reporting Officer:')} <strong>{reportingOfficer}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isEditingShift && (
                  <button
                    type="button"
                    className="am-btn-cancel-edit"
                    onClick={handleCancelEdit}
                  >
                    {t('updates.cancelBtn', 'Cancel')}
                  </button>
                )}
                <button type="submit" className="am-btn-submit-report" disabled={submitting}>
                  <Send size={15} />
                  <span>
                    {submitting 
                      ? t('updates.submittingBtn', 'Submitting...') 
                      : isEditingShift 
                        ? t('updates.saveChangesBtn', 'Save & Update Shift Report') 
                        : t('updates.submitReportBtn', 'Submit Daily Report')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Updates;
