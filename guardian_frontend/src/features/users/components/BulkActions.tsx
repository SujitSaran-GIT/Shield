// src/features/users/components/BulkActions.jsx
import { motion } from 'framer-motion';
import { X, UserCheck, UserX, Trash2, Download } from 'lucide-react';
import { Button } from '../../../components';

const BulkActions = ({ selectedCount, onBulkAction, onClearSelection }: { selectedCount: number; onBulkAction: (action: string) => void; onClearSelection: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              {selectedCount}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Perform actions on all selected users
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('block')}
            icon={UserX}
          >
            Block
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('unblock')}
            icon={UserCheck}
          >
            Unblock
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('delete')}
            icon={Trash2}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('export')}
            icon={Download}
          >
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            icon={X}
          >
            Clear
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default BulkActions;