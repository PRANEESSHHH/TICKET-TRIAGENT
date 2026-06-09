import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Global Axios configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
axios.interceptors.request.use(
  (config) => {
    const userType = localStorage.getItem('userType') || 'demo';
    config.headers['X-User-Type'] = userType;
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
