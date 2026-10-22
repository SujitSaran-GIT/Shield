// src/app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { useState } from 'react';
import type { RootState, AppDispatch } from './store';
import axios from 'axios';

// Typed hooks for TypeScript support
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hook for API calls with loading state
export const useApi = () => {
  const callApi = async <T, Args extends unknown[]>(apiCall: (...args: Args) => Promise<{ data: T }>, ...args: Args) => {
    try {
      const response = await apiCall(...args);
      return { data: response.data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: axios.isAxiosError(error)
          ? error.response?.data || error.message
          : error instanceof Error ? error.message : 'Request failed'
      };
    }
  };
  
  return { callApi };
};

// Hook for handling pagination
export const usePagination = (initialState = { page: 0, size: 20 }) => {
  const [pagination, setPagination] = useState(initialState);
  
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };
  
  const handleSizeChange = (size: number) => {
    setPagination(prev => ({ ...prev, size, page: 0 }));
  };
  
  return {
    pagination,
    handlePageChange,
    handleSizeChange,
    setPagination,
  };
};

// Hook for handling filters
export const useFilters = <T extends Record<string, unknown>>(initialFilters: T) => {
  const [filters, setFilters] = useState(initialFilters);
  
  const updateFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 0, // Reset to first page when filter changes
    }));
  };
  
  const resetFilters = () => {
    setFilters(initialFilters);
  };
  
  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
};
