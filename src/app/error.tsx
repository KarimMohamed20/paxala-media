"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging / monitoring.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-white/60 mt-2">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-block mt-6 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
