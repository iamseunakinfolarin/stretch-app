"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { useHydrated } from "@/lib/use-hydrated";
import { joinPrayer } from "./mutations";

/** Joins with the invite code, then opens the prayer. Also clears the reminder kept across sign-in. */
export function JoinButton({ code, label }: { code: string; label: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.cookie = "stretch_next=; path=/; max-age=0; samesite=lax";
  }, []);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const id = await joinPrayer(code);
      router.replace(`/prayers/${id}`);
      router.refresh();
    } catch (cause) {
      setError(dataErrorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <Button onClick={() => void join()} busy={busy} busyLabel="Joining…" disabled={!hydrated}>
        {label}
      </Button>
    </div>
  );
}
