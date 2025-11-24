export default function SuccessPage() {
  return (
    <div className="flex h-svh items-center justify-center bg-primary p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-600/10 p-3">
          <svg
            aria-hidden
            className="h-full w-full text-green-600"
            viewBox="0 0 24 24"
          >
            <title>Success</title>
            <path
              d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 className="font-semibold text-xl">
          Your application has been sent.
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          We'll be in touch after review. You can close this window now.
        </p>
      </div>
    </div>
  );
}
