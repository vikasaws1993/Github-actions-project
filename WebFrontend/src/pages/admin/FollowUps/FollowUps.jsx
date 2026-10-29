import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  FileText,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { getCaseTargetUrl } from '../../../services/applicationService';
import Loader from '@/components/common/Loader/Loader';
import './FollowUps.css';

// Helper to determine type badge info
// Helper to determine type badge info
const getTypeBadge = (item) => {
  const target = item.callTarget || item.type || '';
  const isUrgent = item.status === 'Urgent' || item.priority === 'Urgent' || item.statusType === 'urgent';

  if (item.type === 'handover_notice' || item.type === 'new_assignment' || item.type === 'bill_resolution') {
    return {
      label: item.type === 'handover_notice' ? 'Old Sevak Handover' : item.type === 'new_assignment' ? 'New Sevak Intake' : 'Bill Limit Sanctioned',
      badgeClass: item.type === 'handover_notice' ? 'badge-relative-call' : item.type === 'new_assignment' ? 'badge-applicant-call' : 'badge-admin-followup',
      icon: <FileText size={13} />,
      category: 'escalation'
    };
  }

  if (target === 'relative' || target === 'call_relative') {
    return {
      label: 'Relative Call Logged',
      badgeClass: 'badge-relative-call',
      icon: <Users size={13} />,
      category: 'relative'
    };
  }

  if (target === 'applicant' || target === 'call_applicant') {
    return {
      label: 'Applicant Call Logged',
      badgeClass: 'badge-applicant-call',
      icon: <PhoneCall size={13} />,
      category: 'applicant'
    };
  }

  if (isUrgent) {
    return {
      label: 'Urgent Follow-Up',
      badgeClass: 'badge-urgent',
      icon: <AlertTriangle size={13} />,
      category: 'urgent'
    };
  }

  return {
    label: 'Admin Follow-Up',
    badgeClass: 'badge-admin-followup',
    icon: <Pin size={13} />,
    category: 'admin'
  };
};

export const FollowUps = () => {
  const { pendingFollowUps = [], cases = [], casesLoading = false, setActiveModal } = useAdmin();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Group active case follow-ups case-wise (Excluding Closed Cases)
  const caseGroups = useMemo(() => {
    const map = new Map();

    // Filter out closed cases
    const activeCases = cases.filter((c) => {
      const st = (c.status || '').toLowerCase();
      return st !== 'closed' && st !== 'case closed' && st !== 'closed (expired)';
    });

    // Initialize map with all active cases
    activeCases.forEach((c) => {
      map.set(c.id, {
        caseInfo: c,
        followUps: []
      });
    });

    // Add pending follow-up entries to respective active case groups
    pendingFollowUps.forEach((fu) => {
      const caseId = fu.caseId || 'AM-2026-00124';

      // Check if target case is closed
      const targetCase = cases.find((c) => c.id === caseId);
      if (targetCase) {
        const st = (targetCase.status || '').toLowerCase();
        if (st === 'closed' || st === 'case closed' || st === 'closed (expired)') {
          return; // Skip closed cases from follow-ups screen
        }
      }

      if (!map.has(caseId)) {
        map.set(caseId, {
          caseInfo: {
            id: caseId,
            applicant: fu.name || 'Applicant Contact',
            patient: fu.name || 'Patient',
            contact: fu.phone || '98765 43210',
            hospital: fu.hospital || 'Empanelled Hospital',
            scheme: fu.scheme || 'PM-JAY',
            status: fu.status || 'Pending'
          },
          followUps: []
        });
      }

      const group = map.get(caseId);
      const typeInfo = getTypeBadge(fu);

      group.followUps.push({
        ...fu,
        typeInfo
      });
    });

    // Convert map to array & attach statistics (Only include cases that have follow-ups)
    const result = Array.from(map.values())
      .filter((group) => group.followUps && group.followUps.length > 0)
      .map((group) => {
        const hasApplicantCalls = group.followUps.some((f) => f.typeInfo.category === 'applicant');
        const hasRelativeCalls = group.followUps.some((f) => f.typeInfo.category === 'relative');
        const hasAdminFollowups = group.followUps.some((f) => f.typeInfo.category === 'admin');
        const hasEscalations = group.followUps.some((f) => f.typeInfo.category === 'escalation') || group.caseInfo.isTransferred || group.caseInfo.isBillResolved;
        const hasUrgent = group.followUps.some((f) => f.status === 'Urgent' || f.statusType === 'urgent') || group.caseInfo.status === 'Docs Required';

        return {
          ...group,
          hasApplicantCalls,
          hasRelativeCalls,
          hasAdminFollowups,
          hasEscalations,
          hasUrgent
        };
      });

    return result;
  }, [cases, pendingFollowUps]);

  // Global counts breakdown
  const counts = useMemo(() => {
    // Active logs only
    const activeLogs = pendingFollowUps.filter((f) => {
      const targetCase = cases.find((c) => c.id === f.caseId);
      if (targetCase) {
        const st = (targetCase.status || '').toLowerCase();
        if (st === 'closed' || st === 'case closed' || st === 'closed (expired)') return false;
      }
      return true;
    });

    const applicantCount = activeLogs.filter((f) => f.callTarget === 'applicant' || f.type === 'call_applicant').length;
    const relativeCount = activeLogs.filter((f) => f.callTarget === 'relative' || f.type === 'call_relative').length;
    const adminCount = activeLogs.filter((f) => f.callTarget === 'admin' || f.type === 'admin_followup').length;
    const escalationCount = activeLogs.filter((f) => f.type === 'handover_notice' || f.type === 'new_assignment' || f.type === 'bill_resolution').length;
    const urgentCount = activeLogs.filter((f) => f.status === 'Urgent' || f.statusType === 'urgent').length;

    return {
      totalCases: caseGroups.length,
      totalLogs: activeLogs.length,
      applicantCount,
      relativeCount,
      adminCount,
      escalationCount,
      urgentCount
    };
  }, [caseGroups, pendingFollowUps, cases]);

  // Filtered case groups based on search and category filter
  const filteredCaseGroups = useMemo(() => {
    return caseGroups.filter((group) => {
      const c = group.caseInfo;
      const q = searchQuery.toLowerCase().trim();

      // Search matching
      const matchesSearch =
        !q ||
        c.id.toLowerCase().includes(q) ||
        (c.applicant && c.applicant.toLowerCase().includes(q)) ||
        (c.patient && c.patient.toLowerCase().includes(q)) ||
        (c.hospital && c.hospital.toLowerCase().includes(q)) ||
        (c.contact && c.contact.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Category filter matching
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'applicant') return group.hasApplicantCalls;
      if (selectedFilter === 'relative') return group.hasRelativeCalls;
      if (selectedFilter === 'admin') return group.hasAdminFollowups;
      if (selectedFilter === 'escalation') return group.hasEscalations;
      if (selectedFilter === 'urgent') return group.hasUrgent;

      return true;
    });
  }, [caseGroups, searchQuery, selectedFilter]);

  return (
    <div className="followups-container">
      {/* Controls Bar: Search & Category Filter Chips */}
      <div className="followups-controls-card">
        <div className="followups-search-row">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search active cases by Case ID (e.g. AM-2026-00125), Patient Name, Hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <button
            className="btn-add-followup"
            onClick={() => setActiveModal({ type: 'add-followup' })}
            title="Create New Follow-Up or Call Record for any active case"
          >
            <Plus size={16} />
            <span> Add Follow-Up</span>
          </button>
        </div>

        <div className="priority-counters-bar">
          <button
            className={`counter-chip chip-all ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Cases with Follow-Ups ({counts.totalCases})
          </button>
          <button
            className={`counter-chip chip-applicant ${selectedFilter === 'applicant' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('applicant')}
          >
            📱 Applicant Calls ({counts.applicantCount})
          </button>
          <button
            className={`counter-chip chip-relative ${selectedFilter === 'relative' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('relative')}
          >
            👨‍👩‍👧 Relative Calls ({counts.relativeCount})
          </button>
          <button
            className={`counter-chip chip-admin ${selectedFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('admin')}
          >
            📌 Admin Follow-Ups ({counts.adminCount})
          </button>
          <button
            className={`counter-chip chip-escalation ${selectedFilter === 'escalation' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('escalation')}
            style={selectedFilter === 'escalation' ? { background: '#f0fdf4', color: '#166534', borderColor: '#86efac' } : {}}
          >
            ⚡ Escalations Resolved ({counts.escalationCount})
          </button>
          <button
            className={`counter-chip chip-urgent ${selectedFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('urgent')}
          >
            🚨 Urgent ({counts.urgentCount})
          </button>
        </div>
      </div>

      {/* Case-Wise Cards List */}
      <div className="case-cards-list">
        {casesLoading ? (
          <Loader
            card
            size="lg"
            message="Loading Follow-Ups & Case Outbound Logs..."
            subtext="Connecting to database and fetching case logs"
          />
        ) : filteredCaseGroups.length === 0 ? (
          <div className="empty-followups-card">
            <AlertTriangle size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
            <h3>No active cases match your search or filter selection</h3>
            <p>Try searching for a different Case ID or clear active filters.</p>
          </div>
        ) : (
          filteredCaseGroups.map((group) => {
            const { caseInfo, followUps } = group;
            const isUrgentCase = caseInfo.status === 'Docs Required' || group.hasUrgent;

            return (
              <div
                key={caseInfo.id}
                className={`case-followup-card ${isUrgentCase ? 'card-urgent' : ''}`}
              >
                {/* Case Card Header */}
                <div className="case-card-header">
                  <div className="case-card-title-group">
                    <div className="patient-avatar-circle">
                      {caseInfo.applicant ? caseInfo.applicant.charAt(0) : 'P'}
                    </div>
                    <div className="case-card-patient-meta">
                      <div className="case-card-top-row">
                        <h3 className="case-patient-name">{caseInfo.applicant}</h3>
                        <Link
                          to={getCaseTargetUrl(caseInfo)}
                          className="case-id-badge"
                          style={{ textDecoration: 'none', cursor: 'pointer' }}
                          title="Open Case"
                        >
                          {caseInfo.id}
                        </Link>
                        <span className={`case-status-badge status-${(caseInfo.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                          {caseInfo.status}
                        </span>
                        <span className="case-scheme-tag">{caseInfo.scheme || 'PM-JAY'}</span>
                      </div>
                      <p className="case-subtitle-text">
                        {caseInfo.gender && `${caseInfo.gender}, `}{caseInfo.age && `${caseInfo.age} yrs · `}
                        {caseInfo.condition || 'General Medical Case'} · <strong>{caseInfo.hospitalShort || caseInfo.hospital || 'Empanelled Hospital'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Contact Badges & Actions */}
                  <div className="case-card-header-actions">
                    <div className="contact-badges-row">
                      <span className="contact-chip chip-applicant-num" title="Applicant Phone">
                        📱 Applicant: <strong>{caseInfo.contact || caseInfo.applicantPhone || '90765 43210'}</strong>
                      </span>
                      {caseInfo.relativeContact && (
                        <span className="contact-chip chip-relative-num" title="Relative Contact">
                          👨‍👩‍👧 Rel: <strong>{caseInfo.relativeName || 'Family'} ({caseInfo.relativeRelation || 'Relative'}) — {caseInfo.relativeContact}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow-Ups & Call Logs List for this Case */}
                <div className="case-card-logs-body">
                  <div className="logs-body-title-row">
                    <span className="logs-body-title">
                      Follow-Up & Call Logs ({followUps.length})
                    </span>
                    {followUps.length === 0 && (
                      <span className="no-logs-text">
                        No outbound call logs or follow-ups recorded yet for this case.
                      </span>
                    )}
                  </div>

                  {followUps.length > 0 && (
                    <div className="case-logs-table-wrapper">
                      <table className="case-logs-table">
                        <thead>
                          <tr>
                            <th>LOG TYPE</th>
                            <th>TARGET CONTACT</th>
                            <th>SUMMARY & NOTES</th>
                            <th>TIMESTAMP</th>
                            <th>STATUS</th>
                            <th style={{ textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {followUps.map((item) => {
                            return (
                              <tr key={item.id}>
                                {/* Log Type */}
                                <td>
                                  <span className={`type-badge ${item.typeInfo.badgeClass}`}>
                                    {item.typeInfo.icon}
                                    <span>{item.typeInfo.label}</span>
                                  </span>
                                </td>

                                {/* Target Contact */}
                                <td>
                                  <div className="patient-stack">
                                    <span className="target-contact-name">{item.name}</span>
                                    <span className="phone-num">{item.phone}</span>
                                  </div>
                                </td>

                                {/* Summary & Notes */}
                                <td>
                                  <div className="note-text-cell">
                                    {item.note}
                                  </div>
                                </td>

                                {/* Timestamp */}
                                <td>
                                  <span className="timestamp-text">{item.date}</span>
                                </td>

                                {/* Status */}
                                <td>
                                  <span className={`status-pill status-${(item.status || 'pending').toLowerCase()}`}>
                                    {item.status}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td>
                                  <div className="fu-actions-cell">
                                    {/* Add Note Button */}
                                    <button
                                      className="btn-fu-action btn-fu-note"
                                      title="Add Internal Case Note"
                                      onClick={() =>
                                        setActiveModal({
                                          type: 'add-note',
                                          payload: { id: caseInfo.id }
                                        })
                                      }
                                    >
                                      <FileText size={13} />
                                      <span>Note</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FollowUps;
