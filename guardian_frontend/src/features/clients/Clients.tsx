// src/features/clients/Clients.jsx
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchClients,
  setFilters,
  deactivateClient,
  activateClient,
} from './clientsSlice';
import ClientTable from './components/ClientTable';
import ClientModal from './components/ClientModal';
import ClientCredentialsModal from './components/ClientCredentialsModal';
import ClientDetailsModal from './components/ClientDetailsModal';
import ClientStatistics from './components/ClientStatistics';
import ClientFilters from './components/ClientFilters';
import ClientIntegrationGuide from './components/ClientIntegrationGuide';
import { 
  Building, 
  Plus,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  Code,
} from 'lucide-react';
import { Card, SearchBar, LoadingSpinner } from '../../components';

import type { Client } from '../../types';
import type { ClientCredentials, ClientFilters as Filters } from './clientsSlice';
import type { TableColumn } from '../../components/common/Table';
const Clients = () => {
  const dispatch = useAppDispatch();
  const {
    clients,
    loading,
    pagination,
    filters,
    registering,
  } = useAppSelector((state) => state.clients);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newCredentials, setNewCredentials] = useState<ClientCredentials | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const loadClients = useCallback(() => {
    const params = {
      page: pagination.currentPage,
      size: pagination.pageSize,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && { startDate: filters.startDate }),
    };
    
    void dispatch(fetchClients(params));
  }, [dispatch, filters, pagination.currentPage, pagination.pageSize]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleSearch = (term: string) => { setSearchTerm(term); };
  const visibleClients = clients.filter((client: Client) => [client.name, client.clientId, client.description].some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase())));

  const handleFilterChange = (newFilters: Filters) => {
    dispatch(setFilters({ ...newFilters, page: 0 }));
  };

  const handlePageChange = (page: number) => {
    dispatch(setFilters({ page }));
  };

  const handleStatusChange = async (clientId: string, action: string) => {
    if (action === 'deactivate') {
      await dispatch(deactivateClient(clientId));
    } else {
      await dispatch(activateClient(clientId));
    }
  };

  const handleAction = (action: string, client: Client) => {
    switch (action) {
      case 'edit':
        setSelectedClient(client);
        setShowCreateModal(true);
        break;
      case 'credentials':
        setSelectedClient(client);
        setShowIntegrationGuide(true);
        break;

    }
  };

  const handleCreateSuccess = (credentials?: ClientCredentials) => {
    if (!credentials) { setShowCreateModal(false); loadClients(); return; }
    setNewCredentials(credentials);
    loadClients();
    setShowCreateModal(false);
    setShowCredentialsModal(true);
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      // Implement export logic
      const data: Record<string, string | number>[] = visibleClients.map(client => ({
        'Client ID': client.clientId,
        'Name': client.name,
        'Description': client.description,
        'Status': client.status,
        'Created': new Date(client.createdAt).toLocaleDateString(),
        'Users': client.userCount || 0,
        'Origins': client.allowedOrigins?.join(', ') || '',
      }));

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const columns: TableColumn<Client>[] = [
    {
      key: 'clientId',
      label: 'Client ID',
      sortable: true,
      truncate: true,
      render: (client: Client) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {client.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {client.clientId}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      truncate: true,
    },
    {
      key: 'allowedOrigins',
      label: 'Allowed Origins',
      render: (client: Client) => (
        <div className="flex flex-wrap gap-1">
          {client.allowedOrigins?.slice(0, 2).map((origin, index) => (
            <span
              key={index}
              className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
            >
              {origin}
            </span>
          ))}
          {client.allowedOrigins?.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{client.allowedOrigins.length - 2} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (client: Client) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          client.status === 'ACTIVE'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : client.status === 'INACTIVE'
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            client.status === 'ACTIVE' ? 'bg-green-500' :
            client.status === 'INACTIVE' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          {client.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (client: Client) => new Date(client.createdAt).toLocaleDateString(),
    },
    {
      key: 'userCount',
      label: 'Users',
      sortable: true,
      render: (client: Client) => client.userCount || 0,
    },
  ];

  const views = [
    { id: 'list', label: 'List View', icon: Building },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'guide', label: 'Integration Guide', icon: Code },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'list':
        return (
          <>
            <Card className="p-4 mb-6">
              <SearchBar
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search this page by name, ID, or description..."
                delay={500}
                className="max-w-xl"
              />
            </Card>

            <Card>
              {loading && clients.length === 0 ? (
                <div className="py-12">
                  <LoadingSpinner text="Loading clients..." />
                </div>
              ) : (
                <>
                  <ClientTable
                    columns={columns}
                    data={visibleClients}
                    onStatusChange={handleStatusChange}
                    onRowClick={handleClientClick}
                    onAction={handleAction}
                    loading={loading}
                  />
                  
                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {pagination.totalElements > 0 ? (pagination.currentPage * pagination.pageSize) + 1 : 0} to{' '}
                        {Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalElements)} of{' '}
                        {pagination.totalElements} clients
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <select
                          value={pagination.pageSize}
                          onChange={(e) => dispatch(setFilters({ pageSize: parseInt(e.target.value), page: 0 }))}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                        >
                          <option value="10">10 per page</option>
                          <option value="20">20 per page</option>
                          <option value="50">50 per page</option>
                          <option value="100">100 per page</option>
                        </select>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 0}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page {pagination.currentPage + 1} of {pagination.totalPages}
                          </span>
                          
                          <button
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
          </>
        );
      
      case 'stats':
        return <ClientStatistics clients={clients} />;
      
      case 'guide':
        return selectedClient ? (
          <ClientIntegrationGuide 
            clientId={selectedClient.clientId}
            clientName={selectedClient.name}
          />
        ) : (
          <Card>
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select a Client
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a client from the list to view its integration guide
              </p>
            </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

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
            Client Applications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage third-party applications using Guardian authentication
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center transition-colors ${
                  activeView === view.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <view.icon className="w-4 h-4 mr-1.5" />
                {view.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || Object.keys(filters).some(k => filters[k as keyof Filters] && k !== 'sortBy' && k !== 'sortDir')
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={loadClients}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className={`w-4 h-4 mr-2 ${exportLoading ? 'animate-spin' : ''}`} />
            Export
          </button>
          
          <button
            onClick={() => { setSelectedClient(null); setShowCreateModal(true); }}
            disabled={registering}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <ClientFilters
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Main Content */}
      {renderView()}

      {/* Modals */}
      {showCreateModal && (
        <ClientModal
            mode={selectedClient ? 'edit' : 'create'}
            client={selectedClient}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showCredentialsModal && newCredentials && (
        <ClientCredentialsModal
          credentials={newCredentials}
          onClose={() => {
            setShowCredentialsModal(false);
            setNewCredentials(null);
          }}
        />
      )}

      {showDetailsModal && selectedClient && (
        <ClientDetailsModal
          clientId={selectedClient.id}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedClient(null);
          }}
        />
      )}

      {showIntegrationGuide && selectedClient && (
        <ClientIntegrationGuide
          clientId={selectedClient.clientId}
          clientName={selectedClient.name}
        />
      )}
    </motion.div>
  );
};

export default Clients;