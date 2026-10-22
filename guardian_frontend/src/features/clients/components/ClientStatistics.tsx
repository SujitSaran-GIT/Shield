// src/features/clients/components/ClientStatistics.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Activity,
  Shield,
  Clock
} from 'lucide-react';
import { BarChart } from '../../../components';
import type { Client } from '../../../types';

interface ClientStatisticsProps {
  clients?: Client[];
  timeRange?: string;
}

const ClientStatistics = ({ clients = [], timeRange: initialRange = '30d' }: ClientStatisticsProps) => {
  const [timeRange, setTimeRange] = useState(initialRange);
  // Calculate statistics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'ACTIVE').length;
  const inactiveClients = clients.filter(c => c.status === 'INACTIVE').length;
  const averageUsers = Math.round(
    clients.reduce((acc, c) => acc + (c.userCount || 0), 0) / Math.max(clients.length, 1)
  );
  
  const stats = [
    {
      title: 'Total Clients',
      value: totalClients,
      icon: Shield,
      color: 'blue',
    },
    {
      title: 'Active',
      value: activeClients,
      icon: Activity,
      color: 'green',
    },
    {
      title: 'Avg Users/Client',
      value: averageUsers,
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Avg Session Time',
      value: 'Unavailable',
      icon: Clock,
      color: 'yellow',
    },
  ];

  const rangeDays = ({ '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as Record<string, number>)[timeRange] || 30;
  const cutoff = new Date().getTime() - rangeDays * 86400000;
  const buckets = new Map<string, number>();
  for (const client of clients) {
    if (new Date(client.createdAt).getTime() < cutoff) continue;
    const date = client.createdAt.slice(0, 10);
    buckets.set(date, (buckets.get(date) || 0) + 1);
  }
  const chartData = [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, clients: count }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Statistics cover the currently loaded page of clients. Historical session duration is unavailable.</p>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stat.value}
                </p>
              </div>
              
              <div className={`p-3 rounded-lg ${
                stat.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                stat.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                stat.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Client Growth
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              New clients on this page in the selected period
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <BarChart
          data={chartData}
          bars={[
            { dataKey: 'clients', name: 'New Clients', color: '#3b82f6' },
          ]}
          xKey="month"
          height={300}
          showGrid
          showTooltip
          showLegend
        />
      </div>

      {/* Client Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Status Distribution
          </h3>
          <div className="space-y-4">
            {[
              { status: 'Active', count: activeClients, color: 'bg-green-500', percentage: Math.round((activeClients / Math.max(totalClients, 1)) * 100) },
              { status: 'Inactive', count: inactiveClients, color: 'bg-red-500', percentage: Math.round((inactiveClients / Math.max(totalClients, 1)) * 100) },
            ].map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${item.color} mr-2`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.count} ({item.percentage}%)
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients by Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Top Clients by Users
          </h3>
          <div className="space-y-4">
            {[...clients]
              .sort((a, b) => (b.userCount || 0) - (a.userCount || 0))
              .slice(0, 5)
              .map((client, index) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {client.clientId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {client.userCount || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      users
                    </p>
                  </div>
                </div>
              ))}
            
            {clients.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No client data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientStatistics;
