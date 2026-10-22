// src/components/common/Tooltip.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
  maxWidth = '200px',
  disabled = false,
}: { children: React.ReactNode; content: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; delay?: number; className?: string; maxWidth?: string; disabled?: boolean }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2',
  };

  const arrowPositions = {
    top: 'bottom-[-6px] left-1/2 transform -translate-x-1/2 border-t-gray-900',
    bottom: 'top-[-6px] left-1/2 transform -translate-x-1/2 border-b-gray-900',
    left: 'right-[-6px] top-1/2 transform -translate-y-1/2 border-l-gray-900',
    right: 'left-[-6px] top-1/2 transform -translate-y-1/2 border-r-gray-900',
    'top-left': 'bottom-[-6px] right-3 border-t-gray-900',
    'top-right': 'bottom-[-6px] left-3 border-t-gray-900',
    'bottom-left': 'top-[-6px] right-3 border-b-gray-900',
    'bottom-right': 'top-[-6px] left-3 border-b-gray-900',
  };

  const showTooltip = () => {
    if (disabled) return;
    
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={className}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positions[position]}`}
            style={{ maxWidth }}
          >
            <div className="relative">
              <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap">
                {content}
              </div>
              <div
                className={`absolute w-0 h-0 border-4 border-transparent ${arrowPositions[position]}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
