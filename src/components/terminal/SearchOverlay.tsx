import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Contact } from '../../contexts/SalesContext';

const match = (q: string, text: string) => text.toLowerCase().includes(q.toLowerCase());

export function SearchOverlay({
  open,
  onOpenChange,
  contacts,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onPick: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return contacts.slice(0, 20);
    const filtered = contacts.filter((c) => {
      const hay = `${c.name} ${c.company || ''} ${c.title || ''}`.trim();
      return match(q, hay);
    });
    return filtered.slice(0, 20);
  }, [contacts, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(results.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        const picked = results[activeIndex];
        if (!picked) return;
        e.preventDefault();
        onPick(picked.id);
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, results, activeIndex, onOpenChange, onPick]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div className="panel modal-card" role="dialog" aria-modal="true" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-head tight">
          <div className="search-head">
            <Search size={16} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Hledej lead (jméno / firma / role)…"
              aria-label="Search leads"
            />
          </div>
          <button className="btn ghost sm" onClick={() => onOpenChange(false)} type="button">
            Esc
          </button>
        </div>

        <div className="list" style={{ maxHeight: 420 }}>
          {results.length === 0 && <div className="muted">Nic nenalezeno.</div>}
          {results.map((c, idx) => (
            <button
              key={c.id}
              className={`list-row ${idx === activeIndex ? 'active' : ''}`}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                onPick(c.id);
                onOpenChange(false);
              }}
            >
              <div>
                <div className="item-title">{c.company ? `${c.company}` : '—'}</div>
                <div className="muted text-sm">
                  {c.name}
                  {c.title ? ` · ${c.title}` : ''}
                </div>
              </div>
              <span className="pill subtle">{idx === activeIndex ? 'Enter' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

