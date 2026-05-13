'use client';

import React from 'react';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low';
  percentage: number;
  label: string;
  color: string;
}

/**
 * Parse confidence percentage to level
 */
export function parseConfidenceLevel(confidence?: number): ConfidenceLevel {
  const pct = confidence ?? 0;

  if (pct >= 70) {
    return {
      level: 'high',
      percentage: pct,
      label: 'High Confidence',
      color: 'text-red-700 bg-red-50',
    };
  }

  if (pct >= 40) {
    return {
      level: 'medium',
      percentage: pct,
      label: 'Medium Confidence',
      color: 'text-amber-700 bg-amber-50',
    };
  }

  return {
    level: 'low',
    percentage: pct,
    label: 'Low Confidence',
    color: 'text-blue-700 bg-blue-50',
  };
}

interface AIConfidenceBadgeProps {
  confidence?: number;
  className?: string;
}

/**
 * Badge showing AI confidence level
 */
export function AIConfidenceBadge({ confidence, className = '' }: AIConfidenceBadgeProps) {
  if (confidence === undefined) return null;

  const level = parseConfidenceLevel(confidence);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${level.color} ${className}`}
    >
      <div className="flex items-center gap-1">
        {level.level === 'high' && <AlertCircle className="h-3.5 w-3.5" />}
        {level.level === 'medium' && <Zap className="h-3.5 w-3.5" />}
        {level.level === 'low' && <CheckCircle2 className="h-3.5 w-3.5" />}
      </div>
      <span>{level.label}</span>
    </div>
  );
}

interface AIScoreDisplayProps {
  score?: number;
  confidence?: number;
  label?: string;
  reasons?: string[];
  className?: string;
}

/**
 * Comprehensive AI score display with confidence and reasons
 */
export function AIScoreDisplay({
  score,
  confidence,
  label,
  reasons,
  className = '',
}: AIScoreDisplayProps) {
  if (score === undefined && confidence === undefined) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-purple-200 bg-purple-50 p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          AI Analysis
        </span>
        <AIConfidenceBadge confidence={confidence} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-purple-900">Anomaly Score:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-900">{score ?? 0}/100</span>
            <div className="h-2 w-24 rounded-full bg-purple-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all"
                style={{ width: `${Math.min(score ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {label && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-purple-900">Classification:</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200">
              {label === 'anomalous' && '🚨 Anomalous'}
              {label === 'suspicious' && '⚠️ Suspicious'}
              {label === 'normal' && '✓ Normal'}
            </span>
          </div>
        )}

        {reasons && reasons.length > 0 && (
          <div className="border-t border-purple-200 pt-2">
            <p className="mb-1 text-xs font-semibold text-purple-700">Reasons:</p>
            <ul className="space-y-1 text-xs text-purple-800">
              {reasons.slice(0, 3).map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
