// Turns errors from Supabase into words a person can act on.

type ErrorLike = { code?: string | null; message?: string | null; status?: number | null; name?: string | null };

const OFFLINE = "Can't reach Stretch right now. Check your connection and try again.";
const FALLBACK = "Something went wrong. Please try again.";

function isNetworkError(error: ErrorLike): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

/** A friendly message for an error from sign-in or sign-up. */
export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return FALLBACK;
  const e = error as ErrorLike;
  if (isNetworkError(e)) return OFFLINE;

  const message = (e.message ?? "").toLowerCase();
  switch (e.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with this email. Sign in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "email_address_invalid":
    case "validation_failed":
      return "That email address can't be used. Check it and try again.";
    case "signup_disabled":
      return "New accounts are switched off at the moment.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many tries. Wait a minute, then try again.";
    case "email_not_confirmed":
    case "email_address_not_authorized":
      return "This account is waiting for email confirmation, which isn't set up yet. Ask the person who invited you.";
  }
  if (message.includes("invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (message.includes("already registered")) {
    return "There's already an account with this email. Sign in instead.";
  }
  return FALLBACK;
}

/** A friendly message for an error from reading or saving data. */
export function dataErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return FALLBACK;
  const e = error as ErrorLike;
  if (isNetworkError(e)) return OFFLINE;
  if (e.code === "23514") return "That value isn't allowed. Check it and try again.";
  if (e.code === "22023") return "That's more than a prayer can hold: up to 20 prayer points and 10 key scriptures.";
  if (e.code === "28000") return "You need to sign in again to do that.";
  if (e.code === "42501") return "You can't change this. It may belong to someone else, or you may need to sign in again.";
  return FALLBACK;
}
