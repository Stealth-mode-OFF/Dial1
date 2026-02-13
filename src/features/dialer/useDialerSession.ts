// ═══════════════════════════════════════════════════════════════
// useDialerSession — session state, contact navigation, stats
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { AppPhase, CallOutcome, Contact, Session } from "./types";
import { loadSession, saveSession } from "./sessionStorage";

export function useDialerSession(contacts: Contact[]) {
  const [session, setSession] = useState<Session>(loadSession);

  const [activeIndex, setActiveIndex] = useState(() => {
    const s = loadSession();
    const completed = s.completedOutcomes;
    if (!Object.keys(completed).length) return s.currentIndex || 0;
    // Start at first uncalled contact
    const firstUncalled = contacts.findIndex((c) => !(c.id in completed));
    return firstUncalled >= 0 ? firstUncalled : s.currentIndex || 0;
  });

  const [phase, setPhase] = useState<AppPhase>("ready");

  const contact = contacts[activeIndex] || null;

  // Persist session to localStorage
  useEffect(() => {
    saveSession({ ...session, currentIndex: activeIndex });
  }, [session, activeIndex]);

  // When contacts load, jump to first uncalled
  const prevContactsLenRef = useRef(contacts.length);
  useEffect(() => {
    if (phase !== "ready") return;
    if (contacts.length === prevContactsLenRef.current) return;
    prevContactsLenRef.current = contacts.length;
    if (!contacts.length) return;
    const firstUncalled = contacts.findIndex(
      (c) => !(c.id in session.completedOutcomes),
    );
    if (firstUncalled >= 0) setActiveIndex(firstUncalled);
  }, [contacts, session.completedOutcomes, phase]);

  // Navigate to next uncalled contact
  const nextContact = useCallback(() => {
    setActiveIndex((current) => {
      for (let i = current + 1; i < contacts.length; i++) {
        if (!(contacts[i].id in session.completedOutcomes)) return i;
      }
      return Math.min(current + 1, contacts.length - 1);
    });
  }, [contacts, session.completedOutcomes]);

  // Update session stats for a completed call
  const recordCall = useCallback(
    (
      contactId: string,
      outcome: CallOutcome,
      duration: number,
      notes: string,
    ) => {
      setSession((s) => ({
        ...s,
        stats: {
          calls: s.stats.calls + 1,
          talkTime: s.stats.talkTime + duration,
          connected:
            outcome === "connected" || outcome === "meeting"
              ? s.stats.connected + 1
              : s.stats.connected,
          meetings:
            outcome === "meeting" ? s.stats.meetings + 1 : s.stats.meetings,
        },
        notesByContact: { ...s.notesByContact, [contactId]: notes },
        completedOutcomes: { ...s.completedOutcomes, [contactId]: outcome },
      }));
    },
    [],
  );

  // Increment meeting count (e.g. from wrapup booking)
  const recordMeetingBooked = useCallback(() => {
    setSession((s) => ({
      ...s,
      stats: { ...s.stats, meetings: s.stats.meetings + 1 },
    }));
  }, []);

  // Read notes for current contact
  const contactNotes = useMemo(
    () => (contact ? session.notesByContact[contact.id] || "" : ""),
    [contact, session.notesByContact],
  );

  const contactDomain = useMemo(
    () => (contact ? session.domainByContact?.[contact.id] || "" : ""),
    [contact, session.domainByContact],
  );

  return {
    session,
    setSession,
    phase,
    setPhase,
    activeIndex,
    setActiveIndex,
    contact,
    contacts,
    nextContact,
    recordCall,
    recordMeetingBooked,
    contactNotes,
    contactDomain,
  };
}
