// src/components/charts/LineChart.jsx
import type { ChartProps, ChartTooltipProps } from './chartTypes';
import { 
  LineChart as RechartsLineChart,
  Line,
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
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const LineChart = ({
  data = [],
  lines = [],
  xKey = 'name',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  strokeWidth = 2,
  animation = true,
  syncId,
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          syncId={syncId}
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
          
          {lines.map((line, index) => (
            <Line
              key={line.key || index}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || '#3b82f6'}
              strokeWidth={strokeWidth}
              dot={{ 
                r: 4, 
                strokeWidth: 2, 
                stroke: line.color || '#3b82f6',
                fill: '#ffffff' 
              }}
              activeDot={{ 
                r: 6, 
                strokeWidth: 2, 
                stroke: line.color || '#3b82f6',
                fill: '#ffffff' 
              }}
              isAnimationActive={animation}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default LineChart;