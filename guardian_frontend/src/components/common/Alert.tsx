// src/components/common/Alert.jsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  XCircle,
  X
} from 'lucide-react';

const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  showIcon = true,
  showCloseButton = true,
  className = '',
}: { type?: 'info' | 'success' | 'warning' | 'error'; title?: ReactNode; message?: ReactNode; onClose?: () => void; showIcon?: boolean; showCloseButton?: boolean; className?: string }) => {
  const alertConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-800 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-800 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-500 dark:text-green-400',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-500 dark:text-yellow-400',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-800 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-500 dark:text-red-400',
    },
  };

  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 ${className}`}
    >
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0 mr-3">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        )}
        
        <div className="flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.textColor} mb-1`}>
              {title}
            </h3>
          )}
          
          {message && (
            <div className={`text-sm ${config.textColor}`}>
              {message}
            </div>
          )}
        </div>
        
        {showCloseButton && onClose && (
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md ${config.textColor} hover:${config.bgColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type}-500`}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Alert;
