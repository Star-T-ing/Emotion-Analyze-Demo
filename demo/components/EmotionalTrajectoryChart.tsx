import React, { useState } from 'react';
import { TrajectoryDataPoint } from '../constants/dashboardData';

interface EmotionalTrajectoryChartProps {
  data: TrajectoryDataPoint[];
}

const EmotionalTrajectoryChart: React.FC<EmotionalTrajectoryChartProps> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Chart dimensions and padding
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const minMessage = Math.min(...data.map(d => d.messageNumber));
  const maxMessage = Math.max(...data.map(d => d.messageNumber));
  const minValence = 0;
  const maxValence = 100;

  const xScale = (messageNumber: number) => {
    return padding.left + ((messageNumber - minMessage) / (maxMessage - minMessage)) * chartWidth;
  };

  const yScale = (valence: number) => {
    return padding.top + chartHeight - ((valence - minValence) / (maxValence - minValence)) * chartHeight;
  };

  // Generate path for the line
  const linePath = data.map((point, index) => {
    const x = xScale(point.messageNumber);
    const y = yScale(point.valence);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate x-axis ticks
  const xTicks = data.map(d => d.messageNumber);

  // Generate y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">情感轨迹图</h3>
        <p className="text-xs sm:text-sm text-slate-600">展示对话过程中情绪愉悦度的变化趋势</p>
      </div>

      {/* SVG Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
          style={{ maxWidth: '100%' }}
        >
          {/* Grid lines */}
          {yTicks.map(tick => (
            <line
              key={`grid-${tick}`}
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Y-axis label */}
          <text
            x={padding.left - 45}
            y={padding.top + chartHeight / 2}
            fill="#475569"
            fontSize="14"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90, ${padding.left - 45}, ${padding.top + chartHeight / 2})`}
          >
            愉悦度
          </text>

          {/* X-axis label */}
          <text
            x={padding.left + chartWidth / 2}
            y={height - padding.bottom + 45}
            fill="#475569"
            fontSize="14"
            fontWeight="600"
            textAnchor="middle"
          >
            消息序号
          </text>

          {/* Y-axis ticks and labels */}
          {yTicks.map(tick => (
            <g key={`y-tick-${tick}`}>
              <line
                x1={padding.left - 5}
                y1={yScale(tick)}
                x2={padding.left}
                y2={yScale(tick)}
                stroke="#64748b"
                strokeWidth="2"
              />
              <text
                x={padding.left - 10}
                y={yScale(tick)}
                fill="#64748b"
                fontSize="12"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X-axis ticks and labels */}
          {xTicks.map(tick => (
            <g key={`x-tick-${tick}`}>
              <line
                x1={xScale(tick)}
                y1={height - padding.bottom}
                x2={xScale(tick)}
                y2={height - padding.bottom + 5}
                stroke="#64748b"
                strokeWidth="2"
              />
              <text
                x={xScale(tick)}
                y={height - padding.bottom + 20}
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Line connecting points */}
          <path
            d={linePath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points (bubbles) */}
          {data.map((point, index) => {
            const x = xScale(point.messageNumber);
            const y = yScale(point.valence);
            const isHovered = hoveredPoint === index;

            return (
              <g key={`point-${index}`}>
                {/* Outer glow when hovered */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill={point.emotionColor}
                    opacity={0.2}
                  />
                )}
                
                {/* Main bubble */}
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill={point.emotionColor}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : 'none',
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                    transformOrigin: `${x}px ${y}px`,
                  }}
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 60}
                      y={y - 70}
                      width={120}
                      height={55}
                      fill="white"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      rx="8"
                      filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
                    />
                    <text
                      x={x}
                      y={y - 50}
                      fill="#1e293b"
                      fontSize="12"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      消息 #{point.messageNumber}
                    </text>
                    <text
                      x={x}
                      y={y - 35}
                      fill="#64748b"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      愉悦度: {point.valence}
                    </text>
                    <text
                      x={x}
                      y={y - 20}
                      fill={point.emotionColor}
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {point.emotion}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Data Table */}
      <div className="mt-4 sm:mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-700">详细数据</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  消息序号
                </th>
                <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  愉悦度
                </th>
                <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  情绪标签
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((point, index) => (
                <tr 
                  key={`row-${index}`}
                  className="hover:bg-slate-50 transition-colors duration-200"
                >
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    #{point.messageNumber}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-700">
                    {point.valence.toFixed(1)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <span 
                      className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: `${point.emotionColor}20`,
                        color: point.emotionColor 
                      }}
                    >
                      {point.emotion}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmotionalTrajectoryChart;
