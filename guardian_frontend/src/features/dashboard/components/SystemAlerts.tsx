// src/features/dashboard/components/SystemAlerts.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const SystemAlerts = ({ alerts = [] }: { alerts?: { id?: string | number; type: string; message: string; time: string }[] }) => {
  const [dismissed, setDismissed] = useState<(string | number)[]>([]);
  const displayAlerts = alerts.filter((alert, index) => !dismissed.includes(alert.id ?? index));

  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-800 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-500 dark:text-green-400',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-500 dark:text-yellow-400',
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-500 dark:text-red-400',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-500 dark:text-blue-400',
        };
    }
  };

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert, index) => {
        const config = getAlertConfig(alert.type);
        const Icon = config.icon;
        
        return (
          <motion.div
            key={alert.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}
          >
            <div className="flex items-start">
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="ml-3 flex-1">
                <p className={`text-sm ${config.textColor}`}>
                  {alert.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {alert.time}
                </p>
              </div>
              <button aria-label="Dismiss alert" onClick={() => setDismissed((current) => [...current, alert.id ?? index])} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        );
      })}
      
      {displayAlerts.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No recent alerts</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No alerts to display</p>
        </div>
      )}
    </div>
  );
};

export default SystemAlerts;