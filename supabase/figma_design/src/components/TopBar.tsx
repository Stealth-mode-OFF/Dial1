import React from 'react';
import { Search, Bell, Command, Bot } from 'lucide-react';

export function TopBar({ onNavigate }: { onNavigate?: (tab: 'configuration') => void }) {
  return (
    <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search contacts, deals, or commands..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="bg-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
              <Command size={10} />
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex bg-[#0F172A] text-white rounded-full px-4 py-1.5 items-center gap-2 text-xs font-bold shadow-lg shadow-slate-900/10">
          <Bot size={14} className="text-emerald-400" />
          <span>SYSTEM ACTIVE</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button 
          onClick={() => onNavigate?.('configuration')}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
        >
           J
        </button>
      </div>
    </div>
  );
}
