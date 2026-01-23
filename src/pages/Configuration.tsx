import React, { useState } from 'react';
import { 
  User, 
  CreditCard, 
  Bell, 
  Database, 
  Shield, 
  Plug, 
  Check,
  Globe,
  Mic2,
  Settings
} from 'lucide-react';

export function Configuration({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [activeSection, setActiveSection] = useState('integrations');

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      {/* Settings Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-extrabold text-slate-900">Settings</h2>
        </div>
        <nav className="space-y-1 px-3">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'integrations', label: 'Integrations', icon: Plug },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'audio', label: 'Audio & Video', icon: Mic2 },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'billing', label: 'Billing', icon: CreditCard },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeSection === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl">
          
          {activeSection === 'integrations' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Connected Apps</h3>
                <p className="text-slate-500">Manage your connections to external tools and CRMs.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {/* Pipedrive */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xs">PD</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Pipedrive CRM</h4>
                        <p className="text-sm text-slate-500">Sync contacts, deals, and activities.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-200 flex items-center gap-2">
                      <Check size={16} /> Connected
                    </button>
                  </div>

                  {/* Google Meet */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">GM</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Google Meet</h4>
                        <p className="text-sm text-slate-500">Capture audio and video for analysis.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-200 flex items-center gap-2">
                      <Check size={16} /> Active
                    </button>
                  </div>

                  {/* Supabase */}
                  <div className="p-6 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">SB</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Supabase Database</h4>
                        <p className="text-sm text-slate-500">Store call logs and analytics data.</p>
                      </div>
                    </div>
                     <button className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      Configure
                    </button>
                  </div>

                   {/* Slack */}
                   <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#4A154B] rounded-xl flex items-center justify-center text-white font-bold text-xs">SL</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Slack</h4>
                        <p className="text-sm text-slate-500">Send call summaries to your team channel.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'profile' && (
             <div className="space-y-8">
               <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Profile Settings</h3>
                <p className="text-slate-500">Manage your personal information and preferences.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 border-4 border-white shadow-lg">
                    JD
                  </div>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Change Avatar
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">First Name</label>
                     <input type="text" defaultValue="John" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Last Name</label>
                     <input type="text" defaultValue="Doe" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                     <input type="email" defaultValue="john.doe@company.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500" />
                   </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                   <button className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                     Save Changes
                   </button>
                </div>
              </div>
             </div>
          )}
          
          {/* Fallback for other sections */}
          {!['integrations', 'profile'].includes(activeSection) && (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Work in Progress</h3>
              <p className="text-slate-500 max-w-sm">
                The <span className="font-bold text-slate-700">{activeSection}</span> settings module is currently under development.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}