// src/components/charts/PieChart.jsx
import type { PieLabelRenderProps } from 'recharts';
import type { ChartTooltipProps } from './chartTypes';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6'
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle = 0,
  innerRadius,
  outerRadius,
  percent = 0,
}: PieLabelRenderProps) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > Number(cx) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-2">
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: data.color || payload[0].color }}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.name}
          </span>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Value: <span className="font-semibold">{data.value.toLocaleString()}</span>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Percentage: <span className="font-semibold">{(data.percent * 100).toFixed(1)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const PieChart = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  innerRadius = 60,
  outerRadius = 80,
  showTooltip = true,
  showLegend = true,
  legendPosition = 'right',
  showLabel = true,
  animation = true,
  className = '',
}: { data?: { name: string; value: number; color?: string }[]; dataKey?: string; nameKey?: string; height?: number; innerRadius?: number; outerRadius?: number; showTooltip?: boolean; showLegend?: boolean; legendPosition?: 'right' | 'bottom' | 'left' | 'top'; showLabel?: boolean; animation?: boolean; className?: string }) => {
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
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const legendConfig = {
    right: {
      layout: 'vertical',
      verticalAlign: 'middle',
      align: 'right',
    },
    bottom: {
      layout: 'horizontal',
      verticalAlign: 'bottom',
      align: 'center',
    },
    left: {
      layout: 'vertical',
      verticalAlign: 'middle',
      align: 'left',
    },
    top: {
      layout: 'horizontal',
      verticalAlign: 'top',
      align: 'center',
    },
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`w-full ${className}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && (
            <Legend
              {...legendConfig[legendPosition]}
              iconType="circle"
              iconSize={10}
              wrapperStyle={{
                fontSize: '12px',
                color: '#6b7280',
              }}
            />
          )}
          
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabel ? renderCustomizedLabel : false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            isAnimationActive={animation}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default PieChart;