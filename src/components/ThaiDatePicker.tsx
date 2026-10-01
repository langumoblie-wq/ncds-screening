import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";
import { 
  parseAnyDateToParts, 
  formatThaiDate, 
  THAI_MONTHS, 
  THAI_MONTHS_SHORT, 
  THAI_DAYS_SHORT 
} from "../utils";

interface ThaiDatePickerProps {
  value?: string;
  onChange: (isoDate: string, thaiFormattedDate: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedValue = useMemo(() => {
    return parseAnyDateToParts(value);
  }, [value]);

  // Calendar view state (which month/year is currently being viewed)
  const [viewYearCE, setViewYearCE] = useState<number>(() => parsedValue.yearCE);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue.month); // 1-12

  // Sync view when value changes from outside
  useEffect(() => {
    setViewYearCE(parsedValue.yearCE);
    setViewMonth(parsedValue.month);
  }, [parsedValue.yearCE, parsedValue.month]);

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const viewYearBE = viewYearCE + 543;

  // Generate Year options in Buddhist Era (e.g. 2560 to 2575)
  const currentCE = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: { ce: number; be: number }[] = [];
    for (let y = currentCE - 7; y <= currentCE + 5; y++) {
      list.push({ ce: y, be: y + 543 });
    }
    return list;
  }, [currentCE]);

  // Month navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYearCE(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYearCE(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Days in month calculation
  const calendarGrid = useMemo(() => {
    // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayIndex = new Date(viewYearCE, viewMonth - 1, 1).getDay();
    // Days in current month
    const daysInCurrentMonth = new Date(viewYearCE, viewMonth, 0).getDate();
    // Days in previous month
    const daysInPrevMonth = new Date(viewYearCE, viewMonth - 1, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      yearCE: number;
      yearBE: number;
      isCurrentMonth: boolean;
      iso: string;
    }> = [];

    // Prev month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 1 ? 12 : viewMonth - 1;
      const y = viewMonth === 1 ? viewYearCE - 1 : viewYearCE;
      days.push({
        day: d,
        month: m,
        yearCE: y,
        yearBE: y + 543,
        isCurrentMonth: false,
        iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      days.push({
        day: d,
        month: viewMonth,
        yearCE: viewYearCE,
        yearBE: viewYearBE,
        isCurrentMonth: true,
        iso: `${viewYearCE}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      });
    }

    // Next month overflow days to make complete 35 or 42 cells (5 or 6 rows)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 12 ? 1 : viewMonth + 1;
      const y = viewMonth === 12 ? viewYearCE + 1 : viewYearCE;
      days.push({
        day: d,
        month: m,
        yearCE: y,
        yearBE: y + 543,
        isCurrentMonth: false,
        iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      });
    }

    return days;
  }, [viewYearCE, viewMonth, viewYearBE]);

  // Today check
  const todayParts = useMemo(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      yearCE: now.getFullYear()
    };
  }, []);

  const selectDate = (dayItem: { day: number; month: number; yearCE: number; yearBE: number; iso: string }) => {
    const thaiStr = `${dayItem.day}/${dayItem.month}/${dayItem.yearBE}`;
    onChange(dayItem.iso, thaiStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const ce = now.getFullYear();
    const be = ce + 543;
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const iso = `${ce}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const thaiStr = `${d}/${m}/${be}`;
    onChange(iso, thaiStr);
    setViewYearCE(ce);
    setViewMonth(m);
    setIsOpen(false);
  };

  // Direct dropdown quick select handlers
  const handleDirectDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value, 10);
    const iso = `${parsedValue.yearCE}-${String(parsedValue.month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
    const thaiStr = `${newDay}/${parsedValue.month}/${parsedValue.yearBE}`;
    onChange(iso, thaiStr);
  };

  const handleDirectMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    // Adjust day if month has fewer days
    const maxDays = new Date(parsedValue.yearCE, newMonth, 0).getDate();
    const safeDay = Math.min(parsedValue.day, maxDays);
    const iso = `${parsedValue.yearCE}-${String(newMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    const thaiStr = `${safeDay}/${newMonth}/${parsedValue.yearBE}`;
    onChange(iso, thaiStr);
    setViewMonth(newMonth);
  };

  const handleDirectYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYearBE = parseInt(e.target.value, 10);
    const newYearCE = newYearBE - 543;
    const maxDays = new Date(newYearCE, parsedValue.month, 0).getDate();
    const safeDay = Math.min(parsedValue.day, maxDays);
    const iso = `${newYearCE}-${String(parsedValue.month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    const thaiStr = `${safeDay}/${parsedValue.month}/${newYearBE}`;
    onChange(iso, thaiStr);
    setViewYearCE(newYearCE);
  };

  // Formatted date string for display
  const displayFullDate = formatThaiDate(value || parsedValue.iso, "full");
  const displaySlashDate = formatThaiDate(value || parsedValue.iso, "slash");

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            พ.ศ. {parsedValue.yearBE}
          </span>
        </label>
      )}

      {/* Main Interactive Field */}
      <div className="space-y-1.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              setIsOpen(!isOpen);
            }
          }}
          className={`w-full flex items-center justify-between rounded-xl border p-3 pl-3.5 pr-3 transition-all cursor-pointer select-none ${
            isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
              : "border-slate-300 hover:border-blue-400 bg-white"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isOpen ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-sm font-bold text-slate-800 block leading-tight">
                {displayFullDate}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block leading-tight">
                ({displaySlashDate})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              ปฏิทิน พ.ศ.
            </span>
          </div>
        </div>

        {/* Quick Dropdown Controls: วัน / เดือน / ปี (พ.ศ.) for fast desktop/mobile access */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {/* Day dropdown */}
          <div className="relative">
            <select
              value={parsedValue.day}
              onChange={handleDirectDayChange}
              disabled={disabled}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 outline-none transition-colors cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  วันที่ {d}
                </option>
              ))}
            </select>
          </div>

          {/* Month dropdown */}
          <div className="relative">
            <select
              value={parsedValue.month}
              onChange={handleDirectMonthChange}
              disabled={disabled}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 outline-none transition-colors cursor-pointer truncate"
            >
              {THAI_MONTHS.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Year dropdown (พ.ศ.) */}
          <div className="relative">
            <select
              value={parsedValue.yearBE}
              onChange={handleDirectYearChange}
              disabled={disabled}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 outline-none transition-colors cursor-pointer"
            >
              {yearOptions.map(({ be }) => (
                <option key={be} value={be}>
                  พ.ศ. {be}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Popover Calendar (ปฏิทิน พ.ศ.) */}
      {isOpen && (
        <div 
          className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150"
          style={{ maxWidth: "calc(100vw - 24px)" }}
        >
          {/* Header Navigation */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border-0 outline-none cursor-pointer"
              >
                {THAI_MONTHS.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select (พ.ศ.) */}
              <select
                value={viewYearCE}
                onChange={(e) => setViewYearCE(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border-0 outline-none cursor-pointer"
              >
                {yearOptions.map(({ ce, be }) => (
                  <option key={ce} value={ce}>
                    พ.ศ. {be}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {THAI_DAYS_SHORT.map((dayName, idx) => (
              <div
                key={idx}
                className={`text-[11px] font-bold py-1 ${
                  idx === 0
                    ? "text-rose-500" // อาทิตย์
                    : idx === 6
                    ? "text-purple-600" // เสาร์
                    : "text-slate-400"
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((item, idx) => {
              const isSelected =
                item.day === parsedValue.day &&
                item.month === parsedValue.month &&
                item.yearCE === parsedValue.yearCE;

              const isToday =
                item.day === todayParts.day &&
                item.month === todayParts.month &&
                item.yearCE === todayParts.yearCE;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(item)}
                  className={`h-8 sm:h-9 text-xs rounded-xl flex flex-col items-center justify-center transition-all relative font-semibold cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs scale-105 z-10"
                      : isToday
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100"
                      : item.isCurrentMonth
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-50 hover:text-slate-400 text-[11px]"
                  }`}
                >
                  <span>{item.day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5 absolute bottom-1"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              เลือกวันนี้
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
