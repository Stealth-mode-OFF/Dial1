import React from 'react';
import { Bell, Search, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type HeaderProps = {
  dailyCount: number;
  userName: string;
  title?: string;
};

export function Header({ dailyCount, userName, title }: HeaderProps) {
  return (
    <header className="h-20 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200/60">
      {/* Left: Context / Breadcrumbs */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
          {title || 'Dashboard'}
        </h2>
      </div>

      {/* Right: Metrics & Profile */}
      <div className="flex items-center gap-6">
        {/* Daily Metric - Gamified */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Dnes</span>
            <div className="flex items-center gap-1.5">
              <AnimatePresence mode='wait'>
                <motion.span 
                  key={dailyCount}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="text-lg font-bold text-slate-800 tabular-nums"
                >
                  {dailyCount}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm font-medium text-slate-500">hovorů</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dailyCount > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400'}`}>
            <Flame className={`w-5 h-5 ${dailyCount > 0 ? 'fill-orange-500 animate-pulse' : ''}`} />
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-700">{userName}</div>
            <div className="text-xs text-slate-500">Obchodník</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
