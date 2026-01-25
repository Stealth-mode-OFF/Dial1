import { useState, useEffect } from 'react';
import { Coffee, X, Play, Clock } from 'lucide-react';
import { Button } from './button';

type BreakReminderProps = {
  isVisible: boolean;
  onTakeBreak: () => void;
  onDismiss: () => void;
  energyLevel: 'low' | 'medium' | 'high';
};

export function BreakReminder({ isVisible, onTakeBreak, onDismiss, energyLevel }: BreakReminderProps) {
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [isBreakActive, setIsBreakActive] = useState(false);

  useEffect(() => {
    if (isBreakActive && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsBreakActive(false);
            onTakeBreak(); // Notify parent that break is complete
            return 300; // Reset
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isBreakActive, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className={`rounded-2xl shadow-2xl border-2 overflow-hidden max-w-md ${
        energyLevel === 'low' 
          ? 'bg-red-50 border-red-300' 
          : 'bg-yellow-50 border-yellow-300'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${
          energyLevel === 'low' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              energyLevel === 'low' ? 'bg-red-200' : 'bg-yellow-200'
            }`}>
              <Coffee className={`w-5 h-5 ${
                energyLevel === 'low' ? 'text-red-700' : 'text-yellow-700'
              }`} />
            </div>
            <div>
              <h3 className={`font-bold ${
                energyLevel === 'low' ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {energyLevel === 'low' ? 'Energy Critical!' : 'Take a Micro-Break'}
              </h3>
              <p className={`text-xs ${
                energyLevel === 'low' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {isBreakActive ? 'Break in progress...' : 'Your performance is declining'}
              </p>
            </div>
          </div>
          {!isBreakActive && (
            <button 
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {isBreakActive ? (
            // BREAK ACTIVE STATE
            <div className="text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-24 h-24 rounded-full border-4 border-green-200 flex items-center justify-center bg-green-50">
                  <div className="text-center">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-700">
                      {formatTime(countdown)}
                    </div>
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Great! Now recharge:</h4>
                <ul className="text-sm text-slate-600 space-y-1 text-left">
                  <li>• Stand up and stretch</li>
                  <li>• Drink water</li>
                  <li>• Look away from screen (20-20-20 rule)</li>
                  <li>• Take 5 deep breaths</li>
                </ul>
              </div>
            </div>
          ) : (
            // BREAK SUGGESTION STATE
            <>
              <p className="text-sm text-slate-700">
                {energyLevel === 'low' 
                  ? "AI detekoval pokles tvé výkonnosti. Doporučuji 5min pauzu pro reset mozku."
                  : "Udělaná série hovorů! Čas na quick refresh před další vlnou."}
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsBreakActive(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  Start 5min Break
                </Button>
                <Button
                  onClick={onDismiss}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Maybe Later
                </Button>
              </div>

              {energyLevel === 'low' && (
                <div className="text-xs text-red-600 font-medium text-center">
                  ⚠️ Continuing now may reduce call quality
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
