/** The words an invite carries, in the link preview, on the invite page and in the message you send. */
export function inviteHeadline(firstName: string | null): string {
  return firstName ? `${firstName} is inviting you to pray together` : "You're invited to pray together";
}

export function inviteMessage(firstName: string | null, title: string, link: string): string {
  return `${inviteHeadline(firstName)} on "${title}". Join here: ${link}`;
}
