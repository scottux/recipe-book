/**
 * Date utility functions for timezone-safe date handling
 */

/**
 * Parse a date string (YYYY-MM-DD) as UTC midnight
 * This prevents off-by-one date bugs when storing dates in MongoDB
 * 
 * MongoDB stores dates in UTC, so we need to create a date that represents
 * the correct date at UTC midnight (not local midnight).
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at UTC midnight
 */
export const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Format a Date object as YYYY-MM-DD in local timezone
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a Date object as YYYY-MM-DD in UTC timezone
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format (UTC)
 */
export const formatUTCDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};