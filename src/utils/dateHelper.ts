/**
 * Date utility functions for RFP Mart Analyzer
 */

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

/**
 * Parse various date formats commonly found in RFPs
 */
export function parseRFPDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  // Clean the date string
  const cleaned = dateStr.trim().replace(/[^\d\/\-\s:AMPMampm]/g, '');

  // Try different date formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM-DD-YYYY  
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      const [, first, second, third] = match;
      
      // Try different interpretations
      const attempts = [
        new Date(parseInt(third || '0'), parseInt(first || '0') - 1, parseInt(second || '0')), // MM/DD/YYYY
        new Date(parseInt(first || '0'), parseInt(second || '0') - 1, parseInt(third || '0')), // YYYY-MM-DD
        new Date(parseInt(third || '0'), parseInt(second || '0') - 1, parseInt(first || '0')), // DD/MM/YYYY
      ];

      for (const attempt of attempts) {
        if (!isNaN(attempt.getTime()) && attempt.getFullYear() > 2020 && attempt.getFullYear() < 2030) {
          return attempt;
        }
      }
    }
  }

  // Try parsing with built-in Date constructor
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020 && parsed.getFullYear() < 2030) {
      return parsed;
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return date > new Date();
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(date: Date, days: number): boolean {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return date <= futureDate && date >= new Date();
}

/**
 * Get days until a date
 */
export function getDaysUntil(date: Date): number {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if RFP is due soon (within 30 days)
 */
export function isDueSoon(dueDate: Date): boolean {
  return isWithinDays(dueDate, 30);
}

/**
 * Format date for file naming (YYYY-MM-DD)
 */
export function formatDateForFile(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

/**
 * Get timestamp for file naming
 */
export function getTimestamp(): string {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const datePart = now.split('T')[0];
  const timePart = now.split('T')[1]?.split('-')[0] || '';
  return datePart + '_' + timePart;
}

/**
 * Get the start of today
 */
export function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the start of yesterday
 */
export function getStartOfYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

/**
 * Check if a date string represents a recent posting (within last 7 days)
 */
export function isRecentPosting(dateStr: string): boolean {
  const date = parseRFPDate(dateStr);
  if (!date) return false;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return date >= weekAgo;
}

/**
 * Create a human-readable relative date string
 */
export function getRelativeDateString(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays <= 7) {
    return `In ${diffDays} days`;
  } else if (diffDays <= 30) {
    return `In ${Math.ceil(diffDays / 7)} weeks`;
  } else {
    return `In ${Math.ceil(diffDays / 30)} months`;
  }
}