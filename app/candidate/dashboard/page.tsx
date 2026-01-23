"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  handle: string;
  headline: string | null;
  published: boolean;
  updatedAt: string;
};

export default function CandidateDashboard() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        setProfile(null);
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch("/api/profile/publish", {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Profile published! Your public URL: ${data.publicUrl}`);
        fetchProfile();
      } else {
        const error = await response.json();
        alert(`Failed to publish: ${error.message}`);
      }
    } catch (err) {
      alert("Network error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Please sign in</h1>
          <Link
            href="/auth/signin"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Candidate Dashboard</h1>
          <p className="text-zinc-600">Manage your SilentApply profile</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Status Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Profile Status</h2>
            {profile ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-zinc-700">Handle:</span>
                  <span className="font-mono font-medium">/{profile.handle}</span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-zinc-700">Status:</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${profile.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {profile.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-zinc-700">Last updated:</span>
                  <span className="text-sm text-zinc-500">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {profile.published ? (
                  <a
                    href={`/p/${profile.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
                  >
                    View Public Profile
                  </a>
                ) : (
                  <button
                    onClick={handlePublish}
                    className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                  >
                    Publish Profile
                  </button>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="mb-4 text-zinc-600">No profile created yet</p>
                <Link
                  href="/candidate/profile/edit"
                  className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create Profile
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/candidate/profile/edit"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                ✏️ Edit Profile
              </Link>
              <Link
                href="/candidate/resume"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                📄 Upload Resume
              </Link>
              <Link
                href="/candidate/analytics"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                📊 View Analytics
              </Link>
              <Link
                href="/candidate/bookings"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                📅 Manage Bookings
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-md bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
