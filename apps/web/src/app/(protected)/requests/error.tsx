"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-100 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="mb-2 font-bold text-2xl tracking-tight">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-sm text-muted-foreground">
        We encountered an error while loading the manpower requests. Please try
        again.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          Go to Home
        </Button>
      </div>
    </div>
  );
}
