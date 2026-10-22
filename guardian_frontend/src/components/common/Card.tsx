// src/components/common/Card.jsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className = '',
  hoverable = false,
  onClick,
  padding = true,
  variant = 'default',
  loading = false,
}: { children?: ReactNode; title?: ReactNode; subtitle?: ReactNode; headerAction?: ReactNode; footer?: ReactNode; className?: string; hoverable?: boolean; onClick?: () => void; padding?: boolean; variant?: 'default' | 'elevated' | 'ghost'; loading?: boolean }) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700',
    ghost: 'bg-transparent',
  };

  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : {}}
      className={`rounded-xl ${variants[variant]} ${className} ${
        onClick && !loading ? 'cursor-pointer' : ''
      } ${hoverable ? 'transition-all duration-200 hover:shadow-md' : ''}`}
      onClick={handleClick}
    >
      {/* Header */}
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={padding ? 'p-6' : ''}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default Card;
