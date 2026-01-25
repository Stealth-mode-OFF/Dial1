import { useMemo, useState } from 'react';
import {
  BrainCircuit,
  Mic,
  Zap,
  Cable,
  CheckCircle2,
  User,
  Book,
  Trash2,
  Plus,
} from 'lucide-react';

type KnowledgeModule = {
  id: string;
  title: string;
  content: string;
};

type SettingsScreenProps = {
  salesStyle: 'hunter' | 'consultative';
  setSalesStyle: (style: 'hunter' | 'consultative') => void;
};

function uid(): string {
  try {
    // crypto.randomUUID is available in modern browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // ignore
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function SettingsScreen({ salesStyle, setSalesStyle }: SettingsScreenProps) {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeModule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const canSave = useMemo(() => {
    return newTitle.trim().length > 0 && newContent.trim().length > 0;
  }, [newTitle, newContent]);

  const addKnowledge = () => {
    if (!canSave) return;
    const module: KnowledgeModule = {
      id: uid(),
      title: newTitle.trim(),
      content: newContent.trim(),
    };
    setKnowledgeList((prev) => [module, ...prev]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const deleteKnowledge = (id: string) => {
    setKnowledgeList((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">System Configuration</h1>

      {/* 1. SALES CODEX (Local Knowledge Base) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Book className="w-5 h-5 text-indigo-600" />
              Sales Codex (Knowledge Base)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Lokální seznam poznámek. (Supabase napojení přidáme potom – teď hlavně ať to buildí a deployuje.)
            </p>
          </div>
          <button
            onClick={() => setIsAdding((v) => !v)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {isAdding && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <input
              className="w-full mb-3 p-3 rounded-lg border border-slate-200 text-sm font-bold"
              placeholder="Title (e.g. 'SPIN Selling')"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full h-32 p-3 rounded-lg border border-slate-200 text-sm mb-3 font-mono text-slate-600"
              placeholder="Paste key principles, questions, objection scripts..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="text-slate-500 text-xs font-bold hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={addKnowledge}
                disabled={!canSave}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {knowledgeList.length === 0 && !isAdding && (
            <div className="p-8 text-center text-slate-400 text-sm min-h-100 flex items-center justify-center">
              No custom knowledge added yet. Add your first module.
            </div>
          )}

          {knowledgeList.map((mod) => (
            <div key={mod.id} className="p-6 group hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Book className="w-4 h-4 text-slate-400" /> {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 font-mono bg-slate-100 p-2 rounded border border-slate-200">
                    {mod.content}
                  </p>
                </div>
                <button
                  onClick={() => deleteKnowledge(mod.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete knowledge module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. AI Persona Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            AI Sales Persona (Your Digital Twin)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Nastavte, jak se má AI chovat při generování skriptů a e-mailů, aby odpovídala vašemu stylu.
          </p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={() => setSalesStyle('hunter')}
            className={`cursor-pointer relative p-6 rounded-xl border-2 transition-all ${
              salesStyle === 'hunter'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              {salesStyle === 'hunter' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 mb-2">The Challenger (Hunter)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Krátké věty. Důraz na ROI a rychlost. Nebojí se jít do konfliktu. Ideální pro cold calling.
            </p>
          </div>

          <div
            onClick={() => setSalesStyle('consultative')}
            className={`cursor-pointer relative p-6 rounded-xl border-2 transition-all ${
              salesStyle === 'consultative'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <User className="w-6 h-6 text-blue-500" />
              </div>
              {salesStyle === 'consultative' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 mb-2">The Advisor (Consultative)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Empatický tón. Ptá se na problémy. Buduje vztah. Ideální pro složitá řešení a enterprise.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Integrations (placeholder) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cable className="w-5 h-5 text-indigo-600" />
            Integrations
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">
                Pd
              </div>
              <div>
                <div className="font-bold text-slate-900">Pipedrive CRM</div>
                <div className="text-xs text-slate-500">2-way sync (Contacts, Deals, Activities)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold">
              Not configured
            </div>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                Cal
              </div>
              <div>
                <div className="font-bold text-slate-900">Google Calendar</div>
                <div className="text-xs text-slate-500">Auto-booking slots</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold">
              Not configured
            </div>
          </div>
        </div>
      </div>

      {/* 4. Voice Config */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-60">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Mic className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Voice Clone (ElevenLabs)</h3>
              <p className="text-xs text-slate-500">Allow AI to leave voicemails in your voice.</p>
            </div>
          </div>
          <button className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-xs font-bold">
            Coming Q3
          </button>
        </div>
      </div>
    </div>
  );
}
