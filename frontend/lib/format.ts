import { ApiErrorCode } from './types';

/**
 * Formats a hex address to shortened form (e.g. 0x71C...8A2).
 * Never mutates original address.
 */
export function formatAddress(address: string, startChars = 5, endChars = 4): string {
  if (!address || typeof address !== 'string') return '';
  const trimmed = address.trim();
  if (trimmed.length <= startChars + endChars + 2) return trimmed;
  return `${trimmed.slice(0, startChars)}...${trimmed.slice(-endChars)}`;
}

/**
 * Validates basic Ethereum / Base address format: 0x followed by 40 hex characters.
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Formats a decimal amount string provided by backend.
 * Avoids floating-point precision hazards.
 */
export function formatAmount(amountStr: string | number | undefined | null, unit = 'ETH'): string {
  if (amountStr === undefined || amountStr === null || amountStr === '') return `0 ${unit}`;
  const str = String(amountStr).trim();
  
  // If it's pure decimal string (e.g. "14.8524")
  const num = parseFloat(str);
  if (isNaN(num)) return `${str} ${unit}`;

  if (num >= 10000) {
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit}`;
  }
  if (num >= 1) {
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${unit}`;
  }
  if (num > 0) {
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${unit}`;
  }
  return `0 ${unit}`;
}

/**
 * Formats standard number with comma grouping.
 */
export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, ''), 10);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-US');
}

/**
 * Formats an ISO 8601 UTC date string into an editorial date (e.g., "August 14").
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  // If backend already provided a friendly string e.g. "August 14"
  if (/^[A-Za-z]+ \d{1,2}/.test(dateString)) {
    return dateString;
  }
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats a decimal fraction (0.64) into percentage string ("64%").
 */
export function formatPercent(fraction: number | string | undefined | null): string {
  if (fraction === undefined || fraction === null) return '0%';
  const num = typeof fraction === 'number' ? fraction : parseFloat(String(fraction));
  if (isNaN(num)) return '0%';
  const pct = num > 1 ? num : num * 100;
  return `${Math.round(pct)}%`;
}

/**
 * Formats hour of day (0-23) into 12-hour format e.g. "2 AM".
 */
export function formatHour(hour: number): string {
  if (typeof hour !== 'number' || isNaN(hour)) return 'N/A';
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return '12 AM';
  if (normalized === 12) return '12 PM';
  if (normalized < 12) return `${normalized} AM`;
  return `${normalized - 12} PM`;
}

/**
 * Formats day of week (0=Sunday or string "Friday") into friendly string.
 */
export function formatDayOfWeek(day: string | number): string {
  if (typeof day === 'string' && isNaN(Number(day))) {
    return day;
  }
  const dayNum = Number(day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum % 7] || 'Friday';
}

/**
 * Maps documented backend error codes to user-friendly messages.
 * Never exposes raw internal errors or stack traces.
 */
export function getFriendlyErrorMessage(code: ApiErrorCode | string, fallback?: string): string {
  switch (code) {
    case 'INVALID_WALLET':
      return "That doesn't look like a valid Base wallet. Check the address and try again.";
    case 'INVALID_RANGE':
      return 'The selected timeframe is not supported. Please choose a valid range.';
    case 'PROVIDER_ERROR':
      return "We couldn't reach the onchain data right now. Give it another try.";
    case 'RATE_LIMITED':
      return 'The blockchain data provider is taking a breather. Try again in a moment.';
    case 'DATA_UNAVAILABLE':
      return 'No transaction history was found for this wallet in the selected period.';
    case 'CONFIG_ERROR':
      return 'Configuration issue on the server. Please check back shortly.';
    case 'ANALYSIS_ERROR':
      return "Unable to analyze this wallet's activity patterns. Give it another shot.";
    case 'INTERNAL_ERROR':
    default:
      return fallback || 'Something went sideways while building your Wrapped. Try again.';
  }
}
