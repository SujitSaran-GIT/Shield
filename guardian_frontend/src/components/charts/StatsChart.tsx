// src/components/charts/StatsChart.jsx
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsChart = ({
  title,
  value,
  change,
  changeType = 'percent',
  icon: Icon,
  color = 'blue',
  trend = 'up',
  loading = false,
  className = '',
}: { title: string; value: number | string; change?: number; changeType?: 'percent' | 'number'; icon?: LucideIcon; color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink'; trend?: 'up' | 'down' | 'neutral'; loading?: boolean; className?: string }) => {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  };

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const formatChange = (val: number) => {
    if (changeType === 'percent') {
      return `${val > 0 ? '+' : ''}${val}%`;
    }
    return `${val > 0 ? '+' : ''}${formatValue(val)}`;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow p-6 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {formatValue(value)}
          </p>
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className="flex items-center mt-4">
          <div className={`flex items-center ${trendColors[trend]}`}>
            {trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
            {trend === 'neutral' && <Minus className="w-4 h-4 mr-1" />}
            <span className="text-sm font-medium">
              {formatChange(change)}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
            from last period
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default StatsChart;