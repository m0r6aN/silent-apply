"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
});

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/candidate/dashboard",
      });

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: "Check your email for a link to continue.",
        });
        setEmail("");
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(600px 420px at 20% 15%, rgba(56, 189, 248, 0.12), transparent 65%)",
        }}
        aria-hidden="true"
      />
      <img
        src="/hero/dot.png"
        alt=""
        className="pointer-events-none absolute left-8 top-10 h-14 w-14 opacity-25 sm:left-12 sm:top-12"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <div className="w-full max-w-xl pb-16 pt-24">
          <h1 className={`${playfair.className} text-4xl font-semibold text-white sm:text-5xl`}>
            Continue
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-200 sm:text-lg">
            Enter your email and we&apos;ll send you a link to continue.
            <span className="block text-zinc-400">No passwords. No noise.</span>
          </p>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-200">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-200/60 focus:outline-none focus:ring-1 focus:ring-cyan-200/30"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md border border-cyan-200/40 bg-cyan-200/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition-colors hover:bg-cyan-200/20 focus:outline-none focus:ring-2 focus:ring-cyan-200/40 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send link"}
              </button>
            </form>

            <p className="mt-3 text-xs text-zinc-400">Expires in 15 minutes.</p>

            {message && (
              <div
                className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                  message.type === "success"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-zinc-300 transition-colors hover:text-zinc-100">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-zinc-300 transition-colors hover:text-zinc-100">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
