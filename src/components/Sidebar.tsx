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
    <div className="h-full w-20 flex flex-col items-center py-6 gap-6 bg-white border-r-2 border-black z-50">
      
      {/* Brand Logo - Sticker Style */}
      <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-xl font-extrabold rotate-3 hover:rotate-0 transition-transform cursor-pointer neobrutal-shadow">
        <Zap size={24} fill="currentColor" className="text-yellow-400" />
      </div>

      {/* Main Navigation - Floating Dock Items */}
      <div className="flex-1 flex flex-col gap-4 w-full px-2 mt-8">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavItem)}
              className={`
                group relative w-full aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-black transition-all duration-200
                ${isActive 
                  ? `${item.color} neobrutal-shadow translate-x-[-2px] translate-y-[-2px]` 
                  : 'bg-white hover:bg-slate-50 hover:neobrutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px]'
                }
              `}
            >
              <item.icon 
                size={24} 
                className={`mb-1 transition-transform group-hover:scale-110 ${isActive ? 'text-black' : 'text-slate-900'}`} 
                strokeWidth={2.5}
              />
              <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Settings */}
      <div className="w-full px-2 pb-2">
        <button
          onClick={() => setActiveTab('configuration')}
          className={`
            w-full aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-black transition-all duration-200
            ${activeTab === 'configuration' 
              ? 'bg-slate-900 text-white neobrutal-shadow translate-x-[-2px] translate-y-[-2px]' 
              : 'bg-white hover:bg-slate-100'
            }
          `}
        >
          <Settings size={22} strokeWidth={2.5} className={activeTab === 'configuration' ? 'animate-spin-slow' : ''} />
        </button>
      </div>
    </div>
  );
}
