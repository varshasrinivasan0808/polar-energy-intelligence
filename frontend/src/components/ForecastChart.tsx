import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface ForecastChartProps {
  data: Array<any>
  title: string
  lines?: Array<{
    key: string
    name: string
    color: string
    type?: 'linear' | 'monotone'
  }>
  height?: number
  showLegend?: boolean
  xAxisKey?: string
  yAxisLabel?: string
  chartType?: 'line' | 'area'
}

const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  title,
  lines = [],
  height = 300,
  showLegend = true,
  xAxisKey = 'time',
  yAxisLabel = 'Value',
  chartType = 'line',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-blue-700 bg-blue-900/30 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    )
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="p-6 rounded-lg border border-blue-700 bg-blue-900/30 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" />
            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {lines.map((line, idx) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.1}
                name={line.name}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" />
            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
            {lines.map((line, idx) => (
              <Line
                key={line.key}
                type={line.type || 'monotone'}
                dataKey={line.key}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                name={line.name}
                dot={false}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default ForecastChart
