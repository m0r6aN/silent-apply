export default function VerifyRequest() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900">Check your email</h1>
        <p className="mb-6 text-zinc-600">
          A sign in link has been sent to your email address. Click the link to sign in to your account.
        </p>
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            If you don't see the email, check your spam folder or try signing in again.
          </p>
        </div>
      </div>
    </div>
  );
}
