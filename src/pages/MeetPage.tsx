import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ContextPanel } from '../components/meet/ContextPanel';
import { LiveCoachPanel } from '../components/meet/LiveCoachPanel';
import { SpinQuestionsPanel } from '../components/meet/SpinQuestionsPanel';
import { useBrief } from '../hooks/useBrief';
import { useLiveCoach } from '../hooks/useLiveCoach';
import { listenToExtension } from '../utils/extensionBridge';
import type { SpinPhase, Brief } from '../types/contracts';

interface MeetPageProps {
  onSwitchMode?: () => void;
  /** Pre-loaded brief from DIAL page */
  initialBrief?: Brief | null;
}

export function MeetPage({ onSwitchMode, initialBrief = null }: MeetPageProps) {
  const { brief } = useBrief();
  const activeBrief = initialBrief ?? brief;
  const { response: coachResponse, loading: coachLoading, fetchTips } = useLiveCoach();
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('S');
  const [lastCaption, setLastCaption] = useState('');
  const [isLive, setIsLive] = useState(false);
  const captionBufferRef = useRef<string[]>([]);

  // Listen for captions from extension
  useEffect(() => {
    const unsub = listenToExtension({
      onMeetCaption: (chunk) => {
        const text = chunk.text || '';
        setLastCaption(text);
        captionBufferRef.current.push(text);
        // Keep buffer reasonable
        if (captionBufferRef.current.length > 20) {
          captionBufferRef.current = captionBufferRef.current.slice(-15);
        }
      },
    });
    return () => unsub();
  }, []);

  // Periodically send buffered captions for coaching tips
  useEffect(() => {
    if (!isLive || !activeBrief) return;

    const interval = setInterval(() => {
      const chunk = captionBufferRef.current.join(' ').trim();
      if (chunk.length < 20) return; // not enough text yet
      fetchTips(chunk, activeBrief, spinPhase);
      captionBufferRef.current = []; // flush
    }, 10_000);

    return () => clearInterval(interval);
  }, [isLive, activeBrief, spinPhase, fetchTips]);

  const toggleLive = useCallback(() => {
    setIsLive((v) => !v);
    if (!isLive) {
      captionBufferRef.current = [];
    }
  }, [isLive]);

  return (
    <div className="dp-page dp-meet-page">
      {/* Top bar */}
      <header className="dp-topbar">
        <div className="dp-topbar-left">
          <span className="dp-logo">Dial1</span>
          <span className="dp-page-label meet">MEET</span>
        </div>

        <div className="dp-topbar-center">
          {lastCaption && (
            <span className="dp-last-caption" title={lastCaption}>
              💬 {lastCaption.length > 80 ? lastCaption.slice(0, 77) + '…' : lastCaption}
            </span>
          )}
        </div>

        <div className="dp-topbar-right">
          <button
            className={`dp-btn ${isLive ? 'dp-btn-danger' : 'dp-btn-primary'}`}
            onClick={toggleLive}
          >
            {isLive ? '⏸ Pause' : '▶ Start Live'}
          </button>
          {onSwitchMode && (
            <button className="dp-btn dp-btn-ghost" onClick={onSwitchMode}>
              ← Dial
            </button>
          )}
        </div>
      </header>

      {/* Three-column layout */}
      <main className="dp-split dp-split-3">
        <ContextPanel brief={activeBrief} />
        <LiveCoachPanel response={coachResponse} loading={coachLoading} />
        <SpinQuestionsPanel activePhase={spinPhase} onPhaseChange={setSpinPhase} />
      </main>
    </div>
  );
}

export default MeetPage;
