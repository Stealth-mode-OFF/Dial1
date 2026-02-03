import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, PlayCircle, Sparkles, StopCircle } from 'lucide-react';
import { echoApi } from '../utils/echoApi';
import { getExtensionStatus, listenToExtension, type ExtensionStatus } from '../utils/extensionBridge';
import { buildFunctionUrl, functionsBase, isSupabaseConfigured, publicAnonKey } from '../utils/supabase/info';
import { useSales } from '../contexts/SalesContext';

type TranscriptEvent = {
  id: string;
  ts: number;
  text: string;
  speaker?: string;
  speakerName?: string;
};

type SpinPrompts = {
  situation: string;
  problem: string;
  implication: string;
  needPayoff: string;
  closing: string;
};

const STORAGE_MEET_LINK = 'echo.demo.meet_link';
const STORAGE_MEET_CALL = 'echo.demo.meet_call_id';
const STORAGE_SPIN_PROMPTS = 'echo.demo.spin_prompts';
const STORAGE_PD_PERSON = 'echo.demo.pd_person_id';
const STORAGE_PD_NAME = 'echo.demo.pd_name';
const STORAGE_PD_COMPANY = 'echo.demo.pd_company';
const STORAGE_PD_OUTCOME = 'echo.demo.pd_outcome';
const STORAGE_PD_NOTES = 'echo.demo.pd_notes';
const STORAGE_PREP_CONTACT = 'echo.demo.prep_contact';
const STORAGE_PREP_COMPANY = 'echo.demo.prep_company';
const STORAGE_PREP_GOAL = 'echo.demo.prep_goal';

const emptyPrompts: SpinPrompts = {
  situation: '',
  problem: '',
  implication: '',
  needPayoff: '',
  closing: '',
};

const extractMeetCode = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/meet\.google\.com\/([a-zA-Z0-9-]{6,})/i);
  if (urlMatch?.[1]) return urlMatch[1].toUpperCase();
  const codeMatch = trimmed.match(/^[a-zA-Z0-9-]{6,}$/);
  if (codeMatch) return trimmed.toUpperCase();
  return '';
};

const buildSpinContext = (prompts: SpinPrompts) => {
  const lines = [
    prompts.situation && `Situation: ${prompts.situation}`,
    prompts.problem && `Problem: ${prompts.problem}`,
    prompts.implication && `Implication: ${prompts.implication}`,
    prompts.needPayoff && `Need-Payoff: ${prompts.needPayoff}`,
    prompts.closing && `Closing: ${prompts.closing}`,
  ].filter(Boolean);
  if (!lines.length) return '';
  return `Custom SPIN prompts:\n${lines.join('\n')}`;
};

export function DemoWorkspace() {
  const { pipedriveConfigured } = useSales();
  const [meetLink, setMeetLink] = useState('');
  const [meetCallId, setMeetCallId] = useState('');
  const [callIdTouched, setCallIdTouched] = useState(false);
  const [meetActive, setMeetActive] = useState(false);
  const [meetEvents, setMeetEvents] = useState<TranscriptEvent[]>([]);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>(() => getExtensionStatus());
  const [lastCaption, setLastCaption] = useState('');
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);
  const transcriptRef = useRef<Array<{ text: string; ts: number }>>([]);
  const meetLastTsRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [focusMode, setFocusMode] = useState<'spin' | 'objection' | 'closing'>('spin');
  const [spinStage, setSpinStage] = useState<'situation' | 'problem' | 'implication' | 'need_payoff' | 'close'>('situation');
  const [objectionTrigger, setObjectionTrigger] = useState('');
  const [liveCoachingEnabled, setLiveCoachingEnabled] = useState(true);
  const [coachTip, setCoachTip] = useState('');
  const [coachWhisper, setCoachWhisper] = useState('');
  const [coachConfidence, setCoachConfidence] = useState<number | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [objectionPack, setObjectionPack] = useState<any | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const lastCoachAtRef = useRef<number>(0);

  const [spinPrompts, setSpinPrompts] = useState<SpinPrompts>(emptyPrompts);
  const [useSpinPrompts, setUseSpinPrompts] = useState(true);

  const [logContactId, setLogContactId] = useState('');
  const [logContactName, setLogContactName] = useState('');
  const [logCompanyName, setLogCompanyName] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logDisposition, setLogDisposition] = useState('connected');
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [logSaving, setLogSaving] = useState(false);

  const [prepContact, setPrepContact] = useState('');
  const [prepCompany, setPrepCompany] = useState('');
  const [prepGoal, setPrepGoal] = useState('Book demo');
  const [prepOutput, setPrepOutput] = useState('');
  const [prepBusy, setPrepBusy] = useState(false);
  const [prepStatus, setPrepStatus] = useState<string | null>(null);

  const derivedCallId = useMemo(() => extractMeetCode(meetLink), [meetLink]);
  const canOpenMeet = Boolean(meetLink.trim());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedLink = window.localStorage.getItem(STORAGE_MEET_LINK);
      if (storedLink) setMeetLink(storedLink);
      const storedCall = window.localStorage.getItem(STORAGE_MEET_CALL);
      if (storedCall) {
        setMeetCallId(storedCall);
        setCallIdTouched(true);
      }
      const storedPrompts = window.localStorage.getItem(STORAGE_SPIN_PROMPTS);
      if (storedPrompts) {
        const parsed = JSON.parse(storedPrompts);
        setSpinPrompts({ ...emptyPrompts, ...parsed });
      }
      const storedPdId = window.localStorage.getItem(STORAGE_PD_PERSON);
      if (storedPdId) setLogContactId(storedPdId);
      const storedPdName = window.localStorage.getItem(STORAGE_PD_NAME);
      if (storedPdName) setLogContactName(storedPdName);
      const storedPdCompany = window.localStorage.getItem(STORAGE_PD_COMPANY);
      if (storedPdCompany) setLogCompanyName(storedPdCompany);
      const storedPdOutcome = window.localStorage.getItem(STORAGE_PD_OUTCOME);
      if (storedPdOutcome) setLogDisposition(storedPdOutcome);
      const storedPdNotes = window.localStorage.getItem(STORAGE_PD_NOTES);
      if (storedPdNotes) setLogNotes(storedPdNotes);
      const storedPrepContact = window.localStorage.getItem(STORAGE_PREP_CONTACT);
      if (storedPrepContact) setPrepContact(storedPrepContact);
      const storedPrepCompany = window.localStorage.getItem(STORAGE_PREP_COMPANY);
      if (storedPrepCompany) setPrepCompany(storedPrepCompany);
      const storedPrepGoal = window.localStorage.getItem(STORAGE_PREP_GOAL);
      if (storedPrepGoal) setPrepGoal(storedPrepGoal);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!callIdTouched && derivedCallId) {
      setMeetCallId(derivedCallId);
    }
  }, [derivedCallId, callIdTouched]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_MEET_LINK, meetLink);
    } catch {
      // ignore
    }
  }, [meetLink]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (meetCallId.trim()) window.localStorage.setItem(STORAGE_MEET_CALL, meetCallId.trim().toUpperCase());
    } catch {
      // ignore
    }
  }, [meetCallId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_SPIN_PROMPTS, JSON.stringify(spinPrompts));
    } catch {
      // ignore
    }
  }, [spinPrompts]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_PD_PERSON, logContactId);
      window.localStorage.setItem(STORAGE_PD_NAME, logContactName);
      window.localStorage.setItem(STORAGE_PD_COMPANY, logCompanyName);
      window.localStorage.setItem(STORAGE_PD_OUTCOME, logDisposition);
      window.localStorage.setItem(STORAGE_PD_NOTES, logNotes);
      window.localStorage.setItem(STORAGE_PREP_CONTACT, prepContact);
      window.localStorage.setItem(STORAGE_PREP_COMPANY, prepCompany);
      window.localStorage.setItem(STORAGE_PREP_GOAL, prepGoal);
    } catch {
      // ignore
    }
  }, [logContactId, logContactName, logCompanyName, logDisposition, logNotes, prepContact, prepCompany, prepGoal]);

  useEffect(() => {
    const unsub = listenToExtension({
      onStatus: (s) => setExtensionStatus(s),
      onMeetCaption: (chunk) => {
        const ts = typeof chunk.captured_at === 'number' ? chunk.captured_at : Date.now();
        setLastCaption(chunk.text);
        setLastCaptionAt(Date.now());
        transcriptRef.current = [...transcriptRef.current, { text: chunk.text, ts }].slice(-24);
        setMeetEvents((prev) => {
          const exists = prev.some((evt) => evt.ts === ts && evt.text === chunk.text);
          if (exists) return prev;
          const next: TranscriptEvent = {
            id: `ext-${ts}-${prev.length}`,
            ts,
            text: chunk.text,
            speaker: chunk.speaker,
          };
          return [...prev, next].slice(-160);
        });
      },
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!meetActive || !meetCallId.trim() || !isSupabaseConfigured) return;
    let mounted = true;

    const fetchTranscript = async () => {
      const since = meetLastTsRef.current;
      const url = buildFunctionUrl(`meet/transcript/${meetCallId.trim().toUpperCase()}${since ? `?since=${since}` : ''}`);
      if (!url) return;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'x-echo-user': meetCallId.trim().toUpperCase(),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: TranscriptEvent[] = data.events || [];
        if (!incoming.length || !mounted) return;
        const last = incoming[incoming.length - 1];
        meetLastTsRef.current = last.ts;
        setMeetEvents((prev) => [...prev, ...incoming].slice(-200));
        incoming.forEach((event) => {
          transcriptRef.current = [...transcriptRef.current, { text: event.text, ts: event.ts }].slice(-24);
        });
        setLastCaption(last.text);
      } catch {
        // ignore polling errors
      }
    };

    const interval = window.setInterval(fetchTranscript, 2000);
    void fetchTranscript();
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [meetActive, meetCallId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [meetEvents]);

  const isCallIdValid = meetCallId.trim().length >= 8;
  const lastCaptionAgo = lastCaptionAt ? Math.round((Date.now() - lastCaptionAt) / 1000) : null;
  const captionStale = lastCaptionAt ? Date.now() - lastCaptionAt > 12000 : false;
  const callIdLooksLikeUrl = /https?:\/\//i.test(meetCallId);
  const connectionStatus = useMemo(() => {
    if (!extensionStatus.connected) {
      return { tone: 'warning', text: 'Extension není připojená k webapp.' };
    }
    if (callIdLooksLikeUrl) {
      return { tone: 'warning', text: 'Call ID je URL. Vlož pouze kód z Google Meet.' };
    }
    if (!isCallIdValid) {
      return { tone: 'warning', text: 'Call ID je neplatné (min. 8 znaků).' };
    }
    if (meetActive && (!meetEvents.length || captionStale)) {
      return { tone: 'warning', text: 'Propojeno, ale nechodí titulky. Zkontroluj CC v Meet.' };
    }
    if (meetActive && meetEvents.length > 0) {
      return { tone: 'success', text: 'Propojeno a titulky běží.' };
    }
    return { tone: 'subtle', text: 'Připrav se na propojení.' };
  }, [extensionStatus.connected, callIdLooksLikeUrl, isCallIdValid, meetActive, meetEvents.length, captionStale]);

  const handleMeetConnect = () => {
    const value = meetCallId.trim().toUpperCase();
    if (!value || value.length < 8) {
      setMeetError('Call ID musí mít alespoň 8 znaků.');
      return;
    }
    setMeetCallId(value);
    setMeetEvents([]);
    meetLastTsRef.current = null;
    setMeetActive(true);
    setMeetError(null);
  };

  const openMeetLink = () => {
    if (typeof window === 'undefined') return;
    if (!meetLink.trim()) return;
    if (import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true') return;
    window.open(meetLink.trim(), '_blank', 'noopener');
  };

  const useDetectedCallId = () => {
    if (!derivedCallId) return;
    setCallIdTouched(true);
    setMeetCallId(derivedCallId);
  };

  const handleMeetStop = () => {
    setMeetActive(false);
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMeetError('Zkopírováno do schránky.');
      window.setTimeout(() => setMeetError(null), 1600);
    } catch {
      setMeetError('Kopírování se nezdařilo.');
    }
  };

  const runCoach = async () => {
    if (!transcriptRef.current.length) {
      setCoachTip('Čekám na titulky z Meet...');
      return;
    }
    const fallbackCoach = () => {
      const lastItem = transcriptRef.current[transcriptRef.current.length - 1];
      const latest = (lastCaption || lastItem?.text || '').toLowerCase();
      if (focusMode === 'closing') {
        return 'Navrhni konkrétní termín a potvrď další krok.';
      }
      if (focusMode === 'objection') {
        if (latest.includes('cena') || latest.includes('budget') || latest.includes('price')) {
          return 'Zeptej se na rámec rozpočtu a ukaž dopad na jejich KPI.';
        }
        if (latest.includes('čas') || latest.includes('timing') || latest.includes('pozd')) {
          return 'Potvrď timing a navrhni konkrétní slot na další krok.';
        }
        if (latest.includes('konkur') || latest.includes('nástroj') || latest.includes('tool')) {
          return 'Zeptej se, co jim současné řešení nedává.';
        }
        return 'Validuj námitku a vrať se k dopadu problému.';
      }
      switch (spinStage) {
        case 'problem':
          return 'Zeptej se na největší bolest a jak často vzniká.';
        case 'implication':
          return 'Dostaň čísla: čas, peníze, riziko dopadu.';
        case 'need_payoff':
          return 'Zeptej se na ideální výsledek a KPI, které chtějí zlepšit.';
        case 'close':
          return 'Požádej o konkrétní termín dalšího kroku.';
        default:
          return 'Získej základní fakta o jejich současném procesu.';
      }
    };

    if (!isSupabaseConfigured) {
      setCoachTip(fallbackCoach());
      setCoachWhisper('Supabase není nastavený — zapni ho pro plné AI coaching.');
      setCoachError('Chybí Supabase konfigurace.');
      setCoachConfidence(null);
      setObjectionPack(null);
      return;
    }

    setAiBusy(true);
    setCoachError(null);
    try {
      const transcriptWindow = transcriptRef.current.slice(-12).map((x) => `prospect: ${x.text}`);
      const dealState = useSpinPrompts ? buildSpinContext(spinPrompts) : '';
      const stage = focusMode === 'closing' ? 'close' : spinStage;
      const objection = focusMode === 'objection' ? (objectionTrigger.trim() || lastCaption || 'objection') : undefined;
      const res = await echoApi.ai.spinNext({
        stage,
        mode: 'live',
        transcriptWindow,
        recap: '',
        dealState,
        strict: true,
        objectionTrigger: objection,
      });
      const output = res?.output || res;
      setCoachTip(output?.say_next || output?.coach_whisper || '(pause)');
      setCoachWhisper(output?.coach_whisper || output?.why || '');
      setCoachConfidence(typeof output?.confidence === 'number' ? output.confidence : null);
      setObjectionPack(res?.agents?.objection || null);
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : 'Coach request failed');
      setCoachTip(fallbackCoach());
      setCoachConfidence(null);
      setObjectionPack(null);
    } finally {
      setAiBusy(false);
    }
  };

  const submitOutcome = async () => {
    const contactId = logContactId.trim();
    if (!contactId) {
      setLogStatus('Zadej Pipedrive Person ID (číselné) nebo Lead ID ve tvaru lead:123.');
      return;
    }
    if (!pipedriveConfigured) {
      setLogStatus('Pipedrive není připojený. Otevři Nastavení → Pipedrive a vlož API key.');
      return;
    }
    setLogSaving(true);
    setLogStatus(null);
    try {
      await echoApi.logCall({
        contactId,
        contactName: logContactName.trim() || undefined,
        companyName: logCompanyName.trim() || undefined,
        disposition: logDisposition,
        notes: logNotes.trim(),
      });
      setLogStatus('Zapsáno do Pipedrive.');
    } catch (e) {
      setLogStatus(e instanceof Error ? e.message : 'Zápis selhal');
    } finally {
      setLogSaving(false);
    }
  };

  const runPrep = async (mode: 'script' | 'research') => {
    setPrepBusy(true);
    setPrepOutput('');
    setPrepStatus(null);
    if (!isSupabaseConfigured) {
      setPrepStatus('Supabase není nastavený. Nastav VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY a redeploy.');
      setPrepBusy(false);
      return;
    }
    try {
      const res = await echoApi.ai.generate({
        contactName: prepContact || 'Prospect',
        company: prepCompany || 'their company',
        goal: prepGoal || 'Book demo',
        type: mode,
        salesStyle: 'consultative',
        contextData: { mode: 'quick_prep' },
      });
      const text = res?.content || res;
      setPrepOutput(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Prep failed';
      setPrepStatus(msg);
      setPrepOutput('Prep failed. Zkontroluj OPENAI_API_KEY v Supabase secrets.');
    } finally {
      setPrepBusy(false);
    }
  };

  useEffect(() => {
    if (!liveCoachingEnabled) return;
    if (!lastCaption) return;
    const now = Date.now();
    if (now - lastCoachAtRef.current < 9000) return;
    lastCoachAtRef.current = now;
    void runCoach();
  }, [lastCaption, liveCoachingEnabled]);

  return (
    <div className="workspace" data-testid="demo-workspace">
      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Google Meet</p>
            <h2>Propojení hovoru</h2>
          </div>
          <span className="pill subtle">{extensionStatus.connected ? 'Ext: zapnuto' : 'Ext: vypnuto'}</span>
        </div>

          <div className={`banner ${connectionStatus.tone}`}>
            {connectionStatus.text}
            {!extensionStatus.connected && (
              <div className="muted text-xs mt-2">
                Jak opravit: otevři `meet.google.com` v aktivní kartě, reloadni stránku a ujisti se, že extension je zapnutá.
              </div>
            )}
            {extensionStatus.connected && meetActive && (!meetEvents.length || captionStale) && (
              <div className="muted text-xs mt-2">
                Jak opravit: zapni v Google Meet titulky (CC). Bez nich nepřijdou data.
              </div>
            )}
            {callIdLooksLikeUrl && (
              <div className="muted text-xs mt-2">
                Příklad správného Call ID: `mse-ebhc-zgp` (bez `https://`).
              </div>
            )}
          </div>
        {lastCaptionAgo !== null && (
          <div className="muted text-xs">Poslední titulek: před {lastCaptionAgo}s</div>
        )}

        <div className="muted text-xs">
          1) Vlož Meet odkaz. 2) Nastav Call ID (stejné v app i v extension). 3) Klikni Propojit.
        </div>

        <div>
          <div className="muted text-xs">Odkaz na Google Meet</div>
          <input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
          <div className="muted text-xs mt-2">
            Detekovaný kód: {derivedCallId || '—'}
          </div>
          {meetLink.trim() && !derivedCallId && (
            <div className="status-line small">Odkaz nevypadá jako Google Meet.</div>
          )}
          <div className="button-row mt-2">
            <button className="btn ghost sm" onClick={openMeetLink} disabled={!canOpenMeet} type="button">
              Otevřít Meet
            </button>
            <button className="btn ghost sm" onClick={useDetectedCallId} disabled={!derivedCallId} type="button">
              Použít kód z odkazu
            </button>
          </div>
        </div>

        <div>
          <div className="muted text-xs">Call ID / Session code (zadej stejné do extension)</div>
          <input
            value={meetCallId}
            onChange={(e) => {
              setCallIdTouched(true);
              setMeetCallId(e.target.value.toUpperCase());
            }}
            placeholder="CALL ID (např. ABCD1234)"
          />
        </div>

        <div className="button-row wrap">
          <button className="btn outline sm" onClick={handleMeetConnect} disabled={!isCallIdValid} type="button">
            <PlayCircle size={14} /> Propojit
          </button>
          <button className="btn ghost sm" onClick={handleMeetStop} disabled={!meetActive} type="button">
            <StopCircle size={14} /> Zastavit
          </button>
          <button className="btn ghost sm" onClick={() => void copyText(meetCallId.trim().toUpperCase())} disabled={!meetCallId.trim()} type="button">
            <Copy size={14} /> Kopírovat Call ID
          </button>
        </div>

        <div className="button-row wrap">
          <button className="btn ghost sm" onClick={() => void copyText(functionsBase)} disabled={!functionsBase} type="button">
            <Copy size={14} /> Kopírovat Endpoint
          </button>
          <button className="btn ghost sm" onClick={() => void copyText(publicAnonKey)} disabled={!publicAnonKey} type="button">
            <Copy size={14} /> Kopírovat Token
          </button>
        </div>

        <div className="muted text-xs break-all">
          Endpoint: {functionsBase || 'Supabase functions endpoint není nastavený.'}
        </div>
        <div className="muted text-xs break-all">
          Auth token: {publicAnonKey ? 'Anon key připravený (vložit do extension Advanced).' : 'Chybí VITE_SUPABASE_ANON_KEY.'}
        </div>
        <div className="muted text-xs">
          Zapni titulky v Meet a do Chrome extension vlož Call ID + Endpoint + Auth token.
        </div>
        {!isSupabaseConfigured && (
          <div className="muted text-xs">
            Supabase není nastavený — coaching poběží z lokálních titulků, feed se neukáže.
          </div>
        )}
        {meetActive && <div className="muted text-xs">Titulky: {meetEvents.length} řádků</div>}
        {meetError && <div className="status-line small">{meetError}</div>}
      </div>

      <div className="panel focus">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Real-time coaching</p>
            <h2>Námitky & Closing</h2>
            <p className="muted">
              Zaměření: {focusMode === 'spin' ? 'SPIN' : focusMode === 'objection' ? 'Námitky' : 'Closing'}
            </p>
          </div>
          <div className="button-row">
            <button className="btn ghost sm" onClick={() => setLiveCoachingEnabled((v) => !v)} type="button">
              {liveCoachingEnabled ? 'Live zapnuto' : 'Live vypnuto'}
            </button>
            <button className="btn outline sm" onClick={() => void runCoach()} disabled={aiBusy} type="button">
              <Sparkles size={14} /> {aiBusy ? 'Přemýšlím…' : 'Tip teď'}
            </button>
            <span className="pill subtle">{aiBusy ? 'Pracuji…' : 'Připraveno'}</span>
          </div>
        </div>

        <div className="coach-box focus">
          <p className="say-next">{coachTip || 'Čekám na titulky z Meet...'}</p>
          {coachWhisper && <p className="muted text-sm mt-2">{coachWhisper}</p>}
          {coachConfidence !== null && (
            <div className="muted text-xs mt-2">Confidence: {Math.round(coachConfidence * 100)}%</div>
          )}
          {coachError && <div className="status-line small">{coachError}</div>}
        </div>

        {focusMode === 'objection' && objectionPack && (
          <div className="coach-box mt-2">
          <div className="muted text-xs">Toolkit námitek</div>
            <p className="say-next">{objectionPack.rebuttal || '—'}</p>
            <p className="muted text-sm mt-2">{objectionPack.redirect_question || ''}</p>
            <p className="muted text-sm mt-1">{objectionPack.close_retry || ''}</p>
          </div>
        )}

        <div className="panel soft mt-3">
          <div className="panel-head tight">
            <span className="eyebrow">Živý přepis</span>
            <span className="pill subtle">{meetEvents.length} řádků</span>
          </div>
          <div ref={listRef} className="list" style={{ maxHeight: 320 }}>
            {meetEvents.length === 0 && <div className="muted text-sm">Čekám na titulky z Meet…</div>}
            {meetEvents.map((evt) => (
              <div key={evt.id} className="list-row">
                <div>
                  <div className="muted text-xs">
                    {evt.speakerName || evt.speaker || 'Speaker'} ·{' '}
                    {new Date(evt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm">{evt.text}</div>
                </div>
              </div>
            ))}
          </div>
          {lastCaption && <div className="muted text-xs mt-2">Poslední: {lastCaption}</div>}
        </div>
      </div>

      <div className="panel stack">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Zaměření</p>
            <h2>SPIN & custom</h2>
          </div>
          <span className={`pill ${pipedriveConfigured ? 'success' : 'warning'}`}>
            {pipedriveConfigured ? 'Pipedrive OK' : 'Pipedrive není připojený'}
          </span>
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Call outcome → Pipedrive</span>
            <span className="pill subtle">Log</span>
          </div>
          <div className="muted text-xs">Pipedrive Person ID (číselné) nebo Lead ID (lead:123)</div>
          <input
            value={logContactId}
            onChange={(e) => setLogContactId(e.target.value)}
            placeholder="např. 1234567"
          />
          <div className="muted text-xs mt-2">Jméno kontaktu (volitelné)</div>
          <input
            value={logContactName}
            onChange={(e) => setLogContactName(e.target.value)}
            placeholder="Jan Novák"
          />
          <div className="muted text-xs mt-2">Firma (volitelné)</div>
          <input
            value={logCompanyName}
            onChange={(e) => setLogCompanyName(e.target.value)}
            placeholder="ACME s.r.o."
          />
          <div className="muted text-xs mt-2">Outcome</div>
          <select value={logDisposition} onChange={(e) => setLogDisposition(e.target.value)}>
            <option value="connected">Connected</option>
            <option value="meeting">Meeting</option>
            <option value="callback">Callback</option>
            <option value="not-interested">Not interested</option>
            <option value="no-answer">No answer</option>
            <option value="sent">Sent email</option>
          </select>
          <div className="muted text-xs mt-2">Poznámky</div>
          <textarea
            className="notes"
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="Stručné poznámky z hovoru…"
          />
          <div className="muted text-xs mt-2">
            Příklad: Person ID najdeš v URL Pipedrive jako `/person/123456`. Lead zapiš jako `lead:123456`.
          </div>
          <div className="button-row mt-2">
            <button className="btn outline sm" onClick={() => void submitOutcome()} disabled={logSaving} type="button">
              {logSaving ? 'Zapisuji…' : 'Zapsat do Pipedrive'}
            </button>
          </div>
          {logStatus && <div className="status-line small">{logStatus}</div>}
        </div>

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Prep & intel</span>
            <span className="pill subtle">AI</span>
          </div>
          <div className="muted text-xs">Kontakt</div>
          <input
            value={prepContact}
            onChange={(e) => setPrepContact(e.target.value)}
            placeholder="Jméno kontaktu"
          />
          <div className="muted text-xs mt-2">Firma</div>
          <input
            value={prepCompany}
            onChange={(e) => setPrepCompany(e.target.value)}
            placeholder="Firma / sektor"
          />
          <div className="muted text-xs mt-2">Cíl hovoru</div>
          <input
            value={prepGoal}
            onChange={(e) => setPrepGoal(e.target.value)}
            placeholder="Např. Book demo"
          />
          <div className="button-row wrap mt-2">
            <button className="btn outline sm" onClick={() => void runPrep('script')} disabled={prepBusy} type="button">
              {prepBusy ? 'Připravuji…' : 'Call opener'}
            </button>
            <button className="btn ghost sm" onClick={() => void runPrep('research')} disabled={prepBusy} type="button">
              Research
            </button>
          </div>
          {prepStatus && <div className="status-line small">{prepStatus}</div>}
          <pre className="output-box">{prepOutput || 'Prep output se zobrazí zde.'}</pre>
          <div className="muted text-xs mt-2">
            Pokud AI neodpovídá: zkontroluj `OPENAI_API_KEY` v Supabase secrets a redeploy edge functions.
          </div>
        </div>

        <div className="button-row wrap">
          <button className={`btn ghost sm ${focusMode === 'spin' ? 'active' : ''}`} onClick={() => setFocusMode('spin')} type="button">
            SPIN
          </button>
          <button className={`btn ghost sm ${focusMode === 'objection' ? 'active' : ''}`} onClick={() => setFocusMode('objection')} type="button">
            Námitky
          </button>
          <button className={`btn ghost sm ${focusMode === 'closing' ? 'active' : ''}`} onClick={() => setFocusMode('closing')} type="button">
            Closing
          </button>
        </div>

        {focusMode === 'spin' && (
          <div className="button-row wrap">
            {(['situation', 'problem', 'implication', 'need_payoff', 'close'] as const).map((stage) => (
              <button
                key={stage}
                className={`btn ghost sm ${spinStage === stage ? 'active' : ''}`}
                onClick={() => setSpinStage(stage)}
                type="button"
              >
                {stage === 'need_payoff' ? 'Need-Payoff' : stage === 'close' ? 'Close' : stage.charAt(0).toUpperCase() + stage.slice(1)}
              </button>
            ))}
          </div>
        )}

        {focusMode === 'objection' && (
          <div>
            <div className="muted text-xs">Námitka (volitelné)</div>
            <input
              value={objectionTrigger}
              onChange={(e) => setObjectionTrigger(e.target.value)}
              placeholder="Např. cena, timing, konkurence..."
            />
          </div>
        )}

        {focusMode === 'closing' && (
          <div className="muted text-xs">
            Closing režim používá stage „Close“ a tlačí na konkrétní slot/next step.
          </div>
        )}

        <div className="panel soft">
          <div className="panel-head tight">
            <span className="eyebrow">Custom SPIN dotazy</span>
            <button className="btn ghost sm" onClick={() => setUseSpinPrompts((v) => !v)} type="button">
              {useSpinPrompts ? 'Vypnout' : 'Zapnout'}
            </button>
          </div>

          <div className="muted text-xs">Situation otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.situation}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, situation: e.target.value }))}
            placeholder="Jaký je váš current stack? Kdy plánujete změnu?"
          />

          <div className="muted text-xs mt-2">Problem otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.problem}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, problem: e.target.value }))}
            placeholder="Co vám dneska nejvíc komplikuje X?"
          />

          <div className="muted text-xs mt-2">Implication otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.implication}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, implication: e.target.value }))}
            placeholder="Co se stane, když to zůstane stejně další 3 měsíce?"
          />

          <div className="muted text-xs mt-2">Need-Payoff otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.needPayoff}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, needPayoff: e.target.value }))}
            placeholder="Jaký dopad by mělo, kdybychom to vyřešili?"
          />

          <div className="muted text-xs mt-2">Closing otázky</div>
          <textarea
            className="notes"
            value={spinPrompts.closing}
            onChange={(e) => setSpinPrompts((prev) => ({ ...prev, closing: e.target.value }))}
            placeholder="Můžeme si rovnou dát demo ve čtvrtek v 10:00?"
          />
        </div>
      </div>
    </div>
  );
}
