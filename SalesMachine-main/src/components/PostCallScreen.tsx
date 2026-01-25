import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { 
  CheckCircle2, X, Calendar, Phone, Mail, 
  ArrowRight, Loader2, Trophy, TrendingDown, Meh, Send, Edit3, Linkedin, Globe, MapPin, Building2
} from 'lucide-react';
import type { Contact } from '../App';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';

type Disposition = 'meeting' | 'callback' | 'not-interested';

type PostCallScreenProps = {
  contact: Contact;
  campaignId: string;
  transcript?: any[];
  analysisResult?: any;
  onComplete: (disposition: Disposition) => void;
};

export function PostCallScreen({ contact, campaignId, transcript, analysisResult, onComplete }: PostCallScreenProps) {
  const [selectedDisposition, setSelectedDisposition] = useState<Disposition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(5);

  // Form State for Pipedrive
  const [crmNote, setCrmNote] = useState("");
  const [crmSubject, setCrmSubject] = useState("");

  // Auto-advance countdown for "not interested"
  useEffect(() => {
    if (selectedDisposition === 'not-interested' && !showVerify && !isProcessing) {
      const interval = setInterval(() => {
        setAutoAdvanceTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onComplete('not-interested');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedDisposition, showVerify, isProcessing, onComplete]);

  const handleDispositionClick = (disposition: Disposition) => {
    setSelectedDisposition(disposition);
    
    // Pre-fill CRM Data
    let subject = `Call: ${disposition} - ${contact.name}`;
    let note = `Result: ${disposition}\n\n`;
    
    if (analysisResult) {
        note += `AI Summary: ${analysisResult.summary}\n`;
        note += `Score: ${analysisResult.score}/100\n`;
        if (analysisResult.strengths) note += `Strengths: ${analysisResult.strengths.join(', ')}\n`;
    }
    
    if (transcript) {
        // Only take last few lines or full transcript if short
        const text = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        note += `\nTranscript:\n${text.slice(0, 500)}...`;
    }

    setCrmSubject(subject);
    setCrmNote(note);
    setShowVerify(true);
  };

  const handleSyncAndClose = async () => {
      setIsSyncing(true);
      
      // Sync to Pipedrive via Echo Backend (Centralized Analytics)
      try {
           const duration = transcript ? Math.ceil(transcript.length * 5 / 60) : 0; // Rough estimate
           const url = buildFunctionUrl('call-logs');

           if (isSupabaseConfigured && url) {
               await fetch(url, {
                   method: 'POST',
                   headers: { 
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${publicAnonKey}`
                   },
                   body: JSON.stringify({
                       campaignId: campaignId,
                       contactId: contact.id,
                       contactName: contact.name,
                       companyName: contact.company,
                       disposition: selectedDisposition,
                       subject: crmSubject,
                       notes: crmNote,
                       duration: duration
                   })
               });
           } else {
               console.error("Supabase not configured. Call log not saved.");
           }
      } catch (e) {
          console.error("Sync failed", e);
      }
      
      setIsSyncing(false);
      setShowVerify(false); // Hide verify

      if (selectedDisposition === 'not-interested') {
          setAutoAdvanceTimer(5);
          return;
      }
      
      // Final transition
      setIsProcessing(true);
      setTimeout(() => {
          if (selectedDisposition) onComplete(selectedDisposition);
      }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-10"></div>
      
      <div className="relative z-10 w-full max-w-4xl">
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <h2 className="text-xl text-slate-300">Ukládám a zavírám...</h2>
          </div>
        ) : showVerify ? (
            // VERIFICATION SCREEN
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Edit3 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">CRM Sync Preview</h2>
                        <p className="text-slate-400 text-sm">Zkontroluj zápis před odesláním do Pipedrive</p>
                    </div>
                </div>

                {/* --- SMART ENRICHMENT INTEL CARD --- */}
                {(contact as any).smart_enrichment && (
                    <div className="bg-slate-950/50 border border-blue-500/30 rounded-xl p-4 mb-6">
                        <h3 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                            <Building2 className="w-3 h-3" /> Nalezená Data o Firmě (Auto-Enriched)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {(contact as any).smart_enrichment.verified_company_name && (
                                <div className="col-span-2 text-sm text-white font-medium">
                                    {(contact as any).smart_enrichment.verified_company_name}
                                    <span className="text-slate-500 font-normal ml-2">({(contact as any).smart_enrichment.industry_vertical})</span>
                                </div>
                            )}
                            
                            {(contact as any).smart_enrichment.address_city && (
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                    {(contact as any).smart_enrichment.address_city}
                                </div>
                            )}

                            {(contact as any).smart_enrichment.website && (
                                <a href={(contact as any).smart_enrichment.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                                    <Globe className="w-4 h-4" />
                                    Web Firmy
                                </a>
                            )}

                            {(contact as any).smart_enrichment.linkedin_search_url && (
                                <a href={(contact as any).smart_enrichment.linkedin_search_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline col-span-2 bg-blue-500/10 p-2 rounded border border-blue-500/20 justify-center">
                                    <Linkedin className="w-4 h-4" />
                                    Ověřit osobu na LinkedIn (Search)
                                </a>
                            )}
                        </div>
                    </div>
                )}
                {/* ----------------------------------- */}

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Předmět Aktivity</label>
                        <Input 
                            value={crmSubject}
                            onChange={(e) => setCrmSubject(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Poznámka (AI Generated)</label>
                        <Textarea 
                            value={crmNote}
                            onChange={(e) => setCrmNote(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white min-h-[150px] font-mono text-sm leading-relaxed"
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowVerify(false)}
                        className="flex-1 text-slate-400 hover:text-white"
                    >
                        Zpět
                    </Button>
                    <Button 
                        onClick={handleSyncAndClose}
                        disabled={isSyncing}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 text-lg shadow-lg shadow-blue-500/20"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" /> Schválit & Uložit
                            </>
                        )}
                    </Button>
                </div>
            </div>
        ) : selectedDisposition ? (
          // CONFIRMATION SCREEN
          <div className="text-center space-y-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white">Uloženo!</h2>
            <p className="text-slate-400">
              {selectedDisposition === 'meeting' && 'Meeting booked.'}
              {selectedDisposition === 'callback' && "Callback set. We'll remind you."}
              {selectedDisposition === 'not-interested' && `Moving on... (${autoAdvanceTimer}s)`}
            </p>
            {selectedDisposition === 'meeting' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-200 text-sm">
                <p className="font-semibold mb-1">Next: Send calendar invite</p>
                <p className="text-xs">AI will draft a brief meeting outline to send to the contact.</p>
              </div>
            )}
            {selectedDisposition === 'callback' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-amber-200 text-sm">
                <p className="font-semibold mb-1">Next: Set a reminder</p>
                <p className="text-xs">We'll alert you 24 hours before your callback slot.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Jak to Dopadlo?</h1>
              <p className="text-slate-400">{contact.name} @ {contact.company}</p>
            </div>

            {/* Analysis Result (if available) */}
            {analysisResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {analysisResult.score >= 70 && <Trophy className="w-5 h-5 text-amber-500" />}
                    {analysisResult.score >= 40 && analysisResult.score < 70 && <Meh className="w-5 h-5 text-blue-500" />}
                    {analysisResult.score < 40 && <TrendingDown className="w-5 h-5 text-slate-500" />}
                    AI Call Score
                  </h3>
                  <div className={`text-3xl font-bold ${
                    analysisResult.score >= 70 ? 'text-green-500' : 
                    analysisResult.score >= 40 ? 'text-blue-500' : 
                    'text-slate-500'
                  }`}>
                    {analysisResult.score}/100
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-4">{analysisResult.summary}</p>
                
                {analysisResult.coachingTip && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mt-4">
                    <p className="text-indigo-300 text-sm">
                      <strong>💡 Tip:</strong> {analysisResult.coachingTip}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3 BIG BUTTONS - ADHD-Friendly Choices */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              
              {/* MEETING SCHEDULED */}
              <button
                onClick={() => handleDispositionClick('meeting')}
                className="bg-green-600 hover:bg-green-700 border-2 border-green-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:scale-105 shadow-lg hover:shadow-green-500/30 group"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">Meeting</div>
                  <div className="text-xs text-green-200">Domluveno!</div>
                </div>
              </button>

              {/* CALLBACK LATER */}
              <button
                onClick={() => handleDispositionClick('callback')}
                className="bg-blue-600 hover:bg-blue-700 border-2 border-blue-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:scale-105 shadow-lg hover:shadow-blue-500/30 group"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">Callback</div>
                  <div className="text-xs text-blue-200">Zavolám později</div>
                </div>
              </button>

              {/* NOT INTERESTED */}
              <button
                onClick={() => handleDispositionClick('not-interested')}
                className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:scale-105 shadow-lg hover:shadow-slate-500/30 group"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">Not Interested</div>
                  <div className="text-xs text-slate-400">Není zájem</div>
                </div>
              </button>

            </div>

            {/* Helper Text */}
            <p className="text-center text-slate-500 text-sm">
              Poznámky se uloží automaticky do Pipedrive
            </p>
          </>
        )}

      </div>
    </div>
  );
}
