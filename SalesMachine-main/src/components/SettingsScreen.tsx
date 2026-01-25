/**
 * SettingsScreen
 *
 * Main configuration and integrations UI for the app.
 * Handles knowledge base, AI persona, integrations, and user profile.
 *
 * For handover: All configuration logic is here. Used by Configuration page.
 */
import { useState, useEffect } from 'react';
import { BrainCircuit, Mic, Zap, LayoutTemplate, Cable, CheckCircle2, ToggleRight, User, Book, Trash2, Plus } from 'lucide-react';
import { buildFunctionUrl, publicAnonKey, isSupabaseConfigured } from '../utils/supabase/info';
import { supabaseClient } from '../utils/supabase/client';
import { useSales } from '../contexts/SalesContext';
// ...existing code...

  useEffect(() => {
    fetchKnowledge();
    fetchPipedriveConnection();
  }, []);

  useEffect(() => {
    setProfileName(user?.name || '');
    setProfileRole(user?.role || '');
  }, [user?.name, user?.role]);

  const handleProfileSave = () => {
    updateUser({ name: profileName, role: profileRole });
  };

  const fetchKnowledge = async () => {
    if (!isSupabaseConfigured) {
        setConfigError("Supabase credentials missing. Knowledge base requires live backend.");
        return;
    }

    const url = buildFunctionUrl('knowledge');
    if (!url) return;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            setKnowledgeList(data);
        }
    } catch (e) {
        console.error("Failed to load knowledge", e);
    }
  };

  const fetchPipedriveConnection = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const url = buildFunctionUrl('integrations/pipedrive');
    if (!url) return;

    setIsLoadingPipedrive(true);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setPipedriveConnection({
            apiKey: '***',
            isConnected: true,
            connectedAt: new Date().toISOString(),
          });
        } else {
          setPipedriveConnection(null);
        }
      }
    } catch (e) {
      console.error("Failed to load Pipedrive status", e);
    } finally {
      setIsLoadingPipedrive(false);
    }
  };

  const addKnowledge = async () => {
    if (!newTitle || !newContent) return;
    setIsSaving(true);
    try {
        if (!isSupabaseConfigured) {
            setConfigError("Supabase credentials missing. Cannot save knowledge module.");
            return;
        }

        const url = buildFunctionUrl('knowledge');
        if (!url) return;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
            },
            body: JSON.stringify({ title: newTitle, content: newContent })
        });
        if (res.ok) {
            setNewTitle('');
            setNewContent('');
            setIsAdding(false);
            fetchKnowledge();
        }
    } catch (e) {
        console.error("Failed to add knowledge", e);
    } finally {
        setIsSaving(false);
    }
  };

  const deleteKnowledge = async (id: string) => {
    try {
        if (!isSupabaseConfigured) {
            setConfigError("Supabase credentials missing. Cannot delete knowledge module.");
            return;
        }

        const url = buildFunctionUrl(`knowledge/${id}`);
        if (!url) return;

        await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        fetchKnowledge();
    } catch (e) {
        console.error("Failed to delete knowledge", e);
    }
  };

  const connectPipedrive = async () => {
    if (!pipedriveKey.trim()) return;
    setIsTestingPipedrive(true);
    setConfigError(null);
    try {
        if (!isSupabaseConfigured) {
            setConfigError(
              "❌ Supabase not configured. Add VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, and VITE_SUPABASE_ANON_KEY to .env.local on your hosting platform.\n" +
              "(Local: /Users/josefhofman/Echodialermvp/.env.local)"
            );
            return;
        }

        const url = buildFunctionUrl('integrations/pipedrive');
        console.log("📤 Connecting to Pipedrive, URL:", url);
        if (!url) {
            setConfigError("❌ Edge function URL not configured. Ensure VITE_SUPABASE_URL is set.");
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ apiKey: pipedriveKey }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log("📩 Response status:", res.status);

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Pipedrive connected:", data);
            setPipedriveConnection({
                apiKey: pipedriveKey,
                isConnected: true,
                connectedAt: new Date().toISOString()
            });
            setPipedriveKey('');
        } else if (res.status === 401) {
            setConfigError(
              "❌ Unauthorized (401). Pipedrive API key is invalid.\n" +
              "→ Get a new token at pipedrive.com → Settings → API → Copy your API token\n" +
              "→ Paste it above and try again."
            );
        } else if (res.status === 403) {
            setConfigError(
              "❌ Forbidden (403). CORS issue or missing permissions.\n" +
              "→ Ensure the edge function 'make-server-139017f8' is deployed: supabase functions deploy\n" +
              "→ Set ECHO_ALLOWED_ORIGINS env var to include your domain (e.g., https://your-domain.com)\n" +
              "→ Redeploy and try again."
            );
        } else if (res.status === 404) {
            setConfigError(
              "❌ Edge function not found (404).\n" +
              "→ Deploy the Supabase edge function: supabase functions deploy make-server-139017f8\n" +
              "→ Then try connecting again."
            );
        } else {
            const errText = await res.text().catch(() => 'Unknown error');
            setConfigError(
              `❌ Pipedrive connection failed (HTTP ${res.status}).\n` +
              `Error: ${errText}\n` +
              `→ Check edge function logs: supabase functions logs make-server-139017f8 --follow`
            );
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes('Abort')) {
            setConfigError(
              "❌ Request timeout (10s).\n" +
              "→ Edge function may be unreachable or too slow.\n" +
              "→ Check that make-server-139017f8 is deployed and responding.\n" +
              "→ Try again in a moment."
            );
        } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            setConfigError(
              "❌ Network error connecting to edge function.\n" +
              "→ Ensure VITE_SUPABASE_URL is correct and the function is deployed.\n" +
              "→ Check your internet connection and try again."
            );
        } else if (errorMsg.includes('CORS')) {
            setConfigError(
              "❌ CORS error. Edge function is blocking your domain.\n" +
              "→ Set ECHO_ALLOWED_ORIGINS in Supabase env vars to include your current domain.\n" +
              "→ Deploy the function and try again."
            );
        } else {
            setConfigError(`❌ Failed to connect Pipedrive: ${errorMsg}\n→ Check browser console (F12) for details.`);
        }
        console.error("Pipedrive connection failed", e);
    } finally {
        setIsTestingPipedrive(false);
    }
  };

  const disconnectPipedrive = async () => {
    if (!pipedriveConnection?.isConnected) return;
    setIsDisconnectingPipedrive(true);
    try {
      if (!isSupabaseConfigured) {
          setConfigError("Supabase credentials missing. Cannot disconnect Pipedrive.");
          return;
      }

      const url = buildFunctionUrl('integrations/pipedrive');
      if (!url) return;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      if (res.ok) {
        setPipedriveConnection(null);
      }
    } catch (e) {
      console.error("Pipedrive disconnect failed", e);
      setConfigError("Failed to disconnect Pipedrive. Try again.");
    } finally {
      setIsDisconnectingPipedrive(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseClient) {
      setConfigError('Supabase client is not configured yet.');
      return;
    }
    setIsSigningOut(true);
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        setConfigError(error.message);
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error('Sign out failed', e);
      setConfigError('Failed to sign out. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="figma-shell figma-grid-bg space-y-6 pb-16">
      {configError && (
        <div className="neo-panel-shadow bg-white text-red-700" style={{ borderColor: 'var(--neo-red)' }}>
          <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">{configError}</div>
        </div>
      )}

      <div className="neo-panel-shadow bg-white p-6 flex items-center justify-between">
        <div>
          <div className="neo-tag neo-tag-yellow">SYSTEM CONFIGURATION</div>
          <h1 className="neo-display text-5xl font-black leading-none mt-3">CONTROL ROOM</h1>
          <p className="font-mono text-sm font-bold opacity-70 mt-2">Uprav integrace, znalostní bázi a AI persona.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 neo-panel-shadow bg-white p-5 space-y-4">
          <div className="neo-tag neo-tag-yellow">PROFILE</div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider opacity-70">
            Name
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              className="neo-input w-full px-3 py-2 mt-2 font-mono"
              placeholder="Alex Salesman"
            />
          </label>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider opacity-70">
            Role
            <input
              value={profileRole}
              onChange={(event) => setProfileRole(event.target.value)}
              className="neo-input w-full px-3 py-2 mt-2 font-mono"
              placeholder="Senior AE"
            />
          </label>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider opacity-70">
            Time Zone
            <input
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              className="neo-input w-full px-3 py-2 mt-2 font-mono"
              placeholder="Europe/Prague"
            />
          </label>
          <button className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black uppercase" onClick={handleProfileSave}>
            Save Profile
          </button>
        </div>

        <div className="col-span-12 lg:col-span-4 neo-panel-shadow bg-white p-5 space-y-4">
          <div className="neo-tag neo-tag-yellow">SYSTEM INTEGRATIONS</div>
          <div className="space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">CRM</div>
            <div className="flex flex-wrap gap-2">
              {(['salesforce', 'hubspot', 'pipedrive'] as const).map((provider) => (
                <button
                  key={provider}
                  className="neo-btn px-3 py-1 text-xs font-black uppercase"
                  style={{ background: crmProvider === provider ? 'var(--neo-yellow)' : 'white' }}
                  onClick={() => setCrmProvider(provider)}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">VoIP</div>
            <div className="flex gap-2">
              {(['twilio', 'ringcentral'] as const).map((provider) => (
                <button
                  key={provider}
                  className="neo-btn px-3 py-1 text-xs font-black uppercase"
                  style={{ background: voipProvider === provider ? 'var(--neo-yellow)' : 'white' }}
                  onClick={() => setVoipProvider(provider)}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 neo-panel-shadow bg-white p-5 space-y-4">
          <div className="neo-tag neo-tag-yellow">INTERFACE</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">Dopamine Mode</div>
              <div className="text-xs font-mono opacity-60">Visual reward effects</div>
            </div>
            <button
              className="neo-btn bg-white px-3 py-2"
              onClick={() => setDopamineMode((prev) => !prev)}
            >
              <ToggleRight className={`w-5 h-5 ${dopamineMode ? 'text-emerald-600' : 'text-slate-400'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">Focus Mode</div>
              <div className="text-xs font-mono opacity-60">Hide distractions during calls</div>
            </div>
            <button
              className="neo-btn bg-white px-3 py-2"
              onClick={() => setFocusMode((prev) => !prev)}
            >
              <ToggleRight className={`w-5 h-5 ${focusMode ? 'text-emerald-600' : 'text-slate-400'}`} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider opacity-70">Theme</div>
            <div className="flex flex-wrap gap-2">
              {(['high-contrast', 'dark', 'light'] as const).map((mode) => (
                <button
                  key={mode}
                  className="neo-btn px-3 py-1 text-xs font-black uppercase"
                  style={{ background: theme === mode ? 'var(--neo-yellow)' : 'white' }}
                  onClick={() => setTheme(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. SALES CODEX (Knowledge Base) */}
      <div className="neo-panel-shadow bg-white overflow-hidden">
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: '3px solid var(--neo-ink)', background: 'var(--neo-yellow)' }}>
          <div>
            <h2 className="neo-display text-3xl font-black flex items-center gap-2 leading-none">
                <Book className="w-5 h-5" /> SALES CODEX
            </h2>
            <p className="font-mono text-sm font-bold opacity-80 mt-1">
                Přidej principy (SPIN, Challenger, GAP). Copilot je použije před každým hovorem.
            </p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="neo-btn neo-bg-yellow px-4 py-2 text-xs font-black flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {isAdding && (
            <div className="p-6" style={{ background: 'var(--neo-paper-muted)' }}>
                <input 
                    className="neo-input w-full mb-3 px-3 py-2 font-bold"
                    placeholder="Book Title / Methodology Name (e.g. 'The Mom Test')"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                />
                <textarea 
                    className="neo-panel w-full h-32 p-3 font-mono text-sm mb-3"
                    style={{ boxShadow: 'var(--neo-shadow-xs)' }}
                    placeholder="Paste the core principles, top 5 questions, or objection handling scripts here..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsAdding(false)} className="font-mono text-xs font-bold opacity-70">Cancel</button>
                    <button 
                        onClick={addKnowledge} 
                        disabled={isSaving}
                        className="neo-btn neo-bg-yellow text-xs font-black flex items-center gap-2 px-4 py-2"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                        Save to Brain
                    </button>
                </div>
            </div>
        )}

        <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            {knowledgeList.length === 0 && !isAdding && (
                <div className="p-8 text-center font-mono text-sm opacity-60">
                    No custom knowledge added yet. Add your first book summary!
                </div>
            )}
            {knowledgeList.map((mod) => (
                <div key={mod.id} className="p-6 group hover:bg-[var(--neo-paper-muted)] transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="neo-display text-xl font-black flex items-center gap-2">
                                <Book className="w-4 h-4" /> {mod.title}
                            </h3>
                            <p className="font-mono text-xs mt-2 line-clamp-2 neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                                {mod.content}
                            </p>
                        </div>
                        <button 
                            onClick={() => deleteKnowledge(mod.id)}
                            className="neo-btn bg-white px-3 py-2 text-xs opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 2. AI Persona Configuration */}
      <div className="neo-panel-shadow bg-white overflow-hidden">
        <div className="p-6 neo-panel" style={{ borderBottom: '3px solid var(--neo-ink)', background: 'var(--neo-paper-muted)' }}>
          <h2 className="neo-display text-3xl font-black flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            AI Sales Persona
          </h2>
          <p className="font-mono text-sm font-bold opacity-70 mt-1">
            Nastav, jak se má AI chovat při generování skriptů a e-mailů, aby odpovídala tvému stylu.
          </p>
        </div>
        
        <div className="p-8 grid grid-cols-2 gap-6">
          <div 
            onClick={() => setSalesStyle('hunter')}
            className={`cursor-pointer neo-panel p-6 transition-all ${salesStyle === 'hunter' ? 'neo-bg-yellow' : 'bg-white hover:-translate-y-[2px]'}`}
          >
             <div className="flex justify-between items-start mb-4">
               <div className="neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                 <Zap className="w-6 h-6" />
               </div>
               {salesStyle === 'hunter' && <CheckCircle2 className="w-5 h-5" />}
             </div>
             <h3 className="neo-display text-2xl font-black mb-2">The Challenger (Hunter)</h3>
             <p className="font-mono text-xs font-bold leading-relaxed opacity-80">
               Krátké věty. Důraz na ROI a rychlost. Nebojí se jít do konfliktu.
               Ideální pro cold calling a saturaci trhu.
             </p>
          </div>

          <div 
            onClick={() => setSalesStyle('consultative')}
            className={`cursor-pointer neo-panel p-6 transition-all ${salesStyle === 'consultative' ? 'neo-bg-blue' : 'bg-white hover:-translate-y-[2px]'}`}
          >
             <div className="flex justify-between items-start mb-4">
               <div className="neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                 <User className="w-6 h-6" />
               </div>
               {salesStyle === 'consultative' && <CheckCircle2 className="w-5 h-5" />}
             </div>
             <h3 className="neo-display text-2xl font-black mb-2">The Advisor (Consultative)</h3>
             <p className="font-mono text-xs font-bold leading-relaxed opacity-80">
               Empatický tón. Ptá se na problémy ("pain points"). Buduje vztah.
               Ideální pro Enterprise dealy a složitá řešení.
             </p>
          </div>
        </div>
      </div>

      {/* 2. Integrations (Zero Touch) */}
      <div className="neo-panel-shadow bg-white overflow-hidden">
        <div className="p-6 neo-panel" style={{ borderBottom: '3px solid var(--neo-ink)', background: 'var(--neo-paper-muted)' }}>
          <h2 className="neo-display text-3xl font-black flex items-center gap-2">
            <Cable className="w-5 h-5" />
            Zero-Touch Integrations
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
           <div className="p-6 space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="neo-panel bg-black text-white w-10 h-10 flex items-center justify-center font-black text-xs" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>Pd</div>
                 <div>
                   <div className="neo-display text-xl font-black">Pipedrive CRM</div>
                   <div className="font-mono text-xs opacity-70">Auto-log calls, deals, and follow-ups</div>
                 </div>
               </div>
               {pipedriveConnection?.isConnected ? (
                 <div className="neo-pill neo-bg-green text-black text-xs font-black">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   Connected
                 </div>
               ) : (
                 <div className="neo-pill bg-white text-xs font-black">
                   <span className="w-2 h-2 bg-amber-500"></span>
                   {isLoadingPipedrive ? 'Checking…' : 'Not connected'}
                 </div>
               )}
             </div>
             {!pipedriveConnection?.isConnected && (
               <div className="space-y-3">
                 <div className="neo-panel bg-white p-3 font-mono text-xs" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                   💡 <strong>How to get your API token:</strong> Go to pipedrive.com → Settings (gear icon, top right) → Personal preferences → API → Copy the token below.
                 </div>
                 <div className="flex gap-2">
                   <input
                     type="password"
                     placeholder="Paste your Pipedrive API token..."
                     value={pipedriveKey}
                     onChange={(e) => setPipedriveKey(e.target.value)}
                     className="neo-input flex-1 px-3 py-2 font-mono"
                   />
                   <button
                     onClick={connectPipedrive}
                     disabled={isTestingPipedrive || !pipedriveKey.trim()}
                     className="neo-btn neo-bg-yellow disabled:opacity-50 text-xs font-black px-4 py-2"
                   >
                     {isTestingPipedrive ? 'Testing...' : 'Connect'}
                   </button>
                 </div>
               </div>
             )}
             {pipedriveConnection?.isConnected && (
               <div className="flex items-center gap-3">
                 <button
                   onClick={disconnectPipedrive}
                   disabled={isDisconnectingPipedrive}
                   className="text-xs font-black font-mono"
                  >
                    {isDisconnectingPipedrive ? 'Disconnecting...' : 'Disconnect'}
                 </button>
                 <button
                   onClick={fetchPipedriveConnection}
                   disabled={isLoadingPipedrive}
                   className="text-xs font-black font-mono"
                  >
                    {isLoadingPipedrive ? 'Refreshing...' : 'Refresh status'}
                 </button>
               </div>
             )}
           </div>

           <div className="p-6 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="neo-panel bg-black text-white w-10 h-10 flex items-center justify-center font-black text-xs" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>Cal</div>
               <div>
                 <div className="neo-display text-xl font-black">Google Calendar</div>
                 <div className="font-mono text-xs opacity-70">Auto-booking slots</div>
               </div>
             </div>
             <div className="neo-pill neo-bg-green text-black text-xs font-black">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               Connected
             </div>
           </div>
        </div>
      </div>
      
      {/* 3. Voice Config */}
      <div className="neo-panel-shadow bg-white opacity-70">
         <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="neo-panel bg-white p-2" style={{ boxShadow: 'var(--neo-shadow-xs)' }}>
                 <Mic className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="neo-display text-2xl font-black">Voice Clone (ElevenLabs)</h3>
                 <p className="font-mono text-xs font-bold opacity-70">Allow AI to leave voicemails in your voice.</p>
               </div>
            </div>
            <button className="neo-btn bg-white px-4 py-2 text-xs font-black" disabled>Coming Q3</button>
         </div>
      </div>

      <div className="neo-panel-shadow bg-white mt-6">
        <div className="p-6 neo-panel" style={{ borderBottom: '3px solid var(--neo-ink)', background: 'var(--neo-paper-muted)' }}>
          <h2 className="neo-display text-3xl font-black flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Session Security
          </h2>
          <p className="font-mono text-sm font-bold opacity-70 mt-1">
            Log out to protect the live coach room when stepping away from this public domain.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] opacity-60">
            Managed Access
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-sm font-bold opacity-70">
              Signed in by Supabase. Signing out clears your session across tabs.
            </p>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="neo-btn neo-bg-red text-white px-4 py-2 text-xs font-black disabled:opacity-50"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
