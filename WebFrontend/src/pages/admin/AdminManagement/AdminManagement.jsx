import React, { useState, useMemo, useEffect } from 'react';
import { UserCheck, Phone, CheckCircle, Clock, Pencil, Trash2, UserPlus, Search, RotateCw, MapPin, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './AdminManagement.css';

export const AdminManagement = () => {
  const { users = [], setActiveModal, fetchAdmins } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State - 5 items per page
  const ADMINS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCity]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (fetchAdmins) {
      await fetchAdmins(searchQuery);
    }
    setIsRefreshing(false);
  };

  // City list for filter dropdown
  const cityList = useMemo(() => {
    const set = new Set();
    (users || []).forEach((u) => {
      const c = u.city || u.district;
      if (c && typeof c === 'string' && c.trim()) {
        set.add(c.trim());
      }
    });
    return Array.from(set);
  }, [users]);

  // Filtered Admins List
  const filteredAdmins = useMemo(() => {
    return (users || []).filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.city?.toLowerCase().includes(q) ||
        u.district?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedCity === 'all') return true;
      const c = (u.city || u.district || '').toLowerCase();
      return c.includes(selectedCity.toLowerCase());
    });
  }, [users, searchQuery, selectedCity]);

  // Pagination Calculations
  const totalCount = filteredAdmins.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMINS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ADMINS_PER_PAGE;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + ADMINS_PER_PAGE);

  return (
    <div className="admin-mgmt-container">

      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by admin name, email, mobile, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', color: '#0f172a' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* City Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '180px' }}>
            <MapPin size={16} color="#0284c7" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.825rem', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="all">📍 All Cities ({users.length})</option>
              {cityList.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reload live admin list from database"
          >
            <RotateCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh List'}
          </button>

          <button
            onClick={() => setActiveModal({ type: 'add-admin' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#166534',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={15} /> Add Admin
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eef2f6', overflowX: 'auto', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Authorized Administrator Registry</span>
          <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
            {totalCount} Administrators Listed
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>ADMIN NAME</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>LOCATION / CITY</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>EMAIL ADDRESS</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>MOBILE NUMBER</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>CASES HANDLED</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>STATUS</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isRefreshing ? (
              <Loader
                asTableRow
                colSpan={7}
                message="Syncing Administrator Directory..."
                subtext="Fetching registered administrators and role permissions"
              />
            ) : paginatedAdmins.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No administrators match your search query or filter.
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>
                    <div>{u.name || 'Admin User'}</div>
                    {u.id && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                        ID: {u.id}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#334155' }}>
                      <MapPin size={13} color="#0284c7" />
                      {u.city || u.district || (u.address ? u.address.split(',')[0] : 'Pune')}
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', color: '#334155' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#64748b" />
                      {u.email}
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                    {u.phone}
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontWeight: 800, color: (u.assignedCases || 0) > 0 ? '#166534' : '#94a3b8' }}>
                      {u.assignedCases || 0} Cases
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '3px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: u.status === 'Active' || u.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        color: u.status === 'Active' || u.status === 'active' ? '#15803d' : '#64748b'
                      }}
                    >
                      {u.status || 'Active'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => setActiveModal({ type: 'edit-admin', payload: u })}
                        style={{
                          border: 'none',
                          background: '#eff6ff',
                          color: '#2563eb',
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit Admin details"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        onClick={() => setActiveModal({ type: 'delete-admin', payload: u })}
                        style={{
                          border: 'none',
                          background: '#fef2f2',
                          color: '#dc2626',
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Delete Admin"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="admin-pagination-bar">
            <div className="admin-pagination-info">
              Showing <strong>{startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + ADMINS_PER_PAGE, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> Administrators
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination-controls">
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
    </div>
  );
};

export default AdminManagement;
