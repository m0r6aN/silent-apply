"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Window = { dayOfWeek: number; startMinute: number; endMinute: number };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export default function AvailabilityPage() {
  const { status } = useSession();
  const [windows, setWindows] = useState<Window[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => setWindows(data.windows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-600">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-zinc-600">Sign in required.</p>
          <Link href="/continue" className="rounded-md bg-zinc-900 px-4 py-2 text-white">Continue</Link>
        </div>
      </div>
    );
  }

  const addWindow = () =>
    setWindows((w) => [...w, { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }]);

  const removeWindow = (i: number) =>
    setWindows((w) => w.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<Window>) =>
    setWindows((w) => w.map((win, idx) => (idx === i ? { ...win, ...patch } : win)));

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    for (const w of windows) {
      if (w.endMinute <= w.startMinute) {
        setError("Each window must end after it starts.");
        setSaving(false);
        return;
      }
    }

    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windows }),
    });

    if (res.ok) {
      const data = await res.json();
      setWindows(data.windows ?? []);
      setMessage("Availability saved.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save availability.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Availability</h1>
          <Link href="/candidate/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Dashboard
          </Link>
        </div>

        <p className="mb-6 text-sm text-zinc-600">
          Define the weekly windows when recruiters may book a conversation. Slots are offered in
          one-hour blocks within these windows. Times are in UTC. Booking only appears on your
          public profile when you enable it in your profile&apos;s visibility settings.
        </p>

        <div className="space-y-3">
          {windows.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
              No availability defined yet. Recruiters cannot book until you add a window.
            </p>
          )}

          {windows.map((w, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <select
                value={w.dayOfWeek}
                onChange={(e) => update(i, { dayOfWeek: parseInt(e.target.value, 10) })}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
              <input
                type="time"
                value={minutesToTime(w.startMinute)}
                onChange={(e) => update(i, { startMinute: timeToMinutes(e.target.value) })}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <input
                type="time"
                value={minutesToTime(w.endMinute)}
                onChange={(e) => update(i, { endMinute: timeToMinutes(e.target.value) })}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                type="button"
                onClick={() => removeWindow(i)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addWindow}
          className="mt-3 text-sm text-zinc-600 hover:text-zinc-900"
        >
          + Add window
        </button>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}
        {message && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save availability"}
          </button>
        </div>
      </div>
    </div>
  );
}
