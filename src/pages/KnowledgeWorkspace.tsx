import React, { useEffect, useState } from 'react';
import { Book, Plus, Trash } from 'lucide-react';
import { echoApi, type KnowledgeModule } from '../utils/echoApi';

export function KnowledgeWorkspace() {
  const [items, setItems] = useState<KnowledgeModule[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const list = await echoApi.knowledge.list();
      const safeList = Array.isArray(list)
        ? list.filter((item): item is KnowledgeModule => Boolean(item && item.id && item.title && item.content))
        : [];
      setItems(safeList);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Knowledge fetch failed';
      setError(message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsBusy(true);
    try {
      const res = await echoApi.knowledge.create({ title: title.trim(), content: content.trim() });
      if (res?.module) {
        setItems((prev) => [res.module, ...prev]);
      }
      setTitle('');
      setContent('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async (id: string) => {
    setIsBusy(true);
    try {
      await echoApi.knowledge.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="workspace column">
      <div className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Playbooks</p>
            <h2>Knowledge base</h2>
            <p className="muted">Store rebuttals, scripts, and battle cards for the team.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span className="label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Budget objection" />
          </label>
          <label className="full">
            <span className="label">Content</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Key lines, context, proof points..."
            />
          </label>
        </div>
        <button className="btn primary mt-3" onClick={add} disabled={isBusy}>
          <Plus size={14} /> Save module
        </button>
        {error && <div className="status-line">{error}</div>}
      </div>

      <div className="panel">
        <div className="panel-head tight">
          <div className="icon-title">
            <Book size={14} />
            <span>Saved modules</span>
          </div>
          <button className="btn ghost" onClick={() => void load()} disabled={isBusy}>
            Refresh
          </button>
        </div>
        <div className="list">
          {items.length === 0 && <div className="muted">No modules yet.</div>}
          {items.filter(Boolean).map((item) => (
            <div key={item.id} className="list-row">
              <div>
                <div className="item-title">{item.title || 'Untitled'}</div>
                <div className="muted text-sm">{item.content || ''}</div>
              </div>
              <button className="btn ghost danger" onClick={() => void remove(item.id)} disabled={isBusy}>
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
