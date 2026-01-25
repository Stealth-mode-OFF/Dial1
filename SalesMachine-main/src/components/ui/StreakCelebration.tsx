import { useEffect, useState } from 'react';
import { Trophy, Flame, Zap, Star, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

type StreakCelebrationProps = {
  streak: number;
  isVisible: boolean;
  onDismiss: () => void;
};

export function StreakCelebration({ streak, isVisible, onDismiss }: StreakCelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!show) return null;

  const getMilestoneMessage = (count: number) => {
    if (count === 3) return { title: "Hat Trick!", subtitle: "3 hovorů v řadě! 🎯", color: "green" };
    if (count === 5) return { title: "On Fire!", subtitle: "5 hovorů! Jsi v flow! 🔥", color: "orange" };
    if (count === 10) return { title: "Unstoppable!", subtitle: "10 hovorů! Legend! ⚡", color: "purple" };
    if (count === 15) return { title: "Master!", subtitle: "15 hovorů! Absolutní šampion! 👑", color: "gold" };
    if (count % 5 === 0) return { title: `${count} Calls!`, subtitle: "Keep crushing it! 💪", color: "blue" };
    return null;
  };

  const milestone = getMilestoneMessage(streak);
  if (!milestone) return null;

  const colorClasses = {
    green: 'from-green-400 to-emerald-600',
    orange: 'from-orange-400 to-red-600',
    purple: 'from-purple-400 to-indigo-600',
    gold: 'from-yellow-400 to-amber-600',
    blue: 'from-blue-400 to-cyan-600'
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: -50 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.5 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
    >
      <div className={`relative rounded-3xl shadow-2xl border-4 border-white/20 p-12 text-center overflow-hidden min-w-[400px] bg-gradient-to-br ${colorClasses[milestone.color as keyof typeof colorClasses]}`}>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              initial={{ 
                x: Math.random() * 400, 
                y: 500,
                opacity: 1,
                scale: Math.random() * 1.5 + 0.5
              }}
              animate={{ 
                y: -100,
                opacity: 0,
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: Math.random() * 2 + 1,
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <motion.div
          initial={{ rotate: 0, scale: 0 }}
          animate={{ rotate: 360, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 mb-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full border-4 border-white/30 backdrop-blur-sm">
            {streak >= 10 ? (
              <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
            ) : streak >= 5 ? (
              <Flame className="w-12 h-12 text-white drop-shadow-lg" />
            ) : (
              <Star className="w-12 h-12 text-white drop-shadow-lg" />
            )}
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 space-y-2"
        >
          <h2 className="text-5xl font-black text-white drop-shadow-2xl tracking-tight">
            {milestone.title}
          </h2>
          <p className="text-xl font-medium text-white/90 drop-shadow-lg">
            {milestone.subtitle}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30">
              <span className="text-2xl font-bold text-white">{streak}</span>
              <span className="text-sm text-white/80 ml-1">calls</span>
            </div>
          </div>
        </motion.div>

        {/* Sparkles */}
        <div className="absolute top-4 right-4">
          <Sparkles className="w-8 h-8 text-white/60 animate-pulse" />
        </div>
        <div className="absolute bottom-4 left-4">
          <Zap className="w-8 h-8 text-white/60 animate-pulse" />
        </div>

      </div>
    </motion.div>
  );
}
