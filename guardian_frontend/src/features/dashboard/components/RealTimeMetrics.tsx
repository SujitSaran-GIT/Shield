// src/features/dashboard/components/RealTimeMetrics.jsx

import { motion } from 'framer-motion';
import { Clock, Users, MapPin, Monitor } from 'lucide-react';

const RealTimeMetrics = ({ data }: { data: { activeSessions?: number; recentLogins?: { user?: string; time?: string; client?: string }[] } }) => {
  const metrics = [
    {
      icon: Users,
      label: 'Active Sessions',
      value: data.activeSessions || 0,
      color: 'blue',
    },
    {
      icon: Clock,
      label: 'Last Hour Logins',
      value: data.recentLogins?.length || 0,
      color: 'green',
    },
    {
      icon: MapPin,
      label: 'Unique Locations',
      value: 'Unavailable',
      color: 'purple',
    },
    {
      icon: Monitor,
      label: 'Active Devices',
      value: 'Unavailable',
      color: 'yellow',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center"
          >
            <div className={`inline-flex p-3 rounded-lg mb-3 ${
              metric.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
              metric.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              metric.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              <metric.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metric.value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {metric.label}
            </p>
          </motion.div>
        ))}
      </div>
      
      {/* Recent Logins */}
      {data.recentLogins && data.recentLogins.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Recent Logins
          </h4>
          <div className="space-y-2">
            {data.recentLogins.slice(0, 3).map((login, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {login.user || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {login.time || 'Just now'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  {login.client || 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMetrics;