import { ArrowRight, Zap, Users } from 'lucide-react';
import { Button } from './ui/button';
import type { Contact } from '../App';

type ContactCardProps = {
  contact: Contact;
  onSelect: () => void;
  isActive?: boolean;
  index?: number;
  showScore?: boolean;
};

export function ContactCard({ contact, onSelect, isActive = false, index, showScore = true }: ContactCardProps) {
  const score = contact.intentScore || 0;
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20';
    if (s >= 60) return 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20';
    if (s >= 40) return 'text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-900/20';
    return 'text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800';
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
          : 'border-slate-200/50 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30 hover:border-indigo-300/50 dark:hover:border-indigo-600/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {index !== undefined && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                #{index + 1}
              </span>
            )}
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 truncate">{contact.name}</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">{contact.company}</p>
          {contact.role && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{contact.role}</p>
          )}
        </div>
        
        {showScore && score > 0 && (
          <div className={`shrink-0 px-2.5 py-1.5 rounded text-xs font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
        )}
      </div>

      {/* Mini Signals */}
      {(contact.hiringSignal || contact.personalityType) && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
          {contact.hiringSignal && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Zap className="w-3 h-3" />
              Hiring Signal
            </span>
          )}
          {contact.personalityType && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100/60 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <Users className="w-3 h-3" />
              {contact.personalityType.type}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
