import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value || 0);

export default function Intelligence() {
  const { analytics, stats } = useSales();

  const outcomeSummary = useMemo(() => {
    const breakdown = analytics?.dispositionBreakdown ?? [];
    return [...breakdown]
      .filter((item) => Boolean(item?.name))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 4)
      .map((item) => ({ label: item.name, count: item.value }));
  }, [analytics]);

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Insights</h1>
          <p className="app-subtitle">Call performance summary.</p>
        </div>
        <span className="app-pill">Today</span>
      </header>

      <div className="app-page-body">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="app-card app-section">
            <h2 className="app-title text-lg">Pipeline value</h2>
            <p className="app-subtitle">From analytics</p>
            <div className="mt-6 text-3xl font-semibold app-title">{formatNumber(stats.pipelineValue)}</div>
            <div className="text-sm app-muted mt-2">Updated from your connected sources</div>
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
            <div className="text-sm app-muted mt-2">Based on logged outcomes</div>
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
                  <div className="text-sm font-semibold">{item.label}</div>
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
