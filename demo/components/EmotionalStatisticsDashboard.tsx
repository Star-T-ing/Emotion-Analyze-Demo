import React from 'react';
import EmotionalTrajectoryChart from './EmotionalTrajectoryChart';
import EmotionDistributionRadar from './EmotionDistributionRadar';
import CognitiveStateRadar from './CognitiveStateRadar';
import {
  DEMO_TRAJECTORY_DATA,
  DEMO_EMOTION_DISTRIBUTION,
  DEMO_COGNITIVE_STATE,
} from '../constants/dashboardData';

interface EmotionalStatisticsDashboardProps {
  onToggleView: () => void;
}

const EmotionalStatisticsDashboard: React.FC<EmotionalStatisticsDashboardProps> = ({ onToggleView }) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-pink-50/30 to-indigo-50/30 animate-fadeIn">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header with title and toggle button */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="animate-slideInLeft">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-indigo-600 bg-clip-text text-transparent mb-2">
              情感分析仪表盘
            </h1>
            <p className="text-slate-600 text-base sm:text-lg">
              深入了解您的情感轨迹与认知状态
            </p>
          </div>
          <button
            onClick={onToggleView}
            className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group font-medium animate-slideInRight"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>返回对话</span>
          </button>
        </div>

        {/* Main dashboard content */}
        <div className="space-y-6 md:space-y-8">
          {/* Emotional Trajectory Chart - Full Width */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            <EmotionalTrajectoryChart data={DEMO_TRAJECTORY_DATA} />
          </div>

          {/* Two-column grid for radar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Emotion Distribution Radar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
              <EmotionDistributionRadar data={DEMO_EMOTION_DISTRIBUTION} />
            </div>

            {/* Cognitive State Radar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
              <CognitiveStateRadar data={DEMO_COGNITIVE_STATE} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalStatisticsDashboard;
