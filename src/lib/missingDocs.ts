// Which required documents a section should flag as "Missing".
//
// A section the client answered No / Not Applicable to cannot be missing anything: it must not list its
// required documents as missing (they were never asked for). Once anything has landed in a section (an upload,
// or a "not available" mark) its required documents count as handled, because the client's file names rarely
// match the requirement text, so guessing per name gave false "Missing" flags.
export function requiredDocsToFlag(opts: {
  applicable: boolean;
  required: string[];
  uploadedCount: number;
  unavailableCount: number;
}): string[] {
  if (!opts.applicable) return [];
  if (opts.uploadedCount > 0 || opts.unavailableCount > 0) return [];
  return opts.required;
}
