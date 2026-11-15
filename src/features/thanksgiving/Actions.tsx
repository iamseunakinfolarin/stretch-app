"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { deleteCategory, deleteThanksgiving } from "./mutations";

/** A quiet Delete with a confirmation, for a thanksgiving (on its edit page) or a category (on its page). */
export function DeleteAction({ kind, id, name }: { kind: "thanksgiving" | "category"; id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCategory = kind === "category";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await (isCategory ? deleteCategory(id) : deleteThanksgiving(id));
      router.replace("/thanksgiving");
      router.refresh();
    } catch (cause) {
      setError(dataErrorMessage(cause));
      setOpen(false);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <Button variant="quiet-danger" onClick={() => setOpen(true)} disabled={busy}>
        {isCategory ? "Delete category" : "Delete thanksgiving"}
      </Button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title={isCategory ? "Delete this category?" : "Delete this thanksgiving?"}
        description={
          isCategory
            ? `"${name}" will be removed. Its thanksgivings are kept, with no category.`
            : `"${name}" will be removed for good. This can't be undone.`
        }
        confirmLabel={busy ? "Deleting…" : isCategory ? "Delete category" : "Delete thanksgiving"}
        cancelLabel="Keep it"
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
