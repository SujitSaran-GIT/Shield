// src/features/users/Users.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { User } from '../../types';
import type { UserFiltersState } from './usersSlice';
import { exportCsv } from '../../utils/export';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchUsers,
  setFilters,
  setSelectedRows,
  blockUser,
  unblockUser,
  deleteUser,
} from './usersSlice';
import UserTable from './components/UserTable';
import AdministratorModal from './components/AdministratorModal';
import UserDetailsModal from './components/UserDetailsModal';
import UserFilters from './components/UserFilters';
import BulkActions from './components/BulkActions';
import { 
  Filter, 
  Download, 
} from 'lucide-react';
import { Card, LoadingSpinner, SearchBar } from '../../components';

const Users = () => {
  const dispatch = useAppDispatch();
  const actor = useAppSelector(state => state.auth.user);
  const [administrator, setAdministrator] = useState<User | null>(null);
  const canManage = useAppSelector((state) => state.auth.user?.role === 'CLIENT_ADMIN');
  const [searchParams] = useSearchParams();
  const {
    users,
    loading,
    pagination,
    filters,
    selectedRows,
    error,
  } = useAppSelector((state) => state.users);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const request=dispatch(fetchUsers({
      page: pagination.currentPage, size: pagination.pageSize,
      sortBy: filters.sortBy, sortDir: filters.sortDir,
      query: filters.search, status: filters.status, role: filters.role, clientName: filters.clientName,
    }));
    return () => request.abort();
  }, [dispatch, filters, pagination.currentPage, pagination.pageSize]);
  useEffect(() => { const query = searchParams.get('query'); if (query !== null) dispatch(setFilters({ search: query, page: 0 })); }, [searchParams, dispatch]);

  const handleSearch = (searchTerm: string) => {
    dispatch(setFilters({ search: searchTerm, page: 0 }));
  };

  const handleFilterChange = (newFilters: Partial<UserFiltersState>) => {
    dispatch(setFilters({ ...newFilters, page: 0 }));
  };

  const handlePageChange = (page: number) => {
    dispatch(setFilters({ page }));
  };

  const handlePageSizeChange = (size: number) => {
    dispatch(setFilters({ pageSize: size, page: 0 }));
  };

  const handleRowSelect = (userId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedRows, userId]
      : selectedRows.filter(id => id !== userId);
    dispatch(setSelectedRows(newSelected));
  };

  const handleSelectAll = (checked: boolean) => {
    dispatch(setSelectedRows(checked ? users.map(user => user.id) : []));
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleStatusChange = async (userId: string, action: 'block' | 'unblock' | 'delete') => {
    if (!canManage) return;
    if (action === 'delete') {
      if(window.confirm('Delete this user account? Existing sessions will be revoked.')) await dispatch(deleteUser(userId));
    } else if (action === 'block') {
      await dispatch(blockUser(userId));
    } else {
      await dispatch(unblockUser(userId));
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const records = selectedRows.length ? users.filter((user: User) => selectedRows.includes(user.id)) : users;
      exportCsv('shield-users-current-page.csv', records.map((user: User) => ({ username: user.username, email: user.email, client: user.clientName, role: user.role, status: user.status, created: user.createdAt })));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'export') { await handleExport(); return; }
    if (!canManage) return;
    if (selectedRows.length === 0) return;

    if(action==='delete' && !window.confirm(`Delete ${selectedRows.length} selected user accounts?`)) return;
    switch (action) {
      case 'delete':
        await Promise.all(selectedRows.map(id => dispatch(deleteUser(id))));
        break;
      case 'block':
        await Promise.all(selectedRows.map(id => dispatch(blockUser(id))));
        break;
      case 'unblock':
        await Promise.all(selectedRows.map(id => dispatch(unblockUser(id))));
        break;
    }
    
    dispatch(setSelectedRows([]));
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      truncate: true,
      width: '100px',
    },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {user.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {user.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'clientName',
      label: 'Client',
      sortable: true,
      render: (user: User) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {user.clientName || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          (user.role === 'SUPER_ADMIN' || user.role === 'GUARDIAN_ADMIN')
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' 
            : user.role === 'CLIENT_ADMIN'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
        }`}>
          {user.role?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.status === 'ACTIVE'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : user.status === 'BLOCKED'
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            user.status === 'ACTIVE' ? 'bg-green-500' :
            user.status === 'BLOCKED' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          {user.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (user: User) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      render: (user: User) => user.lastLoginAt 
        ? new Date(user.lastLoginAt).toLocaleDateString()
        : 'Never',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 lg:p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {canManage ? 'Manage users in your authorized applications.' : 'Review platform users and security history.'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || Object.keys(filters).some(k => filters[k as keyof UserFiltersState] && k !== 'sortBy' && k !== 'sortDir')
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className={`w-4 h-4 mr-2 ${exportLoading ? 'animate-spin' : ''}`} />
            Export page
          </button>
          
        </div>
      </div>

      {/* Selected Rows Actions */}
      {canManage && selectedRows.length > 0 && (
        <BulkActions
          selectedCount={selectedRows.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => dispatch(setSelectedRows([]))}
        />
      )}

      {/* Filters */}
      {showFilters && (
        <UserFilters
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Search */}
      <Card className="p-4">
        <SearchBar
          value={filters.search}
          onChange={handleSearch}
          placeholder="Search users by username, email, or client..."
          delay={500}
          className="max-w-xl"
        />
      </Card>

      {error && <div role="alert" className="auth-error">{error}<button className="text-button" onClick={() => dispatch(setFilters({}))}>Retry</button></div>}
      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner text="Loading users..." />
          </div>
        ) : (
          <>
            <UserTable
              columns={columns}
              data={users}
              selectedRows={selectedRows}
              onRowSelect={handleRowSelect}
              onSelectAll={handleSelectAll}
              onRowClick={handleUserClick}
              onStatusChange={handleStatusChange}
              loading={loading}
              canManage={canManage}
              actor={actor}
              onManageAdministrator={setAdministrator}
            />
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {pagination.totalElements > 0 ? (pagination.currentPage * pagination.pageSize) + 1 : 0} to{' '}
                  {Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalElements)} of{' '}
                  {pagination.totalElements} users
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    aria-label="Users per page"
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      aria-label="Previous page"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 0}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {pagination.currentPage + 1} of {Math.max(1,pagination.totalPages)}
                    </span>
                    
                    <button
                      aria-label="Next page"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages - 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* User Details Modal */}
      {administrator && <AdministratorModal user={administrator} onClose={() => setAdministrator(null)} onChanged={() => dispatch(setFilters({}))} />}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default Users;
