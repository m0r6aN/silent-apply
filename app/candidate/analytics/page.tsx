"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalViews: number;
  totalQuestions: number;
  totalBookings: number;
  totalDownloads: number;
};

export default function AnalyticsPage() {
  const { status } = useSession();
  const [handle, setHandle] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profiles?.[0];
        if (!p) return;
        setHandle(p.handle);
        return fetch(`/api/events?profileHandle=${encodeURIComponent(p.handle)}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.stats) setStats(data.stats);
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
          <h1 className="text-2xl font-bold text-zinc-900">Activity</h1>
          <Link href="/candidate/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">← Dashboard</Link>
        </div>

        {!handle && (
          <p className="text-zinc-600">No profile found. <Link href="/candidate/profile/edit" className="underline">Create one.</Link></p>
        )}

        {handle && stats && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Profile views", value: stats.totalViews },
              { label: "Questions asked", value: stats.totalQuestions },
              { label: "Bookings", value: stats.totalBookings },
              { label: "Resume downloads", value: stats.totalDownloads },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {handle && !stats && (
          <p className="text-zinc-600">No activity yet.</p>
        )}

        <p className="mt-8 text-xs text-zinc-400">
          Activity counts are for your profile only. No recruiter tracking or cross-profile data.
        </p>
      </div>
    </div>
  );
}
