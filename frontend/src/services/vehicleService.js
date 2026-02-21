import api from './api';

/**
 * Fetch all vehicles with optional filtering
 * @param {Object} filters - Optional filters (status, search)
 * @returns {Promise<Array>} Array of vehicles
 */
export const getVehicles = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) {
    params.append('status', filters.status);
  }
  
  if (filters.search) {
    params.append('search', filters.search);
  }
  
  const response = await api.get(`/vehicles?${params.toString()}`);
  return response.data.vehicles || [];
};
