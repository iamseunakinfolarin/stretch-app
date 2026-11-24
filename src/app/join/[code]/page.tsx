import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { EmptyState } from "@/features/prayers/EmptyState";
import { inviteHeadline } from "@/features/prayers/invite-words";
import { JoinButton } from "@/features/prayers/JoinButton";
import { KindChip } from "@/features/prayers/PrayerBits";
import { previewInvite } from "@/features/prayers/queries";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ code: string }> };

// What a link preview (iMessage, WhatsApp) shows: who is inviting, and to what. Nothing else.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const invite = await previewInvite(code);
  if (!invite || invite.archived) return { title: "Join a prayer" };
  const title = inviteHeadline(invite.ownerFirstName);
  const description = `on "${invite.title}". Join on Stretch.`;
  return { title: { absolute: title }, description, openGraph: { title, description, siteName: "Stretch", type: "website" } };
}

/** Where an invite link lands, for anyone: who is inviting you, to what, and how to join. */
export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();
  const [invite, { data: claims }] = await Promise.all([previewInvite(code), supabase.auth.getClaims()]);
  const signedIn = Boolean(claims?.claims?.sub);
  // Signed in but not named yet (just signed up): name yourself first. The invite is remembered and comes back.
  if (signedIn && !(await getCurrentProfile()).displayName) redirect("/welcome");
  const home = (
    <Link href="/" className={buttonClass("secondary")}>
      {signedIn ? "Back to home" : "Go to Stretch"}
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
      <p className="eyebrow text-primary">{inviteHeadline(invite.ownerFirstName)}</p>
      <div className="mt-3">
        <KindChip kind={invite.kind} />
      </div>
      <h1 className="mt-3 text-title font-bold break-words text-forest">{invite.title}</h1>
      <p className="mt-3 text-muted">
        {invite.alreadyMember
          ? `You're already in this ${noun}.`
          : "Join to see its prayer points and scriptures, pray together, and add your hours to the group's."}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {signedIn ? (
          <>
            <JoinButton code={code.toUpperCase()} label={invite.alreadyMember ? `Open this ${noun}` : `Join this ${noun}`} />
            {home}
          </>
        ) : (
          <>
            <Link href="/sign-up" className={buttonClass("primary")}>
              Sign up to join
            </Link>
            <Link href="/sign-in" className={buttonClass("secondary")}>
              I already have an account
            </Link>
            <p className="text-center text-caption text-muted">After signing in you&apos;ll come straight back here.</p>
          </>
        )}
      </div>
    </div>
  );
}
