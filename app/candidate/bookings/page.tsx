"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  name: string | null;
  email: string | null;
};

export default function BookingsPage() {
  const { status } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(async (data) => {
        const p = data.profiles?.[0];
        if (!p) return;
        setProfileHandle(p.handle);
        // Fetch upcoming bookings (confirmed or held)
        const today = new Date().toISOString().split("T")[0];
        const r = await fetch(`/api/booking?profileHandle=${encodeURIComponent(p.handle)}&date=${today}`);
        if (!r.ok) return;
        // Booking GET returns slots for one day — for a simple list we'd need
        // a dedicated endpoint. Show confirmed bookings via events.
        const res = await fetch(`/api/events?profileHandle=${encodeURIComponent(p.handle)}`);
        if (!res.ok) return;
        const evData = await res.json();
        // Use the recent events list as a proxy for booking activity
        const bookingEvents = (evData.recentEvents ?? []).filter(
          (e: { eventType: string }) => e.eventType === "booking.confirmed"
        );
        setBookings(bookingEvents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-600">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/continue" className="rounded-md bg-zinc-900 px-4 py-2 text-white">Continue</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Bookings</h1>
          <Link href="/candidate/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">← Dashboard</Link>
        </div>

        {!profileHandle && (
          <p className="text-zinc-600">No profile found. <Link href="/candidate/profile/edit" className="underline">Create one.</Link></p>
        )}

        {profileHandle && bookings.length === 0 && (
          <p className="text-zinc-600">No confirmed bookings yet.</p>
        )}

        {profileHandle && bookings.length > 0 && (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {b.name ?? "Recruiter"}
                    </p>
                    <p className="text-xs text-zinc-500">{b.email}</p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(b.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-zinc-400">
          To enable booking, turn on "Enable booking" in your <Link href="/candidate/profile/edit" className="underline">profile settings</Link>.
        </p>
      </div>
    </div>
  );
}
