"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Analysis {
  response: string;
}

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export default function Editor() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("life-os-v1");
    if (stored) setText(stored);
    ref.current?.focus();
  }, []);

  useEffect(() => {
    resize();
  }, [text, resize]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem("life-os-v1", val);
      setSaved(true);
    }, 800);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysis(null);
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

  const handleClear = useCallback(() => {
    setText("");
    localStorage.removeItem("life-os-v1");
    setAnalysis(null);
    setConfirming(false);
    setSaved(true);
    ref.current?.focus();
  }, []);

  const words = wordCount(text);

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
        <button
          className="bar-btn"
          onClick={() => setConfirming(true)}
          disabled={!text.trim()}
        >
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

      {confirming && (
        <div className="confirm-overlay" onClick={() => setConfirming(false)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Start a new entry?</p>
            <span>This will clear your current writing.</span>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button className="confirm-clear" onClick={handleClear}>
                Clear & start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {(isAnalyzing || analysis) && (
        <div className="analysis-panel">
          {!isAnalyzing && (
            <button className="panel-close" onClick={() => setAnalysis(null)}>
              ✕
            </button>
          )}
          <p className="panel-title">Life OS Analysis</p>

          {isAnalyzing ? (
            <div className="analyzing-state">
              <div className="pulse-dot" />
              <span>Reading between the lines…</span>
            </div>
          ) : (
            analysis && (
              <div className="panel-response">
                {analysis.response.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
