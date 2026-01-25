import React, { useState, useRef } from "react";
import {
  Phone,
  LayoutDashboard,
  LogOut,
  Zap,
  Clock,
  BarChart3,
  Settings,
  Command,
  Search,
  Bell,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Video,
  Bot,
  Menu,
  X,
} from "lucide-react";
import { MentorIsland, MentorMood } from "../ui/MentorIsland";
import { StreakCelebration } from "../ui/StreakCelebration";
import { BreakReminder } from "../ui/BreakReminder";

type EnergyLevel = "low" | "medium" | "high";

type DashboardLayoutProps = {
  children: React.ReactNode;
  dailyCount: number;
  userName: string;
  currentScreen: string;
  onNavigate: (screen: any) => void;
  pomodoroSession?: number;
  mentorMessage?: string | null;
  mentorMood?: MentorMood;
  energy?: EnergyLevel;
  streak?: number;
  showBreakReminder?: boolean;
  onTakeBreak?: () => void;
  onDismissBreak?: () => void;
  onDismissStreak?: () => void;
};

export function DashboardLayout({
  children,
  dailyCount,
  userName,
  currentScreen,
  onNavigate,
  pomodoroSession = 1,
  mentorMessage = null,
  mentorMood = "neutral",
  energy = "high",
  streak = 0,
  showBreakReminder = false,
  onTakeBreak = () => {},
  onDismissBreak = () => {},
  onDismissStreak = () => {},
}: DashboardLayoutProps) {
  const [systemBallPos, setSystemBallPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = ballRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setSystemBallPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* GLOBAL OVERLAYS */}
      <MentorIsland
        key={mentorMessage || "idle"}
        message={mentorMessage}
        mood={mentorMood}
        isVisible={currentScreen !== "call"} // Hide in call screen to avoid conflict with local mentor
      />

      <StreakCelebration
        streak={streak}
        isVisible={streak > 0 && streak % 3 === 0} // Celebration logic: every 3 calls
        onDismiss={onDismissStreak}
      />

      <BreakReminder
        isVisible={showBreakReminder}
        energyLevel={energy}
        onTakeBreak={onTakeBreak}
        onDismiss={onDismissBreak}
      />

      {/* PREMIUM DARK SIDEBAR - responsive */}
      <aside
        className={`${
          mobileMenuOpen ? "fixed inset-0 z-40" : "hidden"
        } md:static md:flex md:w-[260px] bg-[#0F172A] flex flex-col flex-shrink-0 z-20 transition-all duration-300 ease-in-out`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3 font-bold text-lg tracking-tight text-white">
            <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="hidden sm:inline font-sans">
              Echo<span className="text-slate-500 font-light">OS</span>
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* KPI Mini-Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-700/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Session {pomodoroSession}
              </span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </div>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-bold text-white tracking-tight">
                {dailyCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                calls done
              </span>
            </div>
            <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                style={{ width: "65%" }}
              ></div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-6">
              Platform
            </p>

            <NavItem
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Command Center"
              active={currentScreen === "dashboard"}
              onClick={() => onNavigate("dashboard")}
            />
            <NavItem
              icon={<Phone className="w-4 h-4" />}
              label="Live Campaigns"
              active={currentScreen === "campaigns" || currentScreen === "call"}
              onClick={() => onNavigate("campaigns")}
              badge="12"
            />
            <NavItem
              icon={<BarChart3 className="w-4 h-4" />}
              label="Intelligence"
              active={currentScreen === "analytics"}
              onClick={() => onNavigate("analytics")}
            />
            <NavItem
              icon={<Video className="w-4 h-4" />}
              label="Meet Coach"
              active={currentScreen === "meet"}
              onClick={() => onNavigate("meet")}
            />

            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-8">
              System
            </p>

            <NavItem
              icon={<Settings className="w-4 h-4" />}
              label="Configuration"
              active={currentScreen === "settings"}
              onClick={() => onNavigate("settings")}
            />
          </div>
        </div>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          {/* Energy Indicator */}
          <div className="mb-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Energy Level
              </span>
              {energy === "high" && (
                <BatteryFull className="w-4 h-4 text-green-400" />
              )}
              {energy === "medium" && (
                <BatteryMedium className="w-4 h-4 text-yellow-400" />
              )}
              {energy === "low" && (
                <BatteryLow className="w-4 h-4 text-red-400 animate-pulse" />
              )}
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  energy === "high"
                    ? "bg-green-500 w-full"
                    : energy === "medium"
                    ? "bg-yellow-500 w-2/3"
                    : "bg-red-500 w-1/3"
                }`}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {userName}
              </div>
              <div className="text-xs text-slate-500 truncate">
                Pro Plan • Online
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-600" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#F8FAFC]">
        {/* Top Bar (Search & Global Actions) - responsive */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-10 gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar - hidden on mobile, responsive on larger */}
          <div className="hidden sm:flex items-center gap-3 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 flex-1 max-w-md">
            <Search className="w-4 h-4" />
            <span className="text-sm">
              Search contacts, deals, or commands...
            </span>
            <span className="ml-auto text-xs font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">
              ⌘K
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>

          {/* DRAGGABLE SYSTEM BALL */}
          <div
            ref={ballRef}
            onMouseDown={handleMouseDown}
            className="fixed w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 shadow-2xl shadow-slate-900/50 cursor-grab active:cursor-grabbing flex items-center justify-center z-[100] transition-all hover:shadow-slate-900/70 hover:from-slate-600 hover:to-slate-700"
            style={{
              left: `${systemBallPos.x}px`,
              top: `${systemBallPos.y}px`,
              userSelect: "none",
            }}
            title="Drag me around!"
          >
            <Bot className="w-6 h-6 text-white fill-current" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`${
            active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
          }`}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            active ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
