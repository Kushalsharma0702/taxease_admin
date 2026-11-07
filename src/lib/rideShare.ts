/**
 * Ride-share / delivery income by service.
 *
 * The app saves each service's income next to its statement upload, in the "uploaded documents" map as
 * uber_income_<service> (e.g. uber_income_uber_ride = "36658"). Shared by the admin screen and the PDF
 * export so both always list the same services and amounts.
 */
export const rideShareServiceLabel = (key: string): string =>
  key.split(/[_-]+/).filter(Boolean)
    .map((w) => (w.toLowerCase() === 'doordash' ? 'DoorDash' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

export const getRideShareIncomes = (uploaded: Record<string, unknown> | undefined | null) =>
  Object.entries(uploaded || {})
    .filter(([k, v]) => k.startsWith('uber_income_') && v !== '' && v !== null && v !== undefined && !isNaN(Number(v)))
    .map(([k, v]) => ({ key: k, label: rideShareServiceLabel(k.slice('uber_income_'.length)), amount: Number(v) }));
