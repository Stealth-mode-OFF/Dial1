import React from 'react';
import { CalendarCheck, PhoneCall, Target } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value || 0);

export default function CommandCenter({ onStartDialer }: { onStartDialer?: () => void }) {
  const { stats, contacts, isLoading, isConfigured, settings } = useSales();

  const nextLead = contacts[0];
  const goal = settings.dailyCallGoal || 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((stats.callsToday / goal) * 100)) : 0;

  return (
    <div className="app-page">
      <header>
        <h1 className="app-title text-3xl">Today</h1>
        <p className="app-subtitle">One clean view of what matters right now.</p>
      </header>

      <div className="app-page-body">
        {!isConfigured && (
          <div className="app-card app-section">
            <h2 className="app-title text-lg">Connect live data</h2>
            <p className="app-subtitle mt-2">
              Add your Supabase keys to load real contacts, calls, and deals.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="app-pill">VITE_SUPABASE_URL</span>
              <span className="app-pill">VITE_SUPABASE_ANON_KEY</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard
            icon={<PhoneCall size={18} />}
            label="Calls today"
            value={formatNumber(stats.callsToday)}
            detail={goal ? `${goalPct}% of goal` : 'Set a daily goal'}
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
            detail="Logged outcomes"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="app-card app-section">
            <h2 className="app-title text-xl">Next lead</h2>
            <p className="app-subtitle mt-1">Focus on one conversation at a time.</p>

            {isLoading && <div className="app-subtitle mt-4">Loading contact…</div>}
            {!isLoading && !nextLead && (
              <div className="app-subtitle mt-4">No contacts yet. Import to start dialing.</div>
            )}

            {nextLead && (
              <div className="mt-4 app-card soft p-4">
                <div className="text-lg font-semibold">{nextLead.name}</div>
                <div className="text-sm app-muted mt-1">
                  {nextLead.title || 'Role'}
                  {nextLead.company ? ` · ${nextLead.company}` : ''}
                </div>
                <div className="text-sm app-muted mt-2">
                  {nextLead.phone || nextLead.email || 'Add contact details'}
                </div>
                <button className="app-button mt-4" onClick={onStartDialer}>
                  Start call
                </button>
              </div>
            )}
          </div>

          <div className="app-card app-section">
            <h2 className="app-title text-xl">Focus reminder</h2>
            <p className="app-subtitle mt-1">
              Keep the call simple: confirm fit, surface pain, book next step.
            </p>
            <div className="mt-4 grid gap-3">
              {['Confirm the ICP in 1 question', 'Ask 1 pain question', 'Book 15-minute follow-up'].map((item) => (
                <div key={item} className="app-card soft px-4 py-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
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
