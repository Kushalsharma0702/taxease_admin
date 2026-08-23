import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency value to $ format (e.g., $1,234.56)
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date to dd-mm-yyyy format
 */
export function formatDate(value: Date | string | undefined | null): string {
  if (!value) return 'N/A';
  if (typeof value === 'string') {
    // Extract date parts directly from ISO string to avoid timezone conversion.
    // new Date("YYYY-MM-DD") is parsed as UTC, causing off-by-one in negative offsets.
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return 'N/A';
  }
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse date string in dd-mm-yyyy format
 */
export function parseDate(dateString: string): Date | null {
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}
