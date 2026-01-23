import React, { useState } from 'react';
import { useSales } from '../contexts/SalesContext';
import { 
  Phone, 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  XCircle, 
  Clock, 
  Calendar,
  ChevronRight,
  Zap,
  Layout,
  Flame,
  Target,
  ArrowRight,
  User,
  Linkedin
} from 'lucide-react';

export function LiveCampaigns({ onNavigate }: { onNavigate?: (tab: 'command-center') => void }) {
  const [activeTab, setActiveTab] = useState<'script' | 'objections' | 'notes'>('script');
  const { 
    stats, 
    currentLead, 
    liveNote, 
    scriptStep,
    recentActivity,
    setLiveNote, 
    setScriptStep,
    incrementCalls, 
    recordConnection, 
    recordObjection, 
    bookMeeting, 
    nextLead 
  } = useSales();

  const handleBookMeeting = () => {
    bookMeeting();
    setTimeout(() => {
        nextLead();
        onNavigate?.('command-center');
    }, 1500);
  };

  const handleCallResult = (type: 'callback' | 'refused') => {
      incrementCalls();
      if (type === 'refused') recordConnection(false);
      nextLead();
  };

  const handleObjectionClick = (objection: string) => {
    recordObjection(objection);
  };

  const scriptSteps = [
    {
      title: "Discovery",
      text: `"Viděl jsem vaši zprávu o expanzi, ${currentLead.name.split(' ')[0]}. Jak momentálně řešíte onboarding nových obchodníků v regionu?"`,
      goal: "Uncover pain points regarding speed to ramp-up."
    },
    {
      title: "Value Proposition",
      text: `"Pomáháme týmům jako ${currentLead.company} škálovat o 300% rychleji díky automatizaci tréninku. Zní to jako něco, co byste chtěli prozkoumat?"`,
      goal: "Establish relevance and hook interest."
    },
    {
      title: "Closing",
      text: `"Navrhuji krátkou 15minutovou ukázku příští úterý. Jak jste na tom časově?"`,
      goal: "Secure the meeting."
    }
  ];

  return (
    <div className="flex flex-col h-full font-sans text-slate-900 gap-4">
      
      {/* 1. RETRO HUD */}
      <div className="h-16 bg-white border-2 border-black neobrutal-shadow flex items-center justify-between px-4 shrink-0 mx-2 mt-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate?.('command-center')}
            className="flex items-center gap-2 text-black hover:text-red-600 transition-colors font-black text-xs uppercase tracking-wider border-2 border-transparent hover:border-black px-2 py-1"
          >
            <Layout size={16} />
            EJECT_SESSION
          </button>
          
          <div className="h-8 w-0.5 bg-black"></div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Goal Progress</span>
                <div className="w-32 h-3 border-2 border-black bg-slate-100 relative">
                    <div 
                        className="h-full bg-yellow-400 absolute top-0 left-0" 
                        style={{ width: `${(stats.callsToday / stats.callsGoal) * 100}%` }}
                    ></div>
                </div>
             </div>
             <div className="font-mono font-bold text-sm">{stats.callsToday}/{stats.callsGoal}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-1 bg-red-500 border-2 border-black text-white text-xs font-mono font-bold flex items-center gap-2 shadow-[2px_2px_0px_0px_black] animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            REC • 02:14
          </div>
        </div>
      </div>

      {/* 2. MAIN BATTLEFIELD */}
      <div className="flex-1 overflow-hidden p-2 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: THE DOSSIER (Prospect Info) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
          
          {/* Identity Card */}
          <div className="bg-[#fffdf5] border-2 border-black p-6 relative neobrutal-shadow rotate-[-1deg]">
            <div className="absolute top-0 right-0 p-2">
                <Linkedin className="text-blue-700" size={24} />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 border-2 border-black bg-black text-white flex items-center justify-center text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                {currentLead.name.split(' ')[0][0]}
              </div>
              <div>
                <h1 className="text-2xl font-black text-black leading-none">{currentLead.name}</h1>
                <p className="text-sm font-mono font-bold text-slate-600 mt-1">{currentLead.title}</p>
                <p className="text-sm font-bold text-black border-b-2 border-yellow-300 inline-block">@{currentLead.company}</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-black/10 pb-1">
                <span className="font-bold text-slate-500">SOURCE</span>
                <span className="font-bold">LINKEDIN_OUTREACH</span>
              </div>
              <div className="flex justify-between border-b border-black/10 pb-1">
                <span className="font-bold text-slate-500">LOCATION</span>
                <span className="font-bold">PRAGUE, CZ</span>
              </div>
            </div>
          </div>

          {/* Intelligence Note - "Sticky Note" style */}
          <div className="bg-yellow-200 border-2 border-black p-4 shadow-[4px_4px_0px_0px_black] rotate-1">
            <div className="flex items-center gap-2 mb-2 border-b-2 border-black pb-1">
              <Zap size={16} fill="black" />
              <h3 className="text-xs font-black uppercase tracking-wider">Intel / Context</h3>
            </div>
            <p className="text-sm font-bold font-mono leading-tight">
              Společnost {currentLead.company} včera oznámila expanzi do regionu CEE. Pravděpodobně hledají nástroje pro škálování.
            </p>
          </div>

          {/* History Log */}
          <div className="bg-white border-2 border-black p-4 flex-1 overflow-y-auto max-h-60">
             <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} /> Interaction Log
              </h3>
            </div>
            <div className="space-y-4">
              {/* Dynamic Activity Log */}
              {recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                      <div key={log.id} className="pl-3 border-l-4 border-slate-300">
                        <div className="text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase">{log.timestamp}</div>
                        <div className="text-xs font-bold">{log.description}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">Score: {log.score}/100</div>
                      </div>
                  ))
              ) : (
                  <div className="text-xs font-mono text-slate-400 italic">No recent activity found.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE PLAYBOOK (Script & Tools) */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white border-2 border-black neobrutal-shadow overflow-hidden relative">
          
          {/* Tabs - File Folder Style */}
          <div className="flex border-b-2 border-black bg-slate-100">
            <button 
              onClick={() => setActiveTab('script')}
              className={`flex-1 py-3 text-sm font-black uppercase flex items-center justify-center gap-2 transition-all border-r-2 border-black ${activeTab === 'script' ? 'bg-white text-black translate-y-[2px]' : 'bg-slate-200 text-slate-500 hover:bg-white'}`}
            >
              <MessageSquare size={16} strokeWidth={3} /> Script
            </button>
            <button 
              onClick={() => setActiveTab('objections')}
              className={`flex-1 py-3 text-sm font-black uppercase flex items-center justify-center gap-2 transition-all border-r-2 border-black ${activeTab === 'objections' ? 'bg-white text-orange-600 translate-y-[2px]' : 'bg-slate-200 text-slate-500 hover:bg-white'}`}
            >
              <ShieldAlert size={16} strokeWidth={3} /> Counter-Attacks
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-sm font-black uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'notes' ? 'bg-white text-blue-600 translate-y-[2px]' : 'bg-slate-200 text-slate-500 hover:bg-white'}`}
            >
              <FileText size={16} strokeWidth={3} /> Scratchpad
            </button>
          </div>

          {/* Content Area - Notebook Paper */}
          <div className="flex-1 p-6 overflow-y-auto bg-white relative" style={{ backgroundImage: 'linear-gradient(#00000010 1px, transparent 1px)', backgroundSize: '100% 2rem' }}>
            
            {activeTab === 'script' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                {/* Active Step Card */}
                <div className="bg-white p-6 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative group">
                  <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 text-xs font-mono font-bold uppercase">
                      Step {scriptStep + 1}/{scriptSteps.length}
                  </div>
                  
                  <h2 className="text-xl md:text-2xl font-bold text-black mt-6 mb-4 leading-snug font-display">
                    {scriptSteps[scriptStep].text}
                  </h2>
                  
                  <div className="flex items-center justify-between border-t-2 border-slate-100 pt-4 mt-4">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase">
                        Mission: {scriptSteps[scriptStep].goal}
                    </div>
                    <button 
                      onClick={() => setScriptStep((scriptStep + 1) % scriptSteps.length)}
                      className="text-black hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm font-black uppercase border-2 border-transparent hover:border-black px-2 py-1"
                    >
                      Next <ChevronRight size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Upcoming Steps (Faded) */}
                {scriptStep < scriptSteps.length - 1 && (
                  <div className="opacity-40 grayscale pointer-events-none border-2 border-dashed border-slate-400 p-4">
                      <h3 className="font-bold text-slate-700 uppercase mb-1">{scriptSteps[scriptStep + 1].title}</h3>
                      <p className="text-sm text-slate-600 truncate font-mono">{scriptSteps[scriptStep + 1].text}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'objections' && (
              <div className="grid grid-cols-2 gap-4">
                 {['Too expensive', 'Send me an email', 'Not interested', 'Using competitor'].map((obj) => (
                   <button 
                    key={obj} 
                    onClick={() => handleObjectionClick(obj)}
                    className="p-4 bg-white border-2 border-black text-left hover:bg-orange-50 hover:shadow-[4px_4px_0px_0px_orange] transition-all group active:translate-y-1 active:shadow-none"
                   >
                     <div className="text-xs font-black text-slate-400 uppercase mb-2 group-hover:text-orange-600">Objection Detected</div>
                     <div className="font-bold text-lg text-black">{obj}</div>
                   </button>
                 ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <textarea 
                value={liveNote}
                onChange={(e) => setLiveNote(e.target.value)}
                className="w-full h-full p-4 bg-transparent border-2 border-black resize-none focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_black] transition-all font-mono text-sm leading-relaxed"
                placeholder="> Start typing call notes..."
                autoFocus
              />
            )}
          </div>

          {/* 3. ACTION DOCK */}
          <div className="p-4 bg-slate-50 border-t-2 border-black grid grid-cols-4 gap-4">
             <button 
               onClick={() => handleCallResult('callback')}
               className="flex items-center justify-center gap-2 p-3 border-2 border-black bg-white hover:bg-blue-100 font-bold uppercase text-sm shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all"
             >
                <Clock size={18} /> Callback
             </button>
             
             <button 
               onClick={() => handleCallResult('refused')}
               className="flex items-center justify-center gap-2 p-3 border-2 border-black bg-white hover:bg-red-100 font-bold uppercase text-sm shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all"
             >
                <XCircle size={18} /> Refused
             </button>

             <button 
                onClick={handleBookMeeting}
                className="col-span-2 bg-black text-white hover:bg-slate-800 border-2 border-black flex items-center justify-center gap-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
             >
                <Calendar size={18} className="text-yellow-400" />
                BOOK MEETING
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
