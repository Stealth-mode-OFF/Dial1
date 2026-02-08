import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Maximize2, Minimize2, Trash2, X } from "lucide-react";
import { BATTLECARDS, HOTKEYS_1_TO_9, type Battlecard } from "../meetcoach/battlecards";
import { pickTopMatches, type FeedLine, normalizeForMatch } from "../meetcoach/engine";

type IncomingCaption = {
  ts: number;
  text: string;
  speakerName?: string | null;
};

function fmtAge(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

function makeId(ts: number, text: string, speakerName?: string | null) {
  const base = `${ts}|${speakerName || ""}|${text}`;
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cap_${(h >>> 0).toString(16)}`;
}

function inTextInput(el: Element | null): boolean {
  if (!el) return false;
  const t = (el as HTMLElement).tagName?.toLowerCase();
  if (t === "input" || t === "textarea" || t === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

export function MeetCaptionsPanel() {
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);
  const [bridgeReadyAt, setBridgeReadyAt] = useState<number | null>(null);
  const [cooldownUntilByKey, setCooldownUntilByKey] = useState<Record<string, number | undefined>>({});

  const [focusMode, setFocusMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("echo_meetcoach_focus_mode") === "1";
    } catch {
      return false;
    }
  });

  const [manualLine, setManualLine] = useState("");
  const [search, setSearch] = useState("");
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

  const recentIdsRef = useRef<string[]>([]);
  const recentIdSetRef = useRef<Set<string>>(new Set());
  const focusScrollRef = useRef<HTMLDivElement | null>(null);

  const now = Date.now();
  const captionsAgeMs = lastCaptionAt ? now - lastCaptionAt : null;
  const bridgeAgeMs = bridgeReadyAt ? now - bridgeReadyAt : null;

  const captionsConnected = captionsAgeMs != null && captionsAgeMs <= 10_000;
  const captionsWaiting = lastCaptionAt == null;
  const bridgeConnected = bridgeAgeMs != null && bridgeAgeMs <= 60_000;

  const matches = useMemo(() => {
    return pickTopMatches(feed, {
      windowMs: 40_000,
      now,
      cooldownUntilByKey,
    });
  }, [feed, now, cooldownUntilByKey]);

  const suggestedCard = matches.best?.card || null;
  const altCard = matches.alt?.card || null;

  const activeCard: Battlecard | null = useMemo(() => {
    if (!activeCardKey) return suggestedCard;
    return BATTLECARDS.find((c) => c.key === activeCardKey) || suggestedCard;
  }, [activeCardKey, suggestedCard]);

  function addCooldown(key: string, seconds: number) {
    const until = Date.now() + seconds * 1000;
    setCooldownUntilByKey((prev) => ({ ...prev, [key]: until }));
  }

  function handleIncomingCaption(payload: IncomingCaption) {
    const text = (payload.text || "").toString().trim();
    if (!text) return;
    const ts = typeof payload.ts === "number" ? payload.ts : Date.now();
    const speakerName = payload.speakerName || null;

    const id = makeId(ts, text, speakerName);
    if (recentIdSetRef.current.has(id)) return;

    recentIdsRef.current.push(id);
    recentIdSetRef.current.add(id);
    while (recentIdsRef.current.length > 50) {
      const old = recentIdsRef.current.shift();
      if (old) recentIdSetRef.current.delete(old);
    }

    setLastCaptionAt(Date.now());
    setFeed((prev) => {
      const next = [...prev, { id, ts, text, speakerName }];
      const cutoff = Date.now() - 90_000;
      return next.filter((l) => l.ts >= cutoff).slice(-50);
    });
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as any;
      if (!data || typeof data !== "object") return;
      if (data.source !== "echo-meet-coach") return;

      if (data.type === "BRIDGE_READY") {
        setBridgeReadyAt(Date.now());
        return;
      }

      if (data.type === "MEET_CAPTION" && data.payload) {
        handleIncomingCaption(data.payload as IncomingCaption);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inTextInput(document.activeElement)) return;

      if (e.key === "Escape") {
        setFocusMode(false);
        e.preventDefault();
        return;
      }

      if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1;
        const key = HOTKEYS_1_TO_9[idx];
        const card = BATTLECARDS.find((c) => c.key === key);
        if (!card) return;
        setActiveCardKey(card.key);
        addCooldown(card.key, 75);
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === "c") {
        setFeed([]);
        setLastCaptionAt(null);
        e.preventDefault();
      }

      if (e.key.toLowerCase() === "f") {
        setFocusMode((v) => !v);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("echo_meetcoach_focus_mode", focusMode ? "1" : "0");
    } catch {
      // ignore
    }
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) return;
    // Keep newest captions in view in focus mode.
    requestAnimationFrame(() => {
      const el = focusScrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [focusMode, feed.length]);

  const searchResults = useMemo(() => {
    const q = normalizeForMatch(search);
    if (!q) return [];

    const scored = BATTLECARDS.map((c) => {
      const title = normalizeForMatch(c.title);
      const triggers = c.triggers.map(normalizeForMatch).join(" ");
      let s = 0;
      if (title.includes(q)) s += 5;
      if (triggers.includes(q)) s += 3;
      return { card: c, score: s };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored.map((x) => x.card);
  }, [search]);

  const copyActive = async () => {
    if (!activeCard) return;
    const text = `${activeCard.title}\n\n${activeCard.primary}\n\nQ: ${activeCard.follow_up}`;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="captions-panel">
      <div className="captions-head">
        <div>
          <div className="captions-title">Live Feed</div>
          <div className="captions-sub">
            Captions: <b>{captionsConnected ? "Connected" : captionsWaiting ? "Waiting" : "Stale"}</b>{" "}
            · Last: <b>{fmtAge(captionsAgeMs)}</b> · Bridge: <b>{bridgeConnected ? "OK" : "NO"}</b>
          </div>
        </div>
        <div className="captions-actions">
          <button
            className="captions-btn"
            onClick={() => setFocusMode((v) => !v)}
            title={focusMode ? "Exit focus mode (F)" : "Focus mode (F)"}
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button className="captions-btn" onClick={copyActive} disabled={!activeCard} title="Copy suggestion">
            <Copy size={14} />
          </button>
          <button
            className="captions-btn"
            onClick={() => {
              setFeed([]);
              setLastCaptionAt(null);
            }}
            title="Clear feed"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="captions-feed">
        {feed.length === 0 ? (
          <div className="captions-empty">
            Waiting for captions… Turn on captions (CC) in Google Meet.
          </div>
        ) : (
          [...feed].slice(-10).reverse().map((l) => (
            <div key={l.id} className="captions-line">
              <div className="captions-meta">
                <span className="captions-speaker">{l.speakerName || "Speaker"}</span>
                <span className="captions-time">{new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
              <div className="captions-text">{l.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="captions-suggest">
        <div className="captions-suggest-head">
          <span className="captions-suggest-label">Suggestion</span>
          {activeCard ? <span className="captions-tag">{activeCard.category}</span> : null}
        </div>

        {activeCard ? (
          <>
            <div className="captions-suggest-title">{activeCard.title}</div>
            <div className="captions-suggest-primary">{activeCard.primary}</div>
            <div className="captions-suggest-follow">
              <span className="captions-suggest-follow-label">Follow-up:</span> {activeCard.follow_up}
            </div>

            <div className="captions-suggest-actions">
              <button className="captions-btn-wide" onClick={() => addCooldown(activeCard.key, 90)}>
                Use
              </button>
              <button className="captions-btn-wide secondary" onClick={() => addCooldown(activeCard.key, 45)}>
                Dismiss
              </button>
            </div>

            {altCard && altCard.key !== activeCard.key ? (
              <button className="captions-alt" onClick={() => setActiveCardKey(altCard.key)}>
                Alt: {altCard.title}
              </button>
            ) : null}
          </>
        ) : (
          <div className="captions-empty">
            No match yet. Say “rozpočet”, “GDPR”, or “pošlete to mailem”.
          </div>
        )}
      </div>

      <div className="captions-manual">
        <div className="captions-manual-row">
          <input
            className="captions-input"
            placeholder="Manual line (fallback)…"
            value={manualLine}
            onChange={(e) => setManualLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleIncomingCaption({ ts: Date.now(), text: manualLine, speakerName: "manual" });
                setManualLine("");
              }
            }}
          />
          <button
            className="captions-btn-wide"
            onClick={() => {
              handleIncomingCaption({ ts: Date.now(), text: manualLine, speakerName: "manual" });
              setManualLine("");
            }}
          >
            Add
          </button>
        </div>
        <div className="captions-search">
          <input
            className="captions-input"
            placeholder="Search (panic)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const top = searchResults[0];
                if (top) {
                  setActiveCardKey(top.key);
                  addCooldown(top.key, 60);
                }
              }
            }}
          />
          {searchResults.length ? (
            <div className="captions-search-results">
              {searchResults.map((c) => (
                <button
                  key={c.key}
                  className="captions-search-item"
                  onClick={() => {
                    setActiveCardKey(c.key);
                    addCooldown(c.key, 60);
                  }}
                >
                  {c.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="captions-hint">
          Hotkeys: 1-9 cards · `c` clear feed · `f` focus mode · `esc` close
        </div>
      </div>

      {focusMode ? (
        <div
          className="captions-focus-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFocusMode(false);
          }}
        >
          <div className="captions-focus" role="dialog" aria-modal="true" aria-label="Meet captions focus mode">
            <div className="captions-focus-head">
              <div>
                <div className="captions-focus-title">Live captions</div>
                <div className="captions-focus-sub">
                  {captionsConnected ? "Connected" : captionsWaiting ? "Waiting" : "Stale"} · last {fmtAge(captionsAgeMs)}
                </div>
              </div>
              <button className="captions-btn" onClick={() => setFocusMode(false)} title="Close (Esc)">
                <X size={14} />
              </button>
            </div>
            <div className="captions-focus-body" ref={focusScrollRef}>
              {feed.length === 0 ? (
                <div className="captions-focus-empty">Waiting for captions… Turn on captions (CC) in Google Meet.</div>
              ) : (
                [...feed].slice(-8).map((l) => (
                  <div key={l.id} className="captions-focus-line">
                    <div className="captions-focus-meta">
                      <span className="captions-speaker">{l.speakerName || "Speaker"}</span>
                      <span className="captions-time">
                        {new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <div className="captions-focus-text">{l.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
