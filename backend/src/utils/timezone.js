/**
 * Timezone Utilities
 * 
 * Provides utilities for working with timezones in a Node.js environment
 * using the native Intl API (no external dependencies).
 */

/**
 * List of common IANA timezone identifiers
 * Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */
export const COMMON_TIMEZONES = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: 'UTC-7/-6' },
  { value: 'America/Phoenix', label: 'Arizona', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: 'UTC-10' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'Brasilia', offset: 'UTC-3' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3' },
  { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-4/-3' },
  
  // Europe
  { value: 'Europe/London', label: 'London', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Paris, Madrid, Berlin', offset: 'UTC+1/+2' },
  { value: 'Europe/Athens', label: 'Athens, Helsinki', offset: 'UTC+2/+3' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3' },
  
  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'UTC+5' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata', offset: 'UTC+5:30' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8' },
  
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne', offset: 'UTC+10/+11' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: 'UTC+10' },
  { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+8' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+12/+13' },
  
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2' },
  
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+0' }
];

/**
 * Validate if a timezone string is valid IANA timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean} True if valid
 */
export function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  
  try {
    // Test if timezone is valid by attempting to format a date with it
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current date/time in a specific timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {Date} Date object representing now in that timezone
 */
export function nowInTimezone(timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  
  // Get current time
  const now = new Date();
  
  // Return the same moment, timezone conversion is for display only
  return now;
}

/**
 * Convert a time string (HH:mm) in a specific timezone to a UTC Date object for today
 * @param {string} timeStr - Time in HH:mm format (e.g., '14:30')
 * @param {string} timezone - IANA timezone identifier
 * @returns {Date} UTC Date object for that time today in the given timezone
 */
export function timeInTimezoneToUTC(timeStr, timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  
  // Parse time string
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }
  
  // Get today's date in the target timezone
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }); // Returns YYYY-MM-DD
  
  // Create date string in timezone's local time
  const localDateTimeStr = `${dateStr}T${timeStr.padStart(5, '0')}:00`;
  
  // Parse as if it's in the target timezone (requires a workaround)
  // Create date assuming UTC, then adjust for timezone offset
  const utcDate = new Date(`${localDateTimeStr}Z`);
  
  // Get the offset between UTC and the timezone at this moment
  const tzFormatted = utcDate.toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const utcFormatted = utcDate.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Calculate offset in milliseconds
  const tzDate = new Date(tzFormatted);
  const utcDateParsed = new Date(utcFormatted);
  const offsetMs = utcDateParsed - tzDate;
  
  // Adjust the UTC date
  const adjustedDate = new Date(utcDate.getTime() + offsetMs);
  
  return adjustedDate;
}

/**
 * Format a Date object in a specific timezone
 * @param {Date} date - Date to format
 * @param {string} timezone - IANA timezone identifier
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatInTimezone(date, timezone, options = {}) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options });
  return formatter.format(date);
}

/**
 * Get timezone offset in hours for a specific timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {number} Offset in hours (can be fractional like 5.5 for IST)
 */
export function getTimezoneOffset(timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  
  const now = new Date();
  
  // Format in UTC
  const utcStr = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Format in target timezone
  const tzStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse both
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  
  // Calculate difference in hours
  const diffMs = tzDate - utcDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours;
}

/**
 * Calculate next occurrence of a specific time in a timezone
 * @param {string} timeStr - Time in HH:mm format
 * @param {string} timezone - IANA timezone identifier
 * @param {string} frequency - 'daily', 'weekly', or 'monthly'
 * @param {Date|null} fromDate - Calculate from this date (default: now)
 * @returns {Date} Next occurrence as UTC Date object
 */
export function calculateNextOccurrence(timeStr, timezone, frequency = 'daily', fromDate = null) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  
  const from = fromDate || new Date();
  
  // Get the scheduled time for today in UTC
  const todayScheduled = timeInTimezoneToUTC(timeStr, timezone);
  
  // If today's scheduled time hasn't passed yet, return it
  if (todayScheduled > from) {
    return todayScheduled;
  }
  
  // Otherwise, calculate next occurrence based on frequency
  const nextDate = new Date(todayScheduled);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }
  
  return nextDate;
}

/**
 * Check if it's time to run a scheduled task
 * @param {Date} scheduledTime - When the task should run
 * @param {number} windowMinutes - Allowable window in minutes (default: 5)
 * @returns {boolean} True if current time is within the window
 */
export function isTimeToRun(scheduledTime, windowMinutes = 5) {
  const now = new Date();
  const diff = Math.abs(now - scheduledTime);
  const diffMinutes = diff / (1000 * 60);
  
  return diffMinutes <= windowMinutes;
}

/**
 * Get timezone display name with offset
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Display string like "America/New_York (UTC-5)"
 */
export function getTimezoneDisplay(timezone) {
  if (!isValidTimezone(timezone)) {
    return timezone;
  }
  
  try {
    const offset = getTimezoneOffset(timezone);
    const offsetStr = offset >= 0 ? `+${offset}` : offset;
    return `${timezone} (UTC${offsetStr})`;
  } catch (error) {
    return timezone;
  }
}

export default {
  COMMON_TIMEZONES,
  isValidTimezone,
  nowInTimezone,
  timeInTimezoneToUTC,
  formatInTimezone,
  getTimezoneOffset,
  calculateNextOccurrence,
  isTimeToRun,
  getTimezoneDisplay
};