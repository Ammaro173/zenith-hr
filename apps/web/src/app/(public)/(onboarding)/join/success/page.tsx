export default function JoinSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-md space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Success</title>
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div>
          <h1 className="mb-2 font-bold text-2xl text-white">Thank You!</h1>
          <p className="text-slate-300">
            Your interest has been registered. We'll be in touch soon with more
            information about joining the Audi Members Club.
          </p>
        </div>
      </div>
    </div>
  );
}
