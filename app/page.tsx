import { ArrowRight, CheckCircle, MessageSquare, Calendar, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
});

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header
        className="relative w-full min-h-[70vh] overflow-hidden bg-zinc-950 text-white md:min-h-[80vh]"
        style={{
          backgroundImage: "url('/hero/homepage_hero.jpeg')",
          backgroundSize: '100% auto',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" aria-hidden="true" />
        <img
          src="/hero/dot.png"
          alt=""
          className="absolute left-6 top-10 h-14 w-14 opacity-60 sm:left-10 sm:top-16 sm:h-16 sm:w-16"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-32">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.21em] text-white/70">
              SilentApply AI
            </p>
            <h1 className={`${playfair.className} mt-4 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl`}>
              Your job search, already handled.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-zinc-200 sm:text-xl">
              One quiet profile link that answers recruiter questions, shares proof, and books interviews — without the
              back-and-forth.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 transition-colors duration-200 hover:border-white/60 hover:text-white"
              >
                Create your link
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/60">
              Takes about 10 minutes
            </p>
          </div>
          <div className="hidden md:block" aria-hidden="true" />
        </div>
      </header>
      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <img
            src="/hero/signal.png"
            alt=""
            className="w-full opacity-25"
            aria-hidden="true"
          />
        </div>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-24 text-zinc-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-900">
            From 10 Emails to 1 Link
          </h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            SilentApply gives recruiters clear answers in one place — so conversations move forward without repetition.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-8 rounded-2xl border border-zinc-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900">Recruiter FAQ</h3>
            <p className="text-zinc-600 mb-4">
              Answer work authorization, compensation, availability, and location preferences — once.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Work authorization status
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Compensation expectations
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Start date & availability
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-zinc-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900">Proof Pack</h3>
            <p className="text-zinc-600 mb-4">
              Showcase your resume, GitHub, LinkedIn, portfolio, and certifications in one organized view.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Resume download (signed link)
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                GitHub & portfolio links
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Certifications & awards
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-zinc-200">
            <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-zinc-700" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900">Book a Call</h3>
            <p className="text-zinc-600 mb-4">
              Let recruiters schedule interviews directly without the back-and-forth. Integrated calendar with availability.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Available time slots
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Auto-confirmation emails
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Calendar integration
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-zinc-900">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Set it up once. Use it everywhere.
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Create your SilentApply link in under 10 minutes. Share it whenever a recruiter asks.
          </p>
          <Link 
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors duration-200"
          >
            Create your link
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
    </div>
  );
}
