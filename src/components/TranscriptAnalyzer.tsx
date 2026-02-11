/**
 * TranscriptAnalyzer - Paste tLDV transcript → get AI analysis
 * 
 * Used in wrapup phases of both Dialer and MeetCoach.
 * Also accessible as standalone dashboard via #analyze route.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { echoApi, type TranscriptAnalysisResult, type TranscriptAnalysisSummary, type TranscriptDashboardStats } from '../utils/echoApi';

/* ============ TRANSCRIPT INPUT ============ */
interface TranscriptInputProps {
  contactName?: string;
  contactCompany?: string;
  contactRole?: string;
  durationSeconds?: number;
  onAnalyzed: (result: TranscriptAnalysisResult) => void;
  compact?: boolean; // smaller version for inline wrapup
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({
  contactName, contactCompany, contactRole, durationSeconds, onAnalyzed, compact
}) => {
  const [transcript, setTranscript] = useState('');
  const [meSpeaker, setMeSpeaker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea for easy Cmd+V
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!transcript.trim() || transcript.trim().length < 50) {
      setError('Příliš krátký přepis (minimum 50 znaků)');
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await echoApi.transcript.analyze({
        rawTranscript: transcript,
        contactName,
        contactCompany,
        contactRole,
        durationSeconds,
        meSpeakerOverride: meSpeaker || undefined,
      });
      onAnalyzed(result);
    } catch (e: any) {
      setError(e.message || 'Analýza selhala');
    } finally {
      setIsAnalyzing(false);
    }
  }, [transcript, meSpeaker, contactName, contactCompany, contactRole, durationSeconds, onAnalyzed]);

  return (
    <div className={`ta-input ${compact ? 'ta-input-compact' : ''}`}>
      <div className="ta-input-header">
        <h3>📋 Vlož přepis hovoru</h3>
        <p className="ta-input-hint">Cmd+V z tLDV, nebo jakýkoliv formát s jmény mluvčích</p>
      </div>

      <textarea
        ref={textareaRef}
        className="ta-textarea"
        value={transcript}
        onChange={e => setTranscript(e.target.value)}
        placeholder={`[00:00] Prodejce: Dobrý den, volám ohledně...\n[00:15] Klient: Dobrý den, řekněte.\n[00:23] Prodejce: Chtěl jsem se zeptat...\n\nNebo:\n\nProdejce 00:00\nDobrý den, volám ohledně...\n\nKlient 00:15\nDobrý den, řekněte.`}
        rows={compact ? 6 : 12}
      />

      <div className="ta-input-controls">
        <div className="ta-speaker-override">
          <label>Já jsem (volitelné):</label>
          <input
            type="text"
            value={meSpeaker}
            onChange={e => setMeSpeaker(e.target.value)}
            placeholder="Auto-detect (první mluvčí)"
            className="ta-speaker-input"
          />
        </div>

        <button
          className="ta-analyze-btn"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !transcript.trim()}
        >
          {isAnalyzing ? '⏳ Analyzuji...' : '🔍 Analyzovat hovor'}
        </button>
      </div>

      {error && <div className="ta-error">{error}</div>}

      {isAnalyzing && (
        <div className="ta-loading">
          <div className="ta-loading-spinner" />
          <p>GPT-4 analyzuje přepis... (10-20s)</p>
        </div>
      )}
    </div>
  );
};

/* ============ ANALYSIS RESULT VIEW ============ */
interface AnalysisResultProps {
  result: TranscriptAnalysisResult;
  onCopyPipedrive?: () => void;
  onBack?: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onCopyPipedrive, onBack }) => {
  const { metrics, analysis } = result;
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'objections' | 'spin'>('overview');

  const handleCopyNotes = useCallback(() => {
    navigator.clipboard.writeText(analysis.spinNotesPipedrive || '');
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
    onCopyPipedrive?.();
  }, [analysis.spinNotesPipedrive, onCopyPipedrive]);

  // Score color
  const scoreColor = analysis.score >= 70 ? '#10b981' : analysis.score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="ta-result">
      {/* Score Hero */}
      <div className="ta-score-hero">
        <div className="ta-score-circle" style={{ '--score-color': scoreColor } as React.CSSProperties}>
          <span className="ta-score-value">{analysis.score}</span>
          <span className="ta-score-label">/ 100</span>
        </div>
        <div className="ta-score-info">
          <p className="ta-score-summary">{analysis.summary}</p>
          <div className="ta-score-badges">
            <span className="ta-badge" title="Poměr mluvení">
              🗣️ {metrics.talkRatioMe}% já / {metrics.talkRatioProspect}% klient
            </span>
            <span className="ta-badge" title="Parazitní slova">
              💬 {metrics.fillerWordRate}% filler slov
            </span>
            <span className="ta-badge" title="Počet výměn">
              🔄 {metrics.turnCount} výměn
            </span>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      {analysis.categoryScores && (
        <div className="ta-categories">
          {Object.entries(analysis.categoryScores).map(([key, cat]) => {
            const maxScore = key === 'discovery' ? 25 : key === 'listening' ? 15 : 20;
            const pct = Math.round((cat.score / maxScore) * 100);
            return (
              <div key={key} className="ta-category">
                <div className="ta-category-header">
                  <span className="ta-category-name">
                    {key === 'rapport' && '🤝 Rapport'}
                    {key === 'discovery' && '🔍 Discovery'}
                    {key === 'listening' && '👂 Naslouchání'}
                    {key === 'objectionHandling' && '🛡️ Námitky'}
                    {key === 'closing' && '🎯 Closing'}
                  </span>
                  <span className="ta-category-score">{cat.score}/{maxScore}</span>
                </div>
                <div className="ta-category-bar">
                  <div className="ta-category-fill" style={{ width: `${pct}%`, background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <p className="ta-category-note">{cat.note}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Talk Ratio & Fillers */}
      <div className="ta-metrics-row">
        <div className="ta-metric-card">
          <h4>🗣️ Poměr mluvení</h4>
          <div className="ta-ratio-bar">
            <div className="ta-ratio-me" style={{ width: `${metrics.talkRatioMe}%` }}>
              {metrics.talkRatioMe}%
            </div>
            <div className="ta-ratio-prospect" style={{ width: `${metrics.talkRatioProspect}%` }}>
              {metrics.talkRatioProspect}%
            </div>
          </div>
          <p className="ta-metric-note">{analysis.talkRatioAnalysis}</p>
        </div>

        <div className="ta-metric-card">
          <h4>💬 Parazitní slova</h4>
          <div className="ta-fillers">
            {Object.entries(metrics.fillerWords).length > 0 ? (
              Object.entries(metrics.fillerWords)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([word, count]) => (
                  <span key={word} className="ta-filler-tag">
                    „{word}" × {count}
                  </span>
                ))
            ) : (
              <span className="ta-filler-none">Žádné detekované ✨</span>
            )}
          </div>
          <p className="ta-metric-note">{analysis.fillerWordsAnalysis}</p>
        </div>
      </div>

      {/* Tabs: Overview / Questions / Objections / SPIN */}
      <div className="ta-tabs">
        <button className={`ta-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 Přehled
        </button>
        <button className={`ta-tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
          ❓ Otázky ({analysis.questionsAsked?.length || 0})
        </button>
        <button className={`ta-tab ${activeTab === 'objections' ? 'active' : ''}`} onClick={() => setActiveTab('objections')}>
          🛡️ Námitky ({analysis.objectionsHandled?.length || 0})
        </button>
        <button className={`ta-tab ${activeTab === 'spin' ? 'active' : ''}`} onClick={() => setActiveTab('spin')}>
          📋 SPIN pozn.
        </button>
      </div>

      <div className="ta-tab-content">
        {activeTab === 'overview' && (
          <div className="ta-overview">
            <div className="ta-strengths">
              <h4>✅ Silné stránky</h4>
              <ul>{analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="ta-weaknesses">
              <h4>⚠️ Slabé stránky</h4>
              <ul>{analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
            <div className="ta-coaching">
              <h4>💡 Tip pro příště</h4>
              <p>{analysis.coachingTip}</p>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="ta-questions">
            {analysis.questionsAsked?.map((q, i) => (
              <div key={i} className={`ta-question-item ta-q-${q.quality}`}>
                <div className="ta-question-meta">
                  <span className={`ta-q-type ${q.type}`}>{q.type === 'open' ? '🟢 Otevřená' : '🔴 Uzavřená'}</span>
                  <span className="ta-q-phase">{q.phase}</span>
                  <span className={`ta-q-quality ${q.quality}`}>{q.quality === 'strong' ? '💪' : '👎'}</span>
                </div>
                <p className="ta-question-text">„{q.text}"</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'objections' && (
          <div className="ta-objections">
            {analysis.objectionsHandled?.length ? (
              analysis.objectionsHandled.map((o, i) => (
                <div key={i} className={`ta-objection-item ta-obj-${o.quality}`}>
                  <div className="ta-objection-header">
                    <span className={`ta-obj-quality ${o.quality}`}>
                      {o.quality === 'good' ? '✅ Dobrá reakce' : o.quality === 'weak' ? '⚠️ Slabá reakce' : '❌ Zmeškáno'}
                    </span>
                  </div>
                  <p className="ta-objection-text"><strong>Klient:</strong> „{o.objection}"</p>
                  <p className="ta-objection-response"><strong>Odpověď:</strong> „{o.response}"</p>
                </div>
              ))
            ) : (
              <p className="ta-empty">Žádné námitky detekovány</p>
            )}
          </div>
        )}

        {activeTab === 'spin' && (
          <div className="ta-spin-notes">
            <div className="ta-spin-preview">
              <pre className="ta-spin-text">{analysis.spinNotesPipedrive}</pre>
            </div>
            <button className="ta-copy-btn" onClick={handleCopyNotes}>
              {copiedNotes ? '✅ Zkopírováno!' : '📋 Kopírovat do Pipedrive'}
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="ta-actions">
        {onBack && (
          <button className="ta-action-btn secondary" onClick={onBack}>
            ← Zpět
          </button>
        )}
        <button className="ta-action-btn primary" onClick={handleCopyNotes}>
          {copiedNotes ? '✅ Zkopírováno!' : '📋 SPIN poznámky pro Pipedrive'}
        </button>
      </div>
    </div>
  );
};

/* ============ DASHBOARD ============ */
export const AnalysisDashboard: React.FC = () => {
  const [analyses, setAnalyses] = useState<TranscriptAnalysisSummary[]>([]);
  const [stats, setStats] = useState<TranscriptDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'input' | 'detail'>('dashboard');
  const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysisResult | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [statsDays, setStatsDays] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, statsResult] = await Promise.all([
        echoApi.transcript.list(20, 0),
        echoApi.transcript.stats(statsDays),
      ]);
      setAnalyses(listResult.analyses);
      setStats(statsResult);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [statsDays]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAnalyzed = useCallback((result: TranscriptAnalysisResult) => {
    setAnalysisResult(result);
    setView('detail');
    loadData(); // refresh list
  }, [loadData]);

  const handleShowDetail = useCallback(async (id: string) => {
    try {
      const data = await echoApi.transcript.get(id);
      setDetailData(data);
      setView('detail');
    } catch (e) {
      console.error('Failed to load detail:', e);
    }
  }, []);

  // Convert stored detail to AnalysisResult format
  const detailAsResult: TranscriptAnalysisResult | null = detailData ? {
    id: detailData.id,
    metrics: {
      talkRatioMe: detailData.talk_ratio_me,
      talkRatioProspect: detailData.talk_ratio_prospect,
      totalWordsMe: detailData.total_words_me,
      totalWordsProspect: detailData.total_words_prospect,
      fillerWords: detailData.filler_words || {},
      fillerWordRate: detailData.filler_word_rate,
      turnCount: detailData.parsed_turns?.length || 0,
      speakers: [...new Set((detailData.parsed_turns || []).map((t: any) => t.speaker))] as string[],
      meSpeaker: '',
    },
    analysis: {
      score: detailData.ai_score,
      summary: detailData.ai_summary,
      categoryScores: {},
      strengths: detailData.ai_strengths || [],
      weaknesses: detailData.ai_weaknesses || [],
      coachingTip: detailData.ai_coaching_tip || '',
      fillerWordsAnalysis: '',
      talkRatioAnalysis: '',
      spinCoverage: detailData.spin_stage_coverage || {},
      questionsAsked: detailData.questions_asked || [],
      objectionsHandled: detailData.objections_handled || [],
      spinNotesPipedrive: detailData.spin_notes_pipedrive || '',
    },
    saved: true,
  } : null;

  if (view === 'input') {
    return (
      <div className="ta-page">
        <div className="ta-page-header">
          <button className="ta-back-btn" onClick={() => setView('dashboard')}>← Dashboard</button>
          <h2>Nová analýza</h2>
        </div>
        <TranscriptInput onAnalyzed={handleAnalyzed} />
      </div>
    );
  }

  if (view === 'detail' && (analysisResult || detailAsResult)) {
    return (
      <div className="ta-page">
        <div className="ta-page-header">
          <button className="ta-back-btn" onClick={() => { setView('dashboard'); setAnalysisResult(null); setDetailData(null); }}>← Dashboard</button>
          <h2>Analýza hovoru</h2>
        </div>
        <AnalysisResult
          result={(analysisResult || detailAsResult)!}
          onBack={() => { setView('dashboard'); setAnalysisResult(null); setDetailData(null); }}
        />
      </div>
    );
  }

  return (
    <div className="ta-page">
      <div className="ta-page-header">
        <h2>📊 Analýza hovorů</h2>
        <button className="ta-new-btn" onClick={() => setView('input')}>
          + Nová analýza
        </button>
      </div>

      {loading ? (
        <div className="ta-loading">
          <div className="ta-loading-spinner" />
          <p>Načítám data...</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          {stats && stats.totalCalls > 0 && (
            <div className="ta-stats-grid">
              <div className="ta-stat-card">
                <span className="ta-stat-value">{stats.totalCalls}</span>
                <span className="ta-stat-label">Hovorů</span>
              </div>
              <div className="ta-stat-card">
                <span className="ta-stat-value" style={{ color: stats.avgScore >= 70 ? '#10b981' : stats.avgScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {stats.avgScore}
                </span>
                <span className="ta-stat-label">Průměr skóre</span>
              </div>
              <div className="ta-stat-card">
                <span className="ta-stat-value">{stats.avgTalkRatio}%</span>
                <span className="ta-stat-label">Prům. talk ratio</span>
              </div>
              <div className="ta-stat-card">
                <span className="ta-stat-value">{stats.avgFillerRate}%</span>
                <span className="ta-stat-label">Prům. fillers</span>
              </div>
              {stats.objectionStats.total > 0 && (
                <div className="ta-stat-card">
                  <span className="ta-stat-value">
                    {Math.round((stats.objectionStats.good / stats.objectionStats.total) * 100)}%
                  </span>
                  <span className="ta-stat-label">Námitky zvládnuté</span>
                </div>
              )}
            </div>
          )}

          {/* Score Trend mini-chart */}
          {stats && stats.trend.length > 1 && (
            <div className="ta-trend">
              <h3>📈 Trend skóre ({statsDays} dní)</h3>
              <div className="ta-trend-chart">
                {stats.trend.map((t, i) => (
                  <div
                    key={i}
                    className="ta-trend-bar"
                    style={{ height: `${t.score}%`, background: t.score >= 70 ? '#10b981' : t.score >= 40 ? '#f59e0b' : '#ef4444' }}
                    title={`${new Date(t.date).toLocaleDateString('cs')} — ${t.score}/100`}
                  />
                ))}
              </div>
              <div className="ta-trend-actions">
                {[7, 30, 90].map(d => (
                  <button key={d} className={`ta-trend-btn ${statsDays === d ? 'active' : ''}`} onClick={() => setStatsDays(d)}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Call List */}
          <div className="ta-list">
            <h3>Posledních 20 hovorů</h3>
            {analyses.length === 0 ? (
              <div className="ta-list-empty">
                <p>Zatím žádné analýzy.</p>
                <button className="ta-new-btn" onClick={() => setView('input')}>
                  + Analyzovat první hovor
                </button>
              </div>
            ) : (
              analyses.map(a => (
                <button key={a.id} className="ta-list-item" onClick={() => handleShowDetail(a.id)}>
                  <div className="ta-list-item-left">
                    <span className="ta-list-score" style={{ color: (a.ai_score || 0) >= 70 ? '#10b981' : (a.ai_score || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>
                      {a.ai_score ?? '—'}
                    </span>
                    <div className="ta-list-info">
                      <span className="ta-list-name">{a.contact_name || 'Neznámý'} · {a.contact_company || ''}</span>
                      <span className="ta-list-date">{new Date(a.call_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="ta-list-item-right">
                    <span className="ta-list-ratio">{a.talk_ratio_me}% / {a.talk_ratio_prospect}%</span>
                    <span className="ta-list-arrow">→</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
