import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';

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

const DEMO_LEAD: Lead = {
  id: '1',
  name: 'Martin Dvořák',
  company: 'TechScale Solutions',
  title: 'VP of Sales',
  industry: 'SaaS',
  email: 'martin@techscale.cz',
  painPoints: ['Nízká konverze leadů', 'Dlouhý sales cyklus', 'Nekonzistentní messaging'],
  currentSolution: 'Salesforce + Excel',
  budget: '50-100k CZK/měsíc',
  timeline: 'Q1 2026',
  decisionProcess: 'VP Sales → CEO → Board',
};

// ============ AI SCRIPT GENERATOR ============
const generateDemoScript = async (lead: Lead): Promise<DemoScript> => {
  // Try real API
  if (isSupabaseConfigured) {
    try {
      const result = await echoApi.ai.generate({
        prompt: `Generate a 20-minute SPIN selling demo script for:
          Lead: ${lead.name}, ${lead.title} at ${lead.company}
          Industry: ${lead.industry}
          Pain points: ${lead.painPoints?.join(', ')}
          Current solution: ${lead.currentSolution}
          Format: JSON with blocks for each SPIN phase`,
        type: 'demo-script'
      });
      if (result?.script) {
        return { ...result.script, isFromApi: true };
      }
    } catch (err) {
      console.warn('API failed, using fallback script generator:', err);
    }
  }

  // Intelligent fallback
  await new Promise(r => setTimeout(r, 600));

  const blocks: ScriptBlock[] = [
    {
      phase: 'situation',
      title: 'Úvod & Situace',
      duration: '4 min',
      content: `Děkuji za čas, ${lead.name}. Cílem dnešního callu je ukázat vám, jak ${lead.company} může zvýšit efektivitu sales týmu. Než začnu, rád bych lépe pochopil vaši současnou situaci.`,
      questions: [
        `Jak velký je váš sales tým v ${lead.company}?`,
        'Jaké nástroje aktuálně používáte pro řízení pipeline?',
        'Kolik hovorů denně váš tým typicky odbavuje?',
        'Jak měříte úspěšnost vašich sales aktivit?',
      ],
      tips: [
        '⏱️ Nepřekračuj 4 minuty na situační otázky',
        '📝 Zapisuj si klíčové metriky, které zmiňuje',
        '🎯 Hledej vstupy pro problémové otázky',
      ],
      transitions: [
        'Rozumím. A jak jste spokojeni s výsledky?',
        'Zajímavé. Co by podle vás mohlo fungovat lépe?',
      ],
    },
    {
      phase: 'problem',
      title: 'Identifikace problémů',
      duration: '5 min',
      content: `Teď když rozumím vaší situaci, pojďme se podívat na oblasti, které by mohly být efektivnější.`,
      questions: [
        'S jakými největšími výzvami se váš tým potýká při cold callingu?',
        'Jak často se stává, že sales rep nemá dostatek informací o leadovi?',
        'Kolik času strávíte přípravou před každým hovorem?',
        `Zmínil jste ${lead.currentSolution} - co na něm nefunguje tak, jak byste chtěli?`,
      ],
      tips: [
        '🎯 Propojuj problémy s pain pointy z researche',
        '😤 Nech ho vyjádřit frustraci - to buduje urgenci',
        '📊 Kvantifikuj problémy kde to jde (čas, peníze)',
      ],
      transitions: [
        'To zní jako významná ztráta času...',
        'Chápu. A jaký má tohle dopad na vaše výsledky?',
      ],
    },
    {
      phase: 'implication',
      title: 'Důsledky problémů',
      duration: '5 min',
      content: `Pojďme se podívat na to, co tyto problémy vlastně znamenají pro ${lead.company} v širším kontextu.`,
      questions: [
        'Když váš tým stráví tolik času přípravou, kolik hovorů denně to stojí?',
        'Pokud by každý rep měl o 20% více času na hovory, jaký by to mělo dopad na pipeline?',
        'Jak tyto problémy ovlivňují morálku týmu a retenci?',
        'Co to znamená pro vaše Q1 targety, když sales cyklus trvá tak dlouho?',
      ],
      tips: [
        '💰 Převáděj na peníze - ztracené dealy, náklady',
        '⏰ Ukazuj časový tlak - konkurence, trh',
        '😰 Buduj urgenci bez agresivity',
      ],
      transitions: [
        'To je významný dopad. Pojďme se podívat, jak to můžeme vyřešit.',
        'Přesně proto jsem vás oslovil. Mám řešení.',
      ],
    },
    {
      phase: 'need-payoff',
      title: 'Řešení & Demo',
      duration: '6 min',
      content: `Teď vám ukážu, jak Dial1 řeší přesně tyto problémy, které jste zmínil.`,
      questions: [
        'Kdybyste měli všechny informace o leadu během 5 sekund, jak by to změnilo váš přístup?',
        'Co kdyby váš tým měl real-time coaching během každého hovoru?',
        'Jak by vypadal váš ideální den sales repa?',
        'Pokud bychom dokázali zkrátit přípravu o 80%, co byste s tím časem dělali?',
      ],
      tips: [
        '🖥️ Ukazuj produkt, nemluv o něm',
        '🎯 Propojuj features s jeho konkrétními problémy',
        '✨ Nech ho představit si úspěch',
      ],
      transitions: [
        'Jak by tohle fungovalo ve vašem týmu?',
        'Vidíte, jak by to pomohlo s tím problémem, co jste zmínil?',
      ],
    },
  ];

  const closingTechniques = [
    {
      name: 'Assumptive Close',
      script: `Super, ${lead.name}. Takže další krok by byl nastavit pilotní projekt pro váš tým. Hodil by se vám začátek příštího týdne, nebo preferujete týden poté?`,
    },
    {
      name: 'Summary Close',
      script: `Pojďme shrnout: zmínil jste ${lead.painPoints?.[0] || 'problémy s efektivitou'}, ${lead.painPoints?.[1] || 'dlouhý sales cyklus'}, a potřebu lepších dat. Dial1 řeší všechny tři. Kdy můžeme začít?`,
    },
    {
      name: 'ROI Close',
      script: `Pokud váš tým má 10 lidí a každý ušetří 2 hodiny denně, to je 400 hodin měsíčně. Při průměrné mzdě to je ${Math.round(400 * 300 / 1000)}k CZK. Investice do Dial1 se vrátí první měsíc. Dává to smysl?`,
    },
    {
      name: 'Timeline Close',
      script: `Zmínil jste, že chcete zlepšit výsledky do Q1. Implementace trvá 2 týdny. Pokud začneme příští týden, budete ready do konce ledna. Jak to zní?`,
    },
  ];

  const objectionHandlers = [
    { objection: '"Musím to probrat s týmem"', response: `Jasně. Co kdyby se CEO připojil na krátký 15min call příští týden? Můžu připravit executive summary.` },
    { objection: '"Je to drahé"', response: `Chápu. Kolik stojí jeden ztracený deal? Při vašem ACV to je ${Math.round(parseInt(lead.budget || '50000') * 0.1)}k. Dial1 vám pomůže zachránit minimálně 2 dealy měsíčně.` },
    { objection: '"Už něco máme"', response: `Co používáte? Většina klientů k nám přešla právě od ${lead.currentSolution || 'podobných řešení'}. Klíčový rozdíl je AI coaching v reálném čase.` },
    { objection: '"Nemáme čas na implementaci"', response: `Setup trvá 30 minut. Váš tým může začít používat Dial1 ještě dnes. Ukážu vám jak.` },
    { objection: '"Potřebuji více informací"', response: `Jasně. Co konkrétně byste chtěl vědět? Mezitím vám pošlu case study od podobné firmy v ${lead.industry || 'vašem oboru'}.` },
    { objection: '"Teď není dobrý čas"', response: `Rozumím. Kdy bude lepší? Nechci, abyste promeškal příležitost zlepšit Q1 čísla. Co třeba krátký check-in za 2 týdny?` },
  ];

  return {
    lead,
    totalDuration: '20 min',
    blocks,
    closingTechniques,
    objectionHandlers,
    isFromApi: false,
  };
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
export function MeetCoachApp() {
  const [lead] = useState<Lead>(DEMO_LEAD);
  const [script, setScript] = useState<DemoScript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<SPINPhase['id']>('situation');
  const [isLive, setIsLive] = useState(false);
  const [meetTime, setMeetTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [whispers, setWhispers] = useState<WhisperSuggestion[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<string | null>(null);
  const [view, setView] = useState<'script' | 'objections' | 'closing'>('script');

  const phaseStartRef = useRef(Date.now());

  // Load script
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const s = await generateDemoScript(lead);
      setScript(s);
      setIsLoading(false);
    };
    load();
  }, [lead]);

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
              <span className="meet-logo-tag">SPIN Demo Assistant</span>
            </div>
          </div>
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
            <span className="meet-timer-label">Demo Time</span>
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
          <LeadCard lead={lead} />
          
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
            <div className="meet-api-status">
              {script.isFromApi ? '● AI Generated' : '○ Smart Template'}
            </div>
          )}
        </aside>

        {/* Center - Script/Content */}
        <section className="meet-content">
          {isLoading ? (
            <div className="meet-loading">
              <div className="meet-loading-spinner" />
              <span>Generuji demo script pro {lead.name}...</span>
            </div>
          ) : script && (
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
          )}
        </section>

        {/* Right - Live Whisper */}
        <aside className="meet-whisper">
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
          <span><kbd>1-4</kbd> Switch Phase</span>
          <span><kbd>Space</kbd> Start/Pause</span>
          <span><kbd>Tab</kbd> Next Section</span>
        </div>
        <span className="meet-footer-status">
          {isLive ? '🔴 Live Session' : '⏸ Paused'}
        </span>
      </footer>
    </div>
  );
}

export default MeetCoachApp;
