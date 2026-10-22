// src/components/charts/RadarChart.jsx
import type { ChartProps, ChartTooltipProps } from './chartTypes';
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {payload[0].payload.subject}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center text-sm">
            <div
              className="w-3 h-3 rounded-full mr-2"
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

const RadarChart = ({
  data = [],
  radars = [],
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  showAngleAxis = true,
  showRadiusAxis = true,
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
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
        <RechartsRadarChart
          cx="50%"
          cy="50%"
          outerRadius="80%"
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <PolarGrid 
              stroke="#e5e7eb" 
              strokeOpacity={0.5}
            />
          )}
          
          {showAngleAxis && (
            <PolarAngleAxis
              dataKey="subject"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
          )}
          
          {showRadiusAxis && (
            <PolarRadiusAxis
              angle={30}
              domain={[0, 'auto']}
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
          )}
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
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
          
          {radars.map((radar, index) => (
            <Radar
              key={radar.key || index}
              name={radar.name}
              dataKey={radar.dataKey}
              stroke={radar.color || '#3b82f6'}
              fill={radar.color || '#3b82f6'}
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ 
                r: 4, 
                strokeWidth: 2, 
                stroke: radar.color || '#3b82f6',
                fill: '#ffffff' 
              }}
              isAnimationActive={animation}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RadarChart;