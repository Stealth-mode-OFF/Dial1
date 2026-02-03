import React, { useState } from 'react';
import { Brain, Mail, MessageSquare, NotebookPen, RefreshCcw } from 'lucide-react';
import { echoApi } from '../utils/echoApi';

type GenerateMode = 'email' | 'script' | 'research';

export function CoachWorkspace() {
  const [contactName, setContactName] = useState('');
  const [company, setCompany] = useState('');
  const [goal, setGoal] = useState('Book demo');
  const [style, setStyle] = useState<'hunter' | 'consultative'>('hunter');
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [mode, setMode] = useState<GenerateMode>('email');

  const runGenerate = async (nextMode: GenerateMode) => {
    setMode(nextMode);
    setIsBusy(true);
    setOutput('');
    try {
      const payload = {
        contactName: contactName || 'Prospect',
        company: company || 'their company',
        goal,
        type: nextMode,
        salesStyle: style,
        contextData: { transcript },
      };
      const res = await echoApi.ai.generate(payload);
      if (nextMode === 'research') {
        setOutput(JSON.stringify(res, null, 2));
      } else {
        const text = res?.content || res;
        setOutput(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed';
      setOutput(message);
    } finally {
      setIsBusy(false);
    }
  };

  const analyzeCall = async () => {
    setIsBusy(true);
    setOutput('');
    try {
      const lines = transcript
        .split('\n')
        .filter(Boolean)
        .map((text) => ({ speaker: text.startsWith('prospect:') ? 'prospect' : 'me', text }));
      const res = await echoApi.ai.analyzeCall({
        transcript: lines,
        salesStyle: style,
        contact: { name: contactName, role: '' },
      });
      setOutput(JSON.stringify(res, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      setOutput(message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="workspace column">
      <div className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">AI lab</p>
            <h2>Coaching & copy</h2>
            <p className="muted">Generate openings, emails, or get a quick call review.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span className="label">Contact</span>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Jana Novak" />
          </label>
          <label>
            <span className="label">Company</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          </label>
          <label>
            <span className="label">Goal</span>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Book discovery" />
          </label>
          <label>
            <span className="label">Sales style</span>
            <select value={style} onChange={(e) => setStyle(e.target.value as any)}>
              <option value="hunter">Hunter / Challenger</option>
              <option value="consultative">Consultative / Advisor</option>
            </select>
          </label>
        </div>

        <label className="block mt-4">
          <span className="label">Transcript or context (optional)</span>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste last 10 lines of the call or key context..."
          />
        </label>

        <div className="button-row wrap mt-3">
          <button className="btn primary" onClick={() => void runGenerate('email')} disabled={isBusy}>
            <Mail size={14} /> Cold email
          </button>
          <button className="btn outline" onClick={() => void runGenerate('script')} disabled={isBusy}>
            <MessageSquare size={14} /> Call opener
          </button>
          <button className="btn ghost" onClick={() => void runGenerate('research')} disabled={isBusy}>
            <NotebookPen size={14} /> Research
          </button>
          <button className="btn ghost" onClick={analyzeCall} disabled={isBusy || !transcript.trim()}>
            <Brain size={14} /> Analyze call
          </button>
          <button className="btn ghost" onClick={() => setOutput('')} disabled={isBusy}>
            <RefreshCcw size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head tight">
          <div className="icon-title">
            <MessageSquare size={14} />
            <span>Output</span>
          </div>
          <span className="muted text-sm">{mode}</span>
        </div>
        <pre className="output-box">{output || 'AI output will appear here.'}</pre>
      </div>
    </div>
  );
}
