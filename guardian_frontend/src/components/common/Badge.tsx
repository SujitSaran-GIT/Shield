// src/components/common/Badge.jsx
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = 'full',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}: Omit<HTMLMotionProps<'span'>, 'children'> & { children?: ReactNode; variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'purple' | 'pink'; size?: 'xs' | 'sm' | 'md' | 'lg'; rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'; icon?: LucideIcon; iconPosition?: 'left' | 'right' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };

  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${roundedStyles[rounded]}
        ${className}
      `}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={`${iconSizes[size]} mr-1.5`} />
      )}
      
      {children}
      
      {Icon && iconPosition === 'right' && (
        <Icon className={`${iconSizes[size]} ml-1.5`} />
      )}
    </motion.span>
  );
};

export default Badge;
