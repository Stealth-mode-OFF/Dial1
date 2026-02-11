import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CallOutcome, Contact } from '../types';

export function LeadSidebar({
  contacts,
  activeIndex,
  completedOutcomes,
  onSelect,
}: {
  contacts: Contact[];
  activeIndex: number;
  completedOutcomes: Record<string, CallOutcome>;
  onSelect: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const doneCount = contacts.filter((c) => c.id in completedOutcomes).length;
  const connectedCount = contacts.filter(
    (c) => completedOutcomes[c.id] === 'connected' || completedOutcomes[c.id] === 'meeting',
  ).length;

  useEffect(() => {
    if (open && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open, activeIndex]);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 300);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <>
      <div className="sidebar-trigger" onMouseEnter={handleMouseEnter} />
      <div
        className={`lead-sidebar ${open ? 'open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-header">
          <span className="sidebar-title">
            Leadů {doneCount}/{contacts.length}
          </span>
          <span className="sidebar-subtitle">{connectedCount} dovoláno</span>
        </div>
        <div className="sidebar-list">
          {contacts.map((c, i) => {
            const outcome = completedOutcomes[c.id];
            const stateClass = outcome ? (outcome === 'no-answer' ? 'missed' : 'reached') : '';
            return (
              <button
                key={c.id}
                ref={i === activeIndex ? activeItemRef : undefined}
                className={`sidebar-lead ${i === activeIndex ? 'active' : ''} ${stateClass}`}
                onClick={() => onSelect(i)}
              >
                <span className="sidebar-lead-indicator">
                  {outcome ? outcome === 'no-answer' ? '✗' : '✓' : i === activeIndex ? '▸' : '○'}
                </span>
                <span className="sidebar-lead-info">
                  <span className="sidebar-lead-name">{c.name}</span>
                  <span className="sidebar-lead-company">{c.company}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

