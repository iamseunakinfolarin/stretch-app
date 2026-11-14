// Input checks shared by the sign-in, sign-up and name forms.
// Each returns a message to show, or null when the value is fine.

export const PASSWORD_MIN = 8;
/** Supabase hashes passwords with bcrypt, which ignores anything past 72 bytes. */
export const PASSWORD_MAX = 72;
/** Matches the database rule on profiles.display_name. */
export const DISPLAY_NAME_MAX = 40;

export function cleanEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = cleanEmail(value);
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That doesn't look like an email address.";
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return "Choose a password.";
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(value).length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  return null;
}

export function validatePassword(value: string): string | null {
  return value ? null : "Enter your password.";
}

export function cleanDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(value: string): string | null {
  const name = cleanDisplayName(value);
  if (!name) return "Enter a name.";
  if ([...name].length > DISPLAY_NAME_MAX) return `Use ${DISPLAY_NAME_MAX} characters or fewer.`;
  return null;
}
