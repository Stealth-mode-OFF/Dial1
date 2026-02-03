import React from 'react';
import { BarChart3, LineChart, Target } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const number = (value: number | undefined | null) =>
  new Intl.NumberFormat().format(value || 0);

export function AnalyticsWorkspace() {
  const { analytics, stats } = useSales();

  const breakdown = analytics?.dispositionBreakdown || [];
  const daily = analytics?.dailyVolume || [];
  const activity = analytics?.recentActivity || [];

  return (
    <div className="workspace column">
      <div className="panel head">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Performance</p>
            <h2>Call analytics</h2>
            <p className="muted">Live metrics from edge call logs.</p>
          </div>
          <div className="chip-row">
            <span className="pill">Calls: {number(stats.callsToday)}</span>
            <span className="pill">Connect: {stats.connectRate}%</span>
            <span className="pill">Meetings: {number(stats.meetingsBooked)}</span>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-head tight">
            <div className="icon-title">
              <BarChart3 size={16} />
              <span>Disposition breakdown</span>
            </div>
            <span className="muted text-sm">Edge analytics</span>
          </div>
          <div className="list">
            {breakdown.length === 0 && <div className="muted">No call logs yet.</div>}
            {breakdown.map((row) => (
              <div key={row.name} className="list-row">
                <div className="item-title">{row.name}</div>
                <div className="pill subtle">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head tight">
            <div className="icon-title">
              <LineChart size={16} />
              <span>Daily volume</span>
            </div>
            <span className="muted text-sm">Last sessions</span>
          </div>
          <div className="list">
            {daily.length === 0 && <div className="muted">Log a call to see trend.</div>}
            {daily.map((row) => (
              <div key={row.time} className="list-row">
                <div className="item-title">{row.time}</div>
                <div className="pill subtle">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head tight">
          <div className="icon-title">
            <Target size={16} />
            <span>Recent activity</span>
          </div>
          <span className="muted text-sm">Latest 5 logs</span>
        </div>
        <div className="list">
          {activity.length === 0 && <div className="muted">No activity yet.</div>}
          {activity.map((item) => (
            <div key={item.id} className="list-row">
              <div>
                <div className="item-title">{item.text}</div>
                <div className="muted text-sm">{item.time}</div>
              </div>
              <span className="pill subtle">{item.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
