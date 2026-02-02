import { useState } from 'react';
import { Activity, ArrowRight, FileText, SlidersHorizontal, Zap, Flame, Crown, X } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

function formatDateDDMMYYYY(date: Date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export function CommandCenter({
  onNavigate,
}: {
  onNavigate?: (tab: NavItem) => void;
}) {
  const { stats, integrations, user } = useSales();
  const [focusMode, setFocusMode] = useState<'volume' | 'quality' | 'closing'>('quality');
  const [showFocus, setShowFocus] = useState(false);

  const successRate = Math.round((stats.meetingsBooked / (stats.callsToday || 1)) * 100);
  const today = new Date();
  const energyLevel = Math.min(100, Math.max(0, user?.energyLevel ?? 82));
  const hoursWindow = Math.max(1, today.getHours() - 8);
  const velocity = Math.max(1, Math.round(stats.callsToday / hoursWindow));
  const scheduleStart = 8;
  const scheduleEnd = 18;
  const nowFloat = today.getHours() + today.getMinutes() / 60;
  const nowPct = Math.min(1, Math.max(0, (nowFloat - scheduleStart) / (scheduleEnd - scheduleStart)));

  const scheduleItems = [
    { time: '08:00', label: 'ADMIN', detail: 'Email cleanup, CRM hygiene', tone: 'white' as const },
    { time: '09:00', label: 'DEEP WORK', detail: 'Priority research + notes', tone: 'yellow' as const },
    { time: '11:00', label: 'POWER HOUR', detail: 'High-intent outbound calls', tone: 'purple' as const },
    { time: '12:30', label: 'LUNCH', detail: 'Recharge + walk', tone: 'white' as const },
    { time: '13:30', label: 'FOLLOW-UP', detail: 'Sequences + proposals', tone: 'pink' as const },
    { time: '15:30', label: 'POWER HOUR', detail: 'Demos + decision makers', tone: 'purple' as const },
    { time: '17:00', label: 'ADMIN', detail: 'Notes + pipeline update', tone: 'white' as const },
  ];

  const focusConfig = {
    volume: {
      label: 'High Volume',
      desc: 'Maximum calls per hour. Speed run mode.',
      bg: 'var(--figma-blue)',
      icon: Zap,
    },
    quality: {
      label: 'High Quality',
      desc: 'Identified for immediate contact (Prob > 85%).',
      bg: 'var(--figma-purple)',
      icon: Crown,
    },
    closing: {
      label: 'Closing Mode',
      desc: 'Bottom-of-funnel only. Close fast.',
      bg: 'var(--figma-green)',
      icon: Flame,
    },
  } as const;

  const focus = focusConfig[focusMode];

  return (
    <div
      className="figma-shell figma-grid-bg"
      style={{
        minHeight: 'calc(100vh - 96px)',
        fontFamily: 'var(--figma-font-body)',
      }}
    >
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-4" style={{ position: 'relative' }}>
          {showFocus && (
            <div
              style={{
                position: 'absolute',
                top: 6,
                right: 0,
                zIndex: 30,
                background: 'var(--figma-yellow)',
                border: 'var(--figma-border)',
                borderRadius: 'var(--figma-radius)',
                boxShadow: 'var(--figma-shadow)',
                padding: 14,
                width: 260,
                transform: 'rotate(1deg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Select Mode
                </div>
                <button
                  onClick={() => setShowFocus(false)}
                  style={{ border: '2px solid var(--figma-black)', borderRadius: 6, padding: 2, background: 'var(--figma-white)' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(['quality', 'volume', 'closing'] as const).map((mode) => {
                  const Icon = focusConfig[mode].icon;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setFocusMode(mode);
                        setShowFocus(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: mode === focusMode ? 'var(--figma-black)' : 'var(--figma-white)',
                        color: mode === focusMode ? 'var(--figma-white)' : 'var(--figma-black)',
                        border: '2px solid var(--figma-black)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        fontWeight: 900,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      <Icon size={16} />
                      {focusConfig[mode].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Header panel */}
          <div
            style={{
              background: 'var(--figma-white)',
              color: 'var(--figma-black)',
              border: 'var(--figma-border)',
              borderRadius: 'var(--figma-radius)',
              boxShadow: 'var(--figma-shadow)',
              padding: 14,
              marginBottom: 4,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ background: 'var(--figma-black)', color: 'var(--figma-white)', border: 'var(--figma-border)', borderRadius: 6, fontWeight: 800, fontSize: 11, padding: '2px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>TODAY'S</span>
                  <span style={{ background: 'var(--figma-yellow)', color: 'var(--figma-black)', border: 'var(--figma-border)', borderRadius: 6, fontWeight: 800, fontSize: 11, padding: '2px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{formatDateDDMMYYYY(today)}</span>
                </div>
                <h1 style={{ fontFamily: 'var(--figma-font-heading)', fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', textTransform: 'uppercase', margin: 0, lineHeight: 1.05 }}>PRIORITY QUEUE</h1>
              </div>

              <button
                onClick={() => setShowFocus((prev) => !prev)}
                style={{
                  background: 'var(--figma-white)',
                  color: 'var(--figma-black)',
                  border: 'var(--figma-border)',
                  borderRadius: 'var(--figma-radius)',
                  fontWeight: 800,
                  fontSize: 12,
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <SlidersHorizontal size={18} />
                ADJUST FOCUS
              </button>
            </div>
          </div>

          {/* Purple priority card */}
          <div
            style={{
              background: focus.bg,
              color: 'var(--figma-black)',
              border: 'var(--figma-border)',
              borderRadius: 'var(--figma-radius)',
              boxShadow: 'var(--figma-shadow)',
              padding: 16,
              marginBottom: 6,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <FileText
              size={120}
              style={{
                position: 'absolute',
                right: 24,
                bottom: -10,
                opacity: 0.08,
                transform: 'rotate(-8deg)',
                color: 'var(--figma-black)',
              }}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-4">
              <span style={{ background: 'var(--figma-white)', color: 'var(--figma-black)', border: 'var(--figma-border)', borderRadius: 6, fontWeight: 800, fontSize: 11, padding: '2px 10px', letterSpacing: '0.12em', textTransform: 'uppercase', boxShadow: 'none' }}>
                CURRENT MODE: {focus.label.toUpperCase()}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--figma-font-body)', fontWeight: 700, fontSize: 11, opacity: 0.6 }}>
                <span style={{ width: 10, height: 10, background: 'var(--figma-black)', borderRadius: 2, display: 'inline-block' }} />
                ENERGY LEVEL: OPTIMAL
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center mt-4">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-start gap-4">
                  <div className="w-1.5 bg-black mt-1.5" style={{ height: 52 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--figma-font-heading)', fontSize: '1.28rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.08 }}>
                      {focus.desc}
                    </div>
                    <div className="mt-4 flex items-center gap-2 font-mono text-xs font-bold opacity-80 sm:hidden">
                      <span className="w-2 h-2 bg-black rounded-sm" />
                      ENERGY LEVEL: OPTIMAL
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 flex md:justify-end">
                <button
                  onClick={() => onNavigate?.('live-campaigns')}
                  style={{
                    background: 'var(--figma-white)',
                    color: 'var(--figma-black)',
                    border: 'var(--figma-border)',
                    borderRadius: 'var(--figma-radius)',
                    fontWeight: 900,
                    fontSize: 14,
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: 'var(--figma-shadow)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  START DIALING <ArrowRight size={22} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 800, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, opacity: 0.7 }}>
                Energy Level
              </div>
              <div style={{ border: 'var(--figma-border)', borderRadius: 999, height: 12, background: 'var(--figma-white)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${energyLevel}%`,
                    height: '100%',
                    background: 'var(--figma-black)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Connection bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatusBar label="DATABASE SYNC" value="ONLINE" ok />
            <StatusBar
              label="CRM CONNECTION"
              value={integrations.pipedrive ? 'CONNECTED' : 'DISCONNECTED'}
              ok={integrations.pipedrive}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Live stats box */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: -10,
                right: 14,
                background: 'var(--figma-yellow)',
                color: 'var(--figma-black)',
                border: 'var(--figma-border)',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 11,
                padding: '2px 8px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                transform: 'rotate(3deg)',
                boxShadow: 'none',
                zIndex: 2,
              }}
            >
              LIVE STATS
            </div>
            <div
              style={{
                background: 'var(--figma-white)',
                border: 'var(--figma-border)',
                borderRadius: 'var(--figma-radius)',
                boxShadow: 'var(--figma-shadow)',
                padding: 14,
                marginTop: 12,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <LiveStat label="CALLS TODAY" value={stats.callsToday.toString()} />
                <LiveStat label="PIPELINE VALUE" value={`€${stats.pipelineValue.toLocaleString()}`} tone="green" />
                <LiveStat label="VELOCITY" value={`${velocity}/HR`} />
                <LiveStat label="SUCCESS RATE" value={`${successRate}%`} />
              </div>
            </div>
          </div>

          {/* View reports */}
          <button
            onClick={() => onNavigate?.('intelligence')}
            style={{
              background: 'var(--figma-pink)',
              color: 'var(--figma-black)',
              border: 'var(--figma-border)',
              borderRadius: 'var(--figma-radius)',
              boxShadow: 'var(--figma-shadow)',
              padding: 14,
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              marginTop: 10,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--figma-font-heading)', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>VIEW REPORTS</div>
              <div style={{ fontFamily: 'var(--figma-font-body)', fontSize: 12, fontWeight: 700, opacity: 0.6 }}>DEEP_DIVE_ANALYSIS.EXE</div>
            </div>
            <Activity style={{ color: 'var(--figma-black)' }} size={24} />
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          background: 'var(--figma-white)',
          border: 'var(--figma-border)',
          borderRadius: 'var(--figma-radius)',
          boxShadow: 'var(--figma-shadow)',
          padding: 14,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ background: 'var(--figma-yellow)', color: 'var(--figma-black)', border: 'var(--figma-border)', borderRadius: 6, fontWeight: 800, fontSize: 11, padding: '2px 8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            TACTICAL SCHEDULE
          </span>
          <span style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5 }}>
            08:00 — 18:00
          </span>
        </div>

        <div style={{ borderTop: '2px solid var(--figma-black)', marginBottom: 12 }} />

        <div style={{ position: 'relative', minHeight: 260 }}>
          <div
            style={{
              position: 'absolute',
              top: `${nowPct * 100}%`,
              left: 0,
              right: 0,
              height: 0,
              borderTop: '2px solid var(--figma-red)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: `${nowPct * 100}%`,
              left: 8,
              transform: 'translateY(-50%)',
              background: 'var(--figma-red)',
              color: 'var(--figma-white)',
              border: '2px solid var(--figma-black)',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            NOW
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 10 }}>
            {scheduleItems.map((item) => {
              const toneBg =
                item.tone === 'yellow'
                  ? 'var(--figma-yellow)'
                  : item.tone === 'purple'
                    ? 'var(--figma-purple)'
                    : item.tone === 'pink'
                      ? 'var(--figma-pink)'
                      : 'var(--figma-white)';

              return (
                <div key={`${item.time}-${item.label}`} style={{ display: 'contents' }}>
                  <div style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em' }}>
                    {item.time}
                  </div>
                  <div
                    style={{
                      background: toneBg,
                      border: 'var(--figma-border)',
                      borderRadius: 'var(--figma-radius)',
                      boxShadow: 'var(--figma-shadow)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--figma-font-heading)', fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>
                        {item.label}
                      </div>
                      <div style={{ fontFamily: 'var(--figma-font-body)', fontSize: 12, fontWeight: 700, opacity: 0.8 }}>
                        {item.detail}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>
                      Focus
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
        <button
          style={{
            opacity: 0.65,
            fontFamily: 'var(--figma-font-body)',
            fontWeight: 700,
            fontSize: 12,
            background: 'var(--figma-white)',
            color: 'var(--figma-black)',
            border: 'var(--figma-border)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Take a break in 45m
        </button>
      </div>
    </div>
  );
}

function StatusBar({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      style={{
        background: 'var(--figma-white)',
        border: 'var(--figma-border)',
        borderRadius: 'var(--figma-radius)',
        boxShadow: 'none',
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 0,
      }}
    >
      <div style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--figma-font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
        <span>{value}</span>
        <span
          style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--figma-black)', background: ok ? 'var(--figma-green)' : 'rgba(0,0,0,0.2)', display: 'inline-block' }}
        />
      </div>
    </div>
  );
}

function LiveStat({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div
      style={{
        border: '2px solid var(--figma-black)',
        borderRadius: 8,
        padding: 10,
        background: 'var(--figma-white)',
        minHeight: 72,
      }}
    >
      <div style={{ fontFamily: 'var(--figma-font-body)', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--figma-font-heading)',
          fontSize: 24,
          fontWeight: 900,
          marginTop: 8,
          lineHeight: 1,
          color: tone === 'green' ? 'var(--figma-green)' : 'var(--figma-black)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
