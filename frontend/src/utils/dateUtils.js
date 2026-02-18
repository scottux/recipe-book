/**
 * Date utility functions for timezone-safe date handling
 * 
 * These utilities help avoid timezone conversion issues when working with dates,
 * particularly important for meal planning where we need to compare dates without
 * time components and without timezone shifts.
 */

/**
 * Get a local date string in YYYY-MM-DD format without timezone conversion
 * @param {Date} date - The date object
 * @returns {string} Date string in YYYY-MM-DD format using local timezone
 */
export const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get a UTC date string in YYYY-MM-DD format from a Date object
 * @param {Date} date - The date object
 * @returns {string} Date string in YYYY-MM-DD format using UTC timezone
 */
export const getUTCDateString = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compare two dates ignoring time component
 * Works across different timezones by comparing date components directly
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates are the same (ignoring time)
 */
export const isSameDateIgnoreTime = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Compare a local Date object with a UTC date string (YYYY-MM-DD)
 * This is the key function for meal planning date comparison
 * @param {Date} localDate - Local date object
 * @param {string} utcDateStr - UTC date string from backend (YYYY-MM-DD)
 * @returns {boolean} True if they represent the same calendar date
 */
export const compareDateWithUTCString = (localDate, utcDateStr) => {
  // Get local date components
  const localStr = getLocalDateString(localDate);
  
  // Parse UTC string and get its date components  
  const utcDate = new Date(utcDateStr);
  const utcStr = getUTCDateString(utcDate);
  
  return localStr === utcStr;
};

/**
 * Create a local Date object from a YYYY-MM-DD string without timezone conversion
 * This prevents the off-by-one date bug when parsing date strings
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at midnight in local timezone
 */
export const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};
