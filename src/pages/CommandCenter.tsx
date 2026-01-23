import React from "react";
import { useSales } from '../contexts/SalesContext';
import {
  Zap,
  ArrowRight,
  Settings2,
  Activity,
  Phone,
  Battery,
} from "lucide-react";

export function CommandCenter({ onNavigate }: { onNavigate?: (tab: 'live-campaigns' | 'intelligence' | 'configuration') => void }) {
  const { stats } = useSales();
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Supabase
            </span>
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Check VITE_SUPABASE_* and redeploy
          </span>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 uppercase">
              Pipedrive
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
          <span className="text-xs text-emerald-700 font-medium">
            Connected
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Today's Focus
          </h2>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            AI Priority Queue
          </h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Activity size={16} />
          Adjust Focus
        </button>
      </div>

      {/* Priority Queue Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white p-8 md:p-12 shadow-xl shadow-indigo-500/20 group">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
          AI Priority Queue
        </div>

        <div className="flex flex-col items-center justify-center text-center space-y-8 z-10 relative">
          <p className="text-lg md:text-xl font-medium max-w-2xl leading-relaxed opacity-90">
            Identifikováno pro okamžitý kontakt s
            pravděpodobností úspěchu {">"} 85%.
          </p>

          <button 
            onClick={() => onNavigate?.('live-campaigns')}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200 group-hover:ring-4 ring-white/20"
          >
            <Zap className="fill-slate-900" size={20} />
            Start Power Dialer
            <ArrowRight size={20} />
          </button>

          <div className="flex items-center gap-2 text-xs font-medium opacity-75 bg-black/10 px-3 py-1.5 rounded-lg">
            <Battery size={12} />
            High energy mode active
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-4">
          <button className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition-colors text-white/80">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Calls Today", value: stats.callsToday.toString(), sub: null },
          {
            label: "Pipeline",
            value: `€${stats.pipelineValue.toLocaleString()}`,
            sub: null,
            valueColor: "text-emerald-500",
          },
          { label: "Connect Rate", value: `${Math.round((stats.connected / (stats.callsToday || 1)) * 100)}%`, sub: null },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {stat.label}
            </span>
            <span
              className={`text-4xl font-bold ${stat.valueColor || "text-slate-900"}`}
            >
              {stat.value}
            </span>
          </div>
        ))}

        <div 
          onClick={() => onNavigate?.('live-campaigns')}
          className="bg-[#0F172A] rounded-2xl p-6 flex flex-col justify-between group cursor-pointer hover:bg-[#1E293B] transition-colors relative overflow-hidden"
        >
          <div className="z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Quick Action
            </span>
            <div className="flex items-center gap-2 text-white text-xl font-bold mt-2">
              Open Dialer
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </div>
          <Phone
            className="absolute -bottom-4 -right-4 text-slate-800 opacity-50"
            size={80}
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="pt-8 text-center">
        <button 
          onClick={() => onNavigate?.('intelligence')}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 mx-auto"
        >
          View activity feed & insights
          <ArrowRight size={14} className="rotate-90" />
        </button>
      </div>
    </div>
  );
}