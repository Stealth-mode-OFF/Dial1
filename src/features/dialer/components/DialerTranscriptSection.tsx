import React, { useState } from 'react';
import { AnalysisResult, TranscriptInput } from '../../../components/TranscriptAnalyzer';
import type { TranscriptAnalysisResult } from '../../../utils/echoApi';
import type { Contact } from '../types';

export function DialerTranscriptSection({
  contact,
  callDuration,
}: {
  contact: Contact;
  callDuration: number;
}) {
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
            contactName={contact.name}
            contactCompany={contact.company}
            durationSeconds={callDuration}
            onAnalyzed={setAnalysisResult}
            compact
          />
        </div>
      )}
    </div>
  );
}

