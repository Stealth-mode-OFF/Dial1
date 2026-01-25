import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type MainLayoutProps = {
  children: React.ReactNode;
  currentScreen: string;
  onNavigate: (screen: any) => void;
  dailyCount: number;
  onLogout: () => void;
  headerTitle?: string;
};

export function MainLayout({ 
  children, 
  currentScreen, 
  onNavigate, 
  dailyCount, 
  onLogout,
  headerTitle 
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-slate-50/50 font-sans text-slate-900 overflow-hidden selection:bg-blue-100 selection:text-blue-700">
      <Sidebar 
        currentScreen={currentScreen} 
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header 
          dailyCount={dailyCount} 
          userName="Alex" // Hardcoded for MVP
          title={headerTitle}
        />
        
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Background decoration - Fun/Apple vibe */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/20 blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/20 blur-3xl opacity-50"></div>
        </div>
      </div>
    </div>
  );
}
