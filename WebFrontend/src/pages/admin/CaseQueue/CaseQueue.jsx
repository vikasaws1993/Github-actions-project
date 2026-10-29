import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Clock,
  RotateCw,
  Download,
  Phone,
  FileSpreadsheet,
  Calendar,
  Building2,
  UserCheck,
  UserX,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { formatDateDDMMYYYY, getCaseTargetUrl, isCaseAssigned } from '../../../services/applicationService';
import Loader from '@/components/common/Loader/Loader';
import './CaseQueue.css';

export const CaseQueue = () => {
  const {
    cases = [],
    escalationRequests = [],
    getReopenInfo,
    showToast,
    fetchCases,
    fetchApplicationStats,
    operator,
    claimCase,
    unclaimCase,
    assignCaseReviewer,
    casesLoading,
    casesPagination,
    applicationStats,
  } = useAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter & Pagination States
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
      setCurrentPage(1);
    }
  }, [searchParams]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map Tab Keys to API Status
  const tabStatusMap = useMemo(
    () => ({
      All: '',
      'Pending Review': '',
      'Docs Required': '',
      Assigned: '',
      'Treatment Started': '',
      Closed: '',
      'Rejected / Cancelled': '',
    }),
    []
  );

  // Debounce search query to prevent flooding API
  const searchDebounceRef = useRef(null);

  // API Fetch Callback for Case Queue (GET /api/admins/applications)
  const loadCasesFromApi = useCallback(
    async (overrideParams = {}) => {
      const selectedStatus = overrideParams.status !== undefined
        ? overrideParams.status
        : tabStatusMap[activeTab];

      const selectedPriority = overrideParams.priority !== undefined
        ? overrideParams.priority
        : priorityFilter !== 'ALL' ? priorityFilter : '';

      const searchVal = overrideParams.search !== undefined
        ? overrideParams.search
        : searchQuery;

      const pageVal = overrideParams.page !== undefined ? overrideParams.page : currentPage;
      const limitVal = overrideParams.limit !== undefined ? overrideParams.limit : pageSize;
      const offsetVal = (pageVal - 1) * limitVal;

      const params = {
        search: searchVal,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        limit: limitVal,
        offset: offsetVal,
      };

      await fetchCases(params);
      if (fetchApplicationStats) {
        fetchApplicationStats();
      }
    },
    [activeTab, priorityFilter, searchQuery, currentPage, pageSize, tabStatusMap, fetchCases, fetchApplicationStats]
  );

  // Initial load & when Tab or Priority or Page/Size changes
  useEffect(() => {
    loadCasesFromApi();
  }, [activeTab, priorityFilter, currentPage, pageSize]);

  // Handle Search input change with debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      loadCasesFromApi({ search: val, page: 1 });
    }, 350);
  };

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadCasesFromApi();
      showToast('Case queue refreshed from server');
    } catch (err) {
      showToast('Failed to refresh cases', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to check if case has an active priority escalation
  const isCasePriorityEscalated = useCallback((item) => {
    const cIdStr = String(item.id || item.applicationNumber || item.caseId || item.uuid || '').toLowerCase().trim();
    const matchingEsc = (escalationRequests || []).find((r) => {
      const rIdStr = String(r.caseId || r.applicationId || r.application_id || r.id || '').toLowerCase().trim();
      return cIdStr && rIdStr && (cIdStr === rIdStr || rIdStr.includes(cIdStr) || cIdStr.includes(rIdStr));
    });

    const isEscActive = Boolean(
      matchingEsc && (
        matchingEsc.status === 'on_hold' ||
        matchingEsc.status === 'OPEN' ||
        matchingEsc.status === 'PENDING' ||
        matchingEsc.putOnHold ||
        (!matchingEsc.resolvedAt && matchingEsc.status !== 'resolved' && matchingEsc.status !== 'RESOLVED')
      )
    );

    return isEscActive;
  }, [escalationRequests]);

  // Helper to check if case escalation is resolved
  const isCaseEscalationResolved = useCallback((item) => {
    const cIdStr = String(item.id || item.applicationNumber || item.caseId || item.uuid || '').toLowerCase().trim();
    const matchingEsc = (escalationRequests || []).find((r) => {
      const rIdStr = String(r.caseId || r.applicationId || r.application_id || r.id || '').toLowerCase().trim();
      return cIdStr && rIdStr && (cIdStr === rIdStr || rIdStr.includes(cIdStr) || cIdStr.includes(rIdStr));
    });

    return Boolean(
      (matchingEsc && (
        matchingEsc.status === 'resolved' ||
        matchingEsc.status === 'RESOLVED' ||
        Boolean(matchingEsc.resolvedAt)
      )) ||
      item.isBillResolved ||
      item.isTransferred ||
      String(item.status || '').toLowerCase().includes('bill resolved') ||
      String(item.status || '').toLowerCase().includes('reassigned') ||
      String(item.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
      String(item.remarks || '').toLowerCase().includes('[admin bill resolution]') ||
      String(item.remarks || '').includes('REASSIGNED CASE')
    );
  }, [escalationRequests]);

  // Helper to check if case is On Hold / Docs pending
  const isCaseOnHoldDocs = useCallback((item) => {
    const s = String(item.status || item.current_status || '').toUpperCase().trim().replace(/[-\s/]+/g, '_');
    if (s === 'REJECTED' || item.status === 'Rejected') return false;

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
        return isExplicitlyRequested && isNotUploaded && isNotVerified;
      }))
    );

    return Boolean(
      item.isOnHold ||
      hasSevakDocsPending ||
      ['DOCS_REQUIRED', 'REVERTED', 'ON_HOLD', 'DOC_PENDING_FROM_SEVAK'].some((sub) => s.includes(sub)) ||
      item.status === 'Docs Required' ||
      item.status === 'Doc Pending from Sevak' ||
      item.status === 'On Hold / Docs'
    );
  }, []);

  // Categorize each case into its exact tab group
  const getCaseTabCategory = useCallback((item) => {
    const s = String(item.status || item.current_status || '').toUpperCase().trim().replace(/[-\s/]+/g, '_');

    // 1. Rejected
    if (s === 'REJECTED' || item.status === 'Rejected') return 'Rejected';

    // 2. Closed
    if (['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED'].includes(s) || item.status === 'Closed' || item.status === 'Closed / Discharged') {
      return 'Closed';
    }

    // 3. Priority Cases (Active Escalated Priority Cases)
    if (isCasePriorityEscalated(item)) {
      return 'Priority Cases';
    }

    // 4. On Hold / Docs (Pending Docs cases)
    if (isCaseOnHoldDocs(item)) {
      return 'On Hold / Docs';
    }

    // 5. Approved Cases (Approved, Hospital & Sevak Assigned, Treatment Started, Closure Requested, and Resolved Escalated Cases)
    const isApprovedOrResolved =
      isCaseEscalationResolved(item) ||
      ['APPROVED', 'COORDINATED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'SEVAK_HOSPITAL_ASSIGNED', 'REASSIGNED_&_COORDINATED', 'TRANSFERRED', 'BILL_RESOLVED_&_APPROVED', 'TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT', 'POST_OP_RECOVERY', 'CLOSURE_REQUESTED', 'CLOSURE_REQUEST'].includes(s) ||
      item.status === 'Approved' ||
      item.status === 'Hospital, Sevak Assigned' ||
      item.status === 'Hospital & Sevak Assigned' ||
      item.status === 'Treatment Started' ||
      item.status === 'Closure Requested' ||
      item.status === 'Transferred & Coordinated' ||
      item.status === 'Bill Limit Resolved ✓' ||
      item.status === 'Bill Resolved & Approved' ||
      item.status === 'Reassigned & Coordinated';

    if (isApprovedOrResolved) {
      return 'Approved';
    }

    // 6. Pending Review (All new / intake cases)
    return 'Pending Review';
  }, [isCasePriorityEscalated, isCaseEscalationResolved, isCaseOnHoldDocs]);

  // Dynamic Status Tab Counts directly from Database Cases State
  const counts = useMemo(() => {
    let pendingReview = 0;
    let priorityCases = 0;
    let onHoldDocs = 0;
    let approved = 0;
    let closed = 0;
    let rejected = 0;

    cases.forEach((item) => {
      const cat = getCaseTabCategory(item);
      if (cat === 'Pending Review') pendingReview++;
      else if (cat === 'Priority Cases') priorityCases++;
      else if (cat === 'On Hold / Docs') onHoldDocs++;
      else if (cat === 'Approved') approved++;
      else if (cat === 'Closed') closed++;
      else if (cat === 'Rejected') rejected++;
    });

    return {
      All: cases.length,
      'Pending Review': pendingReview,
      'Application Received': pendingReview,
      'Priority Cases': priorityCases,
      'On Hold / Docs': onHoldDocs,
      'Docs Required': onHoldDocs,
      Approved: approved,
      'Hospital & Sevak Assigned': approved,
      'Approved & Active': approved,
      Closed: closed,
      'Closed / Discharged': closed,
      Rejected: rejected,
      'Rejected / Cancelled': rejected,
    };
  }, [cases, getCaseTabCategory]);

  const tabs = [
    { key: 'All', label: `All Cases (${counts.All})` },
    { key: 'Pending Review', label: `Pending Review (${counts['Pending Review']})` },
    { key: 'Priority Cases', label: `Priority Cases (${counts['Priority Cases']})` },
    { key: 'On Hold / Docs', label: `On Hold / Docs (${counts['On Hold / Docs']})` },
    { key: 'Approved', label: `Approved (${counts.Approved})` },
    { key: 'Closed', label: `Closed (${counts.Closed})` },
    { key: 'Rejected', label: `Rejected (${counts.Rejected})` },
  ];

  // Filtered Cases with client-side status, priority, search, and date filter
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // Tab filter
      if (activeTab !== 'All') {
        const cat = getCaseTabCategory(item);
        if (activeTab === 'Pending Review' || activeTab === 'Application Received' || activeTab === 'Submitted') {
          if (cat !== 'Pending Review') return false;
        } else if (activeTab === 'Priority Cases' || activeTab === 'Priority' || activeTab === 'Escalated') {
          if (cat !== 'Priority Cases') return false;
        } else if (activeTab === 'On Hold / Docs' || activeTab === 'Docs Required') {
          if (cat !== 'On Hold / Docs') return false;
        } else if (activeTab === 'Approved' || activeTab === 'Hospital & Sevak Assigned' || activeTab === 'Assigned' || activeTab === 'Approved & Active' || activeTab === 'Treatment Started') {
          if (cat !== 'Approved') return false;
        } else if (activeTab === 'Closed' || activeTab === 'Closed / Discharged') {
          if (cat !== 'Closed') return false;
        } else if (activeTab === 'Rejected' || activeTab === 'Rejected / Cancelled') {
          if (cat !== 'Rejected') return false;
        }
      }

      // Priority Filter
      if (priorityFilter !== 'ALL') {
        const pUpper = String(item.priority || 'MEDIUM').toUpperCase();
        if (pUpper !== priorityFilter) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idStr = String(item.id || item.caseId || item.applicationNumber || '').toLowerCase();
        const nameStr = String(item.patient || item.patientName || item.applicant || item.applicantName || '').toLowerCase();
        const hospStr = String(item.hospital || item.assignedHospital || '').toLowerCase();
        const sevakStr = String(item.assignedSevak || item.sevak || '').toLowerCase();
        const contactStr = String(item.contact || item.mobile || '').toLowerCase();
        const schemeStr = String(item.scheme || item.assignedScheme?.name || '').toLowerCase();

        if (!idStr.includes(q) && !nameStr.includes(q) && !hospStr.includes(q) && !sevakStr.includes(q) && !contactStr.includes(q) && !schemeStr.includes(q)) {
          return false;
        }
      }

      // Date Range Filter (Start Date to End Date)
      if (startDate || endDate) {
        const rawDateStr = item.createdAt || item.submittedAt || item.submittedDate || item.submittedDateShort;
        if (rawDateStr) {
          let itemDate = null;
          if (item.createdAt || item.submittedAt) {
            itemDate = new Date(item.createdAt || item.submittedAt);
          } else {
            const cleanStr = String(rawDateStr).split('·')[0].trim();
            itemDate = new Date(cleanStr);
          }

          if (itemDate && !isNaN(itemDate.getTime())) {
            const itemTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();

            if (startDate) {
              const [sy, sm, sd] = startDate.split('-').map(Number);
              const startTime = new Date(sy, sm - 1, sd).getTime();
              if (itemTime < startTime) return false;
            }

            if (endDate) {
              const [ey, em, ed] = endDate.split('-').map(Number);
              const endTime = new Date(ey, em - 1, ed).getTime();
              if (itemTime > endTime) return false;
            }
          }
        }
      }

      return true;
    });
  }, [cases, activeTab, priorityFilter, searchQuery, startDate, endDate]);

  // Export to CSV Handler
  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Case ID,Submitted,Patient,Age,Gender,City,Assigned Sevak,Hospital,Contact,Scheme,Priority,Type,Status\n' +
      filteredCases
        .map((c) => {
          const patientName = typeof c.patient === 'string' ? c.patient : c.patient?.name || c.applicant || '—';
          const cityStr = c.city || (c.district ? c.district.split('-')[0].trim() : 'Pune');
          const schemeStr = typeof c.scheme === 'string' ? c.scheme : c.assignedScheme?.name || 'MJPJAY';
          return `"${c.id}","${c.submittedDateShort || c.submittedDate || '—'}","${patientName}","${c.age || 30}","${c.gender || 'Male'}","${cityStr}","${c.assignedSevak || 'Unassigned'}","${c.hospital || '—'}","${c.contact || '—'}","${schemeStr}","${c.priority || 'MEDIUM'}","${c.type || 'OPD'}","${c.status || 'Submitted'}"`;
        })
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ArogyaMitra_CaseQueue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Case Queue to CSV');
  };

  // Pagination Computations
  const totalItems = casesPagination?.total || filteredCases.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="case-queue-page">
      {/* Top Header / Stats Row (Dashboard KPI Style) */}
      <div className="queue-header-stats">
        <div
          className={`queue-stat-card border-blue ${activeTab === 'Pending Review' ? 'active-filter' : ''}`}
          onClick={() => {
            setActiveTab('Pending Review');
            setCurrentPage(1);
          }}
          title="Filter by Pending Review"
        >
          <div className="queue-stat-top-row">
            <div className="queue-stat-value text-blue">{counts['Pending Review']}</div>
            <div className="queue-stat-icon-bubble bg-blue-subtle text-blue">
              <Clock size={18} />
            </div>
          </div>
          <div className="queue-stat-label">Pending Review</div>
        </div>

        <div
          className={`queue-stat-card border-rose ${activeTab === 'Priority Cases' ? 'active-filter' : ''}`}
          onClick={() => {
            setActiveTab('Priority Cases');
            setCurrentPage(1);
          }}
          title="Filter by Priority Escalations"
        >
          <div className="queue-stat-top-row">
            <div className="queue-stat-value text-rose">{counts['Priority Cases']}</div>
            <div className="queue-stat-icon-bubble bg-rose-subtle text-rose">
              <Zap size={18} />
            </div>
          </div>
          <div className="queue-stat-label">Priority Cases</div>
        </div>

        <div
          className={`queue-stat-card border-amber ${activeTab === 'On Hold / Docs' || activeTab === 'Docs Required' ? 'active-filter' : ''}`}
          onClick={() => {
            setActiveTab('On Hold / Docs');
            setCurrentPage(1);
          }}
          title="Filter by On Hold / Docs"
        >
          <div className="queue-stat-top-row">
            <div className="queue-stat-value text-amber">{counts['On Hold / Docs']}</div>
            <div className="queue-stat-icon-bubble bg-amber-subtle text-amber">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="queue-stat-label">On Hold / Docs</div>
        </div>

        <div
          className={`queue-stat-card border-green ${activeTab === 'Approved' || activeTab === 'Hospital & Sevak Assigned' || activeTab === 'Approved & Active' ? 'active-filter' : ''}`}
          onClick={() => {
            setActiveTab('Approved');
            setCurrentPage(1);
          }}
          title="Filter by Approved Cases"
        >
          <div className="queue-stat-top-row">
            <div className="queue-stat-value text-green">{counts.Approved}</div>
            <div className="queue-stat-icon-bubble bg-green-subtle text-green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="queue-stat-label">Approved</div>
        </div>

        <div
          className={`queue-stat-card border-purple ${activeTab === 'All' ? 'active-filter' : ''}`}
          onClick={() => {
            setActiveTab('All');
            setCurrentPage(1);
          }}
          title="Filter by Total Applications"
        >
          <div className="queue-stat-top-row">
            <div className="queue-stat-value text-purple">{counts.All}</div>
            <div className="queue-stat-icon-bubble bg-purple-subtle text-purple">
              <Zap size={18} />
            </div>
          </div>
          <div className="queue-stat-label">Total Applications</div>
        </div>
      </div>

      {/* Controls Bar: Search, Filter Tabs & Export */}
      <div className="queue-controls-bar">
        <div className="queue-tabs-row">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`queue-tab-pill ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="queue-right-tools">
          {/* Priority Filter */}
          <div className="queue-filter-select-wrap">
            <Filter size={14} className="queue-filter-icon" />
            <select
              className="queue-priority-select"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              title="Filter by Priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">⚡ Urgent / Critical</option>
              <option value="HIGH">🔴 High Priority</option>
              <option value="MEDIUM">🟡 Medium Priority</option>
              <option value="LOW">🟢 Low Priority</option>
            </select>
          </div>

          {/* Start Date & End Date Filter */}
          <div className="queue-date-range-wrap">
            <Calendar size={14} className="queue-date-icon" />
            <div className="date-input-group">
              <span className="date-input-label">From:</span>
              <input
                type="date"
                className="queue-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
              />
            </div>
            <div className="date-input-group">
              <span className="date-input-label">To:</span>
              <input
                type="date"
                className="queue-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <button
                className="queue-clear-date-btn"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                title="Clear date range filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="queue-search-wrap">
            <Search size={15} className="queue-search-icon" />
            <input
              type="text"
              placeholder="Search patient, ID, phone..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="queue-search-input"
            />
            {searchQuery && (
              <button
                className="queue-clear-search-btn"
                onClick={() => {
                  setSearchQuery('');
                  loadCasesFromApi({ search: '' });
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            className={`queue-tool-btn ${isRefreshing || casesLoading ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Reload live cases from /api/admins/applications"
          >
            <RefreshCw size={15} />
          </button>

          {/* Export to CSV Button */}
          <button className="queue-export-btn" onClick={handleExport} title="Export CSV">
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Queue Data Table Card */}
      <div className="queue-table-card">
        <div className="queue-card-meta-header">
          <div className="queue-meta-left">
            <span className="queue-fifo-tag">
              ⚡ First-Come, First-Served (FIFO) Queue
            </span>
          </div>
          <div className="queue-meta-right">
            <span className="queue-total-indicator">
              Showing {startEntry}–{endEntry} of {totalItems} Cases
            </span>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="queue-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>CASE ID</th>
                <th style={{ textAlign: 'center' }}>PRIORITY</th>
                <th style={{ textAlign: 'center' }}>SUBMITTED</th>
                <th style={{ textAlign: 'center' }}>PATIENT NAME</th>
                <th style={{ textAlign: 'center' }}>CITY / DISTRICT</th>
                <th style={{ textAlign: 'center' }}>ASSIGNED SEVAK</th>
                <th style={{ textAlign: 'center' }}>HOSPITAL</th>
                <th style={{ textAlign: 'center' }}>STATUS</th>
                <th style={{ textAlign: 'center' }}>ASSIGNED ADMIN</th>
                <th style={{ textAlign: 'center' }}>TYPE</th>
                <th style={{ textAlign: 'center' }}>CONTACT</th>
              </tr>
            </thead>
            <tbody>
              {casesLoading && (
                <Loader
                  asTableRow
                  colSpan={11}
                  message="Loading Applications Queue..."
                  subtext="Fetching live citizen cases and verification status from registry"
                />
              )}

              {!casesLoading && filteredCases.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty-queue-cell">
                    <div className="queue-empty-state">
                      <FileText size={36} color="#94a3b8" />
                      <h4>No cases found</h4>
                      <p>No applications match your selected filter or search query.</p>
                      {(searchQuery || activeTab !== 'All' || priorityFilter !== 'ALL') && (
                        <button
                          className="queue-reset-filters-btn"
                          onClick={() => {
                            setSearchQuery('');
                            setActiveTab('All');
                            setPriorityFilter('ALL');
                            setStartDate('');
                            setEndDate('');
                            loadCasesFromApi({ search: '', status: '', priority: '', page: 1 });
                          }}
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!casesLoading &&
                filteredCases.map((c) => {
                  const reopenInfo = getReopenInfo ? getReopenInfo(c) : { isRejected: false, isReopenable: false };
                  const isNewCase =
                    c.status === 'Submitted' ||
                    c.status === 'SUBMITTED' ||
                    c.status === 'Pending Review' ||
                    c.status === 'Under Review' ||
                    c.status === 'UNDER_REVIEW' ||
                    Boolean(c.isReviewScreenCase);

                  const isRejectedState = reopenInfo.isRejected;
                  const rawStatus = c.status || 'Submitted';
                  const sUpper = String(rawStatus).toUpperCase().trim().replace(/[-\s/]+/g, '_');

                  const clinicalStages = [
                    'POST_OP_RECOVERY', 'POST_OPERATIVE_RECOVERY', 'UNDER_TREATMENT', 'IN_TREATMENT',
                    'SURGERY_SCHEDULED', 'ICU_ADMISSION', 'DISCHARGE_PLANNED', 'MEDICATION_STARTED',
                    'DIAGNOSTICS_PENDING', 'ROUTINE_CHECKUP', 'RECOVERY'
                  ];

                  let displayStatusText = rawStatus;
                  if (sUpper === 'DOCS_VERIFIED' || sUpper === 'DOCUMENTS_VERIFIED' || sUpper === 'DOC_VERIFIED') {
                    displayStatusText = 'Docs Verified';
                  } else if (sUpper === 'COORDINATED' || sUpper === 'HOSPITAL_SEVAK_ASSIGNED' || sUpper === 'SEVAK_HOSPITAL_ASSIGNED' || sUpper === 'SEVAK_ASSIGNED' || sUpper === 'ASSIGNED' || String(rawStatus).toLowerCase().includes('assigned')) {
                    displayStatusText = 'Hospital, Sevak Assigned';
                  } else if (sUpper === 'TREATMENT_STARTED' || sUpper === 'ACTIVE') {
                    displayStatusText = 'Treatment Started';
                  } else if (sUpper === 'APPROVED' || clinicalStages.includes(sUpper)) {
                    displayStatusText = 'Approved';
                  } else if (sUpper === 'DOCS_REQUIRED' || sUpper === 'REVERTED' || sUpper === 'ON_HOLD') {
                    displayStatusText = 'Docs Required';
                  } else if (sUpper === 'UNDER_REVIEW' || sUpper === 'IN_REVIEW') {
                    displayStatusText = 'Under Review';
                  } else if (sUpper === 'SUBMITTED' || sUpper === 'PENDING') {
                    displayStatusText = 'Submitted';
                  } else if (sUpper === 'REJECTED') {
                    displayStatusText = 'Rejected';
                  } else if (sUpper === 'CLOSURE_REQUESTED' || sUpper === 'CLOSURE_REQUEST' || String(rawStatus).toLowerCase() === 'closure requested') {
                    displayStatusText = 'Closure Requested';
                  } else if (sUpper === 'CLOSED' || sUpper === 'COMPLETED' || sUpper === 'DISCHARGED') {
                    displayStatusText = 'Closed';
                  }

                  if (isRejectedState) {
                    displayStatusText = reopenInfo.displayStatus;
                  }

                  // Priority Tag class
                  const priority = (c.priority || 'MEDIUM').toUpperCase();
                  let priorityBadgeClass = 'badge-priority-medium';
                  if (priority === 'URGENT' || priority === 'CRITICAL') priorityBadgeClass = 'badge-priority-urgent';
                  else if (priority === 'HIGH') priorityBadgeClass = 'badge-priority-high';
                  else if (priority === 'LOW') priorityBadgeClass = 'badge-priority-low';

                  // Match with escalation requests
                  const cIdStr = String(c.id || c.applicationNumber || c.caseId || c.uuid || '').toLowerCase().trim();
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
                    c.isBillResolved ||
                    c.isTransferred ||
                    String(c.status || '').toLowerCase().includes('bill resolved') ||
                    String(c.status || '').toLowerCase().includes('reassigned') ||
                    String(c.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
                    String(c.remarks || '').toLowerCase().includes('[admin bill resolution]') ||
                    String(c.remarks || '').includes('REASSIGNED CASE')
                  );

                  const escReasonType = String(matchingEscalation?.reasonType || matchingEscalation?.reason_type || '').toLowerCase();
                  const escReasonTitle = String(matchingEscalation?.reasonTitle || matchingEscalation?.escalation_reason || '').toLowerCase();
                  const escReasonBadge = String(matchingEscalation?.reasonBadge || '').toLowerCase();

                  const isBillEscalation = Boolean(
                    escReasonType === 'bill_exceeded' ||
                    escReasonTitle.includes('bill') ||
                    escReasonBadge.includes('bill') ||
                    c.isBillResolved ||
                    String(c.status || '').toLowerCase().includes('bill resolved') ||
                    String(c.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
                    String(c.remarks || '').toLowerCase().includes('[admin bill resolution]')
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
                    c.isTransferred ||
                    String(c.status || '').toLowerCase().includes('reassigned') ||
                    String(c.remarks || '').includes('REASSIGNED CASE')
                  );

                  const isApprovedCase =
                    ['APPROVED', 'COORDINATED', 'HOSPITAL_SEVAK_ASSIGNED', 'SEVAK_HOSPITAL_ASSIGNED', 'ASSIGNED', 'SEVAK_ASSIGNED', 'TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT', 'POST_OP_RECOVERY'].some((s) => sUpper.includes(s)) ||
                    Boolean(c.isTransferred) ||
                    Boolean(c.hospital && c.hospital !== '—' && c.hospital !== '-' && c.assignedSevak && c.assignedSevak !== '—' && c.assignedSevak !== '-') ||
                    c.status === 'Approved' ||
                    c.status === 'Hospital, Sevak Assigned' ||
                    c.status === 'Treatment Started' ||
                    c.status === 'Bill Resolved & Approved' ||
                    c.status === 'Reassigned & Coordinated';

                  const hasSevakDocsPending = Boolean(
                    c.sevakDocsRequired ||
                    c.isSevakDocPending ||
                    String(c.status || '').toLowerCase() === 'doc pending from sevak' ||
                    (Array.isArray(c.documents) && c.documents.some((d) => {
                      const isExplicitlyRequested = Boolean(
                        d.requested ||
                        d.status === 'PENDING_SEVAK_UPLOAD' ||
                        d.document_status === 'PENDING_SEVAK_UPLOAD' ||
                        d.status === 'REQUESTED' ||
                        d.document_status === 'REQUESTED'
                      );
                      const isNotUploaded = !d.uploaded && (!d.file || d.file === 'Pending Upload' || d.file === '') && !d.fileUrl && !d.file_url && !d.document_url && !d.url;
                      const isNotVerified = !d.verified && d.status !== 'VERIFIED' && d.document_status !== 'VERIFIED';
                      const isFromSevak = d.requestedFrom === 'sevak' || d.requestedFrom === 'ArogyaSevak' || d.requested_from === 'SEVAK' || (isApprovedCase && isExplicitlyRequested);

                      return isExplicitlyRequested && isNotUploaded && isNotVerified && isFromSevak;
                    }))
                  );

                  let statusBadgeClass = 'badge-status-submitted';

                  const isPostResolutionProgressed = ['TREATMENT_STARTED', 'TREATMENT STARTED', 'CLOSED', 'DISCHARGED', 'DOCS_REQUIRED', 'DOCS_VERIFIED', 'UNDER_REVIEW', 'REJECTED'].some(
                    st => sUpper === st || String(c.status || '').toUpperCase() === st
                  );

                  // 1. If actively escalated priority request, show exact active escalation reason
                  if (isEscalationActive && !isRejectedState) {
                    if (isBillEscalation) {
                      displayStatusText = '⚡ Bill Exceeded';
                      statusBadgeClass = 'badge-status-escalated-bill';
                    } else if (escReasonType === 'specialty_unavailable' || escReasonTitle.includes('specialty') || escReasonBadge.includes('specialty') || matchingEscalation?.requiredSpecialty) {
                      displayStatusText = '⚡ Specialty Unavailable';
                      statusBadgeClass = 'badge-status-escalated-specialty';
                    } else if (escReasonType === 'bed_unavailable' || escReasonType === 'icu_bed_unavailable' || escReasonTitle.includes('bed')) {
                      displayStatusText = '⚡ Bed Unavailable';
                      statusBadgeClass = 'badge-status-escalated-bed';
                    } else if (escReasonType === 'emergency_transfer' || escReasonTitle.includes('transfer')) {
                      displayStatusText = '⚡ Hospital Transfer';
                      statusBadgeClass = 'badge-status-escalated-transfer';
                    } else {
                      displayStatusText = `⚡ ${matchingEscalation?.reasonBadge || 'Priority Request'}`;
                      statusBadgeClass = 'badge-status-escalated-general';
                    }
                  }
                  // 2. If escalated case is resolved, show specific resolved status for escalated cases only
                  else if (isEscalationResolved && !isRejectedState && !isPostResolutionProgressed) {
                    if (isBillEscalation) {
                      displayStatusText = 'Bill Limit Resolved ✓';
                      statusBadgeClass = 'badge-status-resolved-bill';
                    } else if (isSpecialtyOrTransferEscalation) {
                      displayStatusText = 'Transferred & Coordinated';
                      statusBadgeClass = 'badge-status-resolved-transfer';
                    } else {
                      displayStatusText = 'Priority Resolved ✓';
                      statusBadgeClass = 'badge-status-resolved-bill';
                    }
                  }
                  // 3. Normal / Progressed cases keep their status accurately
                  else {
                    displayStatusText = c.status || displayStatusText;
                    if (hasSevakDocsPending) {
                      displayStatusText = 'Doc Pending from Sevak';
                      statusBadgeClass = 'badge-status-sevak-pending';
                    } else if (sUpper === 'DOCS_VERIFIED' || sUpper === 'DOCUMENTS_VERIFIED' || sUpper === 'DOC_VERIFIED' || displayStatusText === 'Docs Verified') {
                      statusBadgeClass = 'badge-status-docs-verified';
                    } else if (sUpper === 'TREATMENT_STARTED' || displayStatusText === 'Treatment Started' || sUpper === 'ACTIVE' || sUpper === 'IN_TREATMENT') {
                      displayStatusText = 'Treatment Started';
                      statusBadgeClass = 'badge-status-approved';
                    } else if (sUpper === 'COORDINATED' || sUpper === 'HOSPITAL_SEVAK_ASSIGNED' || sUpper === 'SEVAK_HOSPITAL_ASSIGNED' || sUpper === 'SEVAK_ASSIGNED' || sUpper === 'ASSIGNED' || displayStatusText === 'Hospital, Sevak Assigned') {
                      statusBadgeClass = 'badge-status-assigned';
                    } else if (sUpper === 'APPROVED' || displayStatusText === 'Approved') {
                      statusBadgeClass = 'badge-status-approved';
                    } else if (sUpper === 'DOCS_REQUIRED' || sUpper.includes('HOLD') || sUpper === 'REVERTED') {
                      statusBadgeClass = 'badge-status-docs-required';
                    } else if (sUpper === 'UNDER_REVIEW' || sUpper === 'IN_REVIEW') {
                      statusBadgeClass = 'badge-status-review';
                    } else if (sUpper === 'PENDING_REVIEW' || sUpper === 'SUBMITTED' || sUpper === 'PENDING') {
                      statusBadgeClass = 'badge-status-pending';
                    } else if (sUpper === 'REJECTED') {
                      statusBadgeClass = 'badge-status-rejected';
                    } else if (sUpper === 'CLOSURE_REQUESTED' || sUpper === 'CLOSURE_REQUEST' || displayStatusText === 'Closure Requested') {
                      statusBadgeClass = 'badge-status-closure-requested';
                    } else if (sUpper === 'CLOSED' || sUpper === 'DISCHARGED') {
                      statusBadgeClass = 'badge-status-closed';
                    }

                    if (isRejectedState) {
                      statusBadgeClass = reopenInfo.isReopenable ? 'badge-status-review' : 'badge-status-rejected';
                    }
                  }

                  const handleRowClick = () => {
                    if (matchingEscalation && isEscalationActive) {
                      navigate(`/admin/escalations/detail/${matchingEscalation.id || matchingEscalation.uuid || c.id}`);
                    } else if (isEscalationResolved) {
                      navigate(`/admin/cases/${c.id || c.caseId || c.applicationNumber || c.uuid}`);
                    } else {
                      navigate(getCaseTargetUrl(c));
                    }
                  };

                  const patientName =
                    typeof c.patient === 'string'
                      ? c.patient
                      : c.patient?.name || c.applicant || c.patientName || 'Patient';

                  const displayCity = c.city || (c.district ? c.district.split('-')[0].trim() : null) || 'Pune';

                  return (
                    <tr
                      key={c.id || c.uuid}
                      className={`case-row-item ${isRejectedState && !reopenInfo.isReopenable ? 'row-rejected' : ''} ${c.isUrgentRow ? 'row-urgent-priority' : ''}`}
                      onClick={handleRowClick}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span className="case-id-strong">{c.id}</span>
                          {c.lastReminderSentAt && (
                            <span
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                              }}
                              title={`Citizen sent SLA reminder on ${new Date(c.lastReminderSentAt).toLocaleString('en-IN')}`}
                            >
                              🔔 Reminded
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`priority-pill ${priorityBadgeClass}`}>
                          {priority}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="submitted-date-cell">
                        {formatDateDDMMYYYY(c.submittedDate || c.submittedAt || c.createdAt || c.submittedDateShort)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="patient-cell-stack" style={{ alignItems: 'center', textAlign: 'center' }}>
                          <span className="patient-fullname">{patientName}</span>
                          <span className="patient-demographics">
                            {c.age || 30} yrs · {c.gender || 'Male'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="queue-city-text" style={{ justifyContent: 'center' }}>
                          <MapPin size={12} color="#0284c7" style={{ flexShrink: 0 }} />
                          {displayCity}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: 'center' }}
                        className={
                          !c.assignedSevak ||
                            c.assignedSevak === '-' ||
                            c.assignedSevak === '—' ||
                            c.assignedSevak === 'Not assigned' ||
                            c.assignedSevak === 'Unassigned'
                            ? 'text-muted-sevak'
                            : 'text-active-sevak'
                        }
                        title={
                          typeof c.assignedSevak === 'string'
                            ? c.assignedSevak
                            : (c.assignedSevak?.sevak_name || c.assignedSevak?.name || '-')
                        }
                      >
                        {(() => {
                          let sevakDisplay =
                            typeof c.assignedSevak === 'string'
                            ? c.assignedSevak
                            : (c.assignedSevak?.sevak_name || c.assignedSevak?.name || c.sevakName || '');
                          let prevSevakDisplay =
                            typeof c.previousSevak === 'string'
                            ? c.previousSevak
                            : (c.previousSevak?.sevak_name || c.previousSevak?.name || '');

                          // If this is a transferred escalation, ensure new and previous sevaks are shown
                          if (matchingEscalation?.assignedNewSevak) {
                            sevakDisplay = matchingEscalation.assignedNewSevak;
                          } else if (matchingEscalation?.assigned_new_sevak) {
                            sevakDisplay = matchingEscalation.assigned_new_sevak;
                          } else if (matchingEscalation?.newSevakName) {
                            sevakDisplay = matchingEscalation.newSevakName;
                          }

                          if (matchingEscalation?.submittedBy && !prevSevakDisplay) {
                            prevSevakDisplay = matchingEscalation.submittedBy;
                          }

                          if (!sevakDisplay || sevakDisplay === '—' || sevakDisplay === '-' || sevakDisplay.toLowerCase().includes('coordinator')) {
                            const hospName = String(c.hospital || c.assignedHospital || matchingEscalation?.assignedNewHospital || '').toLowerCase();
                            if (hospName.includes('sahyadri')) {
                              sevakDisplay = 'Prashant Patil';
                            } else if (hospName.includes('navle') || hospName.includes('navale')) {
                              sevakDisplay = 'Sunita Deshmukh';
                            } else if (hospName.includes('narhe')) {
                              sevakDisplay = 'Om Kolekar';
                            } else if (hospName.includes('govind')) {
                              sevakDisplay = 'Akanksha Pawashe';
                            } else if (c.previousSevak) {
                              sevakDisplay = 'Prashant Patil';
                            }
                          }

                          if (prevSevakDisplay) {
                            prevSevakDisplay = prevSevakDisplay.replace(/^Arogya\s*Sevak\s*\(/i, '').replace(/\)$/, '').replace(/—.*/, '').trim();
                          }

                          if (prevSevakDisplay && prevSevakDisplay !== sevakDisplay) {
                            return (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', textDecoration: 'line-through' }} title="Previous Arogya Sevak">
                                  {prevSevakDisplay.includes(' — ') ? prevSevakDisplay.split(' — ')[0].trim() : prevSevakDisplay}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }} title="New Assigned Arogya Sevak">
                                  ➔ {sevakDisplay ? (sevakDisplay.includes(' — ') ? sevakDisplay.split(' — ')[0].trim() : sevakDisplay) : '-'}
                                </div>
                              </div>
                            );
                          }

                          if (
                            !sevakDisplay ||
                            sevakDisplay === '-' ||
                            sevakDisplay === '—' ||
                            sevakDisplay === 'Not assigned' ||
                            sevakDisplay === 'Unassigned' ||
                            sevakDisplay === 'null' ||
                            sevakDisplay === 'undefined'
                          ) {
                            return '-';
                          }

                          return sevakDisplay.includes(' — ')
                            ? sevakDisplay.split(' — ')[0].trim()
                            : sevakDisplay.includes('—')
                              ? sevakDisplay.split('—')[0].trim()
                              : sevakDisplay;
                        })()}
                      </td>
                      <td
                        style={{ textAlign: 'center' }}
                        className="hospital-name-cell"
                        title={
                          (isSpecialtyOrTransferEscalation && isEscalationResolved && matchingEscalation?.assignedNewHospital) ||
                          c.hospital ||
                          c.hospitalShort ||
                          '-'
                        }
                      >
                        {(() => {
                          const displayHosp =
                            (isSpecialtyOrTransferEscalation && isEscalationResolved && matchingEscalation?.assignedNewHospital) ||
                            c.hospitalShort ||
                            c.hospital;

                          if (
                            !displayHosp ||
                            displayHosp === '-' ||
                            displayHosp === '—' ||
                            displayHosp === 'Government Hospital' ||
                            displayHosp === 'Empanelled Hospital' ||
                            displayHosp === 'Not assigned' ||
                            displayHosp === 'Unassigned'
                          ) {
                            return '-';
                          }

                          return (
                            <>
                              {displayHosp}
                              {(c.isTransferred || (isSpecialtyOrTransferEscalation && (isEscalationResolved || matchingEscalation?.assignedNewHospital))) && (
                                <span className="transfer-indicator-tag" title="Transferred Hospital: Reassigned to new facility">
                                  🔀
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`status-pill ${statusBadgeClass}`}
                          style={
                            isRejectedState && reopenInfo.isReopenable
                              ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
                              : {}
                          }
                        >
                          {displayStatusText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const currentAdminName = operator?.name || 'Admin';
                          const reviewerName = c.reviewedByAdminName || c.reviewed_by_admin_name;
                          const isCaseClosedRow = ['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED'].includes(sUpper) || c.status === 'Closed' || c.status === 'CLOSED' || c.status === 'Closed (Expired)' || Boolean(c.isClosed);
                          const isClaimedByMe = reviewerName && (
                            reviewerName.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
                            (operator?.id && (c.reviewedByAdminId === operator.id || c.reviewed_by_admin_id === operator.id))
                          );

                          if (isClaimedByMe) {
                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '3px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '0.725rem',
                                    fontWeight: '700',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                  }}
                                  title={`Assigned to you (${currentAdminName})`}
                                >
                                  👤 You
                                </span>
                                {!isCaseClosedRow && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unclaimCase(c.id || c.uuid);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      borderRadius: '50%',
                                      width: '18px',
                                      height: '18px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                    }}
                                    title="Unassign case back to unassigned queue"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          }

                          if (reviewerName) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.725rem',
                                  fontWeight: '700',
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  maxWidth: '160px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Assigned to Admin ${reviewerName}`}
                              >
                                👤 {reviewerName}
                              </span>
                            );
                          }

                          if (isCaseClosedRow || (isRejectedState && !reopenInfo.isReopenable)) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.725rem',
                                  fontWeight: '600',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  border: '1px solid #e2e8f0',
                                }}
                                title="Case is finalized / closed"
                              >
                                —
                              </span>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                claimCase(c.id || c.uuid, currentAdminName);
                              }}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0284c7';
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.borderColor = '#0284c7';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.color = '#475569';
                              }}
                              title="Assign this case to you"
                            >
                              + Assign
                            </button>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`case-type-pill ${(c.type || 'OPD').toUpperCase() === 'OPD' ? 'type-opd' : 'type-ipd'}`}>
                          {c.type || 'OPD'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="contact-cell">
                        {c.contact || '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer Controls */}
        <div className="queue-pagination-bar">
          <div className="queue-page-size-select">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="page-size-dropdown"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="queue-page-navigation">
            <span className="page-count-text">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="page-nav-btn"
              disabled={currentPage <= 1 || casesLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              className="page-nav-btn"
              disabled={currentPage >= totalPages || casesLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseQueue;
