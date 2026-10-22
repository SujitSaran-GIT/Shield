// src/utils/helpers.js
import { format, formatDistance, parseISO } from 'date-fns';
type DateInput = Date | string | number | null | undefined;

// Format date
export const formatDate = (date: DateInput, formatStr = 'PPpp') => {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

// Format relative time
export const formatRelativeTime = (date: DateInput) => {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '-';
  }
};

// Truncate text
export const truncate = (str: string | null | undefined, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

// Format file size
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debounce function
export const debounce = <Args extends unknown[]>(func: (...args: Args) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = <Args extends unknown[]>(func: (...args: Args) => void, limit: number) => {
  let inThrottle = false;
  return function(...args: Args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate random ID
export const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// Copy to clipboard
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

// Safe JSON parse
export const safeJsonParse = (str: string, defaultValue: unknown = null): unknown => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// Validate email
export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password: string) => {
  const requirements = {
    minLength: password.length >= 12,
    withinByteLimit: new TextEncoder().encode(password).length <= 72,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;
  let strength = 'weak';

  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    requirements,
    score,
    strength,
    isValid: requirements.minLength && requirements.withinByteLimit,
  };
};

// Format currency
export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Get initials from name
export const getInitials = (name: string | null | undefined) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Create query string from object
export const createQueryString = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  return searchParams.toString();
};

// Parse query string to object
export const parseQueryString = (queryString: string) => {
  const params: Record<string,string> = {};
  const searchParams = new URLSearchParams(queryString);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
};

// Delay function
export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Check if object is empty
export const isEmpty = (obj: object | null | undefined) => {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Merge objects deeply
export const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(isObject(target[key]) ? target[key] : {}, source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

const isObject = (item: unknown): item is Record<string, unknown> => {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
};
