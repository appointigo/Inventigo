export type EmbeddedSignupEvent = { event: "FINISH" | "CANCEL" | "ERROR"; wabaId?: string; phoneNumberId?: string };

export function parseEmbeddedSignupMessage(origin: string, value: unknown): EmbeddedSignupEvent | null {
  if (!/^https:\/\/([a-z0-9-]+\.)*facebook\.com$/i.test(origin) || typeof value !== "string") return null;
  try {
    const message = JSON.parse(value) as { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string } };
    if (message.type !== "WA_EMBEDDED_SIGNUP" || !(["FINISH", "CANCEL", "ERROR"] as string[]).includes(message.event ?? "")) return null;
    return { event: message.event as EmbeddedSignupEvent["event"], wabaId: message.data?.waba_id, phoneNumberId: message.data?.phone_number_id };
  } catch { return null; }
}
