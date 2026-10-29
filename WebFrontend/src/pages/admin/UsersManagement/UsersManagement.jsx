import React, { useState, useMemo } from 'react';
import {
  Users,
  HeartPulse,
  Search,
  Phone,
  MapPin,
  Building2,
  Filter,
  Calendar,
  RotateCcw,
  X,
  FileText,
  UserCheck,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './UsersManagement.css';

export const UsersManagement = () => {
  const { cases = [], casesLoading = false } = useAdmin();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [schemeFilter, setSchemeFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract Dynamic Options for Dropdowns
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    cases.forEach((c) => {
      if (c.status) statuses.add(c.status);
    });
    return Array.from(statuses);
  }, [cases]);

  const uniqueSchemes = useMemo(() => {
    const schemes = new Set();
    cases.forEach((c) => {
      if (c.scheme) schemes.add(c.scheme);
    });
    return Array.from(schemes);
  }, [cases]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    cases.forEach((c) => {
      const location = c.district || c.city;
      if (location) districts.add(location);
    });
    return Array.from(districts);
  }, [cases]);

  // Helper Date Parser
  const parseCaseDate = (dateStr) => {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    const cleaned = dateStr.split('·')[0].trim();
    d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    d = new Date(`${cleaned} ${new Date().getFullYear()}`);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  // Filter Logic
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Text Search Filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          c.patient?.toLowerCase().includes(q) ||
          c.applicant?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q) ||
          c.contact?.includes(q) ||
          c.hospital?.toLowerCase().includes(q) ||
          c.district?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.scheme?.toLowerCase().includes(q) ||
          c.assignedSevak?.toLowerCase().includes(q);

        if (!matchesSearch) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }

      // 3. Admission Type Filter (IPD / OPD)
      if (typeFilter !== 'ALL' && c.type !== typeFilter) {
        return false;
      }

      // 4. Scheme Filter
      if (schemeFilter !== 'ALL' && c.scheme !== schemeFilter) {
        return false;
      }

      // 5. District / City Filter
      if (districtFilter !== 'ALL') {
        const loc = c.district || c.city || '';
        if (loc !== districtFilter) return false;
      }

      // 6. Start & End Date Filter
      if (startDate || endDate) {
        const rawDateStr = c.submittedDate || c.date || c.createdAt;
        const caseDate = parseCaseDate(rawDateStr);

        if (caseDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (caseDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (caseDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [cases, searchQuery, statusFilter, typeFilter, schemeFilter, districtFilter, startDate, endDate]);

  // Reset All Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSchemeFilter('ALL');
    setDistrictFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    schemeFilter !== 'ALL' ||
    districtFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  // KPI Calculations (Based on overall cases)
  const totalPatients = cases.length;
  const activeTreatment = cases.filter((c) => c.status === 'Treatment Started' || c.status === 'Active').length;
  const ipdPatients = cases.filter((c) => c.type === 'IPD').length;
  const opdPatients = cases.filter((c) => c.type === 'OPD').length;

  return (
    <div className="patients-history-page">
      {/* Patient KPI Header Cards */}
      <div className="patients-kpi-grid">
        <div className="patient-kpi-card border-blue">
          <div className="patient-kpi-value text-blue">{totalPatients}</div>
          <div className="patient-kpi-label">Total Registered Patients</div>
        </div>

        <div className="patient-kpi-card border-green">
          <div className="patient-kpi-value text-green">{activeTreatment}</div>
          <div className="patient-kpi-label">Active Treatment Cases</div>
        </div>

        <div className="patient-kpi-card border-purple">
          <div className="patient-kpi-value text-purple">{ipdPatients}</div>
          <div className="patient-kpi-label">IPD Inpatient Admissions</div>
        </div>

        <div className="patient-kpi-card border-amber">
          <div className="patient-kpi-value text-amber">{opdPatients}</div>
          <div className="patient-kpi-label">OPD Outpatient Patients</div>
        </div>
      </div>

      {/* Patients Filter Controls Bar */}
      <div className="patients-filter-card">
        <div className="patients-filter-top">
          <div className="patients-title-wrap">
            <HeartPulse size={22} color="#2563eb" />
            <span>Patients Beneficiary History</span>
            <span className="patients-count-badge">
              {filteredCases.length} {filteredCases.length === 1 ? 'Record' : 'Records'} Found
            </span>
          </div>

          {/* Search Box */}
          <div className="patients-search-box">
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search patient, ID, phone, hospital, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Filter Grid */}
        <div className="patients-filter-grid">
          {/* Status Filter */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <Activity size={13} color="#64748b" /> Status
            </label>
            <select className="patient-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              {uniqueStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <FileText size={13} color="#64748b" /> Care Type
            </label>
            <select className="patient-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="IPD">IPD (Inpatient)</option>
              <option value="OPD">OPD (Outpatient)</option>
            </select>
          </div>

          {/* Scheme Filter */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <UserCheck size={13} color="#64748b" /> Scheme
            </label>
            <select className="patient-filter-select" value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)}>
              <option value="ALL">All Schemes</option>
              {uniqueSchemes.map((sch) => (
                <option key={sch} value={sch}>
                  {sch}
                </option>
              ))}
            </select>
          </div>

          {/* District / City Filter */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <MapPin size={13} color="#64748b" /> City / District
            </label>
            <select className="patient-filter-select" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
              <option value="ALL">All Cities</option>
              {uniqueDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter: Start Date */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <Calendar size={13} color="#64748b" /> From Date
            </label>
            <input
              type="date"
              className="patient-filter-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Date Filter: End Date */}
          <div className="patient-filter-item">
            <label className="patient-filter-label">
              <Calendar size={13} color="#64748b" /> To Date
            </label>
            <input
              type="date"
              className="patient-filter-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="active-filters-chips-bar">
            <span className="af-label">Active Filters:</span>
            {searchQuery && (
              <span className="af-chip">
                Search: "{searchQuery}"
                <button className="af-chip-remove" onClick={() => setSearchQuery('')}><X size={12} /></button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="af-chip">
                Status: {statusFilter}
                <button className="af-chip-remove" onClick={() => setStatusFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {typeFilter !== 'ALL' && (
              <span className="af-chip">
                Type: {typeFilter}
                <button className="af-chip-remove" onClick={() => setTypeFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {schemeFilter !== 'ALL' && (
              <span className="af-chip">
                Scheme: {schemeFilter}
                <button className="af-chip-remove" onClick={() => setSchemeFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {districtFilter !== 'ALL' && (
              <span className="af-chip">
                City: {districtFilter}
                <button className="af-chip-remove" onClick={() => setDistrictFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {startDate && (
              <span className="af-chip">
                From: {startDate}
                <button className="af-chip-remove" onClick={() => setStartDate('')}><X size={12} /></button>
              </span>
            )}
            {endDate && (
              <span className="af-chip">
                To: {endDate}
                <button className="af-chip-remove" onClick={() => setEndDate('')}><X size={12} /></button>
              </span>
            )}
            <button className="btn-reset-filters-inline" onClick={handleResetFilters}>
              <RotateCcw size={12} /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* PATIENTS HISTORY DATA TABLE */}
      <div className="patients-table-card">
        <div style={{ padding: '14px 20px', background: '#fafbfc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
            Patient Beneficiary Records Directory
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            Showing {filteredCases.length} of {cases.length} Total Patients
          </span>
        </div>

        <table className="patients-table">
          <thead>
            <tr>
              <th>SUBMITTED DATE</th>
              <th>PATIENT / APPLICANT</th>
              <th>CASE ID & SCHEME</th>
              <th>CONTACT & CITY</th>
              <th>ASSIGNED HOSPITAL & SEVAK</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {casesLoading ? (
              <Loader
                asTableRow
                colSpan={6}
                message="Loading Patient Beneficiary Records..."
                subtext="Fetching complete citizen registry, scheme enrollments, and hospital history"
              />
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Filter size={28} color="#cbd5e1" />
                    <div style={{ fontWeight: 600, color: '#475569' }}>No patient records match the selected filters.</div>
                    <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Try adjusting your search query, date range, or dropdown filters.</div>
                    {hasActiveFilters && (
                      <button className="btn-reset-filters" onClick={handleResetFilters} style={{ marginTop: '10px' }}>
                        <RotateCcw size={14} /> Clear All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => (
                <tr key={c.id}>
                  {/* Submitted Date Column */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.825rem' }}>
                      {c.submittedDateShort || c.submittedDate || c.date || '—'}
                    </div>
                    {c.submittedDate && c.submittedDateShort && (
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{c.submittedDate}</div>
                    )}
                  </td>

                  {/* Patient / Applicant */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.patient || c.applicant}</div>
                    {c.applicant && c.applicant !== c.patient && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Applicant: {c.applicant}</div>
                    )}
                    <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '2px' }}>
                      Age {c.age || '—'} · {c.gender || '—'} · <span style={{ fontWeight: 700, color: c.type === 'IPD' ? '#7c3aed' : '#ea580c' }}>{c.type || 'IPD'}</span>
                    </div>
                  </td>

                  {/* Case ID & Scheme */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#166534', fontFamily: 'monospace' }}>{c.id}</div>
                    <span style={{ fontSize: '0.725rem', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe', display: 'inline-block', marginTop: '4px' }}>
                      {c.scheme || 'General Scheme'}
                    </span>
                  </td>

                  {/* Contact & City */}
                  <td>
                    <div style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{c.contact || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <MapPin size={12} color="#94a3b8" /> {c.district || c.city || 'Pune'}
                    </div>
                  </td>

                  {/* Assigned Hospital & Sevak */}
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.825rem' }}>{c.hospital || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Sevak: {c.assignedSevak || 'Not assigned'}
                    </div>
                  </td>

                  {/* Status Column */}
                  <td>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor:
                          c.status === 'Treatment Started' || c.status === 'Active' ? '#dcfce7' :
                            c.status === 'Docs Required' || c.status?.includes('Hold') ? '#fef3c7' :
                              c.status === 'Under Review' || c.status === 'Verification Pending' ? '#dbeafe' :
                                c.status === 'Sanctioned' || c.status === 'Approved' ? '#e0e7ff' : '#f1f5f9',
                        color:
                          c.status === 'Treatment Started' || c.status === 'Active' ? '#15803d' :
                            c.status === 'Docs Required' || c.status?.includes('Hold') ? '#b45309' :
                              c.status === 'Under Review' || c.status === 'Verification Pending' ? '#1d4ed8' :
                                c.status === 'Sanctioned' || c.status === 'Approved' ? '#4338ca' : '#475569'
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor:
                            c.status === 'Treatment Started' || c.status === 'Active' ? '#22c55e' :
                              c.status === 'Docs Required' || c.status?.includes('Hold') ? '#f59e0b' :
                                c.status === 'Under Review' || c.status === 'Verification Pending' ? '#3b82f6' : '#94a3b8'
                        }}
                      />
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement;
