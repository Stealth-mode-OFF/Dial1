import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Mic, Zap, AlertCircle, CheckCircle2, Trophy, Flame, Send, X, MessageSquare, ChevronDown } from 'lucide-react';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../../utils/supabase/info';

export type MentorMood = 'neutral' | 'happy' | 'stern' | 'concerned' | 'waiting';

type Message = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

type MentorIslandProps = {
  message: string | null;
  mood: MentorMood;
  isVisible?: boolean;
};

export function MentorIsland({ message: initialMessage, mood: initialMood, isVisible = true }: MentorIslandProps) {
  // State for Chat Mode
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Internal state for messages/mood (can be overridden by props)
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localMood, setLocalMood] = useState<MentorMood>('neutral');
  const [history, setHistory] = useState<Message[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper to format text with bolding
  const formatMessage = (text: string) => {
    // Split by **
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-indigo-200">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
  };

  // Sync props to local state when they change
  useEffect(() => {
    if (initialMessage) {
        setLocalMessage(initialMessage);
        setLocalMood(initialMood);
        
        // Add system message to history if it's new
        setHistory(prev => {
            const last = prev[prev.length - 1];
            if (last?.content !== initialMessage) {
                return [...prev, { role: 'assistant', content: initialMessage }];
            }
            return prev;
        });
    }
  }, [initialMessage, initialMood]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isChatOpen]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput("");
    setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);
    setLocalMood('waiting');

    try {
        const url = buildFunctionUrl('mentor-chat');
        if (!url) return;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
                message: userMsg,
                history: history.slice(-10) // Keep context manageable
            })
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setLocalMessage(data.reply); // Show explicitly in the island too
        setLocalMood(data.mood || 'neutral');

    } catch (e) {
        console.error(e);
        setHistory(prev => [...prev, { role: 'system', content: "Spojení s velitelstvím přerušeno. Zkuste to znovu." }]);
        setLocalMood('concerned');
    } finally {
        setIsTyping(false);
    }
  };

  const getMoodColor = () => {
    const activeMood = localMood;
    switch (activeMood) {
      case 'happy': return 'bg-indigo-500 shadow-indigo-500/50';
      case 'stern': return 'bg-red-600 shadow-red-500/50';
      case 'concerned': return 'bg-amber-500 shadow-amber-500/50';
      case 'waiting': return 'bg-emerald-500 shadow-emerald-500/50';
      default: return 'bg-slate-700 shadow-slate-500/30';
    }
  };

  const getMoodGlow = () => {
    const activeMood = localMood;
    switch (activeMood) {
      case 'happy': return 'text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]';
      case 'stern': return 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]';
      case 'concerned': return 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]';
      case 'waiting': return 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex justify-center pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            layout
            initial={{ width: 200, height: 48, opacity: 0, y: -50 }}
            animate={{ 
              width: isChatOpen ? 400 : (localMessage ? 'auto' : 200),
              height: isChatOpen ? 500 : (localMessage ? 'auto' : 48),
              opacity: 1, 
              y: 0 
            }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`pointer-events-auto bg-[#020617] border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col items-center overflow-hidden transition-colors duration-500 relative min-w-[200px] max-w-[600px]`}
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-black pointer-events-none"></div>
            
            {/* Dynamic Glow */}
            <div className={`absolute top-0 left-0 w-full transition-all duration-1000 ${isChatOpen ? 'h-32' : 'h-1/2'} opacity-20 bg-gradient-to-b ${localMood === 'stern' ? 'from-red-900' : localMood === 'happy' ? 'from-indigo-900' : 'from-slate-800'} to-transparent blur-xl`}></div>

            {/* HEADER / COLLAPSED VIEW */}
            <div 
                className="relative z-10 w-full px-1 cursor-pointer"
                onClick={() => !isChatOpen && setIsChatOpen(true)}
            >
              
              <div className="h-12 flex items-center justify-between px-4 w-full gap-4">
                 
                 {/* Left: AI Icon */}
                 <div className="flex items-center gap-3 flex-shrink-0">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${getMoodColor()}`}>
                      <Bot className="w-5 h-5 text-white" />
                   </div>
                   {(!localMessage && !isChatOpen) && (
                     <span className="text-slate-500 font-mono text-xs tracking-widest uppercase font-bold whitespace-nowrap">System Active</span>
                   )}
                 </div>

                 {/* Center: Voice Visualizer (Only visible when NOT chat open but has message) */}
                 {!isChatOpen && localMessage && (
                   <div className="flex gap-1 items-center h-4 mx-2">
                     {[1,2,3,4,5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [4, 16, 8, 20, 4] }}
                          transition={{ 
                            repeat: Infinity, 
                            // REMOVE: No random duration, use fixed or config value
                            duration: 0.75,
                            ease: "easeInOut",
                            delay: i * 0.1
                          }}
                          className={`w-1 rounded-full ${
                             localMood === 'stern' ? 'bg-red-500' : 
                             localMood === 'happy' ? 'bg-indigo-500' : 
                             'bg-slate-500'
                          }`}
                        />
                     ))}
                   </div>
                 )}
                 
                 {/* Right: Controls */}
                 <div className="flex items-center gap-2">
                     {!isChatOpen && !localMessage && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                     )}
                     
                     {isChatOpen && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsChatOpen(false); }}
                            className="p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                     )}
                 </div>
              </div>

              {/* Message Preview (Collapsed State) */}
              <AnimatePresence>
                {!isChatOpen && localMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 pt-1 text-center"
                  >
                    <p className={`text-lg font-medium leading-relaxed font-sans ${getMoodGlow()}`}>
                      "{formatMessage(localMessage)}"
                    </p>
                    <div className="mt-2 text-[10px] text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Click to Reply
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* CHAT INTERFACE (Expanded State) */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex-1 flex flex-col min-h-0 relative z-10 border-t border-slate-800/50"
                    >
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {history.length === 0 && (
                                <div className="text-center text-slate-500 text-sm mt-8">
                                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    Kapitán je připraven. <br/>Jaké jsou rozkazy?
                                </div>
                            )}
                            
                            {history.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                                    }`}>
                                        {formatMessage(msg.content)}
                                    </div>
                                </motion.div>
                            ))}
                            
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 rounded-2xl px-4 py-3 rounded-tl-sm flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[#020617] border-t border-slate-800 flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Zadejte příkaz..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                autoFocus
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isTyping}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
