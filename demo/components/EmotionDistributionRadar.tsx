import React from 'react';
import { EmotionDistribution } from '../constants/dashboardData';

interface EmotionDistributionRadarProps {
  data: EmotionDistribution;
}

const EmotionDistributionRadar: React.FC<EmotionDistributionRadarProps> = ({ data }) => {
  // Chart dimensions
  const size = 400;
  const center = size / 2;
  const maxRadius = 150;
  const levels = 5; // Number of gridline levels

  // Define the 6 dimensions with their Chinese labels
  const dimensions = [
    { key: 'anxiety' as keyof EmotionDistribution, label: '焦虑', color: '#f59e0b' },
    { key: 'confusion' as keyof EmotionDistribution, label: '困惑', color: '#8b5cf6' },
    { key: 'frustration' as keyof EmotionDistribution, label: '沮丧', color: '#ef4444' },
    { key: 'curiosity' as keyof EmotionDistribution, label: '好奇', color: '#3b82f6' },
    { key: 'confidence' as keyof EmotionDistribution, label: '自信', color: '#10b981' },
    { key: 'excitement' as keyof EmotionDistribution, label: '兴奋', color: '#ec4899' },
  ];

  // Calculate angle for each axis (360 degrees / 6 dimensions)
  const angleStep = (Math.PI * 2) / dimensions.length;

  // Function to calculate point coordinates on the radar
  const getPointCoordinates = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Function to get axis endpoint coordinates
  const getAxisEndpoint = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + maxRadius * Math.cos(angle),
      y: center + maxRadius * Math.sin(angle),
    };
  };

  // Function to get label position (slightly beyond the axis endpoint)
  const getLabelPosition = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const labelRadius = maxRadius + 30;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  };

  // Generate polygon path for the data
  const dataPoints = dimensions.map((dim, index) => 
    getPointCoordinates(data[dim.key], index)
  );
  
  const polygonPath = dataPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z';

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">情绪分布雷达图</h3>
        <p className="text-xs sm:text-sm text-slate-600">展示六个情绪维度的分布情况</p>
      </div>

      {/* SVG Radar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex justify-center hover:shadow-md transition-shadow duration-300">
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible max-w-full h-auto"
        >
          {/* Gridlines (concentric hexagons) */}
          {Array.from({ length: levels }, (_, i) => {
            const levelRadius = maxRadius * ((i + 1) / levels);
            const levelPoints = dimensions.map((_, index) => {
              const angle = angleStep * index - Math.PI / 2;
              return {
                x: center + levelRadius * Math.cos(angle),
                y: center + levelRadius * Math.sin(angle),
              };
            });
            
            const levelPath = levelPoints
              .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
              .join(' ') + ' Z';

            return (
              <path
                key={`grid-${i}`}
                d={levelPath}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}

          {/* Axes */}
          {dimensions.map((dim, index) => {
            const endpoint = getAxisEndpoint(index);
            return (
              <line
                key={`axis-${index}`}
                x1={center}
                y1={center}
                x2={endpoint.x}
                y2={endpoint.y}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Data polygon */}
          <path
            d={polygonPath}
            fill="rgba(236, 72, 153, 0.2)"
            stroke="#ec4899"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Data points */}
          {dataPoints.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={5}
              fill="#ec4899"
              stroke="white"
              strokeWidth="2"
              className="transition-all duration-300 hover:r-6"
            />
          ))}

          {/* Axis labels */}
          {dimensions.map((dim, index) => {
            const labelPos = getLabelPosition(index);
            return (
              <text
                key={`label-${index}`}
                x={labelPos.x}
                y={labelPos.y}
                fill="#475569"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {dim.label}
              </text>
            );
          })}

          {/* Scale labels (0, 50, 100) */}
          {[0, 50, 100].map((value, i) => {
            const radius = (value / 100) * maxRadius;
            return (
              <text
                key={`scale-${i}`}
                x={center + 5}
                y={center - radius}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="start"
              >
                {value}
              </text>
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
                  情绪维度
                </th>
                <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  数值
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dimensions.map((dim, index) => (
                <tr 
                  key={`row-${index}`}
                  className="hover:bg-slate-50 transition-colors duration-200"
                >
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <span 
                      className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: `${dim.color}20`,
                        color: dim.color 
                      }}
                    >
                      {dim.label}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                    {data[dim.key].toFixed(1)}
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

export default EmotionDistributionRadar;
