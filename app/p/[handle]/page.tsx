import { notFound } from "next/navigation";
import Link from "next/link";

type PublicProfile = {
  id: string;
  handle: string;
  headline: string | null;
  roles: string[];
  locationMode: string;
  commuteMiles?: number;
  workAuth?: Record<string, any>;
  availability: Record<string, any>;
  comp?: Record<string, any>;
  proofLinks: Record<string, any>[];
  updatedAt: string;
  resume: {
    fileUrl: string;
    createdAt: string;
  } | null;
};

type PageProps = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/profile/${handle}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const profile: PublicProfile = await response.json();

    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-zinc-900">
                  {profile.headline || "Candidate Profile"}
                </h1>
                <p className="mt-2 text-lg text-zinc-600">
                  silentapply.ai/{profile.handle}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 px-4 py-2">
                <span className="text-sm font-medium text-blue-700">
                  Updated {new Date(profile.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Roles */}
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-zinc-900">Target Roles</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </section>

              {/* Location & Availability */}
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-zinc-900">Location & Availability</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <h3 className="mb-2 text-sm font-medium text-zinc-500">Work Preference</h3>
                    <p className="text-lg font-medium capitalize text-zinc-900">
                      {profile.locationMode}
                      {profile.commuteMiles && ` (${profile.commuteMiles} mile commute)`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <h3 className="mb-2 text-sm font-medium text-zinc-500">Availability</h3>
                    <p className="text-lg font-medium text-zinc-900">
                      {profile.availability.fullTime ? "Full-time" : "Contract"}
                    </p>
                    <p className="text-sm text-zinc-600">
                      Start: {new Date(profile.availability.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </section>

              {/* Work Authorization */}
              {profile.workAuth && (
                <section className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-zinc-900">Work Authorization</h2>
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {Object.entries(profile.workAuth).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="mb-1 text-sm font-medium text-zinc-500 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className={`text-lg font-medium ${value ? 'text-green-600' : 'text-zinc-400'}`}>
                            {value ? "✓" : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Compensation */}
              {profile.comp && (
                <section className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-zinc-900">Compensation Range</h2>
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <p className="text-lg font-medium text-zinc-900">
                      {profile.comp.range || "Not specified"}
                    </p>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Proof Links */}
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-zinc-900">Proof Links</h2>
                <div className="space-y-3">
                  {profile.proofLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50"
                    >
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-blue-100">
                        <span className="text-sm font-medium text-blue-600">
                          {link.type?.charAt(0).toUpperCase() || "L"}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 capitalize">
                          {link.type || "Link"}
                        </div>
                        <div className="text-sm text-zinc-500 truncate">
                          {link.url.replace(/^https?:\/\//, '')}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              {/* Resume Download */}
              {profile.resume && (
                <section className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-zinc-900">Resume</h2>
                  <a
                    href={profile.resume.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">Download Resume</div>
                      <div className="text-sm text-zinc-500">
                        Updated {new Date(profile.resume.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-blue-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </a>
                </section>
              )}

              {/* Book a Call */}
              <section>
                <h2 className="mb-4 text-xl font-semibold text-zinc-900">Book a Call</h2>
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="mb-4 text-zinc-600">
                    Interested in this candidate? Book a call directly with them.
                  </p>
                  <Link
                    href={`/booking/${profile.handle}`}
                    className="block w-full rounded-md bg-green-600 px-4 py-3 text-center font-medium text-white hover:bg-green-700"
                  >
                    Schedule Interview
                  </Link>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 border-t border-zinc-200 pt-8 text-center">
            <p className="text-sm text-zinc-500">
              This profile was created with SilentApply — the recruiter FAQ + proof pack.
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Questions? Use the chat feature below.
            </p>
          </footer>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading profile:", error);
    notFound();
  }
}
