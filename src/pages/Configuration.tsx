import React, { useState } from 'react';
import { Save, LogOut, Bell, Shield, Database, Smartphone, Globe, User } from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { supabase } from '../utils/supabase/client';

export function Configuration() {
  const { user, integrations } = useSales();
  const [activeSection, setActiveSection] = useState('profile');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const sections = [
    { id: 'profile', icon: User, label: 'Identity' },
    { id: 'integrations', icon: Database, label: 'Data Links' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
    { id: 'security', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="p-4 h-full bg-grid-pattern font-sans flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex flex-col gap-4">
        <div className="bg-black text-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
           <h2 className="font-black text-2xl uppercase tracking-tighter">System Config</h2>
           <p className="font-mono text-xs text-slate-400">BUILD 2026.01.23</p>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left p-4 font-bold uppercase border-2 border-black transition-all flex items-center gap-3 shadow-[4px_4px_0px_0px_black] ${isActive ? 'bg-yellow-400 text-black translate-x-[-2px] translate-y-[-2px]' : 'bg-white text-black hover:bg-slate-50 hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}
              >
                <section.icon size={20} strokeWidth={3} />
                {section.label}
              </button>
            )
          })}
        </nav>

        <button 
           onClick={handleSignOut}
           className="mt-auto bg-red-600 text-white p-4 font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_black] hover:bg-red-500 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_black] transition-all flex items-center justify-center gap-2"
        >
           <LogOut size={20} strokeWidth={3} /> Terminate Session
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_black] relative overflow-hidden">
        
        {/* Profile Section */}
        {activeSection === 'profile' && (
           <div className="space-y-8 relative z-10">
              <h2 className="text-4xl font-black uppercase border-b-4 border-black pb-4">Operative Identity</h2>
              
              <div className="flex flex-col md:flex-row items-start gap-8">
                 <div className="w-32 h-32 bg-yellow-400 border-2 border-black flex items-center justify-center text-5xl font-black shadow-[4px_4px_0px_0px_black]">
                    {user.avatarInitials}
                 </div>
                 <div className="flex-1 space-y-4 w-full">
                    <div>
                       <label className="block text-xs font-black uppercase mb-1 bg-black text-white inline-block px-1">Callsign (Name)</label>
                       <input type="text" defaultValue={user.name} className="w-full bg-slate-50 border-2 border-black p-3 font-mono font-bold focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_black] transition-all" />
                    </div>
                    <div>
                       <label className="block text-xs font-black uppercase mb-1 bg-black text-white inline-block px-1">Rank (Role)</label>
                       <input type="text" defaultValue={user.role} className="w-full bg-slate-50 border-2 border-black p-3 font-mono font-bold focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_black] transition-all" />
                    </div>
                    <div>
                       <label className="block text-xs font-black uppercase mb-1 bg-slate-300 text-black inline-block px-1">Base (Email)</label>
                       <input type="email" defaultValue={user.email} disabled className="w-full bg-slate-200 border-2 border-black text-slate-500 p-3 font-mono font-bold cursor-not-allowed opacity-70" />
                    </div>
                 </div>
              </div>

              <div className="pt-8 flex justify-end border-t-2 border-dashed border-slate-300">
                 <button className="bg-black text-white px-8 py-4 font-black uppercase border-2 border-black flex items-center gap-2 hover:bg-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none transition-all">
                    <Save size={20} /> Save Changes
                 </button>
              </div>
           </div>
        )}

        {/* Integrations Section */}
        {activeSection === 'integrations' && (
           <div className="space-y-8 relative z-10">
              <h2 className="text-4xl font-black uppercase border-b-4 border-black pb-4">Data Links</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="border-2 border-black p-6 bg-slate-50 relative group shadow-[4px_4px_0px_0px_black] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
                    <div className="absolute top-4 right-4">
                       <div className={`w-4 h-4 rounded-full border-2 border-black ${integrations.pipedrive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <Database size={32} className="mb-4" strokeWidth={2} />
                    <h3 className="font-black text-xl uppercase">Pipedrive CRM</h3>
                    <p className="font-mono text-xs text-slate-600 mt-2 mb-6 font-bold">Sync contacts, deals, and activities in real-time.</p>
                    <button className={`w-full font-black uppercase py-3 border-2 border-black transition-all shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none ${integrations.pipedrive ? 'bg-white text-black hover:bg-red-100 hover:text-red-600 hover:border-red-600' : 'bg-black text-white hover:bg-slate-800'}`}>
                       {integrations.pipedrive ? 'Disconnect' : 'Connect'}
                    </button>
                 </div>

                 <div className="border-2 border-black p-6 bg-slate-100 opacity-60 relative group border-dashed">
                     <div className="absolute inset-0 flex items-center justify-center font-black uppercase rotate-12 text-2xl text-slate-400 border-4 border-slate-400 m-8 z-20 mix-blend-multiply pointer-events-none">Coming Soon</div>
                    <Globe size={32} className="mb-4" strokeWidth={2} />
                    <h3 className="font-black text-xl uppercase text-slate-500">HubSpot CRM</h3>
                    <p className="font-mono text-xs text-slate-500 mt-2 mb-6 font-bold">Bi-directional sync with HubSpot Marketing Hub.</p>
                    <button disabled className="w-full font-black uppercase py-3 border-2 border-slate-300 bg-slate-200 text-slate-400 cursor-not-allowed">
                       Connect
                    </button>
                 </div>
              </div>
           </div>
        )}
        
        {/* Placeholder for other sections */}
        {(activeSection === 'notifications' || activeSection === 'security') && (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-300 m-4 bg-slate-50">
              <Shield size={64} className="mb-4" />
              <h3 className="font-black text-2xl uppercase">Restricted Area</h3>
              <p className="font-mono font-bold">Clearance Level 5 required.</p>
           </div>
        )}

      </div>
    </div>
  );
}
