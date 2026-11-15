export const MAX_REQUEST_MESSAGE_LENGTH = 300;

export function normalizeParticipationRequestMessage(message: string) {
  const normalized = message.trim();
  if (normalized.length > MAX_REQUEST_MESSAGE_LENGTH) {
    throw new Error(`Il messaggio può contenere al massimo ${MAX_REQUEST_MESSAGE_LENGTH} caratteri.`);
  }
  return normalized || null;
}
