/**
 * MeetCoachAppNew.tsx – Phase-Based Single-Focus Demo Coach
 * 
 * PHASES:
 * 1. PREP - Review lead + SPIN script before demo
 * 2. LIVE - Fullscreen coaching with SPIN phases, whispers, captions
 * 3. WRAPUP - Summary and notes
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { useSales } from './contexts/SalesContext';
import { useMeetCaptions, type CaptionLine } from './hooks/useMeetCaptions';
import { BATTLECARDS, type Battlecard } from './meetcoach/battlecards';
import { pickTopMatches, type FeedLine } from './meetcoach/engine';
import { useLiveCoach } from './hooks/useLiveCoach';
import { useDynamicBattlecards } from './hooks/useDynamicBattlecards';
import { useBrief } from './hooks/useBrief';
import { TranscriptInput, AnalysisResult } from './components/TranscriptAnalyzer';
import type { TranscriptAnalysisResult } from './utils/echoApi';
import type { Brief, SpinPhase as SpinPhaseLetter } from './types/contracts';
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

const toSpinLetter = (phase: SPINPhase): SpinPhaseLetter => {
  if (phase === 'situation') return 'S';
  if (phase === 'problem') return 'P';
  if (phase === 'implication') return 'I';
  return 'N';
};

const toOrchestratorStage = (phase: SPINPhase): 'situation' | 'problem' | 'implication' | 'payoff' => {
  if (phase === 'situation') return 'situation';
  if (phase === 'problem') return 'problem';
  if (phase === 'implication') return 'implication';
  return 'payoff';
};

const fromOrchestratorStage = (stage: string | null | undefined): SPINPhase | null => {
  const s = (stage || '').toString().toLowerCase();
  if (s === 'situation') return 'situation';
  if (s === 'problem') return 'problem';
  if (s === 'implication') return 'implication';
  if (s === 'payoff' || s === 'need-payoff' || s === 'need_payoff') return 'need-payoff';
  return null;
};

const captionsToChunk = (captions: CaptionLine[], maxChars: number) => {
  const text = captions
    .slice(-60)
    .map((c) => `${c.speaker || '—'}: ${c.text}`)
    .join('\n');
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
};

const spinScriptToBlocks = (script: any): ScriptBlock[] => {
  const out: ScriptBlock[] = [];

  // Already in UI format
  if (Array.isArray(script)) {
    for (const b of script) {
      if (b && typeof b === 'object' && typeof b.phase === 'string' && typeof b.text === 'string') {
        out.push(b as ScriptBlock);
      }
    }
    return out;
  }

  const blocks = Array.isArray(script?.blocks) ? script.blocks : [];
  for (const block of blocks) {
    const phase = (block?.phase || '').toString() as SPINPhase;
    const questions = Array.isArray(block?.questions) ? block.questions : [];
    const tips = Array.isArray(block?.tips) ? block.tips : [];
    const transitions = Array.isArray(block?.transitions) ? block.transitions : [];

    for (const q of questions.slice(0, 6)) {
      out.push({ phase, type: 'question', text: String(q) });
    }
    if (!questions.length && typeof block?.content === 'string' && block.content.trim()) {
      out.push({ phase, type: 'tip', text: block.content.trim() });
    }
    for (const t of tips.slice(0, 2)) {
      out.push({ phase, type: 'tip', text: String(t) });
    }
    for (const tr of transitions.slice(0, 1)) {
      out.push({ phase, type: 'transition', text: String(tr) });
    }
  }

  return out.filter((b) => ['situation', 'problem', 'implication', 'need-payoff'].includes(b.phase));
};

const generateDemoScript = async (lead: Lead): Promise<ScriptBlock[]> => {
  try {
    const result = await echoApi.ai.generate({
      type: 'spin-script',
      contactName: lead.name,
      company: lead.company,
      goal: 'Vést 20min demo, pochopit potřeby a dohodnout pilotní spuštění',
      contextData: {
        contact_id: lead.id,
        role: lead.role,
        industry: lead.industry,
        notes: lead.notes,
      },
    });
    const script = result?.script || null;
    return spinScriptToBlocks(script);
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
  aiSuggestion?: { label: string; text: string } | null;
  risk?: string | null;
}> = ({ block, onNext, onPrev, currentIndex, totalBlocks, aiSuggestion, risk }) => {
  const phase = SPIN_PHASES.find(p => p.id === block.phase)!;
  const primaryText = aiSuggestion?.text || block.text;
  
  return (
    <div className="mc-script-card" style={{ '--phase-color': phase.color } as React.CSSProperties}>
      <div className="mc-script-header">
        <span className="mc-script-phase">{phase.icon} {phase.name}</span>
        <div className="mc-script-header-right">
          {risk ? <span className="mc-risk">⚠ {risk}</span> : null}
          <span className="mc-script-counter">{currentIndex + 1} / {totalBlocks}</span>
        </div>
      </div>
      <div className={`mc-script-main ${block.type !== 'question' ? 'mc-script-main--tip' : ''}`}>
        {block.type !== 'question' && (
          <div className="mc-tip-badge">🧠 {block.type === 'tip' ? 'Tip pro tebe' : 'Přechod'} — <em>nečti nahlas</em></div>
        )}
        {aiSuggestion ? <div className="mc-ai-suggest-label">{aiSuggestion.label}</div> : null}
        <p className={`mc-script-text ${block.type !== 'question' ? 'mc-script-text--tip' : ''}`}>{primaryText}</p>
        {aiSuggestion ? (
          <p className="mc-script-followup">
            <span className="mc-script-followup-label">Plán:</span> {block.text}
          </p>
        ) : block.followUp ? (
          <p className="mc-script-followup">
            <span className="mc-script-followup-label">Doptání:</span> {block.followUp}
          </p>
        ) : null}
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

// Captions Bar (LIVE phase bottom) – kept for fallback, main display moved to LiveCaptionsPanel
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

/* ============ NEW LIVE SIDEBAR COMPONENTS ============ */

// Company brief for live sidebar – uses real Brief data when available
const LiveBriefPanel: React.FC<{ lead: Lead; brief: Brief | null }> = ({ lead, brief }) => (
  <div className="mc-sidebar-section">
    <div className="mc-sidebar-heading">🏢 Firma & kontakt</div>
    <div className="mc-sidebar-brief">
      <div className="mc-brief-row">
        <span className="mc-brief-label">Firma</span>
        <span className="mc-brief-value">{brief?.company?.name || lead.company}</span>
      </div>
      <div className="mc-brief-row">
        <span className="mc-brief-label">Kontakt</span>
        <span className="mc-brief-value">{brief?.person?.name || lead.name}</span>
      </div>
      <div className="mc-brief-row">
        <span className="mc-brief-label">Role</span>
        <span className="mc-brief-value">{brief?.person?.role || lead.role}</span>
      </div>
      {(brief?.company?.industry || lead.industry) && (
        <div className="mc-brief-row">
          <span className="mc-brief-label">Obor</span>
          <span className="mc-brief-value">{brief?.company?.industry || lead.industry}</span>
        </div>
      )}
      {(brief?.company?.size || lead.companySize) && (
        <div className="mc-brief-row">
          <span className="mc-brief-label">Velikost</span>
          <span className="mc-brief-value">{brief?.company?.size || `${lead.companySize} zaměstnanců`}</span>
        </div>
      )}
      {brief?.person?.decisionPower && brief.person.decisionPower !== 'unknown' && (
        <div className="mc-brief-row">
          <span className="mc-brief-label">Typ</span>
          <span className="mc-brief-value">
            {brief.person.decisionPower === 'decision-maker' ? '🔑 Rozhodovatel' : brief.person.decisionPower === 'influencer' ? '💡 Influencer' : '🏅 Champion'}
          </span>
        </div>
      )}
      {(brief?.company?.summary || lead.notes) && (
        <div className="mc-brief-notes">{brief?.company?.summary || lead.notes}</div>
      )}
      {brief?.company?.recentNews && (
        <div className="mc-brief-notes">📰 {brief.company.recentNews}</div>
      )}
      {brief?.person?.background && (
        <div className="mc-brief-notes">👤 {brief.person.background}</div>
      )}
      {/* Quick links */}
      <div className="mc-brief-links">
        {brief?.company?.website ? (
          <a href={brief.company.website.startsWith('http') ? brief.company.website : `https://${brief.company.website}`} target="_blank" rel="noopener noreferrer" className="mc-brief-link">🌐 Web</a>
        ) : null}
        {brief?.person?.linkedin ? (
          <a href={brief.person.linkedin} target="_blank" rel="noopener noreferrer" className="mc-brief-link">💼 LinkedIn</a>
        ) : null}
        {lead.email ? (
          <a href={`mailto:${lead.email}`} className="mc-brief-link">✉️ E-mail</a>
        ) : null}
      </div>
    </div>

    {/* Signals & landmines */}
    {brief && ((brief.signals || []).length > 0 || (brief.landmines || []).length > 0) && (
      <div className="mc-brief-signals">
        {(brief.signals || []).slice(0, 4).map((s, idx) => (
          <span key={`sig-${idx}`} className={`mc-brief-chip mc-brief-chip--${s.type}`}>
            {s.type === 'opportunity' ? '🟢' : s.type === 'risk' ? '🔴' : '⚪'} {s.text}
          </span>
        ))}
        {(brief.landmines || []).slice(0, 3).map((t, idx) => (
          <span key={`lm-${idx}`} className="mc-brief-chip mc-brief-chip--landmine">⚠️ {t}</span>
        ))}
      </div>
    )}
  </div>
);

// Phase questions list for live sidebar
const PhaseQuestionsList: React.FC<{
  script: ScriptBlock[];
  currentPhase: SPINPhase;
  currentBlockIndex: number;
  onJump: (index: number) => void;
}> = ({ script, currentPhase, currentBlockIndex, onJump }) => {
  const phaseInfo = SPIN_PHASES.find(p => p.id === currentPhase)!;
  const phaseBlocks = script
    .map((b, i) => ({ block: b, globalIndex: i }))
    .filter(({ block }) => block.phase === currentPhase);

  return (
    <div className="mc-sidebar-section">
      <div className="mc-sidebar-heading" style={{ color: phaseInfo.color }}>
        {phaseInfo.icon} {phaseInfo.name} — otázky ({phaseBlocks.length})
      </div>
      <ul className="mc-phase-questions">
        {phaseBlocks.map(({ block, globalIndex }) => (
          <li
            key={globalIndex}
            className={`mc-phase-q ${globalIndex === currentBlockIndex ? 'mc-phase-q--active' : ''} ${block.type !== 'question' ? 'mc-phase-q--tip' : ''}`}
            onClick={() => onJump(globalIndex)}
          >
            <span className="mc-phase-q-marker">
              {globalIndex === currentBlockIndex ? '▸' : block.type === 'question' ? '○' : '·'}
            </span>
            <span className="mc-phase-q-text">{block.text}</span>
            {block.type !== 'question' && <span className="mc-phase-q-badge">{block.type === 'tip' ? 'tip' : '→'}</span>}
          </li>
        ))}
        {phaseBlocks.length === 0 && (
          <li className="mc-phase-q mc-phase-q--empty">Žádné otázky pro tuto fázi</li>
        )}
      </ul>
    </div>
  );
};

// Google Meet connection guide
const MeetConnectGuide: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className="mc-sidebar-section">
    <div className="mc-sidebar-heading">📡 Google Meet</div>
    {isConnected ? (
      <div className="mc-meet-status mc-meet-status--ok">
        <span className="mc-captions-dot connected" /> Připojeno — titulky běží
      </div>
    ) : (
      <div className="mc-meet-guide">
        <div className="mc-meet-status mc-meet-status--waiting">
          <span className="mc-captions-dot" /> Čekám na připojení
        </div>
        <ol className="mc-meet-steps">
          <li>Otevři <strong>Google Meet</strong> v tomto prohlížeči</li>
          <li>Zapni <strong>titulky</strong> (CC tlačítko)</li>
          <li>Nainstaluj rozšíření <a href="https://chromewebstore.google.com" target="_blank" rel="noopener noreferrer">Echo Meet Coach</a></li>
          <li>Titulky se zobrazí automaticky</li>
        </ol>
      </div>
    )}
  </div>
);

// Live captions transcript panel (scrollable)
const LiveCaptionsPanel: React.FC<{
  captions: CaptionLine[];
  isConnected: boolean;
  matchedCard: Battlecard | null;
}> = ({ captions, isConnected, matchedCard }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
};

// Summary Hero (WRAPUP phase)
const SCHEDULER_URL = 'https://behavera.pipedrive.com/scheduler/GX27Q8iw/konzultace-jak-ziskat-jasna-data-o-svem-tymu-30-minutes';

const SummaryHero: React.FC<{
  lead: Lead;
  totalTime: number;
  phaseTimes: Record<SPINPhase, number>;
  onNewDemo: () => void;
  analysis: any | null;
  analysisLoading: boolean;
  analysisError: string | null;
  emailDraft: string;
  emailLoading: boolean;
  emailError: string | null;
  emailCopied: boolean;
  onGenerateEmail: () => void;
  onCopyEmail: () => void;
  onEmailDraftChange: (value: string) => void;
  smartBccAddress: string;
  sequenceSendTime: string;
  crmSaving: boolean;
  crmResult: { ok: boolean; message: string } | null;
  onSaveCrm: () => void;
}> = ({ lead, totalTime, phaseTimes, onNewDemo, analysis, analysisLoading, analysisError, emailDraft, emailLoading, emailError, emailCopied, onGenerateEmail, onCopyEmail, onEmailDraftChange, smartBccAddress, sequenceSendTime, crmSaving, crmResult, onSaveCrm }) => {
  const [showScheduler, setShowScheduler] = useState(false);
  const [emailLogStatus, setEmailLogStatus] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [sequenceMsg, setSequenceMsg] = useState<string | null>(null);
  const sequenceTime = (sequenceSendTime || '09:00').toString().trim() || '09:00';
  const sequenceTimeZone = 'Europe/Prague';

  const computeZonedUtc = (y: number, m: number, d: number, hh: number, mm: number, timeZone: string) => {
    const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
    const asLocal = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
    const offset = utcGuess.getTime() - asLocal.getTime();
    return new Date(utcGuess.getTime() + offset);
  };

  const computeSequenceIso = (delayDays: number) => {
    const [hhRaw, mmRaw] = sequenceTime.split(':');
    const hh = Math.max(0, Math.min(23, Number(hhRaw) || 9));
    const mm = Math.max(0, Math.min(59, Number(mmRaw) || 0));

    const now = new Date();
    const nowZoned = new Date(now.toLocaleString('en-US', { timeZone: sequenceTimeZone }));
    const targetZoned = new Date(nowZoned);
    targetZoned.setDate(targetZoned.getDate() + delayDays);
    const y = targetZoned.getFullYear();
    const m = targetZoned.getMonth() + 1;
    const d = targetZoned.getDate();
    return computeZonedUtc(y, m, d, hh, mm, sequenceTimeZone).toISOString();
  };

  const formatSequenceWhen = (iso: string) =>
    new Date(iso).toLocaleString('cs-CZ', { timeZone: sequenceTimeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!lead?.id) return;
    let cancelled = false;
    setEmailHistoryLoading(true);
    echoApi.email.history(lead.id)
      .then((res) => {
        if (cancelled) return;
        setEmailHistory(Array.isArray(res?.emails) ? res.emails : []);
      })
      .catch(() => {
        if (cancelled) return;
        setEmailHistory([]);
      })
      .finally(() => {
        if (cancelled) return;
        setEmailHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [lead?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!lead?.id) return;
    let cancelled = false;
    echoApi.emailSchedule.active({ contactId: lead.id })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.schedules) ? res.schedules : [];
        const has = rows.some((r: any) => String(r?.email_type || '').startsWith('sequence-') && (r?.status === 'pending' || r?.status === 'draft-created'));
        setSequenceEnabled(has);
      })
      .catch(() => {
        if (cancelled) return;
        setSequenceEnabled(false);
      });
    return () => { cancelled = true; };
  }, [lead?.id]);

  if (showScheduler) {
    return (
      <div className="mc-scheduler-embed">
        <div className="mc-scheduler-header">
          <h3>📅 Naplánuj follow-up</h3>
          <button className="mc-scheduler-close" onClick={() => setShowScheduler(false)}>✕ Zavřít</button>
        </div>
        <iframe
          src={SCHEDULER_URL}
          className="mc-scheduler-iframe"
          title="Pipedrive Scheduler"
          allow="payment"
        />
      </div>
    );
  }

  return (
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

      <div className="mc-ai-wrapup">
        <div className="mc-ai-wrapup-title">AI hodnocení</div>
        {!isSupabaseConfigured ? (
          <div className="mc-ai-wrapup-note">AI není nakonfigurovaná.</div>
        ) : analysisLoading ? (
          <div className="mc-ai-wrapup-note">⏳ Analyzuji demo…</div>
        ) : analysisError ? (
          <div className="mc-ai-wrapup-error">Nepodařilo se analyzovat: {analysisError}</div>
        ) : analysis ? (
          <div className="mc-ai-wrapup-grid">
            <div className="mc-ai-score">
              <div className="mc-ai-score-num">{Number(analysis.score ?? 0)}</div>
              <div className="mc-ai-score-label">/ 100</div>
            </div>
            <div className="mc-ai-wrapup-body">
              {analysis.summary ? <div className="mc-ai-summary">{analysis.summary}</div> : null}
              {Array.isArray(analysis.strengths) && analysis.strengths.length ? (
                <div className="mc-ai-list">
                  <div className="mc-ai-list-title">Silné stránky</div>
                  <ul>{analysis.strengths.slice(0, 4).map((s: string, i: number) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                </div>
              ) : null}
              {Array.isArray(analysis.weaknesses) && analysis.weaknesses.length ? (
                <div className="mc-ai-list">
                  <div className="mc-ai-list-title">Slabiny</div>
                  <ul>{analysis.weaknesses.slice(0, 4).map((s: string, i: number) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                </div>
              ) : null}
              {analysis.coachingTip ? <div className="mc-ai-tip"><strong>Tip:</strong> {analysis.coachingTip}</div> : null}
            </div>
          </div>
        ) : (
          <div className="mc-ai-wrapup-note">Počkej na titulky a AI udělá shrnutí.</div>
        )}

        <div className="mc-ai-email">
          <button className="mc-ai-email-btn" onClick={onGenerateEmail} disabled={!isSupabaseConfigured || emailLoading}>
            {emailLoading ? '⏳ Generuji follow‑up e‑mail…' : '✉️ Vygenerovat follow‑up e‑mail (AI)'}
          </button>
          {emailError ? <div className="mc-ai-wrapup-error">{emailError}</div> : null}
          {emailDraft ? (
            <div className="mc-ai-email-editor">
              <div className="mc-ai-email-actions">
                <button className="mc-ai-email-copy" onClick={onCopyEmail}>{emailCopied ? 'Zkopírováno ✓' : '📋 Kopírovat'}</button>
                <button
                  className="mc-ai-email-copy"
                  type="button"
                  onClick={async () => {
                    setEmailLogStatus(null);
                    try {
                      const lines = emailDraft.split('\n');
                      const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                      const subject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${lead.company} – follow-up po demo`;
                      const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                      const body = bodyLines.join('\n').trim();
                      const res = await echoApi.email.log({
                        contactId: lead.id,
                        contactName: lead.name,
                        company: lead.company,
                        emailType: 'demo-followup',
                        subject,
                        body,
                        recipientEmail: lead.email || undefined,
                        source: 'manual',
                      });
                      if (!res?.ok) throw new Error(res?.error || 'Log selhal');
                      setEmailLogStatus('Označeno jako odeslané ✓');
                      try {
                        const h = await echoApi.email.history(lead.id);
                        setEmailHistory(Array.isArray(h?.emails) ? h.emails : []);
                      } catch {
                        // ignore
                      }
                    } catch {
                      setEmailLogStatus('Nepodařilo se zalogovat e‑mail');
                    }
                  }}
                >
                  ✅ Označit jako odeslané
                </button>
                {lead.email && (
                  <button
                    className="mc-ai-email-mailto"
                    type="button"
                    onClick={async () => {
                      const lines = emailDraft.split('\n');
                      const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                      const subject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${lead.company} – follow-up po demo`;
                      const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                      const body = bodyLines.join('\n').trim();
                      const bcc = smartBccAddress || '';
                      const mailtoUrl = `mailto:${encodeURIComponent(lead.email!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${bcc ? `&bcc=${encodeURIComponent(bcc)}` : ''}`;

                      if (isSupabaseConfigured) {
                        try {
                          const status = await echoApi.gmail.getStatus();
                          if (status?.configured) {
                            const res = await echoApi.gmail.createDraft({
                              to: lead.email!,
                              subject,
                              body,
                              bcc: bcc || undefined,
                              log: {
                                contactId: lead.id,
                                contactName: lead.name,
                                company: lead.company,
                                emailType: 'demo-followup',
                              },
                            });
                            if (res?.ok && res.gmailUrl) {
                              window.open(res.gmailUrl, '_blank', 'noopener,noreferrer');
                              try {
                                const h = await echoApi.email.history(lead.id);
                                setEmailHistory(Array.isArray(h?.emails) ? h.emails : []);
                              } catch {
                                // ignore
                              }
                              return;
                            }
                          }
                        } catch {
                          // Silent fallback to mailto:
                        }
                      }

                      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    📧 Otevřít v e‑mailu
                  </button>
                )}
              </div>
              <textarea
                value={emailDraft}
                onChange={(e) => onEmailDraftChange(e.target.value)}
                rows={8}
              />
              {!lead.email && (
                <div className="mc-ai-email-hint muted">Kontakt nemá e‑mail – zkopíruj text a pošli ručně.</div>
              )}
              {smartBccAddress && (
                <div className="mc-ai-email-hint muted">SmartBCC: {smartBccAddress}</div>
              )}
              {emailLogStatus ? (
                <div className="mc-ai-email-hint muted">{emailLogStatus}</div>
              ) : null}
              {isSupabaseConfigured && lead?.id ? (
                emailHistoryLoading ? (
                  <div className="mc-ai-email-hint muted">Poslední e‑maily: ⏳ Načítám…</div>
                ) : emailHistory.length ? (
                  <div className="mc-ai-email-hint muted">
                    <div>Poslední e‑maily:</div>
                    <ul style={{ margin: '6px 0 0 16px' }}>
                      {emailHistory.slice(0, 3).map((e: any) => {
                        const when = e?.sent_at ? new Date(String(e.sent_at)).toLocaleDateString('cs-CZ') : '—';
                        const type = String(e?.email_type || '');
                        const typeLabel =
                          type === 'cold' ? 'cold' :
                          type === 'demo-followup' ? 'po demo' :
                          type === 'sequence-d1' ? 'D+1' :
                          type === 'sequence-d3' ? 'D+3' : type;
                        const subj = e?.subject ? String(e.subject) : '—';
                        return <li key={String(e?.id || `${when}-${type}-${subj}`)}>{when} · {typeLabel} · {subj}</li>;
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="mc-ai-email-hint muted">Poslední e‑maily: —</div>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mc-ai-email" style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={sequenceEnabled}
              disabled={!isSupabaseConfigured || sequenceBusy}
              onChange={async (e) => {
                const next = e.target.checked;
                setSequenceMsg(null);
                setSequenceBusy(true);
                try {
                  if (!next) {
                    await echoApi.emailSchedule.cancel({ contactId: lead.id });
                    setSequenceEnabled(false);
                    setSequenceMsg('Sekvence zrušena.');
                    return;
                  }

                  if (!emailDraft.trim()) {
                    setSequenceEnabled(false);
                    setSequenceMsg('Nejdřív vygeneruj follow‑up e‑mail (aby měl AI kontext).');
                    return;
                  }

                  const lines = emailDraft.split('\n');
                  const subjectLine = lines.find(l => l.startsWith('Předmět:'));
                  const originalSubject = subjectLine ? subjectLine.replace('Předmět:', '').trim() : `${lead.company} – follow-up po demo`;
                  const bodyLines = lines.filter(l => !l.startsWith('Předmět:'));
                  const originalBody = bodyLines.join('\n').trim();

                  const d1 = computeSequenceIso(1);
                  const d3 = computeSequenceIso(3);
                  const baseContext = {
                    sequenceKind: 'demo',
                    contactName: lead.name,
                    company: lead.company,
                    recipientEmail: lead.email || '',
                    bcc: smartBccAddress || '',
                    originalEmail: { subject: originalSubject, body: originalBody },
                  };

                  const res = await echoApi.emailSchedule.create({
                    contactId: lead.id,
                    schedules: [
                      { emailType: 'sequence-d1', scheduledFor: d1, context: baseContext },
                      { emailType: 'sequence-d3', scheduledFor: d3, context: baseContext },
                    ],
                  });
                  if (!res?.ok) throw new Error(res?.error || 'Nepodařilo se naplánovat sekvenci');
                  setSequenceEnabled(true);
                  setSequenceMsg('Sekvence naplánována ✓');
                } catch (err) {
                  setSequenceEnabled(false);
                  setSequenceMsg(err instanceof Error ? err.message : 'Nepodařilo se naplánovat sekvenci');
                } finally {
                  setSequenceBusy(false);
                }
              }}
            />
            <span style={{ fontWeight: 700 }}>Naplánovat follow‑up sekvenci</span>
          </label>
          <div className="mc-ai-email-hint muted">→ D+1: krátký bump ({formatSequenceWhen(computeSequenceIso(1))})</div>
          <div className="mc-ai-email-hint muted">→ D+3: finální follow‑up ({formatSequenceWhen(computeSequenceIso(3))})</div>
          {sequenceMsg ? <div className="mc-ai-email-hint muted">{sequenceMsg}</div> : null}
        </div>

        <div className="mc-ai-crm">
          <button className="mc-ai-crm-btn" onClick={onSaveCrm} disabled={!isSupabaseConfigured || crmSaving}>
            {crmSaving ? '⏳ Ukládám do CRM…' : '💾 Uložit do CRM (Pipedrive)'}
          </button>
          {crmResult ? (
            <div className={`mc-ai-crm-msg ${crmResult.ok ? 'ok' : 'err'}`}>{crmResult.message}</div>
          ) : null}
        </div>
      </div>
      <div className="mc-summary-actions">
        <button className="mc-summary-btn primary" onClick={() => setShowScheduler(true)}>
          📅 Naplánovat follow-up
        </button>
        <button className="mc-summary-btn secondary" onClick={onNewDemo}>
          🔄 Nové demo
        </button>
      </div>
    </div>
  );
};

/* ============ TRANSCRIPT WRAPUP SECTION ============ */
const TranscriptWrapupSection: React.FC<{ lead: Lead; totalTime: number }> = ({ lead, totalTime }) => {
  const [expanded, setExpanded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);

  if (analysisResult) {
    return (
      <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
        <AnalysisResult
          result={analysisResult}
          onBack={() => setAnalysisResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="ta-wrapup-inline" style={{ marginTop: '16px' }}>
      <button className="ta-wrapup-toggle" onClick={() => setExpanded(!expanded)}>
        <h3>📋 Analyzovat přepis hovoru</h3>
        <span className={expanded ? 'open' : ''}>▼</span>
      </button>
      {expanded && (
        <div className="ta-wrapup-body">
          <TranscriptInput
            contactName={lead.name}
            contactCompany={lead.company}
            contactRole={lead.role}
            durationSeconds={totalTime}
            onAnalyzed={setAnalysisResult}
            compact
          />
        </div>
      )}
    </div>
  );
};

/* ============ MAIN COMPONENT ============ */
export const MeetCoachAppNew: React.FC = () => {
  // Settings (for SmartBCC)
  const { settings } = useSales();

  // App phase
  const [appPhase, setAppPhase] = useState<AppPhase>('prep');
  
  // Lead & Script
  const [lead] = useState<Lead>(DEMO_LEAD);
  const [script, setScript] = useState<ScriptBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  // Brief from AI (real company data for Meet)
  const { brief: aiBrief, loading: briefLoading, error: briefError, generate: generateBrief } = useBrief();
  const [meetDomain, setMeetDomain] = useState('');

  const coachBrief: Brief = useMemo(
    () => aiBrief ? { ...aiBrief } : ({
      company: {
        name: lead.company,
        industry: lead.industry || 'Neznámý obor',
        summary: lead.notes || '',
        website: undefined,
      },
      person: {
        name: lead.name,
        role: lead.role,
        decisionPower: 'unknown',
      },
      signals: [],
      landmines: [],
      sources: [],
      generatedAt: new Date().toISOString(),
      cached: true,
    }),
    [aiBrief, lead.company, lead.industry, lead.name, lead.notes, lead.role],
  );
  
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

  const changePhase = useCallback((newPhase: SPINPhase) => {
    if (newPhase === spinPhase) return;
    setSpinPhase(newPhase);
    setPhaseTime(0);

    // Find first block of this phase
    const firstBlockIdx = script.findIndex((b) => b.phase === newPhase);
    if (firstBlockIdx !== -1) {
      setCurrentBlockIndex(firstBlockIdx);
    }
  }, [script, spinPhase]);
  
  // Whispers
  const [currentWhisper, setCurrentWhisper] = useState<Whisper | null>(null);
  const whisperTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { response: liveCoachResponse, loading: liveCoachLoading, error: liveCoachError, fetchTips: fetchCoachTips, clear: clearLiveCoach } =
    useLiveCoach();

  const [spinOutput, setSpinOutput] = useState<any | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const lastSpinCallRef = useRef(0);
  const lastSpinKeyRef = useRef<string>('');
  const spinPendingRef = useRef(false);
  const [objectionCount, setObjectionCount] = useState(0);
  
  // Captions & Battlecards
  const { lines: captions, isConnected } = useMeetCaptions();
  const [matchedCard, setMatchedCard] = useState<Battlecard | null>(null);
  const [battlecards, setBattlecards] = useState<Battlecard[]>(BATTLECARDS);
  const { cards: dynamicBattlecards, meta: dynamicMeta, loading: dynamicLoading, error: dynamicError, generate: generateDynamicBattlecards } =
    useDynamicBattlecards();
  const dynamicKeyRef = useRef<string>('');

  // Wrapup AI
  const [wrapupAnalysis, setWrapupAnalysis] = useState<any | null>(null);
  const [wrapupAnalysisLoading, setWrapupAnalysisLoading] = useState(false);
  const [wrapupAnalysisError, setWrapupAnalysisError] = useState<string | null>(null);
  const [wrapupEmailDraft, setWrapupEmailDraft] = useState('');
  const [wrapupEmailLoading, setWrapupEmailLoading] = useState(false);
  const [wrapupEmailError, setWrapupEmailError] = useState<string | null>(null);
  const [wrapupEmailCopied, setWrapupEmailCopied] = useState(false);
  const [wrapupCrmSaving, setWrapupCrmSaving] = useState(false);
  const [wrapupCrmResult, setWrapupCrmResult] = useState<{ ok: boolean; message: string } | null>(null);
  const wrapupAnalysisKeyRef = useRef<string>('');
  
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

  // Dynamic battlecards (PREP): generate sector-specific cards and merge with static
  useEffect(() => {
    if (appPhase !== 'prep') return;
    const key = `${lead.company}::${lead.industry || ''}::${lead.role || ''}`;
    if (dynamicKeyRef.current === key) return;
    dynamicKeyRef.current = key;
    generateDynamicBattlecards({ companyName: lead.company, industry: lead.industry, personTitle: lead.role });
  }, [appPhase, generateDynamicBattlecards, lead.company, lead.industry, lead.role]);

  useEffect(() => {
    const byKey = new Map<string, Battlecard>();
    for (const c of [...BATTLECARDS, ...(dynamicBattlecards || [])]) byKey.set(c.key, c);
    setBattlecards(Array.from(byKey.values()));
  }, [dynamicBattlecards]);

  // Post-demo AI analysis (WRAPUP)
  useEffect(() => {
    if (appPhase !== 'wrapup') return;
    if (!isSupabaseConfigured) return;
    if (!captions.length) return;

    const lastId = captions[captions.length - 1]?.id || '';
    const key = `${lead.id}::${lastId}`;
    if (wrapupAnalysisKeyRef.current === key) return;
    wrapupAnalysisKeyRef.current = key;

    const transcript = captions.slice(-120).map((c) => ({ speaker: c.speaker || '—', text: c.text }));
    if (transcript.length < 2) return;

    setWrapupAnalysisLoading(true);
    setWrapupAnalysisError(null);
    echoApi.ai
      .analyzeCall({
        transcript,
        salesStyle: 'SPIN',
        contact: { name: lead.name, role: lead.role },
      })
      .then((r) => setWrapupAnalysis(r || null))
      .catch((e) => setWrapupAnalysisError(e instanceof Error ? e.message : 'Analýza selhala'))
      .finally(() => setWrapupAnalysisLoading(false));
  }, [appPhase, captions, lead.id, lead.name, lead.role]);
  
  // Live coach: feed captions + SPIN stage (debounced in hook)
  useEffect(() => {
    if (appPhase !== 'live') return;
    const chunk = captionsToChunk(captions, 2000);
    fetchCoachTips(chunk, coachBrief, toSpinLetter(spinPhase));
  }, [appPhase, captions, coachBrief, fetchCoachTips, spinPhase]);

  // Show AI coach tips as floating whispers
  useEffect(() => {
    if (appPhase !== 'live') return;
    const tip = liveCoachResponse?.tips?.[0];
    if (!tip || !tip.text) return;

    if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
    setCurrentWhisper({
      id: `${tip.id || Date.now()}_${Date.now()}`,
      text: tip.text,
      type: tip.priority === 'high' ? 'warning' : 'tip',
      timestamp: Date.now(),
    });
    whisperTimeoutRef.current = setTimeout(() => setCurrentWhisper(null), 8000);
  }, [appPhase, liveCoachResponse?.tips]);

  // SPIN orchestrator (ai/spin/next): adaptive "say next" + whisper + stage suggestion
  useEffect(() => {
    if (appPhase !== 'live') return;
    if (!captions.length) return;
    if (!isConnected) return;

    const last = captions[captions.length - 1];
    const key = `${spinPhase}|${last?.id || ''}`;
    if (lastSpinKeyRef.current === key) return;
    lastSpinKeyRef.current = key;

    const now = Date.now();
    if (spinPendingRef.current) return;
    if (now - lastSpinCallRef.current < 8000) return;
    lastSpinCallRef.current = now;
    spinPendingRef.current = true;
    setSpinError(null);

    const transcriptWindow = captions.slice(-14).map((l) => `${l.speaker || '—'}: ${l.text}`);
    const recap = captions
      .slice(-4)
      .map((l) => l.text)
      .join(' ')
      .slice(0, 900);

    const stageTimers = {
      situation: phaseTimes.situation || 0,
      problem: phaseTimes.problem || 0,
      implication: phaseTimes.implication || 0,
      payoff: phaseTimes['need-payoff'] || 0,
    };

    echoApi.ai
      .spinNext({
        transcriptWindow,
        recap,
        dealState: { stage: toOrchestratorStage(spinPhase), objectionCount },
        stage: toOrchestratorStage(spinPhase),
        stageTimers,
      })
      .then((res) => {
        const out = res?.output || null;
        setSpinOutput(out);
        const next = fromOrchestratorStage(out?.stage);
        if (next && next !== spinPhase) {
          changePhase(next);
        }
        const whisper = (out?.coach_whisper || '').toString().trim();
        if (whisper) {
          if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
          setCurrentWhisper({
            id: `spin_${Date.now()}`,
            text: whisper,
            type: 'tip',
            timestamp: Date.now(),
          });
          whisperTimeoutRef.current = setTimeout(() => setCurrentWhisper(null), 8000);
        }
      })
      .catch((e) => {
        setSpinError(e instanceof Error ? e.message : 'Spin coach selhal');
      })
      .finally(() => {
        spinPendingRef.current = false;
      });
  }, [appPhase, captions, changePhase, isConnected, objectionCount, phaseTimes, spinPhase]);

  // Fallback whispers when AI isn't available
  useEffect(() => {
    if (appPhase !== 'live') return;
    const hasAiTips = Boolean(liveCoachResponse?.tips?.length) || Boolean(spinOutput?.coach_whisper);
    if (hasAiTips) return;

    const showWhisper = () => {
      const tips = WHISPER_TIPS[spinPhase];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentWhisper({
        id: Date.now().toString(),
        text: tip,
        type: 'tip',
        timestamp: Date.now(),
      });
      whisperTimeoutRef.current = setTimeout(() => setCurrentWhisper(null), 8000);
    };

    const firstTimeout = setTimeout(showWhisper, 5000);
    const interval = setInterval(showWhisper, 20000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
      if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
    };
  }, [appPhase, liveCoachResponse?.tips?.length, spinOutput?.coach_whisper, spinPhase]);
  
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
      cards: battlecards,
    });
    
    if (matches.best) {
      setMatchedCard(matches.best.card);
      if (matches.best.card.category === 'objection') {
        setObjectionCount((n) => n + 1);
      }
      // Add cooldown for this card
      setCooldownByKey(prev => ({
        ...prev,
        [matches.best!.card.key]: now + 60_000, // 60s cooldown
      }));
      
      // Hide after 10s
      setTimeout(() => setMatchedCard(null), 10000);
    }
  }, [battlecards, captions, cooldownByKey]);
  
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
    clearLiveCoach();
    setSpinOutput(null);
    setSpinError(null);
    setObjectionCount(0);
    setWrapupAnalysis(null);
    setWrapupAnalysisError(null);
    setWrapupAnalysisLoading(false);
    setWrapupEmailDraft('');
    setWrapupEmailError(null);
    setWrapupEmailLoading(false);
    setWrapupEmailCopied(false);
    setWrapupCrmSaving(false);
    setWrapupCrmResult(null);
    wrapupAnalysisKeyRef.current = '';
    const blocks = await generateDemoScript(lead);
    setScript(blocks);
    setCurrentBlockIndex(0);
    setSpinPhase('situation');
    setTotalTime(0);
    setPhaseTime(0);
    setPhaseTimes({ situation: 0, problem: 0, implication: 0, 'need-payoff': 0 });
    setAppPhase('live');
    setIsLoading(false);
  }, [clearLiveCoach, lead]);
  
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
    clearLiveCoach();
    setSpinOutput(null);
    setSpinError(null);
    setObjectionCount(0);
    setWrapupAnalysis(null);
    setWrapupAnalysisError(null);
    setWrapupAnalysisLoading(false);
    setWrapupEmailDraft('');
    setWrapupEmailError(null);
    setWrapupEmailLoading(false);
    setWrapupEmailCopied(false);
    setWrapupCrmSaving(false);
    setWrapupCrmResult(null);
    wrapupAnalysisKeyRef.current = '';
  }, [clearLiveCoach]);
  
  // Get current block
  const currentBlock = script[currentBlockIndex];

  // Phase-filtered blocks for sidebar
  const jumpToBlock = useCallback((idx: number) => {
    setCurrentBlockIndex(idx);
    const block = script[idx];
    if (block && block.phase !== spinPhase) {
      changePhase(block.phase);
    }
  }, [script, spinPhase, changePhase]);

  const aiSuggestion = useMemo(() => {
    const confidence = Number(spinOutput?.confidence ?? 0);
    const sayNext = (spinOutput?.say_next || '').toString().trim();
    if (sayNext) {
      if (confidence < 0.35 || sayNext === '(pause)') {
        return { label: 'AI: Pauza', text: 'Pauza — poslouchej víc.' };
      }
      return { label: 'AI: Řekni teď', text: sayNext };
    }
    const fallback = liveCoachResponse?.nextSpinQuestion?.question;
    if (fallback) return { label: 'AI: Další otázka', text: fallback };
    return null;
  }, [liveCoachResponse?.nextSpinQuestion?.question, spinOutput?.confidence, spinOutput?.say_next]);

  const riskText = useMemo(() => {
    const risk = spinOutput?.risk;
    if (!risk) return null;
    if (typeof risk === 'string') return risk;
    if (typeof risk === 'object') {
      const label = (risk.label || risk.text || risk.reason || '').toString().trim();
      return label || 'Riziko';
    }
    return String(risk);
  }, [spinOutput?.risk]);

  const generateWrapupEmail = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setWrapupEmailLoading(true);
    setWrapupEmailError(null);
    setWrapupEmailCopied(false);
    try {
      const keyLines = captions
        .slice(-10)
        .map((c) => `${c.speaker || '—'}: ${c.text}`)
        .join('\n');

      const r = await echoApi.ai.generate({
        type: 'email-demo',
        contactName: lead.name,
        company: lead.company,
        goal: 'Navázat po demo a domluvit další krok',
        contextData: {
          totalTimeSec: totalTime,
          phaseTimes,
          aiAnalysis: wrapupAnalysis || null,
          keyCaptions: keyLines,
        },
      });
      setWrapupEmailDraft(r?.content || '');
    } catch (e) {
      setWrapupEmailError(e instanceof Error ? e.message : 'E‑mail se nepodařilo vygenerovat');
    } finally {
      setWrapupEmailLoading(false);
    }
  }, [captions, lead.company, lead.name, phaseTimes, totalTime, wrapupAnalysis]);

  const copyWrapupEmail = useCallback(() => {
    if (!wrapupEmailDraft) return;
    navigator.clipboard.writeText(wrapupEmailDraft);
    setWrapupEmailCopied(true);
    setTimeout(() => setWrapupEmailCopied(false), 1500);
  }, [wrapupEmailDraft]);

  const wrapupCrmContent = useMemo(() => {
    const lines: string[] = [];
    lines.push(`<b>✅ Demo</b> – Echo Pulse`);
    lines.push(`Klient: <b>${lead.name}</b> (${lead.role}) – <b>${lead.company}</b>`);
    lines.push(`Délka: <b>${formatTime(totalTime)}</b>`);
    lines.push(
      `SPIN časy: Situace <b>${formatTime(phaseTimes.situation || 0)}</b> · Problém <b>${formatTime(phaseTimes.problem || 0)}</b> · Důsledky <b>${formatTime(phaseTimes.implication || 0)}</b> · Řešení <b>${formatTime(phaseTimes['need-payoff'] || 0)}</b>`,
    );
    if (wrapupAnalysis?.score !== undefined) lines.push(`AI skóre: <b>${Number(wrapupAnalysis.score)}</b>/100`);
    if (wrapupAnalysis?.summary) lines.push(`Shrnutí: ${String(wrapupAnalysis.summary)}`);
    if (wrapupAnalysis?.coachingTip) lines.push(`Tip kouče: ${String(wrapupAnalysis.coachingTip)}`);
    lines.push('Další krok: domluvit follow‑up / pilot (konkrétní termín).');
    const keyLines = captions
      .slice(-8)
      .map((c) => `${c.speaker || '—'}: ${c.text}`)
      .join(' | ');
    if (keyLines.trim()) lines.push(`Klíčové věty: ${keyLines}`);
    return lines.join('<br>');
  }, [captions, lead.company, lead.name, lead.role, phaseTimes, totalTime, wrapupAnalysis?.score, wrapupAnalysis?.summary]);

  const saveWrapupToCrm = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setWrapupCrmSaving(true);
    setWrapupCrmResult(null);
    try {
      let personId: number | undefined = undefined;
      let orgId: number | undefined = undefined;

      try {
        const ctx = await echoApi.precall.context({
          contact_id: lead.id,
          include: [],
          ttl_hours: 24,
          timeline: { activities: 0, notes: 0, deals: 0 },
        });
        personId = ctx?.pipedrive?.person_id ?? undefined;
      } catch {
        personId = undefined;
        orgId = undefined;
      }

      if (!personId && !orgId) throw new Error('Chybí vazba do Pipedrive (personId/orgId).');
      const res = await echoApi.addPipedriveNote({ personId, orgId, content: wrapupCrmContent });
      setWrapupCrmResult({ ok: Boolean(res?.success), message: res?.success ? 'Uloženo do Pipedrive.' : 'Nepodařilo se uložit do Pipedrive.' });
    } catch (e) {
      setWrapupCrmResult({ ok: false, message: e instanceof Error ? e.message : 'Uložení do CRM selhalo' });
    } finally {
      setWrapupCrmSaving(false);
    }
  }, [lead.id, wrapupCrmContent]);
  
  return (
    <div className={`mc-app mc-phase-${appPhase}`}>
      {/* PREP PHASE */}
      {appPhase === 'prep' && (
        <div className="mc-prep">
          <LeadHero lead={lead} onStart={startDemo} isLoading={isLoading} />
          {/* Domain input for AI brief generation */}
          <div className="mc-prep-brief">
            <div className="mc-prep-domain">
              <label htmlFor="meet-domain">🌐 Web firmy (doména pro AI přípravu)</label>
              <div className="mc-prep-domain-row">
                <input
                  id="meet-domain"
                  value={meetDomain}
                  onChange={(e) => setMeetDomain(e.target.value.trim().toLowerCase())}
                  placeholder="např. techcorp.cz"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  className="mc-prep-domain-btn"
                  onClick={() => {
                    if (!meetDomain) return;
                    generateBrief({ domain: meetDomain, personName: lead.name, role: lead.role, notes: lead.notes || '' });
                  }}
                  disabled={!meetDomain || briefLoading}
                >
                  {briefLoading ? '⏳' : '🔍 Načíst info'}
                </button>
              </div>
              {briefError && <div className="mc-prep-domain-error">{briefError}</div>}
              {aiBrief && !briefLoading && <div className="mc-prep-domain-ok">✅ Brief načten — firma, osoba, signály, LinkedIn</div>}
            </div>
          </div>
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

          {(liveCoachError || spinError) ? (
            <div className="mc-ai-error">
              AI koučink není dostupný. {liveCoachError ? `LiveCoach: ${liveCoachError}` : ''}{spinError ? ` SPIN: ${spinError}` : ''}
            </div>
          ) : null}

          <div className="mc-live-body">
            {/* LEFT SIDEBAR */}
            <aside className="mc-live-sidebar">
              <LiveBriefPanel lead={lead} brief={coachBrief} />
              <PhaseQuestionsList
                script={script}
                currentPhase={spinPhase}
                currentBlockIndex={currentBlockIndex}
                onJump={jumpToBlock}
              />
              <MeetConnectGuide isConnected={isConnected} />
            </aside>

            {/* MAIN CONTENT */}
            <div className="mc-live-main">
              {currentBlock && (
                <ScriptCard
                  block={currentBlock}
                  currentIndex={currentBlockIndex}
                  totalBlocks={script.length}
                  onNext={nextBlock}
                  onPrev={prevBlock}
                  aiSuggestion={aiSuggestion}
                  risk={riskText}
                />
              )}

              <LiveCaptionsPanel
                captions={captions}
                isConnected={isConnected}
                matchedCard={matchedCard}
              />
            </div>
          </div>
          
          <FloatingWhisper whisper={currentWhisper} />
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
            analysis={wrapupAnalysis}
            analysisLoading={wrapupAnalysisLoading}
            analysisError={wrapupAnalysisError}
            emailDraft={wrapupEmailDraft}
            emailLoading={wrapupEmailLoading}
            emailError={wrapupEmailError}
            emailCopied={wrapupEmailCopied}
            onGenerateEmail={generateWrapupEmail}
            onCopyEmail={copyWrapupEmail}
            onEmailDraftChange={setWrapupEmailDraft}
            smartBccAddress={settings.smartBccAddress || ''}
            sequenceSendTime={settings.sequenceSendTime || '09:00'}
            crmSaving={wrapupCrmSaving}
            crmResult={wrapupCrmResult}
            onSaveCrm={saveWrapupToCrm}
          />
          <TranscriptWrapupSection lead={lead} totalTime={totalTime} />
        </div>
      )}
    </div>
  );
};

export default MeetCoachAppNew;
