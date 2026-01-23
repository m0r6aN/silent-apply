import { ArrowRight, CheckCircle, MessageSquare, Calendar, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-900">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-12 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Shield className="w-4 h-4" />
            <span>SilentApply AI</span>
            <span className="text-zinc-400 dark:text-zinc-500">•</span>
            <span>Powered by OMEGA</span>
            <span className="text-zinc-400 dark:text-zinc-500">•</span>
            <span>Governed by Keon</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-zinc-900 dark:text-white">
            Win Interviews,
            <span className="block text-blue-600 dark:text-blue-400">Not Email Chains</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transform your job search from endless back-and-forth to a single, powerful link.
            Your recruiter FAQ + Proof Pack that answers questions instantly and books calls without friction.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Create Your Recruiter FAQ + Proof Pack
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg transition-colors duration-200"
            >
              How It Works
            </Link>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-900 dark:text-white">
            From 10 Emails to 1 Link
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            SilentApply gives recruiters instant answers to their most common questions
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Recruiter FAQ</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Answer common questions about work authorization, compensation, availability, and location preferences once.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Work authorization status
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Compensation expectations
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Start date & availability
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Proof Pack</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Showcase your resume, GitHub, LinkedIn, portfolio, and certifications in one organized view.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Resume download (signed link)
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                GitHub & portfolio links
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Certifications & awards
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Book a Call</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Let recruiters schedule interviews directly without the back-and-forth. Integrated calendar with availability.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Available time slots
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Auto-confirmation emails
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Calendar integration
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join professionals who are winning interviews with SilentApply AI.
            Create your page in under 10 minutes.
          </p>
          <Link 
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors duration-200"
          >
            Start Your Silent Application
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="mt-8 text-sm text-blue-200">
            <p>SilentApply AI • Powered by OMEGA • Governed by Keon</p>
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-zinc-900 dark:text-white">SilentApply AI</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Recruiter FAQ + Proof Pack for modern job seekers
            </p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p>© 2026 SilentApply AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
