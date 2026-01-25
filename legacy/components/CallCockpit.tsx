import React, { useState, useEffect } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Pause, Play, Clock, 
  TrendingUp, CheckCircle2, XCircle, Calendar, AlertCircle,
  Zap, RefreshCw, Database, Key, Plug, Activity, ChevronRight,
  Target, DollarSign, Users, Hourglass, ArrowRight,
  LayoutDashboard, BarChart3, Settings, LogOut,
  Maximize2, Minimize2, Sparkles, Battery
} from 'lucide-react';
import { supabaseClient } from '../utils/supabase/client';

export function CallCockpit({ contactId, onEndCall, onNavigate }: CallCockpitProps) {
  const [stage, setStage] = useState<SPINStage>('opening');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>(null);
  const [logToPipedrive, setLogToPipedrive] = useState(true);

  const [contact, setContact] = useState<any>(null);
  const [bant, setBant] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);

  async function loadContactData() {
    try {
      if (!supabaseClient || !contactId) {
        setLoadingContact(false);
        return;
      }

      const { data: contactData } = await supabaseClient
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactData) {
        setContact(contactData);
      }
      setLoadingContact(false);
    } catch (error) {
      console.error('Failed to load contact:', error);
      setLoadingContact(false);
    }
  }

  async function loadSystemHealth() {
    try {
      const connected = !!supabaseClient;
      setPipedriveSync({
        lastSync: new Date().toLocaleTimeString(),
        status: connected ? 'connected' : 'disconnected',
        contactsCount: 0
      });
    } catch (error) {
      console.error('Failed to check system health:', error);
    }
  }

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [coaching, setCoaching] = useState<any[]>([]);
  const [pipedriveSync, setPipedriveSync] = useState<any>(null);
  const [loadingContact, setLoadingContact] = useState(true);

  // Load contact and data from Supabase
  useEffect(() => {
    loadContactData();
    loadSystemHealth();
  }, [contactId]);

  // Timer
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCallDuration((prev: number) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const spinStages = [
    { id: 'opening' as SPINStage, label: 'Opening', color: 'bg-blue-500' },
    { id: 'discovery' as SPINStage, label: 'Discovery', color: 'bg-purple-500' },
    { id: 'implication' as SPINStage, label: 'Implication', color: 'bg-amber-500' },
    { id: 'need-payoff' as SPINStage, label: 'Need-Payoff', color: 'bg-green-500' },
    { id: 'close' as SPINStage, label: 'Close', color: 'bg-indigo-500' }
  ];

  const handleEndCall = async () => {
    try {
      if (!supabaseClient || !contact) return;

      // Save call record to Supabase
      const { error } = await supabaseClient.from('calls').insert([
        {
          contact_id: contact.id,
          duration: callDuration,
          outcome,
          transcript_text: transcript.map((t: any) => `${t.speaker}: ${t.text}`).join('\n'),
          stage,
          created_at: new Date().toISOString()
        }
      ]);

      if (error) {
        console.error('Failed to save call:', error);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      onEndCall();
    }
  };

  if (loadingContact) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Načítání kontaktu...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <p className="text-slate-600">Kontakt nenalezen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      
      {/* COL 1: SIDE NAV (Fixed Width) */}
      <aside className="w-[320px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">EchoOS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
           {/* Session Status Card */}
           <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session 2</span>
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              </div>
              <div className="flex items-end gap-2 mb-2">
                 <span className="text-3xl font-bold text-white">0</span>
                 <span className="text-sm text-slate-400 mb-1">calls done</span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[10%]"></div>
              </div>
           </div>

           <div className="text-xs font-bold text-slate-500 px-2 py-2 uppercase tracking-wider mt-2">Platform</div>
           <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-left">
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Command Center</span>
           </button>
           <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20 text-left">
              <Phone className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Live Campaigns</span>
              <span className="ml-auto bg-blue-500 px-2 py-0.5 rounded text-xs">12</span>
           </button>
           <button onClick={() => onNavigate('analytics')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-left">
              <BarChart3 className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Intelligence</span>
           </button>
           
           <div className="text-xs font-bold text-slate-500 px-2 py-2 uppercase tracking-wider mt-6">System</div>
           <button onClick={() => onNavigate('settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-left">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Configuration</span>
           </button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                 PT
              </div>
              <div className="flex-1 overflow-hidden">
                 <div className="font-bold text-white truncate">Pepa Trader</div>
                 <div className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Online
                 </div>
              </div>
              <Settings className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer" />
           </div>
        </div>
      </aside>

      {/* CONTENT AREA (Col 2 & 3) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
         
         {/* SLIM TOP BAR: KPIs + Audio Status */}
         <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
            {/* Search/Context */}
            <div className="flex items-center gap-4 w-1/3">
               <div className="relative w-full max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input type="text" placeholder="Search contacts, deals..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
               </div>
            </div>

            {/* Center: Audio Status (Slim) */}
            <div className="flex items-center gap-6 bg-slate-900 text-white py-1.5 px-4 rounded-full shadow-lg">
               <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-mono font-bold tracking-wider">{formatTime(callDuration)}</span>
               </div>
               <div className="w-px h-4 bg-slate-700"></div>
               <div className="flex items-center gap-2">
                   {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                   <span className="text-xs font-medium uppercase tracking-wide">{isRecording ? 'REC' : 'PAUSED'}</span>
               </div>
               <div className="w-px h-4 bg-slate-700"></div>
               <Activity className="w-4 h-4 text-green-500" />
            </div>

            {/* Right: Health Icons */}
            <div className="flex items-center justify-end gap-4 w-1/3">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex -space-x-1">
                     {systemHealth.supabase && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                     {systemHealth.openai && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                     {systemHealth.pipedrive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                  </div>
                  <span className="text-xs font-medium text-slate-600">All Systems Go</span>
               </div>
               <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 relative">
                  <AlertCircle className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
               </button>
            </div>
         </header>

         {/* MAIN GRID */}
         <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px]">
            
            {/* COL 2: MAIN COCKPIT */}
            <main className="flex flex-col h-full overflow-hidden relative">
               
               <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                  
                  {/* HERO CARD (Compact) */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                     <div className="flex items-start justify-between">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">{contact.title}</span>
                           </div>
                           <p className="text-slate-500 flex items-center gap-2">
                              {contact.company} • <span className="text-slate-400">{contact.phone}</span>
                           </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
                               ↗ ROI Calc
                            </button>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-bold border border-green-100 uppercase tracking-wide">
                               Ready
                            </span>
                        </div>
                     </div>

                     {/* SPIN Strip (Horizontal) */}
                     <div className="mt-6 flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-100 -z-0"></div>
                        
                        {spinStages.map((s, idx) => {
                           const isActive = stage === s.id;
                           const isPast = spinStages.findIndex(st => st.id === stage) > idx;
                           return (
                              <button 
                                 key={s.id}
                                 onClick={() => setStage(s.id)}
                                 className={`relative z-10 flex flex-col items-center gap-2 group transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                              >
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isActive ? `${s.color} text-white border-transparent shadow-lg` : 
                                    isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 
                                    'bg-white text-slate-300 border-slate-200'
                                 }`}>
                                    {isPast ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-1.5 h-1.5 bg-current rounded-full"></div>}
                                 </div>
                                 <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {s.label}
                                 </span>
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {/* ACTIVE CONTEXT GRID */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[400px]">
                     
                     {/* LEFT: COACHING / ACTIONS */}
                     <div className="space-y-4">
                        {/* COACHING CARD (High Importance) */}
                        <div className="bg-slate-900 rounded-2xl p-5 shadow-xl text-white overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Target className="w-24 h-24" />
                           </div>
                           <div className="relative z-10">
                              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
                                 <Sparkles className="w-4 h-4" /> Coaching Strip
                              </h3>
                              
                              <div className="space-y-6">
                                 {coaching.filter(c => c.type === 'say_next').map((item, idx) => (
                                    <div key={idx}>
                                       <div className="text-xl font-medium leading-relaxed mb-2">"{item.text}"</div>
                                       <div className="flex items-center gap-3 text-sm text-slate-400">
                                          <span>{item.why}</span>
                                          <div className="flex-1 h-px bg-slate-800"></div>
                                          <span className="font-mono text-blue-400">{Math.round(item.confidence * 100)}% Match</span>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              <div className="mt-6 pt-6 border-t border-slate-800">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">1</div>
                                    <div className="flex-1 text-sm text-slate-300">Discovery depth</div>
                                    <span className="text-xs text-slate-500">Land 3 questions</span>
                                 </div>
                                 <div className="flex items-center gap-3 mt-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">2</div>
                                    <div className="flex-1 text-sm text-slate-300">CTA Locked</div>
                                    <span className="text-xs text-slate-500">Propose 15min</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* RIGHT: TRANSCRIPT (In Center Col) */}
                     <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[300px] xl:h-auto overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 uppercase">Live Transcript</span>
                            <div className="flex gap-2">
                               <button onClick={() => setIsMuted(!isMuted)} className={`p-1.5 rounded-md ${isMuted ? 'bg-red-100 text-red-600' : 'hover:bg-slate-200 text-slate-500'}`}>
                                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                               </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-slate-50/30">
                           {transcript.map((item, idx) => (
                              <div key={idx} className={`flex gap-3 ${item.speaker === 'You' ? 'justify-end' : ''}`}>
                                 <div className={`px-3 py-2 rounded-lg max-w-[85%] ${
                                    item.speaker === 'You' ? 'bg-slate-100 text-slate-800' : 'bg-white border border-slate-200 shadow-sm text-slate-900'
                                 }`}>
                                    <p>{item.text}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                  </div>

               </div>

               {/* BOTTOM ACTIONS (Sticky) */}
               <div className="p-4 bg-white border-t border-slate-200 z-10 shrink-0">
                  <div className="flex items-center gap-4 max-w-5xl mx-auto">
                     <button onClick={handleEndCall} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all">
                        <PhoneOff className="w-5 h-5" />
                        End Call
                     </button>
                     <div className="h-8 w-px bg-slate-200"></div>
                     <div className="flex-1 grid grid-cols-4 gap-3">
                        <button onClick={() => setOutcome('meeting')} className={`${outcome === 'meeting' ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'} border rounded-lg py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2`}>
                           <Calendar className="w-4 h-4" /> Meeting
                        </button>
                        <button onClick={() => setOutcome('callback')} className={`${outcome === 'callback' ? 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-500' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'} border rounded-lg py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2`}>
                           <Clock className="w-4 h-4" /> Callback
                        </button>
                        <button onClick={() => setOutcome('not-interested')} className={`${outcome === 'not-interested' ? 'bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'} border rounded-lg py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2`}>
                           <XCircle className="w-4 h-4" /> No Interest
                        </button>
                        <button onClick={() => setOutcome('voicemail')} className={`${outcome === 'voicemail' ? 'bg-amber-100 border-amber-500 text-amber-700 ring-2 ring-amber-500' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'} border rounded-lg py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2`}>
                           <Mic className="w-4 h-4" /> Voicemail
                        </button>
                     </div>
                  </div>
               </div>
            </main>

            {/* COL 3: RIGHT RAIL (Vitals + BANT) */}
            <aside className="bg-white border-l border-slate-200 overflow-y-auto p-6 space-y-8">
               
               {/* VITALS (New) */}
               <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                     <Activity className="w-4 h-4" /> Vitals
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <div className="text-xs text-green-600 font-bold mb-1">ENERGY</div>
                        <div className="text-sm font-bold text-green-800">{vitals.energy}</div>
                     </div>
                     <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                        <div className="text-xs text-indigo-600 font-bold mb-1">MOOD</div>
                        <div className="text-sm font-bold text-indigo-800">{vitals.mood}</div>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-xs text-slate-500 font-bold mb-1">SESSION</div>
                        <div className="text-sm font-bold text-slate-700">{vitals.session}</div>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-xs text-slate-500 font-bold mb-1">STREAK</div>
                        <div className="text-sm font-bold text-slate-700">{vitals.streak}</div>
                     </div>
                  </div>
                  
                  {/* Call State Pills */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-green-200">
                         <CheckCircle2 className="w-3 h-3" /> Connected
                      </div>
                      <div className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-indigo-200">
                         <Calendar className="w-3 h-3" /> Scheduled
                      </div>
                  </div>
               </div>

               {/* BANT - CRM Context */}
               <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                     <Database className="w-4 h-4" /> CRM Context (BANT)
                  </h3>
                  <div className="space-y-4">
                     {/* Budget */}
                     <div className="group">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-bold text-slate-700">BUDGET</span>
                           {bant.budget.extracted && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-medium">Auto-filled</span>}
                        </div>
                        <div className="relative">
                           <input 
                              value={bant.budget.value} 
                              onChange={(e) => setBant({...bant, budget: {...bant.budget, value: e.target.value}})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                           />
                           <div className="absolute right-2 top-2.5 w-1.5 h-1.5 rounded-full bg-green-500" title="High Confidence"></div>
                        </div>
                     </div>
                     {/* Authority */}
                     <div className="group">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-bold text-slate-700">AUTHORITY</span>
                        </div>
                        <div className="relative">
                           <input 
                              value={bant.authority.value} 
                              onChange={(e) => setBant({...bant, authority: {...bant.authority, value: e.target.value}})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                           />
                           <div className="absolute right-2 top-2.5 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        </div>
                     </div>
                     {/* Need */}
                     <div className="group">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-bold text-slate-700">NEED (PAIN)</span>
                        </div>
                        <div className="relative">
                           <textarea 
                              value={bant.need.value} 
                              onChange={(e) => setBant({...bant, need: {...bant.need, value: e.target.value}})}
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
                           />
                        </div>
                     </div>
                     {/* Timeline */}
                     <div className="group">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-bold text-slate-700">TIMELINE</span>
                        </div>
                        <div className="relative">
                           <input 
                              value={bant.timeline.value} 
                              onChange={(e) => setBant({...bant, timeline: {...bant.timeline, value: e.target.value}})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                           />
                           {bant.timeline.extracted && <div className="absolute right-2 top-2.5 w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                        </div>
                     </div>
                  </div>
               </div>

                {/* Quick Templates */}
               <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                     <Zap className="w-4 h-4" /> Quick Responses
                  </h3>
                   <div className="space-y-2">
                     <button className="w-full text-left px-3 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                        "I understand budget is a concern..."
                     </button>
                      <button className="w-full text-left px-3 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                        "If I could show you 3x ROI..."
                     </button>
                   </div>
               </div>

            </aside>

         </div>

      </div>
    </div>
  );
}
