/**
 * MeetCoachAppNew.tsx – Phase-Based Single-Focus Demo Coach
 * 
 * PHASES:
 * 1. PREP - Review lead + SPIN script before demo
 * 2. LIVE - Fullscreen coaching with SPIN phases, whispers, captions
 * 3. WRAPUP - Summary and notes
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { useSales } from './contexts/SalesContext';
import { useMeetCaptions } from './hooks/useMeetCaptions';
import { BATTLECARDS, type Battlecard } from './meetcoach/battlecards';
import { pickTopMatches, type FeedLine } from './meetcoach/engine';
import { useLiveCoach } from './hooks/useLiveCoach';
import { useDynamicBattlecards } from './hooks/useDynamicBattlecards';
import { useBrief } from './hooks/useBrief';
import type { Brief } from './types/contracts';
import { EMPTY_LEAD, SPIN_PHASES, WHISPER_TIPS } from './features/meetcoach/constants';
import { captionsToChunk, formatTime, fromOrchestratorStage, toOrchestratorStage, toSpinLetter } from './features/meetcoach/helpers';
import { generateDemoScript } from './features/meetcoach/script';
import type { AppPhase, Lead, ScriptBlock, SPINPhase, Whisper } from './features/meetcoach/types';
import { FloatingWhisper } from './components/meet/FloatingWhisper';
import { LeadHero } from './components/meet/LeadHero';
import { LiveBriefPanel } from './components/meet/LiveBriefPanel';
import { LiveCaptionsPanel } from './components/meet/LiveCaptionsPanel';
import { MeetConnectGuide } from './components/meet/MeetConnectGuide';
import { PhaseQuestionsList } from './components/meet/PhaseQuestionsList';
import { ScriptCard } from './components/meet/ScriptCard';
import { SPINIndicator } from './components/meet/SPINIndicator';
import { SummaryHero, type WrapupAnalysis } from './components/meet/SummaryHero';
import { TranscriptWrapupSection } from './components/meet/TranscriptWrapupSection';
import './meetcoach-v2.css';

/* (Types/constants/helpers extracted to src/features/meetcoach) */

type SpinRisk = string | { label?: string; text?: string; reason?: string };

type SpinOutput = {
  say_next?: string;
  coach_whisper?: string;
  confidence?: number;
  stage?: string;
  risk?: SpinRisk;
};

/* ============ MAIN COMPONENT ============ */
export function MeetCoachAppNew() {
  // Settings (for SmartBCC)
  const { settings } = useSales();

  // App phase
  const [appPhase, setAppPhase] = useState<AppPhase>('prep');
  
  // Lead & Script
  const [lead, setLead] = useState<Lead>(EMPTY_LEAD);
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

  const { response: liveCoachResponse, error: liveCoachError, fetchTips: fetchCoachTips, clear: clearLiveCoach } =
    useLiveCoach();

  const [spinOutput, setSpinOutput] = useState<SpinOutput | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const lastSpinCallRef = useRef(0);
  const lastSpinKeyRef = useRef<string>('');
  const spinPendingRef = useRef(false);
  const [objectionCount, setObjectionCount] = useState(0);
  
  // Captions & Battlecards
  const { lines: captions, isConnected } = useMeetCaptions();
  const [matchedCard, setMatchedCard] = useState<Battlecard | null>(null);
  const [battlecards, setBattlecards] = useState<Battlecard[]>(BATTLECARDS);
  const { cards: dynamicBattlecards, generate: generateDynamicBattlecards } = useDynamicBattlecards();
  const dynamicKeyRef = useRef<string>('');

  // Wrapup AI
  const [wrapupAnalysis, setWrapupAnalysis] = useState<WrapupAnalysis | null>(null);
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
  const cooldownByKeyRef = useRef<Record<string, number | undefined>>({});
  
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
      cooldownUntilByKey: cooldownByKeyRef.current,
      cards: battlecards,
    });
    
    if (matches.best) {
      setMatchedCard(matches.best.card);
      if (matches.best.card.category === 'objection') {
        setObjectionCount((n) => n + 1);
      }
      // Add cooldown for this card (ref, no re-render loop)
      cooldownByKeyRef.current = {
        ...cooldownByKeyRef.current,
        [matches.best!.card.key]: now + 60_000, // 60s cooldown
      };
      
      // Hide after 10s
      setTimeout(() => setMatchedCard(null), 10000);
    }
  }, [battlecards, captions]);
  
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
  }, [appPhase, changePhase, endDemo, nextBlock, prevBlock, resetDemo, startDemo]);
  
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
          <LeadHero lead={lead} onStart={startDemo} isLoading={isLoading} onUpdate={(patch) => setLead(prev => ({ ...prev, ...patch }))} />
          {/* Domain input for AI brief generation */}
          <div className="mc-prep-brief">
            <div className="mc-prep-domain">
              <label htmlFor="meet-domain">🌐 Web firmy (doména pro AI přípravu)</label>
              <div className="mc-prep-domain-row">
                <input
                  id="meet-domain"
                  value={meetDomain}
                  onChange={(e) => setMeetDomain(e.target.value.trim().toLowerCase())}
                  placeholder="např. firma.cz"
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
}

export default MeetCoachAppNew;
