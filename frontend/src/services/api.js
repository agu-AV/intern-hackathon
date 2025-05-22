import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.authorization = `Bearer ${token}`; 
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
    const { weight, age, gender, experience } = response.data;
    
    // Store profile data in localStorage
    if (weight) localStorage.setItem('weight', weight);
    if (age) localStorage.setItem('age', age);
    if (gender) localStorage.setItem('gender', gender);
    if (experience) localStorage.setItem('experience', experience);
    
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

// Get user profile
export const getUserProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch profile: ${error.response?.data?.message || error.message}`);
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.put('/profile', profileData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.response?.data?.message || error.message}`);
  }
};

export const getWorkouts = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/workouts', {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return response.data.map(workout => ({
      _id: workout._id,
      userId: workout.userId,
      title: workout.title || 'Workout',
      date: workout.date,
      exercises: workout.exercises || []
    }));
  } catch (error) {
    throw new Error(`Failed to fetch workouts: ${error.response?.data?.message || error.message}`);
  }
};

export const createWorkout = async (workoutData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post('/makeWorkout', workoutData, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create workout: ${error.response?.data?.message || error.message}`);
  }
};

export const updateWorkout = async (workoutId, workoutData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.put(`/workouts/${workoutId}`, workoutData, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update workout: ${error.response?.data?.message || error.message}`);
  }
};

export const deleteWorkout = async (workoutId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.delete(`/workouts/${workoutId}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to delete workout: ${error.response?.data?.message || error.message}`);
  }
};

export const generateAndSaveWorkout = async (description, date) => {
  const res = await api.post('/generateWorkout', { description, date });
  return res.data;  // the newly created Workout object
};

export default api;
