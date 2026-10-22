// src/components/common/NotificationContainer.jsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { dismissNotification } from '../../features/notification/notificationSlice';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContainer = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((state) => state.notification);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  useEffect(() => {
    const timers = notifications.map(notification => {
      return setTimeout(() => {
        dispatch(dismissNotification(notification.id));
      }, notification.duration);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, dispatch]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-[calc(100vw-2rem)] space-y-3" aria-live="polite">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className={`${getBgColor(notification.type)} border rounded-lg shadow-lg max-w-sm`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {notification.title}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {notification.message}
                  </p>
                </div>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => dispatch(dismissNotification(notification.id))}
                  className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
