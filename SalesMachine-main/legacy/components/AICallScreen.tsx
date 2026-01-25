import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { 
  Phone, Check, X, Mail, Sparkles, 
  BrainCircuit, Target, ShieldAlert, Zap, Calendar, Network, Mic, MicOff, ChevronRight, Command,
  Coffee, Send, PenTool, Loader2, Trophy, TrendingUp, AlertTriangle, AlertCircle, Maximize2, Minimize2, Flame,
  UserCheck, Shield, Compass, ListChecks, Gauge, ClipboardCheck
} from 'lucide-react';
import type { Contact, EnergyLevel, MoodLevel } from '../App';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';
import { CallProgressTracker } from './CallProgressTracker';

import { ROICalculator } from './ROICalculator';

type AICallScreenProps = {
  contact: Contact;
  contactNumber: number;
  totalContacts: number;
  campaignId: string;
  onNextContact: () => void;
  onCallComplete: (transcript: any[], analysis?: any) => void;
  energy: EnergyLevel;
  mood: MoodLevel;
  salesStyle: 'hunter' | 'consultative';
};

type CallState = 'analyzing' | 'ready' | 'calling' | 'wrapping' | 'drafting' | 'sending' | 'computing_score' | 'debrief';
type Disposition = 'connected' | 'no-answer' | 'sent' | 'scheduled';
type CallStage = 'opening' | 'discovery' | 'pitch' | 'close';

type AnalysisResult = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  coachingTip: string;
};

export function AICallScreen({ contact, contactNumber, totalContacts, campaignId, onNextContact, onCallComplete, energy, mood, salesStyle }: AICallScreenProps) {
  const supabaseReady = isSupabaseConfigured;
  const buildUrl = (path: string) => buildFunctionUrl(path);
  const [callState, setCallState] = useState<CallState>('analyzing');
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  const [callStage, setCallStage] = useState<CallStage>('opening');
  
  // Simulation State
  const [transcript, setTranscript] = useState<any[]>([]);
  const [activeBattleCard, setActiveBattleCard] = useState<string | null>(null);
  const [battleCardContent, setBattleCardContent] = useState<string | null>(null);
  
  // SECTOR BATTLE CARD STATE
  const [sectorBattleCard, setSectorBattleCard] = useState<{
      detected_sector: string;
      sector_emoji: string;
      strategy_insight: string;
      objections: Array<{ trigger: string, rebuttal: string }>;
  } | null>(null);

  const [isBattleCardLoading, setIsBattleCardLoading] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [callStreak, setCallStreak] = useState(0);
  const [duration, setDuration] = useState(0); // Call Timer
  const [sessionTime, setSessionTime] = useState(0); // Total session time
  
  // ADHD: Track "good actions" during call for instant feedback
  const [goodQuestionsCount, setGoodQuestionsCount] = useState(0);

  // MENTOR STATE (The Father Figure)
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [mentorMood, setMentorMood] = useState<'neutral' | 'happy' | 'stern' | 'concerned'>('neutral');
  const [showMentor, setShowMentor] = useState(true);

  const operatorHint = useMemo(() => {
    if (callState !== 'calling' && callState !== 'wrapping') return null;

    const personalityHint = contact.personalityType?.advice;
    const painHint = contact.hiringSignal;

    switch (callStage) {
      case 'opening':
        return painHint
          ? `Otevírací tah: navazuj na "${painHint}".`
          : 'Otevírací tah: zjisti hlavní problém s retencí nebo energií týmu.';
      case 'discovery':
        return personalityHint
          ? `Styl: ${personalityHint}`
          : 'Discovery: ptej se na dopad (čas, peníze, fluktuace).';
      case 'pitch':
        return 'Pitch: jedna věta = bolest → dopad → Echo řešení.';
      case 'close':
      case 'close':
        return 'Close: dohodni konkrétní další krok a termín.';
      default:
        return null;
    }
  }, [callState, callStage, contact.hiringSignal, contact.personalityType?.advice]);

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

  // 2. MENTOR: Idle Detection (ADHD Drift Check) - SHORTENED for better ADHD management
  useEffect(() => {
      if (callState === 'ready') {
          const idleTimer = setTimeout(() => {
              setMentorMood('stern');
              setMentorMessage("Hej! Koukáš do zdi. To číslo se samo nevytočí. Klikni na to.");
              setShowMentor(true);
          }, 20000); // 20s of inaction triggers nudge (was 45s - too long for ADHD)
          return () => clearTimeout(idleTimer);
      }
  }, [callState]);

  // Allow external WebRTC stack to inject remote audio stream for dual-party capture
  useEffect(() => {
      (window as any).setEchoRemoteStream = (stream: MediaStream) => {
          setRemoteStream(stream);
      };
      return () => {
          delete (window as any).setEchoRemoteStream;
      };
  }, []);

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

  const formatSession = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m on shift`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m on shift`;
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
  
  // MediaRecorder for Backend Transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localInputStreamRef = useRef<MediaStream | null>(null);
  const remoteInputStreamRef = useRef<MediaStream | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
  const isProcessingChunksRef = useRef(false);
  const [liveTranscriptText, setLiveTranscriptText] = useState('');
  const [liveTranscriptSegments, setLiveTranscriptSegments] = useState<{ text: string; ts: number }[]>([]);
  const [liveStreamStatus, setLiveStreamStatus] = useState<'idle' | 'starting' | 'streaming' | 'error'>('idle');

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

  const processChunkQueue = async () => {
    if (!supabaseReady) return;
    if (isProcessingChunksRef.current) return;
    const url = buildUrl('ai/transcribe');
    if (!url) {
      setLiveStreamStatus('error');
      chunkQueueRef.current = [];
      return;
    }

    isProcessingChunksRef.current = true;
    while (chunkQueueRef.current.length > 0) {
      const next = chunkQueueRef.current.shift();
      if (!next || next.size === 0) continue;
      try {
        setLiveStreamStatus((prev) => prev === 'error' ? 'starting' : 'streaming');
        const formData = new FormData();
        formData.append("file", next, `chunk-${Date.now()}.webm`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const text = (data.text || "").trim();
          if (text) {
            setLiveTranscriptSegments(prev => [...prev, { ts: Date.now(), text }]);
            setLiveTranscriptText(prev => prev ? `${prev}\n${text}` : text);
          }
          setLiveStreamStatus('streaming');
        } else {
          setLiveStreamStatus('error');
        }
      } catch (err) {
        console.error("Live chunk transcription failed", err);
        setLiveStreamStatus('error');
      }
    }
    isProcessingChunksRef.current = false;
    if (chunkQueueRef.current.length > 0) {
      processChunkQueue();
    }
  };

  const enqueueTranscriptionChunk = (blob: Blob) => {
    if (!supabaseReady || !blob || blob.size === 0) return;
    chunkQueueRef.current.push(blob);
    processChunkQueue();
  };

  // Auto-start recording when call begins
  useEffect(() => {
    if (callState === 'calling' && !isRecording) {
      console.log("📞 Call started - attempting to enable microphone...");
      
      const startAudioChain = async () => {
          // 1. Try MediaRecorder (Best Effort - Don't block if fails)
          try {
              setLiveTranscriptText('');
              setLiveTranscriptSegments([]);
              chunkQueueRef.current = [];
              setLiveStreamStatus('starting');

              // Grab local mic
              const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              localInputStreamRef.current = localStream;
              const remoteCandidate = remoteStream || ((window as any).__echoRemoteStream as MediaStream | undefined);
              const remoteAudioStream = remoteCandidate ? new MediaStream(remoteCandidate.getAudioTracks()) : null;
              remoteInputStreamRef.current = remoteAudioStream;

              // Mix local + remote into one stream (if remote exists)
              let combinedStream: MediaStream | null = null;
              if (typeof window !== 'undefined' && (localStream || remoteAudioStream)) {
                  try {
                      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
                      const ctx = new AudioContextClass();
                      audioContextRef.current = ctx;
                      destinationRef.current = ctx.createMediaStreamDestination();
                      const destination = destinationRef.current;
                      if (!destination) throw new Error("No audio destination");
                      
                      if (localStream) {
                          const localSource = ctx.createMediaStreamSource(localStream);
                          localSourceRef.current = localSource;
                          localSource.connect(destination);
                      }
                      if (remoteAudioStream && remoteAudioStream.getAudioTracks().length > 0) {
                          const remoteSource = ctx.createMediaStreamSource(remoteAudioStream);
                          remoteSourceRef.current = remoteSource;
                          remoteSource.connect(destination);
                      }
                      combinedStream = destination.stream;
                  } catch (mixErr) {
                      console.warn("⚠️ Audio mix failed, falling back to mic only", mixErr);
                  }
              }

              const recorderStream = combinedStream || localStream;
              if (!recorderStream) {
                  setLiveStreamStatus('error');
                  throw new Error("No audio stream available");
              }

              const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
                               MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
              const recorder = new MediaRecorder(recorderStream, { mimeType });
              mediaRecorderRef.current = recorder;
              audioChunksRef.current = [];

              recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) {
                      audioChunksRef.current.push(e.data);
                      enqueueTranscriptionChunk(e.data); // Live partial STT
                  }
              };

              recorder.start(4000); // Fire chunk every 4s for live transcription
              setLiveStreamStatus('streaming');
              setIsRecording(true);
              console.log("✅ MediaRecorder active (dual-party ready)");
          } catch (err: any) {
              // Be very quiet about permission errors to avoid console noise
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                  console.warn("⚠️ Audio recording permission denied (continuing in text mode)");
                  setLiveStreamStatus('error');
              } else {
                  console.warn("⚠️ MediaRecorder failed (Backend audio will be skipped):", err);
                  setLiveStreamStatus('error');
              }
              // We DO NOT stop here. We continue to try SpeechRecognition.
          }

          // 2. Try SpeechRecognition (Independent start)
          if (recognitionRef.current && !isRecognitionActiveRef.current) {
              try {
                  recognitionRef.current.start();
                  setIsRecording(true);
                  console.log("✅ SpeechRecognition active");
              } catch (e: any) {
                  console.warn("SpeechRecognition start warning:", e);
                  if (e.name === 'NotAllowedError' || e.message?.includes('denied')) {
                      setRecognitionError("Mikrofon nedostupný. Pokračujte psaním.");
                      setIsRecording(false);
                  }
              }
          }
      };

      startAudioChain();
    }
    
    // Auto-stop recording when call ends
    if (callState !== 'calling' && isRecording) {
        // ... existing cleanup logic ...
        console.log("📴 Call ended - stopping microphone...");
      
       // Stop Web Speech
       if (recognitionRef.current) {
           try {
             recognitionRef.current.stop();
             setIsRecording(false);
             setInterimText("");
           } catch (e) {
             console.warn("Stop Speech warning", e);
           }
       }

       // Stop MediaRecorder
       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
           mediaRecorderRef.current.stop();
           mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
       }
       chunkQueueRef.current = [];
       isProcessingChunksRef.current = false;
       setLiveStreamStatus('idle');
       if (audioContextRef.current) {
           audioContextRef.current.close().catch(() => {});
           audioContextRef.current = null;
       }
       if (localInputStreamRef.current) {
           localInputStreamRef.current.getTracks().forEach(track => track.stop());
           localInputStreamRef.current = null;
       }
       if (remoteInputStreamRef.current) {
           remoteInputStreamRef.current.getTracks().forEach(track => track.stop());
           remoteInputStreamRef.current = null;
       }
       destinationRef.current = null;
       localSourceRef.current = null;
       remoteSourceRef.current = null;
    }
  }, [callState]);

  // Attach remote audio stream later (e.g., when WebRTC handshake finishes)
  useEffect(() => {
    if (callState !== 'calling') return;
    if (!remoteStream || !audioContextRef.current || !destinationRef.current) return;
    if (remoteSourceRef.current) return;
    if (remoteStream.getAudioTracks().length === 0) return;

    try {
        const remoteAudio = new MediaStream(remoteStream.getAudioTracks());
        remoteInputStreamRef.current = remoteAudio;
        const source = audioContextRef.current.createMediaStreamSource(remoteAudio);
        remoteSourceRef.current = source;
        source.connect(destinationRef.current);
        console.log("✅ Remote audio attached to live mix");
    } catch (err) {
        console.warn("⚠️ Failed to attach remote audio to mix", err);
    }
  }, [remoteStream, callState]);

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
  const logCallToBackend = async (disposition: Disposition, notes?: string) => {
    try {
        if (!supabaseReady) return;
        const url = buildUrl('call-logs');
        if (!url) return;

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
                campaignId,
                contactId: contact.id,
                contactName: contact.name,
                companyName: contact.company,
                disposition,
                notes,
                duration
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
        const url = buildUrl('ai/generate');
        if (!url || !supabaseReady) return "Supabase není nakonfigurován. Přidejte klíče a zkuste znovu.";

        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({
                contactName: contact.name,
                company: contact.company,
                goal: 'Schedule a follow-up meeting',
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
    setSectorBattleCard(null);

    if (!supabaseReady) {
        setMentorMood('concerned');
        setMentorMessage("Supabase není nakonfigurován. Přidejte VITE_SUPABASE_PROJECT_ID a VITE_SUPABASE_ANON_KEY.");
        setCallState('ready');
        return;
    }

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
            // Parallelize research, script generation AND Battle Card generation
            const researchUrl = buildUrl('ai/generate');
            const researchPromise = researchUrl ? fetch(researchUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}` 
                },
                body: JSON.stringify({
                    contactName: contact.name,
                    company: contact.company,
                    type: 'research',
                    contextData: { email: contact.email }
                })
            }) : Promise.resolve(null);

            // Fetch SECTOR BATTLE CARD
            const battleCardUrl = buildUrl('ai/sector-battle-card');
            const battleCardPromise = battleCardUrl ? fetch(battleCardUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}` 
                },
                body: JSON.stringify({
                    companyName: contact.company,
                    // Use whatever industry info we might have, or let AI infer it
                    industry: (contact as any).smart_enrichment?.industry_vertical || "",
                    personTitle: contact.role
                })
            }).then(res => res.ok ? res.json() : null) : Promise.resolve(null);

            // If no simulation script (Pipedrive contact), generate one
            let scriptPromise = Promise.resolve(null);
            if (!contact.simulationScript) {
                scriptPromise = generateAIText('script').then(text => {
                    setGeneratedScript(text);
                    return null;
                });
            }

            const [res, battleCardData] = await Promise.all([researchPromise, battleCardPromise, scriptPromise]);

            if (battleCardData) {
                console.log("⚔️ Battle Card Loaded:", battleCardData);
                setSectorBattleCard(battleCardData);
            }

            if (res && res.ok) {
                const data = await res.json();
                // Update contact info in local state (visual only for this screen)
                contact.aiSummary = data.aiSummary;
                contact.hiringSignal = data.hiringSignal;
                contact.intentScore = data.intentScore;
                
                // Save smart enrichment data to contact for PostCallScreen
                if (data.smart_enrichment) {
                    (contact as any).smart_enrichment = data.smart_enrichment;
                }

                // --- AUTO ENRICHMENT (PIPEDRIVE) ---
                // If we have extracted CRM data and a Pipedrive Org ID, auto-update it
                const enrichmentData = data.smart_enrichment || data.extracted_crm_data;
                
                if (enrichmentData && (contact as any).org_id) {
                    console.log("🛠 Auto-Enriching Pipedrive Org...", enrichmentData);
                    const enrichUrl = buildUrl(`pipedrive/enrich-org/${(contact as any).org_id}`);
                    if (enrichUrl) {
                        fetch(enrichUrl, {
                            method: 'PATCH',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${publicAnonKey}` 
                            },
                            body: JSON.stringify({ smart_enrichment: enrichmentData })
                        }).catch(err => console.error("Enrichment failed", err));
                    }
                }
                // -----------------------------------

                if (data.personalityType) {
                    contact.personalityType = {
                        type: data.personalityType.type || "Unknown",
                        advice: data.personalityType.advice || "Be professional."
                    };
                }

                // PERSIST INTELLIGENCE TO BACKEND
                const cacheUrl = buildUrl(`contact-intel/${contact.id}`);
                if (cacheUrl) {
                    fetch(cacheUrl, {
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
        if (!supabaseReady) return;
        const url = buildUrl('ai/speak');
        if (!url) return;

        const res = await fetch(url, {
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
    if (!supabaseReady) return;
    const isLiveCall = !contact.simulationScript;
    if (isLiveCall) return;

    if (callState === 'calling' && !isLowEnergy && !hasStarted) {
        setHasStarted(true);
        // AI Prospect speaks first (or waits)
        setIsThinking(true);
        const url = buildUrl('ai/generate');
        if (url) {
            fetch(url, {
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
        } else {
            setIsThinking(false);
        }
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
    if (!supabaseReady) {
        setIsThinking(false);
        return;
    }
    try {
        const url = buildUrl('ai/generate');
        if (!url) return;

        const res = await fetch(url, {
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

  // Auto-detect call stage based on transcript length (ADHD helper) + provide contextual coaching
  useEffect(() => {
    if (callState === 'calling' && transcript.length > 0) {
      const messageCount = transcript.length;
      const previousStage = callStage;
      
      if (messageCount <= 2) {
        setCallStage('opening');
      } else if (messageCount <= 5) {
        if (previousStage !== 'discovery') {
          setCallStage('discovery');
          // ADHD: Provide encouragement when transitioning to discovery
          setMentorMood('happy');
          setMentorMessage("Dobře, teď ptej se. Discovery je tvoje silná stránka.");
          setShowMentor(true);
          setTimeout(() => setShowMentor(false), 6000);
        } else {
          setCallStage('discovery');
        }
      } else if (messageCount <= 8) {
        if (previousStage !== 'pitch') {
          setCallStage('pitch');
          setMentorMood('neutral');
          setMentorMessage("Teď ukaž hodnotu. Konkrétně, ne obecně.");
          setShowMentor(true);
          setTimeout(() => setShowMentor(false), 6000);
        } else {
          setCallStage('pitch');
        }
      } else {
        if (previousStage !== 'close') {
          setCallStage('close');
          setMentorMood('stern');
          setMentorMessage("Zavírej. Zeptej se na meeting. Neboj se.");
          setShowMentor(true);
          setTimeout(() => setShowMentor(false), 6000);
        } else {
          setCallStage('close');
        }
      }
    }
  }, [transcript.length, callState, callStage]);

  // ADHD: Detect good questions in discovery phase for instant positive reinforcement
  useEffect(() => {
    if (callStage === 'discovery' && transcript.length > 0) {
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.speaker === 'me' && lastMessage.text.includes('?')) {
        const questionWords = ['proč', 'jak', 'co', 'kdy', 'kdo', 'kolik', 'why', 'how', 'what', 'when', 'who', 'which'];
        const hasGoodQuestion = questionWords.some(word => lastMessage.text.toLowerCase().includes(word));
        if (hasGoodQuestion) {
          setGoodQuestionsCount(prev => {
            const newCount = prev + 1;
            // Instant positive feedback on first good question
            if (newCount === 1) {
              setMentorMood('happy');
              setMentorMessage("Výborná otázka! Takhle zjišťuješ pain points.");
              setShowMentor(true);
              setTimeout(() => setShowMentor(false), 4000);
            } else if (newCount === 3) {
              setMentorMood('happy');
              setMentorMessage("3 dobré otázky! Jsi v discovery flow. Pokračuj.");
              setShowMentor(true);
              setTimeout(() => setShowMentor(false), 4000);
            }
            return newCount;
          });
        }
      }
    }
  }, [transcript, callStage]);

  // Battle Card AI Logic
  useEffect(() => {
    if (activeBattleCard && !isLowEnergy) {
        // If content is already present (e.g. from live assist), skip fetch
        if (battleCardContent && !isBattleCardLoading) return;

        setBattleCardContent(null);
        setIsBattleCardLoading(true);
        
        // Call AI for advice
        const url = buildUrl('ai/generate');
        if (!url) return;

        fetch(url, {
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

  // 3. LIVE ASSIST LOOP (Real-time Analysis)
  useEffect(() => {
    // Only run if we are in a LIVE call (not simulation), recording is active, and we have transcript
    if (!supabaseReady) return;
    if (callState === 'calling' && isRecording && transcript.length > 0) {
        const intervalId = setInterval(async () => {
             // Get last 3 items or last 200 chars to save tokens/latency
             const recentHistory = transcript.slice(-3).map(t => t.text).join(' ');
             if (recentHistory.length < 20) return; // Too short

             console.log("🧠 Live Assist Scanning...");
             
             try {
                const url = buildUrl('ai/generate');
                if (!url) return;

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}` 
                    },
                    body: JSON.stringify({
                        type: 'live_assist', // Uses fast gpt-4o-mini
                        contextData: { transcript: recentHistory },
                        salesStyle: salesStyle
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    let result;
                    try {
                        result = JSON.parse(data.content);
                    } catch (e) {
                        console.error("Failed to parse live assist JSON", e);
                        return;
                    }
                    
                    if (result.trigger) {
                        console.log("🚨 Live Trigger Detected:", result.trigger);
                        
                        // Mentor reacts immediately
                        setMentorMood('stern'); 
                        setMentorMessage(`TIP: ${result.advice}`);
                        setShowMentor(true);
                        
                        // If it's a known battle card category, show the full card
                        if (result.battleCardKey) {
                            setActiveBattleCard(result.battleCardKey);
                            setBattleCardContent(result.advice); // Show immediate advice while loading full context if needed
                        }
                    }
                }
             } catch (e) {
                 console.error("Live Assist Error", e);
             }
        }, 4000); // Check every 4 seconds

        return () => clearInterval(intervalId);
    }
  }, [callState, isRecording, transcript, salesStyle]);

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


  // 4. MICROPHONE HEARTBEAT (Auto-healing)
  useEffect(() => {
    if (callState === 'calling' && isRecording) {
        const heartbeat = setInterval(() => {
            // Check if recognition died silently (common in some browsers)
            if (recognitionRef.current && !isRecognitionActiveRef.current) {
                console.warn("💓 Mic heartbeat: Restarting silent recognition...");
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Ignore "already started" errors
                }
            }
        }, 2000);
        return () => clearInterval(heartbeat);
    }
  }, [callState, isRecording]);

  const retryMicrophone = async () => {
    setRecognitionError(null);
    console.log("🔄 Retrying microphone access...");
    
    try {
        // 1. Force permission request via getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone permission granted via Retry");
        
        // Stop the temp stream immediately
        stream.getTracks().forEach(track => track.stop());
        
        // 2. Only now restart SpeechRecognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (e) {
                console.log("Recognition already active");
            }
        }
    } catch (err: any) {
        // Use warn instead of error to avoid cluttering console with expected permission issues
        console.warn("Retry microphone attempt failed:", err.name || err);
        setIsRecording(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             setRecognitionError("BLOKOVÁNO: Prohlížeč stále odmítá přístup. Klikněte na zámeček 🔒 v adresním řádku, povolte Mikrofon a OBNOVTE STRÁNKU.");
        } else {
             setRecognitionError("Mikrofon nelze spustit. Zkuste obnovit stránku.");
        }
    }
  };

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
    setTimeout(() => setShowMentor(false), 8000);

    // PROCESS RECORDING & TRANSCRIPT
    const liveCallTranscript = liveTranscriptSegments.length > 0 ? liveTranscriptSegments.map(seg => ({ speaker: 'call', text: seg.text })) : [];
    let recordingText = "";

    if (supabaseReady && audioChunksRef.current.length > 0 && result === 'connected') {
        setIsUploadingAudio(true);
        console.log("📤 Uploading audio for transcription...");
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
            const url = buildUrl('ai/transcribe');
            if (url) {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` },
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    recordingText = data.text;
                    console.log("✅ Whisper Transcript:", recordingText);
                    // Append this high-quality transcript to notes automatically
                    setBant(prev => ({ ...prev, notes: (prev as any).notes ? (prev as any).notes + "\n\nTRANSCRIPT:\n" + recordingText : recordingText }));
                }
            }
        } catch (e) {
            console.error("Transcription upload failed", e);
        } finally {
            setIsUploadingAudio(false);
        }
    }

    const condensedNote = liveTranscriptText || recordingText;
    if (result === 'no-answer') {
        logCallToBackend(result, condensedNote ? `Call logged via Echo OS. Transcript: ${condensedNote.slice(0, 160)}...` : "Call logged via Echo OS");
    }

    if (result === 'connected' && !isLowEnergy) {
        setCallStreak(prev => prev + 1);
        setCallState('computing_score');
        
        // Use the simulation transcript if available (has both sides), otherwise fallback to recorded text
        const analysisSource = liveCallTranscript.length > 0 
            ? liveCallTranscript 
            : (transcript.length > 0 ? transcript : [{ speaker: 'me', text: recordingText }]);

        if (!supabaseReady) {
            onCallComplete(analysisSource);
            return;
        }

        try {
            const url = buildUrl('ai/analyze-call');
            if (!url) {
                onCallComplete(analysisSource);
                return;
            }
            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}` 
                },
                body: JSON.stringify({
                    transcript: analysisSource,
                    salesStyle,
                    contact
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAnalysisResult(data);
                // Pass data to post-call screen
                onCallComplete(analysisSource, data);
            } else {
                onCallComplete(analysisSource);
            }
        } catch (e) {
            console.error("Analysis failed", e);
            onCallComplete(analysisSource);
        }
    } else if (result === 'connected') {
        // For low energy or non-simulated, just pass transcript
        onCallComplete(liveCallTranscript.length > 0 ? liveCallTranscript : transcript);
    } else {
        // No Answer - Skip post-call screen and go straight to next
        onNextContact();
    }
  };

  const handleSendEmail = () => {
    setIsGenerating(true);
    logCallToBackend('sent', emailDraft); // Log the email activity
    setTimeout(() => {
      setIsGenerating(false);
      onNextContact();
    }, 1000);
  };

  const nextBestAction = useMemo(() => {
    if (callState === 'calling') {
      return {
        title: 'Stay on the close',
        cta: 'Push for next step',
        hint: callStage === 'discovery' ? 'Lock 2 more pains, then pivot to value.' : 'Ask for time/date and send calendar link.',
        badge: 'LIVE',
        accent: 'bg-red-500/10 text-red-600 border-red-200'
      };
    }
    if (callState === 'wrapping') {
      return {
        title: 'Log outcome + follow-up',
        cta: 'Approve & send',
        hint: 'Ship the follow-up now so you never forget.',
        badge: 'WRAP',
        accent: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
      };
    }
    if (isLowEnergy) {
      return {
        title: 'Low-energy async touch',
        cta: 'Draft quick mail',
        hint: 'Send a micro-update with 1 value prop and soft CTA.',
        badge: 'ASYNC',
        accent: 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
      };
    }
    return {
      title: 'Next best contact',
      cta: 'Start call',
      hint: contact.aiSummary || 'Open strong: pain → impact → Echo.',
      badge: 'READY',
      accent: 'bg-slate-900 text-white border-slate-800'
    };
  }, [callState, callStage, contact.aiSummary, isLowEnergy]);

  const microGoals = useMemo(() => {
    return [
      {
        label: 'Discovery depth',
        done: goodQuestionsCount >= 3,
        detail: goodQuestionsCount > 0 ? `${goodQuestionsCount}/3 great questions logged` : 'Land 3 sharp questions',
      },
      {
        label: 'CTA locked',
        done: disposition === 'scheduled',
        detail: disposition === 'scheduled' ? 'Meeting booked' : 'Propose a 15-min slot',
      },
      {
        label: 'Notes synced',
        done: callState === 'wrapping' || callState === 'debrief',
        detail: callState === 'wrapping' ? 'Follow-up ready' : 'Prep for follow-up',
      }
    ];
  }, [callState, disposition, goodQuestionsCount]);

  const liveVitals = useMemo(() => ([
    { label: 'Energy', value: energy.toUpperCase(), tone: energy === 'high' ? 'text-emerald-600 bg-emerald-50' : energy === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-100' },
    { label: 'Mood', value: mood.toUpperCase(), tone: mood === 'good' ? 'text-indigo-700 bg-indigo-50' : mood === 'neutral' ? 'text-slate-700 bg-slate-100' : 'text-amber-700 bg-amber-50' },
    { label: 'Session', value: formatSession(sessionTime), tone: 'text-slate-600 bg-slate-100' },
    { label: 'Streak', value: `${callStreak} 🔥`, tone: callStreak > 0 ? 'text-orange-700 bg-orange-50' : 'text-slate-600 bg-slate-100' },
    { label: 'Call', value: callState === 'calling' ? `${formatTime(duration)} live` : 'Idle', tone: callState === 'calling' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-100' },
  ]), [callState, callStreak, duration, energy, mood, sessionTime]);

  const objectionRadar = useMemo(() => {
    if (!sectorBattleCard || !sectorBattleCard.objections) return [] as Array<{ trigger: string; rebuttal: string }>;
    return sectorBattleCard.objections.slice(0, 4);
  }, [sectorBattleCard]);

  const quickOutcomes = useMemo(() => ([
    { label: 'Connected', value: 'connected' as Disposition, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Scheduled', value: 'scheduled' as Disposition, tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'No Answer', value: 'no-answer' as Disposition, tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    { label: 'Sent Follow-up', value: 'sent' as Disposition, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  ]), []);

  const handleQuickOutcome = (result: Disposition) => {
    handleEndCall(result);
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
             onClick={() => setShowCalculator(true)}
             className="p-2 rounded-lg border bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2 px-3"
             title="Open ROI Calculator"
           >
             <TrendingUp className="w-4 h-4" />
             <span className="text-xs font-bold hidden sm:inline">ROI Calc</span>
           </button>

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

      {/* Sales Support HUD */}
      <div className="grid grid-cols-12 gap-4 flex-shrink-0">
        <div className="col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Compass className="w-3 h-3 text-indigo-600" /> Next Best Action
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${nextBestAction.accent}`}>{nextBestAction.badge}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900 leading-tight">{nextBestAction.title}</p>
              <p className="text-sm text-slate-500">{nextBestAction.hint}</p>
            </div>
            <button
              onClick={callState === 'calling' ? () => handleQuickOutcome('scheduled') : handleAction}
              className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/10"
            >
              <Command className="w-4 h-4" /> {nextBestAction.cta}
            </button>
          </div>
        </div>

        <div className="col-span-4 bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-purple-200">
            <ListChecks className="w-3 h-3" /> Coaching Strip
          </div>
          <div className="space-y-2">
            {microGoals.map((goal, idx) => (
              <div key={idx} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${goal.done ? 'bg-emerald-900/30 border-emerald-700 text-emerald-100' : 'bg-white/5 border-white/10 text-slate-100'}`}>
                <div>
                  <p className="text-sm font-semibold">{goal.label}</p>
                  <p className="text-xs text-slate-300">{goal.detail}</p>
                </div>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold ${goal.done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-50' : 'border-white/30 text-white/70'}`}>
                  {goal.done ? <Check className="w-3 h-3" /> : `${idx + 1}`}
                </div>
              </div>
            ))}
          </div>
          {objectionRadar.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {objectionRadar.map((obj, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveBattleCard(obj.trigger.toLowerCase());
                    setBattleCardContent(obj.rebuttal);
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20 transition-colors"
                  title="Open objection battle card"
                >
                  {obj.trigger}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Gauge className="w-3 h-3 text-indigo-600" /> Vitals
          </div>
          <div className="grid grid-cols-2 gap-2">
            {liveVitals.map((item, idx) => (
              <div key={idx} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${item.tone}`}>
                <div className="text-[10px] uppercase font-bold opacity-70">{item.label}</div>
                <div>{item.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {quickOutcomes.map((option) => (
              <button
                key={option.value}
                onClick={() => handleQuickOutcome(option.value)}
                className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${option.tone} hover:shadow-sm`}
                disabled={callState === 'analyzing' || callState === 'computing_score'}
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> {option.label}
              </button>
            ))}
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

          {/* SECTOR BATTLE CARD (Dynamic from Backend) */}
          {sectorBattleCard && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl grayscale group-hover:grayscale-0 transition-all duration-500">
                    {sectorBattleCard.sector_emoji}
                </div>
                
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-3 relative z-10">
                    <Shield className="w-3 h-3" /> Sector Intelligence
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2 relative z-10">
                    {sectorBattleCard.detected_sector}
                </h3>
                
                <p className="text-slate-300 text-xs leading-relaxed mb-4 border-l-2 border-emerald-500/50 pl-3 relative z-10">
                    "{sectorBattleCard.strategy_insight}"
                </p>

                {/* Quick Objections Preview */}
                <div className="space-y-2 relative z-10">
                    {sectorBattleCard.objections.slice(0, 2).map((obj, i) => (
                        <div key={i} className="bg-slate-950/50 rounded p-2 border border-slate-700/50">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Když řekne: "{obj.trigger}"</div>
                            <div className="text-xs text-white font-mono">→ {obj.rebuttal}</div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
        )}

        {/* CENTER COLUMN: LIVE TERMINAL (6 cols) */}
        <div className={`${isFocusMode ? 'col-span-12' : 'col-span-6'} flex flex-col gap-4 transition-all duration-500 ease-in-out`}>
          
          {/* ADHD: Call Progress Tracker - Always visible during call */}
          {callState === 'calling' && !isLowEnergy && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-500">
              <CallProgressTracker currentStage={callStage} />
            </div>
          )}

          {/* Discovery Phase: Good Questions Counter (ADHD Gamification) */}
          {callState === 'calling' && callStage === 'discovery' && goodQuestionsCount > 0 && !isLowEnergy && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 fade-in">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                <span className="text-sm font-bold text-green-900">
                  {goodQuestionsCount} {goodQuestionsCount === 1 ? 'dobrá otázka' : 'dobré otázky'}!
                </span>
              </div>
              <div className="text-xs text-green-600 font-medium">Keep discovering! 🔍</div>
            </div>
          )}

          {/* Dual-party live transcript feed (chunks to Whisper) */}
          {callState === 'calling' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  Live Transcript (Dual)
                </div>
                <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
                  liveStreamStatus === 'streaming' ? 'bg-green-50 text-green-700 border-green-200' :
                  liveStreamStatus === 'starting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  liveStreamStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {liveStreamStatus === 'streaming' ? 'STREAMING' :
                   liveStreamStatus === 'starting' ? 'STARTING...' :
                   liveStreamStatus === 'error' ? 'CHECK INPUT' : 'IDLE'}
                </span>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[72px]">
                {liveTranscriptText || "Zachytáváme kombinovaný audio stream (vy + protistrana) v reálném čase."}
              </div>
              {liveStreamStatus === 'error' && (
                <p className="text-xs text-amber-600">
                  Live přepis se nepodařilo spustit. Zkontrolujte backend klíče, povolení mikrofonu a remote audio stream.
                </p>
              )}
            </div>
          )}
          
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
                  {operatorHint && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
                          <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-2">
                            Operator Mode
                          </div>
                          <p className="text-emerald-100 text-sm leading-relaxed">{operatorHint}</p>
                       </div>
                    </div>
                  )}
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
                  
                  {/* DYNAMIC CONTENT FROM SECTOR API */}
                  {(() => {
                      // Try to find a specific matching objection from the Sector Card
                      const dynamicObjection = sectorBattleCard?.objections.find(o => 
                          (activeBattleCard.includes('budget') && o.trigger.toLowerCase().includes('cena')) ||
                          (activeBattleCard.includes('competitor') && o.trigger.toLowerCase().includes('konkuren')) ||
                          (activeBattleCard.includes('email') && o.trigger.toLowerCase().includes('mail'))
                      );
                      
                      // Fallback content if no dynamic match found
                      const title = activeBattleCard.replace('_', ' ').toUpperCase();
                      const content = dynamicObjection ? dynamicObjection.rebuttal : battleCardContent || "Překonejte námitku otázkou na hodnotu.";

                      return (
                        <div className="flex items-start gap-4">
                            <div className="bg-red-500/20 p-2.5 rounded-lg text-red-400 border border-red-500/30 animate-pulse">
                            <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-red-200 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                                    {sectorBattleCard?.sector_emoji} DETECTED OBJECTION: {title}
                                </h4>
                                <p className="text-white font-bold text-lg leading-tight drop-shadow-md">
                                    "{content}"
                                </p>
                            </div>
                            <button 
                                onClick={() => setActiveBattleCard(null)}
                                className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                      );
                  })()}
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
                       {recognitionError.includes("blokován") || recognitionError.includes("odepřen") ? (
                         <div className="mt-2 flex flex-col gap-2">
                            <p className="text-red-300/70">1. Klikněte na ikonu 🔒 vedle URL<br/>2. Povolte mikrofon<br/>3. Klikněte na tlačítko níže</p>
                            <button 
                                onClick={retryMicrophone}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded border border-red-500/30 w-fit transition-colors font-bold flex items-center gap-2"
                            >
                                <Mic className="w-3 h-3" /> Zkusit znovu
                            </button>
                         </div>
                       ) : null}
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

      {/* ROI CALCULATOR MODAL */}
      <ROICalculator 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />

    </div>
  );
}
