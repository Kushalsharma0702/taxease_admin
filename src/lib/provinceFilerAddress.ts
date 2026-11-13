// Q19 (Ontario/Quebec) property address. The app now stores it as separate parts
// (propertyStreet, propertyAptSuite, propertyCity, propertyProvince + postalCode) and still writes the one-line
// propertyAddress. Older drafts only have the one-line address, which is shown under Street so nothing is lost.
export interface ProvinceFilerAddress {
  street: string;
  aptSuite: string;
  city: string;
  province: string;
  postalCode: string;
}

const s = (v: unknown): string => (v == null ? '' : String(v).trim());

export function provinceFilerAddress(entry: Record<string, unknown> | null | undefined): ProvinceFilerAddress {
  const e = entry || {};
  const parts = {
    street: s(e.propertyStreet),
    aptSuite: s(e.propertyAptSuite),
    city: s(e.propertyCity),
    province: s(e.propertyProvince),
    postalCode: s(e.postalCode),
  };
  const hasParts = !!(parts.street || parts.aptSuite || parts.city || parts.province);
  return hasParts ? parts : { ...parts, street: s(e.propertyAddress) };
}
