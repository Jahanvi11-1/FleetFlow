import api from './api';

export const tripService = {
  // Get all trips with optional filters
  getTrips: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.vehicleId) {
        params.append('vehicleId', filters.vehicleId);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      const response = await api.get(`/trips?${params.toString()}`);
      return { success: true, data: response.data.trips };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch trips'
      };
    }
  },

  // Get a single trip by ID
  getTrip: async (id) => {
    try {
      const response = await api.get(`/trips/${id}`);
      return { success: true, data: response.data.trip };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch trip'
      };
    }
  },

  // Create a new trip
  createTrip: async (tripData) => {
    try {
      const response = await api.post('/trips', tripData);
      return { success: true, data: response.data.trip };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create trip',
        details: error.response?.data?.details || []
      };
    }
  },

  // Update trip status
  updateTripStatus: async (id, status) => {
    try {
      const response = await api.put(`/trips/${id}/status`, { status });
      return { success: true, data: response.data.trip };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update trip status'
      };
    }
  },

  // Get available vehicles for trip assignment
  getAvailableVehicles: async () => {
    try {
      const response = await api.get('/vehicles?status=Available');
      return { success: true, data: response.data.vehicles };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch available vehicles'
      };
    }
  },

  // Get eligible drivers for trip assignment
  getEligibleDrivers: async () => {
    try {
      const response = await api.get('/drivers?eligible=true');
      return { success: true, data: response.data.drivers };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch eligible drivers'
      };
    }
  }
};
