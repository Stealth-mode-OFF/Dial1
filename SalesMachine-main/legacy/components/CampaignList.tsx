import { useState, useEffect } from 'react';
import { Play, Users, Clock, BarChart3, ArrowUpRight, MoreHorizontal, Filter, Zap, AlertCircle, Coffee, Plus, CheckSquare, Square, Loader2, ChevronDown } from 'lucide-react';
import type { Campaign, Contact, EnergyLevel } from '../App';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';

type CampaignListProps = {
  campaigns: Campaign[]; // Initial campaigns passed from App (optional now as we fetch)
  onStartCampaign: (campaign: Campaign) => void;
  energy: EnergyLevel;
};

export function CampaignList({ campaigns: initialCampaigns, onStartCampaign, energy }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns || []);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(initialCampaigns?.[0]?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Creation State
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [configError, setConfigError] = useState<string | null>(null);

  // Since we're working with Pipedrive directly, campaigns are managed locally
  // No need to fetch from backend

  const activeCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const isLowEnergy = energy === 'low';

  // Auto-open creation if empty
  useEffect(() => {
      if (campaigns.length === 0 && !isLoading) {
         // Optional: Auto-trigger Pipedrive fetch? 
         // better to let user choose, but we can open the modal.
      }
  }, [campaigns, isLoading]);

  // Background AI Analysis for Real Data
  useEffect(() => {
    if (!activeCampaign || !activeCampaign.contacts) return;
    if (!isSupabaseConfigured) return;

    // Count how many contacts already have cached data
    const cachedCount = activeCampaign.contacts.filter(c => c.hiringSignal && c.aiSummary).length;
    const totalCount = activeCampaign.contacts.length;
    if (cachedCount > 0) {
        console.log(`✅ Using cached AI data for ${cachedCount}/${totalCount} contacts`);
    }

    // Find first contact that needs analysis
    const target = activeCampaign.contacts.find(c => !c.hiringSignal && !c.aiSummary);
    
    if (target) {
        const timer = setTimeout(async () => {
            console.log("🔍 Background analyzing:", target.name);
            try {
                const intelUrl = buildFunctionUrl('ai/generate');
                const cacheUrl = buildFunctionUrl(`contact-intel/${target.id}`);
                if (!intelUrl || !cacheUrl) return;

                // 1. Generate Intel
                const res = await fetch(intelUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}` 
                    },
                    body: JSON.stringify({
                        contactName: target.name,
                        company: target.company,
                        type: 'research'
                    })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // 2. Update Local State
                    setCampaigns(prev => prev.map(c => {
                        if (c.id === activeCampaign.id) {
                            return {
                                ...c,
                                contacts: c.contacts.map(ct => ct.id === target.id ? {
                                    ...ct,
                                    aiSummary: data.aiSummary,
                                    hiringSignal: data.hiringSignal,
                                    intentScore: data.intentScore,
                                    personalityType: {
                                        type: data.personalityType?.type || "Unknown",
                                        advice: data.personalityType?.advice || "Normal approach"
                                    },
                                    lastNews: data.lastNews
                                } : ct)
                            };
                        }
                        return c;
                    }));

                    // 3. Persist
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
                            personalityType: {
                                type: data.personalityType?.type || "Unknown",
                                advice: data.personalityType?.advice || "Normal approach"
                            },
                            lastNews: data.lastNews
                        })
                    });
                } else {
                    // Handle Rate Limits (429) or other errors
                    console.warn(`Analysis status ${res.status}. Retrying...`);
                    setTimeout(() => setRetryTrigger(n => n + 1), res.status === 429 ? 30000 : 5000);
                }
            } catch (e) {
                console.warn("Background analysis paused/failed for this item", e);
                setTimeout(() => setRetryTrigger(n => n + 1), 10000);
            }
        }, 10000); // 10s delay to respect OpenAI Rate Limits (30k TPM)
        return () => clearTimeout(timer);
    }
  }, [activeCampaign, campaigns, retryTrigger]); // Re-run when campaigns update or retry triggered

  // Creation Handlers
  const startCreation = async () => {
      setIsCreating(true);
      setIsLoadingContacts(true);
      setSyncError(null);
      if (!isSupabaseConfigured) {
          setConfigError("Supabase credentials missing. Cannot sync Pipedrive.");
          setIsLoadingContacts(false);
          return;
      }

      const url = buildFunctionUrl('pipedrive/contacts');
      if (!url) {
          setIsLoadingContacts(false);
          return;
      }

      try {
        console.log('🔄 Fetching contacts from Pipedrive via edge function...');
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        if (res.ok) {
            const data = await res.json();

            // Backend now returns a flat list of Pipedrive leads. Normalize to Contact shape.
            const contacts: Contact[] = Array.isArray(data)
              ? data.map((lead: any) => ({
                  id: lead.id || lead.uuid || `lead-${Date.now()}`,
                  name: lead.name || lead.title || lead.person_name || 'Unknown lead',
                  company: lead.organization || lead.organization_name || 'Unknown company',
                  phone: lead.phone || lead.person?.phone?.[0]?.value || '',
                  role: lead.label || lead.label_ids?.[0] || lead.source || 'Lead'
                }))
              : (data?.contacts || []) as Contact[];

            if (contacts.length > 0) {
                setAvailableContacts(contacts);
                const allIds = new Set(contacts.map((c: Contact) => c.id));
                setSelectedContactIds(allIds);
                setNewCampaignName("Pipedrive Leads");
                setNewCampaignDesc("Imported active leads from Pipedrive CRM");
                console.log(`✅ Loaded ${contacts.length} leads from Pipedrive`);
            } else {
                setSyncError("Pipedrive nevrátil žádné leads. Zkontrolujte, že máte leads s telefonními čísly v CRM.");
            }
        } else {
            const errData = await res.json().catch(() => ({ error: "Network error" }));
            console.error("Pipedrive sync failed", errData);
            setSyncError(errData.error || "Nepodařilo se připojit k Pipedrive. Zkontrolujte API klíč.");
        }
      } catch (e: any) {
          console.error("Failed to fetch contacts", e);
          setSyncError(e.message || "Failed to connect to Pipedrive. Check your API key.");
      } finally {
          setIsLoadingContacts(false);
      }
  };

  const toggleContact = (id: string) => {
      const newSet = new Set(selectedContactIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedContactIds(newSet);
  };

  const submitCampaign = async () => {
      if (!newCampaignName) return;
      setIsLoading(true);
      try {
          const contacts = availableContacts.filter(c => selectedContactIds.has(c.id));
          
          // Create campaign locally
          const newCampaign: Campaign = {
              id: `campaign-${Date.now()}`,
              name: newCampaignName,
              description: newCampaignDesc,
              contacts: contacts,
              totalContacts: contacts.length,
              contacted: 0,
              scheduled: 0,
              revenue: 0
          };
          
          // Add to campaigns list
          setCampaigns(prev => [...prev, newCampaign]);
          setSelectedCampaignId(newCampaign.id);
          
          // Reset creation form
          setIsCreating(false);
          setNewCampaignName("");
          setNewCampaignDesc("");
          setSelectedContactIds(new Set());
          setAvailableContacts([]);
          
          console.log(`✅ Campaign "${newCampaign.name}" created with ${contacts.length} contacts`);
      } catch (e) {
          console.error("Failed to create campaign", e);
      } finally {
          setIsLoading(false);
      }
  };



  if (configError) {
      return (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Configuration required</h2>
              <p className="text-slate-500 mb-4 max-w-md">{configError}</p>
          </div>
      );
  }

  // If no campaigns at all
  if (!activeCampaign && !isCreating) {
      return (
          <div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Ready for Action</h2>
              <p className="text-slate-500 mb-6 text-sm sm:text-base">Connect to Pipedrive to load your real leads.</p>
              <div className="flex gap-3">
                <button onClick={startCreation} className="bg-green-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 text-sm sm:text-base">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Sync Pipedrive CRM</span><span className="sm:hidden">Sync</span>
                </button>
              </div>
          </div>
      );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-20">
      
      {/* CREATION MODAL */}
      {isCreating && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> <span className="hidden sm:inline">Initialize New Mission</span><span className="sm:hidden">New Mission</span>
                      </h2>
                  </div>
                  
                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Mission Name</label>
                              <input 
                                value={newCampaignName}
                                onChange={(e) => setNewCampaignName(e.target.value)}
                                placeholder="e.g. Q4 Enterprise Outreach" 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Objective / Context</label>
                              <input 
                                value={newCampaignDesc}
                                onChange={(e) => setNewCampaignDesc(e.target.value)}
                                placeholder="Short description for AI Context..." 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-end mb-3">
                              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">Select Targets (CRM)</label>
                              <span className="text-xs text-indigo-600 font-bold">{selectedContactIds.size} Selected</span>
                          </div>
                          
                          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                              {isLoadingContacts ? (
                                  <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                              ) : syncError ? (
                                  <div className="p-8 flex flex-col items-center text-center">
                                      <div className="bg-red-50 p-3 rounded-full mb-3">
                                          <AlertCircle className="w-6 h-6 text-red-600" />
                                      </div>
                                      <h3 className="font-bold text-slate-900 mb-1">Sync Failed</h3>
                                      <p className="text-sm text-slate-500 mb-4">{syncError}</p>
                                      <button 
                                        onClick={startCreation} 
                                        className="text-indigo-600 font-bold text-sm hover:underline"
                                      >
                                          Try Again
                                      </button>
                                  </div>
                              ) : (
                                  <div className="divide-y divide-slate-100">
                                      {availableContacts.map(c => (
                                          <div 
                                            key={c.id} 
                                            onClick={() => toggleContact(c.id)}
                                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedContactIds.has(c.id) ? 'bg-indigo-50/50' : ''}`}
                                          >
                                              {selectedContactIds.has(c.id) 
                                                ? <CheckSquare className="w-5 h-5 text-indigo-600" /> 
                                                : <Square className="w-5 h-5 text-slate-300" />
                                              }
                                              <div>
                                                  <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                                                  <div className="text-xs text-slate-500">{c.company} • {c.role || 'Unknown Role'}</div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <button onClick={() => setIsCreating(false)} className="text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
                      <button 
                        onClick={submitCampaign}
                        disabled={!newCampaignName || selectedContactIds.size === 0 || isLoading}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Launch Mission
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Safe Guard for Empty State during Creation */}
      {!activeCampaign ? (
         <div className="text-center py-20 text-slate-400">Configuring Mission...</div>
      ) : (
        <>
      {/* Energy Adaptation Banner */}
      {isLowEnergy && (
        <div className="mb-6 bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
           <div className="p-2 bg-white rounded-full shadow-sm">
             <Coffee className="w-5 h-5 text-slate-600" />
           </div>
           <div>
             <h3 className="font-bold text-slate-800 text-sm">Recovery Mode Active</h3>
             <p className="text-xs text-slate-500">Campaign workflow has been optimized for low energy. Prioritizing async communication.</p>
           </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
           <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-2 ${isLowEnergy ? 'text-slate-500' : 'text-indigo-600'}`}>
              <Zap className={`w-3 h-3 ${isLowEnergy ? 'text-slate-400' : 'text-indigo-600'}`} /> 
              {isLowEnergy ? 'Low Intensity Mode' : 'Active Operation'}
           </div>
           
           {/* Campaign Selector */}
           <div className="relative group inline-block">
               <button className="flex items-center gap-2 text-3xl font-bold text-slate-900 tracking-tight hover:text-indigo-700 transition-colors">
                   {activeCampaign.name} <ChevronDown className="w-6 h-6 text-slate-400" />
               </button>
               <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10">
                   <div className="p-2">
                       <div className="text-xs font-bold text-slate-400 uppercase px-2 py-1">Switch Mission</div>
                       {campaigns.map(c => (
                           <button 
                            key={c.id}
                            onClick={() => setSelectedCampaignId(c.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${selectedCampaignId === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                           >
                               {c.name}
                           </button>
                       ))}
                       <div className="border-t border-slate-100 my-1"></div>
                       <button 
                        onClick={startCreation}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                       >
                           <Plus className="w-4 h-4" /> Create New
                       </button>
                   </div>
               </div>
           </div>

           <p className="text-slate-500 mt-1 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {activeCampaign.contacts?.length || 0} Prospects</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Est. {Math.round((activeCampaign.contacts?.length || 0) * 5)} mins</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-slate-400 italic">{activeCampaign.description}</span>
           </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
           <button onClick={startCreation} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none">
             <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Mission</span><span className="sm:hidden">New</span>
           </button>
           <button 
             onClick={() => onStartCampaign(activeCampaign)}
             className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 transform hover:translate-y-[-1px] flex-1 sm:flex-none ${
               isLowEnergy 
                 ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-500/20' 
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
             }`}
           >
             {isLowEnergy ? (
               <>
                 <Coffee className="w-4 h-4 fill-current" /> <span className="hidden sm:inline">Start Email Sequence</span><span className="sm:hidden">Email</span>
               </>
             ) : (
               <>
                 <Play className="w-4 h-4 fill-white" /> <span className="hidden sm:inline">Start Power Dialer</span><span className="sm:hidden">Dial</span>
               </>
             )}
           </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
         <StatCard 
            label="Avg. Win Probability" 
            value={`${Math.round(activeCampaign.contacts?.reduce((acc, c) => acc + (c.intentScore || 50), 0) / (activeCampaign.contacts?.length || 1))}%`} 
            trend="AI Calculated" 
            positive 
         />
         <StatCard 
            label="Total Targets" 
            value={activeCampaign.contacts?.length || 0} 
            trend="Ready" 
            positive 
         />
         <StatCard 
            label="Est. Pipeline Value" 
            value={`€${(activeCampaign.contacts?.length || 0) * 15000}`} 
            trend="Based on avg deal" 
         />
         <StatCard 
            label="Predicted Revenue" 
            value={`€${Math.round((activeCampaign.contacts?.length || 0) * 15000 * 0.2)}`} 
            trend="20% Conversion" 
            isAi 
         />
      </div>

      {/* TACTICAL DATA GRID - DESKTOP TABLE */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
           <div className="col-span-4">Prospect Identity</div>
           <div className="col-span-3">AI Signal Context</div>
           <div className="col-span-2">Win Prob.</div>
           <div className="col-span-2">Best Time</div>
           <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
           {activeCampaign.contacts?.filter(c => c && c.name).map((contact, idx) => (
             <div key={contact.id || idx} className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-indigo-50/30 transition-colors group cursor-pointer ${isLowEnergy && (contact.intentScore || 0) < 50 ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                
                {/* Identity */}
                <div className="col-span-4 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                      {(contact.name || "?").charAt(0)}
                   </div>
                   <div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">{contact.name || "Unknown"}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        {contact.role || 'Lead'} <span className="text-slate-300">•</span> {contact.company || "No Company"}
                      </div>
                   </div>
                </div>

                {/* AI Signal */}
                <div className="col-span-3 pr-4">
                   <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">
                         {contact.hiringSignal || <span className="italic text-slate-400">Queued for AI Analysis...</span>}
                      </p>
                   </div>
                </div>

                {/* Win Probability */}
                <div className="col-span-2">
                   <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-mono font-bold ${(contact.intentScore || 0) > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {contact.intentScore || 0}%
                      </span>
                      {(contact.intentScore || 0) > 80 && (
                         <span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded font-bold uppercase">Hot</span>
                      )}
                   </div>
                   <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${(contact.intentScore || 0) > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${contact.intentScore || 0}%` }}
                      ></div>
                   </div>
                </div>

                {/* Best Time */}
                <div className="col-span-2">
                   <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Now
                   </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors">
                      {isLowEnergy ? <Coffee className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                   </button>
                </div>

             </div>
           ))}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-center">
           <button className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
             View all {activeCampaign.contacts?.length || 0} leads
           </button>
        </div>

      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-3">
        {activeCampaign.contacts?.filter(c => c && c.name).map((contact, idx) => (
          <div 
            key={contact.id || idx}
            onClick={() => onStartCampaign(activeCampaign)}
            className={`bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:bg-indigo-50/30 transition-colors ${isLowEnergy && (contact.intentScore || 0) < 50 ? 'opacity-50 grayscale-[0.5]' : ''}`}
          >
            {/* Header Row - Name & Score */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                  {(contact.name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{contact.name || "Unknown"}</div>
                  <div className="text-xs text-slate-500 truncate">{contact.company || "No Company"}</div>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono flex-shrink-0 ${(contact.intentScore || 0) > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                {contact.intentScore || 0}%
              </div>
            </div>

            {/* AI Signal */}
            {contact.hiringSignal && (
              <div className="flex gap-2 mb-3 p-2 bg-slate-50 rounded text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-slate-600 line-clamp-2">{contact.hiringSignal}</p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${(contact.intentScore || 0) > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                style={{ width: `${contact.intentScore || 0}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      </>
      )}    </div>
  );
}

function StatCard({ label, value, trend, positive, isAi }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
      {isAi && <div className="absolute top-0 right-0 p-2"><Zap className="w-12 h-12 text-indigo-50 opacity-50 rotate-12" /></div>}
      <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</div>
      {trend && (
        <div className={`text-xs font-medium flex items-center gap-1 ${positive ? 'text-green-600' : isAi ? 'text-indigo-600' : 'text-slate-400'}`}>
          {positive && <ArrowUpRight className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}
