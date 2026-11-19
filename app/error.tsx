'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e8e8ea] px-6 text-center text-neutral-900">
      <h2 className="mb-4 text-3xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="mb-6 max-w-md text-sm text-neutral-600">
        An unexpected error occurred while loading this page.
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
    </div>
  );
}
