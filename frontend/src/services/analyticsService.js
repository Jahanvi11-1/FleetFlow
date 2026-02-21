import api from './api';

/**
 * Fetch vehicle ROI data
 * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
 * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
 * @returns {Promise} ROI data
 */
export const getVehicleROI = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await api.get('/analytics/vehicle-roi', { params });
  return response.data;
};

/**
 * Fetch fuel efficiency data
 * @param {string} vehicleId - Optional vehicle ID filter
 * @returns {Promise} Fuel efficiency data
 */
export const getFuelEfficiency = async (vehicleId = null) => {
  const params = {};
  if (vehicleId) params.vehicleId = vehicleId;
  
  const response = await api.get('/analytics/fuel-efficiency', { params });
  return response.data;
};

/**
 * Export analytics data
 * @param {string} format - Export format ('csv' or 'pdf')
 * @param {string} type - Data type ('roi' or 'fuel-efficiency')
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {Promise} Blob data for download
 */
export const exportAnalytics = async (format, type, startDate, endDate) => {
  const params = { format, type };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await api.get('/analytics/export', {
    params,
    responseType: 'blob'
  });
  
  return response.data;
};
