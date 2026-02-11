import type { Whisper } from '../../features/meetcoach/types';

interface FloatingWhisperProps {
  whisper: Whisper | null;
}

export function FloatingWhisper({ whisper }: FloatingWhisperProps) {
  if (!whisper) return null;

  return (
    <div className={`mc-whisper mc-whisper-${whisper.type}`}>
      <span className="mc-whisper-text">{whisper.text}</span>
    </div>
  );
}
