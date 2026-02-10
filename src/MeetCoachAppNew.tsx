/**
 * MeetCoachAppNew.tsx – Phase-Based Single-Focus Demo Coach
 * 
 * PHASES:
 * 1. PREP - Review lead + SPIN script before demo
 * 2. LIVE - Fullscreen coaching with SPIN phases, whispers, captions
 * 3. WRAPUP - Summary and notes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { echoApi } from './utils/echoApi';
import { useMeetCaptions, type CaptionLine } from './hooks/useMeetCaptions';
import { BATTLECARDS, type Battlecard } from './meetcoach/battlecards';
import { pickTopMatches, type FeedLine } from './meetcoach/engine';
import './meetcoach-v2.css';

/* ============ TYPES ============ */
type AppPhase = 'prep' | 'live' | 'wrapup';
type SPINPhase = 'situation' | 'problem' | 'implication' | 'need-payoff';

interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  notes?: string;
  industry?: string;
  companySize?: string;
}

interface ScriptBlock {
  phase: SPINPhase;
  type: 'question' | 'tip' | 'transition';
  text: string;
  followUp?: string;
}

interface DemoScript {
  lead: Lead;
  blocks: ScriptBlock[];
  generatedAt: Date;
}

interface Whisper {
  id: string;
  text: string;
  type: 'tip' | 'warning' | 'success';
  timestamp: number;
}

/* ============ CONSTANTS ============ */
const SPIN_PHASES: { id: SPINPhase; name: string; icon: string; color: string; duration: number }[] = [
  { id: 'situation', name: 'Situace', icon: '📋', color: '#3b82f6', duration: 300 },
  { id: 'problem', name: 'Problém', icon: '🎯', color: '#f59e0b', duration: 300 },
  { id: 'implication', name: 'Důsledky', icon: '⚡', color: '#ef4444', duration: 300 },
  { id: 'need-payoff', name: 'Řešení', icon: '✨', color: '#10b981', duration: 300 },
];

const DEMO_LEAD: Lead = {
  id: 'demo-1',
  name: 'Martin Novák',
  company: 'TechCorp s.r.o.',
  role: 'Sales Director',
  email: 'martin@techcorp.cz',
  industry: 'SaaS / Technology',
  companySize: '50-200',
  notes: 'Zavolal přes web, zajímá ho automatizace sales procesu',
};

const WHISPER_TIPS: Record<SPINPhase, string[]> = {
  situation: [
    '👂 Poslouchej víc než mluvíš',
    '📝 Zapisuj si klíčové info',
    '🤔 Ptej se "Jak to teď funguje?"',
  ],
  problem: [
    '🎯 Hledej bolest, ne přání',
    '❓ "Co vás na tom trápí nejvíc?"',
    '⏸️ Nech ticho pracovat',
  ],
  implication: [
    '💰 Propoj problém s penězi',
    '⚡ "Co to znamená pro tým?"',
    '📊 Zeptej se na čísla',
  ],
  'need-payoff': [
    '✨ Nech klienta popsat řešení',
    '🚀 "Jak by vypadal ideální stav?"',
    '🤝 Shrň a zeptej se na další krok',
  ],
};

/* ============ HELPERS ============ */
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const generateDemoScript = async (lead: Lead): Promise<ScriptBlock[]> => {
  try {
    const result = await echoApi.ai.generate({
      type: 'spin-script',
      context: {
        name: lead.name,
        company: lead.company,
        role: lead.role,
        industry: lead.industry,
        notes: lead.notes,
      },
    });
    return result.blocks || [];
  } catch {
    // Fallback script
    return [
      { phase: 'situation', type: 'question', text: `Jak teď řešíte sales proces v ${lead.company}?`, followUp: 'Kolik lidí na tom pracuje?' },
      { phase: 'situation', type: 'question', text: 'Jaké nástroje používáte?', followUp: 'Jak jste s nimi spokojeni?' },
      { phase: 'problem', type: 'question', text: 'Co vás na současném řešení trápí nejvíc?', followUp: 'Jak často se to děje?' },
      { phase: 'problem', type: 'question', text: 'Kde ztrácíte nejvíc času?', followUp: 'Kolik času týdně?' },
      { phase: 'implication', type: 'question', text: 'Co to znamená pro váš tým?', followUp: 'Jak to ovlivňuje výsledky?' },
      { phase: 'implication', type: 'question', text: 'Kolik vás to stojí měsíčně?', followUp: 'A ročně?' },
      { phase: 'need-payoff', type: 'question', text: 'Jak by vypadal ideální stav?', followUp: 'Co by to pro vás změnilo?' },
      { phase: 'need-payoff', type: 'question', text: 'Co kdybyste mohli ušetřit 10 hodin týdně?', followUp: 'Na co byste ten čas využili?' },
    ];
  }
};

/* ============ SUB-COMPONENTS ============ */

// Lead Hero Card (PREP phase)
const LeadHero: React.FC<{ lead: Lead; onStart: () => void; isLoading: boolean }> = ({ lead, onStart, isLoading }) => (
  <div className="mc-hero">
    <div className="mc-hero-avatar">{lead.name.charAt(0)}</div>
    <div className="mc-hero-info">
      <h1 className="mc-hero-name">{lead.name}</h1>
      <p className="mc-hero-company">{lead.role} @ {lead.company}</p>
      {lead.industry && <span className="mc-hero-tag">{lead.industry}</span>}
      {lead.companySize && <span className="mc-hero-tag">{lead.companySize} zaměstnanců</span>}
    </div>
    {lead.notes && (
      <div className="mc-hero-notes">
        <span className="mc-hero-notes-label">📝 Poznámky</span>
        <p>{lead.notes}</p>
      </div>
    )}
    <button className="mc-hero-btn" onClick={onStart} disabled={isLoading}>
      {isLoading ? '⏳ Generuji skript...' : '▶️ Zahájit demo'}
    </button>
    <p className="mc-hero-hint">Stiskni Enter nebo klikni pro zahájení</p>
  </div>
);

// SPIN Phase Indicator (LIVE phase header)
const SPINIndicator: React.FC<{
  currentPhase: SPINPhase;
  phaseTime: number;
  totalTime: number;
  onPhaseChange: (phase: SPINPhase) => void;
}> = ({ currentPhase, phaseTime, totalTime, onPhaseChange }) => {
  const current = SPIN_PHASES.find(p => p.id === currentPhase)!;
  const currentIndex = SPIN_PHASES.findIndex(p => p.id === currentPhase);
  
  return (
    <div className="mc-spin-bar" style={{ '--phase-color': current.color } as React.CSSProperties}>
      <div className="mc-spin-phases">
        {SPIN_PHASES.map((phase, idx) => (
          <button
            key={phase.id}
            className={`mc-spin-phase ${phase.id === currentPhase ? 'active' : ''} ${idx < currentIndex ? 'done' : ''}`}
            onClick={() => onPhaseChange(phase.id)}
            style={{ '--phase-color': phase.color } as React.CSSProperties}
          >
            <span className="mc-spin-icon">{phase.icon}</span>
            <span className="mc-spin-name">{phase.name}</span>
          </button>
        ))}
      </div>
      <div className="mc-spin-timer">
        <span className="mc-spin-timer-phase">{formatTime(phaseTime)}</span>
        <span className="mc-spin-timer-total">{formatTime(totalTime)}</span>
      </div>
    </div>
  );
};

// Script Block Card (LIVE phase main content)
const ScriptCard: React.FC<{
  block: ScriptBlock;
  onNext: () => void;
  onPrev: () => void;
  currentIndex: number;
  totalBlocks: number;
}> = ({ block, onNext, onPrev, currentIndex, totalBlocks }) => {
  const phase = SPIN_PHASES.find(p => p.id === block.phase)!;
  
  return (
    <div className="mc-script-card" style={{ '--phase-color': phase.color } as React.CSSProperties}>
      <div className="mc-script-header">
        <span className="mc-script-phase">{phase.icon} {phase.name}</span>
        <span className="mc-script-counter">{currentIndex + 1} / {totalBlocks}</span>
      </div>
      <div className="mc-script-main">
        <p className="mc-script-text">{block.text}</p>
        {block.followUp && (
          <p className="mc-script-followup">
            <span className="mc-script-followup-label">Follow-up:</span> {block.followUp}
          </p>
        )}
      </div>
      <div className="mc-script-nav">
        <button className="mc-script-btn secondary" onClick={onPrev} disabled={currentIndex === 0}>
          ← Předchozí
        </button>
        <button className="mc-script-btn primary" onClick={onNext}>
          {currentIndex === totalBlocks - 1 ? 'Dokončit →' : 'Další →'}
        </button>
      </div>
      <p className="mc-script-hint">← → šipky pro navigaci • Esc pro ukončení</p>
    </div>
  );
};

// Floating Whisper (LIVE phase coaching tips)
const FloatingWhisper: React.FC<{ whisper: Whisper | null }> = ({ whisper }) => {
  if (!whisper) return null;
  
  return (
    <div className={`mc-whisper mc-whisper-${whisper.type}`}>
      <span className="mc-whisper-text">{whisper.text}</span>
    </div>
  );
};

// Captions Bar (LIVE phase bottom)
const CaptionsBar: React.FC<{
  captions: CaptionLine[];
  matchedCard: Battlecard | null;
  isConnected: boolean;
}> = ({ captions, matchedCard, isConnected }) => {
  const lastCaption = captions[captions.length - 1];
  
  return (
    <div className="mc-captions-bar">
      <div className="mc-captions-status">
        <span className={`mc-captions-dot ${isConnected ? 'connected' : ''}`} />
        <span>{isConnected ? 'Živé titulky' : 'Čekám na Google Meet'}</span>
      </div>
      <div className="mc-captions-text">
        {lastCaption ? (
          <span>{lastCaption.speaker}: {lastCaption.text}</span>
        ) : (
          <span className="mc-captions-empty">Titulky se zobrazí automaticky...</span>
        )}
      </div>
      {matchedCard && (
        <div className="mc-captions-card">
          <span className="mc-captions-card-label">💡 {matchedCard.title}</span>
          <span className="mc-captions-card-text">{matchedCard.primary}</span>
        </div>
      )}
    </div>
  );
};

// Summary Hero (WRAPUP phase)
const SummaryHero: React.FC<{
  lead: Lead;
  totalTime: number;
  phaseTimes: Record<SPINPhase, number>;
  onNewDemo: () => void;
}> = ({ lead, totalTime, phaseTimes, onNewDemo }) => (
  <div className="mc-summary">
    <div className="mc-summary-header">
      <span className="mc-summary-icon">✅</span>
      <h2 className="mc-summary-title">Demo dokončeno</h2>
    </div>
    <div className="mc-summary-stats">
      <div className="mc-summary-stat">
        <span className="mc-summary-stat-value">{formatTime(totalTime)}</span>
        <span className="mc-summary-stat-label">Celkový čas</span>
      </div>
      {SPIN_PHASES.map(phase => (
        <div key={phase.id} className="mc-summary-stat" style={{ '--phase-color': phase.color } as React.CSSProperties}>
          <span className="mc-summary-stat-value">{formatTime(phaseTimes[phase.id] || 0)}</span>
          <span className="mc-summary-stat-label">{phase.icon} {phase.name}</span>
        </div>
      ))}
    </div>
    <div className="mc-summary-lead">
      <span className="mc-summary-lead-label">Klient</span>
      <span className="mc-summary-lead-name">{lead.name}</span>
      <span className="mc-summary-lead-company">{lead.company}</span>
    </div>
    <div className="mc-summary-actions">
      <button className="mc-summary-btn primary" onClick={onNewDemo}>
        🔄 Nové demo
      </button>
    </div>
  </div>
);

/* ============ MAIN COMPONENT ============ */
export const MeetCoachAppNew: React.FC = () => {
  // App phase
  const [appPhase, setAppPhase] = useState<AppPhase>('prep');
  
  // Lead & Script
  const [lead] = useState<Lead>(DEMO_LEAD);
  const [script, setScript] = useState<ScriptBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  
  // SPIN tracking
  const [spinPhase, setSpinPhase] = useState<SPINPhase>('situation');
  const [totalTime, setTotalTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [phaseTimes, setPhaseTimes] = useState<Record<SPINPhase, number>>({
    situation: 0,
    problem: 0,
    implication: 0,
    'need-payoff': 0,
  });
  
  // Whispers
  const [currentWhisper, setCurrentWhisper] = useState<Whisper | null>(null);
  const whisperTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Captions & Battlecards
  const { lines: captions, isConnected } = useMeetCaptions();
  const [matchedCard, setMatchedCard] = useState<Battlecard | null>(null);
  
  // Timer effect (when LIVE)
  useEffect(() => {
    if (appPhase !== 'live') return;
    
    const interval = setInterval(() => {
      setTotalTime(t => t + 1);
      setPhaseTime(t => t + 1);
      setPhaseTimes(prev => ({
        ...prev,
        [spinPhase]: (prev[spinPhase] || 0) + 1,
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [appPhase, spinPhase]);
  
  // Whisper rotation (every 20s show a tip)
  useEffect(() => {
    if (appPhase !== 'live') return;
    
    const showWhisper = () => {
      const tips = WHISPER_TIPS[spinPhase];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentWhisper({
        id: Date.now().toString(),
        text: tip,
        type: 'tip',
        timestamp: Date.now(),
      });
      
      // Hide after 8s
      whisperTimeoutRef.current = setTimeout(() => {
        setCurrentWhisper(null);
      }, 8000);
    };
    
    // Show first whisper after 5s
    const firstTimeout = setTimeout(showWhisper, 5000);
    // Then every 20s
    const interval = setInterval(showWhisper, 20000);
    
    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
      if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
    };
  }, [appPhase, spinPhase]);
  
  // Battlecard matching
  const [cooldownByKey, setCooldownByKey] = useState<Record<string, number | undefined>>({});
  
  useEffect(() => {
    if (captions.length === 0) return;
    
    // Convert captions to FeedLine format
    const feed: FeedLine[] = captions.map(c => ({
      id: c.id,
      ts: c.ts,
      text: c.text,
      speakerName: c.speaker,
    }));
    
    const now = Date.now();
    const matches = pickTopMatches(feed, {
      windowMs: 40_000,
      now,
      cooldownUntilByKey: cooldownByKey,
    });
    
    if (matches.best) {
      setMatchedCard(matches.best.card);
      // Add cooldown for this card
      setCooldownByKey(prev => ({
        ...prev,
        [matches.best!.card.key]: now + 60_000, // 60s cooldown
      }));
      
      // Hide after 10s
      setTimeout(() => setMatchedCard(null), 10000);
    }
  }, [captions, cooldownByKey]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PREP phase
      if (appPhase === 'prep') {
        if (e.key === 'Enter') {
          startDemo();
        }
        return;
      }
      
      // LIVE phase
      if (appPhase === 'live') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          nextBlock();
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevBlock();
        }
        if (e.key === 'Escape') {
          endDemo();
        }
        // Quick phase jump: 1-4
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (SPIN_PHASES[idx]) {
            changePhase(SPIN_PHASES[idx].id);
          }
        }
        return;
      }
      
      // WRAPUP phase
      if (appPhase === 'wrapup') {
        if (e.key === 'Enter') {
          resetDemo();
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appPhase, currentBlockIndex, script.length]);
  
  // Actions
  const startDemo = useCallback(async () => {
    setIsLoading(true);
    const blocks = await generateDemoScript(lead);
    setScript(blocks);
    setCurrentBlockIndex(0);
    setSpinPhase('situation');
    setTotalTime(0);
    setPhaseTime(0);
    setPhaseTimes({ situation: 0, problem: 0, implication: 0, 'need-payoff': 0 });
    setAppPhase('live');
    setIsLoading(false);
  }, [lead]);
  
  const nextBlock = useCallback(() => {
    if (currentBlockIndex >= script.length - 1) {
      endDemo();
      return;
    }
    
    const nextIdx = currentBlockIndex + 1;
    setCurrentBlockIndex(nextIdx);
    
    // Auto-switch phase if block changes phase
    const nextBlock = script[nextIdx];
    if (nextBlock && nextBlock.phase !== spinPhase) {
      changePhase(nextBlock.phase);
    }
  }, [currentBlockIndex, script, spinPhase]);
  
  const prevBlock = useCallback(() => {
    if (currentBlockIndex <= 0) return;
    
    const prevIdx = currentBlockIndex - 1;
    setCurrentBlockIndex(prevIdx);
    
    const prevBlock = script[prevIdx];
    if (prevBlock && prevBlock.phase !== spinPhase) {
      changePhase(prevBlock.phase);
    }
  }, [currentBlockIndex, script, spinPhase]);
  
  const changePhase = useCallback((newPhase: SPINPhase) => {
    if (newPhase === spinPhase) return;
    setSpinPhase(newPhase);
    setPhaseTime(0);
    
    // Find first block of this phase
    const firstBlockIdx = script.findIndex(b => b.phase === newPhase);
    if (firstBlockIdx !== -1) {
      setCurrentBlockIndex(firstBlockIdx);
    }
  }, [spinPhase, script]);
  
  const endDemo = useCallback(() => {
    setAppPhase('wrapup');
  }, []);
  
  const resetDemo = useCallback(() => {
    setAppPhase('prep');
    setScript([]);
    setCurrentBlockIndex(0);
    setSpinPhase('situation');
    setTotalTime(0);
    setPhaseTime(0);
    setPhaseTimes({ situation: 0, problem: 0, implication: 0, 'need-payoff': 0 });
    setCurrentWhisper(null);
    setMatchedCard(null);
  }, []);
  
  // Get current block
  const currentBlock = script[currentBlockIndex];
  
  return (
    <div className={`mc-app mc-phase-${appPhase}`}>
      {/* PREP PHASE */}
      {appPhase === 'prep' && (
        <div className="mc-prep">
          <LeadHero lead={lead} onStart={startDemo} isLoading={isLoading} />
        </div>
      )}
      
      {/* LIVE PHASE */}
      {appPhase === 'live' && (
        <div className="mc-live">
          <SPINIndicator
            currentPhase={spinPhase}
            phaseTime={phaseTime}
            totalTime={totalTime}
            onPhaseChange={changePhase}
          />
          
          {currentBlock && (
            <ScriptCard
              block={currentBlock}
              currentIndex={currentBlockIndex}
              totalBlocks={script.length}
              onNext={nextBlock}
              onPrev={prevBlock}
            />
          )}
          
          <FloatingWhisper whisper={currentWhisper} />
          
          <CaptionsBar
            captions={captions}
            matchedCard={matchedCard}
            isConnected={isConnected}
          />
        </div>
      )}
      
      {/* WRAPUP PHASE */}
      {appPhase === 'wrapup' && (
        <div className="mc-wrapup">
          <SummaryHero
            lead={lead}
            totalTime={totalTime}
            phaseTimes={phaseTimes}
            onNewDemo={resetDemo}
          />
        </div>
      )}
    </div>
  );
};

export default MeetCoachAppNew;
