// src/components/common/Table.jsx
import { useState, type ReactNode, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreVertical, 
  Filter, 
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export interface TableColumn<T> { key: string; label: string; sortable?: boolean; truncate?: boolean; width?: string | number; render?: (row: T) => ReactNode }
interface TableProps<T> { columns: TableColumn<T>[]; data: T[]; loading?: boolean; emptyMessage?: string; onSort?: (key: string, direction: string) => void; onRowClick?: (row: T) => void; onAction?: (action: string, row: T) => void; selectable?: boolean; selectedRows?: string[]; onSelect?: (id: string, checked: boolean) => void; onSelectAll?: (checked: boolean) => void; actions?: string[]; className?: string; striped?: boolean; hoverable?: boolean }
const Table = <T extends { id: string },>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onSort,
  onRowClick,
  onAction,
  selectable = false,
  selectedRows = [],
  onSelect,
  onSelectAll,
  actions = [],
  className = '',
  striped = true,
  hoverable = true,
}: TableProps<T>) => {
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (columnKey: string) => {
    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnKey);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(columnKey, newDirection);
    }
  };

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked);
    }
  };

  const handleSelectRow = (row: T, e: ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(row.id, e.target.checked);
    }
  };

  const renderCell = (row: T, column: TableColumn<T>): ReactNode => {
    if (column.render) return column.render(row);
    let value: unknown = row;
    for (const key of column.key.split('.')) {
      value = value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
    }
    return value == null ? '-' : typeof value === 'string' || typeof value === 'number' ? value : String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
          <Filter className="w-full h-full" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortColumn === column.key && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              
              {actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {data.map((row, index) => (
              <motion.tr
                key={row.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${striped && index % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''} ${
                  hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                } transition-colors duration-150`}
                onClick={() => handleRowClick(row)}
              >
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={(e) => handleSelectRow(row, e)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                  >
                    <div className={column.truncate ? 'truncate max-w-xs' : ''}>
                      {renderCell(row, column)}
                    </div>
                  </td>
                ))}
                
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {actions.includes('view') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction?.('view', row);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      {actions.includes('edit') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction?.('edit', row);
                          }}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {actions.includes('delete') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction?.('delete', row);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      {actions.includes('more') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction?.('more', row);
                          }}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;