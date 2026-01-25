import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  ChevronRight,
  Zap,
  Layout,
  MoreHorizontal,
  Flame,
  Target,
  Trophy
} from 'lucide-react';

export function LiveCampaigns() {
  const [activeTab, setActiveTab] = useState<'script' | 'objections' | 'notes'>('script');

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans text-slate-900">
      
      {/* 1. TOP HUD: Session Vitals (Minimalist, Motivational) */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Target size={16} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Goal</div>
              <div className="text-sm font-bold text-slate-900">42 / 60 calls</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 rounded-lg">
              <Flame size={16} className="text-orange-500 fill-orange-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Streak</div>
              <div className="text-sm font-bold text-slate-900">8 connected</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            LIVE CALL: 02:14
          </span>
        </div>
      </div>

      {/* 2. MAIN BATTLEFIELD */}
      <div className="flex-1 overflow-hidden p-6 flex gap-6">
        
        {/* LEFT COLUMN: Prospect DNA (Context) */}
        <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Hero Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                  JD
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 leading-none">John Doe</h1>
                  <p className="text-sm font-medium text-slate-500">VP of Sales @ TechCorp</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Source</span>
                  <span className="text-sm font-bold text-slate-700">LinkedIn Outreach</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Last Touch</span>
                  <span className="text-sm font-bold text-slate-700">Email open (2h ago)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence / Why This Lead */}
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-indigo-600 fill-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">Why calling now?</h3>
            </div>
            <p className="text-sm text-indigo-900 font-medium leading-relaxed">
              Společnost TechCorp včera oznámila expanzi do regionu CEE. John pravděpodobně hledá nástroje pro škálování týmu.
            </p>
          </div>

          {/* Previous Interaction Snippet */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1">
             <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock size={14} /> History
              </h3>
            </div>
            <div className="space-y-4">
              <div className="pl-3 border-l-2 border-slate-200">
                <div className="text-xs text-slate-400 mb-1">Yesterday</div>
                <div className="text-sm text-slate-600">Gatekeeper refused transfer. Mentioned "call back after 2PM".</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Playbook (The Script & Tools) */}
        <div className="w-2/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          
          {/* Playbook Tabs */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('script')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'script' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <MessageSquare size={16} /> Live Script
            </button>
            <button 
              onClick={() => setActiveTab('objections')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'objections' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <ShieldAlert size={16} /> Battle Cards
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'notes' ? 'text-slate-800 border-b-2 border-slate-800 bg-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <FileText size={16} /> Notes
            </button>
          </div>

          {/* Dynamic Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
            
            {activeTab === 'script' && (
              <div className="space-y-6">
                {/* Active Step */}
                <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm ring-4 ring-indigo-50">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded">Current Step: Discovery</span>
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">
                    "Viděl jsem vaši zprávu o expanzi. Jak momentálně řešíte onboarding nových obchodníků v regionu?"
                  </h2>
                  <div className="text-sm text-slate-500 italic">
                    Goal: Uncover pain points regarding speed to ramp-up.
                  </div>
                </div>

                {/* Upcoming Steps (Faded) */}
                <div className="opacity-50 pointer-events-none space-y-4 grayscale">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700">Value Proposition</h3>
                    <p className="text-sm text-slate-500">We help scale sales teams 3x faster...</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'objections' && (
              <div className="grid grid-cols-2 gap-4">
                 {['Too expensive', 'Send me an email', 'Not interested', 'Using competitor'].map((obj) => (
                   <button key={obj} className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-orange-300 hover:shadow-md transition-all group">
                     <div className="text-xs font-bold text-slate-400 uppercase mb-2 group-hover:text-orange-500">Objection</div>
                     <div className="font-bold text-slate-800">{obj}</div>
                   </button>
                 ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <textarea 
                className="w-full h-full p-4 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Start typing notes..."
                autoFocus
              />
            )}
          </div>

          {/* 3. DISPOSITION DOCK (Fixed Bottom of Right Panel) */}
          <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-4 gap-3">
             <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                <Clock size={20} className="mb-1" />
                <span className="text-[10px] font-bold uppercase">Callback</span>
             </button>
             
             <button className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                <XCircle size={20} className="mb-1" />
                <span className="text-[10px] font-bold uppercase">Refused</span>
             </button>

             <button className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-3 font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform active:scale-95">
                <Calendar size={18} />
                BOOK MEETING
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}