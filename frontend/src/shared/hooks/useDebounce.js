import { useState, useEffect } from "react";

/**
 * Delays updating a value until the specified delay has elapsed without
 * the value changing. Useful for search inputs to avoid firing a request
 * on every keystroke.
 *
 * @param value  The live value to debounce
 * @param delay  Milliseconds to wait (default: 300ms)
 * @returns      The debounced value
 *
 * @example
 * const debouncedQuery = useDebounce(searchQuery, 300);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
