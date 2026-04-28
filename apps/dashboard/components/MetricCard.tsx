'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  bgColor?: string;
  iconColor?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  bgColor = 'bg-blue-50',
  iconColor,
}: MetricCardProps) {
  const colorMap: Record<string, string> = {
    'bg-blue-50': 'text-blue-600',
    'bg-red-50': 'text-red-600',
    'bg-green-50': 'text-green-600',
    'bg-yellow-50': 'text-yellow-600',
    'bg-purple-50': 'text-purple-600',
  };

  const ic = iconColor || colorMap[bgColor] || 'text-blue-600';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400';

  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500 tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1.5 text-sm ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`${bgColor} rounded-xl p-3.5 transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-6 h-6 ${ic}`} />
        </div>
      </div>
    </div>
  );
}
