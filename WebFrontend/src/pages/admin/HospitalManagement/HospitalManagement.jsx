import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  Eye,
  Trash2,
  FileSpreadsheet,
  Download,
  Stethoscope,
  X,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { hospitalService } from '../../../services/hospitalService';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './HospitalManagement.css';

/**
 * CSV Line Parser utility to handle quoted strings and commas
 */
const parseCSVLine = (line) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
};

/**
 * Parses raw CSV string into hospital record objects
 */
const parseHospitalsCSV = (text) => {
  if (!text || typeof text !== 'string') return [];
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row = {};
    headers.forEach((header, idx) => {
      const val = values[idx] || '';
      if (header.includes('name') || header === 'hospital') {
        row.name = val;
      } else if (header.includes('type')) {
        row.type = val;
      } else if (header.includes('scheme')) {
        row.scheme = val;
      } else if (header.includes('contact') || header.includes('phone') || header.includes('mobile') || header.includes('landline')) {
        row.contact = val;
      } else if (header.includes('special')) {
        row.specialties = val.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      } else if (header.includes('address') || header.includes('street')) {
        row.address = val;
      } else if (header.includes('city') || header.includes('district') || header.includes('location')) {
        row.location = val;
      } else if (header.includes('taluka') || header.includes('subdistrict') || header.includes('area')) {
        row.areaTaluka = val;
      } else if (header.includes('pincode') || header.includes('zip') || header.includes('pin')) {
        row.pincode = val;
      } else if (header.includes('landmark') || header.includes('station')) {
        row.nearestLandmark = val;
      } else if (header.includes('sevak') || header.includes('representative')) {
        row.sevak = val;
      } else if (header.includes('bed')) {
        row.bedsAvailable = val;
      } else {
        row[header] = val;
      }
    });

    if (row.name) {
      records.push(row);
    }
  }

  return records;
};

export const HospitalManagement = () => {
  const navigate = useNavigate();
  const { deleteHospital, addHospital, showToast, arogyaSevaks = [] } = useAdmin();

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State - 5 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const HOSPITALS_PER_PAGE = 5;

  // Specialty & Sevaks Detail Modal State
  const [selectedSpecialtyModal, setSelectedSpecialtyModal] = useState(null);
  const [selectedSevakModal, setSelectedSevakModal] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  // Bulk CSV Upload State
  const csvFileInputRef = useRef(null);

  // Helper to render assigned Arogya Sevaks for a hospital
  const renderAssignedSevak = (hosp) => {
    let names = [];

    if (Array.isArray(hosp.assignedSevaks) && hosp.assignedSevaks.length > 0) {
      names = hosp.assignedSevaks
        .map((s) => (typeof s === 'string' ? s : s.name || s.sevak_name || s.full_name))
        .filter(Boolean);
    } else if (Array.isArray(hosp.assigned_sevaks) && hosp.assigned_sevaks.length > 0) {
      names = hosp.assigned_sevaks
        .map((s) => (typeof s === 'string' ? s : s.name || s.sevak_name || s.full_name))
        .filter(Boolean);
    } else if (hosp.assigned_sevak_name || hosp.assignedSevakName) {
      names = [(hosp.assigned_sevak_name || hosp.assignedSevakName).trim()];
    } else if (
      hosp.sevak &&
      hosp.sevak !== 'Not assigned' &&
      hosp.sevak !== 'Unassigned' &&
      hosp.sevak !== '—'
    ) {
      names = hosp.sevak
        .split(/[,|;]/)
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== 'not assigned' && s.toLowerCase() !== 'unassigned');
    }

    if (names.length === 0 && arogyaSevaks && arogyaSevaks.length > 0) {
      const hospName = (hosp.name || '').toLowerCase().trim();
      const matched = arogyaSevaks.filter((s) => {
        if (!s.hospital || s.hospital === '—' || s.hospital === 'Not assigned' || s.hospital === 'Unassigned') {
          return false;
        }
        const sHosp = s.hospital.toLowerCase().trim();
        return hospName === sHosp || hospName.includes(sHosp) || sHosp.includes(hospName);
      });
      if (matched.length > 0) {
        names = matched.map((s) => s.name).filter(Boolean);
      }
    }

    // Strict deduplication of names
    names = Array.from(new Set(names.filter((n) => n && n !== 'Not assigned' && n !== 'Unassigned' && n !== '—')));

    if (names.length === 0) {
      return <span className="hosp-sevak-pill is-unassigned">Not assigned</span>;
    }

    const handleOpenSevakModal = (e) => {
      e.stopPropagation();
      setModalSearch('');
      setSelectedSevakModal({
        hospitalName: hosp.name,
        location: hosp.location,
        names: names
      });
    };

    return (
      <div className="hosp-sevak-container">
        <span
          className="hosp-sevak-pill is-assigned"
          onClick={handleOpenSevakModal}
          title={`Click to view all ${names.length} assigned Arogya Sevaks`}
        >
          <UserCheck size={13} className="hosp-sevak-icon" />
          <span className="hosp-sevak-name-text">{names[0]}</span>
        </span>
        {names.length > 1 && (
          <button
            type="button"
            className="hosp-sevak-extra-badge"
            onClick={handleOpenSevakModal}
            title={`Click to view all ${names.length} assigned Arogya Sevaks`}
          >
            +{names.length - 1} more
          </button>
        )}
      </div>
    );
  };

  // Fetch hospitals dynamically from service layer (UI local)
  const loadHospitals = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const res = await hospitalService.fetchHospitals();
      if (res?.data) {
        setHospitals(res.data);
      }
    } catch (err) {
      console.error('[HospitalManagement] Failed to fetch hospitals:', err);
      setError(err.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Delete hospital directly from UI
  const handleDeleteHospital = async (hosp) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${hosp.name}"?`);
    if (!confirmed) return;

    try {
      if (deleteHospital) deleteHospital(hosp.id);
      await hospitalService.deleteHospital(hosp.id);
      setHospitals((prev) => prev.filter((h) => h.id !== hosp.id));
      showToast?.(`Hospital "${hosp.name}" deleted successfully`, 'success');
    } catch (err) {
      console.error('Failed to delete hospital:', err);
      showToast?.('Failed to delete hospital', 'error');
    }
  };

  // Bulk CSV File Selection Handler
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast?.('Please upload a valid .csv file', 'error');
      return;
    }

    try {
      showToast?.('Processing CSV upload...', 'info');
      const res = await hospitalService.uploadCsvFile(file);
      if (res?.success) {
        // Sync with AdminContext state
        if (addHospital && Array.isArray(res.data)) {
          res.data.forEach((h) => addHospital(h));
        }

        showToast?.(`Successfully added ${res.count} hospitals in bulk!`, 'success');
        await loadHospitals(true);
      }
    } catch (err) {
      console.warn('[HospitalManagement] Server upload failed, running client-side parser fallback:', err);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result;
          const parsedRows = parseHospitalsCSV(text);

          if (parsedRows.length === 0) {
            showToast?.('No valid hospital rows found in the CSV file', 'warning');
            return;
          }

          const res = await hospitalService.bulkCreateHospitals(parsedRows);
          if (res?.success) {
            if (addHospital && Array.isArray(res.data)) {
              res.data.forEach((h) => addHospital(h));
            }

            showToast?.(`Successfully added ${res.count} hospitals in bulk!`, 'success');
            await loadHospitals(true);
          }
        } catch (innerErr) {
          console.error('[HospitalManagement] Bulk CSV Import error:', innerErr);
          showToast?.('Failed to parse and import hospitals from CSV', 'error');
        }
      };
      reader.readAsText(file);
    } finally {
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  // Sample CSV Template Download Handler
  const handleDownloadSampleCsv = () => {
    const sampleCsvContent = `Hospital Name,Hospital Type,Empanelled Schemes,Contact Phone,Empanelled Specialties,Full Street Address,City District,Taluka Sub District,Pincode,Nearest Landmark
Deenanath Mangeshkar Hospital & Research Center,Non-Government,"PM-JAY, MJPJAY",020-66455100,"Interventional Cardiology, Neurosurgery, Hemodialysis, Trauma Care","Plot 42, Senapati Bapat Road, Erandwane",Pune,Haveli Taluka,411004,Near Garware Bridge
Shree Chhatrapati Shivaji Civil Hospital,Government,MJPJAY,02162-234567,"Oncology, General Surgery, Pediatric ICU, Nephrology","Civil Lines, Station Road",Satara,Satara Taluka,415001,Near District Court
Apex Super Specialty Hospital,Non-Government,PM-JAY,020-27123456,"Orthopedics, Neurology, Dialysis, Cardiology","Chinchwad Link Road, Pimpri",Pune,Haveli Taluka,411019,Near Chinchwad Flyover`;

    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Hospital_Bulk_Import_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.('Downloaded Sample Hospital CSV template file', 'info');
  };

  // Initial load and live subscription
  useEffect(() => {
    loadHospitals();

    // Subscribe to service cache updates (e.g. newly added hospitals)
    const unsubscribe = hospitalService.subscribe((updated) => {
      setHospitals(updated);
    });

    return () => unsubscribe();
  }, [loadHospitals]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHospitals(true);
  };

  // Filter and sort hospitals so recently added hospitals are on page 1 (front page)
  const sortedAndFilteredHospitals = useMemo(() => {
    const list = hospitals.filter((hosp) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const specsString = (hosp.specialties || []).join(' ').toLowerCase();
      return (
        hosp.name?.toLowerCase().includes(q) ||
        hosp.location?.toLowerCase().includes(q) ||
        hosp.areaTaluka?.toLowerCase().includes(q) ||
        hosp.scheme?.toLowerCase().includes(q) ||
        hosp.sevak?.toLowerCase().includes(q) ||
        hosp.contact?.toLowerCase().includes(q) ||
        specsString.includes(q)
      );
    });

    // Sort by createdAt / created_at descending so recently added hospitals appear first
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      return 0;
    });
  }, [hospitals, searchQuery]);

  // Reset pagination to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalCount = sortedAndFilteredHospitals.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / HOSPITALS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * HOSPITALS_PER_PAGE;
  const paginatedHospitals = sortedAndFilteredHospitals.slice(startIndex, startIndex + HOSPITALS_PER_PAGE);

  return (
    <div className="hospital-management-page">
      {/* Hidden File Input for CSV Bulk Upload */}
      <input
        type="file"
        ref={csvFileInputRef}
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCsvUpload}
      />

      {/* Error Banner */}
      {error && (
        <div className="hosp-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="hosp-retry-btn" onClick={() => loadHospitals()}>
            Retry
          </button>
        </div>
      )}

      {/* Hospital Table Card */}
      <div className="hosp-card hosp-full-width">
        <div className="hosp-card-header">
          <div className="hosp-card-title-wrap">
            <h3 className="hosp-card-title">
              Empanelled Hospitals
              <span className="hosp-count-badge">
                {loading ? '...' : totalCount}
              </span>
            </h3>
          </div>

          <div className="hosp-card-controls">
            <div className="hosp-search-box">
              <Search size={16} className="hosp-search-icon" />
              <input
                type="text"
                className="hosp-search-input"
                placeholder="Search by name, location, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="hosp-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="hosp-actions-right">
              <button
                className={`btn-refresh-hospitals ${refreshing ? 'is-spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh hospital data from API"
                disabled={refreshing || loading}
              >
                <RefreshCw size={15} />
                <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>

              {/* Bulk Upload CSV Button */}
              <button
                type="button"
                className="btn-bulk-upload-csv"
                onClick={() => csvFileInputRef.current?.click()}
                title="Upload CSV file to import hospitals in bulk"
              >
                <FileSpreadsheet size={16} />
                <span>Upload CSV</span>
              </button>

              {/* Sample CSV Download Button */}
              <button
                type="button"
                className="btn-sample-csv"
                onClick={handleDownloadSampleCsv}
                title="Download sample CSV template"
              >
                <Download size={14} />
                <span>Sample CSV</span>
              </button>

              <button
                className="btn-add-hospital"
                onClick={() => navigate('/admin/hospitals/add')}
              >
                <UserPlus size={15} />
                <span>Add Hospital</span>
              </button>
            </div>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="hosp-data-table">
            <thead>
              <tr>
                <th>HOSPITAL NAME</th>
                <th>LOCATION</th>
                <th>SPECIALITY</th>
                <th>SCHEME</th>
                <th>AVAILABLE BEDS</th>
                <th>ASSIGNED AROGYA SEVAK</th>
                <th>ACTIVE CASES</th>
                <th>CONTACT</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <Loader
                  asTableRow
                  colSpan={9}
                  message="Loading Hospital Registry..."
                  subtext="Fetching empanelled hospital network, bed capacities, and Arogya Sevak assignments"
                />
              ) : paginatedHospitals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="hosp-empty-state">
                    <Building2 size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                      No hospitals found
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {searchQuery
                        ? 'Try modifying your search keywords.'
                        : 'Click "Upload CSV" or "+ Add Hospital" above to add new facilities.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedHospitals.map((hosp) => {
                  const specs = hosp.specialties && hosp.specialties.length > 0
                    ? hosp.specialties
                    : ['General Medicine'];
                  const mainTwoSpecs = specs.slice(0, 2);
                  const extraCount = specs.length - 2;

                  return (
                    <tr key={hosp.id}>
                      <td
                        className="hosp-name-cell"
                        onClick={() => navigate(`/admin/hospitals/detail/${hosp.id}`)}
                        title={`Click to view details of ${hosp.name}`}
                      >
                        <div className="hosp-name-stack">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="hosp-main-name hosp-link-interactive">{hosp.name}</span>
                            <span className={`hosp-type-badge ${hosp.type === 'Non-Government' ? 'badge-non-govt' : 'badge-govt'}`}>
                              {hosp.type === 'Non-Government' ? 'Non-Govt' : 'Govt'}
                            </span>
                          </div>
                          <span className="hosp-street-addr">{hosp.address}</span>
                        </div>
                      </td>
                      <td className="hosp-location-cell">
                        <div className="hosp-loc-stack">
                          <span className="hosp-city-text">{hosp.location}</span>
                          <span className="hosp-area-text">{hosp.areaTaluka || 'Haveli Taluka'}</span>
                        </div>
                      </td>

                      {/* SPECIALITY Column */}
                      <td className="hosp-specialty-cell">
                        <div
                          className="hosp-spec-flex"
                          onClick={() => {
                            setModalSearch('');
                            setSelectedSpecialtyModal(hosp);
                          }}
                          title="Click to view all specialties"
                        >
                          {mainTwoSpecs.map((spec, idx) => (
                            <span key={idx} className="hosp-spec-badge">
                              {spec}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <button
                              type="button"
                              className="hosp-spec-more-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalSearch('');
                                setSelectedSpecialtyModal(hosp);
                              }}
                              title={`View all ${specs.length} specialties`}
                            >
                              +{extraCount} more
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="hosp-scheme-cell">
                        <span className="hosp-scheme-text">{hosp.scheme}</span>
                      </td>
                      <td className="hosp-beds-cell">
                        <span className="hosp-beds-badge">
                          {hosp.bedsAvailable != null ? `${hosp.bedsAvailable} Beds` : '—'}
                        </span>
                      </td>
                      <td className="hosp-sevak-cell">
                        {renderAssignedSevak(hosp)}
                      </td>
                      <td className="hosp-cases-cell">
                        <span className="bold-orange-num">{hosp.activeCases || 0}</span>
                      </td>
                      <td className="hosp-contact-cell">
                        <span className="hosp-contact-text">{hosp.contact || '—'}</span>
                      </td>
                      <td className="hosp-actions-cell" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            className="btn-hosp-assign"
                            onClick={() => navigate(`/admin/hospitals/assign-sevaks/${encodeURIComponent(hosp.id)}`, { state: { hospitalId: hosp.id, hospitalName: hosp.name } })}
                            title="Assign ArogyaSevaks to this Hospital"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 14px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              borderRadius: '6px',
                              fontSize: '0.775rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(5, 150, 105, 0.08)'
                            }}
                          >
                            <UserPlus size={14} /> Assign Sevaks
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && totalCount > 0 && (
          <div className="hosp-pagination-bar">
            <div className="hosp-pagination-info">
              Showing <strong>{startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + HOSPITALS_PER_PAGE, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> hospitals
            </div>

            {totalPages > 1 && (
              <div className="hosp-pagination-controls">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>

                <div className="page-numbers-list">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`btn-page-num ${pageNum === safeCurrentPage ? 'is-active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === safeCurrentPage - 2 ||
                      pageNum === safeCurrentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="page-ellipsis">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Specialties Modal */}
      {selectedSpecialtyModal && (
        <div className="hosp-modal-overlay" onClick={() => setSelectedSpecialtyModal(null)}>
          <div className="hosp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="hosp-modal-header">
              <div className="hosp-modal-title-group">
                <div className="hosp-modal-icon-wrap">
                  <Stethoscope size={22} color="#0284c7" />
                </div>
                <div>
                  <h3 className="hosp-modal-title">{selectedSpecialtyModal.name}</h3>
                  <span className="hosp-modal-subtitle">
                    {selectedSpecialtyModal.location} • {selectedSpecialtyModal.type || 'Empanelled'} Facility
                  </span>
                </div>
              </div>
              <button
                className="hosp-modal-close"
                onClick={() => setSelectedSpecialtyModal(null)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hosp-modal-body">
              <div className="hosp-modal-badge-bar">
                <span className="hosp-modal-count-pill">
                  <Award size={14} />
                  {(selectedSpecialtyModal.specialties || []).length} Total Clinical Specialties
                </span>

                {(selectedSpecialtyModal.specialties || []).length > 4 && (
                  <div className="hosp-modal-search-box">
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Filter specialties..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                    {modalSearch && (
                      <button onClick={() => setModalSearch('')}>×</button>
                    )}
                  </div>
                )}
              </div>

              <div className="hosp-spec-grid">
                {(selectedSpecialtyModal.specialties || ['General Medicine'])
                  .filter((spec) => !modalSearch || spec.toLowerCase().includes(modalSearch.toLowerCase()))
                  .map((spec, i) => (
                    <div key={i} className="hosp-spec-card">
                      <div className="hosp-spec-card-icon">
                        <CheckCircle2 size={16} color="#059669" />
                      </div>
                      <span className="hosp-spec-card-name">{spec}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="hosp-modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedSpecialtyModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing all assigned Arogya Sevaks */}
      {selectedSevakModal && (
        <div className="hosp-modal-overlay" onClick={() => setSelectedSevakModal(null)}>
          <div className="hosp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="hosp-modal-header">
              <div className="hosp-modal-title-group">
                <div className="hosp-modal-icon-wrap" style={{ background: '#ecfdf5' }}>
                  <UserCheck size={22} color="#059669" />
                </div>
                <div>
                  <h3 className="hosp-modal-title">{selectedSevakModal.hospitalName}</h3>
                  <span className="hosp-modal-subtitle">
                    {selectedSevakModal.location} • Assigned Arogya Sevaks
                  </span>
                </div>
              </div>
              <button
                className="hosp-modal-close"
                onClick={() => setSelectedSevakModal(null)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hosp-modal-body">
              <div className="hosp-modal-badge-bar">
                <span className="hosp-modal-count-pill" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <UserCheck size={14} />
                  {(selectedSevakModal.names || []).length} Assigned Arogya Sevaks
                </span>

                {(selectedSevakModal.names || []).length > 4 && (
                  <div className="hosp-modal-search-box">
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Filter sevak name..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                    {modalSearch && (
                      <button onClick={() => setModalSearch('')}>×</button>
                    )}
                  </div>
                )}
              </div>

              <div className="hosp-spec-grid">
                {(selectedSevakModal.names || [])
                  .filter((sevakName) => !modalSearch || sevakName.toLowerCase().includes(modalSearch.toLowerCase()))
                  .map((sevakName, i) => (
                    <div key={i} className="hosp-spec-card" style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}>
                      <div className="hosp-spec-card-icon" style={{ background: '#dcfce7' }}>
                        <UserCheck size={16} color="#166534" />
                      </div>
                      <span className="hosp-spec-card-name" style={{ fontWeight: '700', color: '#14532d' }}>{sevakName}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="hosp-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                className="btn-modal-reassign"
                onClick={() => {
                  const targetHosp = hospitals.find((h) => h.name === selectedSevakModal.hospitalName);
                  const hospId = targetHosp?.id || selectedSevakModal.hospitalName;
                  setSelectedSevakModal(null);
                  navigate(`/admin/hospitals/assign-sevaks/${encodeURIComponent(hospId)}`, {
                    state: { hospitalId: hospId, hospitalName: selectedSevakModal.hospitalName }
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={14} /> Assign / Edit Sevaks
              </button>

              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedSevakModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalManagement;

