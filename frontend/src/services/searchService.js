import api from './api';

/**
 * Search Service
 * Handles global search API calls
 * Requirements: 7.1, 7.2, 7.3
 */

/**
 * Perform global search across vehicles, drivers, and trips
 * @param {string} query - Search query string
 * @returns {Promise<{vehicles: Array, drivers: Array, trips: Array}>}
 * 
 * Requirement 7.2: Partial matching across Vehicle License Plates, Driver Names, and Trip IDs
 * Requirement 7.3: Results grouped by entity type
 */
export const searchGlobal = async (query) => {
  try {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    // Return empty results on error
    return {
      vehicles: [],
      drivers: [],
      trips: []
    };
  }
};

/**
 * Debounce utility for search input
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms per Requirement 7.1)
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default {
  searchGlobal,
  debounce
};
