"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        // API returns { profiles: [...] }
        const next = data.profiles?.[0] ?? null;
        setProfile(next);
        // Onboarding: a candidate with no profile is sent straight to create one.
        if (!next) {
          router.replace("/candidate/profile/edit?new=true");
          return;
        }
      } else if (response.status === 404) {
        setProfile(null);
        router.replace("/candidate/profile/edit?new=true");
        return;
      } else {
        setError("Failed to load profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch("/api/profile/publish", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        const url = data.publicUrl ?? `/p/${profile?.handle}`;
        alert(`Profile published. Public URL: ${url}`);
        fetchProfile();
      } else {
        const err = await response.json();
        alert(`Could not publish: ${err.message ?? err.error ?? "Unknown error"}`);
      }
    } catch {
      alert("Network error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <Link
            href="/continue"
            className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-600">{session?.user?.email}</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile status */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Profile</h2>
            {profile ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-zinc-700">Handle</span>
                  <span className="font-mono font-medium text-zinc-900">/{profile.handle}</span>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-zinc-700">Status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      profile.published
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {profile.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-zinc-700">Updated</span>
                  <span className="text-sm text-zinc-500">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/candidate/profile/edit"
                    className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-center text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                  <a
                    href={`/p/${profile.handle}?preview=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-center text-zinc-700 hover:bg-zinc-50"
                  >
                    Preview
                  </a>
                  {profile.published ? (
                    <a
                      href={`/p/${profile.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-center text-white hover:bg-zinc-700"
                    >
                      View public page
                    </a>
                  ) : (
                    <button
                      onClick={handlePublish}
                      className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="mb-4 text-zinc-600">No profile yet.</p>
                <Link
                  href="/candidate/profile/edit"
                  className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700"
                >
                  Create profile
                </Link>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Actions</h2>
            <div className="space-y-3">
              <Link
                href="/candidate/profile/edit"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                Edit profile
              </Link>
              <Link
                href="/candidate/resume"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                Upload resume
              </Link>
              <Link
                href="/candidate/availability"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                Set availability
              </Link>
              <Link
                href="/candidate/analytics"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                Activity
              </Link>
              <Link
                href="/candidate/bookings"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-50"
              >
                Bookings
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
