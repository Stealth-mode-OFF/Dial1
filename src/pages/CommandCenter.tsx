import React from 'react';
import { ArrowUpRight, CalendarCheck, PhoneCall, Target, TrendingUp } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value || 0);

const formatRelative = (value?: string) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function CommandCenter() {
  const { stats, contacts, calls, isLoading, isConfigured, settings } = useSales();

  const queue = contacts.slice(0, 6);
  const recentCalls = [...calls]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const goal = settings.dailyCallGoal || 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((stats.callsToday / goal) * 100)) : 0;

  return (
    <div className="app-section app-grid">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-title text-3xl">Command Center</h1>
          <p className="app-subtitle">Real-time pulse of your outbound motion.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="app-badge">
            <TrendingUp size={14} /> Live pipeline
          </span>
          <button className="app-button secondary">
            <ArrowUpRight size={16} /> New sprint
          </button>
        </div>
      </header>

      {!isConfigured && (
        <div className="app-card app-section">
          <h2 className="app-title text-xl">Connect your data</h2>
          <p className="app-subtitle mt-2">
            Add your Supabase credentials to start pulling live contacts, calls, and deals.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="app-pill">VITE_SUPABASE_URL</span>
            <span className="app-pill">VITE_SUPABASE_ANON_KEY</span>
            <span className="app-pill">VITE_SUPABASE_PROJECT_ID (optional)</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<PhoneCall size={18} />}
          label="Calls today"
          value={formatNumber(stats.callsToday)}
          detail={goal ? `${goalPct}% of goal` : 'Set daily goal'}
        />
        <StatCard
          icon={<Target size={18} />}
          label="Connect rate"
          value={`${stats.connectRate}%`}
          detail="Answered vs. total"
        />
        <StatCard
          icon={<CalendarCheck size={18} />}
          label="Meetings booked"
          value={formatNumber(stats.meetingsBooked)}
          detail="From call outcomes"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Pipeline value"
          value={formatNumber(stats.pipelineValue)}
          detail="Open deals"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card app-section lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="app-title text-xl">Priority queue</h2>
              <p className="app-subtitle">Next best leads, sorted by recency.</p>
            </div>
            <span className="app-pill">{queue.length} ready</span>
          </div>

          <div className="grid gap-3">
            {isLoading && <div className="app-subtitle">Loading contacts...</div>}
            {!isLoading && queue.length === 0 && (
              <div className="app-subtitle">No contacts yet. Import contacts to build your queue.</div>
            )}
            {queue.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between border-b border-black/10 pb-3">
                <div>
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm app-muted">
                    {contact.title || 'Role'} {contact.company ? `· ${contact.company}` : ''}
                  </div>
                </div>
                <div className="text-sm app-muted">{contact.status || 'Queued'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card app-section">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="app-title text-xl">Recent activity</h2>
              <p className="app-subtitle">Most recent call updates.</p>
            </div>
            <span className="app-pill">{recentCalls.length} entries</span>
          </div>
          <div className="grid gap-3">
            {recentCalls.length === 0 && (
              <div className="app-subtitle">No calls logged today.</div>
            )}
            {recentCalls.map((call) => (
              <div key={call.id} className="app-card soft px-3 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{call.outcome || call.status || 'Call update'}</div>
                  <div className="text-xs app-muted">{formatRelative(call.createdAt)}</div>
                </div>
                <div className="text-xs app-muted mt-1">
                  {call.notes ? call.notes : call.connected ? 'Connected' : 'Attempted'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="app-card app-section">
      <div className="flex items-center justify-between">
        <div className="app-ring">{icon}</div>
        <span className="app-pill">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold app-title">{value}</div>
      <div className="text-sm app-muted mt-2">{detail}</div>
    </div>
  );
}
