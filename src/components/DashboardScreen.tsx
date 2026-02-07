import { useState, useEffect } from 'react';
import { 
  Zap, Activity, Calendar, ArrowRight, CheckCircle2, 
  Clock, TrendingUp, MessageSquare, AlertCircle, MoreHorizontal, Target, BrainCircuit,
  Battery, Smile, Meh, Frown, BatteryLow, BatteryMedium, BatteryFull,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { EnergyLevel, MoodLevel, Campaign } from '../types/legacy';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type DashboardScreenProps = {
  onNavigate: (screen: any) => void;
  energy: EnergyLevel;
  mood: MoodLevel;
  onCheckIn: (energy: EnergyLevel, mood: MoodLevel) => void;
  campaigns: Campaign[];
};

export function DashboardScreen({ onNavigate, energy, mood, onCheckIn, campaigns }: DashboardScreenProps) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Local state for the modal selection before confirming
  const [tempEnergy, setTempEnergy] = useState<EnergyLevel>(energy);
  const [tempMood, setTempMood] = useState<MoodLevel>(mood);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/analytics`, {
                headers: { 'Authorization': `Bearer ${publicAnonKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Dashboard fetch error", e);
        } finally {
            setIsLoading(false);
        }
    };
    fetchStats();
  }, []);

  const handleAgendaCheckIn = () => {
    setTempEnergy(energy);
    setTempMood(mood);
    setShowCheckIn(true);
  };

  const confirmCheckIn = () => {
    onCheckIn(tempEnergy, tempMood);
    setShowCheckIn(false);
  };

  // Logic to determine the main focus based on energy/mood
  const getMainFocus = () => {
    // Calculate real remaining contacts from all campaigns
    const totalContacts = campaigns.reduce((sum, campaign) => sum + (campaign.contacts?.length || 0), 0);
    const remainingContacts = totalContacts;
    if (energy === 'low' || mood === 'bad') {
      return {
        title: 'Deep Work Focus',
        subtitle: 'Admin & CRM Cleanup',
        description: 'Tvoje energie je dnes nižší. AI doporučuje vyhnout se cold callům a soustředit se na administrativu a e-maily.',
        action: 'Start Email Sequence',
        icon: <MessageSquare className="w-4 h-4 fill-indigo-900" />,
        gradient: 'from-slate-600 to-slate-800',
        leadsCount: 'Recovery Mode',
        badge: 'RECOVERY MODE',
        badgeColor: 'bg-slate-700',
        patternOpacity: 0.05
      };
    }
    return {
      title: 'AI Priority Queue',
      subtitle: `${remainingContacts} Leads`,
      description: <>Identifikováno pro okamžitý kontakt s pravděpodobností úspěchu <strong>&gt; 85%</strong>.</>,
      action: 'Start Power Dialer',
      icon: <Zap className="w-4 h-4 fill-indigo-900" />,
      gradient: 'from-indigo-600 to-purple-700',
      leadsCount: remainingContacts > 0 ? `${remainingContacts}` : 'No Leads',
      badge: 'AI PRIORITY QUEUE',
      badgeColor: 'bg-white/20',
      patternOpacity: 0.2
    };
  };

  const focus = getMainFocus();
  const recentActivity = stats?.recentActivity || [];
  const activityData = stats?.dailyVolume || [];

  return (
    <div
      className="p-8 max-w-7xl mx-auto space-y-8 pb-20 relative"
      style={{
        background: 'var(--figma-grid-bg)',
        minHeight: '100vh',
        fontFamily: 'var(--figma-font-body)',
      }}
    >
      {/* CHECK-IN MODAL */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-indigo-600" /> Daily Check-in
               </h2>
               <p className="text-sm text-slate-500">Adjust your workflow based on your current state.</p>
             </div>
             <div className="p-6 space-y-6">
               {/* Energy Selection */}
               <div>
                 <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Current Energy</label>
                 <div className="grid grid-cols-3 gap-3">
                   <button 
                    onClick={() => setTempEnergy('low')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempEnergy === 'low' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <BatteryLow className={`w-6 h-6 ${tempEnergy === 'low' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">Low</span>
                   </button>
                   <button 
                    onClick={() => setTempEnergy('medium')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempEnergy === 'medium' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <BatteryMedium className={`w-6 h-6 ${tempEnergy === 'medium' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">Medium</span>
                   </button>
                   <button 
                    onClick={() => setTempEnergy('high')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempEnergy === 'high' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <BatteryFull className={`w-6 h-6 ${tempEnergy === 'high' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">High</span>
                   </button>
                 </div>
               </div>
               {/* Mood Selection */}
               <div>
                 <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Mood</label>
                 <div className="grid grid-cols-3 gap-3">
                   <button 
                    onClick={() => setTempMood('bad')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempMood === 'bad' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <Frown className={`w-6 h-6 ${tempMood === 'bad' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">Off</span>
                   </button>
                   <button 
                    onClick={() => setTempMood('neutral')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempMood === 'neutral' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <Meh className={`w-6 h-6 ${tempMood === 'neutral' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">Okay</span>
                   </button>
                   <button 
                    onClick={() => setTempMood('good')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${tempMood === 'good' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                   >
                     <Smile className={`w-6 h-6 ${tempMood === 'good' ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className="text-xs font-bold">Great</span>
                   </button>
                 </div>
               </div>
             </div>
             <div className="p-6 pt-2 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={confirmCheckIn}
                 className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
               >
                 Update Agenda
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1
            style={{
              fontFamily: 'var(--figma-font-heading)',
              fontSize: 'var(--figma-font-size-xl)',
              color: 'var(--figma-black)',
              letterSpacing: '-0.04em',
              fontWeight: 900,
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              textShadow: 'var(--figma-shadow)',
            }}
          >
            Mission Control
          </h1>
          <p style={{ color: 'var(--figma-black)', fontSize: 'var(--figma-font-size-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Estimated Pipeline Value:
            <span style={{ color: 'var(--figma-green)', fontWeight: 700, background: '#E8F5E9', padding: '2px 8px', borderRadius: 6, border: '1.5px solid #B9F6CA', fontSize: 'var(--figma-font-size-sm)' }}>
              €{stats?.revenue || 0}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAgendaCheckIn}
            style={{
              background: 'var(--figma-black)',
              color: 'var(--figma-white)',
              padding: '10px 20px',
              borderRadius: 'var(--figma-radius)',
              fontWeight: 700,
              fontSize: 'var(--figma-font-size-sm)',
              boxShadow: 'var(--figma-shadow)',
              border: 'var(--figma-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Calendar className="w-4 h-4" /> Today's Agenda
          </button>
        </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-12 grid-rows-2 gap-6 h-[500px]" data-testid="stats-container">
        {/* 1. MAIN FOCUS CARD (Dynamic based on Energy) */}
        <div 
          onClick={() => onNavigate('live-campaigns')}
          className={`col-span-8 row-span-2 bg-gradient-to-br ${focus.gradient} rounded-3xl p-8 relative overflow-hidden group cursor-pointer shadow-2xl shadow-indigo-900/20 transition-transform hover:scale-[1.01]`}
        >
           {/* Background Pattern */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
           <div className={`absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity duration-500`}>
             <Target className="w-64 h-64 text-white rotate-12" />
           </div>

           <div className="relative z-10 h-full flex flex-col">
             <div className="flex justify-between items-start">
               <span className={`backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${focus.badgeColor}`}>
                 {focus.badge}
               </span>
               <ArrowRight className="w-6 h-6 text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
             </div>
             <div className="mt-auto">
               <div className="text-6xl font-bold text-white mb-2 tracking-tighter">{focus.leadsCount}</div>
               <p className="text-indigo-100 text-lg max-w-md mb-8 font-light leading-relaxed">
                 {focus.description}
               </p>
               <div className="flex items-center gap-4">
                 <button className="bg-white text-indigo-900 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-xl flex items-center gap-2">
                   {focus.icon} {focus.action}
                 </button>
                 {/* Only show avatars if High Energy */}
                 {energy !== 'low' && (
                   <div className="flex -space-x-2">
                     {[1,2,3].map(i => (
                       <div key={i} className="w-10 h-10 rounded-full bg-indigo-400 border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                         {String.fromCharCode(64+i)}
                       </div>
                     ))}
                     <div className="w-10 h-10 rounded-full bg-indigo-900/50 border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                       +9
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
        </div>

        {/* 2. CALLS TODAY METRIC */}
        <div className="col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center mb-2">
             <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Calls Today</span>
             <Activity className="w-4 h-4 text-indigo-500" />
           </div>
           <div className="text-3xl font-bold text-slate-900 tracking-tight">{stats?.callsToday || 0}</div>
           <div className="-mb-6 -mx-6 opacity-50" style={{ width: 'calc(100% + 48px)', height: 96 }}>
             <ResponsiveContainer width="100%" height={96}>
               <AreaChart data={activityData}>
                 <defs>
                   <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorVal)" strokeWidth={3} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 3. NEXT ACTION */}
        <div className="col-span-4 bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Next Action</span>
             <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">Now</span>
           </div>
           <div className="font-bold text-slate-900 text-lg leading-tight mb-1">Resume Calling</div>
           <div className="text-sm text-slate-500 mb-6">Pipedrive Sync Active</div>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold"><Zap className="w-3 h-3" /></div>
                <span className="text-xs font-bold text-indigo-600">Power Dialer</span>
              </div>
	              <button onClick={() => onNavigate('live-campaigns')} className="text-xs font-bold text-indigo-600 hover:underline">Open Dialer</button>
           </div>
        </div>
      </div>

      {/* BOTTOM ROW: LIVE FEED & INSIGHTS */}
      <div className="grid grid-cols-12 gap-6">
         {/* Live Signals Feed */}
         <div className="col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-1 min-h-[300px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Live Activity Feed
              </h3>
            </div>
            {isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : recentActivity.filter((item: any) => new Date(item.id).toDateString() === new Date().toDateString()).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No activity today. Start calling!</div>
            ) : (
                <div className="divide-y divide-slate-50">
                {recentActivity.filter((item: any) => new Date(item.id).toDateString() === new Date().toDateString()).map((signal: any) => (
                  <div key={signal.id} className="flex items-center gap-4 px-6 py-3 group hover:bg-indigo-50 transition-colors">
                    <div className="p-2 rounded-lg bg-indigo-100">
                      {signal.type === 'call' ? <Zap className="w-4 h-4 text-amber-500" /> : signal.type === 'email' ? <MessageSquare className="w-4 h-4 text-blue-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">{signal.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{signal.time}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 shadow-sm px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200">{signal.action}</button>
                  </div>
                ))}
                </div>
            )}
         </div>

         {/* AI Insight */}
         <div className="col-span-4 bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <BrainCircuit className="w-32 h-32 text-purple-400" />
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-purple-300 flex items-center gap-2 mb-2 text-sm">
                <BrainCircuit className="w-5 h-5 text-purple-400" /> AI Coach
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {stats?.connectRate > 30
                  ? "Great momentum today. Your connect rate is above average. Keep riding the wave."
                  : "Connect rate is lower than usual. Try calling decision makers' mobiles directly."}
              </p>
            </div>
         </div>
      </div>
    </div>
  );
}
