import { useEffect, useRef } from 'react';

import type { CaptionLine } from '../../hooks/useMeetCaptions';
import type { Battlecard } from '../../meetcoach/battlecards';

interface LiveCaptionsPanelProps {
  captions: CaptionLine[];
  isConnected: boolean;
  matchedCard: Battlecard | null;
}

export function LiveCaptionsPanel({ captions, isConnected, matchedCard }: LiveCaptionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions.length]);

  return (
    <div className="mc-live-captions-panel">
      <div className="mc-live-captions-header">
        <span className={`mc-captions-dot ${isConnected ? 'connected' : ''}`} />
        <span className="mc-live-captions-title">{isConnected ? 'Živý přepis' : 'Čekám na titulky z Google Meet'}</span>
        <span className="mc-live-captions-count">{captions.length} zpráv</span>
      </div>
      <div className="mc-live-captions-scroll" ref={scrollRef}>
        {captions.length === 0 ? (
          <div className="mc-live-captions-empty">
            {isConnected
              ? 'Začněte mluvit — přepis se objeví zde...'
              : 'Připojte Google Meet s titulky pro živý přepis hovoru.'}
          </div>
        ) : (
          captions.map((c) => (
            <div key={c.id} className="mc-live-caption-line">
              <span className="mc-live-caption-speaker">{c.speaker || '—'}</span>
              <span className="mc-live-caption-text">{c.text}</span>
            </div>
          ))
        )}
      </div>
      {matchedCard && (
        <div className="mc-live-battlecard">
          <div className="mc-live-battlecard-label">💡 {matchedCard.title}</div>
          <div className="mc-live-battlecard-primary">{matchedCard.primary}</div>
          {matchedCard.alt_1 && (
            <div className="mc-live-battlecard-secondary">{matchedCard.alt_1}</div>
          )}
        </div>
      )}
    </div>
  );
}
