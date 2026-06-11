import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080/api/v1' 
  : `http://${window.location.hostname}:8080/api/v1`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
