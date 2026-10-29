import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Phone,
  Building2,
  ChevronDown,
  Award,
  FileText,
  CheckCircle2,
  HeartPulse,
  Share2,
  UserPlus,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Printer,
  X,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
  Check,
  FileBarChart,
  UserCheck
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import './Referrals.css';

export const Referrals = () => {
  const { cases = [] } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReferrers, setExpandedReferrers] = useState({});

  // Unified Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'single'
  const [selectedReferrerName, setSelectedReferrerName] = useState('');
  const [printableReportData, setPrintableReportData] = useState(null);
  const printSectionRef = useRef(null);

  const RECOMMENDER_TYPE_MAP = {
    corporator: 'Corporator / नगरसेवक',
    public_trust: 'Public Trust / सार्वजनिक ट्रस्ट',
    private_trust: 'Private Trust / खाजगी ट्रस्ट',
    mla: 'MLA / आमदार',
    pm: 'PM / पंतप्रधान',
    other: 'Other / इतर',
  };

  // Format name to proper Title Case (e.g. "om kolekar" / "Om kolekar" -> "Om Kolekar")
  const formatReferrerName = (name) => {
    if (!name || !name.trim()) return 'Direct / Unassigned';
    let trimmed = name.trim();

    // Strip leading type prefixes like "[Corporator] " or "MLA - " for clean person name
    if (trimmed.startsWith('[') && trimmed.includes(']')) {
      trimmed = trimmed.substring(trimmed.indexOf(']') + 1).trim();
    } else if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      if (parts.length > 1 && parts[1].trim()) {
        trimmed = parts.slice(1).join(' - ').trim();
      }
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'direct / unassigned' || lower === 'direct / self' || lower === 'direct' || lower === 'unassigned' || !lower) {
      return 'Direct / Unassigned';
    }
    return trimmed
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Extract friendly recommender designation / type
  const getReferrerRoleLabel = (c, rawReferrer) => {
    if (c.referralCustomType) return c.referralCustomType.trim();
    if (c.referralType && RECOMMENDER_TYPE_MAP[c.referralType.toLowerCase()]) {
      return RECOMMENDER_TYPE_MAP[c.referralType.toLowerCase()];
    }
    if (c.referralType) {
      return c.referralType.charAt(0).toUpperCase() + c.referralType.slice(1);
    }
    if (rawReferrer && rawReferrer.startsWith('[') && rawReferrer.includes(']')) {
      return rawReferrer.substring(1, rawReferrer.indexOf(']')).trim();
    }
    if (rawReferrer && rawReferrer.includes(' - ')) {
      const parts = rawReferrer.split(' - ');
      if (parts[0].trim()) return parts[0].trim();
    }
    return c.referrerRole || 'Community Representative';
  };

  // Normalize key to guarantee case-insensitive deduplication
  const getReferrerKey = (name) => {
    if (!name || !name.trim()) return 'direct / unassigned';
    const cleanName = formatReferrerName(name);
    const lower = cleanName.toLowerCase().replace(/\s+/g, ' ');
    if (lower === 'direct / self' || lower === 'direct' || lower === 'unassigned') return 'direct / unassigned';
    return lower;
  };

  // Group cases dynamically by Referrer (case-insensitive deduplication)
  const referrerGroups = useMemo(() => {
    const map = {};

    (cases || []).forEach((c) => {
      // Extract referrer name & role (default to Unassigned / Direct Submission if missing)
      const rawReferrer = c.referralFullName || c.referralName || c.referredBy || c.referred_by || c.referrer || '';
      const referrerName = formatReferrerName(c.referralFullName || c.referralName || rawReferrer);
      const refKey = getReferrerKey(referrerName);
      const referrerPhone = c.referrerPhone || (c.contact && c.contact !== 'N/A' ? c.contact : 'N/A');
      const referrerRole = getReferrerRoleLabel(c, rawReferrer);

      if (!map[refKey]) {
        map[refKey] = {
          key: refKey,
          name: referrerName,
          phone: referrerPhone,
          role: referrerRole,
          district: c.district || 'Pune Region',
          totalCases: 0,
          activeCases: 0,
          docsRequiredCases: 0,
          pendingCases: 0,
          rejectedCases: 0,
          casesList: []
        };
      } else {
        // Enrich phone or details if previously missing
        if ((!map[refKey].phone || map[refKey].phone === 'N/A') && referrerPhone && referrerPhone !== 'N/A') {
          map[refKey].phone = referrerPhone;
        }
        if ((map[refKey].role === 'Community Representative' || !map[refKey].role) && referrerRole && referrerRole !== 'Community Representative') {
          map[refKey].role = referrerRole;
        }
      }

      map[refKey].totalCases += 1;
      map[refKey].casesList.push(c);

      const st = (c.status || '').toLowerCase();
      if (st.includes('treatment') || st.includes('coordinated') || st.includes('active')) {
        map[refKey].activeCases += 1;
      } else if (st.includes('docs')) {
        map[refKey].docsRequiredCases += 1;
      } else if (st.includes('pending') || st.includes('review') || st.includes('submitted')) {
        map[refKey].pendingCases += 1;
      } else if (st.includes('reject')) {
        map[refKey].rejectedCases += 1;
      }
    });

    // Convert to array sorted by total cases referred (descending)
    return Object.values(map).sort((a, b) => b.totalCases - a.totalCases);
  }, [cases]);

  // Overall Referral KPI Calculations
  const totalReferredCases = useMemo(() => {
    return referrerGroups.reduce((acc, curr) => acc + curr.totalCases, 0);
  }, [referrerGroups]);

  const totalReferrersCount = referrerGroups.filter((r) => r.key !== 'direct / unassigned' && r.name !== 'Direct / Unassigned').length;

  const topReferrer = referrerGroups.find((r) => r.key !== 'direct / unassigned' && r.name !== 'Direct / Unassigned') || { name: 'None', totalCases: 0 };

  const totalSuccessfulAllocations = useMemo(() => {
    return referrerGroups.reduce((acc, curr) => acc + curr.activeCases, 0);
  }, [referrerGroups]);

  // Filter referrers based on search query
  const filteredReferrers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return referrerGroups;
    return referrerGroups.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q)) ||
        (r.district && r.district.toLowerCase().includes(q)) ||
        r.casesList.some(
          (c) =>
            c.patient?.toLowerCase().includes(q) ||
            c.applicant?.toLowerCase().includes(q) ||
            c.id?.toLowerCase().includes(q)
        )
      );
    });
  }, [referrerGroups, searchQuery]);

  // Toggle card expansion
  const toggleExpand = (keyOrName) => {
    const k = (keyOrName || '').toLowerCase();
    setExpandedReferrers((prev) => ({
      ...prev,
      [k]: !prev[k]
    }));
  };

  // Helper: Open the unified export dialog
  const handleOpenExportModal = (targetReferrerName = null) => {
    if (targetReferrerName) {
      setExportScope('single');
      setSelectedReferrerName(targetReferrerName);
    } else {
      setExportScope('all');
      if (!selectedReferrerName && referrerGroups.length > 0) {
        setSelectedReferrerName(referrerGroups[0].name);
      }
    }
    setExportModalOpen(true);
  };

  // Helper: CSV escape
  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Export Single Referrer to CSV
  const exportSingleReferrerCSV = (referrerObj) => {
    if (!referrerObj || !referrerObj.casesList) return;

    const headers = [
      'Case ID',
      'Scheme',
      'Patient Name',
      'Applicant Name',
      'Age',
      'Gender',
      'Patient Contact',
      'District / Location',
      'Assigned Hospital',
      'Assigned ArogyaSevak',
      'Medical Condition',
      'Submitted Date',
      'Status',
      'Referred By',
      'Referrer Role',
      'Referrer Phone'
    ];

    const rows = referrerObj.casesList.map((c) => [
      escapeCSV(c.id),
      escapeCSV(c.scheme || 'N/A'),
      escapeCSV(c.patient || c.applicant || 'N/A'),
      escapeCSV(c.applicant || c.patient || 'N/A'),
      escapeCSV(c.age || '—'),
      escapeCSV(c.gender || '—'),
      escapeCSV(c.contact || '—'),
      escapeCSV(c.district || referrerObj.district || 'Pune'),
      escapeCSV(c.hospital || 'Unassigned'),
      escapeCSV(c.assignedSevak || 'Not assigned'),
      escapeCSV(c.condition || 'General Treatment'),
      escapeCSV(c.submittedDate || c.submittedDateShort || '—'),
      escapeCSV(c.status || 'Pending Review'),
      escapeCSV(referrerObj.name),
      escapeCSV(referrerObj.role),
      escapeCSV(referrerObj.phone)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = referrerObj.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Referral_Report_${cleanName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export All Referred Persons & Cases to CSV
  const exportAllReferrersCSV = () => {
    const headers = [
      'Case ID',
      'Scheme',
      'Patient Name',
      'Applicant Name',
      'Age',
      'Gender',
      'Patient Contact',
      'District / Location',
      'Assigned Hospital',
      'Assigned ArogyaSevak',
      'Medical Condition',
      'Submitted Date',
      'Status',
      'Referred By',
      'Referrer Role',
      'Referrer Phone'
    ];

    const rows = [];
    referrerGroups.forEach((r) => {
      (r.casesList || []).forEach((c) => {
        rows.push([
          escapeCSV(c.id),
          escapeCSV(c.scheme || 'N/A'),
          escapeCSV(c.patient || c.applicant || 'N/A'),
          escapeCSV(c.applicant || c.patient || 'N/A'),
          escapeCSV(c.age || '—'),
          escapeCSV(c.gender || '—'),
          escapeCSV(c.contact || '—'),
          escapeCSV(c.district || r.district || 'Pune'),
          escapeCSV(c.hospital || 'Unassigned'),
          escapeCSV(c.assignedSevak || 'Not assigned'),
          escapeCSV(c.condition || 'General Treatment'),
          escapeCSV(c.submittedDate || c.submittedDateShort || '—'),
          escapeCSV(c.status || 'Pending Review'),
          escapeCSV(r.name),
          escapeCSV(r.role),
          escapeCSV(r.phone)
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Referred_Persons_Cases_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Download CSV from Modal
  const handleDownloadReportFromModal = () => {
    if (exportScope === 'all') {
      exportAllReferrersCSV();
      setExportModalOpen(false);
    } else {
      const targetObj = referrerGroups.find((r) => r.name.toLowerCase() === (selectedReferrerName || '').toLowerCase() || (r.key && r.key === (selectedReferrerName || '').toLowerCase())) || referrerGroups[0];
      if (targetObj) {
        exportSingleReferrerCSV(targetObj);
        setExportModalOpen(false);
      }
    }
  };

  // Handle View / Print Report from Modal
  const handleViewPrintableReportFromModal = () => {
    if (exportScope === 'all') {
      setPrintableReportData({
        type: 'all',
        title: 'All Referred Persons Comprehensive Telemetry Report',
        referrers: referrerGroups,
        totalCases: totalReferredCases,
        activeCases: totalSuccessfulAllocations
      });
    } else {
      const targetObj = referrerGroups.find((r) => r.name.toLowerCase() === (selectedReferrerName || '').toLowerCase() || (r.key && r.key === (selectedReferrerName || '').toLowerCase())) || referrerGroups[0];
      if (targetObj) {
        setPrintableReportData({
          type: 'single',
          title: `Referral Performance Report — ${targetObj.name}`,
          referrer: targetObj
        });
      }
    }
    setExportModalOpen(false);
  };

  // Trigger browser print
  const handlePrintModal = () => {
    window.print();
  };

  return (
    <div className="referrals-container">
      {/* Top KPI Cards: Referral Performance Overview */}
      <div className="referrals-kpi-grid">
        <div className="referrals-kpi-card border-blue">
          <div className="kpi-value text-blue">{totalReferredCases}</div>
          <div className="kpi-label">Total Referred Cases</div>
        </div>

        <div className="referrals-kpi-card border-green">
          <div className="kpi-value text-green">{totalReferrersCount}</div>
          <div className="kpi-label">Active Referral Persons</div>
        </div>

        <div className="referrals-kpi-card border-purple">
          <div className="kpi-value text-purple">{totalSuccessfulAllocations}</div>
          <div className="kpi-label">Treatment Started Cases</div>
        </div>

        <div className="referrals-kpi-card border-orange">
          <div className="kpi-value text-orange" style={{ fontSize: '1.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topReferrer.name}
          </div>
          <div className="kpi-label">Top Performer ({topReferrer.totalCases} Cases)</div>
        </div>
      </div>

      {/* Search & Filter Header Bar with Single Export Report Button */}
      <div className="referrals-search-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
          <Share2 size={20} color="#2563eb" />
          Referral Person Performance Directory
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="referrals-search-input-wrap">
            <Search size={16} className="search-icon-fixed" />
            <input
              type="text"
              placeholder="Search by referrer name, contact, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Single Unified Export Report Button */}
          <button
            type="button"
            className="btn-export-main-trigger"
            onClick={() => handleOpenExportModal()}
            title="Export report of a particular referred person or all referred persons"
          >
            <Download size={15} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Referrers Leaderboard Cards List */}
      <div className="referrals-cards-wrapper">
        {filteredReferrers.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', textAlign: 'center', border: '1px solid #eef2f6', color: '#94a3b8' }}>
            No referral persons found matching your search query.
          </div>
        ) : (
          filteredReferrers.map((referrer) => {
            const isExpanded = !!expandedReferrers[(referrer.key || referrer.name || '').toLowerCase()]; // Collapsed by default, expands on click

            // Initials for avatar pill
            const initials = referrer.name
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={referrer.key || referrer.name} className="referrer-performance-card">
                {/* Referrer Header Banner */}
                <div
                  className="referrer-card-header"
                  onClick={() => toggleExpand(referrer.key || referrer.name)}
                >
                  <div className="referrer-info-left">
                    <div className="referrer-avatar-pill">{initials}</div>
                    <div className="referrer-details">
                      <div className="referrer-name">{referrer.name}</div>
                      <div className="referrer-subtext">
                        <span style={{ fontWeight: 600, color: '#3b82f6', background: '#eff6ff', padding: '1px 8px', borderRadius: '4px' }}>
                          {referrer.role}
                        </span>
                        <span>·</span>
                        <Phone size={12} color="#64748b" />
                        <span style={{ fontFamily: 'monospace' }}>{referrer.phone}</span>
                        <span>·</span>
                        <span>{referrer.district}</span>
                      </div>
                    </div>
                  </div>

                  <div className="referrer-stats-right">
                    <div className="total-cases-badge">
                      <FileText size={15} />
                      {referrer.totalCases} Referred {referrer.totalCases === 1 ? 'Case' : 'Cases'}
                    </div>

                    {referrer.activeCases > 0 && (
                      <span className="active-treatment-pill">
                        ● {referrer.activeCases} Active Treatment
                      </span>
                    )}

                    <div className={`toggle-arrow-btn ${isExpanded ? 'open' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Expandable Accordion: Grouped Cases List */}
                {isExpanded && (
                  <div className="referred-cases-drawer">
                    <div className="drawer-title">
                      <div>
                        <span>Referred Citizen Applications ({referrer.casesList.length})</span>
                        <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', fontWeight: 600, textTransform: 'none', marginTop: '2px' }}>
                          Submitted by Citizens referencing {referrer.name}
                        </span>
                      </div>
                    </div>

                    <table className="referred-cases-table">
                      <thead>
                        <tr>
                          <th>CASE ID & SCHEME</th>
                          <th>PATIENT / APPLICANT NAME</th>
                          <th>CONTACT & LOCATION</th>
                          <th>ASSIGNED HOSPITAL & SEVAK</th>
                          <th>DISEASE / CONDITION</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrer.casesList.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
                                {c.id}
                              </div>
                              <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                                {c.scheme}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {c.patient || c.applicant}
                              </div>
                              {c.applicant && c.applicant !== c.patient && (
                                <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                                  Applicant: {c.applicant}
                                </div>
                              )}
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Age {c.age} · {c.gender} · {c.type || 'IPD'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontFamily: 'monospace', color: '#334155' }}>
                                {c.contact}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                                {c.district || 'Pune'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {c.hospital || 'Unassigned'}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                                Sevak: {c.assignedSevak || 'Not assigned'}
                              </div>
                            </td>
                            <td>
                              <div style={{ color: '#475569', fontWeight: 600, maxWidth: '180px' }}>
                                {c.condition || 'General Treatment'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Submitted: {c.submittedDateShort || c.submittedDate}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: '9999px',
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  backgroundColor:
                                    c.status === 'Treatment Started' ? '#dcfce7' :
                                    c.status === 'Docs Required' ? '#fef3c7' :
                                    c.status === 'Pending Review' ? '#eff6ff' :
                                    c.status === 'Rejected' ? '#fef2f2' : '#f1f5f9',
                                  color:
                                    c.status === 'Treatment Started' ? '#15803d' :
                                    c.status === 'Docs Required' ? '#b45309' :
                                    c.status === 'Pending Review' ? '#1d4ed8' :
                                    c.status === 'Rejected' ? '#dc2626' : '#475569'
                                }}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          Export Configuration Modal (Single button triggers this selector)
          ========================================================================= */}
      {exportModalOpen && (
        <div className="referrer-report-modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="export-config-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="export-modal-icon-badge">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="export-modal-title">Export Referral Performance Report</h3>
                  <p className="export-modal-desc">
                    Select whether to download the report for a particular referred person or all referred persons
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setExportModalOpen(false)}
                title="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="export-modal-body">
              <label className="export-scope-label">Select Report Scope</label>

              {/* Scope Selection Options */}
              <div className="export-options-grid">
                {/* Option 1: All Referred Persons */}
                <div
                  className={`export-option-card ${exportScope === 'all' ? 'is-selected' : ''}`}
                  onClick={() => setExportScope('all')}
                >
                  <div className="option-radio-indicator">
                    {exportScope === 'all' && <div className="radio-dot" />}
                  </div>
                  <div className="option-info">
                    <div className="option-title">All Referred Persons</div>
                    <div className="option-subtitle">
                      Complete telemetry report covering all <strong>{referrerGroups.length}</strong> referral persons and <strong>{totalReferredCases}</strong> total referred citizen cases.
                    </div>
                  </div>
                </div>

                {/* Option 2: Particular Referred Person */}
                <div
                  className={`export-option-card ${exportScope === 'single' ? 'is-selected' : ''}`}
                  onClick={() => setExportScope('single')}
                >
                  <div className="option-radio-indicator">
                    {exportScope === 'single' && <div className="radio-dot" />}
                  </div>
                  <div className="option-info">
                    <div className="option-title">Particular Referred Person</div>
                    <div className="option-subtitle">
                      Generate a targeted beneficiary case report for a specific referral advocate or representative.
                    </div>
                  </div>
                </div>
              </div>

              {/* Referrer Dropdown Picker (Visible when "Particular Referred Person" is chosen) */}
              {exportScope === 'single' && (
                <div className="export-referrer-picker-wrap">
                  <label className="picker-field-label">Choose Referred Person:</label>
                  <div className="picker-select-box">
                    <UserCheck size={17} className="picker-select-icon" />
                    <select
                      className="picker-native-select"
                      value={selectedReferrerName || (referrerGroups[0]?.name || '')}
                      onChange={(e) => setSelectedReferrerName(e.target.value)}
                    >
                      {referrerGroups.map((r) => (
                        <option key={r.key || r.name} value={r.name}>
                          {r.name} ({r.role}) — {r.totalCases} {r.totalCases === 1 ? 'Case' : 'Cases'} ({r.activeCases} Treatment Active)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="export-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setExportModalOpen(false)}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-modal-view-report"
                  onClick={handleViewPrintableReportFromModal}
                >
                  <Printer size={15} />
                  <span>View / Print Report</span>
                </button>

                <button
                  type="button"
                  className="btn-modal-download-csv"
                  onClick={handleDownloadReportFromModal}
                >
                  <Download size={15} />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Printable Official Report Sheet (For Single Referrer OR All Referrers)
          ========================================================================= */}
      {printableReportData && (
        <div className="referrer-report-modal-overlay" onClick={() => setPrintableReportData(null)}>
          <div className="referrer-report-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Control Bar (Hidden when printing) */}
            <div className="report-modal-header no-print">
              <div className="report-modal-header-left">
                <FileText size={20} color="#2563eb" />
                <div>
                  <h3 className="report-modal-title">{printableReportData.title}</h3>
                  <p className="report-modal-subtitle">
                    Official beneficiary record & telemetry breakdown
                  </p>
                </div>
              </div>

              <div className="report-modal-header-actions">
                <button
                  type="button"
                  className="modal-action-btn btn-csv"
                  onClick={() => {
                    if (printableReportData.type === 'all') {
                      exportAllReferrersCSV();
                    } else {
                      exportSingleReferrerCSV(printableReportData.referrer);
                    }
                  }}
                  title="Download CSV spreadsheet"
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>

                <button
                  type="button"
                  className="modal-action-btn btn-print"
                  onClick={handlePrintModal}
                  title="Print official report / Save PDF"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setPrintableReportData(null)}
                  title="Close report modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Report Document Sheet */}
            <div className="report-document-sheet" ref={printSectionRef}>
              {/* Report Document Header */}
              <div className="doc-header">
                <div className="doc-header-brand">
                  <div className="doc-emblem">🏛️</div>
                  <div>
                    <h2 className="doc-main-title">AROGYAMITRA HEALTHCARE ASSISTANCE SYSTEM</h2>
                    <p className="doc-sub-title">Government of Maharashtra · Public Health & Welfare Welfare Cell</p>
                    <span className="doc-badge">
                      {printableReportData.type === 'all'
                        ? 'COMPREHENSIVE REFERRALS DIRECTORY PERFORMANCE REPORT'
                        : `OFFICIAL REFERRAL PERSON PERFORMANCE REPORT — ${printableReportData.referrer.name.toUpperCase()}`}
                    </span>
                  </div>
                </div>

                <div className="doc-meta-box">
                  <div>
                    <strong>Report Ref:</strong> REF-REP-
                    {printableReportData.type === 'all'
                      ? 'ALL-SUMMARY'
                      : printableReportData.referrer.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}
                    -{new Date().getFullYear()}
                  </div>
                  <div>
                    <strong>Date Generated:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div><strong>Classification:</strong> Official Administrative Telemetry</div>
                  <div><strong>Desk Operator:</strong> Admin Portal Active</div>
                </div>
              </div>

              {/* SINGLE REFERRER VIEW */}
              {printableReportData.type === 'single' && (
                <>
                  {/* Referrer Profile Summary Card */}
                  <div className="doc-profile-card">
                    <div className="profile-main-col">
                      <div className="profile-name-line">
                        <span className="profile-name">{printableReportData.referrer.name}</span>
                        <span className="profile-role-tag">{printableReportData.referrer.role}</span>
                      </div>
                      <div className="profile-meta-grid">
                        <div className="profile-meta-item">
                          <span className="meta-k">Contact Phone:</span>
                          <span className="meta-v">{printableReportData.referrer.phone}</span>
                        </div>
                        <div className="profile-meta-item">
                          <span className="meta-k">Operational Area / District:</span>
                          <span className="meta-v">{printableReportData.referrer.district}</span>
                        </div>
                        <div className="profile-meta-item">
                          <span className="meta-k">Citizens Assisted:</span>
                          <span className="meta-v">{printableReportData.referrer.totalCases} Total Beneficiaries</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-score-col">
                      <div className="score-box">
                        <span className="score-val">
                          {Math.round((printableReportData.referrer.activeCases / Math.max(printableReportData.referrer.totalCases, 1)) * 100)}%
                        </span>
                        <span className="score-lbl">Allocation Success Rate</span>
                      </div>
                    </div>
                  </div>

                  {/* KPI Metrics Summary Grid */}
                  <div className="doc-kpi-grid">
                    <div className="doc-kpi-tile blue">
                      <div className="tile-num">{printableReportData.referrer.totalCases}</div>
                      <div className="tile-lbl">Total Referred Cases</div>
                    </div>
                    <div className="doc-kpi-tile green">
                      <div className="tile-num">{printableReportData.referrer.activeCases}</div>
                      <div className="tile-lbl">Treatment Started / Coordinated</div>
                    </div>
                    <div className="doc-kpi-tile orange">
                      <div className="tile-num">{printableReportData.referrer.docsRequiredCases}</div>
                      <div className="tile-lbl">Documentation Required</div>
                    </div>
                    <div className="doc-kpi-tile purple">
                      <div className="tile-num">{printableReportData.referrer.pendingCases}</div>
                      <div className="tile-lbl">Under Review / Verification</div>
                    </div>
                    <div className="doc-kpi-tile red">
                      <div className="tile-num">{printableReportData.referrer.rejectedCases}</div>
                      <div className="tile-lbl">Ineligible / Rejected</div>
                    </div>
                  </div>

                  {/* Cases Detailed Breakdown Table */}
                  <div className="doc-table-section">
                    <h4 className="doc-section-heading">Detailed Beneficiary Application Registry ({printableReportData.referrer.casesList.length})</h4>
                    <table className="doc-cases-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                          <th>Case ID & Scheme</th>
                          <th>Patient / Beneficiary</th>
                          <th>Age / Sex</th>
                          <th>Contact & Area</th>
                          <th>Assigned Hospital & Sevak</th>
                          <th>Medical Condition</th>
                          <th>Submitted Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printableReportData.referrer.casesList.map((c, idx) => (
                          <tr key={c.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#15803d' }}>{c.id}</strong>
                              <div style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>{c.scheme || 'MJPJAY / PM-JAY'}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.patient || c.applicant}</div>
                              {c.applicant && c.applicant !== c.patient && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Applicant: {c.applicant}</div>
                              )}
                            </td>
                            <td>{c.age || '—'} / {c.gender || '—'}</td>
                            <td>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.contact}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.district || printableReportData.referrer.district}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.hospital || 'Unassigned'}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sevak: {c.assignedSevak || '—'}</div>
                            </td>
                            <td style={{ maxWidth: '160px' }}>{c.condition || 'General Healthcare'}</td>
                            <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{c.submittedDateShort || c.submittedDate || '—'}</td>
                            <td>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  backgroundColor:
                                    c.status === 'Treatment Started' ? '#dcfce7' :
                                    c.status === 'Docs Required' ? '#fef3c7' :
                                    c.status === 'Pending Review' ? '#eff6ff' :
                                    c.status === 'Rejected' ? '#fef2f2' : '#f1f5f9',
                                  color:
                                    c.status === 'Treatment Started' ? '#15803d' :
                                    c.status === 'Docs Required' ? '#b45309' :
                                    c.status === 'Pending Review' ? '#1d4ed8' :
                                    c.status === 'Rejected' ? '#dc2626' : '#475569'
                                }}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ALL REFERRERS VIEW */}
              {printableReportData.type === 'all' && (
                <>
                  {/* Summary KPI grid for all referrers */}
                  <div className="doc-kpi-grid">
                    <div className="doc-kpi-tile blue">
                      <div className="tile-num">{printableReportData.totalCases}</div>
                      <div className="tile-lbl">Total Referred Cases</div>
                    </div>
                    <div className="doc-kpi-tile green">
                      <div className="tile-num">{printableReportData.activeCases}</div>
                      <div className="tile-lbl">Treatment Started Cases</div>
                    </div>
                    <div className="doc-kpi-tile purple">
                      <div className="tile-num">{printableReportData.referrers.length}</div>
                      <div className="tile-lbl">Active Referral Persons</div>
                    </div>
                    <div className="doc-kpi-tile orange">
                      <div className="tile-num">
                        {Math.round((printableReportData.activeCases / Math.max(printableReportData.totalCases, 1)) * 100)}%
                      </div>
                      <div className="tile-lbl">Overall Success Conversion</div>
                    </div>
                    <div className="doc-kpi-tile red">
                      <div className="tile-num">
                        {printableReportData.referrers.reduce((acc, r) => acc + r.rejectedCases, 0)}
                      </div>
                      <div className="tile-lbl">Ineligible / Rejected</div>
                    </div>
                  </div>

                  {/* Referrers Leaderboard Summary Table */}
                  <div className="doc-table-section">
                    <h4 className="doc-section-heading">Referral Persons Performance Summary ({printableReportData.referrers.length})</h4>
                    <table className="doc-cases-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                          <th>Referral Person Name</th>
                          <th>Designation / Role</th>
                          <th>Contact Phone</th>
                          <th>Region / District</th>
                          <th style={{ textAlign: 'center' }}>Total Referred</th>
                          <th style={{ textAlign: 'center' }}>Treatment Started</th>
                          <th style={{ textAlign: 'center' }}>Pending / Docs</th>
                          <th style={{ textAlign: 'center' }}>Success Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printableReportData.referrers.map((r, idx) => {
                          const rate = Math.round((r.activeCases / Math.max(r.totalCases, 1)) * 100);
                          return (
                            <tr key={r.name}>
                              <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                              <td><strong style={{ color: '#0f172a' }}>{r.name}</strong></td>
                              <td><span className="profile-role-tag">{r.role}</span></td>
                              <td style={{ fontFamily: 'monospace' }}>{r.phone}</td>
                              <td>{r.district}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{r.totalCases}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#15803d' }}>{r.activeCases}</td>
                              <td style={{ textAlign: 'center', color: '#d97706' }}>{r.pendingCases + r.docsRequiredCases}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#059669' }}>{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Official Stamp & Signatory Footer */}
              <div className="doc-footer-signature">
                <div className="signature-box">
                  <div className="signature-line">Health Desk Authority</div>
                  <div className="signature-sub">ArogyaMitra Telemetry Operations</div>
                </div>
                <div className="seal-box">
                  <div className="seal-circle">
                    <span>AROGYAMITRA</span>
                    <span>VERIFIED REPORT</span>
                  </div>
                </div>
                <div className="signature-box">
                  <div className="signature-line">Hon. MLA Welfare Cell</div>
                  <div className="signature-sub">Public Welfare Initiative</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
