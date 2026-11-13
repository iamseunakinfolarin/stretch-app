"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = { state: "checking" } | { state: "connected" } | { state: "error"; message: string };

/** Calls the ping() database function from the phone and reports the result. */
export function DatabaseStatus() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<Status> {
      try {
        const { data, error } = await createClient().rpc("ping");
        if (error) return { state: "error", message: error.message };
        if (data !== "ok") return { state: "error", message: "Unexpected reply from the database." };
        return { state: "connected" };
      } catch (cause) {
        return { state: "error", message: cause instanceof Error ? cause.message : "Could not reach the database." };
      }
    }

    void check().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dot =
    status.state === "connected" ? "bg-pine" : status.state === "error" ? "bg-danger" : "bg-hairline animate-pulse";

  return (
    <div role="status" className="flex items-start gap-3 rounded-card border border-hairline bg-surface p-4">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
      <div>
        {status.state === "checking" ? <p className="text-muted">Checking the database…</p> : null}
        {status.state === "connected" ? <p className="font-semibold text-ink">Database connected</p> : null}
        {status.state === "error" ? (
          <>
            <p className="font-semibold text-danger">Database not connected</p>
            <p className="mt-1 text-caption break-words text-muted">{status.message}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
