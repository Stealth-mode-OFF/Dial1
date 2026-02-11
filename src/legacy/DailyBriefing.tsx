import { useState, useEffect } from 'react';
import { 
  Terminal, Shield, Target, Flame, 
  ChevronRight, BrainCircuit, RefreshCw, Briefcase, 
  Users, CheckCircle2, AlertTriangle, Play, Zap, Phone, TrendingUp
} from 'lucide-react';
import type { Contact } from '../../App';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../../utils/supabase/info';
import { Button } from '../ui/button';

type DailyBriefingProps = {
  onStartSession: (contacts: Contact[]) => void;
  isLoading: boolean;
};

export function DailyBriefing({ onStartSession, isLoading: initialLoading }: DailyBriefingProps) {
  const [loading, setLoading] = useState(initialLoading);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [briefingStep, setBriefingStep] = useState<'loading' | 'ready'>('loading');
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Stats
  const [highValueCount, setHighValueCount] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  // Initial Fetch
  useEffect(() => {
    fetchPipedriveData();
  }, []);

  const fetchPipedriveData = async () => {
    setLoading(true);
    setBriefingStep('loading');
    
    if (!isSupabaseConfigured) {
        setConfigError("Supabase credentials missing. Cannot load Pipedrive contacts.");
        setLoading(false);
        return;
    }

    const url = buildFunctionUrl('pipedrive/contacts');
    if (!url) {
        setLoading(false);
        return;
    }

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        const incomingContacts = data[0]?.contacts || [];
        
        setContacts(incomingContacts);
        
        // Compute Stats
        const highVal = incomingContacts.filter((c: any) => c.p_deals_count > 0).length;
        setHighValueCount(highVal);
        
        // Calculate potential value
        const estimatedValue = incomingContacts.reduce((sum: number, c: any) => 
          sum + (c.p_deals_count > 0 ? 15000 * c.p_deals_count : 5000), 0
        );
        setEstimatedRevenue(estimatedValue);
        
        // Fast transition to ready
        setTimeout(() => {
            setBriefingStep('ready');
        }, 800);

    } catch (e) {
        console.error(e);
        setConfigError("Pipedrive sync failed. Verify API keys and Supabase function deployment.");
    } finally {
        setLoading(false);
    }
  };

  if (configError) {
      return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-950">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 max-w-lg text-center">
            <h2 className="text-xl font-bold mb-2">Configuration required</h2>
            <p className="text-sm">{configError}</p>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-10"></div>
        
        {briefingStep === 'loading' ? (
          // LOADING STATE - Faster, less theatrical
          <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full animate-spin"></div>
              <RefreshCw className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-indigo-400">Syncing Pipedrive...</h3>
              <p className="text-slate-500 text-sm">Načítám tvůj call list</p>
            </div>
          </div>
        ) : (
          // READY STATE - Action-Oriented Briefing
          <div className="relative z-10 w-full max-w-4xl animate-in zoom-in-95 duration-400">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Tvůj Call List je Připraven</h1>
              <p className="text-slate-400">AI seřadilo priority podle dopamine ROI. Začni od top targetu.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-xs font-bold uppercase mb-1">Total Targets</div>
                <div className="text-3xl font-bold text-white">{contacts.length}</div>
              </div>
              <div className="bg-slate-900/50 border border-amber-500/20 rounded-xl p-4 text-center">
                <div className="text-amber-500/70 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" /> Hot Deals
                </div>
                <div className="text-3xl font-bold text-amber-500">{highValueCount}</div>
              </div>
              <div className="bg-slate-900/50 border border-green-500/20 rounded-xl p-4 text-center">
                <div className="text-green-500/70 text-xs font-bold uppercase mb-1">Est. Revenue</div>
                <div className="text-2xl font-bold text-green-500">€{(estimatedRevenue / 1000).toFixed(0)}k</div>
              </div>
            </div>

            {/* Priority Targets - Show TOP 3 with talking points */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <Target className="w-4 h-4" /> Top 3 Priority Targets
                </h3>
              </div>
              
              <div className="divide-y divide-slate-800">
                {contacts.slice(0, 3).map((c: any, i) => (
                  <div key={i} className="p-6 hover:bg-slate-800/30 transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-white text-lg">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.role || c.company}</div>
                        </div>
                      </div>
                      {c.p_deals_count > 0 && (
                        <div className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full flex items-center gap-1 border border-amber-500/30">
                          <Flame className="w-3 h-3" /> {c.p_deals_count} {c.p_deals_count === 1 ? 'Deal' : 'Deals'}
                        </div>
                      )}
                    </div>
                    
                    {/* QUICK BATTLE PLAN - This is the KEY for ADHD */}
                    <div className="ml-11 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-slate-400">Opening:</span>
                          <span className="text-slate-200 ml-2">"Dobrý den, {c.name}. Volám ohledně {c.company ? `${c.company}` : 'spolupráce'}..."</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-slate-400">Hook:</span>
                          <span className="text-slate-200 ml-2">
                            {c.p_deals_count > 0 
                              ? '"Pomáháme firmám zachytit problémy v týmech dřív, než se to projeví odchody."'
                              : '"Měříme signály frustraci a přetížení každý měsíc - rychle, bez psychologických testů."'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BIG START BUTTON */}
            <div className="flex justify-center">
              <Button 
                onClick={() => onStartSession(contacts)}
                disabled={contacts.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-xl font-bold tracking-wide shadow-[0_0_40px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 rounded-2xl"
              >
                <span className="flex items-center gap-3">
                  <Play className="w-6 h-6" /> START DIALING
                </span>
              </Button>
            </div>

            {contacts.length === 0 && (
              <div className="text-center mt-6 text-slate-500 text-sm">
                Žádné kontakty k dispozici. Zkontroluj Pipedrive nebo přidej aktivity.
              </div>
            )}

          </div>
        )}

    </div>
  );
}
