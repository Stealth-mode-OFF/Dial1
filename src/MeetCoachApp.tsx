import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { MeetCaptionsPanel } from './components/MeetCaptionsPanel';
import { useSales } from './contexts/SalesContext';

// ============ TYPES ============
interface Lead {
  id: string;
  name: string;
  company: string;
  title?: string;
  industry?: string;
  email?: string;
  painPoints?: string[];
  currentSolution?: string;
  budget?: string;
  timeline?: string;
  decisionProcess?: string;
}

interface SPINPhase {
  id: 'situation' | 'problem' | 'implication' | 'need-payoff';
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
}

interface ScriptBlock {
  phase: SPINPhase['id'];
  title: string;
  duration: string;
  content: string;
  questions: string[];
  tips: string[];
  transitions: string[];
}

interface WhisperSuggestion {
  id: string;
  type: 'objection' | 'question' | 'transition' | 'close' | 'tip';
  trigger?: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface DemoScript {
  lead: Lead;
  totalDuration: string;
  blocks: ScriptBlock[];
  closingTechniques: { name: string; script: string }[];
  objectionHandlers: { objection: string; response: string }[];
  isFromApi: boolean;
}

// ============ CONSTANTS ============
const SPIN_PHASES: SPINPhase[] = [
  { id: 'situation', name: 'Situation', shortName: 'S', description: 'Zjisti současný stav', color: '#3b82f6', icon: '🔍' },
  { id: 'problem', name: 'Problem', shortName: 'P', description: 'Odhal problémy', color: '#f59e0b', icon: '⚠️' },
  { id: 'implication', name: 'Implication', shortName: 'I', description: 'Ukaž důsledky', color: '#ef4444', icon: '💥' },
  { id: 'need-payoff', name: 'Need-Payoff', shortName: 'N', description: 'Nabídni řešení', color: '#10b981', icon: '✨' },
];

// ============ AI SCRIPT GENERATOR ============
const generateDemoScript = async (lead: Lead): Promise<{ script: DemoScript | null; error: string | null }> => {
  if (!isSupabaseConfigured) {
    return { script: null, error: 'Supabase není nakonfigurován. Nastav VITE_SUPABASE_URL v Settings.' };
  }
  try {
    const result = await echoApi.ai.generate({
      prompt: `Generate a 20-minute SPIN selling call script for:
        Lead: ${lead.name}, ${lead.title || ''} at ${lead.company}
        Industry: ${lead.industry || ''}
        Format: JSON with blocks for each SPIN phase`,
      type: 'spin-script',
    });
    if (result?.script) return { script: { ...result.script, isFromApi: true }, error: null };
    return { script: null, error: 'AI nevrátilo script. Zkontroluj OPENAI_API_KEY v Supabase secrets.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI script generation failed';
    console.warn('AI script generation failed:', err);
    return { script: null, error: msg };
  }
};

// ============ LIVE WHISPER SYSTEM ============
const generateWhispers = (phase: SPINPhase['id'], timeInPhase: number): WhisperSuggestion[] => {
  const whispers: WhisperSuggestion[] = [];
  const now = Date.now();

  // Phase-specific whispers
  if (phase === 'situation' && timeInPhase > 180) {
    whispers.push({
      id: 'time-warning-s',
      type: 'tip',
      content: '⏱️ Situační fáze trvá dlouho. Přejdi k problémům.',
      priority: 'high',
      timestamp: now,
    });
  }

  if (phase === 'problem') {
    whispers.push({
      id: 'problem-tip',
      type: 'question',
      content: '💡 Zeptej se: "Jak to ovlivňuje vaše měsíční targety?"',
      priority: 'medium',
      timestamp: now,
    });
  }

  if (phase === 'implication') {
    whispers.push({
      id: 'implication-tip',
      type: 'tip',
      content: '💰 Kvantifikuj dopad: "Kolik to stojí měsíčně?"',
      priority: 'medium',
      timestamp: now,
    });
  }

  if (phase === 'need-payoff' && timeInPhase > 240) {
    whispers.push({
      id: 'close-reminder',
      type: 'close',
      content: '🎯 Je čas na closing. Použij Assumptive Close.',
      priority: 'high',
      timestamp: now,
    });
  }

  return whispers;
};

// ============ UTILITIES ============
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ============ COMPONENTS ============

function SPINProgress({ currentPhase, phases, onPhaseClick }: { 
  currentPhase: SPINPhase['id']; 
  phases: SPINPhase[]; 
  onPhaseClick: (id: SPINPhase['id']) => void;
}) {
  const currentIndex = phases.findIndex(p => p.id === currentPhase);
  
  return (
    <div className="spin-progress">
      {phases.map((phase, i) => (
        <button
          key={phase.id}
          className={`spin-step ${phase.id === currentPhase ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}`}
          onClick={() => onPhaseClick(phase.id)}
          style={{ '--phase-color': phase.color } as React.CSSProperties}
        >
          <span className="spin-step-badge">{phase.shortName}</span>
          <span className="spin-step-name">{phase.name}</span>
        </button>
      ))}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="lead-card">
      <div className="lead-card-header">
        <div className="lead-avatar">{lead.name.split(' ').map(n => n[0]).join('')}</div>
        <div className="lead-info">
          <h3 className="lead-name">{lead.name}</h3>
          <p className="lead-title">{lead.title} · {lead.company}</p>
        </div>
      </div>
      <div className="lead-meta">
        {lead.industry && <span className="lead-tag">{lead.industry}</span>}
        {lead.budget && <span className="lead-tag">💰 {lead.budget}</span>}
        {lead.timeline && <span className="lead-tag">📅 {lead.timeline}</span>}
      </div>
      {lead.painPoints && lead.painPoints.length > 0 && (
        <div className="lead-pains">
          <span className="lead-pains-label">Pain Points:</span>
          <ul>
            {lead.painPoints.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScriptPanel({ block, isActive }: { block: ScriptBlock; isActive: boolean }) {
  const phase = SPIN_PHASES.find(p => p.id === block.phase)!;
  const [expanded, setExpanded] = useState(isActive);
  
  useEffect(() => { setExpanded(isActive); }, [isActive]);

  return (
    <div 
      className={`script-block ${isActive ? 'active' : ''}`}
      style={{ '--phase-color': phase.color } as React.CSSProperties}
    >
      <button className="script-block-header" onClick={() => setExpanded(!expanded)}>
        <span className="script-block-icon">{phase.icon}</span>
        <div className="script-block-title">
          <span className="script-block-name">{block.title}</span>
          <span className="script-block-duration">{block.duration}</span>
        </div>
        <span className="script-block-expand">{expanded ? '−' : '+'}</span>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="script-block-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="script-section">
              <span className="script-section-label">📝 Intro</span>
              <p className="script-text">{block.content}</p>
            </div>

            <div className="script-section">
              <span className="script-section-label">❓ Otázky</span>
              <ul className="script-questions">
                {block.questions.map((q, i) => (
                  <li key={i} className="script-question">
                    <button className="script-question-copy" onClick={() => navigator.clipboard.writeText(q)}>📋</button>
                    {q}
                  </li>
                ))}
              </ul>
            </div>

            <div className="script-section">
              <span className="script-section-label">💡 Tipy</span>
              <ul className="script-tips">
                {block.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>

            <div className="script-section">
              <span className="script-section-label">➡️ Přechody</span>
              <div className="script-transitions">
                {block.transitions.map((t, i) => (
                  <button key={i} className="script-transition" onClick={() => navigator.clipboard.writeText(t)}>
                    "{t}"
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhisperPanel({ whispers, objections }: { 
  whispers: WhisperSuggestion[]; 
  objections: { objection: string; response: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredObjections = useMemo(() => {
    if (!searchTerm) return objections.slice(0, 4);
    return objections.filter(o => 
      o.objection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.response.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [objections, searchTerm]);

  return (
    <div className="whisper-panel">
      <div className="whisper-header">
        <span className="whisper-title">🎯 Live Coaching</span>
        <span className="whisper-status">● Active</span>
      </div>

      {whispers.length > 0 && (
        <div className="whisper-alerts">
          {whispers.map(w => (
            <motion.div
              key={w.id}
              className={`whisper-alert priority-${w.priority}`}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              {w.content}
            </motion.div>
          ))}
        </div>
      )}

      <div className="whisper-search">
        <input
          type="text"
          placeholder="Hledej námitku..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="whisper-objections">
        <span className="whisper-section-title">Námitky & Odpovědi</span>
        {filteredObjections.map((o, i) => (
          <div key={i} className="whisper-objection">
            <div className="whisper-objection-trigger">{o.objection}</div>
            <div className="whisper-objection-response">
              {o.response}
              <button 
                className="whisper-copy"
                onClick={() => navigator.clipboard.writeText(o.response)}
              >
                📋
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingPanel({ techniques, onSelect }: { 
  techniques: { name: string; script: string }[]; 
  onSelect: (script: string) => void;
}) {
  return (
    <div className="closing-panel">
      <span className="closing-title">🎯 Closing Techniques</span>
      <div className="closing-list">
        {techniques.map((t, i) => (
          <button key={i} className="closing-item" onClick={() => onSelect(t.script)}>
            <span className="closing-item-name">{t.name}</span>
            <span className="closing-item-preview">{t.script.slice(0, 60)}...</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN ============
export function MeetCoachApp({ onSwitchMode, currentMode }: { onSwitchMode?: () => void; currentMode?: string }) {
  const [script, setScript] = useState<DemoScript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { contacts, activeContact, setActiveContactId, pipedriveConfigured, isLoading: salesLoading, error: salesError } = useSales();
  const lead: Lead | null = useMemo(() => {
    if (!activeContact) return null;
    return {
      id: activeContact.id,
      name: activeContact.name || '',
      company: activeContact.company || '',
      title: activeContact.title || undefined,
      email: activeContact.email || undefined,
      industry: undefined,
    };
  }, [activeContact]);
  const [currentPhase, setCurrentPhase] = useState<SPINPhase['id']>('situation');
  const [isLive, setIsLive] = useState(false);
  const [meetTime, setMeetTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [whispers, setWhispers] = useState<WhisperSuggestion[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<string | null>(null);
  const [view, setView] = useState<'script' | 'objections' | 'closing'>('script');
  const [scriptError, setScriptError] = useState<string | null>(null);

  const phaseStartRef = useRef(Date.now());

  // Load script
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!lead) {
        setScript(null);
        setScriptError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setScriptError(null);
      const { script: s, error: err } = await generateDemoScript(lead);
      if (cancelled) return;
      setScript(s);
      setScriptError(err);
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  // Timer
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => {
      setMeetTime(m => m + 1);
      setPhaseTime(Math.floor((Date.now() - phaseStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [isLive]);

  // Whisper updates
  useEffect(() => {
    if (!isLive) return;
    const w = generateWhispers(currentPhase, phaseTime);
    setWhispers(w);
  }, [currentPhase, phaseTime, isLive]);

  const handlePhaseChange = useCallback((phase: SPINPhase['id']) => {
    setCurrentPhase(phase);
    phaseStartRef.current = Date.now();
    setPhaseTime(0);
  }, []);

  const toggleLive = useCallback(() => {
    if (!isLive) {
      phaseStartRef.current = Date.now();
    }
    setIsLive(!isLive);
  }, [isLive]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggleLive(); }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setWhispers([]);
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        handlePhaseChange(SPIN_PHASES[num - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleLive, handlePhaseChange]);

  const currentPhaseData = SPIN_PHASES.find(p => p.id === currentPhase)!;
  const currentBlock = script?.blocks.find(b => b.phase === currentPhase);

  return (
    <div className="meet-app">
      {/* Header */}
      <header className="meet-header">
        <div className="meet-header-left">
          <div className="meet-logo">
            <span className="meet-logo-icon">MC</span>
            <div className="meet-logo-text">
              <span className="meet-logo-name">Meet Coach</span>
              <span className="meet-logo-tag">Live Coaching</span>
            </div>
          </div>
          {onSwitchMode && (
            <button 
              onClick={onSwitchMode} 
              className="mode-switch-btn"
              title="Switch to Dialer"
            >
              <span>← Dialer</span>
            </button>
          )}
        </div>

        <div className="meet-header-center">
          <SPINProgress 
            currentPhase={currentPhase} 
            phases={SPIN_PHASES}
            onPhaseClick={handlePhaseChange}
          />
        </div>

        <div className="meet-header-right">
          <div className="meet-timer">
            <span className="meet-timer-label">Call Time</span>
            <span className="meet-timer-value">{formatTime(meetTime)}</span>
          </div>
          <button 
            className={`meet-live-btn ${isLive ? 'active' : ''}`}
            onClick={toggleLive}
          >
            {isLive ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>
      </header>

      {/* Phase Banner */}
      <div 
        className="phase-banner"
        style={{ background: currentPhaseData.color }}
      >
        <span className="phase-banner-icon">{currentPhaseData.icon}</span>
        <span className="phase-banner-name">{currentPhaseData.name}</span>
        <span className="phase-banner-desc">{currentPhaseData.description}</span>
        <span className="phase-banner-time">{formatTime(phaseTime)}</span>
      </div>

      {/* Main Content */}
      <main className="meet-main">
        {/* Left - Lead Info */}
        <aside className="meet-sidebar">
          <div className="meet-api-status">
            {pipedriveConfigured ? '● Pipedrive connected' : '○ Pipedrive not configured'}
          </div>

          <div className="meet-lead-picker">
            <div className="meet-lead-label">Active lead</div>
            <select
              className="meet-lead-select"
              value={activeContact?.id || ''}
              onChange={(e) => setActiveContactId(e.target.value || null)}
              disabled={salesLoading || !pipedriveConfigured || contacts.length === 0}
            >
              <option value="" disabled>
                {!pipedriveConfigured
                  ? 'Configure Pipedrive in Settings'
                  : salesLoading
                    ? 'Loading contacts...'
                    : contacts.length === 0
                      ? 'No contacts found (import in Settings)'
                      : 'Select a person...'}
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
            {salesError ? <div className="meet-lead-error">{salesError}</div> : null}
          </div>

          {lead ? <LeadCard lead={lead} /> : null}
          
          <div className="meet-nav">
            <button 
              className={`meet-nav-btn ${view === 'script' ? 'active' : ''}`}
              onClick={() => setView('script')}
            >
              📝 Script
            </button>
            <button 
              className={`meet-nav-btn ${view === 'objections' ? 'active' : ''}`}
              onClick={() => setView('objections')}
            >
              🛡️ Námitky
            </button>
            <button 
              className={`meet-nav-btn ${view === 'closing' ? 'active' : ''}`}
              onClick={() => setView('closing')}
            >
              🎯 Closing
            </button>
          </div>

          {script && (
            <div className="meet-api-status meet-api-status--footer">● AI script</div>
          )}
        </aside>

        {/* Center - Script/Content */}
        <section className="meet-content">
          {isLoading ? (
            <div className="meet-loading">
              <div className="meet-loading-spinner" />
              <span>Generuji script…</span>
            </div>
          ) : script ? (
            <>
              {view === 'script' && (
                <div className="script-container">
                  {script.blocks.map((block, i) => (
                    <ScriptPanel 
                      key={block.phase} 
                      block={block} 
                      isActive={block.phase === currentPhase}
                    />
                  ))}
                </div>
              )}

              {view === 'objections' && (
                <div className="objections-container">
                  {script.objectionHandlers.map((o, i) => (
                    <div key={i} className="objection-card">
                      <div className="objection-card-trigger">{o.objection}</div>
                      <div className="objection-card-response">{o.response}</div>
                      <button 
                        className="objection-card-copy"
                        onClick={() => navigator.clipboard.writeText(o.response)}
                      >
                        📋 Kopírovat
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {view === 'closing' && (
                <div className="closing-container">
                  <ClosingPanel 
                    techniques={script.closingTechniques}
                    onSelect={setSelectedClosing}
                  />
                  {selectedClosing && (
                    <motion.div 
                      className="closing-selected"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className="closing-selected-label">Vybraný script:</span>
                      <p className="closing-selected-text">{selectedClosing}</p>
                      <button 
                        className="closing-selected-copy"
                        onClick={() => navigator.clipboard.writeText(selectedClosing)}
                      >
                        📋 Kopírovat
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="meet-loading">
              <span style={{ textAlign: 'center', maxWidth: 520 }}>
                {scriptError ? (
                  <><strong style={{ color: 'var(--danger)' }}>Chyba:</strong> {scriptError}</>
                ) : (
                  'Vyber lead vlevo. AI SPIN script vyžaduje backend AI (OPENAI_API_KEY v Supabase secrets). Live captions fungují vpravo i bez toho.'
                )}
              </span>
            </div>
          )}
        </section>

        {/* Right - Live Whisper */}
        <aside className="meet-whisper">
          <MeetCaptionsPanel />
          {script && (
            <WhisperPanel 
              whispers={whispers}
              objections={script.objectionHandlers}
            />
          )}
        </aside>
      </main>

      {/* Footer */}
      <footer className="meet-footer">
        <div className="meet-shortcuts">
          <span><kbd>1-4</kbd> SPIN Phase</span>
          <span><kbd>c</kbd> Clear whispers</span>
          <span><kbd>Space</kbd> Start/Pause</span>
        </div>
        <span className="meet-footer-status">
          {isLive ? '🔴 Live Session' : '⏸ Paused'}
        </span>
      </footer>
    </div>
  );
}

export default MeetCoachApp;
