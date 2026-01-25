import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { 
  Phone, Check, X, Mail, Sparkles, 
  BrainCircuit, Target, ShieldAlert, Zap, Calendar, Network, Mic, MicOff, ChevronRight, Command,
  Coffee, Send, PenTool, Loader2, Trophy, TrendingUp, AlertTriangle, AlertCircle, Maximize2, Minimize2, Flame,
  UserCheck, Shield
} from 'lucide-react';
import type { Contact, EnergyLevel, MoodLevel } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type AICallScreenProps = {
  contact: Contact;
  contactNumber: number;
  totalContacts: number;
  campaignName: string;
  onNextContact: () => void;
  energy: EnergyLevel;
  mood: MoodLevel;
  salesStyle: 'hunter' | 'consultative';
};

type CallState = 'analyzing' | 'ready' | 'calling' | 'wrapping' | 'drafting' | 'sending' | 'computing_score' | 'debrief';
type Disposition = 'connected' | 'no-answer' | 'sent' | 'scheduled';

type AnalysisResult = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  coachingTip: string;
};

export function AICallScreen({ contact, contactNumber, totalContacts, campaignName, onNextContact, energy, mood, salesStyle }: AICallScreenProps) {
  const [callState, setCallState] = useState<CallState>('analyzing');
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  
  // Simulation State
  const [transcript, setTranscript] = useState<any[]>([]);
  const [activeBattleCard, setActiveBattleCard] = useState<string | null>(null);
  const [battleCardContent, setBattleCardContent] = useState<string | null>(null);
  const [isBattleCardLoading, setIsBattleCardLoading] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [callStreak, setCallStreak] = useState(0);
  const [duration, setDuration] = useState(0); // Call Timer
  const [sessionTime, setSessionTime] = useState(0); // Total session time

  // MENTOR STATE (The Father Figure)
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [mentorMood, setMentorMood] = useState<'neutral' | 'happy' | 'stern' | 'concerned'>('neutral');
  const [showMentor, setShowMentor] = useState(true);

  // 1. MENTOR: Session Startup & Idle Timer
  useEffect(() => {
      // Startup Greeting
      const greetings = [
          "Tak jo, šampione. Nádech, výdech. Dneska to rozbijem.",
          "Hlava vzhůru, hlas pevný. Ukaž jim, co v tobě je.",
          "Soustřeď se na proces, ne na výsledek. Jdeme na to.",
          "Vím, že to v sobě máš. Jen zvedni to sluchátko."
      ];
      setMentorMessage(greetings[Math.floor(Math.random() * greetings.length)]);
      
      const sessionInterval = setInterval(() => {
          setSessionTime(prev => {
              const newVal = prev + 1;
              // Mandatory Break Check (every 25 mins - Pomodoro style)
              if (newVal > 0 && newVal % 1500 === 0) {
                  setMentorMood('concerned');
                  setMentorMessage("Brzdi, kovboji. Už jedeš 25 minut v kuse. Vstaň, protáhni se, napij se. To je rozkaz.");
                  setShowMentor(true);
              }
              return newVal;
          });
      }, 1000);

      return () => clearInterval(sessionInterval);
  }, []);

  // 2. MENTOR: Idle Detection (ADHD Drift Check)
  useEffect(() => {
      if (callState === 'ready') {
          const idleTimer = setTimeout(() => {
              setMentorMood('stern');
              setMentorMessage("Hej! Koukáš do zdi. To číslo se samo nevytočí. Klikni na to.");
              setShowMentor(true);
          }, 45000); // 45s of inaction triggers nudge
          return () => clearTimeout(idleTimer);
      }
  }, [callState]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (callState === 'calling') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-CRM Data
  const [bant, setBant] = useState({
    budget: '',
    authority: '',
    need: '',
    timeline: ''
  });
  
  // Drafts & Scripts
  const [emailDraft, setEmailDraft] = useState('');
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Voice Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'cs-CZ';

        recognitionRef.current.onstart = () => {
            console.log("✅ Voice recording started");
            isRecognitionActiveRef.current = true;
            setRecognitionError(null);
        };

        recognitionRef.current.onresult = (event: any) => {
            let final = "";
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            
            if (final) {
                console.log("🎤 Final transcript:", final);
                setTranscript(prev => [...prev, { speaker: 'me', text: final }]);
                setInterimText(""); // Clear interim after final
            } else {
                setInterimText(interim);
            }
            
            // Auto-scroll for both final and interim
            if (transcriptionRef.current) {
                setTimeout(() => {
                    if (transcriptionRef.current) {
                        transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
                    }
                }, 50);
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("❌ Speech recognition error:", event.error);
            isRecognitionActiveRef.current = false;
            
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setRecognitionError("Mikrofon je blokován. Povolte přístup v nastavení prohlížeče.");
                setIsRecording(false);
            } else if (event.error === 'no-speech') {
                setRecognitionError("Nebyl detekován žádný hlas. Zkuste mluvit blíž k mikrofonu.");
                // Don't stop, just show warning
            } else if (event.error === 'aborted') {
                setIsRecording(false);
            } else {
                setRecognitionError(`Chyba rozpoznávání: ${event.error}`);
            }
        };

        recognitionRef.current.onend = () => {
            console.log("🛑 Recognition ended");
            isRecognitionActiveRef.current = false;
            
            // Auto-restart if we expect to still be recording (e.g. browser auto-stopped)
            if (isRecording && callState === 'calling') {
                console.log("🔄 Auto-restarting recognition...");
                setTimeout(() => {
                    if (recognitionRef.current && isRecording) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.error("Failed to restart recognition", e);
                            setIsRecording(false);
                        }
                    }
                }, 300);
            }
        };
    } else {
        setRecognitionError("Web Speech API není podporováno v tomto prohlížeči. Použijte Chrome nebo Edge.");
    }
    
    return () => {
        if (recognitionRef.current && isRecognitionActiveRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Error stopping recognition on cleanup", e);
            }
        }
    };
  }, [isRecording, callState]);

  // Auto-start recording when call begins
  useEffect(() => {
    if (callState === 'calling' && !isRecording && recognitionRef.current) {
      console.log("📞 Call started - auto-enabling microphone...");
      // Small delay to allow UI to settle
      const timer = setTimeout(() => {
        try {
          if (recognitionRef.current && !isRecognitionActiveRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
            console.log("✅ Microphone auto-started");
          }
        } catch (e: any) {
          console.error("Failed to auto-start recording", e);
          // Don't show error immediately - user can manually enable
          if (e.message.includes('already')) {
            console.log("Recognition already running, ignoring...");
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Auto-stop recording when call ends
    if (callState !== 'calling' && isRecording && recognitionRef.current) {
      console.log("📴 Call ended - stopping microphone...");
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
        setInterimText("");
      } catch (e) {
        console.error("Failed to stop recording", e);
      }
    }
  }, [callState]);

  // Toggle Recording
  const toggleRecording = () => {
      if (!recognitionRef.current) {
          setRecognitionError("Web Speech API není dostupné.");
          return;
      }

      if (isRecording) {
          // Stop recording
          try {
              recognitionRef.current.stop();
              setIsRecording(false);
              setInterimText("");
              console.log("⏹️ Stopping recording...");
          } catch (e) {
              console.error("Failed to stop recording", e);
              setIsRecording(false);
          }
      } else {
          // Start recording
          try {
              // Prevent double-start
              if (isRecognitionActiveRef.current) {
                  console.warn("⚠️ Recognition already active, stopping first...");
                  recognitionRef.current.stop();
                  setTimeout(() => {
                      try {
                          recognitionRef.current.start();
                          setIsRecording(true);
                      } catch (e) {
                          console.error("Failed to start after stop", e);
                          setRecognitionError("Nepodařilo se spustit nahrávání. Zkuste to znovu.");
                      }
                  }, 300);
              } else {
                  recognitionRef.current.start();
                  setIsRecording(true);
                  console.log("▶️ Starting recording...");
              }
          } catch (e: any) {
              console.error("Failed to start recording", e);
              setRecognitionError(e.message || "Nepodařilo se spustit nahrávání.");
          }
      }
  };

  const isLowEnergy = energy === 'low' || mood === 'bad';

  // Helper to log call/email to backend (and Pipedrive)
  const logCall = async (disposition: Disposition, notes?: string) => {
    try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/call-logs`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
                campaignId: campaignName || 'live-pipedrive',
                contactId: contact.id,
                contactName: contact.name,
                companyName: contact.company,
                disposition,
                notes
            })
        });
    } catch (e) {
        console.error("Failed to log call", e);
    }
  };

  // Helper to generate AI text
  const generateAIText = async (type: 'email' | 'script') => {
    setIsGenerating(true);
    try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/generate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                contactName: contact.name,
                company: contact.company,
                goal: 'Schedule a meeting to demo Echo Pulse (Retention Tool)',
                type: type,
                salesStyle: salesStyle
            })
        });
        if (res.ok) {
            const data = await res.json();
            return data.content;
        }
    } catch (e) {
        console.error("AI Gen Error", e);
    } finally {
        setIsGenerating(false);
    }
    return "Error generating text.";
  };

  // 1. Start Analysis (Research Phase)
  useEffect(() => {
    setCallState('analyzing');
    setTranscript([]);
    setActiveBattleCard(null);
    setSimulationIndex(0);
    setBant({ budget: '', authority: '', need: '', timeline: '' });
    setEmailDraft('');

    // CHECK IF DATA ALREADY EXISTS - Skip AI call if cached
    const hasExistingData = contact.aiSummary && contact.hiringSignal;
    
    if (hasExistingData) {
        console.log("✅ Using cached AI data for:", contact.name);
        // Skip AI research, go straight to ready
        const timer = setTimeout(() => {
            setCallState('ready');
        }, 800);
        return () => clearTimeout(timer);
    }

    // Trigger AI Research using GPT-5-mini
    const performResearch = async () => {
        try {
            console.log("🔍 Fetching fresh AI data for:", contact.name);
            // Parallelize research and script generation if needed
            const researchPromise = fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/generate`, {
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

            // If no simulation script (Pipedrive contact), generate one
            let scriptPromise = Promise.resolve(null);
            if (!contact.simulationScript) {
                scriptPromise = generateAIText('script').then(text => {
                    setGeneratedScript(text);
                    return null;
                });
            }

            const [res] = await Promise.all([researchPromise, scriptPromise]);

            if (res && res.ok) {
                const data = await res.json();
                // Update contact info in local state (visual only for this screen)
                contact.aiSummary = data.aiSummary;
                contact.hiringSignal = data.hiringSignal;
                contact.intentScore = data.intentScore;
                if (data.personalityType) {
                    contact.personalityType = {
                        type: data.personalityType.type || "Unknown",
                        advice: data.personalityType.advice || "Be professional."
                    };
                }

                // PERSIST INTELLIGENCE TO BACKEND
                fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/contact-intel/${contact.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}`
                    },
                    body: JSON.stringify({
                        aiSummary: data.aiSummary,
                        hiringSignal: data.hiringSignal,
                        intentScore: data.intentScore,
                        personalityType: contact.personalityType,
                        lastNews: data.lastNews || "No recent news found."
                    })
                }).catch(err => console.error("Failed to save intel", err));
            }
        } catch (e) {
            console.error("Research failed", e);
        } finally {
            setCallState('ready');
        }
    };

    // Minimal delay to show the "Scanning" animation, then fetch
    const timer = setTimeout(() => {
        performResearch();
    }, 800);

    return () => clearTimeout(timer);
  }, [contact.id]);

  // Auto-Start Email Drafting in Low Energy Mode
  useEffect(() => {
    if (callState === 'ready' && isLowEnergy) {
        // Wait a tiny bit for the user to perceive the "Ready" state, then auto-start
        const timer = setTimeout(() => {
            setCallState('drafting');
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [callState, isLowEnergy]);

  // 2. Live Call Simulation Logic (Real-time AI)
  const [userMessage, setUserMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Audio Playback Helper
  const playProspectVoice = async (text: string) => {
    try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/speak`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                text: text,
                voice: contact.id.charCodeAt(0) % 2 === 0 ? 'onyx' : 'shimmer' // Basic gender randomization based on ID parity
            })
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.play();
        }
    } catch (e) {
        console.error("Audio playback failed", e);
    }
  };

  // Start the roleplay when call connects
  useEffect(() => {
    // Disable AI Roleplay for Live Calls (Pipedrive/Real Contacts)
    // If simulationScript is missing, we assume it's a real person -> Handoff mode only.
    const isLiveCall = !contact.simulationScript;
    if (isLiveCall) return;

    if (callState === 'calling' && !isLowEnergy && !hasStarted) {
        setHasStarted(true);
        // AI Prospect speaks first (or waits)
        setIsThinking(true);
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/generate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                type: 'roleplay',
                contact: contact,
                history: [], 
                lastUserMessage: "(Call Connected)",
                salesStyle: salesStyle
            })
        })
        .then(res => res.json())
        .then(data => {
            const text = data.content || "Hello?";
            setTranscript(curr => [...curr, { speaker: 'prospect', text }]);
            playProspectVoice(text);
        })
        .catch(e => console.error(e))
        .finally(() => setIsThinking(false));
    }
  }, [callState, isLowEnergy, hasStarted, contact, salesStyle]);

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
    
    const msg = userMessage.trim();
    setUserMessage("");
    
    // 1. Add User Message
    const newTranscript = [...transcript, { speaker: 'me', text: msg }];
    setTranscript(newTranscript);
    
    // 2. Scroll to bottom
    if (transcriptionRef.current) {
        setTimeout(() => {
            if (transcriptionRef.current) transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
        }, 100);
    }

    // 3. Call AI Prospect
    setIsThinking(true);
    try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/generate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                type: 'roleplay',
                contact: contact,
                history: newTranscript,
                lastUserMessage: msg,
                salesStyle: salesStyle
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            const text = data.content;
            
            // Check for objections to trigger battle cards
            if (text.toLowerCase().includes("cost") || text.toLowerCase().includes("price") || text.toLowerCase().includes("budget")) {
                setActiveBattleCard("budget_objection");
            } else if (text.toLowerCase().includes("competitor") || text.toLowerCase().includes("already have")) {
                setActiveBattleCard("competitor_objection");
            }

            setTranscript(curr => [...curr, { speaker: 'prospect', text }]);
            playProspectVoice(text);
        }
    } catch (e) {
        console.error("Roleplay error", e);
    } finally {
        setIsThinking(false);
        if (transcriptionRef.current) {
            setTimeout(() => {
                if (transcriptionRef.current) transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
            }, 100);
        }
    }
  };

  // Battle Card AI Logic
  useEffect(() => {
    if (activeBattleCard && !isLowEnergy) {
        setBattleCardContent(null);
        setIsBattleCardLoading(true);
        
        // Call AI for advice
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/generate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                contactName: contact.name,
                company: contact.company,
                type: 'battle_card',
                contextData: { trigger: activeBattleCard },
                salesStyle: salesStyle
            })
        })
        .then(res => res.json())
        .then(data => {
            setBattleCardContent(data.content);
        })
        .catch(err => console.error("Battle Card Error", err))
        .finally(() => setIsBattleCardLoading(false));
    }
  }, [activeBattleCard, isLowEnergy, salesStyle]);

  // 3. Email Drafting (REAL AI INTEGRATION)
  useEffect(() => {
    if (callState === 'drafting' && isLowEnergy) {
      // Start generation
      generateAIText('email').then((text) => {
          // Simulate typing effect of the REAL text
          let i = 0;
          const interval = setInterval(() => {
            setEmailDraft(text.slice(0, i));
            i++;
            if (i > text.length) {
              clearInterval(interval);
              setCallState('wrapping'); // Ready to review
            }
          }, 20); // Faster typing
          return () => clearInterval(interval);
      });
    }
  }, [callState, isLowEnergy]);


  const handleAction = () => {
    if (isLowEnergy) {
      setCallState('drafting');
    } else {
      // Sanitize phone number for Handoff
      if (contact.phone) {
          const cleanNumber = contact.phone.replace(/[^\d+]/g, ''); // Remove spaces, dashes
          window.location.href = `tel:${cleanNumber}`;
      } else {
          console.warn("No phone number to dial");
      }
      // Enter calling state regardless (to start simulation/logging)
      setCallState('calling');
    }
  };

  const handleEndCall = async (result: Disposition) => {
    setDisposition(result);
    logCall(result, "Call logged via Echo OS"); // Log the call outcome immediately

    // MENTOR FEEDBACK LOGIC
    if (result === 'connected') {
        const msgs = ["To je ono! Slyšíš ten rozdíl, když jsi v klidu?", "Výborně. Jsi ve flow. Drž to.", "Mám z tebe radost. Další!"];
        setMentorMood('happy');
        setMentorMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    } else if (result === 'no-answer') {
        const msgs = ["Nevadí. Neber si to osobně. Další.", "Ticho na lince? Jejich škoda. Jdeme dál.", "Nezastavuj. To je jen statistika."];
        setMentorMood('neutral');
        setMentorMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    } else if (result === 'scheduled') {
        setMentorMood('happy');
        setMentorMessage("Pěkná práce s kalendářem. Tohle je profesionální přístup.");
    }
    setShowMentor(true);
    // Hide mentor after 5s to clear visual clutter
    setTimeout(() => setShowMentor(false), 8000);

    if (result === 'connected' && !isLowEnergy && transcript.length > 0) {
        setCallStreak(prev => prev + 1);
        // ENTER DEBRIEF MODE
        setCallState('computing_score');
        try {
            const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/ai/analyze-call`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}` 
                },
                body: JSON.stringify({
                    transcript,
                    salesStyle,
                    contact
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAnalysisResult(data);
                setCallState('debrief');
            } else {
                // Fallback if analysis fails
                onNextContact();
            }
        } catch (e) {
            console.error("Analysis failed", e);
            onNextContact();
        }
    } else if (result === 'connected') {
        // Old logic for email drafting (Low Energy or Non-Simulated)
        setCallState('wrapping');
        setIsGenerating(true);
        generateAIText('email').then(text => {
             setEmailDraft(text);
             setBant({
                budget: 'Tight (Expansion costs)',
                authority: 'Decision Maker (CTO)',
                need: 'Onboarding speed (React)',
                timeline: 'This weekend / Next week'
              });
             setIsGenerating(false);
        });
    } else {
        // No Answer - Quick Next
        onNextContact();
    }
  };

  const handleSendEmail = () => {
    setIsGenerating(true);
    logCall('sent', emailDraft); // Log the email activity
    setTimeout(() => {
      setIsGenerating(false);
      onNextContact();
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#F8FAFC]">
      
      {/* KITT / MENTOR STRIP (Knight Rider Style) */}
      <div className="bg-slate-950 border-b border-slate-800 shadow-2xl shrink-0 relative overflow-hidden h-14 flex items-center justify-center z-50">
         {/* Grid Background Pattern */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

         {/* Scanner Light Effect (When idle) */}
         {!mentorMessage && (
            <div className="absolute top-0 bottom-0 w-full overflow-hidden opacity-30">
                <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-red-600 to-transparent blur-xl animate-[shimmer_3s_infinite_linear] opacity-50"></div>
            </div>
         )}
         
         {/* Central Voice Visualizer & Text */}
         <div className="flex items-center gap-8 relative z-10 max-w-4xl w-full px-6">
            
            {/* Left Visualizer Bars */}
            <div className="flex gap-1 items-center h-6">
               {[1,2,3].map(i => (
                  <div key={i} className={`w-1 rounded-full transition-all duration-300 ${
                     mentorMessage ? 'bg-red-500 animate-[bounce_0.5s_infinite]' : 'bg-red-900/40 h-1'
                  }`} style={{ animationDelay: `${i * 100}ms`, height: mentorMessage ? '20px' : '4px' }}></div>
               ))}
            </div>

            {/* Text Message */}
            <div className="flex-1 text-center h-full flex items-center justify-center">
               {mentorMessage ? (
                 <p className={`font-mono text-sm tracking-wider font-bold animate-in fade-in zoom-in-95 duration-300 ${
                    mentorMood === 'stern' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' :
                    mentorMood === 'concerned' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' :
                    mentorMood === 'happy' ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' :
                    'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                 }`}>
                    "{mentorMessage}"
                 </p>
               ) : (
                  <div className="flex items-center justify-center gap-3 opacity-40">
                     <span className="text-[10px] font-mono text-red-500 tracking-[0.4em] uppercase font-bold text-shadow-red">System Online</span>
                  </div>
               )}
            </div>

            {/* Right Visualizer Bars */}
             <div className="flex gap-1 items-center h-6">
               {[1,2,3].map(i => (
                  <div key={i} className={`w-1 rounded-full transition-all duration-300 ${
                     mentorMessage ? 'bg-red-500 animate-[bounce_0.5s_infinite]' : 'bg-red-900/40 h-1'
                  }`} style={{ animationDelay: `${i * 100 + 200}ms`, height: mentorMessage ? '20px' : '4px' }}></div>
               ))}
            </div>
         </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden min-h-0 relative">
        {/* Top Context Bar */}
        <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 leading-none flex items-center gap-2">
              {contact.name}
              {callStreak > 2 && (
                <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                  <Flame className="w-3 h-3 fill-orange-500" />
                  {callStreak} Streak!
                </div>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-sm text-slate-500">{contact.role} at {contact.company}</span>
               <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
               <span className="text-sm font-mono font-bold text-slate-600">{contact.phone}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsFocusMode(!isFocusMode)}
             className={`p-2 rounded-lg border transition-all ${isFocusMode ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}
             title={isFocusMode ? "Exit Zen Mode" : "Enter Zen Mode (Focus)"}
           >
             {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>

           <div className={`px-5 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all shadow-sm ${
            callState === 'calling' ? 'bg-red-500 text-white border-red-600 shadow-red-500/30' : 
            callState === 'analyzing' || callState === 'computing_score' ? 'bg-indigo-600 text-white border-indigo-700' :
            callState === 'drafting' ? 'bg-emerald-600 text-white border-emerald-700' :
            callState === 'debrief' ? 'bg-amber-500 text-white border-amber-600' :
            'bg-white text-slate-600 border-slate-200'
          }`}>
            {(callState === 'analyzing' || callState === 'computing_score') && <BrainCircuit className="w-3.5 h-3.5 animate-spin" />}
            {callState === 'calling' && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
            {callState === 'drafting' && <PenTool className="w-3.5 h-3.5 animate-pulse" />}
            {callState === 'debrief' && <Trophy className="w-3.5 h-3.5" />}
            
            {callState === 'analyzing' ? 'AI ANALYZING INTEL' : 
             callState === 'computing_score' ? 'GRADING PERFORMANCE' :
             callState === 'calling' ? 'LIVE RECORDING' : 
             callState === 'drafting' ? 'GENERATING DRAFT' :
             callState === 'debrief' ? 'MISSION DEBRIEF' :
             callState.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Grid - Command Center */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 relative">
        
        {/* LEFT COLUMN: DEEP INTEL (3 cols) - Hidden in Focus Mode */}
        {!isFocusMode && (
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-left-4 fade-in duration-300">
          
          {/* INTENT CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
             <div className="flex items-center justify-between mb-4">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buying Signal</span>
                 <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${contact.intentScore > 80 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                   {contact.intentScore}%
                 </span>
             </div>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full" style={{ width: `${contact.intentScore}%` }}></div>
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">
               <Zap className="w-3 h-3 inline mr-1 text-amber-500" />
               {contact.lastNews}
             </p>
          </div>

          {/* PSYCHOLOGY CARD */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-white relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex items-center gap-2 text-purple-300 font-bold text-[10px] uppercase tracking-widest mb-3">
               <BrainCircuit className="w-3 h-3" /> Personality AI
             </div>
             <div className="text-xl font-bold mb-2 tracking-tight">
               {contact.personalityType?.type || "Analyzing..."}
             </div>
             <p className="text-slate-400 text-xs leading-relaxed border-l-2 border-purple-500/30 pl-3">
               {contact.personalityType?.advice || "AI is gathering behavioral data from public sources..."}
             </p>
          </div>

          {/* CONTEXT CARD */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-3">
              <Target className="w-3 h-3" /> Strategic Context
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-4 font-medium">
              {contact.aiSummary || "Scanning company news and recent updates..."}
            </p>
            <div className="bg-indigo-50 rounded-lg p-3 flex items-start gap-3 border border-indigo-100">
              <div className="mt-0.5"><Sparkles className="w-3 h-3 text-indigo-600" /></div>
              <div className="text-xs text-indigo-900">
                <strong>Hiring Signal:</strong> {contact.hiringSignal || "Searching..."}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* CENTER COLUMN: LIVE TERMINAL (6 cols) */}
        <div className={`${isFocusMode ? 'col-span-12' : 'col-span-6'} flex flex-col gap-4 transition-all duration-500 ease-in-out`}>
          
          {/* The Terminal Monitor */}
          <div className={`flex-1 rounded-2xl shadow-2xl border flex flex-col relative overflow-hidden transition-colors duration-500 ${
            isLowEnergy ? 'bg-slate-900 border-slate-700' : 'bg-[#0F172A] border-slate-800'
          }`}>
            
            {/* Terminal Header */}
            <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-4 backdrop-blur-sm relative">
               <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
               </div>

               {/* VISUAL TIMER (ADHD Support) */}
               {callState === 'calling' && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-48 group cursor-help z-20">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-mono font-bold ${duration > 300 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                            {formatTime(duration)}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                          <div 
                            className={`h-full transition-all duration-1000 ${duration > 300 ? 'bg-red-500' : duration > 180 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min((duration / 300) * 100, 100)}%` }} 
                          ></div>
                      </div>
                  </div>
               )}

               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 {isRecording && <span className="text-red-500 animate-pulse font-bold flex items-center gap-1">● REC</span>}
                 {isLowEnergy ? 'ASYNC UPLINK ESTABLISHED' : 'SECURE CONNECTION'} <Network className="w-3 h-3" />
               </span>
            </div>

            {/* Content Area */}
            <div className={`flex-1 relative bg-gradient-to-b ${isLowEnergy ? 'from-slate-900 to-slate-800' : 'from-[#0F172A] to-[#020617]'}`}>
              
              {/* READY STATE */}
              {callState === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                   <div className="relative group cursor-pointer" onClick={handleAction}>
                     <div className={`absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse ${isLowEnergy ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                     <div className="w-24 h-24 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center relative z-10 hover:scale-105 transition-transform shadow-2xl">
                       {isLowEnergy ? (
                         <Mail className="w-10 h-10 text-white fill-white" />
                       ) : (
                         <Phone className="w-10 h-10 text-white fill-white" />
                       )}
                     </div>
                   </div>
                   <p className="text-white font-medium text-lg mt-8 tracking-tight">
                     {isLowEnergy ? 'Start Email Sequence' : 'Ready to Initiate'}
                   </p>
                   {isLowEnergy && (
                     <div className="flex items-center gap-2 mt-3 text-emerald-400 text-sm bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-900/50">
                       <Coffee className="w-3 h-3" /> <span>Low Energy Mode Active</span>
                     </div>
                   )}
                </div>
              )}

              {/* LIVE TRANSCRIPT STREAM (CALL MODE) */}
              {!isLowEnergy && (callState === 'calling' || callState === 'wrapping') && (
                <div 
                  ref={transcriptionRef}
                  className="absolute inset-0 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
                >
                  {/* SHOW GENERATED SCRIPT (Teleprompter) if no simulation script */}
                  {generatedScript && !contact.simulationScript && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          <div className="flex items-center gap-2 mb-3 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                             <Mic className="w-4 h-4" /> AI Teleprompter
                          </div>
                          <p className="text-xl text-indigo-100 font-medium leading-relaxed font-mono">
                            "{generatedScript}"
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-indigo-400/60 text-xs">
                             <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></div>
                             {isRecording ? "Listening..." : "Waiting for voice input (Click Mic)..."}
                          </div>
                       </div>
                    </div>
                  )}

                  {transcript.map((line, i) => (
                    <div key={i} className={`flex ${line.speaker === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                        line.speaker === 'me' 
                          ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-tr-sm' 
                          : 'bg-slate-800/40 border border-slate-700/50 text-slate-200 rounded-tl-sm'
                      }`}>
                        <span className="text-[10px] font-bold opacity-50 uppercase block mb-1.5 tracking-wider">
                          {line.speaker === 'me' ? 'YOU' : contact.name.split(' ')[1].toUpperCase()}
                        </span>
                        {line.text}
                      </div>
                    </div>
                  ))}

                  {/* Live Interim Transcript */}
                  {interimText && (
                    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                      <div className="max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg backdrop-blur-sm bg-indigo-600/10 border border-indigo-500/20 text-indigo-200/70 rounded-tr-sm italic">
                        <span className="text-[10px] font-bold opacity-50 uppercase block mb-1.5 tracking-wider">YOU (LISTENING...)</span>
                        {interimText}
                      </div>
                    </div>
                  )}

                  {/* Listening / Thinking Indicator */}
                  {isThinking && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                       <div className="flex items-center gap-2 text-slate-500 text-xs px-4 py-3 bg-slate-800/20 rounded-xl border border-slate-800/30">
                         <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                           <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                           <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                         </div>
                         Prospect is thinking...
                       </div>
                    </div>
                  )}
                  <div className="h-12"></div> 
                </div>
              )}

              {/* EMAIL DRAFTING MODE (LOW ENERGY) */}
              {isLowEnergy && (callState === 'drafting' || callState === 'wrapping') && (
                <div className="absolute inset-0 p-8 flex flex-col">
                   <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 p-6 font-mono text-slate-300 text-sm leading-relaxed relative overflow-hidden">
                      {emailDraft}
                      {callState === 'drafting' && (
                        <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse align-middle"></span>
                      )}
                      <div className="absolute top-4 right-4">
                        <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-emerald-500" /> AI Writing
                        </div>
                      </div>
                   </div>
                </div>
              )}
              
      {/* BATTLE CARD OVERLAY (Bottom of Terminal) */}
      {activeBattleCard && callState === 'calling' && !isLowEnergy && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 border-t border-red-500/30 p-5 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-300 z-20">
                  {/* ... existing battle card content ... */}
                  <div className="flex items-start gap-4">
                    <div className="bg-red-500/20 p-2.5 rounded-lg text-red-400 border border-red-500/30 animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">
                          {activeBattleCard === 'budget_objection' ? '⚠ OBJECTION DETECTED: BUDGET' : '⚠ TOPIC: TECH INTEGRATION'}
                        </h4>
                        <span className="text-[10px] font-mono text-red-300 border border-red-500/30 px-1.5 rounded">High Priority</span>
                      </div>
                      <p className="text-sm text-red-100/80 mb-3 font-light min-h-[40px]">
                        {isBattleCardLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce delay-200"></span>
                                Consultative AI analyzing strategy...
                            </span>
                        ) : (
                            battleCardContent || "Loading strategy..."
                        )}
                      </p>
                      <div className="flex gap-3">
                        <button className="bg-white text-red-900 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-50 transition-colors">
                          Launch ROI Calculator
                        </button>
                        <button 
                          onClick={() => setActiveBattleCard(null)}
                          className="text-red-300 text-xs hover:text-white underline decoration-red-500/50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPUTING SCORE OVERLAY */}
              {callState === 'computing_score' && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">Analyzing Performance</h3>
                      <p className="text-slate-400 text-sm max-w-md">AI is grading your rapport, objection handling, and closing techniques against the {salesStyle} methodology...</p>
                  </div>
              )}

              {/* DEBRIEF SCORE CARD OVERLAY */}
              {callState === 'debrief' && analysisResult && (
                  <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300">
                      <div className="flex-1 p-8 flex flex-col items-center">
                          
                          {/* Score Circle */}
                          <div className="relative mb-8">
                              <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full"></div>
                              <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center relative bg-slate-800">
                                  <div className="text-center">
                                      <div className="text-4xl font-bold text-white tracking-tighter">{analysisResult.score}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</div>
                                  </div>
                              </div>
                          </div>

                          <h2 className="text-2xl font-bold text-white mb-2">{analysisResult.score > 70 ? 'Mission Accomplished' : 'Mission Failed'}</h2>
                          <p className="text-slate-400 text-center max-w-lg mb-8 text-sm leading-relaxed">
                              {analysisResult.summary}
                          </p>

                          <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mb-8">
                              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
                                  <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4" /> Strengths
                                  </h4>
                                  <ul className="space-y-2">
                                      {analysisResult.strengths.map((s, i) => (
                                          <li key={i} className="text-emerald-100/80 text-xs flex items-start gap-2">
                                              <Check className="w-3 h-3 mt-0.5 text-emerald-500" /> {s}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
                                  <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4" /> Weaknesses
                                  </h4>
                                  <ul className="space-y-2">
                                      {analysisResult.weaknesses.map((s, i) => (
                                          <li key={i} className="text-red-100/80 text-xs flex items-start gap-2">
                                              <X className="w-3 h-3 mt-0.5 text-red-500" /> {s}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>

                          <div className="w-full max-w-2xl bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5 mb-8">
                              <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <BrainCircuit className="w-4 h-4" /> AI Coach Tip
                              </h4>
                              <p className="text-indigo-100 text-sm italic">"{analysisResult.coachingTip}"</p>
                          </div>

                          <button 
                            onClick={onNextContact}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 flex items-center gap-2"
                          >
                            Next Mission <ChevronRight className="w-4 h-4" />
                          </button>

                      </div>
                  </div>
              )}

            </div>

            {/* Controls Footer */}
            {callState === 'calling' && !isLowEnergy && (
              <div className="bg-slate-900 border-t border-slate-800 p-4 flex flex-col gap-3">
                 {/* Recognition Error Alert */}
                 {recognitionError && (
                   <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 text-xs text-red-200 animate-in slide-in-from-bottom-2">
                     <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                     <div className="flex-1">
                       <p className="font-medium">{recognitionError}</p>
                       {recognitionError.includes("blokován") && (
                         <p className="text-red-300/70 mt-1">Chrome: Klikněte na ikonu 🔒 vedle URL → Povolit mikrofon</p>
                       )}
                     </div>
                     <button 
                       onClick={() => setRecognitionError(null)}
                       className="text-red-400 hover:text-red-300"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                 )}
                 
                 {/* Chat Input with Voice Control */}
                 <div className="flex gap-2">
                    <button 
                        onClick={toggleRecording}
                        className={`p-3 rounded-lg transition-all border ${isRecording ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-red-900/20 shadow-lg animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:border-slate-600'}`}
                        title={isRecording ? "Zastavit nahrávání (Mic vypnut)" : "Spustit hlasový přepis (Mic zapnut)"}
                    >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <input 
                        className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 font-medium"
                        placeholder={isRecording ? "🎤 Poslouchám... (nebo pište)" : "Napište odpověď (nebo použijte mikrofon)"}
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        autoFocus
                        disabled={isThinking}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!userMessage.trim() || isThinking}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-4 rounded-lg transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                 </div>

                 {/* Call Controls */}
                 <div className="flex gap-3 opacity-50 hover:opacity-100 transition-opacity">
                     <button onClick={() => handleEndCall('connected')} className="flex-1 h-8 bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-500 border border-emerald-900/30 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                        <Check className="w-3 h-3" /> Connected
                     </button>
                     <button onClick={() => handleEndCall('no-answer')} className="flex-1 h-8 bg-slate-800 hover:bg-slate-700 text-slate-500 border border-slate-700 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                        <X className="w-3 h-3" /> No Answer
                     </button>
                 </div>
              </div>
            )}

            {/* Controls Footer (Async Mode) */}
            {isLowEnergy && callState === 'drafting' && (
              <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 text-slate-400 text-xs">
                 <span>Generování návrhu na základě historie...</span>
                 <Button variant="ghost" className="text-white hover:bg-slate-800" onClick={() => setCallState('wrapping')}>Skip Generation</Button>
              </div>
            )}
            
             {/* Controls Footer (Review Mode) */}
            {isLowEnergy && callState === 'wrapping' && (
              <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 px-6">
                 <button onClick={handleSendEmail} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Approve & Send
                 </button>
                 <button onClick={onNextContact} className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    Edit Manually
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AUTO-ADMIN (3 cols) - Hidden in Focus Mode */}
        {!isFocusMode && (
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-right-4 fade-in duration-300">
           
           {/* BANT CARD - Minimalist (Hidden in Async Mode or Simplified) */}
           {!isLowEnergy && (
             <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
               <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                 <Target className="w-3 h-3" /> Live CRM Extraction
               </div>
               
               <div className="space-y-4">
                 {['Budget', 'Authority', 'Need', 'Timeline'].map((field) => (
                   <div key={field} className="group">
                     <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">{field}</label>
                     <div className="relative">
                       <input 
                         disabled={callState !== 'wrapping'}
                         className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:bg-transparent disabled:border-transparent disabled:pl-0 disabled:text-slate-400"
                         placeholder="Listening..."
                         value={bant[field.toLowerCase() as keyof typeof bant]}
                       />
                       {bant[field.toLowerCase() as keyof typeof bant] && (
                         <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
           
           {isLowEnergy && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                  <BrainCircuit className="w-3 h-3" /> Async Strategy
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Pro tento kontakt AI doporučuje <strong>edukační e-mail</strong> namísto přímého prodeje.
                </p>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                     <Check className="w-3 h-3 text-green-500" /> Zmínit investici
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                     <Check className="w-3 h-3 text-green-500" /> Nabídnout API docs
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                     <Check className="w-3 h-3 text-green-500" /> Soft CTA
                   </div>
                </div>
              </div>
           )}

           {/* NEXT STEPS / DRAFT (Only show in Call Mode) */}
           {!isLowEnergy && callState === 'wrapping' && (
             <div className="bg-white rounded-xl border border-purple-200 p-5 flex-1 flex flex-col shadow-lg shadow-purple-500/5 animate-in fade-in slide-in-from-right-4">
               {isGenerating ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="relative">
                       <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                       </div>
                    </div>
                    <p className="text-sm font-medium text-slate-600">Synthesizing conversation...</p>
                  </div>
               ) : (
                 <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" /> AI Follow-up
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Ready</span>
                  </div>
                  
                  <Textarea 
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    className="flex-1 bg-slate-50 border-slate-200 text-slate-700 text-xs resize-none focus:border-purple-500 focus:ring-purple-500 mb-4 p-3 leading-relaxed"
                  />

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-medium text-indigo-900">Meeting: Tuesday 10:00 AM</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400 ml-auto" />
                    </div>

                    <Button 
                      onClick={handleSendEmail}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 shadow-lg shadow-indigo-500/20"
                    >
                      Approve & Dial Next
                    </Button>
                  </div>
                 </>
               )}
             </div>
           )}

        </div>
        )}
      </div>
    </div>
    </div>
  );
}
