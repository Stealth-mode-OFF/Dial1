import React from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

interface TopBarProps {
  onNavigate?: (tab: NavItem) => void;
}

const formatSyncTime = (iso: string | null) => {
  if (!iso) return 'Not synced yet';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function TopBar({ onNavigate }: TopBarProps) {
  const { user, refresh, isLoading, lastUpdated, isConfigured, error } = useSales();
  const initials = user.avatarInitials || 'ME';

  return (
    <div className="app-topbar">
      <div className="flex items-center justify-between gap-6 flex-wrap w-full">
        <div className="app-search">
          <Search size={18} />
          <input
            className="app-input"
            placeholder="Search contacts, deals, or notes"
            type="text"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className="app-pill">
            {isConfigured ? 'Supabase connected' : 'Connect Supabase'}
          </span>
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
                {user.name || 'Set your name'}
              </span>
              <span className="block text-xs app-muted">{user.role || 'Sales role'}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="w-full flex items-center justify-between text-xs app-muted">
        <span>Last sync: {formatSyncTime(lastUpdated)}</span>
        {error ? <span>Data warning: {error}</span> : <span>All systems normal</span>}
      </div>
    </div>
  );
}
