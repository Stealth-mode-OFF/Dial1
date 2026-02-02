import React, { useMemo } from 'react';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value || 0);

export default function Intelligence() {
  const { calls, stats, deals } = useSales();

  const hourly = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }).map((_, index) => {
      const hour = new Date(now.getTime() - (5 - index) * 60 * 60 * 1000).getHours();
      return { hour, count: 0 };
    });

    calls.forEach((call) => {
      if (!call.createdAt) return;
      const date = new Date(call.createdAt);
      const bucket = buckets.find((item) => item.hour === date.getHours());
      if (bucket) bucket.count += 1;
    });

    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((item) => ({
      ...item,
      pct: Math.round((item.count / max) * 100),
    }));
  }, [calls]);

  const outcomeSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    calls.forEach((call) => {
      const key = (call.outcome || call.status || 'Unspecified').toLowerCase();
      summary[key] = (summary[key] || 0) + 1;
    });
    return Object.entries(summary)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [calls]);

  const pipelineValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);

  return (
    <div className="app-section app-grid">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Intelligence</h1>
          <p className="app-subtitle">Performance insights based on today’s activity.</p>
        </div>
        <span className="app-badge">
          <TrendingUp size={14} /> Data refresh ready
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card app-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-title text-lg">Pipeline momentum</h2>
              <p className="app-subtitle">Open deal value</p>
            </div>
            <BarChart3 size={20} />
          </div>
          <div className="mt-6 text-3xl font-semibold app-title">{formatNumber(pipelineValue)}</div>
          <div className="text-sm app-muted mt-2">Across {deals.length} open deals</div>
        </div>

        <div className="app-card app-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-title text-lg">Connect rate</h2>
              <p className="app-subtitle">Live call efficiency</p>
            </div>
            <Activity size={20} />
          </div>
          <div className="mt-6 text-3xl font-semibold app-title">{stats.connectRate}%</div>
          <div className="text-sm app-muted mt-2">Calls today: {formatNumber(stats.callsToday)}</div>
        </div>

        <div className="app-card app-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-title text-lg">Meetings booked</h2>
              <p className="app-subtitle">From call outcomes</p>
            </div>
            <Activity size={20} />
          </div>
          <div className="mt-6 text-3xl font-semibold app-title">{formatNumber(stats.meetingsBooked)}</div>
          <div className="text-sm app-muted mt-2">Track outcomes for accuracy</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-card app-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-title text-lg">Hourly call volume</h2>
              <p className="app-subtitle">Last 6 hours</p>
            </div>
            <span className="app-pill">{calls.length} total</span>
          </div>
          <div className="mt-6 grid gap-3">
            {hourly.map((item) => (
              <div key={item.hour} className="flex items-center gap-3">
                <div className="w-12 text-sm app-muted">{String(item.hour).padStart(2, '0')}:00</div>
                <div className="flex-1 h-3 rounded-full bg-black/5">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${item.pct}%`, background: 'var(--app-accent-2)' }}
                  />
                </div>
                <div className="w-8 text-sm app-muted text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card app-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-title text-lg">Top outcomes</h2>
              <p className="app-subtitle">Based on logged calls</p>
            </div>
            <span className="app-pill">{outcomeSummary.length} tracked</span>
          </div>
          <div className="mt-6 grid gap-3">
            {outcomeSummary.length === 0 && (
              <div className="app-subtitle">No outcomes logged yet.</div>
            )}
            {outcomeSummary.map((item) => (
              <div key={item.label} className="app-card soft px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {item.label}
                  </div>
                  <div className="text-sm app-muted">{item.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
