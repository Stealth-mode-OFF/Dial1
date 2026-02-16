import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

import { useSales } from './contexts/SalesContext';
import { echoApi } from './utils/echoApi';
import { isSupabaseConfigured } from './utils/supabase/info';
import { useBrief } from './hooks/useBrief';
import { useBatchBriefs } from './hooks/useBatchBriefs';
import { inferDomainFromEmail, normalizeCompanyDomain } from './utils/domain';
import { formatTime, outcomeLabel } from './features/dialer/helpers';
import type { AppPhase, CallOutcome, Contact, Session } from './features/dialer/types';
import { loadSession, saveSession } from './features/dialer/sessionStorage';
import { FloatingWhisper } from './features/dialer/components/FloatingWhisper';
import { LeadSidebar } from './features/dialer/components/LeadSidebar';
import { SettingsOverlay } from './features/dialer/components/SettingsOverlay';
import { CallingPhase } from './components/dial/CallingPhase';
import { EmptyState } from './components/dial/EmptyState';
import { ReadyPhase } from './components/dial/ReadyPhase';
import { WrapupConnectedCard } from './components/dial/WrapupConnectedCard';
import { WrapupNoAnswerOverlay } from './components/dial/WrapupNoAnswerOverlay';

const SCHEDULER_URL = 'https://behavera.pipedrive.com/scheduler/GX27Q8iw/konzultace-jak-ziskat-jasna-data-o-svem-tymu-30-minutes';

// (Types/utilities/components extracted to src/features/dialer)
export function DialerApp() {
  const { contacts: salesContacts, isLoading, pipedriveConfigured, error: salesError, refresh } = useSales();
  const { progress: batchProgress, preload: batchPreload, skip: skipPreload, briefsByContactId } = useBatchBriefs();

  const contacts: Contact[] = useMemo(() => {
    if (!salesContacts?.length) return [];
    return salesContacts.map((c) => ({
      id: c.id,
      name: c.name || 'Neznámý',
      company: c.company || '',
      phone: c.phone || '',
      email: c.email || undefined,
      title: c.title,
      status: (c.status as Contact['status']) || 'new',
      priority: c.score && c.score > 70 ? 'high' : c.score && c.score > 40 ? 'medium' : 'low',
      orgId: c.orgId ?? undefined,
      website: undefined,
    }));
  }, [salesContacts]);

  const [session, setSession] = useState<Session>(loadSession);
  const [activeIndex, setActiveIndex] = useState(() => {
    const s = loadSession();
    if (!Object.keys(s.completedOutcomes).length) return s.currentIndex || 0;
    if (salesContacts?.length) {
      const mapped = salesContacts.map((c) => c.id);
      const firstUncalled = mapped.findIndex((id) => !(id in s.completedOutcomes));
      if (firstUncalled >= 0) return firstUncalled;
    }
    return s.currentIndex || 0;
  });

  const [phase, setPhase] = useState<AppPhase>('ready');
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [wrapupOutcome, setWrapupOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoDialCountdown, setAutoDialCountdown] = useState(0);
  const [autoDialQueued, setAutoDialQueued] = useState(false);
  const autoDialTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [smsTemplate, setSmsTemplate] = useState(() => (
    localStorage.getItem('dial1.smsTemplate')
      || 'Dobrý den, zkoušel/a jsem Vás zastihnout telefonicky. Rád/a bych s Vámi probral/a možnou spolupráci. Můžeme se spojit?'
  ));

  const [aiQualAnswers, setAiQualAnswers] = useState<string[]>(['', '', '']);
  const [crmSaving, setCrmSaving] = useState(false);
  const [crmResult, setCrmResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);

  const contact = contacts[activeIndex] || null;
  const externalNavDisabled = import.meta.env.VITE_E2E_DISABLE_EXTERNAL_NAV === 'true';

  const { brief, script: aiScript, loading: briefLoading, error: briefError, generate: generateBrief, clear: clearBrief } = useBrief();
  const [companyDomain, setCompanyDomain] = useState('');

  const updateQualAnswer = useCallback((index: number, value: string) => {
    setAiQualAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!callStart) return;
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [callStart]);

  const prevContactsLenRef = useRef(contacts.length);
  const lastPreloadCountRef = useRef(0);
  useEffect(() => {
    if (phase !== 'ready') return;
    if (contacts.length === prevContactsLenRef.current) return;
    prevContactsLenRef.current = contacts.length;
    if (!contacts.length) return;
    const firstUncalled = contacts.findIndex((c) => !(c.id in session.completedOutcomes));
    if (firstUncalled >= 0) {
      setActiveIndex(firstUncalled);
    }
  }, [contacts, session.completedOutcomes, phase]);

  useEffect(() => {
    if (!contacts.length) return;
    if (!isSupabaseConfigured) return;
    if (!batchProgress.done) return;
    if (contacts.length === lastPreloadCountRef.current) return;
    lastPreloadCountRef.current = contacts.length;
    batchPreload(contacts);
  }, [contacts, batchProgress.done, batchPreload, isSupabaseConfigured]);

  useEffect(() => {
    try { localStorage.setItem('dial1.smsTemplate', smsTemplate); } catch {}
  }, [smsTemplate]);

  useEffect(() => { saveSession({ ...session, currentIndex: activeIndex }); }, [session, activeIndex]);

  useEffect(() => {
    if (contact) {
      setNotes(session.notesByContact[contact.id] || '');
      const fromSession = session.domainByContact?.[contact.id] || '';
      const inferred = inferDomainFromEmail(contact.email) || normalizeCompanyDomain(contact.website || '');
      const nextDomain = normalizeCompanyDomain(fromSession || inferred);
      setCompanyDomain(nextDomain);
      clearBrief();
      setAiQualAnswers(['', '', '']);
      setCrmSaving(false);
      setCrmResult(null);
      setShowScheduler(false);
      setWrapupOutcome(null);
      setPhase('ready');
      setCallDuration(0);
      setAutoDialCountdown(0);
      setAutoDialQueued(false);
      if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
    }
  }, [contact?.id, session.domainByContact, session.notesByContact, clearBrief]);

  useEffect(() => () => {
    if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
  }, []);

  useEffect(() => {
    if (!contact) return;
    const domain = normalizeCompanyDomain(companyDomain);
    if (!domain) return;
    if (!isSupabaseConfigured) return;
    generateBrief(
      {
        domain,
        personName: contact.name,
        role: contact.title || 'Neznámá role',
        notes: contact.notes || '',
      },
      false,
    );
  }, [contact?.id, companyDomain, generateBrief]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      await refresh();
    } catch (e) {
      console.error('Import failed:', e);
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  const startCall = useCallback(() => {
    if (!contact) return;
    setPhase('calling');
    setCallStart(Date.now());
    setSession((s) => ({ ...s, stats: { ...s.stats, calls: s.stats.calls + 1 } }));
    if (!externalNavDisabled) {
      window.location.href = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
    }
  }, [contact, externalNavDisabled]);

  const endCall = useCallback((outcome: CallOutcome) => {
    if (!contact) return;
    const dur = callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
    setWrapupOutcome(outcome);
    setSession((s) => ({
      ...s,
      stats: {
        ...s.stats,
        talkTime: s.stats.talkTime + dur,
        connected: outcome === 'connected' || outcome === 'meeting' ? s.stats.connected + 1 : s.stats.connected,
        meetings: outcome === 'meeting' ? s.stats.meetings + 1 : s.stats.meetings,
      },
      notesByContact: { ...s.notesByContact, [contact.id]: notes },
      completedOutcomes: { ...s.completedOutcomes, [contact.id]: outcome },
    }));
    setCallStart(null);
    setCallDuration(dur);
    setPhase('wrapup');

    // Celebration for meetings
    if (outcome === 'meeting') {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1500);
    }

    if (isSupabaseConfigured) {
      echoApi.logCall({
        contactId: contact.id,
        contactName: contact.name,
        companyName: contact.company,
        disposition: outcome,
        notes: notes || (outcome === 'no-answer' ? 'Nedovoláno' : outcome === 'meeting' ? 'Demo domluveno' : 'Dovoláno'),
        duration: dur,
      }).catch((err) => console.error('Auto-log to Pipedrive failed:', err));
    }

    if (outcome === 'no-answer') {
      if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
      setAutoDialCountdown(3);
      autoDialTimerRef.current = setInterval(() => {
        setAutoDialCountdown((prev) => {
          if (prev <= 1) {
            if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
            setAutoDialQueued(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [callStart, contact, notes, isSupabaseConfigured]);

  const nextContact = useCallback(() => {
    setActiveIndex((current) => {
      for (let i = current + 1; i < contacts.length; i++) {
        if (!(contacts[i].id in session.completedOutcomes)) return i;
      }
      return Math.min(current + 1, contacts.length - 1);
    });
  }, [contacts, session.completedOutcomes]);

  const handleWrapupDone = useCallback((booked: boolean) => {
    if (booked && contact) {
      setSession((s) => ({
        ...s,
        stats: { ...s.stats, meetings: s.stats.meetings + 1 },
      }));
    }
    nextContact();
  }, [contact, nextContact]);

  const saveWrapupAndNext = useCallback(async () => {
    if (!contact) return;
    if (wrapupOutcome === 'no-answer') return;
    if (!isSupabaseConfigured) {
      setCrmResult({ ok: false, message: 'Supabase není nakonfigurovaný.' });
      return;
    }
    setCrmSaving(true);
    setCrmResult(null);
    try {
      let personId: number | undefined = undefined;
      try {
        const ctx = await echoApi.precall.context({
          contact_id: contact.id,
          include: [],
          ttl_hours: 24,
          timeline: { activities: 0, notes: 0, deals: 0 },
        });
        personId = ctx?.pipedrive?.person_id ?? undefined;
      } catch {
        personId = undefined;
      }

      if (!personId && !contact.orgId) {
        throw new Error('Chybí vazba do Pipedrive (personId/orgId).');
      }

      const lines: string[] = [];
      lines.push('<b>📞 Hovor</b>');
      lines.push(`Klient: <b>${contact.name}</b> (${contact.title || '—'}) – <b>${contact.company}</b>`);
      lines.push(`Výsledek: <b>${outcomeLabel(wrapupOutcome)}</b>`);
      lines.push(`Délka: <b>${formatTime(callDuration)}</b>`);
      const qa = aiQualAnswers
        .filter(Boolean)
        .slice(0, 3)
        .map((a, idx) => `• Q${idx + 1}: ${a}`)
        .join('<br>');
      if (qa) lines.push(`<br><b>Kvalifikace:</b><br>${qa}`);
      if (notes?.trim()) lines.push(`<br><b>Poznámky:</b><br>${notes.trim()}`);
      const content = lines.join('<br>');

      const res = await echoApi.addPipedriveNote({
        personId,
        orgId: contact.orgId,
        content,
      });

      setCrmResult({ ok: Boolean(res?.success), message: res?.success ? 'Uloženo do Pipedrive.' : 'Nepodařilo se uložit do Pipedrive.' });
    } catch (e) {
      setCrmResult({ ok: false, message: e instanceof Error ? e.message : 'Uložení do CRM selhalo' });
    } finally {
      setCrmSaving(false);
    }

    setTimeout(() => {
      handleWrapupDone(wrapupOutcome === 'meeting');
    }, 800);
  }, [aiQualAnswers, callDuration, contact, handleWrapupDone, isSupabaseConfigured, notes, wrapupOutcome]);

  const pauseAutoDial = useCallback(() => {
    if (autoDialTimerRef.current) clearInterval(autoDialTimerRef.current);
    setAutoDialCountdown(0);
  }, []);

  useEffect(() => {
    if (!autoDialQueued) return;
    setAutoDialQueued(false);
    nextContact();
    setTimeout(() => {
      startCall();
    }, 600);
  }, [autoDialQueued, nextContact, startCall]);

  const getSmsUrl = useCallback(() => {
    if (!contact?.phone) return '';
    const phone = contact.phone.replace(/[^\d+]/g, '');
    if (!phone) return '';
    return `sms:${phone}?body=${encodeURIComponent(smsTemplate)}`;
  }, [contact?.phone, smsTemplate]);

  const sendSms = useCallback(() => {
    const url = getSmsUrl();
    if (!url) return;
    pauseAutoDial();
    window.location.href = url;
  }, [getSmsUrl, pauseAutoDial]);

  const handleAutoDialNext = useCallback(() => {
    pauseAutoDial();
    nextContact();
    setTimeout(() => {
      startCall();
    }, 600);
  }, [pauseAutoDial, nextContact, startCall]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'c' && phase === 'ready') { e.preventDefault(); startCall(); }
      if (phase === 'calling') {
        if (e.key === '1') { e.preventDefault(); endCall('no-answer'); }
        if (e.key === '2') { e.preventDefault(); endCall('connected'); }
        if (e.key === '3') { e.preventDefault(); endCall('meeting'); }
      }
      if (phase === 'wrapup' && wrapupOutcome === 'no-answer') {
        if (e.key === ' ') { e.preventDefault(); pauseAutoDial(); }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); sendSms(); }
        if (e.key === 'Enter') { e.preventDefault(); handleAutoDialNext(); }
      }
      if (phase === 'wrapup' && wrapupOutcome !== 'no-answer') {
        if (e.key === 'Enter') { e.preventDefault(); saveWrapupAndNext(); }
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, contacts.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contacts.length, endCall, handleAutoDialNext, pauseAutoDial, phase, saveWrapupAndNext, sendSms, startCall, wrapupOutcome]);

  const displayBrief = contact ? (briefsByContactId[contact.id] || brief) : null;
  const openingText = aiScript?.openingVariants?.[0]?.text || null;
  const qualQuestions = (aiScript?.qualification || [
    { question: 'Kolik zaměstnanců máte?' },
    { question: 'Jaký problém aktuálně řešíte?' },
    { question: 'Kdo rozhoduje o nákupu?' },
  ]).slice(0, 3);

  // Momentum: compute current streak of completed calls
  const completedIds = Object.keys(session.completedOutcomes);
  const connectedCount = contacts.filter((c) => session.completedOutcomes[c.id] === 'connected' || session.completedOutcomes[c.id] === 'meeting').length;
  const progressPct = contacts.length > 0 ? Math.round((completedIds.length / contacts.length) * 100) : 0;

  // Streak: count consecutive calls from the end
  let streak = 0;
  for (let i = contacts.length - 1; i >= 0; i--) {
    if (contacts[i].id in session.completedOutcomes) { streak++; } else { break; }
  }
  // Actually count from current position backwards
  streak = 0;
  for (let i = activeIndex - 1; i >= 0; i--) {
    if (contacts[i]?.id && contacts[i].id in session.completedOutcomes) { streak++; } else { break; }
  }

  return (
    <div className="dialer-v2" data-testid="dialer-app">
      <header className="header-v2">
        <div className="header-v2-left">
          <button onClick={() => setShowSettings(true)} className="header-btn">⚙ Nastavení</button>
        </div>

        <div className="header-v2-stats">
          <span className="wow-stat">
            <span className="wow-stat-num">{completedIds.length}</span>
            <span className="wow-stat-label">/{contacts.length}</span>
          </span>
          <span className="wow-stat-divider" />
          <span className="wow-stat" title="Spojeno">
            <span className="wow-stat-icon">✅</span>
            <span className="wow-stat-num">{connectedCount}</span>
          </span>
          <span className="wow-stat" title="Schůzky">
            <span className="wow-stat-icon">📅</span>
            <span className="wow-stat-num">{session.stats.meetings}</span>
          </span>
          <span className="wow-stat" title="Čas na telefonu">
            <span className="wow-stat-icon">⏱️</span>
            <span className="wow-stat-num">{formatTime(session.stats.talkTime)}</span>
          </span>
          {streak >= 3 && (
            <span className="wow-streak" title="Streak!">
              🔥 {streak}
            </span>
          )}
        </div>

        <div className="header-v2-right">
          <button
            onClick={handleImport}
            disabled={importing || !pipedriveConfigured}
            className="header-btn header-btn-import"
          >
            {importing ? '...' : '↓ Import'}
          </button>
        </div>
      </header>

      {contacts.length > 0 && (
        <div className="seq-progress-bar">
          <span className="seq-progress-label">
            {progressPct}%
          </span>
          <div className="seq-progress-track">
            <div
              className="seq-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="seq-progress-stats">
            <span>{session.stats.calls} hovorů</span>
            <span>{connectedCount} spojeno</span>
          </div>
        </div>
      )}

      {!batchProgress.done && (
        <div className="seq-preload-overlay">
          <div className="seq-preload-card">
            <h3>⏳ Připravuji AI briefy</h3>
            <p>{batchProgress.loaded}/{batchProgress.total} leadů</p>
            <div className="seq-preload-track">
              <div
                className="seq-preload-fill"
                style={{ width: `${Math.round((batchProgress.loaded / Math.max(1, batchProgress.total)) * 100)}%` }}
              />
            </div>
            <button className="seq-preload-skip" onClick={skipPreload}>
              Přeskočit, volat hned →
            </button>
          </div>
        </div>
      )}

      <main className="main-v2">
        {isLoading ? (
          <div className="loading">Načítám…</div>
        ) : !contact ? (
          <EmptyState
            importing={importing}
            pipedriveConfigured={pipedriveConfigured}
            error={salesError}
            onImport={handleImport}
            onShowSettings={() => setShowSettings(true)}
          />
        ) : phase === 'ready' ? (
          <ReadyPhase
            contact={contact}
            displayBrief={displayBrief}
            briefLoading={briefLoading}
            briefError={briefError}
            openingText={openingText}
            onCall={startCall}
            onSkip={nextContact}
          />
        ) : phase === 'calling' ? (
          <>
            <CallingPhase
              contact={contact}
              callDuration={callDuration}
              aiQualAnswers={aiQualAnswers}
              notes={notes}
              onAnswerChange={updateQualAnswer}
              onNotesChange={setNotes}
              onEndCall={endCall}
            />
            <FloatingWhisper />
          </>
        ) : wrapupOutcome === 'no-answer' ? (
          <WrapupNoAnswerOverlay
            contact={contact}
            autoDialCountdown={autoDialCountdown}
            smsUrl={getSmsUrl()}
            onSendSms={sendSms}
            onPauseAutoDial={pauseAutoDial}
            onAutoDialNext={handleAutoDialNext}
          />
        ) : (
          <div className="seq-wrapup">
            {showScheduler ? (
              <div className="scheduler-embed">
                <div className="scheduler-header">
                  <h3>📅 Naplánuj demo</h3>
                  <button className="scheduler-close" onClick={() => setShowScheduler(false)}>✕ Zavřít</button>
                </div>
                <iframe
                  src={SCHEDULER_URL}
                  className="scheduler-iframe"
                  title="Pipedrive Scheduler"
                  allow="payment"
                />
              </div>
            ) : (
              <WrapupConnectedCard
                contact={contact}
                wrapupOutcome={wrapupOutcome || 'connected'}
                callDuration={callDuration}
                questions={qualQuestions}
                aiQualAnswers={aiQualAnswers}
                notes={notes}
                crmSaving={crmSaving}
                crmResult={crmResult}
                isSupabaseConfigured={isSupabaseConfigured}
                onAnswerChange={updateQualAnswer}
                onNotesChange={setNotes}
                onSave={saveWrapupAndNext}
                onShowScheduler={() => setShowScheduler(true)}
              />
            )}
          </div>
        )}
      </main>

      {contacts.length > 0 && (
        <LeadSidebar
          contacts={contacts}
          activeIndex={activeIndex}
          completedOutcomes={session.completedOutcomes}
          onSelect={setActiveIndex}
        />
      )}

      <AnimatePresence>
        {showSettings && (
          <SettingsOverlay
            open={showSettings}
            onClose={() => setShowSettings(false)}
            smsTemplate={smsTemplate}
            onSmsTemplateChange={setSmsTemplate}
          />
        )}
      </AnimatePresence>

      {showCelebration && (
        <div className="wow-celebrate">
          <div className="wow-celebrate-text">🎉 Demo!</div>
        </div>
      )}
    </div>
  );
}

export default DialerApp;
