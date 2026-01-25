export default function VerifyRequest() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(520px 360px at 22% 18%, rgba(56, 189, 248, 0.1), transparent 65%)",
        }}
        aria-hidden="true"
      />
      <img
        src="/hero/dot.png"
        alt=""
        className="pointer-events-none absolute left-8 top-10 h-14 w-14 opacity-20 sm:left-12 sm:top-12"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <div className="w-full max-w-xl pb-16 pt-24">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Check your email</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-200">
            We sent a link to continue. It expires in 15 minutes.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            If you did not request this, you can ignore the email.
          </p>
        </div>
      </div>
    </div>
  );
}
