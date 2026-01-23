import React from 'react';
import { useSales } from '../contexts/SalesContext';
import { 
  LayoutDashboard, 
  PhoneCall, 
  BarChart2, 
  Video, 
  Settings, 
  Zap, 
  Battery, 
} from 'lucide-react';

type NavItem = 'command-center' | 'live-campaigns' | 'intelligence' | 'meet-coach' | 'configuration';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { stats, user } = useSales();
  const navItems = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'live-campaigns', label: 'Live Campaigns', icon: PhoneCall, badge: stats.callsGoal - stats.callsToday > 0 ? stats.callsGoal - stats.callsToday : null },
    { id: 'intelligence', label: 'Intelligence', icon: BarChart2 },
    { id: 'meet-coach', label: 'Meet Coach', icon: Video },
  ];

  const systemItems = [
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#0F172A] text-slate-300 flex flex-col h-screen border-r border-slate-800">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          <Zap size={20} fill="currentColor" />
        </div>
        <span className="text-white text-xl font-bold tracking-tight">EchoOS</span>
      </div>

      {/* Session Info */}
      <div className="mx-4 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Session Active</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">{stats.callsToday}</div>
        <div className="text-xs text-slate-500 mb-3">calls done today</div>
        <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((stats.callsToday / stats.callsGoal) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Platform</div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavItem)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20'
                    : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-md font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">System</div>
          <div className="space-y-1">
            {systemItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavItem)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20'
                    : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="mb-4">
           <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Energy Level</span>
              <Battery size={14} className={user.energyLevel > 50 ? "text-emerald-500" : "text-orange-500"} />
           </div>
           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${user.energyLevel > 50 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                style={{ width: `${user.energyLevel}%` }}
              ></div>
           </div>
        </div>
        
        <div 
          onClick={() => setActiveTab('configuration')}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
            {user.avatarInitials}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.role} · {user.status}</div>
          </div>
          <Settings size={14} className="text-slate-500" />
        </div>
      </div>
    </div>
  );
}
