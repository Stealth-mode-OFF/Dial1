import React from 'react';
import { 
  Layout, 
  Phone, 
  BarChart3, 
  Mic2, 
  Settings, 
  Zap 
} from 'lucide-react';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'command-center', icon: Layout, label: 'Desk', color: 'bg-yellow-300' },
    { id: 'live-campaigns', icon: Phone, label: 'Dialer', color: 'bg-pink-400' },
    { id: 'intelligence', icon: BarChart3, label: 'Stats', color: 'bg-blue-400' },
    { id: 'meet-coach', icon: Mic2, label: 'Coach', color: 'bg-emerald-400' },
  ];

  return (
    <aside className="h-screen w-[92px] flex flex-col items-center py-6 gap-5 bg-transparent z-50">
      
      {/* Brand Logo - Sticker Style */}
      <div className="w-14 h-14 bg-black text-white flex items-center justify-center text-xl font-extrabold cursor-pointer border-2 border-black rounded-sm neobrutal-shadow-sm">
        <Zap size={24} fill="currentColor" className="text-yellow-400" />
      </div>

      {/* Main Navigation - Floating Dock Items */}
      <nav className="flex-1 flex flex-col gap-4 w-full items-center mt-6">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavItem)}
              className={`
                group relative w-16 h-16 flex flex-col items-center justify-center rounded-2xl border-2 border-black transition-colors
                ${isActive ? `${item.color}` : 'bg-white hover:bg-slate-50'}
                neobrutal-shadow-sm
              `}
            >
              <item.icon 
                size={24} 
                className={`mb-1 transition-transform group-hover:scale-110 ${isActive ? 'text-black' : 'text-slate-900'}`} 
                strokeWidth={2.5}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings */}
      <div className="w-full flex items-center justify-center pb-2">
        <button
          onClick={() => setActiveTab('configuration')}
          className={`
            w-16 h-16 flex flex-col items-center justify-center rounded-2xl border-2 border-black transition-colors neobrutal-shadow-sm
            ${activeTab === 'configuration' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}
          `}
        >
          <Settings size={22} strokeWidth={2.5} className={activeTab === 'configuration' ? 'animate-spin-slow' : ''} />
        </button>
      </div>
    </aside>
  );
}
