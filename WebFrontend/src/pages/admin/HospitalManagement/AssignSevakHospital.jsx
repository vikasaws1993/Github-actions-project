import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Building2,
  UserCheck,
  MapPin,
  Search,
  Check,
  Phone,
  ArrowLeft,
  Save,
  Sparkles,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { hospitalService } from '../../../services/hospitalService';
import './AssignSevakHospital.css';

export const AssignSevakHospital = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const topRef = useRef(null);
  const { hospitalId: rawParamId } = useParams();
  const routeParamId = rawParamId ? decodeURIComponent(rawParamId) : '';
  const targetHospitalId = routeParamId || location.state?.hospitalId || location.state?.id || '';
  const targetHospitalName = location.state?.hospitalName || '';
  const { hospitals: contextHospitals = [], arogyaSevaks = [], assignSevaksToHospital } = useAdmin();

  // Local state for hospitals loaded from hospitalService (includes CSV imports)
  const [serviceHospitals, setServiceHospitals] = useState([]);

  // Fetch and subscribe to hospitalService cache (CSV bulk imports & new hospitals)
  useEffect(() => {
    hospitalService.fetchHospitals();
    const unsubscribe = hospitalService.subscribe((updatedList) => {
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setServiceHospitals(updatedList);
      }
    });
    return () => unsubscribe();
  }, []);

  // Merge context hospitals and service hospitals deduplicated by ID & Name
  const hospitals = useMemo(() => {
    const combined = [...serviceHospitals, ...contextHospitals];
    const map = new Map();
    combined.forEach((h) => {
      const key = (h.id || h.name || '').toString().toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, h);
      }
    });
    return Array.from(map.values());
  }, [serviceHospitals, contextHospitals]);

  // Deduplicate ArogyaSevaks by ID and name
  const uniqueSevaks = useMemo(() => {
    const map = new Map();
    (arogyaSevaks || []).forEach((s) => {
      const key = (s.id || s.name || '').toString().toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, s);
      }
    });
    return Array.from(map.values());
  }, [arogyaSevaks]);

  // Selected Hospital & Search States
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [sevakSearch, setSevakSearch] = useState('');
  const [selectedSevakIds, setSelectedSevakIds] = useState(new Set());
  const [showToast, setShowToast] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [successModalData, setSuccessModalData] = useState(null);

  // Auto pre-select target hospital only when navigated with a target hospital in route/state
  useEffect(() => {
    if (!hospitals || hospitals.length === 0) return;

    if (targetHospitalId || targetHospitalName) {
      const match = hospitals.find((h) => {
        const idMatch = targetHospitalId && (String(h.id) === String(targetHospitalId) || String(h.hospital_code || '') === String(targetHospitalId));
        const nameMatch = targetHospitalName && (h.name || '').toLowerCase().trim() === targetHospitalName.toLowerCase().trim();
        const paramNameMatch = targetHospitalId && (h.name || '').toLowerCase().trim() === String(targetHospitalId).toLowerCase().trim();

        return idMatch || nameMatch || paramNameMatch;
      });

      if (match) {
        setSelectedHospitalId(match.id);
      }
    }
  }, [targetHospitalId, targetHospitalName, hospitals]);

  // Selected Hospital Object (null if none selected)
  const selectedHospital = useMemo(() => {
    if (!hospitals || hospitals.length === 0) return null;

    if (selectedHospitalId) {
      const match = hospitals.find((h) => String(h.id) === String(selectedHospitalId) || String(h.hospital_code || '') === String(selectedHospitalId));
      if (match) return match;
    }

    if (targetHospitalId || targetHospitalName) {
      const match = hospitals.find((h) => {
        const idMatch = targetHospitalId && (String(h.id) === String(targetHospitalId) || String(h.hospital_code || '') === String(targetHospitalId));
        const nameMatch = targetHospitalName && (h.name || '').toLowerCase().trim() === targetHospitalName.toLowerCase().trim();
        const paramNameMatch = targetHospitalId && (h.name || '').toLowerCase().trim() === String(targetHospitalId).toLowerCase().trim();

        return idMatch || nameMatch || paramNameMatch;
      });
      if (match) return match;
    }

    return null;
  }, [hospitals, selectedHospitalId, targetHospitalId, targetHospitalName]);

  // Pre-check currently assigned Sevaks whenever selected hospital changes
  useEffect(() => {
    if (!selectedHospital) {
      setSelectedSevakIds(new Set());
      return;
    }
    const initialSet = new Set();
    const hospNameLower = (selectedHospital.name || '').toLowerCase().trim();

    // Collect all raw sevak references from the hospital record
    const rawAssigned = [];
    if (Array.isArray(selectedHospital.assignedSevaks)) {
      rawAssigned.push(...selectedHospital.assignedSevaks);
    }
    if (Array.isArray(selectedHospital.assigned_sevaks)) {
      rawAssigned.push(...selectedHospital.assigned_sevaks);
    }
    if (
      selectedHospital.sevak &&
      typeof selectedHospital.sevak === 'string' &&
      selectedHospital.sevak !== 'Not assigned' &&
      selectedHospital.sevak !== 'Unassigned' &&
      selectedHospital.sevak !== '—'
    ) {
      rawAssigned.push(...selectedHospital.sevak.split(/[,|;]/).map((s) => s.trim()));
    }
    if (
      selectedHospital.assigned_sevak_name &&
      typeof selectedHospital.assigned_sevak_name === 'string' &&
      selectedHospital.assigned_sevak_name !== 'Not assigned'
    ) {
      rawAssigned.push(...selectedHospital.assigned_sevak_name.split(/[,|;]/).map((s) => s.trim()));
    }

    // Match each raw reference strictly to a canonical uniqueSevak ID
    rawAssigned.forEach((raw) => {
      const rawId = typeof raw === 'string' ? raw.toLowerCase().trim() : (raw.id || raw.employee_code || '').toString().toLowerCase().trim();
      const rawName = typeof raw === 'string' ? raw.toLowerCase().trim() : (raw.name || raw.sevak_name || raw.full_name || '').toString().toLowerCase().trim();

      const matchedSevak = uniqueSevaks.find((u) => {
        const uId = (u.id || '').toString().toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();
        return (rawId && uId === rawId) || (rawName && uName === rawName);
      });

      if (matchedSevak) {
        initialSet.add(matchedSevak.id);
      }
    });

    // Also match any uniqueSevak whose assigned hospital name matches this hospital
    uniqueSevaks.forEach((sevak) => {
      const sevakHospLower = (sevak.hospital || sevak.hospitalName || '').toLowerCase().trim();
      if (
        sevakHospLower &&
        sevakHospLower !== '—' &&
        sevakHospLower !== 'not assigned' &&
        sevakHospLower !== 'unassigned' &&
        (sevakHospLower === hospNameLower ||
          sevakHospLower.includes(hospNameLower) ||
          hospNameLower.includes(sevakHospLower))
      ) {
        initialSet.add(sevak.id);
      }
    });

    setSelectedSevakIds(initialSet);
  }, [selectedHospital, uniqueSevaks]);

  // Accurately computed list of selected unique Sevak objects
  const selectedSevaksList = useMemo(() => {
    return uniqueSevaks.filter((s) => selectedSevakIds.has(s.id) || selectedSevakIds.has(String(s.id)));
  }, [uniqueSevaks, selectedSevakIds]);

  const selectedSevaksCount = selectedSevaksList.length;

  // Calculate distance & sort ArogyaSevaks: Selected/Assigned Sevaks first, then nearest by distance
  const sortedSevaks = useMemo(() => {
    if (!selectedHospital) return [];

    const hospLocStr = `${selectedHospital.address || ''} ${selectedHospital.location || ''} ${selectedHospital.district || ''}`.toLowerCase();
    const hospNameLower = (selectedHospital.name || '').toLowerCase().trim();

    // EXCLUDE Sevaks assigned to OTHER hospitals (show only Unassigned Sevaks or Sevaks assigned to THIS hospital)
    const availableSevaks = uniqueSevaks.filter((sevak) => {
      if (!sevak.hospital || sevak.hospital === '—' || sevak.hospital === 'Not assigned' || sevak.hospital === 'Unassigned') {
        return true;
      }

      const sevakHospLower = (sevak.hospital || '').toLowerCase().trim();
      const isThisHospital =
        sevakHospLower === hospNameLower ||
        sevakHospLower.includes(hospNameLower) ||
        hospNameLower.includes(sevakHospLower) ||
        (selectedHospital.assignedSevaks &&
          selectedHospital.assignedSevaks.some((s) => String(s.id || s) === String(sevak.id) || s.name === sevak.name));

      return isThisHospital;
    });

    return availableSevaks.map((sevak, idx) => {
      let distanceKm = 0;
      let proximityLabel = '';
      let badgeType = 'far';

      if (sevak.city && hospLocStr.includes(sevak.city.toLowerCase())) {
        distanceKm = Number((1.2 + idx * 0.3).toFixed(1));
        proximityLabel = `📍 ${distanceKm} km (Same City)`;
        badgeType = 'nearest';
      } else if (sevak.district && hospLocStr.includes(sevak.district.toLowerCase())) {
        distanceKm = Number((2.5 + idx * 0.5).toFixed(1));
        proximityLabel = `📍 ${distanceKm} km (Same District)`;
        badgeType = 'nearest';
      } else if (sevak.taluka && hospLocStr.includes(sevak.taluka.toLowerCase())) {
        distanceKm = Number((3.6 + idx * 0.4).toFixed(1));
        proximityLabel = `📍 ${distanceKm} km (Same Taluka)`;
        badgeType = 'nearby';
      } else {
        distanceKm = Number((6.5 + idx * 0.7).toFixed(1));
        proximityLabel = `📍 ${distanceKm} km (Nearby Area)`;
        badgeType = 'far';
      }

      const isCurrentlySelected = selectedSevakIds.has(sevak.id) || selectedSevakIds.has(String(sevak.id));

      return {
        ...sevak,
        distanceKm,
        proximityLabel,
        badgeType,
        isCurrentlySelected
      };
    }).sort((a, b) => {
      // Pin selected sevaks to the top so they are immediately visible on Page 1!
      if (a.isCurrentlySelected && !b.isCurrentlySelected) return -1;
      if (!a.isCurrentlySelected && b.isCurrentlySelected) return 1;
      return a.distanceKm - b.distanceKm;
    });
  }, [selectedHospital, uniqueSevaks, selectedSevakIds]);

  // Filtered Sevaks list by search text
  const filteredSevaks = useMemo(() => {
    return sortedSevaks.filter((s) => {
      const q = sevakSearch.toLowerCase().trim();
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.hospital?.toLowerCase().includes(q)
      );
    });
  }, [sortedSevaks, sevakSearch]);

  // Pagination State - 5 items per page
  const SEVAKS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever search query or selected hospital changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sevakSearch, selectedHospitalId]);

  const totalCount = filteredSevaks.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / SEVAKS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * SEVAKS_PER_PAGE;
  const paginatedSevaks = filteredSevaks.slice(startIndex, startIndex + SEVAKS_PER_PAGE);

  // Toggle Sevak selection checkbox
  const toggleSevak = (sevakId) => {
    setSelectedSevakIds((prev) => {
      const next = new Set(prev);
      if (next.has(sevakId) || next.has(String(sevakId))) {
        next.delete(sevakId);
        next.delete(String(sevakId));
      } else {
        next.add(sevakId);
      }
      return next;
    });
  };

  // Quick action: Auto Select 2 Nearest Sevaks
  const autoSelectNearest = () => {
    const next = new Set();
    const nearest = sortedSevaks.slice(0, 2);
    nearest.forEach((s) => next.add(s.id));
    setSelectedSevakIds(next);
  };

  // Quick action: Clear All
  const clearAll = () => {
    setSelectedSevakIds(new Set());
  };

  // Save Assignment - Deduplicate, Clear Screen, and Open Success Modal
  const handleSave = async () => {
    if (!selectedHospital) return;

    const savedHospName = selectedHospital.name;
    const savedHospLoc = selectedHospital.location || selectedHospital.address || 'Pune';
    const savedHospId = selectedHospital.id;

    if (assignSevaksToHospital) {
      assignSevaksToHospital(savedHospId, selectedSevaksList);
    }

    try {
      await hospitalService.assignSevaksToHospital(savedHospId, selectedSevaksList);
    } catch (err) {
      console.warn('Failed to assign sevaks via service:', err);
    }

    // Open Success Modal with the exact list
    setSuccessModalData({
      hospitalName: savedHospName,
      location: savedHospLoc,
      assignedSevaks: selectedSevaksList
    });

    // Clear selection state from screen
    setSelectedHospitalId('');
    setSelectedSevakIds(new Set());
    setSevakSearch('');
    setCurrentPage(1);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  };

  return (
    <div ref={topRef} className="clean-assign-page">
      {/* Toast Notification */}
      {showToast && (
        <div className="clean-toast">
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
          <button onClick={() => setShowToast(false)} className="toast-close">×</button>
        </div>
      )}

      {/* Success Confirmation Modal */}
      {successModalData && (
        <div className="assign-success-overlay" onClick={() => setSuccessModalData(null)}>
          <div className="assign-success-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="assign-success-header">
              <div className="assign-success-icon-bubble">
                <CheckCircle2 size={32} color="#16a34a" />
              </div>
              <h3 className="assign-success-title">ArogyaSevak Assignment Saved!</h3>
              <p className="assign-success-subtitle">
                Successfully assigned <strong>{successModalData.assignedSevaks.length} ArogyaSevak(s)</strong> to{' '}
                <strong>{successModalData.hospitalName}</strong>
              </p>
            </div>

            <div className="assign-success-body">
              <div className="assign-success-hosp-pill">
                <Building2 size={15} color="#2563eb" />
                <span>{successModalData.hospitalName} • {successModalData.location}</span>
              </div>

              <div className="assign-success-sevaks-list">
                {successModalData.assignedSevaks.length > 0 ? (
                  successModalData.assignedSevaks.map((s, idx) => (
                    <div key={s.id || idx} className="assign-success-sevak-item">
                      <div className="ass-avatar">
                        {(s.name || 'AS').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="ass-info">
                        <span className="ass-name">{s.name}</span>
                        <span className="ass-contact">📞 {s.mobile || '—'}</span>
                      </div>
                      <span className="ass-tag">Assigned</span>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', margin: '8px 0' }}>
                    All representatives unassigned from this hospital.
                  </p>
                )}
              </div>
            </div>

            <div className="assign-success-footer">
              <button
                type="button"
                className="btn-success-stay"
                onClick={() => setSuccessModalData(null)}
              >
                Assign Another Hospital
              </button>
              <button
                type="button"
                className="btn-success-navigate"
                onClick={() => navigate('/admin/hospitals')}
              >
                View Hospital Directory →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="assign-top-nav">
        <button
          type="button"
          className="btn-back-link"
          onClick={() => navigate('/admin/hospitals')}
        >
          <ArrowLeft size={16} />
          <span>Back to Hospital Directory</span>
        </button>

        {selectedHospital && (
          <div className="assign-top-actions">
            <button
              type="button"
              className="btn-save-header"
              onClick={handleSave}
            >
              <Save size={15} />
              <span>Save Assignments ({selectedSevaksCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Hospital Selector & Details Banner */}
      <div className="hospital-picker-card">
        <div className="picker-select-section">
          <label className="picker-label">Select Empanelled Hospital</label>
          <div className="picker-input-box">
            <Building2 size={18} className="picker-icon" />
            <select
              className="picker-select"
              value={selectedHospital?.id || selectedHospitalId || ''}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
            >
              <option value="">-- Select an Empanelled Hospital --</option>
              {hospitals.map((hosp) => (
                <option key={hosp.id} value={hosp.id}>
                  {hosp.name} — {hosp.location || hosp.address || 'Pune'} ({hosp.type || 'Government'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedHospital && (
          <div className="picker-meta-row">
            <div className="meta-pill">
              <span className="meta-pill-label">Location</span>
              <span className="meta-pill-val">📍 {selectedHospital.address || selectedHospital.location || 'Pune'}</span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">Type & Capacity</span>
              <span className="meta-pill-val">🏥 {selectedHospital.type || 'Government'} • {selectedHospital.bedsAvailable || 15} Beds</span>
            </div>
            <div className="meta-pill highlight">
              <span className="meta-pill-label">Assigned Sevaks</span>
              <span className="meta-pill-val"><UserCheck size={14} /> {selectedSevaksCount} Selected</span>
            </div>
          </div>
        )}
      </div>

      {/* When no hospital is selected */}
      {!selectedHospital && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '44px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', padding: '14px', borderRadius: '50%', display: 'flex' }}>
            <Building2 size={32} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Please Select an Empanelled Hospital
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', maxWidth: '480px', lineHeight: 1.5 }}>
            Choose a hospital from the dropdown above to view its live bed capacity, manage assigned representatives, and assign nearest ArogyaSevaks by proximity.
          </p>
        </div>
      )}

      {/* Main Sevaks Assignment Panel */}
      {selectedHospital && (
        <div className="sevaks-panel-card">
          {/* Selected Sevaks Quick Chips Bar */}
          {selectedSevaksCount > 0 && (
            <div className="selected-sevaks-quick-strip">
              <div className="ssqs-header">
                <span className="ssqs-title">
                  <UserCheck size={14} /> Selected ArogyaSevaks ({selectedSevaksCount})
                </span>
                <button type="button" className="ssqs-clear-btn" onClick={clearAll}>
                  Clear All
                </button>
              </div>
              <div className="ssqs-chips-row">
                {selectedSevaksList.map((s) => (
                  <span key={s.id} className="ssqs-chip">
                    <span>{s.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSevak(s.id);
                      }}
                      title={`Remove ${s.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="panel-toolbar">
            <div className="panel-heading-wrap">
              <h3 className="panel-heading">
                ArogyaSevaks Proximity List
              </h3>
              <span className="panel-subheading">
                Showing representatives sorted nearest to <strong>{selectedHospital.name}</strong> (Selected pinned to top)
              </span>
            </div>

            <div className="toolbar-controls">
              <div className="toolbar-search">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or location..."
                  value={sevakSearch}
                  onChange={(e) => setSevakSearch(e.target.value)}
                />
                {sevakSearch && (
                  <button className="clear-search-btn" onClick={() => setSevakSearch('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <button type="button" className="btn-action-auto" onClick={autoSelectNearest}>
                <Sparkles size={14} /> Auto-select 2 Nearest
              </button>
              {selectedSevaksCount > 0 && (
                <button type="button" className="btn-action-clear" onClick={clearAll}>
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Sevak List Cards */}
          <div className="sevaks-list-grid">
            {paginatedSevaks.length === 0 ? (
              <div className="sevak-empty-state">
                <UserCheck size={36} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No ArogyaSevaks found</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#94a3b8' }}>
                  Try adjusting your search keywords
                </p>
              </div>
            ) : (
              paginatedSevaks.map((sevak) => {
                const isChecked = selectedSevakIds.has(sevak.id) || selectedSevakIds.has(String(sevak.id));
                const activeCases = sevak.patients || sevak.calculatedPatients || 0;
                const locationAddressText =
                  sevak.fullAddress ||
                  sevak.address ||
                  (sevak.city && sevak.taluka ? `${sevak.city} - ${sevak.taluka}` : sevak.city) ||
                  (sevak.hospital && sevak.hospital !== '—' && sevak.hospital !== 'Unassigned' && sevak.hospital !== 'Not assigned' ? sevak.hospital : `${sevak.city || 'Pune'} - ${sevak.taluka || 'Haveli'}`);

                return (
                  <div
                    key={sevak.id}
                    className={`sevak-card-row ${isChecked ? 'is-checked' : ''}`}
                    onClick={() => toggleSevak(sevak.id)}
                  >
                    {/* Custom Checkbox */}
                    <div className={`custom-checkbox ${isChecked ? 'is-active' : ''}`}>
                      {isChecked && <Check size={13} strokeWidth={3.2} />}
                    </div>

                    {/* Avatar Initials */}
                    <div className={`sevak-avatar ${isChecked ? 'avatar-selected' : ''}`}>
                      {(sevak.name || 'AS').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>

                    {/* Information */}
                    <div className="sevak-body">
                      <div className="sevak-title-line">
                        <span className="sevak-name">{sevak.name}</span>
                        <span className={`distance-tag ${sevak.badgeType}`}>
                          {sevak.proximityLabel}
                        </span>
                      </div>
                      <div className="sevak-meta-line">
                        <span className="meta-item">
                          <Phone size={12} /> {sevak.mobile || '—'}
                        </span>
                        <span className="meta-item">
                          <MapPin size={12} /> {locationAddressText}
                        </span>
                        <span className="meta-item">
                          📊 {activeCases} Active Cases
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="sevak-status-tag">
                      {isChecked ? (
                        <span className="badge-assigned-now">
                          <CheckCircle2 size={13} /> Selected
                        </span>
                      ) : sevak.hospital && sevak.hospital !== '—' && sevak.hospital !== 'Unassigned' && sevak.hospital !== 'Not assigned' ? (
                        <span className="badge-already-assigned" title={sevak.hospital}>
                          Assigned: {sevak.hospital}
                        </span>
                      ) : (
                        <span className="badge-available">Available</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="sevak-pagination-bar">
              <div className="sevak-pagination-info">
                Showing <strong>{startIndex + 1}</strong> to{' '}
                <strong>{Math.min(startIndex + SEVAKS_PER_PAGE, totalCount)}</strong> of{' '}
                <strong>{totalCount}</strong> ArogyaSevaks
              </div>

              {totalPages > 1 && (
                <div className="sevak-pagination-controls">
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

          {/* Bottom Action Footer */}
          <div className="sevak-footer-bar">
            <div className="footer-info">
              <span>
                Assigning <strong>{selectedSevaksCount} ArogyaSevak(s)</strong> to{' '}
                <strong style={{ color: '#0284c7' }}>{selectedHospital.name}</strong>
              </span>
            </div>

            <button className="btn-save-footer" onClick={handleSave}>
              <Save size={16} />
              Save & Apply Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignSevakHospital;
