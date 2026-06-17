import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { MapPin, Shield, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { logProfileViewed } from '@/lib/observability';
import { generateCorrelationId } from '@/lib/correlation';
import QASection from './QASection';
import BookingSection from './BookingSection';

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string }>;
};

const resumeInclude = {
  resumes: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
};

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { preview } = await searchParams;

  // Preview mode: the owning candidate can view an unpublished profile.
  let previewMode = false;
  let profile = null;

  if (preview === 'true') {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const candidate = await prisma.profile.findUnique({
        where: { handle },
        include: resumeInclude,
      });
      if (candidate && candidate.userId === session.user.id) {
        profile = candidate;
        previewMode = true;
      }
    }
  }

  if (!profile) {
    profile = await prisma.profile.findUnique({
      where: { handle, published: true },
      include: resumeInclude,
    });
  }

  if (!profile) {
    notFound();
  }

  type WorkAuth = { citizen?: boolean; visa?: string; clearance?: string };
  type Availability = { startDate?: string; employmentType?: string; noticePeriod?: number };
  type Compensation = { min?: number; max?: number; currency?: string; visible?: boolean };
  type Visibility = { workAuth?: boolean; compensation?: boolean; resume?: boolean; booking?: boolean };
  type ProofLink = { url: string; label: string; type?: string };

  const workAuth = (profile.workAuthJson ?? {}) as WorkAuth;
  const availability = (profile.availabilityJson ?? {}) as Availability;
  const compensation = (profile.compJson ?? null) as Compensation | null;
  const visibility = (profile.visibilityJson ?? {}) as Visibility;
  const proofLinks = (profile.proofLinks ?? []) as ProofLink[];

  // Don't record a view when the owner is previewing their own draft.
  if (!previewMode) {
    const correlationId = generateCorrelationId();
    logProfileViewed(profile.id, correlationId).catch(() => {});
  }

  const locationLabels: Record<string, string> = {
    remote: 'Remote',
    hybrid: profile.commuteMiles ? `Hybrid — within ${profile.commuteMiles} miles` : 'Hybrid',
    onsite: profile.commuteMiles ? `Onsite — within ${profile.commuteMiles} miles` : 'Onsite',
  };
  const locationLabel = locationLabels[profile.locationMode] ?? profile.locationMode;

  const resumeEnabled = visibility.resume === true && profile.resumes.length > 0;
  const bookingEnabled = visibility.booking === true;
  const showWorkAuth = visibility.workAuth === true;
  const showComp = visibility.compensation === true;

  return (
    <div className="min-h-screen bg-white">
      {previewMode && (
        <div className="bg-zinc-900 px-4 py-3 text-center text-sm text-white">
          This is a preview. Your profile is not yet published.
        </div>
      )}
      {/* Above the fold */}
      <div className="border-b border-zinc-100 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {profile.headline && (
            <h1 className="text-3xl font-semibold text-zinc-900 mb-3">
              {profile.headline}
            </h1>
          )}

          {profile.roles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.roles.map((role: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700"
                >
                  {role}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <MapPin className="h-4 w-4 text-zinc-400" />
            <span>{locationLabel}</span>
          </div>

          {availability.employmentType && (
            <p className="mt-2 text-sm text-zinc-600">
              {availability.employmentType.replace(/-/g, ' ')}
              {availability.startDate ? ` · available ${availability.startDate}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Below the fold */}
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">

        {/* Work authorization */}
        {showWorkAuth && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-800 flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-400" />
              Work authorization
            </h2>
            <div className="space-y-1 text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>{workAuth.citizen ? 'US citizen / permanent resident' : 'Visa required'}</span>
              </div>
              {workAuth.visa ? (
                <p className="pl-6 text-zinc-600">Visa: {workAuth.visa}</p>
              ) : null}
              {workAuth.clearance ? (
                <p className="pl-6 text-zinc-600">Clearance: {workAuth.clearance}</p>
              ) : null}
            </div>
          </section>
        )}

        {/* Compensation */}
        {showComp && compensation?.visible ? (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-800">Compensation</h2>
            <p className="text-sm text-zinc-700">
              {compensation.currency ?? 'USD'}{' '}
              {typeof compensation.min === 'number' ? compensation.min.toLocaleString() : '?'}–
              {typeof compensation.max === 'number' ? compensation.max.toLocaleString() : '?'}{' '}
              annually
            </p>
          </section>
        ) : null}

        {/* Proof links */}
        {proofLinks.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-800">Work and proof</h2>
            <ul className="space-y-2">
              {proofLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900"
                  >
                    <ExternalLink className="h-4 w-4 text-zinc-400 shrink-0" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resume download */}
        {resumeEnabled && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-800">Resume</h2>
            <a
              href={`/api/resume/public?id=${profile.resumes[0].id}`}
              className="inline-flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900"
            >
              <Download className="h-4 w-4 text-zinc-400" />
              Download resume
            </a>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {new Date(profile.resumes[0].createdAt).toLocaleDateString()}
            </p>
          </section>
        )}

        {/* Recruiter Q&A */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-800">Questions</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Questions are answered from profile and resume data only.
          </p>
          <QASection profileHandle={handle} />
        </section>

        {/* Booking */}
        {bookingEnabled && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-800">Schedule a conversation</h2>
            <BookingSection profileHandle={handle} />
          </section>
        )}

      </div>

      <footer className="border-t border-zinc-100 px-4 py-6 text-center text-xs text-zinc-400">
        SilentApply
      </footer>
    </div>
  );
}
