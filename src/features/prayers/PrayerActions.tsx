"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { archivePrayer, deletePrayer, reactivatePrayer } from "./mutations";
import type { PrayerKind } from "./types";

type Props = { id: string; title: string; kind: PrayerKind; archived: boolean };

/** Edit, Archive or Reactivate, and Delete, for the owner of a prayer. */
export function PrayerActions({ id, title, kind, archived }: Props) {
  const router = useRouter();
  const [working, setWorking] = useState<"archive" | "reactivate" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "altar" ? "altar" : "prayer";

  async function run(action: "archive" | "reactivate" | "delete", work: () => Promise<void>, then: () => void) {
    setWorking(action);
    setError(null);
    try {
      await work();
      then();
    } catch (cause) {
      setError(dataErrorMessage(cause));
      setConfirmingDelete(false);
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      {archived ? (
        <Button
          busy={working === "reactivate"}
          busyLabel="Reactivating…"
          disabled={working !== null}
          onClick={() => run("reactivate", () => reactivatePrayer(id), () => router.refresh())}
        >
          Reactivate
        </Button>
      ) : (
        <>
          <Link href={`/prayers/${id}/edit`} className={buttonClass("primary")}>
            Edit
          </Link>
          <Button
            variant="secondary"
            busy={working === "archive"}
            busyLabel="Archiving…"
            disabled={working !== null}
            onClick={() => run("archive", () => archivePrayer(id), () => router.refresh())}
          >
            Archive
          </Button>
        </>
      )}
      <Button variant="quiet-danger" disabled={working !== null} onClick={() => setConfirmingDelete(true)}>
        Delete
      </Button>

      <ConfirmDialog
        open={confirmingDelete}
        tone="danger"
        title={`Delete this ${noun}?`}
        description={`"${title}" will be removed for good, with its prayer points, key scriptures, notes and the hours prayed. This can't be undone.`}
        confirmLabel={working === "delete" ? "Deleting…" : `Delete ${noun}`}
        cancelLabel={`Keep ${noun}`}
        busy={working === "delete"}
        onConfirm={() =>
          run("delete", () => deletePrayer(id), () => {
            router.replace("/prayers");
            router.refresh();
          })
        }
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
