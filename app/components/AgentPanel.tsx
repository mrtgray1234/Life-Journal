"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

interface Props {
  task: string;
  onClose: () => void;
  onAddTodo: (text: string) => void;
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      out.push(
        <h3 key={i} className="agent-section-title">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push(
        <div key={i} className="agent-bullet">
          <span className="agent-bullet-dot">·</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      // skip blank lines (spacing handled by CSS gaps)
    } else {
      out.push(
        <p key={i} className="agent-paragraph">
          {line}
        </p>
      );
    }
    i++;
  }

  return out;
}

export default function AgentPanel({ task, onClose, onAddTodo }: Props) {
  const [context, setContext] = useState("");
  const [content, setContent] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [addedNextStep, setAddedNextStep] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setHasStarted(true);
    setContent("");
    setSearchCount(0);
    setAddedNextStep(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, context }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setContent("Something went wrong. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Detect search signal tokens
        const lines = (buffer + chunk).split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line === "SEARCHING") {
            setSearchCount((n) => n + 1);
          } else {
            setContent((prev) => prev + line + "\n");
          }
        }

        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }

      // flush remaining buffer
      if (buffer && buffer !== "SEARCHING") {
        setContent((prev) => prev + buffer);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setContent("Error running agent. Check that ANTHROPIC_API_KEY is set.");
      }
    } finally {
      setIsRunning(false);
    }
  }, [task, context, isRunning]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Extract "Your Next Step" section for quick-add
  const nextStepMatch = content.match(/## Your Next Step\n([\s\S]*?)(?=\n## |$)/);
  const nextStep = nextStepMatch?.[1]?.trim();

  return (
    <div className="agent-panel">
      <button className="panel-close" onClick={onClose}>
        ✕
      </button>

      <p className="panel-title">Life Agent</p>

      <div className="agent-task-box">
        <span className="agent-task-text">{task}</span>
      </div>

      {!hasStarted && (
        <div className="agent-setup">
          <input
            className="list-input"
            type="text"
            placeholder="Add context (zip code, insurance, budget…)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            autoFocus
          />
          <button className="agent-run-btn" onClick={run}>
            Go Research This →
          </button>
        </div>
      )}

      {isRunning && (
        <div className="agent-status">
          <div className="pulse-dot" />
          <span>
            {searchCount > 0
              ? `Searched ${searchCount} time${searchCount > 1 ? "s" : ""}…`
              : "Starting research…"}
          </span>
        </div>
      )}

      {content && (
        <div ref={contentRef} className="agent-content">
          {renderContent(content)}
        </div>
      )}

      {!isRunning && content && nextStep && (
        <div className="agent-actions">
          <button
            className={`agent-add-btn ${addedNextStep ? "added" : ""}`}
            onClick={() => {
              if (!addedNextStep) {
                onAddTodo(nextStep);
                setAddedNextStep(true);
              }
            }}
          >
            {addedNextStep ? "✓ Added to list" : "+ Add next step to list"}
          </button>
        </div>
      )}

      {!isRunning && hasStarted && (
        <button
          className="agent-run-again"
          onClick={() => {
            setHasStarted(false);
            setContent("");
          }}
        >
          Run again
        </button>
      )}
    </div>
  );
}
