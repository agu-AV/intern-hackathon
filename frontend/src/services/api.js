import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('API Error:', {
      message: errorMessage,
      status: error.response?.status,
      endpoint: error.config?.url
    });
    throw error;
  }
);

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getWorkouts = async () => {
  try {
    const response = await api.get('/workouts');
    return response;
  } catch (error) {
    throw new Error(`Failed to fetch workouts: ${error.response?.data?.message || error.message}`);
  }
};

export const createWorkout = async (workoutData) => {
  try {
    const response = await api.post('/makeWorkout', workoutData);
    return response;
  } catch (error) {
    throw new Error(`Failed to create workout: ${error.response?.data?.message || error.message}`);
  }
};

export default api;