import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Calendar, MapPin, DollarSign, Shield, CheckCircle, ExternalLink, MessageSquare, Download } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  
  const profile = await prisma.profile.findUnique({
    where: { 
      handle,
      published: true,
    },
    include: {
      resumes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const workAuth = profile.workAuthJson as any;
  const availability = profile.availabilityJson as any;
  const compensation = profile.compJson as any;
  const visibility = profile.visibilityJson as any;
  const proofLinks = profile.proofLinks as any[];
  const workAuthStatus =
    workAuth?.citizen === true ? 'Citizen' : workAuth?.citizen === false ? 'Visa Required' : 'Not shared';
  const hasWorkAuthStatus = workAuth?.citizen === true || workAuth?.citizen === false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-zinc-900 dark:text-white">SilentApply</span>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Quiet link
          </div>
        </div>
      </header>

      {/* Profile Hero */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-zinc-900 dark:text-white">
              {profile.headline || 'Professional Profile'}
            </h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {profile.roles.map((role: string, index: number) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Location & Availability */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                <MapPin className="w-5 h-5" />
                Location & Availability
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Work Preference</div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {profile.locationMode.charAt(0).toUpperCase() + profile.locationMode.slice(1)}
                    {profile.commuteMiles && ` (within ${profile.commuteMiles} miles)`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Start Date</div>
                  <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {availability?.startDate || 'Not shared'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Employment Type</div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {availability?.employmentType
                      ? availability.employmentType.replace('-', ' ').toUpperCase()
                      : 'Not shared'}
                  </div>
                </div>
              </div>
            </div>

            {/* Work Authorization */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                <Shield className="w-5 h-5" />
                Work Authorization
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Citizenship Status</div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {workAuthStatus}
                    </div>
                  </div>
                  {hasWorkAuthStatus && <CheckCircle className="w-6 h-6 text-green-500" />}
                </div>
                {workAuth?.visa && (
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Visa Type</div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {workAuth.visa}
                    </div>
                  </div>
                )}
                {workAuth?.clearance && (
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Security Clearance</div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {workAuth.clearance}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compensation */}
            {compensation?.visible && (
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                  <DollarSign className="w-5 h-5" />
                  Compensation Expectations
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Range</div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {compensation.currency} {compensation.min.toLocaleString()} - {compensation.max.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Annual salary expectations
                  </div>
                </div>
              </div>
            )}

            {/* Resume Download */}
            {profile.resumes.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Download className="w-5 h-5" />
                  Resume
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Latest Resume</div>
                    <a 
                      href={`/api/resume/download/${profile.resumes[0].id}`}
                      className="inline-flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Download Resume
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Updated {new Date(profile.resumes[0].createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Proof Links */}
          {proofLinks.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-white">Proof Links</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {proofLinks.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-white mb-1">
                          {link.label}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                          {link.url.replace(/^https?:\/\//, '')}
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Coordination
            </h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              If enabled by the candidate, you can ask a question or request a time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors duration-200">
                <MessageSquare className="w-5 h-5" />
                Ask a question
              </button>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-colors duration-200">
                <Calendar className="w-5 h-5" />
                Request a time
              </button>
            </div>
            <div className="mt-6 text-sm text-blue-200">
              <p>Questions are answered from shared profile details.</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <p>This page answers common recruiter questions to reduce email back-and-forth.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
