import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  count?: number;
}

export interface DownwardDropdownProps {
  id: string;
  labelId: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  className?: string;
}

export const DownwardDropdown: React.FC<DownwardDropdownProps> = ({
  id,
  labelId,
  value,
  options,
  onChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setFocusedIdx(idx);
  }, [value, options]);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setFocusedIdx((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setFocusedIdx((prev) => (prev - 1 + options.length) % options.length);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (options[focusedIdx]) {
        onChange(options[focusedIdx].value);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${open ? 'z-50' : 'z-10'} ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full min-h-10 px-3 py-2 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border transition flex items-center justify-between gap-2 text-left cursor-pointer gov-focus-ring ${
          open
            ? 'border-[#B90E23] ring-2 ring-[#B90E23]/15'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span id={`${id}-value`} className="flex items-center justify-between gap-2 flex-1 min-w-0">
          <span className="truncate font-medium min-w-0">
            {selectedOption?.label || ''}
          </span>
          {typeof selectedOption?.count === 'number' && (
            <>
              {' '}
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold font-mono shrink-0">
                {selectedOption.count}
              </span>
            </>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-slate-600 transition-transform duration-150 shrink-0 ${
            open ? 'rotate-180 text-[#B90E23]' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={options[focusedIdx] ? `${id}-opt-${focusedIdx}` : undefined}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 max-h-64 overflow-y-auto"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIdx;
            return (
              <li
                key={opt.value}
                id={`${id}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`px-3 py-2 text-xs sm:text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#FEF2F2] text-[#9F0C1E] font-bold'
                    : isFocused
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="truncate flex-1 min-w-0">{opt.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {typeof opt.count === 'number' && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isSelected
                          ? 'bg-white text-[#9F0C1E] border border-[#FECACA]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-[#B90E23] shrink-0" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DownwardDropdown;
