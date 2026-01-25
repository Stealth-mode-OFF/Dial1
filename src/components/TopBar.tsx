import React from 'react';
import { useSales } from '../contexts/SalesContext';
import { Search, Command, Wifi, AlertCircle, Bell, User } from 'lucide-react';

export function TopBar({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user, integrations } = useSales();

  return (
    <div className="h-20 px-6 flex items-center justify-between bg-transparent pointer-events-none sticky top-0 z-40">
      
      {/* Search Bar - "Browser URL" Style */}
      <div className="flex-1 max-w-2xl pointer-events-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-black" strokeWidth={3} />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-14 py-3 border-2 border-black bg-white rounded-full text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-0 focus:neobrutal-shadow transition-all font-mono shadow-[4px_4px_0px_0px_black]"
            placeholder="Search contacts, deals, or type commands..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Side Status Indicators */}
      <div className="flex items-center gap-4 ml-6 pointer-events-auto">
        
        {/* System Status Ticket */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-full neobrutal-shadow-sm">
          <div className={`w-3 h-3 rounded-full border-2 border-black ${integrations.pipedrive ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-[10px] font-bold uppercase tracking-wide font-mono">
            SYSTEM: {integrations.pipedrive ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 bg-white border-2 border-black rounded-full hover:bg-yellow-200 transition-colors shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-0 right-0 block h-3 w-3 rounded-full border-2 border-black bg-red-500 transform translate-x-1 -translate-y-1"></span>
        </button>

        {/* User Profile - Sticker Vibe */}
        <button
          onClick={() => onNavigate?.('configuration')}
          className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-white border-2 border-black rounded-full neobrutal-shadow-sm hover:neobrutal-shadow-md transition-all"
        >
          <div className="h-8 w-8 rounded-full bg-purple-500 border-2 border-black flex items-center justify-center text-white font-bold text-xs">
            {user.avatarInitials}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-black leading-tight">{user.name.split(' ')[0]}</span>
            <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wide">{user.role}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
