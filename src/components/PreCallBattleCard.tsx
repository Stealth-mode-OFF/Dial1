import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { 
  Phone, Shield, Target, AlertCircle, Flame, Clock, 
  CheckCircle2, TrendingUp, Zap, ArrowRight, Loader2
} from 'lucide-react';
import type { Contact } from '../types/legacy';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';

type PreCallBattleCardProps = {
  contact: Contact;
  onReady: () => void;
  onSkip: () => void;
};

export function PreCallBattleCard({ contact, onReady, onSkip }: PreCallBattleCardProps) {
  const [countdown, setCountdown] = useState(10); // ADHD: Shortened from 30s to 10s to maintain momentum
  const [isLoading, setIsLoading] = useState(false);
  const [battleCard, setBattleCard] = useState<any>(null);

  // Fetch AI Battle Card if needed
  useEffect(() => {
    const loadBattleCard = async () => {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        setBattleCard({
          opening: "Supabase config missing. Add VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY to generate battle cards.",
          painPoint: "",
          hook: "",
          objectionHandlers: [],
          estimatedDuration: "",
          callToAction: ""
        });
        return;
      }

      // If we already have cached data, use it
      if (contact.aiSummary && contact.hiringSignal) {
        setBattleCard({
          opening: `Dobrý den, ${contact.name}, u telefonu kolega z Behavery. Vidím, že ve firmě ${contact.company} řešíte...`,
          painPoint: contact.hiringSignal || "Pravděpodobně řeší fluktuaci nebo přetížení týmů.",
          hook: "Pomáháme firmám zachytit problémy v týmech dřív, než se to projeví odchody nebo poklesem výkonu.",
          objectionHandlers: [
            { objection: "Nemáme budget", response: "Kolik vás stojí jeden odchod kvalitního člověka? Obvykle 3-6 měsíčních platů." },
            { objection: "Nemáme čas", response: "Puls trvá 2-3 minuty měsíčně. Kolik času vám berou výstupní pohovory a nábory?" },
            { objection: "Máme už nástroj", response: "Jak často ho používáte? Většina pulzů končí jako \"survey hell\". Náš je jiný - měříme konkrétní signály jako micro-toxicitu." }
          ],
          estimatedDuration: "3-5 min",
          callToAction: "Mohli bychom si na 15 minut zavolat příští týden? Ukážu vám, jak to funguje."
        });
        return;
      }

      // Otherwise, fetch fresh AI data
      setIsLoading(true);
      try {
        const url = buildFunctionUrl('ai/generate');
        if (!url) return;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}` 
          },
          body: JSON.stringify({
            contactName: contact.name,
            company: contact.company,
            type: 'research'
          })
        });

        if (res.ok) {
          const data = await res.json();
          
          // Update contact cache
          contact.aiSummary = data.aiSummary;
          contact.hiringSignal = data.hiringSignal;
          contact.intentScore = data.intentScore;
          
          // Set battle card
          setBattleCard({
            opening: data.openingLine || `Dobrý den, ${contact.name}, u telefonu kolega z Behavery. Vidím, že ve firmě ${contact.company} řešíte...`,
            painPoint: data.hiringSignal || "Pravděpodobně řeší fluktuaci nebo přetížení týmů.",
            hook: "Pomáháme firmám zachytit problémy v týmech dřív, než se to projeví odchody.",
            objectionHandlers: [
              { objection: "Nemáme budget", response: "Kolik vás stojí jeden odchod kvalitního člověka?" },
              { objection: "Nemáme čas", response: "Puls trvá 2-3 minuty měsíčně." },
              { objection: "Máme už nástroj", response: "Jak často ho používáte? Náš měří konkrétní signály jako micro-toxicitu." }
            ],
            estimatedDuration: "3-5 min",
            callToAction: "Mohli bychom si na 15 minut zavolat příští týden?"
          });

          // Save to backend
          const cacheUrl = buildFunctionUrl(`contact-intel/${contact.id}`);
          if (cacheUrl) {
            await fetch(cacheUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              },
              body: JSON.stringify({
                aiSummary: data.aiSummary,
                hiringSignal: data.hiringSignal,
                intentScore: data.intentScore,
                personalityType: data.personalityType
              })
            });
          }
        }
      } catch (e) {
        console.error("Failed to load battle card", e);
        // Fallback to generic battle card
        setBattleCard({
          opening: `Dobrý den, ${contact.name}, volám z Behavery.`,
          painPoint: "Firma pravděpodobně řeší problém s angažovaností týmů.",
          hook: "Pomáháme zachytit problémy dřív, než vedou k odchodům.",
          objectionHandlers: [
            { objection: "Nemáme budget", response: "Kolik vás stojí jeden odchod?" },
            { objection: "Nemáme čas", response: "Trvá to 2-3 minuty měsíčně." }
          ],
          estimatedDuration: "3-5 min",
          callToAction: "Mohli bychom si zavolat příští týden?"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBattleCard();
  }, [contact.id]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && !isLoading) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isLoading]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-10"></div>
      
      <div className="relative z-10 w-full max-w-4xl">
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <h2 className="text-xl text-slate-300">Připravuji tvůj battle plan...</h2>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{contact.name}</h1>
                <p className="text-slate-400 text-lg">{contact.role || contact.company}</p>
                {contact.phone && (
                  <p className="text-slate-500 text-sm mt-1">{contact.phone}</p>
                )}
              </div>
              
              {/* Countdown Timer */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 flex items-center justify-center relative">
                  <Clock className="w-8 h-8 text-indigo-400 absolute" />
                  <div className="text-2xl font-bold text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1">
                    {countdown}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Auto-dial in</p>
              </div>
            </div>

            {/* Battle Card Grid */}
            {battleCard && (
              <div className="grid grid-cols-2 gap-6 mb-8">
                
                {/* Opening Line */}
                <div className="col-span-2 bg-green-500/10 border-2 border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-green-400 uppercase text-sm">Opening Line</h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-white text-base leading-relaxed cursor-help hover:bg-white/5 p-1 rounded transition-colors line-clamp-2">
                          "{battleCard.opening.split('.')[0].slice(0, 90)}"
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Zdroj: AI Generátor (GPT-4o) + CRM Data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Pain Point */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h3 className="font-bold text-red-400 uppercase text-sm">Likely Pain Point</h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-slate-300 text-sm leading-relaxed cursor-help hover:text-white transition-colors">
                          {battleCard.painPoint}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Zdroj: AI Analýza trhu (Industry Signals)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Hook */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-amber-400 uppercase text-sm">Value Hook</h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-slate-300 text-sm leading-relaxed cursor-help hover:text-white transition-colors">
                          "{battleCard.hook}"
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Zdroj: Behavery Sales Codex (Best Practices)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Objection Handlers */}
                <div className="col-span-2 bg-slate-900 border border-indigo-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-indigo-400 uppercase text-sm">Quick Objection Handlers</h3>
                  </div>
                  <div className="space-y-3">
                    {battleCard.objectionHandlers.map((obj: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <span className="text-indigo-400 text-xs font-bold">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-400 text-xs mb-1">"{obj.objection}"</p>
                          <p className="text-slate-200 text-sm">→ {obj.response}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-purple-400 uppercase text-sm">CTA</h3>
                  </div>
                  <p className="text-slate-300 text-sm line-clamp-2">
                    "{battleCard.callToAction.split('.')[0].slice(0, 80)}"
                  </p>
                  <p className="text-slate-500 text-xs mt-2">Est. duration: {battleCard.estimatedDuration}</p>
                </div>

              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={onSkip}
                variant="outline"
                className="px-8 py-6 text-lg border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Skip Contact
              </Button>
              
              <Button
                onClick={onReady}
                className="px-12 py-6 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-105 transition-all"
              >
                <span className="flex items-center gap-3">
                  <Phone className="w-6 h-6" /> I'M READY - DIAL NOW
                </span>
              </Button>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
