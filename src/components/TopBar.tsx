import React from 'react';
import { Bell, Command, Search } from 'lucide-react';
import { useAuth } from '../app/AuthContext';
import { useWorkspace } from '../app/WorkspaceContext';

interface TopBarProps {
  onNavigateSettings?: () => void;
}

export function TopBar({ onNavigateSettings }: TopBarProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const label = user?.email ?? 'User';
  const workspaceName = workspace?.name ?? '';

  return (
    <div
      style={{
        padding: '22px 24px 14px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 18,
        background: 'var(--figma-white)',
        borderBottom: 'var(--figma-border)',
        boxShadow: 'var(--figma-shadow)',
        zIndex: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--figma-white)',
            border: 'var(--figma-border)',
            borderRadius: 12,
            boxShadow: 'var(--figma-shadow)',
            padding: '0 16px',
            height: 52,
            fontFamily: 'var(--figma-font-body)',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '0.01em',
            position: 'relative',
          }}
        >
          <Search size={20} style={{ color: 'var(--figma-black)', marginRight: 10 }} />
          <input
            type="text"
            placeholder="Search contacts, deals, or type commands..."
            style={{
              flex: 1,
              background: 'transparent',
              outline: 'none',
              fontSize: 15,
              fontFamily: 'var(--figma-font-body)',
              fontWeight: 700,
              color: 'var(--figma-black)',
              border: 'none',
            }}
          />
          <div
            aria-label="Keyboard shortcut"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--figma-black)',
              color: 'var(--figma-white)',
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 900,
              fontSize: 13,
              marginLeft: 10,
              gap: 4,
            }}
          >
            <Command size={14} />
            <span>K</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--figma-black)',
            color: 'var(--figma-white)',
            borderRadius: 8,
            fontFamily: 'var(--figma-font-body)',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '0.08em',
            padding: '0 12px',
            height: 34,
            boxShadow: 'var(--figma-shadow)',
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              background: 'var(--figma-green)',
              borderRadius: '50%',
              marginRight: 8,
            }}
            aria-hidden="true"
          />
          <span>SYSTEM: ONLINE</span>
        </div>

        <button
          aria-label="Notifications"
          style={{
            background: 'var(--figma-white)',
            border: 'var(--figma-border)',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: 'var(--figma-shadow)',
          }}
        >
          <Bell size={20} style={{ color: 'var(--figma-black)' }} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, background: 'var(--figma-red)', borderRadius: '50%', border: '2px solid var(--figma-white)' }}></span>
        </button>

        <button
          aria-label="User menu"
          onClick={onNavigateSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--figma-white)',
            border: 'var(--figma-border)',
            borderRadius: 8,
            boxShadow: 'var(--figma-shadow)',
            padding: '0 10px 0 0',
            height: 44,
            fontFamily: 'var(--figma-font-body)',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '0.08em',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--figma-purple)',
              border: '2px solid var(--figma-black)',
              boxShadow: 'var(--figma-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 16,
              color: 'var(--figma-black)',
            }}
          >
            {(label[0] || 'U').toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'flex-start', paddingRight: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--figma-black)' }}>{label}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--figma-font-body)', fontWeight: 700, opacity: 0.7 }}>
              {workspaceName ? `Workspace: ${workspaceName}` : ''}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
