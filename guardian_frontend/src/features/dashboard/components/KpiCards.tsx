// src/features/dashboard/components/KpiCards.jsx
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KpiCards = ({ data }: { data: { title: string; value: number | string; color: string; icon: LucideIcon; change?: number; trend?: string }[] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {data.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {item.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {item.value.toLocaleString()}
              </p>
            </div>
            
            <div className={`p-3 rounded-lg ${
              item.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
              item.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
              item.color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
              item.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
              item.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <item.icon className="w-6 h-6" />
            </div>
          </div>
          
          {item.change !== undefined && (
            <div className="flex items-center mt-4">
              <div className={`flex items-center ${
                item.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                item.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {item.trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
                {item.trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
                {item.trend === 'neutral' && <Minus className="w-4 h-4 mr-1" />}
                <span className="text-sm font-medium">
                  {item.change > 0 ? '+' : ''}{item.change}%
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                from last period
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default KpiCards;