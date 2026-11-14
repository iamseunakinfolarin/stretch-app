"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/Button";

/** Shown when a screen fails to load. Never shows the raw error to the person. */
export default function ErrorScreen({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-safe pt-safe pb-safe text-center">
      <p className="eyebrow text-danger">Something went wrong</p>
      <h1 className="mt-2 text-title font-bold text-forest">That didn&apos;t load</h1>
      <p className="mx-auto mt-3 max-w-xs text-muted">Check your connection, then try again. Nothing you saved has been lost.</p>
      <Button className="mt-8" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
