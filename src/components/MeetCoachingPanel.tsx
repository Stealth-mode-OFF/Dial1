// src/components/MeetCoachingPanel.tsx
// Live transcript and coaching feed for Google Meet sessions

import { useState, useEffect, useRef } from 'react';
import { Phone, Pause, Play, Copy, Check } from 'lucide-react';

interface TranscriptEvent {
  id: string;
  text: string;
  speaker: 'agent' | 'prospect' | 'system';
  timestamp: Date;
  confidence: number;
}

interface MeetCoachingPanelProps {
  sessionCode: string;
  contactName?: string;
  isActive: boolean;
  onEnd: () => void;
}

export function MeetCoachingPanel({
  sessionCode,
  contactName,
  isActive,
  onEnd,
}: MeetCoachingPanelProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  if (!isActive) {
    return null;
  }

  const agentCount = transcripts.filter((t) => t.speaker === 'agent').length;
  const prospectCount = transcripts.filter((t) => t.speaker === 'prospect').length;

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-lg shadow-xl max-w-2xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-black p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              Meet Coach Session
            </h2>
            <p className="text-xs text-gray-600 font-mono mt-1">
              {contactName || 'Google Meet Call'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Session code display */}
            <button
              onClick={copySessionCode}
              className="px-3 py-2 bg-gray-100 border border-black rounded text-xs font-mono font-bold 
                       hover:bg-gray-200 transition flex items-center gap-2"
            >
              {sessionCode}
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex justify-between items-center text-xs font-mono">
          <div>
            <span className="font-bold">Agent:</span> {agentCount} ·
            <span className="font-bold ml-2">Prospect:</span> {prospectCount}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-200 transition flex items-center gap-1"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        {/* Transcript feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-mono">Waiting for captions...</p>
                <p className="text-xs text-gray-400 mt-2">
                  Make sure the extension popup shows connected with this session code.
                </p>
              </div>
            </div>
          ) : (
            transcripts.map((event) => (
              <div key={event.id} className="flex gap-3 pb-2 border-b border-gray-100 last:border-0">
                {/* Speaker label */}
                <div className="w-16 shrink-0">
                  <span
                    className={`inline-block text-xs font-black uppercase px-2 py-1 rounded ${
                      event.speaker === 'agent'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-green-100 text-green-900'
                    }`}
                  >
                    {event.speaker === 'agent' ? 'YOU' : 'VIP'}
                  </span>
                </div>

                {/* Message */}
                <div className="flex-1">
                  <p className={`text-sm leading-relaxed ${
                    event.speaker === 'agent' ? 'text-gray-600' : 'text-gray-900 font-medium'
                  }`}>
                    {event.text}
                  </p>
                  {event.confidence < 0.8 && (
                    <p className="text-xs text-gray-400 italic mt-1">
                      (confidence: {Math.round(event.confidence * 100)}%)
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {event.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-4 flex gap-2 justify-between items-center">
          <p className="text-xs text-gray-500 font-mono">
            {transcripts.length} caption{transcripts.length !== 1 ? 's' : ''} captured
          </p>
          <div className="flex gap-2">
            <button
              onClick={onEnd}
              className="px-6 py-2 bg-black text-white font-bold uppercase text-xs rounded 
                       hover:bg-gray-900 transition"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
