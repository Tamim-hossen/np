'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#e8e8ea] px-6 text-center font-sans text-neutral-900">
        <h2 className="mb-4 text-3xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="mb-6 max-w-md text-sm text-neutral-600">
          The application encountered a critical error.
          {error?.digest && (
            <span className="mt-2 block font-mono text-xs text-neutral-400">
              Error digest: {error.digest}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
