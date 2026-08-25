const INVITE =
  /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/(?:joinchat\/|\+)([\w-]+)/i;
const USER_URL = /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/([\w\d_]+)/i;

export function parseTelegramLink(
  input: string,
):
  | { kind: "invite"; hash: string }
  | { kind: "username"; username: string }
  | { kind: "query"; query: string } {
  const s = input.trim();
  const invite = INVITE.exec(s);
  if (invite) return { kind: "invite", hash: invite[1]! };
  if (s.startsWith("@") && s.length > 1) {
    return { kind: "username", username: s.slice(1) };
  }
  const user = USER_URL.exec(s);
  if (user && !["joinchat", "s", "addstickers"].includes(user[1]!.toLowerCase())) {
    return { kind: "username", username: user[1]! };
  }
  return { kind: "query", query: s };
}
