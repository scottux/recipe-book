import { describe, it, expect } from 'vitest';
import { 
  getLocalDateString, 
  getUTCDateString, 
  isSameDateIgnoreTime, 
  compareDateWithUTCString,
  parseLocalDate 
} from '../dateUtils';

describe('dateUtils', () => {
  describe('getLocalDateString', () => {
    it('should return YYYY-MM-DD format in local timezone', () => {
      const date = new Date(2026, 1, 15); // Feb 15, 2026 (month is 0-indexed)
      const result = getLocalDateString(date);
      expect(result).toBe('2026-02-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      const result = getLocalDateString(date);
      expect(result).toBe('2026-01-05');
    });
  });

  describe('getUTCDateString', () => {
    it('should return YYYY-MM-DD format in UTC timezone', () => {
      const date = new Date('2026-02-15T00:00:00Z');
      const result = getUTCDateString(date);
      expect(result).toBe('2026-02-15');
    });
  });

  describe('isSameDateIgnoreTime', () => {
    it('should return true for same date with different times', () => {
      const date1 = new Date(2026, 1, 15, 10, 30);
      const date2 = new Date(2026, 1, 15, 16, 45);
      expect(isSameDateIgnoreTime(date1, date2)).toBe(true);
    });

    it('should return false for different dates', () => {
      const date1 = new Date(2026, 1, 15);
      const date2 = new Date(2026, 1, 16);
      expect(isSameDateIgnoreTime(date1, date2)).toBe(false);
    });
  });

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD string without timezone conversion', () => {
      const result = parseLocalDate('2026-02-15');
      
      // Should create date at midnight local time
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('should prevent off-by-one date bugs', () => {
      // This was the bug: new Date("2026-02-15") would create Feb 14 in Eastern timezone
      const dateStr = '2026-02-15';
      const result = parseLocalDate(dateStr);
      
      // Should be Feb 15, not Feb 14
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(1); // February
    });

    it('should handle first day of month', () => {
      const result = parseLocalDate('2026-03-01');
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(2); // March
    });

    it('should handle last day of month', () => {
      const result = parseLocalDate('2026-02-28');
      expect(result.getDate()).toBe(28);
      expect(result.getMonth()).toBe(1); // February
    });

    it('should handle year boundaries', () => {
      const result = parseLocalDate('2026-01-01');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });
  });

  describe('compareDateWithUTCString', () => {
    it('should correctly compare local date with UTC string', () => {
      const localDate = new Date(2026, 1, 15); // Feb 15 local
      const utcStr = '2026-02-15';
      expect(compareDateWithUTCString(localDate, utcStr)).toBe(true);
    });

    it('should return false for different dates', () => {
      const localDate = new Date(2026, 1, 15);
      const utcStr = '2026-02-16';
      expect(compareDateWithUTCString(localDate, utcStr)).toBe(false);
    });
  });

  describe('Regression Test: Meal Plan Date Bug', () => {
    it('should not have off-by-one error when parsing meal plan dates', () => {
      // User selects Sunday Feb 15 through Saturday Feb 21
      const startDate = '2026-02-15';
      const endDate = '2026-02-21';
      
      // Parse using our safe utility
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      
      // Generate week days (simulating MealPlanningPage logic)
      const days = [];
      for (let d = new Date(start); d <= end && days.length < 7; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
      
      // Should have exactly 7 days
      expect(days.length).toBe(7);
      
      // First day should be Feb 15, not Feb 14
      expect(days[0].getDate()).toBe(15);
      expect(days[0].getMonth()).toBe(1); // February
      
      // Last day should be Feb 21, not Feb 20
      expect(days[6].getDate()).toBe(21);
      expect(days[6].getMonth()).toBe(1); // February
      
      // All dates should be in correct sequence
      expect(days[0].getDate()).toBe(15); // Sunday
      expect(days[1].getDate()).toBe(16); // Monday
      expect(days[2].getDate()).toBe(17); // Tuesday
      expect(days[3].getDate()).toBe(18); // Wednesday
      expect(days[4].getDate()).toBe(19); // Thursday
      expect(days[5].getDate()).toBe(20); // Friday
      expect(days[6].getDate()).toBe(21); // Saturday
    });
  });
});