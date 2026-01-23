import React, { useState } from "react";
import { useSales } from '../contexts/SalesContext';
import {
  Zap,
  ArrowRight,
  Settings2,
  Activity,
  Phone,
  Battery,
  Target,
  Flame,
  X,
  Sticker,
  Coffee,
  Crown
} from "lucide-react";

export function CommandCenter({ onNavigate }: { onNavigate?: (tab: 'live-campaigns' | 'intelligence' | 'configuration') => void }) {
  const { stats, integrations } = useSales();
  const [focusMode, setFocusMode] = useState<'volume' | 'quality' | 'closing'>('quality');
  const [isAdjustingFocus, setIsAdjustingFocus] = useState(false);

  const focusConfig = {
    volume: { 
        label: 'High Volume', 
        bg: 'bg-blue-400', 
        border: 'border-blue-500', 
        icon: Zap, 
        desc: 'Maximum calls per hour. Speed run mode.' 
    },
    quality: { 
        label: 'High Quality', 
        bg: 'bg-purple-400', 
        border: 'border-purple-500', 
        icon: Crown, 
        desc: 'Identified for immediate contact (Prob > 85%).' 
    },
    closing: { 
        label: 'Closing Mode', 
        bg: 'bg-emerald-400', 
        border: 'border-emerald-500', 
        icon: Flame, 
        desc: 'Bottom-of-funnel only. Glengarry Glen Ross style.' 
    }
  };
  
  return (
    <div className="p-2 space-y-6 relative">
      
      {/* Focus Adjust Overlay - Looks like a sticky note */}
      {isAdjustingFocus && (
        <div className="absolute top-16 right-0 z-30 bg-yellow-100 border-2 border-black neobrutal-shadow p-4 w-72 rotate-1 animate-in fade-in slide-in-from-top-4 duration-200">
           <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
             <h3 className="text-sm font-black text-black uppercase tracking-wide font-mono">SELECT_MODE</h3>
             <button onClick={() => setIsAdjustingFocus(false)} className="text-black hover:rotate-90 transition-transform"><X size={20} strokeWidth={3} /></button>
           </div>
           <div className="space-y-3">
             {(['volume', 'quality', 'closing'] as const).map((mode) => (
               <button
                 key={mode}
                 onClick={() => { setFocusMode(mode); setIsAdjustingFocus(false); }}
                 className={`w-full text-left p-3 border-2 border-black transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_black] ${focusMode === mode ? 'bg-black text-white' : 'bg-white text-black'}`}
               >
                 <div className="font-bold text-sm uppercase font-mono">{focusConfig[mode].label}</div>
                 <div className={`text-xs mt-1 ${focusMode === mode ? 'text-slate-300' : 'text-slate-500'}`}>{focusConfig[mode].desc}</div>
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT COLUMN: The "Notebook" List (Replacing huge card) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Header Area */}
            <div className="flex justify-between items-end bg-white border-2 border-black p-4 neobrutal-shadow relative overflow-hidden">
                <div className="bg-grid-pattern absolute inset-0 opacity-50 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase">Today's Mission</span>
                        <span className="bg-yellow-300 text-black px-2 py-0.5 text-xs font-mono font-bold uppercase border-2 border-black transform -rotate-2">
                            {new Date().toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter leading-none">
                        PRIORITY QUEUE
                    </h1>
                </div>
                <button 
                    onClick={() => setIsAdjustingFocus(!isAdjustingFocus)}
                    className="relative z-10 bg-white border-2 border-black px-4 py-2 font-bold text-sm hover:bg-slate-100 flex items-center gap-2 shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none"
                >
                    <Settings2 size={16} />
                    ADJUST FOCUS
                </button>
            </div>

            {/* The "Main Task" Card - Looks like a key card */}
            <div className={`relative border-2 border-black p-8 neobrutal-shadow flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden group ${focusConfig[focusMode].bg}`}>
                {/* Decorative background texture */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 pointer-events-none"></div>
                
                <div className="relative z-10 flex-1">
                    <div className="inline-block bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase mb-4 shadow-[2px_2px_0px_0px_black] rotate-1">
                        Current Mode: {focusConfig[focusMode].label}
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-black border-l-4 border-black pl-4 leading-tight">
                        {focusConfig[focusMode].desc}
                    </p>
                    <div className="mt-4 flex items-center gap-2 font-mono text-sm font-bold text-black/80">
                        <Battery size={16} fill="black" />
                        <span>ENERGY LEVEL: OPTIMAL</span>
                    </div>
                </div>

                <div className="relative z-10">
                    <button 
                        onClick={() => onNavigate?.('live-campaigns')}
                        className="bg-white text-black border-2 border-black px-8 py-4 text-xl font-black flex items-center gap-3 shadow-[8px_8px_0px_0px_black] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_black] transition-all active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_black]"
                    >
                        START DIALING
                        <ArrowRight size={24} strokeWidth={3} />
                    </button>
                </div>
                
                {/* Sticker Decor */}
                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Sticker size={64} className="text-black rotate-12" />
                </div>
            </div>

            {/* Integration Status Strips */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border-2 border-black p-3 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <span className="font-mono text-xs font-bold uppercase">Database Sync</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">ONLINE</span>
                        <div className="w-3 h-3 bg-green-400 border-2 border-black rounded-full animate-pulse"></div>
                    </div>
                </div>
                <div className={`border-2 border-black p-3 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${integrations.pipedrive ? 'bg-white' : 'bg-slate-100'}`}>
                    <span className="font-mono text-xs font-bold uppercase">CRM Connection</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{integrations.pipedrive ? 'CONNECTED' : 'OFFLINE'}</span>
                        <div className={`w-3 h-3 border-2 border-black rounded-full ${integrations.pipedrive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Stats as "Stickies" */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Main Stats Card */}
            <div className="bg-white border-2 border-black p-6 neobrutal-shadow relative">
                <div className="absolute -top-3 -right-3 bg-yellow-400 border-2 border-black px-2 py-1 rotate-3 shadow-sm z-10">
                    <span className="text-xs font-black uppercase">LIVE STATS</span>
                </div>

                <div className="space-y-6 divide-y-2 divide-dashed divide-slate-300">
                    <div className="pt-2">
                        <div className="text-xs font-mono font-bold text-slate-500 mb-1">CALLS_TODAY</div>
                        <div className="text-5xl font-black text-black tracking-tighter">{stats.callsToday}</div>
                    </div>
                    <div className="pt-4">
                        <div className="text-xs font-mono font-bold text-slate-500 mb-1">PIPELINE_VALUE</div>
                        <div className="text-3xl font-black text-emerald-600 tracking-tighter">€{stats.pipelineValue.toLocaleString()}</div>
                    </div>
                    <div className="pt-4">
                        <div className="text-xs font-mono font-bold text-slate-500 mb-1">CONNECT_RATE</div>
                        <div className="text-3xl font-black text-black tracking-tighter">{Math.round((stats.connected / (stats.callsToday || 1)) * 100)}%</div>
                    </div>
                </div>
            </div>

            {/* Quick Link - Sticker Style */}
            <button 
                onClick={() => onNavigate?.('intelligence')}
                className="w-full bg-pink-400 border-2 border-black p-4 neobrutal-shadow flex items-center justify-between group hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
                <div className="text-left">
                    <div className="font-black text-lg text-black uppercase leading-none">View Reports</div>
                    <div className="font-mono text-xs font-bold text-black/70">DEEP_DIVE_ANALYSIS.EXE</div>
                </div>
                <Activity className="text-black group-hover:rotate-12 transition-transform" size={24} strokeWidth={3} />
            </button>
            
             <div className="text-center">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                    <Coffee size={12} />
                    <span>Take a break in 45m</span>
                </div>
             </div>

        </div>
      </div>
    </div>
  );
}
