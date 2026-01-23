import React, { useState } from 'react';
import { useSales } from '../contexts/SalesContext';
import { 
  Mic, 
  Play, 
  Settings, 
  Award, 
  BarChart, 
  Volume2, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function MeetCoach({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { coachSettings, updateCoachSettings, recentActivity } = useSales();
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const toggleIntervention = (key: keyof typeof coachSettings.interventions) => {
    updateCoachSettings({
      interventions: {
        ...coachSettings.interventions,
        [key]: !coachSettings.interventions[key]
      }
    });
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    setTimeout(() => setIsTestingVoice(false), 2000);
  };

  // Calculate scores from recent calls
  const recentCallScores = recentActivity
    .filter(a => a.type === 'call' || a.type === 'meeting')
    .map(a => a.score || 0);
  
  const avgScore = recentCallScores.length > 0 
    ? Math.round(recentCallScores.reduce((a, b) => a + b, 0) / recentCallScores.length)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meet Coach</h1>
          <p className="text-slate-500 font-medium mt-1">Configure your real-time AI sales companion</p>
        </div>
        <button 
          onClick={handleTestVoice}
          disabled={isTestingVoice}
          className={`font-bold py-2 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 ${
            isTestingVoice 
              ? 'bg-emerald-500 text-white shadow-emerald-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
          }`}
        >
          {isTestingVoice ? <Volume2 size={18} className="animate-pulse" /> : <Play size={18} fill="currentColor" />}
          {isTestingVoice ? 'Listening...' : 'Test Voice'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Persona Selection */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Zap size={20} className="text-yellow-500 fill-yellow-500" />
              Select Coaching Persona
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { 
                  id: 'challenger', 
                  name: 'The Challenger', 
                  desc: 'Pushes you to control the frame. Focuses on tension and authority.',
                  color: 'indigo' 
                },
                { 
                  id: 'empath', 
                  name: 'The Empath', 
                  desc: 'Focuses on deep listening and mirroring. Great for complex discovery.',
                  color: 'emerald' 
                },
                { 
                  id: 'wolf', 
                  name: 'Wolf Mode', 
                  desc: 'High energy closing. Short, punchy sentences. Maximum urgency.',
                  color: 'slate' 
                },
                { 
                  id: 'custom', 
                  name: 'Custom Profile', 
                  desc: 'Train your own model based on your top 10% performers.',
                  color: 'purple' 
                }
              ].map((persona) => (
                <div 
                  key={persona.id}
                  onClick={() => updateCoachSettings({ activePersona: persona.id })}
                  className={`cursor-pointer rounded-xl p-5 border-2 transition-all relative ${
                    coachSettings.activePersona === persona.id 
                      ? `border-${persona.color}-500 bg-${persona.color}-50` 
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {coachSettings.activePersona === persona.id && (
                    <div className={`absolute top-3 right-3 text-${persona.color}-600`}>
                      <CheckCircle2 size={20} fill="currentColor" className="text-white" />
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-lg bg-${persona.color}-100 flex items-center justify-center mb-3`}>
                    <Mic size={20} className={`text-${persona.color}-600`} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{persona.name}</h3>
                  <p className="text-sm text-slate-500 leading-snug">{persona.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" />
              Intervention Settings
            </h2>
            
            <div className="space-y-6">
              {[
                { id: 'speedAlert', label: 'Speed Alert', desc: 'Warn me if I speak faster than 160 wpm' },
                { id: 'monologueBreaker', label: 'Monologue Breaker', desc: 'Nudge me if I talk for > 45 seconds' },
                { id: 'fillerWordKiller', label: 'Filler Word Killer', desc: 'Track "um", "uh", "like" in real-time' },
                { id: 'sentimentTracker', label: 'Sentiment Tracker', desc: 'Alert if prospect sentiment drops below neutral' },
              ].map((setting, i) => {
                 const isActive = coachSettings.interventions[setting.id as keyof typeof coachSettings.interventions];
                 return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-bold text-slate-900">{setting.label}</div>
                      <div className="text-sm text-slate-500">{setting.desc}</div>
                    </div>
                    <div 
                      onClick={() => toggleIntervention(setting.id as any)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${isActive ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Reviews */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase text-xs tracking-wider mb-2">
                <Award size={14} /> Weekly Score
              </div>
              <div className="text-4xl font-extrabold mb-1">{avgScore}/100</div>
              <p className="text-slate-400 text-sm">Based on your recent calls.</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <Award size={120} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Recent Game Tapes</h3>
            <div className="space-y-4">
              {recentActivity.filter(a => a.type !== 'email').slice(0, 3).map((tape, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer bg-white">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${tape.score && tape.score > 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                       {tape.score}
                     </div>
                     <div>
                       <div className="font-bold text-slate-900 text-sm">{tape.description}</div>
                       <div className="text-xs text-slate-400">{tape.timestamp}</div>
                     </div>
                   </div>
                   <Play size={16} className="text-slate-300 hover:text-indigo-600" />
                </div>
              ))}
              {recentActivity.length === 0 && (
                 <div className="text-center py-8 text-slate-400 text-sm">
                   <AlertCircle className="mx-auto mb-2 opacity-50" />
                   No recordings yet
                 </div>
              )}
            </div>
            <button className="w-full mt-4 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
              View All Recordings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
