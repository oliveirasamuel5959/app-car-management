import { api } from './api';

export const carService = {
  getAllCars: async () => {
    try {
      const response = await api.get('/vehicles');
      return response;
    } catch (error) {

      if (error.message.includes('Session expired')) {
        // Handle session expiration specifically
        return { cars: [] };
      }
      throw error;
    }
  },

  createCar: async (carData) => {
    try {
      const response = await api.post('/api/cars', carData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create car');
    }
  },

  getCar: async (carId) => {
    try {
      const response = await api.get(`/api/cars/${carId}`);
      
      // If the response itself is the car data
      if (response && response.id) {
        return { car: response };
      }
      
      // If the car is nested in a data or cars property
      if (response && (response.data || response.cars)) {
        return { car: response.data || response.cars };
      }

      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error in getCar:', error);
      throw new Error(error.message || 'Failed to fetch car details');
    }
  },

  updateCar: async (carId, carData) => {
    try {
      const response = await api.put(`/api/cars/${carId}`, carData);
      return response;
    } catch (error) {
      console.error('Error in updateCar:', error);
      throw new Error(error.message || 'Failed to update car');
    }
  },

  deleteCar: async (carId) => {
    try {
      const response = await api.delete(`/api/cars/${carId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete car');
    }
  }
};