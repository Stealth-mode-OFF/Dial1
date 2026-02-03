import React from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'configuration';

interface TopBarProps {
  onNavigate?: (tab: NavItem) => void;
}

const formatSyncTime = (iso: string | null) => {
  if (!iso) return 'Not synced yet';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function TopBar({ onNavigate }: TopBarProps) {
  const { user, refresh, isLoading, lastUpdated, isConfigured, error, stats } = useSales();
  const initials = user.avatarInitials || 'ME';

  return (
    <div className="app-topbar">
      <div>
        <div className="app-title text-2xl">Echo Dialer</div>
        <div className="app-subtitle">Calls today: {stats.callsToday}</div>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <span className="app-pill">
          {isConfigured ? 'Connected' : 'Not connected'}
        </span>
        <span className="app-subtitle">Last sync: {formatSyncTime(lastUpdated)}</span>
        {error ? <span className="app-subtitle">Warning: {error}</span> : null}
        <button className="app-button secondary" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw size={16} />
          {isLoading ? 'Refreshing' : 'Sync'}
        </button>
        <button className="app-button secondary" aria-label="Notifications">
          <Bell size={16} />
        </button>
        <button
          className="app-button secondary"
          onClick={() => onNavigate?.('configuration')}
          aria-label="User settings"
        >
          <span className="app-ring" aria-hidden="true">
            {initials}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold">
              {user.name || 'Add name'}
            </span>
            <span className="block text-xs app-muted">{user.role || 'Add role'}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
