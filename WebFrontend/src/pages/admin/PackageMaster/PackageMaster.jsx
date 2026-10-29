import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  UploadCloud,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Stethoscope,
  Activity,
  HeartPulse,
  DollarSign,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  RefreshCw,
  Eye,
  Tag
} from 'lucide-react';
import { packageMasterService } from '@/services/packageMasterService';
import './PackageMaster.css';

const CATEGORY_OPTIONS = [
  { id: 'critical_surgical', label: 'Critical & Surgical Specialties', icon: '⚡' },
  { id: 'organ_chronic', label: 'Organ Care & Chronic Specialties', icon: '🩺' },
  { id: 'mother_child', label: 'Mother, Child & Sensory Care', icon: '👶' },
  { id: 'general', label: 'General & Multi-Specialty Care', icon: '🏥' }
];

export const PackageMaster = () => {
  const [packages, setPackages] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [expandedSpecialties, setExpandedSpecialties] = useState({});
  const [expandedPackages, setExpandedPackages] = useState({});

  const [procSearchMap, setProcSearchMap] = useState({});

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  // Form inputs state
  const [formData, setFormData] = useState({
    specialty: '',
    specialty_code: '',
    package_code: '',
    package_name: '',
    procedure_code: '',
    procedure_name: '',
    category: CATEGORY_OPTIONS[0].label,
    estimated_cost: '',
    preauth_required: true,
    description: '',
    status: 'Active'
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvTextContent, setCsvTextContent] = useState('');
  const [csvParsedPreview, setCsvParsedPreview] = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fileInputRef = useRef(null);

  // Notification helper
  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch all packages and hierarchy
  const loadData = async () => {
    setLoading(true);
    try {
      const [resPkg, resSpec] = await Promise.all([
        packageMasterService.getAllPackages({ limit: 10000 }),
        packageMasterService.getSpecialtiesHierarchy()
      ]);

      const pkgList = Array.isArray(resPkg) ? resPkg : (resPkg?.data || []);
      const specList = Array.isArray(resSpec) ? resSpec : (resSpec?.data || []);

      setPackages(pkgList);
      setSpecialtiesList(specList);
    } catch (err) {
      console.error('Error fetching package master data:', err);
      showNotice('Failed to load packages from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute distinct UNIQUE packages with full sub-procedures array
  const uniquePackages = useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => {
      const spec = (pkg.specialty || 'General Multi-Specialty').trim();
      const pName = (pkg.package_name || pkg.procedure_name || '').trim();
      const pCode = (pkg.package_code || pkg.procedure_code || '').trim();
      const key = `${spec}____${pCode || pName}`;

      const procObj = {
        id: pkg.id,
        procedure_code: pkg.procedure_code || pCode,
        procedure_name: pkg.procedure_name || pName,
        package_code: pCode,
        package_name: pName,
        specialty: spec,
        specialty_code: pkg.specialty_code || '',
        category: pkg.category || 'General',
        estimated_cost: pkg.estimated_cost || 0,
        preauth_required: pkg.preauth_required !== false,
        status: pkg.status || 'Active'
      };

      if (!map.has(key)) {
        map.set(key, {
          ...pkg,
          unique_key: key,
          package_name: pName,
          package_code: pCode,
          procedure_codes: [pkg.procedure_code || pCode],
          procedures: [procObj],
          procedure_count: 1
        });
      } else {
        const existing = map.get(key);
        if (pkg.procedure_code && !existing.procedure_codes.includes(pkg.procedure_code)) {
          existing.procedure_codes.push(pkg.procedure_code);
          existing.procedures.push(procObj);
          existing.procedure_count += 1;
        }
      }
    });
    return Array.from(map.values());
  }, [packages]);

  // Compute all distinct specialties dynamically from unique packages
  const allSpecialties = useMemo(() => {
    const map = new Map();
    uniquePackages.forEach((pkg) => {
      const spec = pkg.specialty;
      if (spec) {
        if (!map.has(spec)) {
          map.set(spec, { specialty: spec, specialty_code: pkg.specialty_code || '', procedure_count: 0 });
        }
        map.get(spec).procedure_count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.specialty.localeCompare(b.specialty));
  }, [uniquePackages]);

  // Filtered unique packages
  const filteredPackages = useMemo(() => {
    return uniquePackages.filter((pkg) => {
      const q = searchQuery.toLowerCase().trim();
      const pkgName = pkg.package_name || pkg.procedure_name || '';
      const pkgCode = pkg.package_code || '';
      const procCode = pkg.procedure_code || '';
      const spec = pkg.specialty || '';
      const specCode = pkg.specialty_code || '';
      const subCodes = (pkg.procedure_codes || []).join(' ').toLowerCase();

      const matchSearch =
        !q ||
        pkgName.toLowerCase().includes(q) ||
        pkgCode.toLowerCase().includes(q) ||
        procCode.toLowerCase().includes(q) ||
        subCodes.includes(q) ||
        spec.toLowerCase().includes(q) ||
        specCode.toLowerCase().includes(q);

      const matchSpecialty =
        !selectedSpecialty ||
        spec === selectedSpecialty ||
        specCode === selectedSpecialty;

      return matchSearch && matchSpecialty;
    });
  }, [uniquePackages, searchQuery, selectedSpecialty]);

  // Grouped by Specialty for Accordion Grid
  const groupedBySpecialty = useMemo(() => {
    const groups = {};
    filteredPackages.forEach((pkg) => {
      const spec = pkg.specialty || 'General Multi-Specialty';
      if (!groups[spec]) {
        groups[spec] = {
          specialty: spec,
          specialty_code: pkg.specialty_code || '',
          category: pkg.category || 'General',
          packages: [],
          allProcedures: []
        };
      }
      groups[spec].packages.push(pkg);
      if (pkg.procedures && pkg.procedures.length > 0) {
        pkg.procedures.forEach((pr) => {
          groups[spec].allProcedures.push(pr);
        });
      } else {
        groups[spec].allProcedures.push({
          id: pkg.id,
          procedure_code: pkg.procedure_code || pkg.package_code,
          procedure_name: pkg.procedure_name || pkg.package_name,
          package_code: pkg.package_code,
          package_name: pkg.package_name,
          specialty: pkg.specialty,
          specialty_code: pkg.specialty_code,
          estimated_cost: pkg.estimated_cost,
          status: pkg.status
        });
      }
    });
    return Object.values(groups);
  }, [filteredPackages]);

  // Statistics based on unique packages and total procedures
  const stats = useMemo(() => {
    const totalPackages = uniquePackages.length;
    const totalProcedures = packages.length;
    const uniqueSpecialties = allSpecialties.length;
    const activePackages = uniquePackages.filter((p) => p.status === 'Active').length;
    const totalEstimatedValue = uniquePackages.reduce((sum, p) => sum + Number(p.estimated_cost || 0), 0);
    return { totalPackages, totalProcedures, uniqueSpecialties, activePackages, totalEstimatedValue };
  }, [uniquePackages, packages, allSpecialties]);

  // Specialty & Package Expand / Collapse State Helpers
  const toggleSpecialtyExpand = (specialtyName, mode = 'packages') => {
    setExpandedSpecialties((prev) => {
      const current = prev[specialtyName];
      if (current === mode) {
        const next = { ...prev };
        delete next[specialtyName];
        return next;
      }
      return {
        ...prev,
        [specialtyName]: mode
      };
    });
  };

  const togglePackageProcedures = (packageKey) => {
    setExpandedPackages((prev) => ({
      ...prev,
      [packageKey]: !prev[packageKey]
    }));
  };

  const expandAll = () => {
    const all = {};
    groupedBySpecialty.forEach((g) => {
      all[g.specialty] = 'packages';
    });
    setExpandedSpecialties(all);
  };

  const collapseAll = () => {
    setExpandedSpecialties({});
    setExpandedPackages({});
  };

  // Auto-expand specialty if only 1 is filtered or if selected from dropdown
  useEffect(() => {
    if (selectedSpecialty) {
      setExpandedSpecialties({ [selectedSpecialty]: 'packages' });
    }
  }, [selectedSpecialty]);

  // Handle Manual Form Open / Edit
  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setFormData({
      specialty: '',
      specialty_code: '',
      package_code: '',
      package_name: '',
      procedure_code: '',
      procedure_name: '',
      category: CATEGORY_OPTIONS[0].label,
      estimated_cost: '',
      preauth_required: true,
      description: '',
      status: 'Active'
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      specialty: pkg.specialty || '',
      specialty_code: pkg.specialty_code || '',
      package_code: pkg.package_code || '',
      package_name: pkg.package_name || pkg.procedure_name || '',
      procedure_code: pkg.procedure_code || '',
      procedure_name: pkg.procedure_name || pkg.package_name || '',
      category: pkg.category || CATEGORY_OPTIONS[0].label,
      estimated_cost: pkg.estimated_cost || '',
      preauth_required: pkg.preauth_required !== false,
      description: pkg.description || '',
      status: pkg.status || 'Active'
    });
    setIsFormModalOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    const pkgName = formData.package_name.trim();
    const procName = (formData.procedure_name || pkgName).trim();
    if (!formData.specialty.trim() || !pkgName) {
      showNotice('Please enter both Specialty and Package Name.', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        package_name: pkgName,
        procedure_name: procName,
        estimated_cost: parseFloat(formData.estimated_cost) || 0
      };

      if (editingPackage) {
        await packageMasterService.updatePackage(editingPackage.id, payload);
        showNotice(`Package '${pkgName}' updated successfully.`);
      } else {
        await packageMasterService.createPackage(payload);
        showNotice(`Package '${pkgName}' added to ${formData.specialty}.`);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving package:', err);
      showNotice(err.response?.data?.message || 'Error saving package.', 'error');
    }
  };

  // Handle Delete Single Item
  const handleDeletePackage = async () => {
    if (!deleteConfirmItem) return;
    try {
      await packageMasterService.deletePackage(deleteConfirmItem.id);
      const name = deleteConfirmItem.package_name || deleteConfirmItem.procedure_name || 'Item';
      showNotice(`Package '${name}' removed.`);
      setDeleteConfirmItem(null);
      loadData();
    } catch (err) {
      console.error('Error deleting package:', err);
      showNotice('Failed to delete package.', 'error');
    }
  };

  // Handle CSV file selection and parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processCsvFile(file);
  };

  const processCsvFile = (file) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvTextContent(text);
      parseCsvPreview(text);
    };
    reader.readAsText(file);
  };

  const parseCsvPreview = (text) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setCsvParsedPreview([]);
      return;
    }

    const parseLine = (lineStr) => {
      const items = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const c = lineStr[i];
        if (c === '"' || c === "'") inQuotes = !inQuotes;
        else if (c === ',' && !inQuotes) {
          items.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else cur += c;
      }
      items.push(cur.trim().replace(/^["']|["']$/g, ''));
      return items;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
    const rows = [];

    for (let i = 1; i < Math.min(lines.length, 12); i++) {
      const vals = parseLine(lines[i]);
      if (vals.length === 0) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] || '';
      });
      rows.push({
        specialty: row.specialty || row.speciality || vals[0] || '',
        specialty_code: row.specialtycode || vals[1] || '',
        package_code: row.packagecode || vals[2] || '',
        package_name: row.packagename || row.procedurename || vals[3] || '',
        procedure_code: row.procedurecode || vals[4] || ''
      });
    }

    setCsvParsedPreview(rows);
  };

  const handleUploadCsv = async () => {
    if (!csvTextContent.trim()) {
      showNotice('Please upload a CSV file or paste CSV content.', 'error');
      return;
    }

    setCsvImporting(true);
    try {
      const res = await packageMasterService.uploadCsv(csvTextContent);
      showNotice(res.message || 'CSV imported successfully!');
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setCsvTextContent('');
      setCsvParsedPreview([]);
      loadData();
    } catch (err) {
      console.error('Error importing CSV:', err);
      showNotice(err.response?.data?.message || 'CSV Import failed. Check formatting.', 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  // Sample CSV Download Template
  const handleDownloadSampleCsv = () => {
    const csvContent =
      `Specialty,Specialty Code,Package Code,Package Name,Procedure Code\n` +
      `"Burns Management",BM,BM001,"Thermal burns",BM001A\n` +
      `"Burns Management",BM,BM001,"Thermal burns",BM001B\n` +
      `"Cardiology",MC,MC001,"Right / Left Heart Catheterization",MC001A\n` +
      `"General Medicine",MG,MG001,"Acute febrile illness",MG001A\n` +
      `"Orthopedics",SB,SB001,"Fracture - Conservative Management - Without plaster",SB001A`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ArogyaMitra_Package_Master.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Current Data to CSV
  const handleExportDataCsv = () => {
    if (packages.length === 0) {
      showNotice('No packages to export.', 'error');
      return;
    }

    const headers = ['Specialty', 'Specialty Code', 'Package Code', 'Package Name', 'Procedure Code'];
    const rows = packages.map((p) => [
      `"${p.specialty || ''}"`,
      `"${p.specialty_code || ''}"`,
      `"${p.package_code || ''}"`,
      `"${p.package_name || p.procedure_name || ''}"`,
      `"${p.procedure_code || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ArogyaMitra_Packages_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Exported packages to CSV successfully.');
  };

  return (
    <div className="pm-container">
      {/* Toast Alert */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            background: notification.type === 'error' ? '#ef4444' : '#059669',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="pm-stats-grid">
        <div className="pm-stat-card">
          <div>
            <div className="pm-stat-label">Total Packages</div>
            <div className="pm-stat-val">{stats.totalPackages.toLocaleString()}</div>
            <div className="pm-stat-sub">Across all clinical specialties</div>
          </div>
          <div className="pm-stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="pm-stat-card">
          <div>
            <div className="pm-stat-label">Specialties Available</div>
            <div className="pm-stat-val">{stats.uniqueSpecialties}</div>
            <div className="pm-stat-sub">Clinical departments</div>
          </div>
          <div className="pm-stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Stethoscope size={24} />
          </div>
        </div>

        <div className="pm-stat-card">
          <div>
            <div className="pm-stat-label">Active Packages</div>
            <div className="pm-stat-val">{stats.activePackages.toLocaleString()}</div>
            <div className="pm-stat-sub">Enabled for hospital preauth</div>
          </div>
          <div className="pm-stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
            <HeartPulse size={24} />
          </div>
        </div>

        <div className="pm-stat-card">
          <div>
            <div className="pm-stat-label">Total Procedures</div>
            <div className="pm-stat-val">{stats.totalProcedures.toLocaleString()}</div>
            <div className="pm-stat-sub">Individual procedure codes</div>
          </div>
          <div className="pm-stat-icon-wrapper" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <Layers size={24} />
          </div>
        </div>
      </div>

      {/* Controls & Actions Bar */}
      <div className="pm-controls-card">
        <div className="pm-controls-left">
          <div className="pm-search-group">
            <Search size={18} className="pm-search-icon" />
            <input
              type="text"
              className="pm-search-input"
              placeholder="Search package name, code, procedure code, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="pm-filter-select"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            <option value="">All Specialties ({allSpecialties.length} Specialties)</option>
            {allSpecialties.map((spec) => (
              <option key={spec.specialty} value={spec.specialty}>
                {spec.specialty} {spec.procedure_count ? `(${spec.procedure_count})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadData}
            className="pm-action-btn"
            title="Refresh list"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="pm-header-actions">
          <button type="button" onClick={handleDownloadSampleCsv} className="pm-btn pm-btn-outline-secondary" title="Download sample CSV template">
            <Download size={15} />
            <span>Sample CSV</span>
          </button>
          <button type="button" onClick={() => setIsCsvModalOpen(true)} className="pm-btn pm-btn-outline-secondary" title="Import packages CSV">
            <FileSpreadsheet size={15} />
            <span>Import CSV</span>
          </button>
          <button type="button" onClick={handleExportDataCsv} className="pm-btn pm-btn-outline-secondary" title="Export packages to CSV">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button type="button" onClick={handleOpenAddModal} className="pm-btn pm-btn-emerald">
            <Plus size={16} />
            <span>Add Package</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#059669' }} />
          <p style={{ fontWeight: 700 }}>Loading medical specialties & packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <Layers size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>No Packages Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '6px' }}>
            Try clearing the search query, selecting another specialty, or click "Add Package" to create one.
          </p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button type="button" onClick={() => { setSearchQuery(''); setSelectedSpecialty(''); }} className="pm-btn pm-btn-outline-secondary">
              Clear Filters
            </button>
            <button type="button" onClick={handleOpenAddModal} className="pm-btn pm-btn-emerald">
              <Plus size={16} /> Add First Package
            </button>
          </div>
        </div>
      ) : (
        /* SPECIALTY ACCORDION CARDS */
        <div className="pm-specialty-section">
          <div className="pm-grid-meta-bar">
            <span className="pm-grid-count-text">
              Showing <strong>{groupedBySpecialty.length}</strong> Specialties ({filteredPackages.length} Total Packages)
            </span>
            <div className="pm-grid-quick-actions">
              <button
                type="button"
                onClick={expandAll}
                className="pm-btn-quick-toggle"
              >
                <ChevronDown size={14} /> Expand All
              </button>
              <span className="pm-divider">•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="pm-btn-quick-toggle"
              >
                <ChevronUp size={14} /> Collapse All
              </button>
            </div>
          </div>

          <div className="pm-specialty-grid">
            {groupedBySpecialty.map((group) => {
              const expandedMode = expandedSpecialties[group.specialty]; // 'packages' | 'procedures' | undefined
              const isExpanded = !!expandedMode;

              return (
                <div key={group.specialty} className={`pm-spec-card ${isExpanded ? 'expanded' : ''}`}>
                  <div
                    className="pm-spec-card-header"
                    onClick={() => toggleSpecialtyExpand(group.specialty, 'packages')}
                  >
                    <div className="pm-spec-header-left">
                      <div className="pm-spec-icon-badge">
                        <Stethoscope size={20} />
                      </div>
                      <div className="pm-spec-title-wrap">
                        <h3 className="pm-spec-title">{group.specialty}</h3>
                        <div className="pm-spec-meta-row">
                          {group.specialty_code && (
                            <span className="pm-spec-code-tag">{group.specialty_code}</span>
                          )}
                          <span className="pm-spec-cat-text">
                            {group.category ? group.category.split('(')[0] : 'Clinical Care'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pm-spec-header-right">
                      <span className="pm-spec-badge" title="Unique clinical packages count">
                        {group.packages.length} Package{group.packages.length === 1 ? '' : 's'}
                      </span>
                      <span
                        className="pm-spec-badge"
                        style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                        title="Total clinical procedure codes"
                      >
                        {group.allProcedures.length} Procedure{group.allProcedures.length === 1 ? '' : 's'}
                      </span>

                      {/* 1. Packages Dropdown Button */}
                      <button
                        type="button"
                        className={`pm-dropdown-btn ${expandedMode === 'packages' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpecialtyExpand(group.specialty, 'packages');
                        }}
                        title={expandedMode === 'packages' ? 'Collapse packages list' : 'View packages list'}
                      >
                        <span>{expandedMode === 'packages' ? 'Hide Packages' : 'Packages'}</span>
                        {expandedMode === 'packages' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {/* 2. Procedures Dropdown Button */}
                      <button
                        type="button"
                        className={`pm-dropdown-btn ${expandedMode === 'procedures' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpecialtyExpand(group.specialty, 'procedures');
                        }}
                        title={expandedMode === 'procedures' ? 'Collapse procedures list' : 'View all procedures list directly'}
                        style={
                          expandedMode === 'procedures'
                            ? { background: '#0284c7', borderColor: '#0284c7', color: '#ffffff' }
                            : { borderColor: '#bae6fd', color: '#0369a1', background: '#f0f9ff' }
                        }
                      >
                        <span>{expandedMode === 'procedures' ? 'Hide Procedures' : 'Procedures'}</span>
                        {expandedMode === 'procedures' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT: PACKAGES VIEW OR PROCEDURES VIEW */}
                  {isExpanded ? (() => {
                    const localQuery = (procSearchMap[group.specialty] || '').toLowerCase().trim();

                    if (expandedMode === 'procedures') {
                      // DIRECT PROCEDURES VIEW
                      const filteredAllProcs = localQuery
                        ? group.allProcedures.filter((p) => {
                            const name = (p.procedure_name || p.package_name || '').toLowerCase();
                            const code = (p.procedure_code || '').toLowerCase();
                            return name.includes(localQuery) || code.includes(localQuery);
                          })
                        : group.allProcedures;

                      return (
                        <div className="pm-procs-list">
                          {/* Search Header for Procedures */}
                          <div className="pm-proc-search-row">
                            <div className="pm-proc-search-box">
                              <Search size={14} className="pm-proc-search-icon" />
                              <input
                                type="text"
                                placeholder={`Filter procedures in ${group.specialty}... (by code or description)`}
                                value={procSearchMap[group.specialty] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProcSearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: val
                                  }));
                                }}
                                className="pm-proc-search-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {procSearchMap[group.specialty] && (
                                <button
                                  type="button"
                                  className="pm-proc-search-clear"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProcSearchMap((prev) => ({
                                      ...prev,
                                      [group.specialty]: ''
                                    }));
                                  }}
                                  title="Clear filter"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="pm-proc-search-count">
                                {filteredAllProcs.length} of {group.allProcedures.length} procedure{group.allProcedures.length === 1 ? '' : 's'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSpecialtyExpand(group.specialty, 'packages');
                                }}
                                className="pm-btn-text-sm"
                                title="Switch to Packages view"
                              >
                                Switch to Packages
                              </button>
                            </div>
                          </div>

                          {filteredAllProcs.length === 0 ? (
                            <div className="pm-proc-empty-filter">
                              <Search size={22} color="#94a3b8" />
                              <span>No procedures found matching "{procSearchMap[group.specialty]}" in {group.specialty}</span>
                              <button
                                type="button"
                                className="pm-btn-text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProcSearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: ''
                                  }));
                                }}
                              >
                                Reset Filter
                              </button>
                            </div>
                          ) : (
                            filteredAllProcs.map((proc, idx) => (
                              <div key={proc.id || `${proc.procedure_code}_${idx}`} className="pm-nested-proc-row" style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                  <span className="pm-proc-code">{proc.procedure_code || 'PROC'}</span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                    {proc.procedure_name || proc.package_name}
                                  </span>
                                </div>

                                <div className="pm-proc-actions-right">
                                  {proc.estimated_cost > 0 && (
                                    <span className="pm-proc-cost">
                                      ₹{Number(proc.estimated_cost).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(proc)}
                                    className="pm-action-btn"
                                    title="Edit procedure"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmItem(proc)}
                                    className="pm-action-btn delete"
                                    title="Delete procedure"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    }

                    // DEFAULT: PACKAGES VIEW (with nested procedure dropdowns)
                    const filteredPackagesList = localQuery
                      ? group.packages.filter((p) => {
                          const name = (p.package_name || p.procedure_name || '').toLowerCase();
                          const pkgC = (p.package_code || '').toLowerCase();
                          const procC = (p.procedure_code || '').toLowerCase();
                          const subCodes = (p.procedure_codes || []).join(' ').toLowerCase();
                          return name.includes(localQuery) || pkgC.includes(localQuery) || procC.includes(localQuery) || subCodes.includes(localQuery);
                        })
                      : group.packages;

                    return (
                      <div className="pm-procs-list">
                        {/* Package Search Filter Bar for this Specialty */}
                        <div className="pm-proc-search-row">
                          <div className="pm-proc-search-box">
                            <Search size={14} className="pm-proc-search-icon" />
                            <input
                              type="text"
                              placeholder={`Filter packages in ${group.specialty}... (by package name or code)`}
                              value={procSearchMap[group.specialty] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProcSearchMap((prev) => ({
                                  ...prev,
                                  [group.specialty]: val
                                }));
                              }}
                              className="pm-proc-search-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {procSearchMap[group.specialty] && (
                              <button
                                type="button"
                                className="pm-proc-search-clear"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProcSearchMap((prev) => ({
                                    ...prev,
                                    [group.specialty]: ''
                                  }));
                                }}
                                title="Clear filter"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="pm-proc-search-count">
                              {filteredPackagesList.length} of {group.packages.length} package{group.packages.length === 1 ? '' : 's'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSpecialtyExpand(group.specialty, 'procedures');
                              }}
                              className="pm-btn-text-sm"
                              title="Switch to Procedures view"
                            >
                              Switch to Procedures
                            </button>
                          </div>
                        </div>

                        {filteredPackagesList.length === 0 ? (
                          <div className="pm-proc-empty-filter">
                            <Search size={22} color="#94a3b8" />
                            <span>No packages found matching "{procSearchMap[group.specialty]}" in {group.specialty}</span>
                            <button
                              type="button"
                              className="pm-btn-text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProcSearchMap((prev) => ({
                                  ...prev,
                                  [group.specialty]: ''
                                }));
                              }}
                            >
                              Reset Filter
                            </button>
                          </div>
                        ) : (
                          filteredPackagesList.map((pkgItem) => {
                            const displayName = pkgItem.package_name || pkgItem.procedure_name || pkgItem.package_code || 'Clinical Package';
                            const displayCode = pkgItem.package_code || pkgItem.procedure_code || '';
                            const pKey = pkgItem.unique_key || `${group.specialty}____${displayCode}____${displayName}`;
                            const isProcsExpanded = !!expandedPackages[pKey];
                            const procsList =
                              pkgItem.procedures && pkgItem.procedures.length > 0
                                ? pkgItem.procedures
                                : [
                                    {
                                      id: pkgItem.id,
                                      procedure_code: pkgItem.procedure_code || displayCode,
                                      procedure_name: displayName,
                                      estimated_cost: pkgItem.estimated_cost,
                                      status: pkgItem.status
                                    }
                                  ];

                            return (
                              <div key={pKey} className={`pm-pkg-card-wrap ${isProcsExpanded ? 'procs-open' : ''}`}>
                                <div className="pm-proc-item">
                                  <div className="pm-proc-info-left">
                                    {displayCode && (
                                      <span className="pm-pkg-code" title="Package Code">
                                        {displayCode}
                                      </span>
                                    )}
                                    <span className="pm-proc-name" title={displayName}>
                                      {displayName}
                                    </span>
                                  </div>

                                  <div className="pm-proc-actions-right">
                                    {pkgItem.estimated_cost > 0 && (
                                      <span className="pm-proc-cost">
                                        ₹{Number(pkgItem.estimated_cost).toLocaleString('en-IN')}
                                      </span>
                                    )}

                                    {/* Procedures Dropdown Button inside package */}
                                    <button
                                      type="button"
                                      className={`pm-proc-dropdown-btn ${isProcsExpanded ? 'active' : ''}`}
                                      onClick={() => togglePackageProcedures(pKey)}
                                      title={isProcsExpanded ? 'Hide procedures list' : 'View all procedures under this package'}
                                    >
                                      <span>{isProcsExpanded ? 'Hide' : `Procedures (${procsList.length})`}</span>
                                      {isProcsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(pkgItem)}
                                      className="pm-action-btn"
                                      title="Edit package"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmItem(pkgItem)}
                                      className="pm-action-btn delete"
                                      title="Delete package"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Nested Procedures Dropdown List */}
                                {isProcsExpanded && (
                                  <div className="pm-nested-procs-box">
                                    <div className="pm-nested-header">
                                      <Activity size={13} color="#059669" />
                                      <span>Clinical Procedures & Criteria Details ({procsList.length})</span>
                                    </div>
                                    {procsList.map((proc, pIdx) => (
                                      <div key={proc.id || `${pKey}_${proc.procedure_code}_${pIdx}`} className="pm-nested-proc-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                          <span className="pm-proc-code">{proc.procedure_code || 'PROC'}</span>
                                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                                            {proc.procedure_name || displayName}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          {proc.estimated_cost > 0 && (
                                            <span className="pm-proc-cost" style={{ fontSize: '0.78rem' }}>
                                              ₹{Number(proc.estimated_cost).toLocaleString('en-IN')}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(proc)}
                                            className="pm-action-btn"
                                            title="Edit procedure"
                                            style={{ width: '26px', height: '26px' }}
                                          >
                                            <Edit2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })() : (
                    <div
                      className="pm-procs-collapsed-banner"
                      onClick={() => toggleSpecialtyExpand(group.specialty, 'packages')}
                    >
                      <span>Click to view {group.packages.length} packages or {group.allProcedures.length} procedures</span>
                      <ChevronDown size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PACKAGE MANUALLY */}
      {isFormModalOpen && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {editingPackage ? 'Edit Package' : 'Add New Package'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="pm-modal-form">
              <div className="pm-modal-body">
                <div className="pm-form-grid">
                  <div className="pm-form-group">
                    <label className="pm-label">Medical Specialty: *</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. Cardiology"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      required
                    />
                  </div>

                  <div className="pm-form-group">
                    <label className="pm-label">Specialty Code:</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. MC"
                      value={formData.specialty_code}
                      onChange={(e) => setFormData({ ...formData, specialty_code: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group">
                    <label className="pm-label">Package Code:</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. MC001"
                      value={formData.package_code}
                      onChange={(e) => setFormData({ ...formData, package_code: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group">
                    <label className="pm-label">Procedure Code:</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. MC001A"
                      value={formData.procedure_code}
                      onChange={(e) => setFormData({ ...formData, procedure_code: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group full">
                    <label className="pm-label">Package Name: *</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. Right / Left Heart Catheterization"
                      value={formData.package_name}
                      onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="pm-form-group full">
                    <label className="pm-label">Procedure Name:</label>
                    <input
                      type="text"
                      className="pm-input"
                      placeholder="e.g. Right Heart Catheterization"
                      value={formData.procedure_name}
                      onChange={(e) => setFormData({ ...formData, procedure_name: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group full">
                    <label className="pm-label">Estimated Tariff / Cost (₹):</label>
                    <input
                      type="number"
                      className="pm-input"
                      placeholder="e.g. 50000"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group full">
                    <label className="pm-label">Description & Notes:</label>
                    <textarea
                      className="pm-textarea"
                      rows={3}
                      placeholder="Package inclusions, criteria, or special guidelines..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="pm-form-group">
                    <label className="pm-label">Pre-Authorization Requirement:</label>
                    <select
                      className="pm-select"
                      value={formData.preauth_required ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, preauth_required: e.target.value === 'true' })}
                    >
                      <option value="true">Yes - Mandatory Pre-Auth</option>
                      <option value="false">No - Direct Emergency Approval</option>
                    </select>
                  </div>

                  <div className="pm-form-group">
                    <label className="pm-label">Status:</label>
                    <select
                      className="pm-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pm-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="pm-btn pm-btn-outline-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="pm-btn pm-btn-emerald">
                  {editingPackage ? 'Save Changes' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK IMPORT CSV MODAL */}
      {isCsvModalOpen && (
        <div className="pm-modal-overlay">
          <div className="pm-modal" style={{ maxWidth: '720px' }}>
            <div className="pm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Bulk Import Specialties & Packages via CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="pm-modal-body">
              {/* Dropzone */}
              <div
                className="pm-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  if (e.dataTransfer.files?.[0]) processCsvFile(e.dataTransfer.files[0]);
                }}
              >
                <UploadCloud size={36} color="#059669" style={{ margin: '0 auto 10px auto' }} />
                <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                  {csvFile ? `Selected: ${csvFile.name}` : 'Click to Upload or Drag and Drop CSV file'}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  CSV columns: <code>Specialty, Specialty Code, Package Code, Package Name, Procedure Code</code>
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                />
              </div>

              {/* Or Paste CSV Textarea */}
              <div style={{ marginTop: '16px' }}>
                <label className="pm-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Or Paste CSV Text directly:</span>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Download Sample Template
                  </button>
                </label>
                <textarea
                  className="pm-textarea"
                  rows={4}
                  placeholder={`Specialty,Specialty Code,Package Code,Package Name,Procedure Code\n"Burns Management",BM,BM001,"Thermal burns",BM001A`}
                  value={csvTextContent}
                  onChange={(e) => {
                    setCsvTextContent(e.target.value);
                    parseCsvPreview(e.target.value);
                  }}
                  style={{ width: '100%', marginTop: '6px', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              {/* Parsed Preview Table */}
              {csvParsedPreview.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'block', marginBottom: '6px' }}>
                    ✓ Previewing first {csvParsedPreview.length} records ready for import:
                  </span>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <table className="pm-table" style={{ fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th>Specialty</th>
                          <th>Spec Code</th>
                          <th>Pkg Code</th>
                          <th>Package Name</th>
                          <th>Proc Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvParsedPreview.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700 }}>{r.specialty}</td>
                            <td><code>{r.specialty_code || '—'}</code></td>
                            <td><code>{r.package_code || '—'}</code></td>
                            <td>{r.package_name}</td>
                            <td><code>{r.procedure_code || '—'}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pm-modal-footer">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="pm-btn pm-btn-outline-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadCsv}
                disabled={csvImporting || !csvTextContent.trim()}
                className="pm-btn pm-btn-emerald"
              >
                {csvImporting ? <RefreshCw size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                <span>{csvImporting ? 'Importing CSV...' : 'Import to Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deleteConfirmItem && (
        <div className="pm-modal-overlay" onClick={() => setDeleteConfirmItem(null)}>
          <div className="pm-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header" style={{ background: '#b91c1c' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Confirm Package Removal</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="pm-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>
                Are you sure you want to delete package <strong>"{deleteConfirmItem.package_name || deleteConfirmItem.procedure_name}"</strong> under specialty <strong>"{deleteConfirmItem.specialty}"</strong>?
              </p>
            </div>
            <div className="pm-modal-footer">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="pm-btn pm-btn-outline-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePackage}
                className="pm-btn"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageMaster;
