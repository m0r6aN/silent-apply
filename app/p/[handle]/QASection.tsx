"use client";

import { useState } from "react";

export default function QASection({ profileHandle }: { profileHandle: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileHandle, question: question.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnswer(data.answer ?? "No response available.");
      } else {
        setError("Could not process question.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about availability, location, authorization…"
          maxLength={500}
          className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>

      {answer && (
        <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
          {answer}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-zinc-500">{error}</p>
      )}
    </div>
  );
}
