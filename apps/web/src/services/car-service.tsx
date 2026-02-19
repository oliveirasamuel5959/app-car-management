import { api } from './api';

export const carService = {
  getAllCars: async () => {
    try {
      console.log('Fetching cars with auth token:', localStorage.getItem('token')); // Debug log
      const response = await api.get('/api/cars');
      console.log('Cars response:', response); // Debug log
      return response;
    } catch (error) {
      console.error('Error in getAllCars:', error); // Debug log
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
      console.log('Fetching car with ID:', carId);
      const response = await api.get(`/api/cars/${carId}`);
      console.log('Raw car response:', response);
      
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
      console.log('Updating car:', carId, carData);
      const response = await api.put(`/api/cars/${carId}`, carData);
      console.log('Update response:', response);
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