import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookDemoWorkspace, type ScreenChrome } from './pages/BookDemoWorkspace';
import { DemoWorkspace } from './pages/DemoWorkspace';
import { HelpOverlay } from './components/terminal/HelpOverlay';
import { SearchOverlay } from './components/terminal/SearchOverlay';
import { TerminalShell, type ShellView, type StatusPill } from './components/terminal/TerminalShell';
import { useSales } from './contexts/SalesContext';
import type { HotkeyHandler } from './hooks/useHotkeys';
import { useHotkeys } from './hooks/useHotkeys';

export default function App() {
  const { contacts, setActiveContactId } = useSales();
  const [view, setView] = useState<ShellView>('lead');
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [status, setStatus] = useState<StatusPill | null>(null);
  const [topbarAccessory, setTopbarAccessory] = useState<React.ReactNode | null>(null);
  const [bottomBar, setBottomBar] = useState<React.ReactNode | null>(null);

  const screenHotkeysRef = useRef<HotkeyHandler>(() => false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'default');
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setHelpOpen(false);
    screenHotkeysRef.current = () => false;
  }, [view]);

  useHotkeys(
    (e) => {
      const key = (e.key || '').toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && key === 'k') {
        setSearchOpen(true);
        return true;
      }
      if (e.shiftKey && key === '/') {
        setHelpOpen(true);
        return true;
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          return true;
        }
        if (helpOpen) {
          setHelpOpen(false);
          return true;
        }
        return false;
      }
      if (searchOpen || helpOpen) return false;
      return screenHotkeysRef.current(e);
    },
    [searchOpen, helpOpen, view],
  );

  const title = useMemo(() => (view === 'lead' ? 'Lead Brief' : 'Live Call Coach'), [view]);
  const subtitle = useMemo(
    () =>
      view === 'lead'
        ? 'Jeden lead. Hotové intel + skript. Bez šumu.'
        : 'Google Meet titulky → jedna další věta + SPIN runbook.',
    [view],
  );

  const chrome: ScreenChrome = useMemo(
    () => ({
      overlayOpen: searchOpen || helpOpen,
      setStatus,
      setTopbarAccessory,
      setBottomBar,
      registerHotkeys: (handler: HotkeyHandler) => {
        screenHotkeysRef.current = handler;
      },
    }),
    [searchOpen, helpOpen],
  );

  return (
    <>
      <TerminalShell
        view={view}
        onViewChange={setView}
        title={title}
        subtitle={subtitle}
        status={status}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        topbarAccessory={topbarAccessory}
        bottomBar={bottomBar}
      >
        {view === 'lead' && <BookDemoWorkspace chrome={chrome} />}
        {view === 'call' && <DemoWorkspace chrome={chrome} />}
      </TerminalShell>

      <SearchOverlay
        open={searchOpen}
        onOpenChange={setSearchOpen}
        contacts={contacts}
        onPick={(id) => setActiveContactId(id)}
      />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
