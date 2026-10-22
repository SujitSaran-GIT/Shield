// src/features/clients/components/ClientTable.jsx
import type { MouseEvent } from 'react';
import type { Client } from '../../../types';
import type { TableColumn } from '../../../components/common/Table';
import type { DropdownOption } from '../../../components/common/Dropdown';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Edit, 
  Power,
  PowerOff,
  Key,
  MoreVertical
} from 'lucide-react';
import { Dropdown } from '../../../components';


const ClientTable = ({
  columns,
  data,
  onStatusChange,
  onRowClick,
  onAction,
  loading,
}: { columns: TableColumn<Client>[]; data: Client[]; onStatusChange?: (id: string, action: string) => void; onRowClick?: (client: Client) => void; onAction?: (action: string, client: Client) => void; loading?: boolean }) => {
  const handleAction = (action: string, client: Client, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    switch (action) {
      case 'view':
        onRowClick?.(client);
        break;
      case 'edit':
        onAction?.('edit', client);
        break;
      case 'activate':
        onStatusChange?.(client.id, 'activate');
        break;
      case 'deactivate':
        onStatusChange?.(client.id, 'deactivate');
        break;
      case 'credentials':
        onAction?.('credentials', client);
        break;
      
    }
  };

  const dropdownItems = (client: Client): DropdownOption[] => [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (e) => handleAction('view', client, e),
    },
    {
      label: 'Edit Client',
      icon: Edit,
      onClick: (e) => handleAction('edit', client, e),
    },
    {
      label: 'View Credentials',
      icon: Key,
      onClick: (e) => handleAction('credentials', client, e),
      disabled: true, // Credentials are only shown once
    },
    {
      type: 'separator',
    },
    client.status === 'ACTIVE' 
      ? {
          label: 'Deactivate',
          icon: PowerOff,
          onClick: (e) => handleAction('deactivate', client, e),
          variant: 'warning',
        }
      : {
          label: 'Activate',
          icon: Power,
          onClick: (e) => handleAction('activate', client, e),
          variant: 'success',
        },
    {
      type: 'separator',
    },

  ];

  if (loading && data.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {data.map((client, index) => (
            <motion.tr
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onRowClick?.(client)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                >
                  {column.render ? column.render(client) : String(client[column.key as keyof Client] ?? '')}
                </td>
              ))}
              
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleAction('view', client, e)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={(e) => handleAction('edit', client, e)}
                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                    title="Edit client"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  {client.status === 'ACTIVE' ? (
                    <button
                      onClick={(e) => handleAction('deactivate', client, e)}
                      className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg"
                      title="Deactivate client"
                    >
                      <PowerOff className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleAction('activate', client, e)}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                      title="Activate client"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  )}
                  
                  <Dropdown
                    trigger={
                      <button
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    }
                    items={dropdownItems(client)}
                    placement="bottom-end"
                  />
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      
      {data.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No clients found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try creating a new client</p>
        </div>
      )}
    </div>
  );
};

export default ClientTable;