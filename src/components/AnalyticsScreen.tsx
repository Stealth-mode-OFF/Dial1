import { useMemo, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const TIMEFRAMES = ['LAST 7 DAYS', 'TODAY', 'THIS MONTH'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type ObjectionRow = { label: string; count: number; pct: number };

export function AnalyticsScreen() {
  const { stats, objectionCounts } = useSales();
  const [timeframe, setTimeframe] = useState<Timeframe>('LAST 7 DAYS');

  const totalCalls = stats.totalCalls ?? stats.callsToday;
  const connectRate = useMemo(() => {
    const denom = totalCalls || 0;
    if (denom <= 0) return 0;
    return Math.round(((stats.connected || 0) / denom) * 100);
  }, [stats.connected, totalCalls]);

  const topObjections = useMemo<ObjectionRow[]>(() => {
    const entries = Object.entries(objectionCounts || {});
    const total = entries.reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
    return entries
      .map(([label, count]) => {
        const safeCount = Number(count) || 0;
        const pct = total > 0 ? Math.round((safeCount / total) * 100) : 0;
        return { label, count: safeCount, pct };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [objectionCounts]);

  const schedule = useMemo(
    () => [
      { time: '09:00', label: 'INTEL & PREP', detail: 'Review CRM, Coffee, Set Daily Goals', tone: 'yellow' as const },
      { time: '09:30', label: 'DEEP CANVASSING', detail: 'Prospecting new leads. No distractions.', tone: 'white' as const },
      { time: '10:30', label: 'NEURO-RESET', detail: 'Walk, Stretch, No screens.', tone: 'ghost' as const },
      { time: '10:45', label: 'DEMO / OUTBOUND', detail: 'High energy calls & presentations.', tone: 'white' as const },
    ],
    [],
  );

  const exportCsv = () => {
    // Minimal export — enough to unblock you. Extend as you add real analytics.
    const rows: Array<[string, string | number]> = [
      ['timeframe', timeframe],
      ['total_calls', totalCalls],
      ['connected', stats.connected],
      ['connect_rate_pct', connectRate],
      ['meetings_booked', stats.meetingsBooked],
      ['pipeline_value', stats.pipelineValue],
    ];
    for (const [k, v] of Object.entries(objectionCounts || {})) rows.push([`objection:${k}`, v]);

    const csv = rows.map(([k, v]) => `${escapeCsv(k)},${escapeCsv(String(v))}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echo-dialer-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="figma-shell figma-grid-bg pb-16">
      {/* Header */}
      <div className="neo-panel-shadow bg-white p-5 flex items-center justify-between">
        <div>
          <div className="neo-display text-5xl font-black leading-none">INTELLIGENCE HUB</div>
          <div className="text-xs font-mono font-bold uppercase tracking-widest opacity-60 mt-2">
            Tactical performance overview
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="neo-panel bg-white px-3 py-2" style={{ boxShadow: 'none' }}>
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="text-xs font-mono font-bold uppercase tracking-widest">{timeframe}</span>
            </div>
          </div>
          <button onClick={exportCsv} className="neo-btn px-4 py-2 text-xs font-black uppercase">
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> EXPORT CSV
            </span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-5 mt-5">
        <KpiCard title="TOTAL CALLS" value={String(totalCalls ?? 0)} delta="+12%" tone="white" />
        <KpiCard title="CONNECT RATE" value={`${connectRate}%`} delta="-2%" tone="white" deltaTone="red" />
        <KpiCard title="MEETINGS BOOKED" value={String(stats.meetingsBooked ?? 0)} delta="+5%" tone="yellow" />
        <KpiCard title="PIPELINE ADDED" value={`€${(stats.pipelineValue ?? 0).toLocaleString()}`} delta="+24%" tone="black" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-5 mt-5">
        {/* Tactical schedule */}
        <div className="col-span-12 lg:col-span-8 neo-panel-shadow bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="neo-tag neo-tag-yellow">TACTICAL SCHEDULE</div>
            <div className="neo-tag" style={{ background: 'white' }}>
              MAX 5H ACTIVE DUTY <span className="ml-2 inline-block w-3 h-3 rounded-full" style={{ background: 'var(--figma-green)', border: '2px solid var(--figma-black)' }} />
            </div>
          </div>
          <div className="mt-3" style={{ borderTop: '3px solid var(--figma-black)' }} />

          <div className="mt-4 space-y-4">
            {schedule.map((item) => (
              <ScheduleRow key={item.time} {...item} />
            ))}
          </div>
        </div>

        {/* Objections */}
        <div className="col-span-12 lg:col-span-4 neo-panel-shadow bg-white p-5">
          <div className="neo-display text-3xl font-black">TOP OBJECTIONS</div>
          <div className="mt-4 space-y-4">
            {topObjections.length === 0 ? (
              <div className="text-sm font-mono font-bold opacity-60">No objections logged yet.</div>
            ) : (
              topObjections.map((row) => <ObjectionBar key={row.label} {...row} />)
            )}

            <div className="neo-panel-shadow p-4" style={{ background: 'var(--figma-blue)' }}>
              <div className="text-xs font-mono font-black uppercase tracking-widest text-white opacity-90">AI COACH INSIGHT</div>
              <div className="mt-2 text-sm font-mono font-bold text-white">
                “Focus on price objection handling. Your conversion drops when budget is mentioned.”
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  delta,
  tone,
  deltaTone,
}: {
  title: string;
  value: string;
  delta?: string;
  tone: 'white' | 'yellow' | 'black';
  deltaTone?: 'green' | 'red';
}) {
  const bg = tone === 'yellow' ? 'var(--figma-yellow)' : tone === 'black' ? 'var(--figma-black)' : 'white';
  const fg = tone === 'black' ? 'white' : 'var(--figma-black)';
  return (
    <div className="col-span-12 md:col-span-3 neo-panel-shadow p-5" style={{ background: bg, color: fg }}>
      <div className="text-xs font-mono font-black uppercase tracking-widest opacity-70">{title}</div>
      <div className="neo-display text-5xl font-black mt-2 leading-none">{value}</div>
      {delta ? (
        <div
          className="inline-flex items-center mt-3 px-2 py-1 text-xs font-mono font-black uppercase tracking-widest"
          style={{
            border: '2px solid var(--figma-black)',
            background: deltaTone === 'red' ? '#fff0f0' : '#f0fff4',
            color: 'var(--figma-black)',
            boxShadow: 'none',
          }}
        >
          {delta}
        </div>
      ) : null}
    </div>
  );
}

function ScheduleRow({
  time,
  label,
  detail,
  tone,
}: {
  time: string;
  label: string;
  detail: string;
  tone: 'yellow' | 'white' | 'ghost';
}) {
  const bg = tone === 'yellow' ? 'var(--figma-yellow)' : 'white';
  const dashed = tone === 'ghost';
  return (
    <div className="grid grid-cols-12 gap-4 items-stretch">
      <div className="col-span-2 text-xs font-mono font-black uppercase tracking-widest opacity-70 pt-2">{time}</div>
      <div
        className="col-span-10"
        style={
          dashed
            ? {
                background: 'transparent',
                border: '3px dashed rgba(17,17,17,0.35)',
                borderRadius: 8,
                padding: 14,
              }
            : {
                background: bg,
                border: '3px solid var(--figma-black)',
                borderRadius: 8,
                boxShadow: '4px 4px 0 0 var(--figma-black)',
                padding: 14,
              }
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-black tracking-tight" style={{ fontFamily: 'var(--figma-font-heading)' }}>
              {label}
            </div>
            <div className="text-xs font-mono font-bold opacity-70 mt-1">{detail}</div>
          </div>
          {!dashed ? <div className="text-[10px] font-mono font-black uppercase tracking-widest opacity-60">FOCUS</div> : null}
        </div>
      </div>
    </div>
  );
}

function ObjectionBar({ label, count, pct }: ObjectionRow) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-mono font-black uppercase tracking-widest opacity-70">
        <span>{label}</span>
        <span>
          {count} ({pct}%)
        </span>
      </div>
      <div className="mt-2" style={{ border: '3px solid var(--figma-black)', borderRadius: 8, overflow: 'hidden' }}>
        <div
          style={{
            height: 18,
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: '#FF8A00',
            borderRight: '3px solid var(--figma-black)',
          }}
        />
      </div>
    </div>
  );
}

function escapeCsv(value: string) {
  const needsQuotes = /[\n\r,\"]/g.test(value);
  const escaped = value.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
