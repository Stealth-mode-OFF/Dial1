import { useState } from 'react';

import { TranscriptInput, AnalysisResult } from '../TranscriptAnalyzer';
import type { TranscriptAnalysisResult } from '../../utils/echoApi';
import type { Lead } from '../../features/meetcoach/types';

interface TranscriptWrapupSectionProps {
  lead: Lead;
  totalTime: number;
}

export function TranscriptWrapupSection({ lead, totalTime }: TranscriptWrapupSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);

  if (analysisResult) {
    return (
      <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
        <AnalysisResult result={analysisResult} onBack={() => setAnalysisResult(null)} />
      </div>
    );
  }

  return (
    <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
      <button className="ta-wrapup-toggle" onClick={() => setExpanded(!expanded)}>
        <h3>📋 Analyzovat přepis hovoru</h3>
        <span className={expanded ? 'open' : ''}>▼</span>
      </button>
      {expanded && (
        <div className="ta-wrapup-body">
          <TranscriptInput
            contactName={lead.name}
            contactCompany={lead.company}
            contactRole={lead.role}
            durationSeconds={totalTime}
            onAnalyzed={setAnalysisResult}
            compact
          />
        </div>
      )}
    </div>
  );
}
