import { useState } from 'react';
import PropTypes from 'prop-types';

// Common timezones list (matches backend COMMON_TIMEZONES)
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (no DST)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
];

function TimezoneSelector({ value, onChange, disabled, error, className }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter timezones based on search
  const filteredTimezones = COMMON_TIMEZONES.filter(tz =>
    tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get timezone offset display
  const getTimezoneOffset = (timezone) => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(now);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      
      // Calculate offset in hours
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (tzDate - utcDate) / (1000 * 60 * 60);
      const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
      
      return `UTC${offsetStr} ${tzPart?.value || ''}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={className}>
      {/* Search input */}
      <div className="mb-2">
        <input
          type="text"
          placeholder="Search timezones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Timezone select */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-red-300' : 'border-cookbook-aged'
        }`}
      >
        {filteredTimezones.length === 0 ? (
          <option value="">No timezones found</option>
        ) : (
          filteredTimezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} - {getTimezoneOffset(tz.value)}
            </option>
          ))
        )}
      </select>

      {/* Current timezone display */}
      {value && (
        <div className="mt-2 text-sm text-cookbook-brown font-body">
          <span className="font-medium">Selected:</span> {value}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 font-body">
          {error}
        </div>
      )}

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-600 font-body">
        <p>
          💡 Your timezone affects when scheduled backups run and how times are displayed.
        </p>
      </div>
    </div>
  );
}

TimezoneSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string
};

TimezoneSelector.defaultProps = {
  value: 'America/New_York',
  disabled: false,
  error: '',
  className: ''
};

export default TimezoneSelector;