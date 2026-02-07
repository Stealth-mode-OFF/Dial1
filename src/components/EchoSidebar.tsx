import React from 'react';
import { 
  Settings,
  Users,
  PhoneCall,
  Zap,
} from 'lucide-react';

export type NavItem = 'contacts' | 'calls' | 'settings';

interface EchoSidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
}

export function EchoSidebar({ activeTab, setActiveTab }: EchoSidebarProps) {
  const navItems = [
    { id: 'contacts', label: 'CONTACTS', icon: Users },
    { id: 'calls', label: 'CALLS', icon: PhoneCall },
  ];

  return (
    <aside
      style={{
        background: 'var(--figma-white)',
        color: 'var(--figma-black)',
        borderRight: 'var(--figma-border)',
        boxShadow: 'var(--figma-shadow)',
        minWidth: 92,
        zIndex: 10,
      }}
      className="flex flex-col h-screen"
      aria-label="Primary navigation"
      role="navigation"
      data-testid="sidebar"
    >
      {/* Brand */}
      <div style={{ padding: '16px 12px 0 12px' }}>
        <button
          onClick={() => setActiveTab('contacts')}
          aria-label="EchoOS Home"
          title="EchoOS"
          style={{
            background: 'var(--figma-yellow)',
            border: 'var(--figma-border)',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--figma-shadow)',
            margin: '0 auto',
          }}
        >
          <Zap size={28} style={{ color: 'var(--figma-black)' }} fill="currentColor" />
        </button>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          let activeBg = 'var(--figma-white)';
          if (isActive && item.id === 'contacts') activeBg = 'var(--figma-yellow)';
          if (isActive && item.id === 'calls') activeBg = 'var(--figma-blue)';
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavItem)}
              aria-label={item.label}
              title={item.label}
              style={{
              background: activeBg,
              border: 'var(--figma-border)',
              borderRadius: 'var(--figma-radius)',
              width: 62,
              height: 62,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
                boxShadow: isActive ? 'var(--figma-shadow)' : 'none',
                marginBottom: 0,
                marginTop: 0,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, background 0.2s',
              }}
            >
              <item.icon size={24} style={{ color: 'var(--figma-black)' }} />
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--figma-black)', marginTop: 4 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '0 12px 18px 12px' }}>
        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Settings"
          title="Settings"
          style={{
            background: 'var(--figma-white)',
            border: 'var(--figma-border)',
            borderRadius: 'var(--figma-radius)',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--figma-shadow)',
            margin: '0 auto',
          }}
        >
          <Settings size={24} style={{ color: 'var(--figma-black)' }} />
        </button>
      </div>
    </aside>
  );
}
