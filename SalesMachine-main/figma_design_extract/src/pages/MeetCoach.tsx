import React from 'react';
import { Mic2, Play, Rewind, FastForward, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';

export function MeetCoach() {
  const { user, stats } = useSales();

  return (
    <div className="p-4 h-full flex flex-col gap-6 font-sans text-slate-900 bg-grid-pattern">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end bg-white border-2 border-black p-4 neobrutal-shadow">
         <div>
            <div className="bg-emerald-600 text-white text-xs font-mono font-bold uppercase px-2 py-0.5 inline-block mb-1 border-2 border-black">AI Trainer Active</div>
            <h1 className="text-4xl font-black text-black uppercase tracking-tighter leading-none">Drill Sergeant</h1>
         </div>
         <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
               <div className="text-xs font-bold uppercase text-slate-500">Current Level</div>
               <div className="text-2xl font-black font-mono uppercase">{user.role}</div>
            </div>
            <div className="w-16 h-16 bg-black text-yellow-400 flex items-center justify-center font-black text-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
               {stats.streak}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
         
         {/* Main Training Area */}
         <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Active Session Card */}
            <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_black] flex-1 flex flex-col justify-between relative">
               <div className="flex justify-between items-start">
                  <div className="bg-red-100 text-red-600 border-2 border-red-500 px-3 py-1 text-xs font-black uppercase flex items-center gap-2 animate-pulse shadow-[2px_2px_0px_0px_red]">
                     <div className="w-2 h-2 bg-red-600 rounded-full border border-red-600"></div> Recording
                  </div>
                  <div className="text-4xl font-mono font-black text-slate-200">00:14:23</div>
               </div>

               <div className="flex-1 flex items-center justify-center py-12">
                  <div className="relative">
                     <div className="w-48 h-48 rounded-full border-4 border-black bg-slate-50 flex items-center justify-center relative shadow-[4px_4px_0px_0px_black]">
                        <Mic2 size={64} className="text-slate-400" />
                        <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin-slow"></div>
                     </div>
                     <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 font-bold font-mono text-sm border-2 border-emerald-500 whitespace-nowrap shadow-[4px_4px_0px_0px_emerald]">
                        LISTENING...
                     </div>
                  </div>
               </div>

               <div className="border-t-4 border-dashed border-slate-200 pt-6">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 bg-slate-100 inline-block px-2">Live Feedback Stream</h3>
                  <div className="space-y-3">
                     <div className="flex gap-4 items-start border-l-4 border-green-500 pl-4 py-1">
                        <div className="bg-green-100 text-green-700 p-1 border-2 border-green-500 rounded-full">
                           <CheckCircle2 size={16} />
                        </div>
                        <div>
                           <div className="text-sm font-bold">Excellent tone modulation</div>
                           <div className="text-xs text-slate-500 font-mono">00:12:05</div>
                        </div>
                     </div>
                     <div className="flex gap-4 items-start border-l-4 border-yellow-500 pl-4 py-1">
                         <div className="bg-yellow-100 text-yellow-700 p-1 border-2 border-yellow-500 rounded-full">
                           <AlertTriangle size={16} />
                        </div>
                        <div>
                           <div className="text-sm font-bold">Missed opportunity to qualify budget</div>
                           <div className="text-xs text-slate-500 font-mono">00:13:42</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-3 gap-4">
               <button className="bg-white border-2 border-black p-4 flex items-center justify-center hover:bg-slate-100 shadow-[4px_4px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all">
                  <Rewind size={24} strokeWidth={3} />
               </button>
               <button className="bg-red-500 text-white border-2 border-black p-4 flex items-center justify-center hover:bg-red-400 shadow-[4px_4px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all group">
                  <div className="w-5 h-5 bg-white border-2 border-black group-hover:scale-90 transition-transform"></div>
               </button>
               <button className="bg-white border-2 border-black p-4 flex items-center justify-center hover:bg-slate-100 shadow-[4px_4px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all">
                  <FastForward size={24} strokeWidth={3} />
               </button>
            </div>
         </div>

         {/* Sidebar - Scenarios */}
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-yellow-300 border-2 border-black p-6 shadow-[4px_4px_0px_0px_black]">
               <h3 className="font-black text-xl uppercase mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                  <MessageSquare size={24} /> Scenarios
               </h3>
               <div className="space-y-3">
                  {['Cold Call: Gatekeeper', 'Discovery: Enterprise', 'Closing: Price Objection', 'Follow-up: Ghosting'].map((scenario, i) => (
                     <button key={i} className="w-full text-left bg-white border-2 border-black p-3 font-bold text-sm hover:translate-x-[2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_black] transition-all flex justify-between items-center group active:translate-x-0 active:translate-y-0 active:shadow-none">
                        {scenario}
                        <Play size={16} className="opacity-0 group-hover:opacity-100 transition-opacity fill-black" />
                     </button>
                  ))}
               </div>
            </div>

            <div className="bg-slate-800 text-white border-2 border-black p-6 relative overflow-hidden shadow-[4px_4px_0px_0px_black]">
               <div className="relative z-10">
                  <h3 className="font-black text-lg uppercase mb-2 text-emerald-400">Daily Challenge</h3>
                  <p className="font-mono text-sm mb-4 text-slate-300 border-l-2 border-emerald-500 pl-2">"Handle 3 objections in a row without saying 'I understand'."</p>
                  <div className="w-full bg-black border border-slate-600 h-4 mb-2 relative">
                     <div className="bg-emerald-500 h-full w-2/3 border-r border-black"></div>
                  </div>
                  <div className="text-right text-xs font-mono font-bold text-emerald-400">2/3 COMPLETED</div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
