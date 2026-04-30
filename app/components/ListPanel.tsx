"use client";

import { useRef } from "react";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  text: string;
  savedAt: number;
  wordCount: number;
}

interface Props {
  todos: TodoItem[];
  entries: JournalEntry[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
  onLoadEntry: (text: string) => void;
  onClose: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ListPanel({ todos, entries, onToggle, onDelete, onAdd, onLoadEntry, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputRef.current?.value.trim()) {
      onAdd(inputRef.current.value.trim());
      inputRef.current.value = "";
    }
  };

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div className="list-panel">
      <button className="panel-close" onClick={onClose}>✕</button>

      {/* To-do list */}
      <p className="panel-title">My List</p>

      <div className="list-input-wrap">
        <input
          ref={inputRef}
          className="list-input"
          type="text"
          placeholder="Add a to-do…"
          onKeyDown={handleAddKeyDown}
        />
      </div>

      {active.length === 0 && done.length === 0 && (
        <p className="list-empty">Nothing here yet. Analyze an entry to pull in to-dos, or add one above.</p>
      )}

      <ul className="todo-list">
        {active.map((t) => (
          <li key={t.id} className="todo-item">
            <button className="todo-check" onClick={() => onToggle(t.id)} aria-label="Complete" />
            <span className="todo-text">{t.text}</span>
            <button className="todo-delete" onClick={() => onDelete(t.id)} aria-label="Delete">✕</button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <p className="list-section-label">Completed</p>
          <ul className="todo-list">
            {done.map((t) => (
              <li key={t.id} className="todo-item done">
                <button className="todo-check checked" onClick={() => onToggle(t.id)} aria-label="Uncomplete" />
                <span className="todo-text">{t.text}</span>
                <button className="todo-delete" onClick={() => onDelete(t.id)} aria-label="Delete">✕</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Entry history */}
      {entries.length > 0 && (
        <>
          <div className="list-divider" />
          <p className="panel-title">Past Entries</p>
          <ul className="entry-list">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="entry-item" onClick={() => onLoadEntry(e.text)}>
                <div className="entry-meta">
                  <span>{formatDate(e.savedAt)}</span>
                  <span>{formatTime(e.savedAt)} · {e.wordCount} words</span>
                </div>
                <p className="entry-preview">{e.text.slice(0, 100).trim()}{e.text.length > 100 ? "…" : ""}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
