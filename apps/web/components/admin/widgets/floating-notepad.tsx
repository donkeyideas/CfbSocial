'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, Copy, X, Plus, Trash2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface NotepadData {
  notes: string;
  checklist: ChecklistItem[];
  tab: 'notes' | 'checklist';
}

const STORAGE_KEY = 'admin-notepad';
const DEFAULT_DATA: NotepadData = { notes: '', checklist: [], tab: 'notes' };

function loadData(): NotepadData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return DEFAULT_DATA;
  }
}

export function FloatingNotepad() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NotepadData>(DEFAULT_DATA);
  const [newTask, setNewTask] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage after mount
  useEffect(() => {
    setData(loadData());
    setMounted(true);
  }, []);

  // Debounced auto-save
  const persist = useCallback((next: NotepadData) => {
    setData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* quota exceeded — ignore */ }
    }, 500);
  }, []);

  const setTab = (tab: 'notes' | 'checklist') => persist({ ...data, tab });
  const setNotes = (notes: string) => persist({ ...data, notes });

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    const item: ChecklistItem = { id: crypto.randomUUID(), text, done: false };
    persist({ ...data, checklist: [...data.checklist, item] });
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    persist({
      ...data,
      checklist: data.checklist.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  };

  const removeTask = (id: string) => {
    persist({ ...data, checklist: data.checklist.filter((t) => t.id !== id) });
  };

  const handleCopy = async () => {
    let text = '';
    if (data.tab === 'notes') {
      text = data.notes;
    } else {
      text = data.checklist
        .map((t) => `${t.done ? '[x]' : '[ ]'} ${t.text}`)
        .join('\n');
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  // Don't render anything server-side
  if (!mounted) return null;

  /* ── Collapsed: icon button ── */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="notepad-toggle"
        title="Open Notepad"
      >
        <ClipboardList className="h-5 w-5" />
      </button>
    );
  }

  /* ── Expanded: full widget ── */
  return (
    <div className="notepad-container">
      {/* Header */}
      <div className="notepad-header">
        <span className="text-xs font-bold uppercase tracking-wider">Notepad</span>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="notepad-header-btn" title="Copy to clipboard">
            <Copy className="h-3.5 w-3.5" />
            {copied && <span className="text-[10px]">Copied</span>}
            {!copied && <span className="text-[10px]">Copy</span>}
          </button>
          <button onClick={() => setIsOpen(false)} className="notepad-header-btn" title="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="notepad-tabs">
        <button
          onClick={() => setTab('notes')}
          className={`notepad-tab ${data.tab === 'notes' ? 'notepad-tab-active' : ''}`}
        >
          Notes
        </button>
        <button
          onClick={() => setTab('checklist')}
          className={`notepad-tab ${data.tab === 'checklist' ? 'notepad-tab-active' : ''}`}
        >
          Checklist
        </button>
      </div>

      {/* Content */}
      <div className="notepad-body">
        {data.tab === 'notes' ? (
          <textarea
            value={data.notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes here...  Paste links, ideas, reminders — anything you need to remember while working."
            className="notepad-textarea"
          />
        ) : (
          <div className="notepad-checklist">
            {/* Add task input */}
            <div className="notepad-add-row">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task..."
                className="notepad-add-input"
              />
              <button onClick={addTask} className="notepad-add-btn" title="Add task">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Task list */}
            <div className="notepad-task-list">
              {data.checklist.length === 0 ? (
                <p className="notepad-empty">No tasks yet. Add one above.</p>
              ) : (
                data.checklist.map((item) => (
                  <label key={item.id} className="notepad-task">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleTask(item.id)}
                      className="notepad-checkbox"
                    />
                    <span className={`notepad-task-text ${item.done ? 'notepad-task-done' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); removeTask(item.id); }}
                      className="notepad-task-delete"
                      title="Remove task"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
