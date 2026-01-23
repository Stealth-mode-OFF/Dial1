import React from 'react';
import { LayoutDashboard, Phone, History, Settings, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

type SidebarProps = {
  currentScreen: string;
  onNavigate: (screen: any) => void;
  onLogout: () => void;
};

export function Sidebar({ currentScreen, onNavigate, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'campaigns', icon: LayoutDashboard, label: 'Kampaně' },
    { id: 'history', icon: History, label: 'Historie' }, // Placeholder
    { id: 'settings', icon: Settings, label: 'Nastavení' }, // Placeholder
  ];

  return (
    <div className="w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col flex-shrink-0 z-50">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">Echo Dialer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-4">Menu</div>
        {menuItems.map((item) => {
          const isActive = currentScreen === item.id || (currentScreen === 'call' && item.id === 'campaigns') || (currentScreen === 'wrapup' && item.id === 'campaigns');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate('campaigns')} // For MVP, mostly going back to campaigns
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Odhlásit</span>
        </button>
      </div>
    </div>
  );
}
