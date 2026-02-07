import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { HOTKEYS_1_TO_9, BATTLECARDS, type Battlecard } from "../meetcoach/battlecards";
import { normalizeForMatch, pickTopMatches, type FeedLine } from "../meetcoach/engine";

type IncomingCaption = {
  ts: number;
  text: string;
  speakerName?: string | null;
};

function fmtAgeShort(ms: number | null): string {
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

function CardDetails({ card }: { card: Battlecard }) {
  return (
    <div className="grid gap-3">
      <div className="text-sm">{card.primary}</div>
      <div className="text-sm app-muted">
        <span className="font-semibold">Follow-up:</span> {card.follow_up}
      </div>
      {card.proof_hook?.length ? (
        <div className="text-xs app-muted grid gap-1">
          {card.proof_hook.slice(0, 2).map((p) => (
            <div key={p}>{p}</div>
          ))}
        </div>
      ) : null}
      {(card.alt_1 || card.alt_2 || (card.dont_say && card.dont_say.length)) ? (
        <details className="app-card soft p-3">
          <summary className="text-xs font-semibold cursor-pointer">Alts + don't say</summary>
          <div className="mt-3 grid gap-2 text-sm">
            {card.alt_1 ? (
              <div>
                <div className="text-xs app-muted font-semibold uppercase">Alt 1</div>
                <div>{card.alt_1}</div>
              </div>
            ) : null}
            {card.alt_2 ? (
              <div>
                <div className="text-xs app-muted font-semibold uppercase">Alt 2</div>
                <div>{card.alt_2}</div>
              </div>
            ) : null}
            {card.dont_say?.length ? (
              <div>
                <div className="text-xs app-muted font-semibold uppercase">Don't say</div>
                <ul className="list-disc pl-5">
                  {card.dont_say.slice(0, 4).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default function MeetCoach() {
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [lastCaptionAt, setLastCaptionAt] = useState<number | null>(null);
  const [bridgeReadyAt, setBridgeReadyAt] = useState<number | null>(null);
  const [cooldownUntilByKey, setCooldownUntilByKey] = useState<Record<string, number | undefined>>({});

  const [manualLine, setManualLine] = useState("");
  const [search, setSearch] = useState("");
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep a small dedupe set for incoming lines.
  const recentIdsRef = useRef<string[]>([]);
  const recentIdSetRef = useRef<Set<string>>(new Set());

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
  const persona = matches.persona?.card || null;

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
      // Keep last 50 lines or 90 seconds, whichever is smaller.
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
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [feed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inTextInput(document.activeElement)) return;

      if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1;
        const key = HOTKEYS_1_TO_9[idx];
        if (!key) return;
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      .slice(0, 8);
    return scored.map((x) => x.card);
  }, [search]);

  const copyActive = async () => {
    if (!activeCard) return;
    const text = `${activeCard.title}\n\n${activeCard.primary}\n\nQ: ${activeCard.follow_up}`;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="app-section app-grid">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Meet Coach</h1>
          <p className="app-subtitle">Live feed from Google Meet captions + instant battlecards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="app-button secondary"
            onClick={() => {
              setFeed([]);
              setLastCaptionAt(null);
            }}
          >
            <Trash2 size={16} /> Clear feed
          </button>
          <button className="app-button secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Reload
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card app-section lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-pill">
              Captions:{" "}
              {captionsConnected ? "Connected" : captionsWaiting ? "Waiting" : "Stale"}
            </span>
            <span className="app-pill">Last: {fmtAgeShort(captionsAgeMs)}</span>
            <span className="app-pill">Bridge: {bridgeConnected ? "Connected" : "Not connected"}</span>
            {persona ? (
              <span className="app-pill">Tone: {persona.persona_tone || persona.title}</span>
            ) : null}
          </div>

          <div className="mt-4 app-card soft p-4">
            <div className="flex items-center justify-between">
              <h2 className="app-title text-lg">Live feed</h2>
              <span className="app-pill">{feed.length} lines</span>
            </div>

            <div ref={listRef} className="mt-4 max-h-[420px] overflow-y-auto grid gap-3">
              {feed.length === 0 ? (
                <div className="app-subtitle">
                  Waiting for captions… Turn on captions (CC) in Google Meet and open this tab.
                </div>
              ) : null}
              {feed.map((line) => (
                <div key={line.id} className="app-card soft p-3">
                  <div className="text-xs app-muted">
                    {line.speakerName || "Speaker"} ·{" "}
                    {new Date(line.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  <div className="text-sm mt-2">{line.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 app-card soft p-4">
            <h3 className="app-title text-sm">Manual fallback</h3>
            <p className="text-xs app-muted mt-1">
              If captions are not available, paste a line here to trigger cards.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="app-card soft px-4 py-2 flex-1"
                placeholder="Paste a caption line…"
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
                className="app-button"
                onClick={() => {
                  handleIncomingCaption({ ts: Date.now(), text: manualLine, speakerName: "manual" });
                  setManualLine("");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="app-card app-section">
          <div className="flex items-center justify-between gap-2">
            <h2 className="app-title text-lg">Suggestion</h2>
            <button className="app-button secondary" onClick={copyActive} disabled={!activeCard}>
              <Copy size={14} /> Copy
            </button>
          </div>

          {activeCard ? (
            <div className="mt-4 app-card soft p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="app-title text-base">{activeCard.title}</div>
                  <div className="text-xs app-muted mt-1">{activeCard.when_to_use}</div>
                </div>
                <span className="app-pill">{activeCard.category}</span>
              </div>

              <div className="mt-4">
                <CardDetails card={activeCard} />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="app-button"
                  onClick={() => {
                    addCooldown(activeCard.key, 90);
                  }}
                >
                  Use (cooldown)
                </button>
                <button
                  className="app-button secondary"
                  onClick={() => {
                    addCooldown(activeCard.key, 45);
                  }}
                >
                  Dismiss
                </button>
              </div>

              {altCard && altCard.key !== activeCard.key ? (
                <div className="mt-4 app-card soft p-3">
                  <div className="text-xs app-muted font-semibold uppercase">Alt suggestion</div>
                  <div className="mt-1 text-sm font-semibold">{altCard.title}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="app-button secondary" onClick={() => setActiveCardKey(altCard.key)}>
                      Open
                    </button>
                    <button className="app-button secondary" onClick={() => addCooldown(altCard.key, 60)}>
                      Cooldown
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 app-card soft p-4">
              <div className="text-sm">No match yet.</div>
              <div className="text-xs app-muted mt-2">
                Talk about budget, GDPR, "pošlete to mailem", or use manual fallback to see suggestions.
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="app-title text-sm">Hotkeys (1–9)</h3>
            <div className="mt-2 grid gap-2">
              {HOTKEYS_1_TO_9.map((key, idx) => {
                const c = BATTLECARDS.find((x) => x.key === key);
                if (!c) return null;
                return (
                  <button
                    key={key}
                    className="app-button secondary justify-between"
                    onClick={() => {
                      setActiveCardKey(c.key);
                      addCooldown(c.key, 75);
                    }}
                  >
                    <span>
                      {idx + 1}. {c.title}
                    </span>
                    <span className="app-muted text-xs">{c.category}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs app-muted mt-2">Press `c` to clear the feed.</div>
          </div>

          <div className="mt-6">
            <h3 className="app-title text-sm">Search</h3>
            <input
              className="app-card soft px-4 py-2 w-full mt-2"
              placeholder="Type 2–4 words (e.g. gdpr, rozpočet, mail)…"
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
              <div className="mt-2 grid gap-2">
                {searchResults.map((c) => (
                  <button
                    key={c.key}
                    className="app-button secondary justify-between"
                    onClick={() => {
                      setActiveCardKey(c.key);
                      addCooldown(c.key, 60);
                    }}
                  >
                    <span>{c.title}</span>
                    <span className="app-muted text-xs">{c.category}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <h3 className="app-title text-sm">How to demo</h3>
            <ul className="mt-2 text-sm app-muted list-disc pl-5 space-y-2">
              <li>Chrome: load unpacked extension from `src/extension`.</li>
              <li>Open Dial1 Meet Coach in a tab and keep it open.</li>
              <li>In Google Meet, turn on captions (CC).</li>
              <li>Open extension popup: set Dial1 URL, click Save.</li>
              <li>Speak Czech: incoming lines should appear in Live feed.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

