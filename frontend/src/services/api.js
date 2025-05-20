import axios from 'axios';

const api = axios.create({
  baseURL: 'https://m1ftw9nd-3001.use.devtunnels.ms/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => response,
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
    return response.data;
  } catch (error) {
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
};

export const register = async (name, email, password) => {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  } catch (error) {
    throw new Error(`Registration failed: ${error.response?.data?.message || error.message}`);
  }
};

export const getWorkouts = async (token) => {
  try {
    const response = await api.post('/workouts', { token });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch workouts: ${error.response?.data?.message || error.message}`);
  }
};

export const createWorkout = async (workoutData, token) => {
  try {
    const response = await api.post('/makeWorkout', {
      ...workoutData,
      token
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create workout: ${error.response?.data?.message || error.message}`);
  }
};

export default api;