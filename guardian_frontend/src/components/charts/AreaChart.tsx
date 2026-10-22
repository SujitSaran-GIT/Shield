// src/components/charts/AreaChart.jsx
import type { ChartProps, ChartTooltipProps } from './chartTypes';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center text-sm">
            <div
              className="w-3 h-3 rounded-sm mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 mr-2">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AreaChart = ({
  data = [],
  areas = [],
  xKey = 'name',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  stacked = false,
  gradient = true,
  animation = true,
  className = '',
}: ChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`w-full ${className}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.5}
            />
          )}
          
          {showXAxis && (
            <XAxis
              dataKey={xKey}
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
          )}
          
          {showYAxis && (
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
          )}
          
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
            />
          )}
          
          {showLegend && (
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={10}
              wrapperStyle={{
                fontSize: '12px',
                color: '#6b7280',
              }}
            />
          )}
          
          {areas.map((area, index) => (
            <Area
              key={area.key || index}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name}
              stackId={stacked ? 'stack' : undefined}
              stroke={area.color || '#3b82f6'}
              fill={area.color || '#3b82f6'}
              fillOpacity={gradient ? 0.2 : 0.8}
              strokeWidth={2}
              dot={{ 
                r: 3, 
                strokeWidth: 2, 
                stroke: area.color || '#3b82f6',
                fill: '#ffffff' 
              }}
              activeDot={{ 
                r: 5, 
                strokeWidth: 2, 
                stroke: area.color || '#3b82f6',
                fill: '#ffffff' 
              }}
              isAnimationActive={animation}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default AreaChart;