import { Zap, MessageSquare, Calendar, Send } from 'lucide-react';
import { Button } from './ui/button';

type QuickActionsProps = {
  onDraft: () => void;
  onSchedule: () => void;
  onSendEmail: () => void;
  onMakeNote: () => void;
};

export function QuickActions({ onDraft, onSchedule, onSendEmail, onMakeNote }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={onMakeNote}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <Zap className="w-3 h-3 mr-1" />
        Quick Note
      </Button>
      <Button
        onClick={onDraft}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        Draft Email
      </Button>
      <Button
        onClick={onSchedule}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <Calendar className="w-3 h-3 mr-1" />
        Schedule
      </Button>
      <Button
        onClick={onSendEmail}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <Send className="w-3 h-3 mr-1" />
        Send
      </Button>
    </div>
  );
}

type PitchTemplateProps = {
  companyName: string;
  contactName: string;
  personality: string;
  industry?: string;
};

export function PitchTemplate({ companyName, contactName, personality, industry }: PitchTemplateProps) {
  const getPitchByPersonality = () => {
    const pitches: Record<string, string> = {
      'Driver': `Hi ${contactName}, quick call from Echo Sales - I notice ${companyName} is in ${industry || 'tech'} and we've helped similar teams increase sales velocity by 35%. Worth a 15-min chat?`,
      'Analytical': `${contactName}, I've been researching ${companyName} and found some interesting patterns in your market. Would love to share data-driven insights. You free this week?`,
      'Amiable': `Hi ${contactName}! We work with teams like yours at ${companyName} to build stronger client relationships. Thought you'd be interested to hear how. Free for a chat?`,
      'Expressive': `${contactName}! We're revolutionizing how teams sell at companies like ${companyName}. Sounds boring, but the results are amazing - wanna see?`,
    };
    return pitches[personality] || pitches['Analytical'];
  };

  return (
    <div className="p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800 rounded-lg">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-tight mb-2">
        Suggested Opening
      </p>
      <p className="text-sm text-blue-900 dark:text-blue-50 leading-relaxed italic">
        "{getPitchByPersonality()}"
      </p>
    </div>
  );
}
