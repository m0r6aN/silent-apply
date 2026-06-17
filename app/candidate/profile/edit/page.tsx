"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProofLink = { type: string; url: string; label: string };

type FormState = {
  handle: string;
  headline: string;
  roles: string;
  locationMode: string;
  commuteMiles: string;
  citizen: boolean;
  visa: string;
  clearance: string;
  startDate: string;
  employmentType: string;
  noticePeriod: string;
  compMin: string;
  compMax: string;
  compVisible: boolean;
  proofLinks: ProofLink[];
  visWorkAuth: boolean;
  visCompensation: boolean;
  visContact: boolean;
  visResume: boolean;
  visBooking: boolean;
};

const defaults: FormState = {
  handle: "",
  headline: "",
  roles: "",
  locationMode: "remote",
  commuteMiles: "",
  citizen: true,
  visa: "",
  clearance: "",
  startDate: "",
  employmentType: "full-time",
  noticePeriod: "0",
  compMin: "",
  compMax: "",
  compVisible: false,
  proofLinks: [],
  visWorkAuth: false,
  visCompensation: false,
  visContact: true,
  visResume: false,
  visBooking: false,
};

export default function ProfileEditPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaults);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          const p = data.profiles?.[0];
          if (!p) return;
          setIsNew(false);
          const wa = p.workAuthJson ?? {};
          const av = p.availabilityJson ?? {};
          const co = p.compJson ?? {};
          const vi = p.visibilityJson ?? {};
          setForm({
            handle: p.handle ?? "",
            headline: p.headline ?? "",
            roles: (p.roles ?? []).join(", "),
            locationMode: p.locationMode ?? "remote",
            commuteMiles: p.commuteMiles != null ? String(p.commuteMiles) : "",
            citizen: wa.citizen ?? true,
            visa: wa.visa ?? "",
            clearance: wa.clearance ?? "",
            startDate: av.startDate ?? "",
            employmentType: av.employmentType ?? "full-time",
            noticePeriod: String(av.noticePeriod ?? 0),
            compMin: co.min != null ? String(co.min) : "",
            compMax: co.max != null ? String(co.max) : "",
            compVisible: co.visible ?? false,
            proofLinks: (p.proofLinks ?? []) as ProofLink[],
            visWorkAuth: vi.workAuth ?? false,
            visCompensation: vi.compensation ?? false,
            visContact: vi.contact ?? true,
            visResume: vi.resume ?? false,
            visBooking: vi.booking ?? false,
          });
        })
        .catch(() => {});
    }
  }, [status]);

  if (status === "loading") {
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

  const set = (key: keyof FormState, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addProofLink = () =>
    setForm((f) => ({ ...f, proofLinks: [...f.proofLinks, { type: "other", url: "", label: "" }] }));

  const removeProofLink = (i: number) =>
    setForm((f) => ({ ...f, proofLinks: f.proofLinks.filter((_, idx) => idx !== i) }));

  const updateProofLink = (i: number, field: keyof ProofLink, value: string) =>
    setForm((f) => ({
      ...f,
      proofLinks: f.proofLinks.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const roles = form.roles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (roles.length === 0) {
      setError("At least one role is required.");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      headline: form.headline,
      roles,
      locationMode: form.locationMode,
      ...(form.commuteMiles ? { commuteMiles: parseInt(form.commuteMiles, 10) } : {}),
      workAuthJson: {
        citizen: form.citizen,
        ...(form.visa ? { visa: form.visa } : {}),
        ...(form.clearance ? { clearance: form.clearance } : {}),
      },
      availabilityJson: {
        startDate: form.startDate,
        employmentType: form.employmentType,
        noticePeriod: parseInt(form.noticePeriod, 10) || 0,
      },
      ...(form.compMin && form.compMax
        ? {
            compJson: {
              min: parseInt(form.compMin, 10),
              max: parseInt(form.compMax, 10),
              currency: "USD",
              visible: form.compVisible,
            },
          }
        : {}),
      proofLinks: form.proofLinks.filter((l) => l.url && l.label),
      visibilityJson: {
        workAuth: form.visWorkAuth,
        compensation: form.visCompensation,
        contact: form.visContact,
        resume: form.visResume,
        booking: form.visBooking,
      },
    };

    if (isNew) {
      body.handle = form.handle;
    }

    const method = isNew ? "POST" : "PATCH";
    const response = await fetch("/api/profile", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess(isNew ? "Profile created." : "Profile saved.");
      if (isNew) {
        setIsNew(false);
        setTimeout(() => router.push("/candidate/dashboard"), 1200);
      }
    } else {
      setError(data.error ?? "Save failed.");
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">{isNew ? "Create profile" : "Edit profile"}</h1>
          <Link href="/candidate/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Handle (new only) */}
          {isNew && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Profile address</h2>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Handle <span className="text-zinc-400 font-normal">(letters, numbers, - and _ only)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">/p/</span>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => set("handle", e.target.value)}
                  pattern="^[a-zA-Z0-9_-]{3,30}$"
                  required
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="your-handle"
                />
              </div>
            </section>
          )}

          {/* Basic info */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Basic info</h2>

            <label className="block text-sm font-medium text-zinc-700 mb-1">Headline</label>
            <input
              type="text"
              maxLength={100}
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Senior software engineer"
            />

            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Roles <span className="text-zinc-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.roles}
              onChange={(e) => set("roles", e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Backend engineer, Platform, API"
            />
          </section>

          {/* Location */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Location</h2>

            <label className="block text-sm font-medium text-zinc-700 mb-2">Work preference</label>
            <div className="flex gap-4 mb-4">
              {["remote", "hybrid", "onsite"].map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="locationMode"
                    value={mode}
                    checked={form.locationMode === mode}
                    onChange={() => set("locationMode", mode)}
                  />
                  <span className="text-sm capitalize">{mode}</span>
                </label>
              ))}
            </div>

            {(form.locationMode === "hybrid" || form.locationMode === "onsite") && (
              <>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Max commute (miles)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commuteMiles}
                  onChange={(e) => set("commuteMiles", e.target.value)}
                  className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </>
            )}
          </section>

          {/* Work authorization */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Work authorization</h2>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.citizen}
                onChange={(e) => set("citizen", e.target.checked)}
              />
              <span className="text-sm">US citizen / permanent resident</span>
            </label>

            {!form.citizen && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Visa type</label>
                <input
                  type="text"
                  value={form.visa}
                  onChange={(e) => set("visa", e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="H1-B, OPT, etc."
                />
              </div>
            )}

            <label className="block text-sm font-medium text-zinc-700 mb-1">Security clearance (optional)</label>
            <input
              type="text"
              value={form.clearance}
              onChange={(e) => set("clearance", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="None, Secret, TS/SCI, etc."
            />
          </section>

          {/* Availability */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Availability</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Available from</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Employment type</label>
              <select
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="full-time">Full-time</option>
                <option value="contract">Contract</option>
                <option value="part-time">Part-time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Notice period (days)</label>
              <input
                type="number"
                min={0}
                max={90}
                value={form.noticePeriod}
                onChange={(e) => set("noticePeriod", e.target.value)}
                className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </section>

          {/* Compensation */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Compensation (optional)</h2>
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Min (USD/year)</label>
                <input
                  type="number"
                  min={0}
                  value={form.compMin}
                  onChange={(e) => set("compMin", e.target.value)}
                  className="w-36 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="100000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Max (USD/year)</label>
                <input
                  type="number"
                  min={0}
                  value={form.compMax}
                  onChange={(e) => set("compMax", e.target.value)}
                  className="w-36 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="150000"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.compVisible}
                onChange={(e) => set("compVisible", e.target.checked)}
              />
              <span className="text-sm">Show on public profile</span>
            </label>
          </section>

          {/* Proof links */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Proof links</h2>
              <button
                type="button"
                onClick={addProofLink}
                className="text-sm text-zinc-500 hover:text-zinc-800"
              >
                + Add link
              </button>
            </div>
            {form.proofLinks.length === 0 && (
              <p className="text-sm text-zinc-500">No links added.</p>
            )}
            {form.proofLinks.map((link, i) => (
              <div key={i} className="mb-4 grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateProofLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateProofLink(i, "label", e.target.value)}
                  placeholder="Label"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => removeProofLink(i)}
                  className="text-sm text-red-500 hover:text-red-700 mt-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </section>

          {/* Visibility controls */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold">Visibility</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Control what appears on your public profile. You decide what recruiters see.
            </p>
            <div className="space-y-3">
              {[
                { key: "visWorkAuth" as const, label: "Show work authorization" },
                { key: "visCompensation" as const, label: "Show compensation range" },
                { key: "visContact" as const, label: "Show contact section" },
                { key: "visResume" as const, label: "Allow resume download" },
                { key: "visBooking" as const, label: "Enable booking" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Feedback */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : isNew ? "Create profile" : "Save changes"}
            </button>
            <Link
              href="/candidate/dashboard"
              className="rounded-md border border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
