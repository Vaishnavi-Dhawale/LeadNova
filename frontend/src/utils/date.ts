/**
 * Date formatting utilities with strict IST (Asia/Kolkata) timezone.
 */

function parseToUTCIfNeeded(dateInput: string | number | Date): Date {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If it's an ISO datetime string without an explicit timezone offset or Z,
    // it was stored in UTC by the backend database.
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
      return new Date(`${trimmed.replace(' ', 'T')}Z`);
    }
  }
  return new Date(dateInput);
}

export function formatISTDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = parseToUTCIfNeeded(dateInput);
    if (isNaN(d.getTime())) return '—';

    // Format: "27 Sept 2026, 08:44 PM IST"
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const formatted = formatter.format(d).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
    return `${formatted} IST`;
  } catch {
    return '—';
  }
}

export function formatISTDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = parseToUTCIfNeeded(dateInput);
    if (isNaN(d.getTime())) return '—';

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return formatter.format(d);
  } catch {
    return '—';
  }
}
