import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { EmptyState } from "@/features/prayers/EmptyState";
import { JoinButton } from "@/features/prayers/JoinButton";
import { KindChip } from "@/features/prayers/PrayerBits";
import { previewInvite } from "@/features/prayers/queries";

export const metadata: Metadata = { title: "Join a prayer" };

/** Where an invite link lands: who invited you, to what, and a Join button. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await previewInvite(code);
  const home = (
    <Link href="/" className={buttonClass("secondary")}>
      Back to home
    </Link>
  );

  if (!invite) {
    return (
      <div className="mt-10">
        <EmptyState title="This invite link doesn't work" action={home}>
          It may have been replaced with a new one. Ask the person who sent it for a fresh link.
        </EmptyState>
      </div>
    );
  }
  if (invite.archived) {
    return (
      <div className="mt-10">
        <EmptyState title="This prayer has been set aside" action={home}>
          &ldquo;{invite.title}&rdquo; has been archived, so it can&apos;t be joined right now.
        </EmptyState>
      </div>
    );
  }

  const noun = invite.kind === "altar" ? "altar" : "prayer";
  return (
    <div className="mt-8 flex flex-col">
      <p className="eyebrow text-primary">{invite.ownerFirstName ? `${invite.ownerFirstName} invited you to pray` : "You're invited to pray"}</p>
      <div className="mt-3">
        <KindChip kind={invite.kind} />
      </div>
      <h1 className="mt-3 text-title font-bold break-words text-forest">{invite.title}</h1>
      <p className="mt-3 text-muted">
        {invite.alreadyMember
          ? `You're already in this ${noun}.`
          : `Join to see its prayer points and scriptures, pray together, and add your hours to the group's.`}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <JoinButton code={code.toUpperCase()} label={invite.alreadyMember ? `Open this ${noun}` : `Join this ${noun}`} />
        {home}
      </div>
    </div>
  );
}
