import { CheckCircle2, Circle, MoveRight } from 'lucide-react';

type CallStage = 'opening' | 'discovery' | 'pitch' | 'close';

type CallProgressTrackerProps = {
  currentStage: CallStage;
  onStageClick?: (stage: CallStage) => void;
};

const STAGES: { id: CallStage; label: string }[] = [
  { id: 'opening', label: 'Opening' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'pitch', label: 'Pitch' },
  { id: 'close', label: 'Close' }
];

export function CallProgressTracker({ currentStage, onStageClick }: CallProgressTrackerProps) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((stage, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage Button */}
              <button
                onClick={() => onStageClick?.(stage.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 ${
                  isActive
                    ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700 font-bold scale-105 shadow-md'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className={`w-4 h-4 ${isActive ? 'text-indigo-600 animate-pulse' : 'text-slate-300'}`} />
                )}
                <span className="text-sm">{stage.label}</span>
              </button>

              {/* Arrow between stages */}
              {index < STAGES.length - 1 && (
                <MoveRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage Hint */}
      <div className="mt-3 text-center">
        {currentStage === 'opening' && (
          <p className="text-xs text-slate-600">
            💬 <strong>Teď:</strong> Představ se, navrhni hodnotu, získej pozornost
          </p>
        )}
        {currentStage === 'discovery' && (
          <p className="text-xs text-slate-600">
            🔍 <strong>Teď:</strong> Ptej se na pain points, zjisti jejich situaci
          </p>
        )}
        {currentStage === 'pitch' && (
          <p className="text-xs text-slate-600">
            🎯 <strong>Teď:</strong> Ukaž řešení, vysvětli hodnotu
          </p>
        )}
        {currentStage === 'close' && (
          <p className="text-xs text-slate-600">
            ✅ <strong>Teď:</strong> Požádej o meeting, ujasni next steps
          </p>
        )}
      </div>
    </div>
  );
}
