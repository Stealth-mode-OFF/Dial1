import { useState, useEffect } from 'react';
import { 
  Terminal, Shield, Target, Flame, 
  ChevronRight, BrainCircuit, RefreshCw, Briefcase, 
  Users, CheckCircle2, AlertTriangle, Play
} from 'lucide-react';
import type { Contact } from '../../App';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';

type DailyBriefingProps = {
  onStartSession: (contacts: Contact[]) => void;
  isLoading: boolean;
};

export function DailyBriefing({ onStartSession, isLoading: initialLoading }: DailyBriefingProps) {
  const [loading, setLoading] = useState(initialLoading);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [briefingStep, setBriefingStep] = useState<'scanning' | 'analysis' | 'ready'>('scanning');
  const [analysisText, setAnalysisText] = useState("");
  
  // Stats
  const [highValueCount, setHighValueCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [totalPotential, setTotalPotential] = useState(0);

  // Initial Fetch
  useEffect(() => {
    fetchPipedriveData();
  }, []);

  const fetchPipedriveData = async () => {
    setLoading(true);
    setBriefingStep('scanning');
    
    try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/pipedrive/contacts`, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        // Assuming data[0] is the campaign object
        const incomingContacts = data[0]?.contacts || [];
        
        setContacts(incomingContacts);
        
        // Compute Stats
        const highVal = incomingContacts.filter((c: any) => c.p_deals_count > 0).length;
        const urgent = incomingContacts.filter((c: any) => c.aiScore > 60).length;
        
        setHighValueCount(highVal);
        setUrgentCount(urgent);
        
        // Calculate potential value based on open deals count (approx €15k deal size)
        const estimatedValue = incomingContacts.reduce((sum: number, c: any) => sum + (c.p_deals_count > 0 ? 15000 * c.p_deals_count : 0), 0);
        setTotalPotential(estimatedValue || incomingContacts.length * 5000); // Fallback to lead value if no deals
        
        // Simulate Analysis Step
        setTimeout(() => {
            setBriefingStep('analysis');
            generateBriefing(incomingContacts);
        }, 1500);

    } catch (e) {
        console.error(e);
        // Fallback or Error State
        setAnalysisText("Spojení se základnou selhalo. Zkontrolujte API klíč.");
    } finally {
        setLoading(false);
    }
  };

  const generateBriefing = (data: Contact[]) => {
      // Simple generator based on data
      const count = data.length;
      if (count === 0) {
          setAnalysisText("Dneska je klid. Žádné urgentní mise v radaru. Můžeš si dát kafe nebo lovit ve studených vodách.");
          setBriefingStep('ready');
          return;
      }

      const msgs = [
          `Dobrý ráno. Mám pro tebe ${count} cílů.`,
          `Detekuji ${highValueCount} otevřených obchodů, kde leží peníze na stole.`,
          `Priorita je jasná: Nejdřív ty, co hoří.`,
          `Jsi připraven to vyčistit?`
      ];

      let i = 0;
      const interval = setInterval(() => {
          setAnalysisText(prev => prev + (prev ? " " : "") + msgs[i]);
          i++;
          if (i >= msgs.length) {
              clearInterval(interval);
              setBriefingStep('ready');
          }
      }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        
        {/* Central Console */}
        <div className="relative z-10 w-full max-w-4xl">
            
            {/* Header / Monitor Frame */}
            <div className="border-x border-t border-slate-700 bg-slate-900/80 backdrop-blur rounded-t-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h2 className="text-xl font-mono font-bold text-slate-100 tracking-widest">
                        MISSION CONTROL
                    </h2>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                    <span>SYS.VER.4.0</span>
                    <span>CONNECTION: SECURE</span>
                </div>
            </div>

            {/* Main Screen Content */}
            <div className="border border-slate-700 bg-slate-950 p-12 min-h-[400px] flex flex-col relative overflow-hidden">
                
                {/* Scanlines Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] opacity-20"></div>

                {briefingStep === 'scanning' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-indigo-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                            <div className="w-24 h-24 border-4 border-t-indigo-500 rounded-full absolute top-0 left-0 animate-[spin_2s_linear_infinite]"></div>
                            <RefreshCw className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-indigo-400">SYNCING PIPEDRIVE...</h3>
                            <p className="text-slate-500 font-mono">Downloading tactical data from CRM sector...</p>
                        </div>
                    </div>
                )}

                {briefingStep !== 'scanning' && (
                    <div className="flex-1 grid grid-cols-2 gap-12 animate-in zoom-in-95 duration-500">
                        
                        {/* LEFT: The Mentor / Briefing */}
                        <div className="flex flex-col justify-center space-y-6">
                             <div className="flex items-start gap-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                                    <Shield className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-2">Morning Briefing</h3>
                                    <p className="text-lg text-slate-300 font-mono leading-relaxed">
                                        "{analysisText}"
                                    </p>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Targets</div>
                                    <div className="text-3xl font-bold text-white">{contacts.length}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Hot Deals</div>
                                    <div className="text-3xl font-bold text-amber-500">{highValueCount}</div>
                                </div>
                             </div>
                        </div>

                        {/* RIGHT: The Plan / Matrix */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                            <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                <Target className="w-4 h-4" /> Tactical Priority List
                            </h4>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {contacts.slice(0, 5).map((c: any, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg group hover:border-indigo-500/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="text-slate-500 font-mono text-xs">0{i+1}</div>
                                            <div>
                                                <div className="font-bold text-slate-200 text-sm">{c.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">{c.company}</div>
                                            </div>
                                        </div>
                                        {c.p_deals_count > 0 && (
                                            <div className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded flex items-center gap-1">
                                                <Flame className="w-3 h-3" /> HOT
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {contacts.length > 5 && (
                                    <div className="text-center text-xs text-slate-500 pt-2 font-mono">
                                        + {contacts.length - 5} MORE TARGETS IN QUEUE
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-900 border-x border-b border-slate-700 rounded-b-2xl p-6 flex justify-between items-center">
                 <div className="text-xs text-slate-600 font-mono">
                    STATUS: {briefingStep === 'ready' ? 'READY FOR DEPLOYMENT' : 'ANALYZING...'}
                 </div>
                 
                 <Button 
                    onClick={() => onStartSession(contacts)}
                    disabled={briefingStep !== 'ready' || contacts.length === 0}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 h-12 text-lg font-bold tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
                 >
                    {briefingStep === 'ready' ? (
                        <span className="flex items-center gap-2">START SESSION <ChevronRight className="w-5 h-5" /></span>
                    ) : (
                        <span className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 animate-pulse" /> PROCESSING</span>
                    )}
                 </Button>
            </div>

        </div>

    </div>
  );
}