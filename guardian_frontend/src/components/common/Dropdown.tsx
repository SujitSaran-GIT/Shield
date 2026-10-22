// src/components/common/Dropdown.jsx
import { useState, useRef, useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
export interface DropdownOption { key?: string; label?: ReactNode; icon?: LucideIcon; disabled?: boolean; variant?: string; type?: string; onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void }

const Dropdown = ({
  trigger,
  items,
  placement = 'bottom-start',
  onSelect,
  className = '',
  menuClassName = '',
  disabled = false,
}: { trigger: ReactNode; items: DropdownOption[]; placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end'; onSelect?: (item: DropdownOption) => void; className?: string; menuClassName?: string; disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const placements = {
    'bottom-start': 'top-full left-0 mt-1',
    'bottom-end': 'top-full right-0 mt-1',
    'top-start': 'bottom-full left-0 mb-1',
    'top-end': 'bottom-full right-0 mb-1',
    'left-start': 'top-0 right-full mr-1',
    'left-end': 'bottom-0 right-full mr-1',
    'right-start': 'top-0 left-full ml-1',
    'right-end': 'bottom-0 left-full ml-1',
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: DropdownOption, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    item.onClick?.(event);
    onSelect?.(item);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef} onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}>
      <div onClick={(event) => { event.stopPropagation(); if (!disabled) setIsOpen(!isOpen); }}>
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${placements[placement]} ${menuClassName}`}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
              {items.map((item, index) => item.type === 'separator' ? <hr key={index} className="my-1" /> : (
                <button
                  key={item.key || index}
                  onClick={(event) => handleSelect(item, event)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    item.variant === 'danger'
                      ? 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  disabled={item.disabled}
                >
                  <div className="flex items-center">
                    {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
