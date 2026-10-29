import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Clock,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sparkles
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useLanguage } from '@/context/LanguageContext';
import { schemeService } from '../../../services/schemeService';
import { getCaseTargetUrl } from '../../../services/applicationService';
import Loader from '@/components/common/Loader/Loader';
import './AdminDashboard.css';

const SCHEME_COLOR_PALETTE = [
  { dot: 'dot-blue', fill: 'fill-blue', text: 'text-blue' },
  { dot: 'dot-green', fill: 'fill-green', text: 'text-green' },
  { dot: 'dot-amber', fill: 'fill-amber', text: 'text-amber' },
  { dot: 'dot-purple', fill: 'fill-purple', text: 'text-purple' },
  { dot: 'dot-rose', fill: 'fill-rose', text: 'text-rose' },
  { dot: 'dot-teal', fill: 'fill-teal', text: 'text-teal' }
];

export const AdminDashboard = () => {
  const { metrics, weeklyTrend = [], cases = [], escalationRequests = [], schemes: contextSchemes = [], fetchCases, fetchApplicationStats, casesLoading = false } = useAdmin();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [liveSchemes, setLiveSchemes] = useState(() => contextSchemes.length > 0 ? contextSchemes : schemeService.getCachedSchemes());

  // Refresh live statistics and schemes on dashboard mount
  useEffect(() => {
    if (typeof fetchCases === 'function') fetchCases();
    if (typeof fetchApplicationStats === 'function') fetchApplicationStats();

    // Fetch live schemes from schemeService (uses SWR)
    schemeService.fetchSchemes().then((res) => {
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setLiveSchemes(res.data);
      }
    }).catch(() => { });
  }, []);

  // Pick top recent cases for the dashboard table
  const recentCases = cases.slice(0, 6);

  // Maximum value for bar chart height scaling
  const maxWeekly = Math.max(...weeklyTrend.map(d => d.count), 1);

  // Dynamic calculation for Government Schemes distribution from actual active cases
  const { schemeStats, totalMappedCases, liveApprovalRate, maxCoverageText } = useMemo(() => {
    const totalCasesCount = cases.length || 0;
    const activeSchemesList = liveSchemes.length > 0 ? liveSchemes : [
      { id: '1', code: 'MJPJAY', name: 'Mahatma Jyotirao Phule Jan Arogya', maxCoverageVal: 150000, coverageAmount: '₹1.5 Lakh' },
      { id: '2', code: 'PM-JAY', name: 'Ayushman Bharat PM-JAY', maxCoverageVal: 500000, coverageAmount: '₹5.0 Lakh' },
      { id: '3', code: 'CMRF', name: 'Chief Minister Relief Fund', maxCoverageVal: 250000, coverageAmount: '₹2.5 Lakh' },
      { id: '4', code: 'MPKAY', name: 'Police Kutumb Arogya Yojana', maxCoverageVal: 300000, coverageAmount: '₹3.0 Lakh' }
    ];

    let matchedCasesCount = 0;
    const computed = activeSchemesList.map((scheme, index) => {
      const codeClean = (scheme.code || '').trim().toUpperCase();
      const nameClean = (scheme.name || '').trim().toUpperCase();

      // Count cases matching this scheme
      const count = cases.filter((c) => {
        const cScheme = String(c.scheme || '').toUpperCase();
        return cScheme.includes(codeClean) || (nameClean && cScheme.includes(nameClean));
      }).length;

      matchedCasesCount += count;
      const palette = SCHEME_COLOR_PALETTE[index % SCHEME_COLOR_PALETTE.length];

      return {
        id: scheme.id || scheme.code,
        code: scheme.code || 'SCHEME',
        name: scheme.name || scheme.code,
        count,
        coverageAmount: scheme.coverageAmount || '₹1.5L - ₹5.0L',
        palette
      };
    });

    // Capture unmapped cases under "Other Welfare Aid"
    const unmappedCount = Math.max(0, totalCasesCount - matchedCasesCount);
    if (unmappedCount > 0) {
      computed.push({
        id: 'other-aid',
        code: 'Other Aid',
        name: 'Direct Medical Relief / Hospital Grants',
        count: unmappedCount,
        coverageAmount: 'Emergency Aid',
        palette: SCHEME_COLOR_PALETTE[computed.length % SCHEME_COLOR_PALETTE.length]
      });
    }

    // Sort by highest case volume and take top 4
    const totalEffectiveCases = computed.reduce((sum, item) => sum + item.count, 0);
    const topSchemes = computed
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((item) => ({
        ...item,
        percentage: totalEffectiveCases > 0 ? Math.round((item.count / totalEffectiveCases) * 100) : 0
      }));

    // Dynamic pre-auth approval rate calculation from active case states
    const approvedOrActiveCases = cases.filter((c) => {
      const st = String(c.status || '').toLowerCase();
      return st.includes('active') || st.includes('treatment') || st.includes('coordinated') || st.includes('approved') || st.includes('closed');
    }).length;

    const approvalRate = totalCasesCount > 0
      ? Math.min(100, Math.round((approvedOrActiveCases / totalCasesCount) * 100 * 10) / 10)
      : 0;

    return {
      schemeStats: topSchemes,
      totalMappedCases: totalEffectiveCases,
      liveApprovalRate: approvalRate,
      maxCoverageText: '₹5.0 Lakh'
    };
  }, [cases, liveSchemes]);

  return (
    <div className="admin-dashboard-page">
      {/* 4 Top KPI Stat Cards - Fully Dynamic & Synchronized */}
      <div className="admin-kpi-grid">
        <div className="kpi-card border-purple" onClick={() => navigate('/admin/cases?tab=All')} title="View Total Applications">
          <div className="kpi-top-row">
            <div className="kpi-value text-purple">{metrics.totalApplications || cases.length}</div>
            <div className="kpi-icon-bubble bg-purple-subtle text-purple">
              <FileText size={18} />
            </div>
          </div>
          <div className="kpi-label">{t('dashboard.totalApplications', 'Total Applications')}</div>
        </div>

        <div className="kpi-card border-amber" onClick={() => navigate('/admin/cases?tab=Pending Review')} title="Filter Pending Review Cases">
          <div className="kpi-top-row">
            <div className="kpi-value text-amber">{metrics.pendingReview || 0}</div>
            <div className="kpi-icon-bubble bg-amber-subtle text-amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-label">{t('dashboard.pendingReview', 'Pending Review')}</div>
        </div>

        <div className="kpi-card border-green" onClick={() => navigate('/admin/cases?tab=Approved & Active')} title="Filter Approved & Active Cases">
          <div className="kpi-top-row">
            <div className="kpi-value text-green">{metrics.activeCases || 0}</div>
            <div className="kpi-icon-bubble bg-green-subtle text-green">
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi-label">{t('dashboard.approvedActive', 'Approved & Active')}</div>
        </div>

        <div className="kpi-card border-blue" onClick={() => navigate('/admin/cases?tab=Docs Required')} title="Filter Docs Required / On Hold Cases">
          <div className="kpi-top-row">
            <div className="kpi-value text-blue">{metrics.docsRequired || 0}</div>
            <div className="kpi-icon-bubble bg-blue-subtle text-blue">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-label">{t('dashboard.docsRequiredHold', 'Docs Required / Hold')}</div>
        </div>
      </div>

      {/* Middle Row: Cases This Week (Bar Chart) & Dynamic Government Schemes Distribution */}
      <div className="admin-middle-grid">
        {/* Cases This Week */}
        <div className="admin-panel-card">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <h3 className="panel-title">{t('dashboard.casesThisWeek', 'Cases This Week')}</h3>
              <span className="live-status-pill">{t('dashboard.liveActivity', 'Live Activity')}</span>
            </div>
            <Link to="/admin/reports" className="panel-action-link">
              {t('dashboard.fullReport', 'Full report')} <ArrowRight size={14} />
            </Link>
          </div>

          <div className="panel-body">
            {/* Custom Bar Chart */}
            <div className="week-barchart-container">
              <div className="chart-bars-row">
                {weeklyTrend.map((item) => {
                  const heightPercent = Math.round((item.count / maxWeekly) * 85);
                  let barClass = 'bar-standard-blue';
                  if (item.isPeak) barClass = 'bar-peak-green';
                  if (item.isSunday) barClass = 'bar-sunday-orange';

                  return (
                    <div key={item.day} className="chart-col">
                      <div className="chart-bar-track">
                        <div
                          className={`chart-bar-fill ${barClass}`}
                          style={{ height: `${heightPercent}%` }}
                          title={`${item.day}: ${item.count} cases`}
                        >
                          <span className="bar-tooltip">{item.count}</span>
                        </div>
                      </div>
                      <span className="chart-label">{item.day}</span>
                    </div>
                  );
                })}
              </div>

              {/* IPD / OPD Summary Boxes */}
              <div className="chart-sub-boxes">
                <div className="sub-stat-pill pill-blue">
                  <span className="sub-stat-num text-blue">{metrics.ipdCases}</span>
                  <span className="sub-stat-name">{t('dashboard.ipdInpatient', 'IPD Inpatient Cases')}</span>
                </div>
                <div className="sub-stat-pill pill-green">
                  <span className="sub-stat-num text-green">{metrics.opdCases}</span>
                  <span className="sub-stat-name">{t('dashboard.opdOutpatient', 'OPD Outpatient Cases')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Government Schemes Distribution */}
        <div className="admin-panel-card scheme-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <h3 className="panel-title">{t('dashboard.govtSchemesCoverage', 'Government Schemes & Coverage')}</h3>
              <span className="status-indicator-dot-green" title="Live Dynamic Aggregation Active"></span>
            </div>
            <Link to="/admin/schemes" className="panel-action-link">
              {t('dashboard.manageSchemes', 'Manage schemes')} <ArrowRight size={14} />
            </Link>
          </div>

          <div className="panel-body">
            <div className="scheme-bars-container">
              {schemeStats.map((item) => (
                <div
                  key={item.id}
                  className="scheme-item-row"
                  onClick={() => navigate(`/admin/cases?search=${encodeURIComponent(item.code)}`)}
                  title={`View all ${item.code} cases`}
                >
                  <div className="scheme-row-header">
                    <div className="scheme-name-group">
                      <span className={`scheme-color-dot ${item.palette.dot}`}></span>
                      <span className="scheme-name">{item.code}</span>
                      <span className="scheme-full-desc">{item.name}</span>
                    </div>
                    <span className="scheme-count-text">
                      {item.percentage}% ({item.count} {item.count === 1 ? 'case' : 'cases'})
                    </span>
                  </div>
                  <div className="scheme-bar-track">
                    <div
                      className={`scheme-bar-fill ${item.palette.fill}`}
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Sub-Stat Boxes dynamically calculated */}
            <div className="chart-sub-boxes">
              <div className="sub-stat-pill pill-indigo">
                <span className="sub-stat-num text-indigo">{liveApprovalRate}%</span>
                <span className="sub-stat-name">{t('dashboard.liveApprovalRate', 'Live Pre-Auth Approval Rate')}</span>
              </div>
              <div className="sub-stat-pill pill-teal">
                <span className="sub-stat-num text-teal">{maxCoverageText}</span>
                <span className="sub-stat-name">{t('dashboard.maxCashlessCoverage', 'Max Cashless Coverage')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Cases */}
      <div className="admin-panel-card recent-cases-panel">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3 className="panel-title">{t('dashboard.recentCases', 'Recent Cases')}</h3>
            <span className="status-indicator-dot-green" title="Live data feed active"></span>
          </div>
          <Link to="/admin/cases" className="panel-action-link">
            {t('dashboard.viewAllCases', 'View all cases')} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{t('dashboard.caseId', 'CASE ID')}</th>
                <th>{t('dashboard.patient', 'PATIENT')}</th>
                <th>{t('dashboard.status', 'STATUS')}</th>
                <th>{t('dashboard.hospital', 'HOSPITAL')}</th>
                <th>{t('dashboard.scheme', 'SCHEME')}</th>
                <th>{t('dashboard.operator', 'OPERATOR')}</th>
                <th>{t('dashboard.lastUpdate', 'LAST UPDATE')}</th>
              </tr>
            </thead>
            <tbody>
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13px' }}>
                    No recent applications found
                  </td>
                </tr>
              ) : (
                recentCases.map((item) => {
                  const cIdStr = String(item.id || item.caseId || item.applicationNumber || item.uuid || '').toLowerCase().trim();
                  const matchingEscalation = (escalationRequests || []).find((r) => {
                    const rIdStr = String(r.caseId || r.applicationId || r.application_id || r.id || '').toLowerCase().trim();
                    return cIdStr && rIdStr && (cIdStr === rIdStr || rIdStr.includes(cIdStr) || cIdStr.includes(rIdStr));
                  });

                  const isEscalationActive = Boolean(
                    matchingEscalation && (
                      matchingEscalation.status === 'on_hold' ||
                      matchingEscalation.status === 'OPEN' ||
                      matchingEscalation.status === 'PENDING' ||
                      matchingEscalation.putOnHold ||
                      (!matchingEscalation.resolvedAt && matchingEscalation.status !== 'resolved' && matchingEscalation.status !== 'RESOLVED')
                    )
                  );

                  const isEscalationResolved = Boolean(
                    (matchingEscalation && (
                      matchingEscalation.status === 'resolved' ||
                      matchingEscalation.status === 'RESOLVED' ||
                      Boolean(matchingEscalation.resolvedAt)
                    )) ||
                    item.isBillResolved ||
                    item.isTransferred ||
                    String(item.status || '').toLowerCase().includes('bill resolved') ||
                    String(item.status || '').toLowerCase().includes('reassigned') ||
                    String(item.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
                    String(item.remarks || '').toLowerCase().includes('[admin bill resolution]') ||
                    String(item.remarks || '').includes('REASSIGNED CASE')
                  );

                  const escReasonType = String(matchingEscalation?.reasonType || matchingEscalation?.reason_type || '').toLowerCase();
                  const escReasonTitle = String(matchingEscalation?.reasonTitle || matchingEscalation?.escalation_reason || '').toLowerCase();
                  const escReasonBadge = String(matchingEscalation?.reasonBadge || '').toLowerCase();

                  const isBillEscalation = Boolean(
                    escReasonType === 'bill_exceeded' ||
                    escReasonTitle.includes('bill') ||
                    escReasonBadge.includes('bill') ||
                    item.isBillResolved ||
                    String(item.status || '').toLowerCase().includes('bill resolved') ||
                    String(item.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
                    String(item.remarks || '').toLowerCase().includes('[admin bill resolution]')
                  );

                  const isSpecialtyOrTransferEscalation = Boolean(
                    escReasonType === 'specialty_unavailable' ||
                    escReasonType === 'emergency_transfer' ||
                    escReasonTitle.includes('specialty') ||
                    escReasonTitle.includes('transfer') ||
                    escReasonBadge.includes('specialty') ||
                    escReasonBadge.includes('reassigned') ||
                    matchingEscalation?.requiredSpecialty ||
                    matchingEscalation?.assignedNewHospital ||
                    matchingEscalation?.assignedNewSevak ||
                    item.isTransferred ||
                    String(item.status || '').toLowerCase().includes('reassigned') ||
                    String(item.remarks || '').includes('REASSIGNED CASE')
                  );

                  const hasSevakDocsPending = Boolean(
                    item.sevakDocsRequired ||
                    item.isSevakDocPending ||
                    String(item.status || '').toLowerCase() === 'doc pending from sevak' ||
                    (Array.isArray(item.documents) && item.documents.some((d) => {
                      const isExplicitlyRequested = Boolean(
                        d.requested ||
                        d.status === 'PENDING_SEVAK_UPLOAD' ||
                        d.document_status === 'PENDING_SEVAK_UPLOAD' ||
                        d.status === 'REQUESTED' ||
                        d.document_status === 'REQUESTED'
                      );
                      const isNotUploaded = !d.uploaded && (!d.file || d.file === 'Pending Upload' || d.file === '') && !d.fileUrl && !d.file_url && !d.document_url && !d.url;
                      const isNotVerified = !d.verified && d.status !== 'VERIFIED' && d.document_status !== 'VERIFIED';
                      const isFromSevak = d.requestedFrom === 'sevak' || d.requestedFrom === 'ArogyaSevak' || d.requested_from === 'SEVAK' || isExplicitlyRequested;

                      return isExplicitlyRequested && isNotUploaded && isNotVerified && isFromSevak;
                    }))
                  );

                  let badgeStyle = 'badge-blue';
                  let displayStatus = item.status || 'Submitted';

                  if (isEscalationActive) {
                    if (isBillEscalation) {
                      displayStatus = '⚡ Bill Exceeded';
                      badgeStyle = 'badge-red';
                    } else if (escReasonType === 'specialty_unavailable' || escReasonTitle.includes('specialty') || escReasonBadge.includes('specialty') || matchingEscalation?.requiredSpecialty) {
                      displayStatus = '⚡ Specialty Unavailable';
                      badgeStyle = 'badge-purple';
                    } else if (escReasonType === 'bed_unavailable' || escReasonType === 'icu_bed_unavailable' || escReasonTitle.includes('bed')) {
                      displayStatus = '⚡ Bed Unavailable';
                      badgeStyle = 'badge-red';
                    } else if (escReasonType === 'emergency_transfer' || escReasonTitle.includes('transfer')) {
                      displayStatus = '⚡ Hospital Transfer';
                      badgeStyle = 'badge-teal';
                    } else {
                      displayStatus = `⚡ ${matchingEscalation?.reasonBadge || 'Priority Request'}`;
                      badgeStyle = 'badge-amber';
                    }
                  } else if (
                    isEscalationResolved &&
                    ['REASSIGNED & COORDINATED', 'BILL RESOLVED & APPROVED', 'COORDINATED', 'REASSIGNED'].includes(String(item.status || '').toUpperCase())
                  ) {
                    if (isBillEscalation) {
                      displayStatus = 'Bill Limit Resolved ✓';
                      badgeStyle = 'badge-green';
                    } else if (isSpecialtyOrTransferEscalation) {
                      displayStatus = 'Transferred & Coordinated';
                      badgeStyle = 'badge-green';
                    } else {
                      displayStatus = 'Priority Resolved ✓';
                      badgeStyle = 'badge-green';
                    }
                  } else {
                    displayStatus = item.status || displayStatus;
                    if (hasSevakDocsPending) {
                      displayStatus = 'Doc Pending from Sevak';
                      badgeStyle = 'badge-amber';
                    } else if (item.status === 'Treatment Started' || item.status === 'Active') {
                      badgeStyle = 'badge-green';
                    } else if (item.status === 'Docs Required') {
                      badgeStyle = 'badge-red';
                    } else if (item.status === 'Coordinated' || item.status === 'Hospital, Sevak Assigned') {
                      badgeStyle = 'badge-yellow';
                    } else if (item.status === 'Docs Verified') {
                      badgeStyle = 'badge-blue';
                    } else if (item.status === 'Closed' || item.status === 'Discharged') {
                      badgeStyle = 'badge-gray';
                    } else if (item.status === 'Submitted') {
                      badgeStyle = 'badge-gray';
                    }
                  }

                  const handleRowClick = () => {
                    if (matchingEscalation && isEscalationActive) {
                      navigate(`/admin/escalations/detail/${matchingEscalation.id || matchingEscalation.uuid || item.id}`);
                    } else if (isEscalationResolved) {
                      navigate(`/admin/cases/${item.id || item.caseId || item.applicationNumber || item.uuid}`);
                    } else {
                      navigate(getCaseTargetUrl(item));
                    }
                  };

                  return (
                    <tr
                      key={item.id}
                      className="clickable-row"
                      onClick={handleRowClick}
                    >
                      <td className="case-id-cell">{item.id}</td>
                      <td className="patient-cell">{item.applicant}</td>
                      <td>
                        <span className={`status-pill ${badgeStyle}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="hospital-cell">{item.hospitalShort || item.hospital}</td>
                      <td>{item.scheme}</td>
                      <td className="operator-cell">{item.operator}</td>
                      <td className="update-time-cell">{item.lastUpdate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
