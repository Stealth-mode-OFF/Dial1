import React from 'react';
import {
  BarChart3,
  LayoutDashboard,
  PhoneCall,
  Settings,
  Zap,
} from 'lucide-react';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'configuration';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
}

const navItems: Array<{ id: NavItem; label: string; icon: React.ElementType }> = [
  { id: 'command-center', label: 'Today', icon: LayoutDashboard },
  { id: 'live-campaigns', label: 'Dialer', icon: PhoneCall },
  { id: 'intelligence', label: 'Insights', icon: BarChart3 },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <button
        className="app-brand"
        onClick={() => setActiveTab('command-center')}
        aria-label="Echo Pulse Home"
      >
        <Zap size={26} />
      </button>

      <nav className="flex flex-col items-center gap-3 flex-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`app-nav-button ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={22} />
            </button>
          );
        })}
      </nav>

      <button
        className={`app-nav-button ${activeTab === 'configuration' ? 'active' : ''}`}
        onClick={() => setActiveTab('configuration')}
        aria-label="Settings"
        title="Settings"
      >
        <Settings size={22} />
      </button>
    </aside>
  );
}
