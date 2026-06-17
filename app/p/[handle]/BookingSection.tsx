"use client";

import { useState } from "react";

type Slot = { startTime: string; endTime: string; available: boolean };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BookingSection({ profileHandle }: { profileHandle: string }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [heldBookingId, setHeldBookingId] = useState<string | null>(null);
  const [heldSlot, setHeldSlot] = useState<Slot | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSlots = async () => {
    if (!date) return;
    setLoadingSlots(true);
    setSlots([]);
    setMessage(null);
    try {
      const res = await fetch(`/api/booking?profileHandle=${encodeURIComponent(profileHandle)}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  const holdSlot = async (slot: Slot) => {
    setMessage(null);
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileHandle, startTime: slot.startTime, endTime: slot.endTime }),
    });
    const data = await res.json();
    if (res.ok) {
      setHeldBookingId(data.bookingId);
      setHeldSlot(slot);
    } else {
      setMessage("That time is no longer available.");
      loadSlots();
    }
  };

  const confirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heldBookingId || !email) return;
    setConfirming(true);
    const res = await fetch("/api/booking", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: heldBookingId, confirm: true, email, name }),
    });
    if (res.ok) {
      setConfirmed(true);
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Could not confirm.");
      setHeldBookingId(null);
      setHeldSlot(null);
    }
    setConfirming(false);
  };

  const releaseHold = async () => {
    if (!heldBookingId) return;
    await fetch("/api/booking", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: heldBookingId, confirm: false }),
    }).catch(() => {});
    setHeldBookingId(null);
    setHeldSlot(null);
    loadSlots();
  };

  if (confirmed) {
    return (
      <p className="text-sm text-zinc-700">
        Booking confirmed.{" "}
        {heldSlot && (
          <span>
            {new Date(heldSlot.startTime).toLocaleDateString()} at {formatTime(heldSlot.startTime)}
          </span>
        )}
      </p>
    );
  }

  if (heldSlot && heldBookingId) {
    return (
      <div>
        <p className="mb-3 text-sm text-zinc-700">
          Holding{" "}
          <strong>
            {new Date(heldSlot.startTime).toLocaleDateString()} {formatTime(heldSlot.startTime)}–{formatTime(heldSlot.endTime)}
          </strong>{" "}
          for 10 minutes.
        </p>
        <form onSubmit={confirmBooking} className="space-y-3 max-w-sm">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={confirming}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {confirming ? "Confirming…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={releaseHold}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
        {message && <p className="mt-2 text-sm text-zinc-500">{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 items-end mb-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
        </div>
        <button
          onClick={loadSlots}
          disabled={!date || loadingSlots}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {loadingSlots ? "…" : "Show slots"}
        </button>
      </div>

      {slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => holdSlot(slot)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400"
            >
              {formatTime(slot.startTime)}
            </button>
          ))}
        </div>
      )}

      {slots.length === 0 && date && !loadingSlots && (
        <p className="text-sm text-zinc-500">No slots available for this date.</p>
      )}

      {message && <p className="mt-2 text-sm text-zinc-500">{message}</p>}
    </div>
  );
}
