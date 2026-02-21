import api from './api';

export const driverService = {
  // Get all drivers with optional filters
  getDrivers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.eligible !== undefined) {
        params.append('eligible', filters.eligible);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      const response = await api.get(`/drivers?${params.toString()}`);
      return { success: true, data: response.data.drivers };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch drivers'
      };
    }
  },

  // Get a single driver by ID
  getDriver: async (id) => {
    try {
      const response = await api.get(`/drivers/${id}`);
      return { success: true, data: response.data.driver };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch driver'
      };
    }
  },

  // Create a new driver
  createDriver: async (driverData) => {
    try {
      const response = await api.post('/drivers', driverData);
      return { success: true, data: response.data.driver };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create driver',
        details: error.response?.data?.details || []
      };
    }
  },

  // Update an existing driver
  updateDriver: async (id, driverData) => {
    try {
      const response = await api.put(`/drivers/${id}`, driverData);
      return { success: true, data: response.data.driver };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update driver',
        details: error.response?.data?.details || []
      };
    }
  },

  // Delete a driver
  deleteDriver: async (id) => {
    try {
      const response = await api.delete(`/drivers/${id}`);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete driver'
      };
    }
  }
};
