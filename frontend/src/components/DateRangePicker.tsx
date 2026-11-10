/**
 * Date Range Picker - Proper date selection for satellite imagery
 * Allows selection of earlier and later dates with validation
 */

import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  earlierDate: string; // YYYY-MM-DD format
  laterDate: string; // YYYY-MM-DD format
  onEarlierDateChange: (date: string) => void;
  onLaterDateChange: (date: string) => void;
  disabled?: boolean;
}

export default function DateRangePicker({
  earlierDate,
  laterDate,
  onEarlierDateChange,
  onLaterDateChange,
  disabled = false
}: DateRangePickerProps) {
  const today = new Date().toISOString().split('T')[0];

  // Sentinel-2 launched in June 2015
  const minDate = '2015-06-01';

  const handleEarlierChange = (value: string) => {
    onEarlierDateChange(value);
    // If earlier date is after later date, adjust later date
    if (value && laterDate && value >= laterDate) {
      const newLaterDate = new Date(value);
      newLaterDate.setDate(newLaterDate.getDate() + 30); // Add 30 days
      onLaterDateChange(newLaterDate.toISOString().split('T')[0]);
    }
  };

  const handleLaterChange = (value: string) => {
    onLaterDateChange(value);
    // If later date is before earlier date, adjust earlier date
    if (value && earlierDate && value <= earlierDate) {
      const newEarlierDate = new Date(value);
      newEarlierDate.setDate(newEarlierDate.getDate() - 30); // Subtract 30 days
      onEarlierDateChange(newEarlierDate.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400">Compare dates:</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Earlier Date */}
        <div className="relative">
          <label className="text-xs text-gray-500 mb-1 block">Earlier Date</label>
          <input
            type="date"
            value={earlierDate}
            onChange={(e) => handleEarlierChange(e.target.value)}
            min={minDate}
            max={laterDate || today}
            disabled={disabled}
            className="px-3 py-1.5 bg-[#1a2332] border border-gray-700 rounded text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="text-gray-500 text-sm mt-5">→</div>

        {/* Later Date */}
        <div className="relative">
          <label className="text-xs text-gray-500 mb-1 block">Later Date</label>
          <input
            type="date"
            value={laterDate}
            onChange={(e) => handleLaterChange(e.target.value)}
            min={earlierDate || minDate}
            max={today}
            disabled={disabled}
            className="px-3 py-1.5 bg-[#1a2332] border border-gray-700 rounded text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Date Range Info */}
      {earlierDate && laterDate && (
        <div className="text-xs text-gray-500 mt-5">
          {(() => {
            const earlier = new Date(earlierDate);
            const later = new Date(laterDate);
            const diffDays = Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
            return `(${diffDays} days apart)`;
          })()}
        </div>
      )}
    </div>
  );
}
