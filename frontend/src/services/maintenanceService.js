import api from './api';

/**
 * Fetch all maintenance logs with optional filtering
 * @param {Object} filters - Optional filters (vehicleId, status)
 * @returns {Promise<Array>} Array of maintenance logs
 */
export const getMaintenanceLogs = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.vehicleId) {
    params.append('vehicleId', filters.vehicleId);
  }
  
  if (filters.status) {
    params.append('status', filters.status);
  }
  
  const response = await api.get(`/maintenance?${params.toString()}`);
  return response.data.maintenanceLogs || [];
};

/**
 * Create a new maintenance log
 * @param {Object} maintenanceData - Maintenance log data
 * @returns {Promise<Object>} Created maintenance log
 */
export const createMaintenanceLog = async (maintenanceData) => {
  const response = await api.post('/maintenance', maintenanceData);
  return response.data.maintenanceLog;
};

/**
 * Mark a maintenance log as completed
 * @param {string} id - Maintenance log ID
 * @returns {Promise<Object>} Updated maintenance log
 */
export const completeMaintenanceLog = async (id) => {
  const response = await api.put(`/maintenance/${id}/complete`);
  return response.data.maintenanceLog;
};
