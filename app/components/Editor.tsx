"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ListPanel, { TodoItem, JournalEntry } from "./ListPanel";

interface Analysis {
  reflection: string;
  todos: string[];
}

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function Editor() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showList, setShowList] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [addedTodos, setAddedTodos] = useState<Set<number>>(new Set());

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Load all persisted data on mount
  useEffect(() => {
    const storedText = localStorage.getItem("life-os-current");
    if (storedText) setText(storedText);
    setTodos(load<TodoItem[]>("life-os-todos", []));
    setEntries(load<JournalEntry[]>("life-os-entries", []));
    ref.current?.focus();
  }, []);

  useEffect(() => { resize(); }, [text, resize]);

  // Persist todos whenever they change
  useEffect(() => {
    localStorage.setItem("life-os-todos", JSON.stringify(todos));
  }, [todos]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem("life-os-current", val);
      setSaved(true);
    }, 800);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setAddedTodos(new Set());
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok) setAnalysis(data);
    } finally {
      setIsAnalyzing(false);
    }
  }, [text, isAnalyzing]);

  const handleNewEntry = useCallback(() => {
    if (!text.trim()) return;
    // Archive current entry
    const entry: JournalEntry = {
      id: uid(),
      text,
      savedAt: Date.now(),
      wordCount: wordCount(text),
    };
    const updated = [...entries, entry];
    setEntries(updated);
    localStorage.setItem("life-os-entries", JSON.stringify(updated));
    // Clear editor
    setText("");
    localStorage.removeItem("life-os-current");
    setAnalysis(null);
    setConfirming(false);
    setSaved(true);
    ref.current?.focus();
  }, [text, entries]);

  // Todo management
  const addTodo = useCallback((text: string) => {
    setTodos((prev) => [
      { id: uid(), text, done: false, createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const addTodoFromAnalysis = useCallback((text: string, index: number) => {
    addTodo(text);
    setAddedTodos((prev) => new Set(prev).add(index));
  }, [addTodo]);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadEntry = useCallback((entryText: string) => {
    setText(entryText);
    setShowList(false);
    ref.current?.focus();
  }, []);

  const words = wordCount(text);
  const pendingTodos = todos.filter((t) => !t.done).length;

  return (
    <div className="editor-wrap">
      <textarea
        ref={ref}
        className="editor-textarea"
        value={text}
        onChange={handleChange}
        placeholder="What's on your mind..."
        spellCheck
      />

      <div className="bottom-bar">
        <span className="word-count">{words} {words === 1 ? "word" : "words"}</span>
        <div className="separator" />
        <div className={`save-dot ${saved ? "saved" : ""}`} title={saved ? "Saved" : "Saving..."} />
        <div className="separator" />
        <button className="bar-btn" onClick={() => { setShowList(true); setAnalysis(null); }}>
          My list{pendingTodos > 0 ? ` (${pendingTodos})` : ""}
        </button>
        <div className="separator" />
        <button className="bar-btn" onClick={() => setConfirming(true)} disabled={!text.trim()}>
          New entry
        </button>
        <div className="separator" />
        <button
          className="bar-btn analyze"
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
        >
          {isAnalyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {/* Confirm new entry */}
      {confirming && (
        <div className="confirm-overlay" onClick={() => setConfirming(false)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Save & start a new entry?</p>
            <span>Your current writing will be archived in Past Entries.</span>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="confirm-clear" onClick={handleNewEntry}>Save & continue</button>
            </div>
          </div>
        </div>
      )}

      {/* My List panel (left) */}
      {showList && (
        <ListPanel
          todos={todos}
          entries={entries}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onAdd={addTodo}
          onLoadEntry={loadEntry}
          onClose={() => setShowList(false)}
        />
      )}

      {/* Analysis panel (right) */}
      {(isAnalyzing || analysis) && (
        <div className="analysis-panel">
          {!isAnalyzing && (
            <button className="panel-close" onClick={() => setAnalysis(null)}>✕</button>
          )}
          <p className="panel-title">Life OS Analysis</p>

          {isAnalyzing ? (
            <div className="analyzing-state">
              <div className="pulse-dot" />
              <span>Reading between the lines…</span>
            </div>
          ) : (
            analysis && (
              <>
                <div className="panel-response">
                  {analysis.reflection.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {analysis.todos.length > 0 && (
                  <div className="panel-todos">
                    <h3>To-dos</h3>
                    <ul>
                      {analysis.todos.map((todo, i) => (
                        <li key={i}>
                          <span>{todo}</span>
                          <button
                            className={`add-todo-btn ${addedTodos.has(i) ? "added" : ""}`}
                            onClick={() => !addedTodos.has(i) && addTodoFromAnalysis(todo, i)}
                            title="Add to My List"
                          >
                            {addedTodos.has(i) ? "✓" : "+"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
