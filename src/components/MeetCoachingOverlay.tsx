// src/components/MeetCoachingOverlay.tsx
// Live coaching overlay for Google Meet calls

import { useState, useEffect } from 'react';
import { AlertCircle, Zap, TrendingUp } from 'lucide-react';

interface CoachingRecommendation {
  id: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  spinCategory: string;
  examples: string[];
}

interface MeetCoachingOverlayProps {
  sessionCode: string;
  isActive: boolean;
  onRecommendation?: (rec: CoachingRecommendation) => void;
}

export function MeetCoachingOverlay({
  sessionCode,
  isActive,
  onRecommendation,
}: MeetCoachingOverlayProps) {
  const [recommendation, setRecommendation] = useState<CoachingRecommendation | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    // Subscribe to realtime recommendations
    // This would connect to Supabase Realtime in production
    const handleRecommendation = (rec: CoachingRecommendation) => {
      setRecommendation(rec);
      onRecommendation?.(rec);

      // Auto-hide non-critical suggestions after 12 seconds
      if (rec.priority !== 'high') {
        const timer = setTimeout(() => setRecommendation(null), 12000);
        return () => clearTimeout(timer);
      }
    };

    // Placeholder for subscription setup
    console.log('[Meet Coach] Overlay active for session:', sessionCode);

    return () => {
      // Cleanup subscription
    };
  }, [isActive, sessionCode, onRecommendation]);

  if (!isActive || !recommendation) {
    return null;
  }

  const priorityColor =
    recommendation.priority === 'high'
      ? 'bg-red-50 border-red-300'
      : recommendation.priority === 'medium'
        ? 'bg-yellow-50 border-yellow-300'
        : 'bg-blue-50 border-blue-300';

  const priorityIcon =
    recommendation.priority === 'high' ? (
      <AlertCircle className="w-5 h-5 text-red-600" />
    ) : recommendation.priority === 'medium' ? (
      <Zap className="w-5 h-5 text-yellow-600" />
    ) : (
      <TrendingUp className="w-5 h-5 text-blue-600" />
    );

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 max-w-[calc(100vw-32px)] 
                  border-2 border-black rounded-lg shadow-lg p-4 
                  ${priorityColor} animate-in fade-in zoom-in-95 duration-300 z-40`}
    >
      <div className="space-y-3">
        {/* Header with priority icon and SPIN category */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            {priorityIcon}
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">
                {recommendation.suggestion}
              </h3>
              <p className="text-xs text-gray-600 font-mono mt-0.5">
                {recommendation.spinCategory.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setRecommendation(null)}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Reasoning */}
        <p className="text-xs text-gray-700 leading-relaxed">
          {recommendation.reasoning}
        </p>

        {/* Examples toggle */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
        >
          {showExamples ? 'Hide' : 'Show'} example questions →
        </button>

        {/* Examples */}
        {showExamples && (
          <div className="space-y-1.5 bg-white/50 p-2 rounded border border-gray-200">
            {recommendation.examples.map((example, i) => (
              <p key={i} className="text-xs text-gray-700 italic">
                • {example}
              </p>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-300">
          <button className="flex-1 py-1.5 px-3 bg-black text-white text-xs font-bold 
                           rounded uppercase hover:bg-gray-900 transition">
            Accept
          </button>
          <button
            onClick={() => setRecommendation(null)}
            className="flex-1 py-1.5 px-3 border border-black text-xs font-bold 
                     rounded uppercase hover:bg-gray-100 transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
