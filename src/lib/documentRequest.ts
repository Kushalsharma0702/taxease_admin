// Message sent to the client when an admin asks again for a document the client marked "not available".
export function unavailableRequestMessage(docName: string, note?: string): string {
  const extra = (note || '').trim();
  const base = `You marked "${docName}" as not available. Please upload it in the app if you can find it.`;
  return extra ? `${base} ${extra}` : base;
}
